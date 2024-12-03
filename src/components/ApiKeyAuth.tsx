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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 rounded-xl w-fit">
      <Card className="w-fit">
        <CardHeader>
          <CardTitle>Welcome to Interview Coder</CardTitle>
          <CardDescription>
            Please enter your OpenAI API key to continue. Your key will be
            stored securely in encrypted storage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full"
              />
            </div>
            <Button type="submit" className="w-full" disabled={!apiKey.trim()}>
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ApiKeyAuth
