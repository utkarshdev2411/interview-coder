from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Union, List, Dict, Any
from pydantic import BaseModel, Field
import os

from litellm import completion
import base64
from dotenv import load_dotenv
import json
import uvicorn
import logging

from litellm import Router
from instructor import patch
import instructor
from anthropic import Anthropic

# from auth import auth_required

class Solution(BaseModel):
    thoughts: List[str] = Field(
        description="Thoughts that someone who's never seen the problem would think to get to the solution. The first thought should be a brief description of the implemented algorithm, something an amateur programmer could follow.",
        max_items=3
    )
    code: str = Field(
        description="The code implementation with detailed comments explaining the logic, detailed enough to be understandable by an amateur programmer"
    )
    time_complexity: str = Field(
        description="Time complexity (Big O) with brief explanation why, format should be 'O(_) because _'"
    )
    space_complexity: str = Field(
        description="Space complexity (Big O) with brief explanation why, format should be 'O(_) because _'"
    )

class DebugSolution(BaseModel):
    thoughts: List[str] = Field(
        description="High level list of changes made to improve the code",
        max_items=3
    )
    old_code: str = Field(
        description="The original code implementation from the image"
    )
    new_code: str = Field(
        description="The improved code implementation with detailed comments explaining the logic"
    )
    time_complexity: str = Field(
        description="Time complexity (Big O) with brief explanation why, format should be 'O(_) because _'"
    )
    space_complexity: str = Field(
        description="Space complexity (Big O) with brief explanation why, format should be 'O(_) because _'"
    )

class SolutionResponse(BaseModel):
    solution: Solution

class DebugSolutionResponse(BaseModel):
    solution: DebugSolution


load_dotenv()

# Initialize Anthropic client
client = instructor.from_anthropic(Anthropic())


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProblemInfo(BaseModel):
    problem_statement: str
    input_format: dict
    output_format: dict
    constraints: List[dict]
    test_cases: List[dict]

class GenerateSolutionsRequest(BaseModel):
    problem_info: ProblemInfo

class DebugRequest(BaseModel):
    problem_info: ProblemInfo
    current_solution: str

async def extract_problem_info(image_data_list: List[str]):
    """Extract problem statement, constraints, and test cases from the image"""
    image_contents = [
        {
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{image_data}"
            }
        }
        for image_data in image_data_list
    ]

    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Extract the following information from this coding problem image:\n"
                        "1. ENTIRE Problem statement (what needs to be solved)\n"
                        "2. Input/Output format\n"
                        "3. Constraints on the input\n"
                        "4. Example test cases\n"
                        "Format each test case exactly like this:\n"
                        "{'input': {'args': [nums, target]}, 'output': {'result': [0,1]}}\n"
                        "Note: test cases must have 'input.args' as an array of arguments in order,\n"
                        "and 'output.result' containing the expected return value.\n"
                        "Example for two_sum([2,7,11,15], 9) returning [0,1]:\n"
                        "{'input': {'args': [[2,7,11,15], 9]}, 'output': {'result': [0,1]}}\n"
                },
                *image_contents

            ]
        }
    ]

    response = completion(
        model="gpt-4o-2024-08-06",
        messages=messages,
        max_tokens=1000,
        temperature=0,
        functions=[
            {
                "name": "extract_problem_details",
                "description": "Extract and structure the key components of a coding problem",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "problem_statement": {
                            "type": "string",
                            "description": "The ENTIRE main problem statement describing what needs to be solved"
                        },
                        "input_format": {
                            "type": "object",
                            "properties": {
                                "description": {
                                    "type": "string",
                                    "description": "Description of the input format"
                                },
                                "parameters": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "name": {
                                                "type": "string",
                                                "description": "Name of the parameter"
                                            },
                                            "type": {
                                                "type": "string",
                                                "enum": ["number", "string", "array", "array2d", "array3d", "matrix", "tree", "graph"],
                                                "description": "Type of the parameter"
                                            },
                                            "subtype": {
                                                "type": "string",
                                                "enum": ["integer", "float", "string", "char", "boolean"],
                                                "description": "For arrays, specifies the type of elements"
                                            }
                                        },
                                        "required": ["name", "type"]
                                    }
                                }
                            },
                            "required": ["description", "parameters"]
                        },
                        "output_format": {
                            "type": "object",
                            "properties": {
                                "description": {
                                    "type": "string",
                                    "description": "Description of the expected output format"
                                },
                                "type": {
                                    "type": "string",
                                    "enum": ["number", "string", "array", "array2d", "array3d", "matrix", "boolean"],
                                    "description": "Type of the output"
                                },
                                "subtype": {
                                    "type": "string",
                                    "enum": ["integer", "float", "string", "char", "boolean"],
                                    "description": "For arrays, specifies the type of elements"
                                }
                            },
                            "required": ["description", "type"]
                        },
                        "constraints": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "description": {
                                        "type": "string",
                                        "description": "Description of the constraint"
                                    },
                                    "parameter": {
                                        "type": "string",
                                        "description": "The parameter this constraint applies to"
                                    },
                                    "range": {
                                        "type": "object",
                                        "properties": {
                                            "min": {"type": "number"},
                                            "max": {"type": "number"}
                                        }
                                    }
                                },
                                "required": ["description"]
                            }
                        },
                        "test_cases": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "input": {
                                        "type": "object",
                                        "properties": {
                                            "args": {
                                                "type": "array",
                                                "items": {
                                                    "anyOf": [
                                                        {"type": "integer"},
                                                        {"type": "string"},
                                                        {
                                                            "type": "array",
                                                            "items": {
                                                                "anyOf": [
                                                                    {"type": "integer"},
                                                                    {"type": "string"},
                                                                    {"type": "boolean"},
                                                                    {"type": "null"}
                                                                ]
                                                            }
                                                        },
                                                        {"type": "object"},
                                                        {"type": "boolean"},
                                                        {"type": "null"}
                                                    ]
                                                }
                                            }
                                        },
                                        "required": ["args"]
                                    },
                                    "output": {
                                        "type": "object",
                                        "properties": {
                                            "result": {
                                                "anyOf": [
                                                    {"type": "integer"},
                                                    {"type": "string"},
                                                    {
                                                        "type": "array",
                                                        "items": {
                                                            "anyOf": [
                                                                {"type": "integer"},
                                                                {"type": "string"},
                                                                {"type": "boolean"},
                                                                {"type": "null"}
                                                            ]
                                                        }
                                                    },
                                                    {"type": "object"},
                                                    {"type": "boolean"},
                                                    {"type": "null"}
                                                ]
                                            }
                                        },
                                        "required": ["result"]
                                    }
                                },
                                "required": ["input", "output"]
                            },
                            "minItems": 1
                        },
                    },
                    "required": ["problem_statement"]
                }
            }
        ],
        function_call={"name": "extract_problem_details"}
    )
    print('extracted problem output', response.choices[0].message.function_call.arguments)
    return json.loads(response.choices[0].message.function_call.arguments)

