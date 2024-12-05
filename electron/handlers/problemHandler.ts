// Import necessary modules
import axios from "axios"
import { store } from "../store"

// Define interfaces for ProblemInfo and related structures

interface DebugSolutionResponse {
  thoughts: string[]
  old_code: string
  new_code: string
  time_complexity: string
  space_complexity: string
}

interface ProblemInfo {
  problem_statement?: string
  input_format?: {
    description?: string
    parameters?: Array<{
      name: string
      type: string
      subtype?: string
    }>
  }
  output_format?: {
    description?: string
    type?: string
    subtype?: string
  }
  constraints?: Array<{
    description: string
    parameter?: string
    range?: {
      min?: number
      max?: number
    }
  }>
  test_cases?: any // Adjust the type as needed
}

interface StoreSchema {
  openaiApiKey: string
  // add other store fields here
}

// Define the extractProblemInfo function
export async function extractProblemInfo(
  imageDataList: string[]
): Promise<any> {
  const storedApiKey = store.get("openaiApiKey")
  if (!storedApiKey) {
    throw new Error("OpenAI API key not set")
  }

  // Prepare the image contents for the message
  const imageContents = imageDataList.map((imageData) => ({
    type: "image_url",
    image_url: {
      url: `data:image/jpeg;base64,${imageData}`
    }
  }))

  // Construct the messages to send to the model
  const messages = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text:
            "Extract the following information from this coding problem image:\n" +
            "1. ENTIRE Problem statement (what needs to be solved)\n" +
            "2. Input/Output format\n" +
            "3. Constraints on the input\n" +
            "4. Example test cases\n" +
            "Format each test case exactly like this:\n" +
            "{'input': {'args': [nums, target]}, 'output': {'result': [0,1]}}\n" +
            "Note: test cases must have 'input.args' as an array of arguments in order,\n" +
            "'output.result' containing the expected return value.\n" +
            "Example for two_sum([2,7,11,15], 9) returning [0,1]:\n" +
            "{'input': {'args': [[2,7,11,15], 9]}, 'output': {'result': [0,1]}}\n"
        },
        ...imageContents
      ]
    }
  ]

  // Define the function schema
  const functions = [
    {
      name: "extract_problem_details",
      description:
        "Extract and structure the key components of a coding problem",
      parameters: {
        type: "object",
        properties: {
          problem_statement: {
            type: "string",
            description:
              "The ENTIRE main problem statement describing what needs to be solved"
          },
          input_format: {
            type: "object",
            properties: {
              description: {
                type: "string",
                description: "Description of the input format"
              },
              parameters: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      description: "Name of the parameter"
                    },
                    type: {
                      type: "string",
                      enum: [
                        "number",
                        "string",
                        "array",
                        "array2d",
                        "array3d",
                        "matrix",
                        "tree",
                        "graph"
                      ],
                      description: "Type of the parameter"
                    },
                    subtype: {
                      type: "string",
                      enum: ["integer", "float", "string", "char", "boolean"],
                      description: "For arrays, specifies the type of elements"
                    }
                  },
                  required: ["name", "type"]
                }
              }
            },
            required: ["description", "parameters"]
          },
          output_format: {
            type: "object",
            properties: {
              description: {
                type: "string",
                description: "Description of the expected output format"
              },
              type: {
                type: "string",
                enum: [
                  "number",
                  "string",
                  "array",
                  "array2d",
                  "array3d",
                  "matrix",
                  "boolean"
                ],
                description: "Type of the output"
              },
              subtype: {
                type: "string",
                enum: ["integer", "float", "string", "char", "boolean"],
                description: "For arrays, specifies the type of elements"
              }
            },
            required: ["description", "type"]
          },
          constraints: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: {
                  type: "string",
                  description: "Description of the constraint"
                },
                parameter: {
                  type: "string",
                  description: "The parameter this constraint applies to"
                },
                range: {
                  type: "object",
                  properties: {
                    min: { type: "number" },
                    max: { type: "number" }
                  }
                }
              },
              required: ["description"]
            }
          },
          test_cases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                input: {
                  type: "object",
                  properties: {
                    args: {
                      type: "array",
                      items: {
                        anyOf: [
                          { type: "integer" },
                          { type: "string" },
                          {
                            type: "array",
                            items: {
                              anyOf: [
                                { type: "integer" },
                                { type: "string" },
                                { type: "boolean" },
                                { type: "null" }
                              ]
                            }
                          },
                          { type: "object" },
                          { type: "boolean" },
                          { type: "null" }
                        ]
                      }
                    }
                  },
                  required: ["args"]
                },
                output: {
                  type: "object",
                  properties: {
                    result: {
                      anyOf: [
                        { type: "integer" },
                        { type: "string" },
                        {
                          type: "array",
                          items: {
                            anyOf: [
                              { type: "integer" },
                              { type: "string" },
                              { type: "boolean" },
                              { type: "null" }
                            ]
                          }
                        },
                        { type: "object" },
                        { type: "boolean" },
                        { type: "null" }
                      ]
                    }
                  },
                  required: ["result"]
                }
              },
              required: ["input", "output"]
            },
            minItems: 1
          }
        },
        required: ["problem_statement"]
      }
    }
  ]

  // Prepare the request payload
  const payload = {
    model: "gpt-4o-mini",
    messages: messages,
    functions: functions,
    function_call: { name: "extract_problem_details" },
    max_tokens: 4096
  }

  try {
    // Send the request to the completion endpoint
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${storedApiKey}`
        }
      }
    )

    // Extract the function call arguments from the response
    const functionCallArguments =
      response.data.choices[0].message.function_call.arguments

    // Return the parsed function call arguments
    return JSON.parse(functionCallArguments)
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error(
        "API Key out of credits. Please refill your OpenAI API credits and try again."
      )
    }

    throw error
  }
}

export async function generateSolutionResponses(
  problemInfo: ProblemInfo
): Promise<any> {
  // Generate input parameters string with error handling
  let inputParams = "Input parameters not available"
  if (problemInfo.input_format?.parameters) {
    inputParams = problemInfo.input_format.parameters
      .map(
        (p) => `- ${p.name}: ${p.type}${p.subtype ? ` of ${p.subtype}` : ""}`
      )
      .join("\n")
  }

  // Generate test cases string with error handling
  let testCasesStr = "Test cases not available"
  if (problemInfo.test_cases) {
    try {
      testCasesStr = JSON.stringify(problemInfo.test_cases, null, 2)
    } catch {
      testCasesStr = "Test cases not available"
    }
  }

  // Generate constraints string with error handling
  let constraintsStr = "Constraints not available"
  if (problemInfo.constraints) {
    constraintsStr = problemInfo.constraints
      .map((c) => {
        let constraintStr = `- ${c.description}`
        if (c.range) {
          constraintStr += ` (${c.parameter}: ${c.range.min} to ${c.range.max})`
        }
        return constraintStr
      })
      .join("\n")
  }

  // Generate output format string with error handling
  let outputFormat = "Output format not available"
  if (problemInfo.output_format) {
    const outputType = problemInfo.output_format.type
    const outputSubtype = problemInfo.output_format.subtype
      ? ` of ${problemInfo.output_format.subtype}`
      : ""
    outputFormat = `Returns: ${outputType}${outputSubtype}`
  }

  // Build the prompt
  const prompt = `
Given the following coding problem:

Problem Statement:
${problemInfo.problem_statement ?? "Problem statement not available"}

Input Format:
${
  problemInfo.input_format?.description ??
  "Input format description not available"
}
Parameters:
${inputParams}

Output Format:
${
  problemInfo.output_format?.description ??
  "Output format description not available"
}
${outputFormat}

Constraints:
${constraintsStr}

Example Test Cases:
${testCasesStr}

Please provide a solution in the following strict JSON format:
{
    "thoughts": [
        "Share up to 3 key thoughts as you work through solving this problem for the first time. Write in the voice of someone actively reasoning through their approach, using natural pauses, uncertainty, and casual language that shows real-time problem solving. IMPORTANT it should be max 100 characters per thought.",
        "The first thought should capture that initial moment of recognition - maybe connecting it to something familiar or identifying the core challenge. Include those verbal cues like 'hmm' or 'this reminds me of' that show active thinking.",
        "The second thought should explore your emerging strategy, showing how you're considering different approaches. Express both your algorithm knowledge and uncertainty - like 'I could probably use a heap here, but I'm worried about...' IMPORTANT: It is of utmost importance to mention the algorithm or data structure name in the second thought.",
        "The third thought should be about solidifying your general approach, without getting too detailed yet. Show satisfaction at having a direction while acknowledging you still need to work out specifics - like 'Okay, I think I see how this could work...'"
    ],
    "code": "def solution(args):
    # Your solution here
    # Each line should be on its own line with proper indentation
    result = []
    return result",
    "time_complexity": "O(Complexity): Brief explanation of why this is the case",
    "space_complexity": "O(Complexity): Brief explanation of why this is the case"
}

IMPORTANT FORMATTING NOTES:
1. In the code field, use actual line breaks (press enter for new lines)
2. Each line of code should be properly indented with spaces
3. Include clear comments explaining key parts of the solution
4. The entire response must be valid JSON that can be parsed`

  // Prepare the request payload
  const payload = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    max_tokens: 4096,
    temperature: 0,
    functions: [
      {
        name: "provide_solution",
        description: "Provide a solution for the coding problem",
        parameters: {
          type: "object",
          properties: {
            thoughts: {
              type: "array",
              description: "Three key insights about the solution approach",
              items: {
                type: "string"
              },
              minItems: 3,
              maxItems: 3
            },
            code: {
              type: "string",
              description: "The Python solution with detailed comments"
            },
            time_complexity: {
              type: "string",
              description: "Time complexity explanation"
            },
            space_complexity: {
              type: "string",
              description: "Space complexity explanation"
            }
          },
          required: ["thoughts", "code", "time_complexity", "space_complexity"]
        }
      }
    ],
    function_call: { name: "provide_solution" }
  }

  try {
    // Send the request to the completion endpoint
    const storedApiKey = store.get("openaiApiKey") as string
    if (!storedApiKey) {
      throw new Error("OpenAI API key not set")
    }

    // Don't log the full key for security reasons

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${storedApiKey}`
        }
      }
    )

    // Extract the function call arguments from the response
    const functionCallArguments =
      response.data.choices[0].message.function_call.arguments

    // Return the parsed function call arguments
    return JSON.parse(functionCallArguments)
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error(
        "API Key out of credits. Please refill your OpenAI API credits and try again."
      )
    }

    throw new Error(`Error generating solutions: ${error.message}`)
  }
}

