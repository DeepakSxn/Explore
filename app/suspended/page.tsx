"use client"

import { useAuth } from "../context/AuthContext"
import SuspendedAccount from "../components/SuspendedAccount"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SuspendedPage() {
  const { user, userData, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If user is not authenticated, redirect to login
    if (!loading && !user) {
      router.push("/login")
    }
    
    // If user is not suspended, redirect to dashboard
    if (!loading && user && userData && !userData.isSuspended && !userData.manuallySuspended) {
      router.push("/dashboard")
    }
  }, [user, userData, loading, router])

  // Show loading while checking authentication and suspension status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // If user is not authenticated, don't render anything (will redirect)
  if (!user) {
    return null
  }

  // If user is not suspended, don't render anything (will redirect)
  if (!userData?.isSuspended && !userData?.manuallySuspended) {
    return null
  }

  // Show suspended account page
  return (
    <SuspendedAccount 
      daysUntilSuspension={userData?.daysUntilSuspension} 
      suspensionReason={userData?.suspensionReason}
      isManualSuspension={userData?.manuallySuspended}
    />
  )
} 