async def generate_solution_responses(problem_info: ProblemInfo):
    """Generate solution approaches for a given coding problem
    
    Args:
        problem_info (ProblemInfo): Structured information about the coding problem
        
    Returns:
        str: Formatted prompt with problem information
    """
    # Generate input parameters string with error handling
    input_params = ""
    try:
        input_params = "\n".join([
            f"- {p['name']}: {p['type']}" + (f" of {p['subtype']}" if 'subtype' in p else "")
            for p in problem_info.input_format['parameters']
        ])
    except (KeyError, AttributeError, TypeError):
        input_params = "Input parameters not available"

    # Generate test cases string with error handling
    test_cases_str = ""
    try:
        test_cases_str = json.dumps(problem_info.test_cases, indent=2)
    except (AttributeError, TypeError):
        test_cases_str = "Test cases not available"

    # Generate constraints string with error handling
    constraints_str = ""
    try:
        constraints_str = "\n".join([
            f"- {c['description']}" + 
            (f" ({c['parameter']}: {c['range']['min']} to {c['range']['max']})" if 'range' in c else "")
            for c in problem_info.constraints
        ])
    except (KeyError, AttributeError, TypeError):
        constraints_str = "Constraints not available"

    # Generate output format string with error handling
    output_format = ""
    try:
        output_type = problem_info.output_format['type']
        output_subtype = f" of {problem_info.output_format['subtype']}" if 'subtype' in problem_info.output_format else ''
        output_format = f"Returns: {output_type}{output_subtype}"
    except (KeyError, AttributeError):
        output_format = "Output format not available"

    prompt = f"""
Given the following coding problem:

Problem Statement:
{getattr(problem_info, 'problem_statement', 'Problem statement not available')}

Input Format:
{getattr(problem_info.input_format, 'description', 'Input format description not available')}
Parameters:
{input_params}

Output Format:
{getattr(problem_info.output_format, 'description', 'Output format description not available')}
{output_format}

Constraints:
{constraints_str}

Example Test Cases:
{test_cases_str}
[_ for d]

Example Test Cases:
{test_cases_str}

Analyze and solve this problem, first think  high-level what the solution will be and how it avoids certain edge cases. Then output the required JSON.
Thoughts should be conversational, things that someone would think of to get to the solution, if an algorithm is mentioned it should include the thoughts.
Code MUST be in Python and include DETAILED comments, someone who's an amatuer coder could follow.
Code should be the MOST optimized code by completxity, it likely should be a super short one/two line solution that an amateur coder wouldn't understand.
"""


    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=4096,
        response_model=SolutionResponse,  # Specify the expected response structure
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
    )

    # Return the response as a dict for FastAPI to convert to JSON
    return response.model_dump()


