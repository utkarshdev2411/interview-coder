import { useState } from "react"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "./ui/card"

interface ApiKeyAuthProps {
  onApiKeySubmit: (apiKey: string) => void
}

const ApiKeyAuth: React.FC<ApiKeyAuthProps> = ({ onApiKeySubmit }) => {
  const [apiKey, setApiKey] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (apiKey.trim()) {
      onApiKeySubmit(apiKey.trim())
    }
  }

  return (
    <div className="h-fit flex flex-col items-center justify-center bg-gray-50 rounded-xl w-fit">
      <Card className="w-[400px]">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-semibold text-center">
            Welcome to Interview Coder
          </CardTitle>
          <CardDescription className="text-center text-gray-500">
            Please enter your OpenAI API key to continue. Your key will be
            stored securely in encrypted storage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full h-10"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-medium"
              disabled={!apiKey.trim()}
            >
              Continue
            </Button>
            <p className="text-gray-400 text-xs text-center pt-2">
              built by roy & neel
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ApiKeyAuth
