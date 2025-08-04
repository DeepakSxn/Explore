"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Trophy, Star, Target, TrendingUp, RefreshCw, CheckCircle } from "lucide-react"
import { getQuizStatsForUser, type QuizAttempt } from "../firestore-utils"
import { useAuth } from "../context/AuthContext"

interface QuizStats {
  totalAttempts: number
  firstAttempts: number
  rewatchedAttempts: number
  perfectScores: number
  averageScore: number
  totalXPEarned: number
  uniqueVideosQuized: number
}

export default function UserQuizStats() {
  const [stats, setStats] = useState<QuizStats | null>(null)
  const [loading, setLoading] = useState(true)
  const { userData } = useAuth()

  useEffect(() => {
    const loadStats = async () => {
      if (!userData) return
      
      try {
        setLoading(true)
        const userStats = await getQuizStatsForUser(userData.uid)
        setStats(userStats)
      } catch (error) {
        console.error("Error loading quiz stats:", error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [userData])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Quiz Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Quiz Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No quiz data available yet. Start watching videos and taking quizzes!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Quiz Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.totalAttempts}</div>
            <div className="text-sm text-muted-foreground">Total Attempts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.firstAttempts}</div>
            <div className="text-sm text-muted-foreground">First Attempts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.rewatchedAttempts}</div>
            <div className="text-sm text-muted-foreground">Rewatched</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.perfectScores}</div>
            <div className="text-sm text-muted-foreground">Perfect Scores</div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Average Score</span>
              <span className="text-sm text-muted-foreground">
                {stats.averageScore.toFixed(1)}%
              </span>
            </div>
            <Progress value={stats.averageScore} className="h-2" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Videos with Quizzes</span>
              <span className="text-sm text-muted-foreground">
                {stats.uniqueVideosQuized} videos
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full">
              <div 
                className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((stats.uniqueVideosQuized / 10) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* XP Summary */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-5 w-5 text-yellow-600" />
            <span className="font-semibold">Total XP Earned from Quizzes</span>
          </div>
          <div className="text-2xl font-bold text-yellow-600">{stats.totalXPEarned} XP</div>
        </div>

        {/* Achievement Badges */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Achievements
          </h4>
          <div className="flex flex-wrap gap-2">
            {stats.totalAttempts >= 5 && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                <Target className="h-3 w-3 mr-1" />
                Quiz Enthusiast
              </Badge>
            )}
            {stats.perfectScores >= 3 && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                <Trophy className="h-3 w-3 mr-1" />
                Perfect Scorer
              </Badge>
            )}
            {stats.averageScore >= 80 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                <TrendingUp className="h-3 w-3 mr-1" />
                High Performer
              </Badge>
            )}
            {stats.uniqueVideosQuized >= 5 && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300">
                <RefreshCw className="h-3 w-3 mr-1" />
                Knowledge Seeker
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 