async def debug_solution_responses(image_data_list: List[str], problem_info: ProblemInfo):
    """Generate and debug solution approaches for a given coding problem"""
    print("Problem info", problem_info)
    
    # Process images for inclusion in prompt
    image_contents = [
        {
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{image_data}"
            }
        }
        for image_data in image_data_list
    ]

    debug_prompt = f"""
Given the following coding problem and its visual representation:

Problem Statement:
{problem_info.problem_statement}

Input Format:
{problem_info.input_format['description']}
Parameters:
{" ".join([
    f"- {p['name']}: {p['type']}" + (f" of {p['subtype']}" if 'subtype' in p else "")
    for p in problem_info.input_format['parameters']
])}

Output Format:
{problem_info.output_format['description']}
Returns: {problem_info.output_format['type']}{' of ' + problem_info.output_format['subtype'] if 'subtype' in problem_info.output_format else ''}

Constraints:
{" ".join([
    f"- {c['description']}" + 
    (f" ({c['parameter']}: {c['range']['min']} to {c['range']['max']})" if 'range' in c else "")
    for c in problem_info.constraints
])}

Example Test Cases:
{json.dumps(problem_info.test_cases, indent=2)}

First extract and analyze the code shown in the image. Then create an improved version while maintaining the same general approach and structure.
Focus on keeping the solution syntactically similar but with optimizations and INLINE comments ONLY ON lines of code that were changed.

The response should include:
1. List up to 3 specific changes made to improve the code, including your thoughts and reasoning. Explain them conversationally, as if you're discussing what's wrong with your code or how you optimized it. Instead of a robotic summary, showcase the thought process that led to a better solution.
2. The exact code from the image (as old_code)
3. The improved version (as new_code) with detailed comments
4. Time and space complexity analysis with explanations
"""

    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": debug_prompt
                },
                *image_contents
            ]
        }
    ]

    response = completion(
        model="gpt-4o",
        messages=messages,
        max_tokens=4000,
        temperature=0,
        functions=[
            {
                "name": "provide_solution",
                "description": "Debug based on the problem and provide a solution to the coding problem",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "solution": {
                            "type": "object",
                            "properties": {
                                "thoughts": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                    "description": "List of specific changes made to improve the code",
                                    "maxItems": 3
                                },
                                "old_code": {
                                    "type": "string",
                                    "description": "The exact code implementation found in the image"
                                },
                                "new_code": {
                                    "type": "string",
                                    "description": "The improved code implementation with detailed comments"
                                },
                                "time_complexity": {
                                    "type": "string",
                                    "description": "Time complexity with explanation, format as 'O(_) because _'"
                                },
                                "space_complexity": {
                                    "type": "string",
                                    "description": "Space complexity with explanation, format as 'O(_) because _'"
                                }
                            },
                            "required": ["thoughts", "old_code", "new_code", "time_complexity", "space_complexity"]
                        }
                    },
                    "required": ["solution"]
                }
            }
        ],
        function_call={"name": "provide_solution"}
    )

    solution_dict = json.loads(response.choices[0].message.function_call.arguments)
    return solution_dict


  
@app.post("/extract_problem")
async def extract_problem(images: List[UploadFile] = File(...)):
    """Extract problem information from multiple images"""
    try:
        # Process all images to base64
        print(f"Received {len(images)} images for processing.")
        # print(f"Request from user: {user.id}")
        image_data_list = []
        for image in images:
            image_data = base64.b64encode(await image.read()).decode('ascii')
            image_data_list.append(image_data)

        
        print("IMAGES", len(images))
            
        problem_info = await extract_problem_info(image_data_list)
        return JSONResponse(content=problem_info)
    except Exception as e:
        logging.error(f"Error processing images: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing images: {str(e)}")



@app.post("/generate_solutions")
async def generate_solutions(
    request: GenerateSolutionsRequest,
):
    """Generate solutions based on problem info"""
    try:
        solutions = await generate_solution_responses(request.problem_info)
        return JSONResponse(content=solutions)
    except Exception as e:
        # You might want to add better error handling here
        return JSONResponse(
            status_code=500,
            content={"error": f"Server error: {str(e)}"}
        )
    


@app.post("/debug_solutions")
async def debug_solutions(
    images: List[UploadFile] = File(...),
    problem_info: str = Form(...)
):
    """Generate debug solutions based on problem info and images"""
    try:
        # Parse problem_info from JSON string
        problem_info_dict = json.loads(problem_info)
        problem_info_obj = ProblemInfo(**problem_info_dict)
        
        # Process all images to base64
        print(f"Received {len(images)} images for processing.")
        image_data_list = []
        for image in images:
            image_data = base64.b64encode(await image.read()).decode('ascii')
            image_data_list.append(image_data)
            
        print("IMAGES", len(images))
        solutions = await debug_solution_responses(image_data_list, problem_info_obj)
        return JSONResponse(content=solutions)
        
    except json.JSONDecodeError as e:
        return JSONResponse(
            status_code=400,
            content={"error": f"Invalid problem_info JSON: {str(e)}"}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Server error: {str(e)}"}
        )
  


  

# Add this at the bottom of the file
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
  