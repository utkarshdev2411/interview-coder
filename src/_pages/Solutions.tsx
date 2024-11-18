const Solutions = () => {
  return <div>solutiosn page</div>
}

export default Solutions

// import React from "react"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Skeleton } from "@/components/ui/skeleton"

// interface Solution {
//   initialThoughts: string[]
//   thoughtSteps: string[]
//   approach: string
//   code: string
//   tradeoffs: string[]
// }

// interface SolutionsProps {
//   isLoading: boolean
//   solutions?: Solution[]
//   error?: string
// }

// const Solutions: React.FC<SolutionsProps> = ({
//   isLoading,
//   solutions,
//   error
// }) => {
//   return (
//     <div className="min-h-screen w-screen bg-transparent backdrop-blur-md">
//       <div className="container mx-auto p-6">
//         {error ? (
//           <Card className="border-red-500/20 bg-black/30">
//             <CardHeader>
//               <CardTitle className="text-red-500">
//                 Error Processing Screenshots
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               <p className="text-red-400">{error}</p>
//             </CardContent>
//           </Card>
//         ) : isLoading ? (
//           <div className="space-y-6">
//             <div className="flex items-center gap-4 mb-6">
//               <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
//               <h2 className="text-white text-lg">Analyzing your code...</h2>
//             </div>
//             {[1, 2, 3].map((i) => (
//               <Card key={i} className="bg-black/30">
//                 <CardHeader>
//                   <CardTitle>
//                     <Skeleton className="h-6 w-48 bg-white/10" />
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent className="space-y-4">
//                   <Skeleton className="h-4 w-full bg-white/10" />
//                   <Skeleton className="h-4 w-3/4 bg-white/10" />
//                   <Skeleton className="h-32 w-full bg-white/10" />
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         ) : solutions ? (
//           <div className="space-y-6">
//             <h2 className="text-white text-xl font-semibold">
//               Possible Solutions
//             </h2>
//             {solutions.map((solution, index) => (
//               <Card key={index} className="bg-black/30">
//                 <CardHeader>
//                   <CardTitle className="text-white">
//                     Solution {index + 1}
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent className="space-y-4">
//                   <div>
//                     <h3 className="text-white/90 font-medium mb-2">
//                       Initial Thoughts
//                     </h3>
//                     <ul className="list-disc list-inside text-white/80 space-y-1">
//                       {solution.initialThoughts.map((thought, i) => (
//                         <li key={i}>{thought}</li>
//                       ))}
//                     </ul>
//                   </div>

//                   <div>
//                     <h3 className="text-white/90 font-medium mb-2">Approach</h3>
//                     <p className="text-white/80">{solution.approach}</p>
//                   </div>

//                   <div>
//                     <h3 className="text-white/90 font-medium mb-2">
//                       Implementation
//                     </h3>
//                     <pre className="bg-black/40 p-4 rounded-lg overflow-x-auto">
//                       <code className="text-white/90">{solution.code}</code>
//                     </pre>
//                   </div>

//                   <div>
//                     <h3 className="text-white/90 font-medium mb-2">
//                       Trade-offs
//                     </h3>
//                     <ul className="list-disc list-inside text-white/80 space-y-1">
//                       {solution.tradeoffs.map((tradeoff, i) => (
//                         <li key={i}>{tradeoff}</li>
//                       ))}
//                     </ul>
//                   </div>
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         ) : null}
//       </div>
//     </div>
//   )
// }

// export default Solutions
