"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, User, Mail, Lock, Eye, EyeOff, Sparkles, Shield, ArrowRight, CheckCircle, Building, Phone, UserPlus } from "lucide-react"
import { db, auth } from "../../firebase"
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

export default function SignUp() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [phoneCountryCode, setPhoneCountryCode] = useState("+1")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Update countryCodes array to include flag, country name, and code
  const countryCodes = [
    { code: "+1", label: "United States (+1)" },
    { code: "+44", label: "United Kingdom (+44)" },
    { code: "+91", label: "India (+91)" },
    { code: "+61", label: "Australia (+61)" },
    { code: "+81", label: "Japan (+81)" },
    { code: "+49", label: "Germany (+49)" },
    { code: "+33", label: "France (+33)" },
    { code: "+971", label: "UAE (+971)" },
    { code: "+86", label: "China (+86)" },
    { code: "+7", label: "Russia (+7)" },
    { code: "+39", label: "Italy (+39)" },
    { code: "+34", label: "Spain (+34)" },
    { code: "+55", label: "Brazil (+55)" },
    { code: "+27", label: "South Africa (+27)" },
    { code: "+82", label: "South Korea (+82)" },
    { code: "+62", label: "Indonesia (+62)" },
    { code: "+90", label: "Turkey (+90)" },
    { code: "+234", label: "Nigeria (+234)" },
    { code: "+63", label: "Philippines (+63)" },
    // Add more as needed
  ]

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Fetch all videos to extract unique categories
        const videosCollection = collection(db, "videos")
        const videoSnapshot = await getDocs(videosCollection)

        // Extract unique categories
        const uniqueCategories = new Set<string>()
        videoSnapshot.docs.forEach((doc) => {
          const category = doc.data().category
          if (category && category !== "General" && category !== "Other" && category !== "Miscellaneous") {
            uniqueCategories.add(category)
          }
        })

        
      } catch (error) {
        console.error("Error fetching categories:", error)
      }
    }

    fetchCategories()
    
    // Trigger animations
    setTimeout(() => {
      setIsLoaded(true)
    }, 100)
  }, [])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Reset error
    setError("")

    // Collect all validation errors
    const errors = []

    console.log("Phone number value:", phoneNumber);

    if (!name) {
      errors.push("Name is required")
    }

    if (!email) {
      errors.push("Email is required")
    }

    if (!password) {
      errors.push("Password is required")
    } else if (password.length < 6) {
      errors.push("Password must be at least 6 characters")
    }

    if (!confirmPassword) {
      errors.push("Please confirm your password")
    } else if (password !== confirmPassword) {
      errors.push("Passwords do not match")
    }

    if (!companyName) {
      errors.push("Company Name is required")
    }
    
    if (!phoneNumber) {
      errors.push("Phone number is required")
    } else if (!/^\d{6,15}$/.test(phoneNumber)) {
      errors.push("Phone number must be digits only (6-15 digits)")
    }
    
    if (!termsAccepted) {
      errors.push("You must accept the terms and conditions")
    }


    if (!phoneCountryCode) {
      errors.push("Country code is required")
    } else if (!/^\+\d{1,4}$/.test(phoneCountryCode)) {
      errors.push("Country code must start with + and be 1-4 digits")
    }

    if (errors.length > 0) {
      setError(errors.join(". "))
      setLoading(false)
      return
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)

      // Add user to users collection
      await addDoc(collection(db, "users"), {
        userId: userCredential.user.uid,
        email: userCredential.user.email,
        name: name,
        companyName: companyName,
        phoneCountryCode: phoneCountryCode,
        phoneNumber: phoneNumber,
        createdAt: serverTimestamp(),
        accountCreatedAt: userCredential.user.metadata.creationTime || null,
        role: "user",
      })

      // Redirect to dashboard
      router.push("/login")
    } catch (err: any) {
      console.error("Error signing up:", err)
      if (err.code === "auth/email-already-in-use") {
        setError("Email is already in use")
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address")
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak")
      } else {
        setError("Failed to create an account. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

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
            <Link href="/about" className="text-base font-medium text-gray-700 hover:text-green-600 transition-colors relative group">
              About
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-green-600 transition-all group-hover:w-full"></span>
            </Link>
            <Link href="https://eoxs.com/contact" className="text-base font-medium text-gray-700 hover:text-green-600 transition-colors relative group">
              Contact
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-green-600 transition-all group-hover:w-full"></span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center py-12 px-4 relative z-10">
        <div className="w-full max-w-md text-center mb-8">
          <div className={`transform transition-all duration-700 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="flex items-center justify-center gap-2 mb-6">
              <img src="/lVJ7PU01.svg" alt="Logo" className="h-20 md:h-25 w-auto" />
            </div>
            
            <h1 className="text-4xl font-light text-gray-900 mb-3">
              Create your account
            </h1>
            <p className="text-lg text-gray-600">Start your personalized demo experience today</p>
          </div>
        </div>

        <div className={`w-full max-w-md transform transition-all duration-700 delay-200 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {error && (
            <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-8">
            <form onSubmit={handleSignup} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User className="h-4 w-4 text-green-600" />
                  Full Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 text-base rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500 transition-all duration-300"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-green-600" />
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 text-base rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500 transition-all duration-300"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="companyName" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Building className="h-4 w-4 text-green-600" />
                  Company Name
                </label>
                <Input
                  id="companyName"
                  type="text"
                  placeholder="Enter your company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 text-base rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500 transition-all duration-300"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-green-600" />
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <Select value={phoneCountryCode} onValueChange={setPhoneCountryCode}>
                    <SelectTrigger className="h-12 text-base rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500 transition-all duration-300 w-32">
                      <SelectValue placeholder="Code" />
                    </SelectTrigger>
                    <SelectContent>
                      {countryCodes.map((country) => (
                        <SelectItem key={country.code} value={country.code}>{country.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="Enter phone number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                    required
                    disabled={loading}
                    className="h-12 text-base rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500 transition-all duration-300 flex-1"
                    maxLength={15}
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
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 text-base rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500 transition-all duration-300 pr-12"
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

              <div className="space-y-2">
                <label htmlFor="confirm-password" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-green-600" />
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 text-base rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500 transition-all duration-300 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2 py-2">
                <Checkbox 
                  id="terms" 
                  checked={termsAccepted} 
                  onCheckedChange={() => setTermsAccepted(!termsAccepted)}
                  className="border-gray-300 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                />
                <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
                  I accept the <Link href="/terms" className="text-green-600 hover:underline">Terms and Conditions</Link>
                </label>
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
                      Creating account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-5 w-5 text-white" />
                      <span className="text-white">Create Account</span>
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform text-white" />
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Button>

              <div className="text-center mt-6">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <Link href="/login" className="text-green-600 hover:text-green-700 hover:underline font-medium transition-colors">
                    Sign In
                  </Link>
                </p>
              </div>
            </form>
          </div>

          {/* Security features */}
          <div className={`mt-8 text-center transform transition-all duration-700 delay-400 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span>Your data is protected with enterprise-grade security</span>
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>SSL Encrypted</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>GDPR Compliant</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Privacy First</span>
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