"use client"

import React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, 
  TrendingUp, 
  Calendar, 
  Clock,
  Target,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useGamification } from "../context/GamificationContext"
import { useAuth } from "../context/AuthContext"

export default function AnalyticsPage() {
  const router = useRouter()
  const { userProgress, loading } = useGamification()
  const { userData } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!userProgress) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Analytics Not Available</h1>
          <p className="text-muted-foreground mb-6">Unable to load your analytics data.</p>
          <Button onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const calculateAverageWatchTime = () => {
    if (userProgress.totalVideosWatched === 0) return 0
    return Math.round(userProgress.totalWatchTime / userProgress.totalVideosWatched)
  }

  const calculateCompletionRate = () => {
    // Assuming there are about 50 total videos in the system
    const totalVideos = 50
    return Math.round((userProgress.totalVideosWatched / totalVideos) * 100)
  }

  const getPerformanceGrade = () => {
    const completionRate = calculateCompletionRate()
    if (completionRate >= 90) return { grade: 'A+', color: 'text-green-600', bg: 'bg-green-100' }
    if (completionRate >= 80) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-100' }
    if (completionRate >= 70) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-100' }
    if (completionRate >= 60) return { grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    return { grade: 'D', color: 'text-red-600', bg: 'bg-red-100' }
  }

  const performanceGrade = getPerformanceGrade()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
            </Button>
              <div>
                <h1 className="text-xl font-bold">Learning Analytics</h1>
                <p className="text-sm text-muted-foreground">Your detailed progress insights</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50">
                <Activity className="h-3 w-3 mr-1" />
                Real-time
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total XP</p>
                  <p className="text-3xl font-bold">{userProgress.totalXP}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                  <TrendingUp className="h-6 w-6" />
          </div>
        </div>
                </CardContent>
              </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Videos Watched</p>
                  <p className="text-3xl font-bold">{userProgress.totalVideosWatched}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                  <Calendar className="h-6 w-6" />
                </div>
              </div>
                </CardContent>
              </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Current Streak</p>
                  <p className="text-3xl font-bold">{userProgress.currentStreak}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                  <Target className="h-6 w-6" />
                </div>
              </div>
                </CardContent>
              </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Level</p>
                  <p className="text-3xl font-bold">{userProgress.currentLevel}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                  <BarChart3 className="h-6 w-6" />
                </div>
              </div>
                </CardContent>
              </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Overview */}
          <Card>
                <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Performance Overview
                  </CardTitle>
                </CardHeader>
            <CardContent className="space-y-6">
              {/* Completion Rate */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Course Completion</span>
                  <span className="text-sm text-muted-foreground">{calculateCompletionRate()}%</span>
                </div>
                <Progress value={calculateCompletionRate()} className="h-2" />
              </div>

              {/* Average Watch Time */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Average Watch Time</span>
                  <span className="text-sm text-muted-foreground">{calculateAverageWatchTime()} min/video</span>
                </div>
                <Progress value={Math.min(calculateAverageWatchTime() / 10 * 100, 100)} className="h-2" />
              </div>

              {/* Streak Performance */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Streak Performance</span>
                  <span className="text-sm text-muted-foreground">{userProgress.currentStreak}/{userProgress.longestStreak} days</span>
                </div>
                <Progress value={(userProgress.currentStreak / Math.max(userProgress.longestStreak, 1)) * 100} className="h-2" />
              </div>

              {/* Performance Grade */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Overall Grade</p>
                  <p className="text-xs text-muted-foreground">Based on completion and engagement</p>
                </div>
                <div className={`text-2xl font-bold ${performanceGrade.color} ${performanceGrade.bg} px-3 py-1 rounded`}>
                  {performanceGrade.grade}
                </div>
              </div>
                </CardContent>
              </Card>

          {/* Learning Statistics */}
          <Card>
                <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Learning Statistics
                  </CardTitle>
                </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{userProgress.totalWatchTime}</div>
                  <div className="text-sm text-muted-foreground">Total Minutes</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{userProgress.badges.length}</div>
                  <div className="text-sm text-muted-foreground">Badges Earned</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{userProgress.achievements.length}</div>
                  <div className="text-sm text-muted-foreground">Achievements</div>
                              </div>
                              </div>

                    </CardContent>
                  </Card>
        </div>

        {/* Detailed Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Learning Patterns */}
                  <Card>
                    <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Learning Patterns
              </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Daily Average</span>
                  <span className="font-medium">{Math.round(userProgress.totalWatchTime / Math.max(userProgress.currentStreak, 1))} min/day</span>
                              </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Best Day</span>
                  <span className="font-medium">{Math.round(userProgress.totalWatchTime / Math.max(userProgress.totalVideosWatched, 1))} min</span>
                                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Consistency</span>
                  <span className="font-medium">{userProgress.currentStreak > 0 ? 'Good' : 'Needs Improvement'}</span>
                              </div>
                      </div>
                    </CardContent>
                  </Card>

          {/* Progress Milestones */}
                  <Card>
                    <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Progress Milestones
              </CardTitle>
                    </CardHeader>
                    <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${userProgress.totalVideosWatched >= 1 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm">First Video (1)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${userProgress.totalVideosWatched >= 5 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm">Getting Started (5)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${userProgress.totalVideosWatched >= 10 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm">Video Enthusiast (10)</span>
                              </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${userProgress.totalVideosWatched >= 25 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm">Learning Champion (25)</span>
                                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${userProgress.totalVideosWatched >= 50 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm">Master Learner (50)</span>
                              </div>
                      </div>
                    </CardContent>
                  </Card>

          {/* Recommendations */}
                  <Card>
                    <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recommendations
              </CardTitle>
                    </CardHeader>
                    <CardContent>
              <div className="space-y-3">
                {userProgress.currentStreak === 0 && (
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <p className="text-sm font-medium text-orange-800">Start Your Streak</p>
                    <p className="text-xs text-orange-600">Watch a video today to begin your learning streak!</p>
                  </div>
                )}
                
                {userProgress.totalVideosWatched < 5 && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">Complete More Videos</p>
                    <p className="text-xs text-blue-600">Watch 5 videos to earn your first badge.</p>
                            </div>
                )}
                
                
                {userProgress.currentLevel < 3 && (
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm font-medium text-purple-800">Level Up</p>
                    <p className="text-xs text-purple-600">Earn more XP to reach the next level.</p>
                            </div>
                )}
                      </div>
                    </CardContent>
                  </Card>
        </div>
      </main>
    </div>
  )
}

