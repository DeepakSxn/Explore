"use client"

import { useAuth } from "../context/AuthContext"
import SuspendedAccount from "./SuspendedAccount"
import { useEffect, useState } from "react"

interface SuspensionWrapperProps {
  children: React.ReactNode
}

export default function SuspensionWrapper({ children }: SuspensionWrapperProps) {
  const { user, userData, loading } = useAuth()
  const [showSuspended, setShowSuspended] = useState(false)

  useEffect(() => {
    if (!loading && user && userData) {
      // Check for both automatic and manual suspension
      const isSuspended = userData.isSuspended || userData.manuallySuspended || false
      setShowSuspended(isSuspended)
    } else if (!loading && !user) {
      setShowSuspended(false)
    }
  }, [user, userData, loading])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (showSuspended) {
    return <SuspendedAccount 
      daysUntilSuspension={userData?.daysUntilSuspension} 
      suspensionReason={userData?.suspensionReason}
      isManualSuspension={userData?.manuallySuspended}
    />
  }

  return <>{children}</>
} 