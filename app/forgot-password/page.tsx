"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  const [useCustomReset, setUseCustomReset] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)
    if (!email) {
      setError("Please enter your email address.")
      setLoading(false)
      return
    }
    
    try {
      if (useCustomReset) {
        // Use custom password reset implementation
        console.log("Using custom password reset for:", email)
        
        const response = await fetch('/api/password-reset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            action: 'request'
          })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to send password reset email');
        }
        
        setSuccess("Password reset email sent! Please check your inbox and spam folder.")
        toast({
          title: "Success",
          description: "Password reset email sent! Check your inbox and spam folder.",
        })
        
        console.log("Custom password reset email sent successfully to:", email)
        
      } else {
        // Use Firebase password reset
        const actionCodeSettings = {
          url: `${window.location.origin}/login?email=${encodeURIComponent(email)}`,
          handleCodeInApp: false,
        }
        
        console.log("Sending Firebase password reset email to:", email)
        console.log("Action URL:", actionCodeSettings.url)
        console.log("Current origin:", window.location.origin)
        
        await sendPasswordResetEmail(auth, email, actionCodeSettings)
        setSuccess("Password reset email sent! Please check your inbox and spam folder.")
        toast({
          title: "Success",
          description: "Password reset email sent! Check your inbox and spam folder.",
        })
        
        console.log("Firebase password reset email sent successfully to:", email)
      }
      
    } catch (err: any) {
      console.error("Password reset error:", err)
      console.error("Error code:", err.code)
      console.error("Error message:", err.message)
      
      // Provide more specific error messages
      let errorMessage = "Failed to send password reset email."
      
      if (err.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email address."
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address."
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = "Too many reset attempts. Please try again later."
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = "Network error. Please check your internet connection and try again."
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="bg-transparent">
        <div className="container flex h-20 items-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <img src="/Black logo.png" alt="EOXS Logo" className="h-8 w-auto" />
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center py-12 px-4">
        <div className="w-full max-w-md text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Forgot Password</h1>
          <p className="text-base">Enter your email to receive a password reset link.</p>
        </div>
        <div className="w-full max-w-md">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mb-6">
              <AlertDescription>
                {success}
                <div className="mt-2 text-sm">
                  <p>If you don't see the email:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Check your spam/junk folder</li>
                    <li>Wait a few minutes for delivery</li>
                    <li>Verify the email address is correct</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-12 text-base rounded-md"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-base bg-green-600 hover:bg-green-500 rounded-md"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
            <div className="text-center mt-4">
              <Link href="/login" className="text-green-600 hover:underline text-sm">
                Back to Login
              </Link>
            </div>
          </form>
          
          {/* Debug Section */}
          <div className="mt-8 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <button
                type="button"
                onClick={() => setShowDebug(!showDebug)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                {showDebug ? "Hide" : "Show"} Debug Info
              </button>
              
              <label className="flex items-center text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={useCustomReset}
                  onChange={(e) => setUseCustomReset(e.target.checked)}
                  className="mr-2"
                />
                Use Custom Reset (if Firebase fails)
              </label>
            </div>
            
            {showDebug && (
              <div className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-600">
                <p><strong>Current URL:</strong> {window.location.href}</p>
                <p><strong>Origin:</strong> {window.location.origin}</p>
                <p><strong>Firebase Auth Domain:</strong> demoauth-82b79.firebaseapp.com</p>
                <p><strong>Project ID:</strong> demoauth-82b79</p>
                <p><strong>Action URL:</strong> {window.location.origin}/login</p>
                <p><strong>Reset Method:</strong> {useCustomReset ? 'Custom' : 'Firebase'}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
} 