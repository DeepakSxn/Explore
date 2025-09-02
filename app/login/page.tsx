"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, User, Mail, Lock, Eye, EyeOff, Sparkles, Shield, ArrowRight, CheckCircle } from "lucide-react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { toast } from "@/components/ui/use-toast"
import { auth } from "@/firebase"

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (!email || !password) {
      setError("Please enter both email and password")
      setLoading(false)
      return
    }

    try {
      setError("")
      await signInWithEmailAndPassword(auth, email, password)
      // Store in localStorage if remember me is checked
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email)
      } else {
        localStorage.removeItem("rememberedEmail")
      }
      router.push("/dashboard")
    } catch (err: any) {
      setError("Failed to log in. Please check your credentials.")
      console.error(err)
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Load remembered email on component mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedEmail")
    if (rememberedEmail) {
      setEmail(rememberedEmail)
      setRememberMe(true)
    }
    
    // Trigger animations
    setTimeout(() => {
      setIsLoaded(true)
    }, 100)
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50 relative overflow-hidden">
      {/* Advanced mesh gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-100/40 via-blue-50/30 to-purple-100/40"></div>
      
      {/* Animated mesh overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent_50%)] animate-pulse-scale"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.1),transparent_50%)] animate-pulse-scale animation-delay-2000"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(168,85,247,0.1),transparent_50%)] animate-pulse-scale animation-delay-4000"></div>

      {/* Enhanced Particle effects */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(35)].map((_, i) => (
          <div
            key={i}
            className={`absolute rounded-full ${
              i % 4 === 0 ? 'bg-green-400 animate-pulse' : 
              i % 4 === 1 ? 'bg-blue-400 animate-bounce-slow' : 
              i % 4 === 2 ? 'bg-purple-400 animate-pulse-scale' :
              'bg-pink-400 animate-float'
            }`}
            style={{
              width: `${Math.random() * 6 + 1}px`,
              height: `${Math.random() * 6 + 1}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.4 + 0.1,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${4 + Math.random() * 6}s`
            }}
          />
        ))}
      </div>

      {/* Floating geometric shapes with glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-16 left-16 w-40 h-40 border border-green-300/40 rounded-full animate-spin-slow shadow-[0_0_20px_rgba(34,197,94,0.3)]"></div>
        <div className="absolute top-24 right-24 w-32 h-32 border border-blue-300/40 rotate-45 animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.3)]"></div>
        <div className="absolute bottom-40 left-1/3 w-28 h-28 border border-purple-300/40 rounded-full animate-bounce-slow shadow-[0_0_20px_rgba(168,85,247,0.3)]"></div>
        <div className="absolute bottom-24 right-1/4 w-20 h-20 border border-pink-300/40 rotate-12 animate-pulse-scale shadow-[0_0_20px_rgba(236,72,153,0.3)]"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 border border-green-300/40 rounded-full animate-float shadow-[0_0_20px_rgba(34,197,94,0.3)]"></div>
      </div>

      {/* Enhanced gradient blobs with better colors */}
      <div className="absolute top-16 left-16 w-[500px] h-[500px] bg-gradient-to-br from-green-200/30 via-emerald-200/20 to-teal-200/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
      <div className="absolute bottom-16 right-16 w-[500px] h-[500px] bg-gradient-to-br from-blue-200/30 via-indigo-200/20 to-purple-200/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-br from-purple-200/25 via-pink-200/20 to-rose-200/25 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>

      {/* Light rays effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-green-300/20 to-transparent animate-pulse"></div>
        <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-blue-300/20 to-transparent animate-pulse animation-delay-2000"></div>
        <div className="absolute top-0 left-3/4 w-px h-full bg-gradient-to-b from-transparent via-purple-300/20 to-transparent animate-pulse animation-delay-4000"></div>
      </div>

      {/* Floating orbs with glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-32 left-1/4 w-4 h-4 bg-green-400 rounded-full animate-float shadow-[0_0_20px_rgba(34,197,94,0.6)]"></div>
        <div className="absolute top-48 right-1/3 w-3 h-3 bg-blue-400 rounded-full animate-float animation-delay-2000 shadow-[0_0_15px_rgba(59,130,246,0.6)]"></div>
        <div className="absolute bottom-32 left-1/3 w-5 h-5 bg-purple-400 rounded-full animate-float animation-delay-4000 shadow-[0_0_25px_rgba(168,85,247,0.6)]"></div>
        <div className="absolute bottom-48 right-1/4 w-2 h-2 bg-pink-400 rounded-full animate-float animation-delay-1000 shadow-[0_0_10px_rgba(236,72,153,0.6)]"></div>
      </div>

      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent animate-pulse-scale opacity-40"></div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="container flex h-20 items-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center">
            <Link href="/" className="flex items-center group">
              <img src="/Black logo.png" alt="EOXS Logo" className="h-8 w-auto transition-transform group-hover:scale-105" />
            </Link>
          </div>
          <nav className="ml-auto flex gap-8 items-center">
            <Link href="/admin-login">
              <Button variant="outline" size="sm" className="gap-2 hover:bg-green-50 hover:border-green-600 hover:text-green-600 transition-all duration-300">
                <User size={16} />
                <span>Admin</span>
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center py-12 px-4 relative z-10">
        <div className="w-full max-w-md text-center mb-8">
          <div className={`transform transition-all duration-700 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="flex flex-col items-center justify-center gap-4 mb-6">
              <img 
                src="lVJ7PU01.svg"
                alt="EOXS Logo"
                className="h-20 md:h-25 w-auto mb-4"
              />
              <div className="flex items-center gap-2">
               
              </div>
            </div>
            
            <h1 className="text-4xl font-light text-gray-900 mb-3">
              Sign in to your account
            </h1>
           
          </div>
        </div>

        <div className={`w-full max-w-md transform transition-all duration-700 delay-200 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {error && (
            <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-8">
            <form onSubmit={handleEmailLogin} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-green-600" />
                  Email Address
                </label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 text-base rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500 transition-all duration-300 pl-4 pr-4"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-green-600" />
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 text-base rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500 transition-all duration-300 pl-4 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="border-gray-300 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                  />
                  <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                    Remember me
                  </label>
                </div>

                <Link href="/forgot-password" className="text-sm text-green-600 hover:text-green-700 hover:underline transition-colors">
                  Forgot Password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group relative overflow-hidden"
                disabled={loading}
              >
                <span className="relative z-10 flex items-center justify-center text-white">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin text-white" />
                      <span className="text-white">Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-white">Sign In</span>
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform text-white" />
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Button>

              <div className="text-center mt-6">
                <p className="text-sm text-gray-600">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="text-green-600 hover:text-green-700 hover:underline font-medium transition-colors">
                    Sign Up
                  </Link>
                </p>
              </div>
            </form>
          </div>

          {/* Security features */}
          <div className={`mt-8 text-center transform transition-all duration-700 delay-400 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span>Secure login with industry-standard encryption</span>
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>SSL Protected</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>2FA Ready</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>GDPR Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 relative z-10">
        <div className="container px-4 md:px-6 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <img src="/EOXS Logo- White-main.png" alt="EOXS Logo" className="h-8 w-auto" />
              <span className="text-gray-400">© 2025 EOXSplore. All rights reserved.</span>
            </div>
            <div className="flex gap-8 text-sm">
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/certified" className="text-gray-400 hover:text-white transition-colors">
                Certified Engineer
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