export async function debugSolutionResponses(
  imageDataList: string[],
  problemInfo: ProblemInfo
): Promise<DebugSolutionResponse> {
  // Process images for inclusion in prompt
  const imageContents = imageDataList.map((imageData) => ({
    type: "image_url",
    image_url: {
      url: `data:image/jpeg;base64,${imageData}`
    }
  }))

  // Build the prompt with error handling
  const problemStatement =
    problemInfo.problem_statement ?? "Problem statement not available"

  const inputFormatDescription =
    problemInfo.input_format?.description ??
    "Input format description not available"

  const inputParameters = problemInfo.input_format?.parameters
    ? problemInfo.input_format.parameters
        .map(
          (p) => `- ${p.name}: ${p.type}${p.subtype ? ` of ${p.subtype}` : ""}`
        )
        .join(" ")
    : "Input parameters not available"

  const outputFormatDescription =
    problemInfo.output_format?.description ??
    "Output format description not available"

  const returns = problemInfo.output_format?.type
    ? `Returns: ${problemInfo.output_format.type}${
        problemInfo.output_format.subtype
          ? ` of ${problemInfo.output_format.subtype}`
          : ""
      }`
    : "Returns: Output type not available"

  const constraints = problemInfo.constraints
    ? problemInfo.constraints
        .map((c) => {
          let constraintStr = `- ${c.description}`
          if (c.range) {
            constraintStr += ` (${c.parameter}: ${c.range.min} to ${c.range.max})`
          }
          return constraintStr
        })
        .join(" ")
    : "Constraints not available"

  let exampleTestCases = "Test cases not available"
  if (problemInfo.test_cases) {
    try {
      exampleTestCases = JSON.stringify(problemInfo.test_cases, null, 2)
    } catch {
      exampleTestCases = "Test cases not available"
    }
  }

  // Construct the debug prompt
  const debugPrompt = `
Given the following coding problem and its visual representation:

Problem Statement:
${problemStatement}

Input Format:
${inputFormatDescription}
Parameters:
${inputParameters}

Output Format:
${outputFormatDescription}
${returns}

Constraints:
${constraints}

Example Test Cases:
${exampleTestCases}

First extract and analyze the code shown in the image. Then create an improved version while maintaining the same general approach and structure.
Focus on keeping the solution syntactically similar but with optimizations and INLINE comments ONLY ON lines of code that were changed.

The response should be in the following strict JSON format:
{
    "thoughts": [
        "List up to 3 specific changes made to improve the code, including your thoughts and reasoning. Write in the voice of someone actively reasoning through their approach, using natural pauses, uncertainty, and casual language that shows real-time problem solving. Instead of a robotic summary, showcase the thought process that led to a better solution. IMPORTANT: MAX 100 CHARACTERS PER THOUGHT."
    ],
    "old_code": "def solution(args):
    # Exact code from image
    pass",
    "new_code": "def solution(args):
    # Improved version with inline comments on changed lines
    pass",
    "time_complexity": "O(Complexity): Brief explanation including any minor optimizations",
    "space_complexity": "O(Complexity): Brief explanation including any minor optimizations"
}

IMPORTANT FORMATTING NOTES:
1. Use actual line breaks (press enter for new lines) in both old_code and new_code
2. Maintain proper indentation with spaces in both code blocks
3. Add inline comments ONLY on changed lines in new_code
4. The entire response must be valid JSON that can be parsed`

  // Construct the messages array
  const messages = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: debugPrompt
        },
        ...imageContents
      ]
    }
  ]

  // Define the function schema
  const functions = [
    {
      name: "provide_solution",
      description:
        "Debug based on the problem and provide a solution to the coding problem",
      parameters: {
        type: "object",
        properties: {
          thoughts: {
            type: "array",
            items: { type: "string" },
            description:
              "Share up to 3 key thoughts as you work through solving this problem for the first time. Write in the voice of someone actively reasoning through their approach, using natural pauses, uncertainty, and casual language that shows real-time problem solving. Each thought must be max 100 characters and be full sentences that don't sound choppy when read aloud.",
            maxItems: 3,
            thoughtGuidelines: [
              "First thought should capture that initial moment of recognition - connecting it to something familiar or identifying the core challenge. Include verbal cues like 'hmm' or 'this reminds me of' that show active thinking.",
              "Second thought must explore your emerging strategy and MUST explicitly name the algorithm or data structure being considered. Show both knowledge and uncertainty - like 'I could probably use a heap here, but I'm worried about...'",
              "Third thought should show satisfaction at having a direction while acknowledging you still need to work out specifics - like 'Okay, I think I see how this could work...'"
            ]
          },
          old_code: {
            type: "string",
            description: "The exact code implementation found in the image"
          },
          new_code: {
            type: "string",
            description:
              "The improved code implementation with in-line comments only on lines of code that were changed"
          },
          time_complexity: {
            type: "string",
            description:
              "Time complexity with explanation, format as 'O(_) because _.' Importantly, if there were slight optimizations in the complexity that don't affect the overall complexity, MENTION THEM."
          },
          space_complexity: {
            type: "string",
            description:
              "Space complexity with explanation, format as 'O(_) because _' Importantly, if there were slight optimizations in the complexity that don't affect the overall complexity, MENTION THEM."
          }
        },
        required: [
          "thoughts",
          "old_code",
          "new_code",
          "time_complexity",
          "space_complexity"
        ]
      }
    }
  ]

  // Prepare the payload for the API call
  const payload = {
    model: "o1-mini",
    messages: messages,
    max_tokens: 4000,
    temperature: 0,
    functions: functions,
    function_call: { name: "provide_solution" }
  }

  try {
    // Send the request to the OpenAI API
    const storedApiKey = store.get("openaiApiKey") as string
    if (!storedApiKey) {
      throw new Error("OpenAI API key not set")
    }

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${storedApiKey}`
        }
      }
    )

    // Extract the function call arguments from the response
    const functionCallArguments =
      response.data.choices[0].message.function_call.arguments

    // Parse and return the response
    return JSON.parse(functionCallArguments) as DebugSolutionResponse
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error(
        "API endpoint not found. Please check the model name and URL."
      )
    } else if (error.response?.status === 401) {
      throw new Error("Authentication failed. Please check your API key.")
    } else if (error.response?.status === 401) {
      throw new Error(
        "API Key out of credits. Please refill your OpenAI API credits and try again."
      )
    } else {
      throw new Error(
        `OpenAI API error: ${
          error.response?.data?.error?.message || error.message
        }`
      )
    }
  }
}
