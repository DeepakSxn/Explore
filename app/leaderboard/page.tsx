"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/firebase"
import { useAuth } from "../context/AuthContext"
import { useGamification } from "../context/GamificationContext"
import Leaderboard from "../components/Leaderboard"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function LeaderboardPage() {
  const router = useRouter()
  const { userData } = useAuth()
  const { userProgress } = useGamification()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setLoading(false)
      } else {
        // Redirect to login if not authenticated
        router.push("/login")
      }
    })

    return () => {
      unsubscribe()
    }
  }, [router])

  // Check for suspension status
  useEffect(() => {
    if (userData && (userData.isSuspended || userData.manuallySuspended)) {
      router.push("/suspended")
    }
  }, [userData, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-xl font-bold">Leaderboard</h1>
                <p className="text-sm text-muted-foreground">See how you rank among other learners</p>
              </div>
            </div>
            {userProgress && (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-sm font-medium">{userProgress.totalXP} XP</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Leaderboard />
      </main>
    </div>
  )
} 