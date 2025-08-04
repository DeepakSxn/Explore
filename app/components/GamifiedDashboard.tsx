"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Trophy, 
  Star, 
  Zap, 
  Target, 
  BookOpen, 
  Play, 
  Lock, 
  CheckCircle, 
  TrendingUp,
  Award,
  Flame,
  Crown,
  Sparkles,
  ArrowRight,
  Clock,
  Users,
  BarChart3,
  Medal
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useGamification, XP_CONFIG } from "../context/GamificationContext"
import { useAuth } from "../context/AuthContext"
import { toast } from "@/components/ui/use-toast"

import ChallengeMode from "./ChallengeMode"

interface Video {
  id: string
  title: string
  description: string
  thumbnailUrl?: string
  videoUrl?: string
  duration: string
  category: string
  tags?: string[]
  createdAt: any
  watched?: boolean
  company?: string
}

interface Module {
  name: string
  category: string
  totalDuration: string
  videos: Video[]
}

export default function GamifiedDashboard() {
  const router = useRouter()
  const { userProgress, loading, getCurrentLevel, getXPToNextLevel, getLevelProgress } = useGamification()
  const { userData } = useAuth()
  const [showConfetti, setShowConfetti] = useState(false)
  const [dailyReminder, setDailyReminder] = useState("")
  const [moduleSuggestions, setModuleSuggestions] = useState<any[]>([])

  const [showChallengeMode, setShowChallengeMode] = useState(false)

  // Function to switch to classic dashboard view
  const switchToClassicView = () => {
    // Dispatch a custom event to communicate with the parent dashboard component
    window.dispatchEvent(new CustomEvent('switchToClassicView'))
  }

  // Generate daily reminder based on user progress
  useEffect(() => {
    if (userProgress) {
      const suggestions = [
        "Just 5 minutes to finish the Inventory module!",
        "Keep your streak alive - watch one video today!",
        "You're close to leveling up - complete a quiz!",
        "Try the Processing module for 50 XP!",
        "Your streak is impressive - maintain it today!"
      ]
      setDailyReminder(suggestions[Math.floor(Math.random() * suggestions.length)])
    }
  }, [userProgress])

  // Generate module suggestions
  useEffect(() => {
    if (userProgress) {
      const suggestions = [
        {
          name: "Processing",
          xpReward: 50,
          description: "Learn about processing operations",
          icon: "⚙️",
          isUnlocked: userProgress.unlockedModules.includes("Processing")
        },
        {
          name: "Inventory",
          xpReward: 75,
          description: "Master inventory management",
          icon: "📦",
          isUnlocked: userProgress.unlockedModules.includes("Inventory")
        },
        {
          name: "Finance",
          xpReward: 100,
          description: "Understand financial operations",
          icon: "💰",
          isUnlocked: userProgress.unlockedModules.includes("Finance and Accounting")
        }
      ]
      setModuleSuggestions(suggestions)
    }
  }, [userProgress])

  const handleModuleClick = (module: any) => {
    if (module.isUnlocked) {
      router.push(`/dashboard?module=${module.name}`)
    } else {
      toast({
        title: "Module Locked",
        description: `Complete previous modules to unlock ${module.name}`,
        variant: "destructive"
      })
    }
  }

  const getLevelTitle = (level: number) => {
    const titles = [
      "Beginner",
      "Apprentice",
      "Learner",
      "Student",
      "Practitioner",
      "Specialist",
      "Expert",
      "Master",
      "Grandmaster",
      "Legend"
    ]
    return titles[Math.min(level - 1, titles.length - 1)]
  }

  const getLevelColor = (level: number) => {
    if (level <= 3) return "text-blue-600"
    if (level <= 6) return "text-green-600"
    if (level <= 9) return "text-purple-600"
    return "text-orange-600"
  }

  const getLevelIcon = (level: number) => {
    if (level <= 3) return <BookOpen className="h-6 w-6" />
    if (level <= 6) return <Target className="h-6 w-6" />
    if (level <= 9) return <Trophy className="h-6 w-6" />
    return <Crown className="h-6 w-6" />
  }

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
          <h1 className="text-2xl font-bold mb-4">Loading Progress...</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Daily Reminder Banner */}
        <AnimatePresence>
          {dailyReminder && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6"
            >
              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{dailyReminder}</p>
                    </div>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={switchToClassicView}
                    >
                      Start Learning
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Progress & Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Level Progress Card */}
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-white/20 p-3 rounded-full">
                    {getLevelIcon(userProgress.currentLevel)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{getLevelTitle(userProgress.currentLevel)}</h2>
                    <p className="text-blue-100">Level {userProgress.currentLevel}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Progress to Level {userProgress.currentLevel + 1}</span>
                    <span>{Math.round(getLevelProgress())}%</span>
                  </div>
                  <Progress 
                    value={getLevelProgress()} 
                    className="h-2 bg-white/20"
                  />
                  <p className="text-xs text-blue-100">
                    {getXPToNextLevel()} XP needed for next level
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
                <CardContent className="p-4 text-center">
                  <div className="bg-white/20 p-2 rounded-full w-fit mx-auto mb-2">
                    <Play className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold">{userProgress.totalVideosWatched}</p>
                  <p className="text-xs text-green-100">Videos Watched</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
                <CardContent className="p-4 text-center">
                  <div className="bg-white/20 p-2 rounded-full w-fit mx-auto mb-2">
                    <Flame className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold">{userProgress.currentStreak}</p>
                  <p className="text-xs text-orange-100">Day Streak</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
                <CardContent className="p-4 text-center">
                  <div className="bg-white/20 p-2 rounded-full w-fit mx-auto mb-2">
                    <Award className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold">{userProgress.badges.length}</p>
                  <p className="text-xs text-purple-100">Badges Earned</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0">
                <CardContent className="p-4 text-center">
                  <div className="bg-white/20 p-2 rounded-full w-fit mx-auto mb-2">
                    <Star className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold">{userProgress.achievements.length}</p>
                  <p className="text-xs text-pink-100">Achievements</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Badges */}
            {userProgress.badges.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Recent Badges
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {userProgress.badges.slice(-3).reverse().map((badge, index) => (
                      <motion.div
                        key={badge.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border"
                      >
                        <div className="text-2xl">{badge.icon}</div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{badge.name}</p>
                          <p className="text-xs text-muted-foreground">{badge.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Learning Path & Suggestions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Learning Path */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Your Learning Path
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {moduleSuggestions.map((module, index) => (
                    <motion.div
                      key={module.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        module.isUnlocked 
                          ? 'border-green-200 bg-green-50 hover:bg-green-100' 
                          : 'border-gray-200 bg-gray-50 opacity-60'
                      }`}
                      onClick={() => handleModuleClick(module)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{module.icon}</div>
                          <div>
                            <h3 className="font-medium">{module.name}</h3>
                            <p className="text-sm text-muted-foreground">{module.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {module.isUnlocked ? (
                            <>
                              <Badge variant="outline" className="bg-green-100 text-green-700">
                                +{module.xpReward} XP
                              </Badge>
                              <ArrowRight className="h-4 w-4 text-green-600" />
                            </>
                          ) : (
                            <>
                              <Lock className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-500">Locked</span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2"
                    onClick={() => router.push("/dashboard")}
                  >
                    <Play className="h-6 w-6" />
                    <span>Continue Learning</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2"
                    onClick={() => setShowChallengeMode(true)}
                  >
                    <Zap className="h-6 w-6" />
                    <span>Challenges</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Streak Motivation */}
            {userProgress.currentStreak > 0 && (
              <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-full">
                      <Flame className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold">Amazing Streak!</h3>
                      <p className="text-orange-100">
                        You've been learning for {userProgress.currentStreak} day{userProgress.currentStreak !== 1 ? 's' : ''} in a row!
                      </p>
                      {userProgress.currentStreak >= 7 && (
                        <p className="text-sm text-orange-200 mt-1">
                          🎉 You've earned the "Week Warrior" badge!
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{userProgress.currentStreak}</p>
                      <p className="text-sm text-orange-100">days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Confetti Animation */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-50"
          >
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                initial={{
                  x: Math.random() * window.innerWidth,
                  y: -10,
                  rotate: 0
                }}
                animate={{
                  y: window.innerHeight + 10,
                  rotate: 360,
                  x: Math.random() * window.innerWidth
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  ease: "easeOut"
                }}
                onAnimationComplete={() => {
                  if (i === 49) {
                    setTimeout(() => setShowConfetti(false), 1000)
                  }
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>



      {/* Challenge Mode */}
      <ChallengeMode 
        isVisible={showChallengeMode} 
        onClose={() => setShowChallengeMode(false)}
      />
    </div>
  )
} 