"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Zap, 
  Target, 
  Calendar, 
  Users, 
  Trophy, 
  Star,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Award,
  TrendingUp,
  Flame,
  ArrowRight,
  X
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useGamification } from "../context/GamificationContext"
import { useAuth } from "../context/AuthContext"
import { toast } from "@/components/ui/use-toast"

interface Challenge {
  id: string
  title: string
  description: string
  type: 'weekly' | 'monthly' | 'team' | 'individual'
  category: 'modules' | 'videos' | 'quizzes' | 'streak' | 'xp'
  target: number
  reward: {
    xp: number
    badge?: string
    title?: string
  }
  startDate: Date
  endDate: Date
  participants: string[]
  leaderboard: Array<{
    userId: string
    name: string
    progress: number
    rank: number
  }>
  isActive: boolean
  isCompleted: boolean
  userProgress: number
  userRank: number
}

interface ChallengeModeProps {
  isVisible: boolean
  onClose: () => void
}

export default function ChallengeMode({ isVisible, onClose }: ChallengeModeProps) {
  const { userProgress } = useGamification()
  const { userData } = useAuth()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [activeTab, setActiveTab] = useState("active")
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)

  // Mock challenges data
  const mockChallenges: Challenge[] = [
    {
      id: "weekly-modules",
      title: "Module Master Challenge",
      description: "Complete 3 modules in 7 days to unlock a special badge",
      type: "weekly",
      category: "modules",
      target: 3,
      reward: {
        xp: 500,
        badge: "Module Master",
        title: "Module Master"
      },
      startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      participants: ["user1", "user2", "user3", "user4", "user5"],
      leaderboard: [
        { userId: "user1", name: "Sarah Johnson", progress: 2, rank: 1 },
        { userId: "user2", name: "Mike Chen", progress: 2, rank: 2 },
        { userId: "user3", name: "Emily Rodriguez", progress: 1, rank: 3 },
        { userId: "user4", name: "David Kim", progress: 1, rank: 4 },
        { userId: "user5", name: "Lisa Wang", progress: 0, rank: 5 }
      ],
      isActive: true,
      isCompleted: false,
      userProgress: 1,
      userRank: 3
    },
    {
      id: "team-sales-vs-processing",
      title: "Sales vs Processing Battle",
      description: "Which team can complete more videos this week?",
      type: "team",
      category: "videos",
      target: 50,
      reward: {
        xp: 1000,
        badge: "Team Champion",
        title: "Team Champion"
      },
      startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
      participants: ["sales-team", "processing-team"],
      leaderboard: [
        { userId: "sales-team", name: "Sales Team", progress: 35, rank: 1 },
        { userId: "processing-team", name: "Processing Team", progress: 28, rank: 2 }
      ],
      isActive: true,
      isCompleted: false,
      userProgress: 35,
      userRank: 1
    },
    {
      id: "monthly-streak",
      title: "30-Day Learning Streak",
      description: "Maintain a learning streak for 30 consecutive days",
      type: "monthly",
      category: "streak",
      target: 30,
      reward: {
        xp: 2000,
        badge: "Streak Legend",
        title: "Streak Legend"
      },
      startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      participants: ["user1", "user2", "user3", "user4", "user5"],
      leaderboard: [
        { userId: "user1", name: "Sarah Johnson", progress: 15, rank: 1 },
        { userId: "user2", name: "Mike Chen", progress: 12, rank: 2 },
        { userId: "user3", name: "Emily Rodriguez", progress: 8, rank: 3 },
        { userId: "user4", name: "David Kim", progress: 6, rank: 4 },
        { userId: "user5", name: "Lisa Wang", progress: 4, rank: 5 }
      ],
      isActive: true,
      isCompleted: false,
      userProgress: 15,
      userRank: 1
    },
    {
      id: "quiz-master",
      title: "Quiz Master Challenge",
      description: "Get perfect scores on 10 quizzes",
      type: "individual",
      category: "quizzes",
      target: 10,
      reward: {
        xp: 750,
        badge: "Quiz Master",
        title: "Quiz Master"
      },
      startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
      participants: ["user1", "user2", "user3", "user4", "user5"],
      leaderboard: [
        { userId: "user1", name: "Sarah Johnson", progress: 7, rank: 1 },
        { userId: "user2", name: "Mike Chen", progress: 5, rank: 2 },
        { userId: "user3", name: "Emily Rodriguez", progress: 3, rank: 3 },
        { userId: "user4", name: "David Kim", progress: 2, rank: 4 },
        { userId: "user5", name: "Lisa Wang", progress: 1, rank: 5 }
      ],
      isActive: true,
      isCompleted: false,
      userProgress: 7,
      userRank: 1
    }
  ]

  useEffect(() => {
    // Update user progress in challenges based on actual user data
    if (userProgress && userData) {
      const updatedChallenges = mockChallenges.map(challenge => {
        let userProgressValue = 0
        
        switch (challenge.category) {
          case 'modules':
            userProgressValue = userProgress.completedModules?.length || 0
            break
          case 'videos':
            userProgressValue = userProgress.totalVideosWatched || 0
            break
          case 'quizzes':
            userProgressValue = userProgress.quizzesCompleted || 0
            break
          case 'streak':
            userProgressValue = userProgress.currentStreak || 0
            break
          case 'xp':
            userProgressValue = userProgress.totalXP || 0
            break
        }

        // Update leaderboard with current user
        const updatedLeaderboard = [...challenge.leaderboard]
        const userIndex = updatedLeaderboard.findIndex(entry => entry.userId === userData.uid)
        
        if (userIndex >= 0) {
          updatedLeaderboard[userIndex].progress = userProgressValue
        } else {
          updatedLeaderboard.push({
            userId: userData.uid,
            name: userData.name || "You",
            progress: userProgressValue,
            rank: 0
          })
        }

        // Re-sort and update ranks
        updatedLeaderboard.sort((a, b) => b.progress - a.progress)
        updatedLeaderboard.forEach((entry, index) => {
          entry.rank = index + 1
        })

        const userRank = updatedLeaderboard.find(entry => entry.userId === userData.uid)?.rank || 0

        return {
          ...challenge,
          userProgress: userProgressValue,
          userRank,
          leaderboard: updatedLeaderboard
        }
      })

      setChallenges(updatedChallenges)
    } else {
      setChallenges(mockChallenges)
    }
  }, [userProgress, userData])

  const getActiveChallenges = () => challenges.filter(c => c.isActive && !c.isCompleted)
  const getCompletedChallenges = () => challenges.filter(c => c.isCompleted)
  const getUpcomingChallenges = () => challenges.filter(c => !c.isActive && !c.isCompleted)

  const getTimeRemaining = (endDate: Date) => {
    const now = new Date()
    const diff = endDate.getTime() - now.getTime()
    
    if (diff <= 0) return "Ended"
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) return `${days}d ${hours}h remaining`
    return `${hours}h remaining`
  }

  const getProgressPercentage = (progress: number, target: number) => {
    return Math.min((progress / target) * 100, 100)
  }

  const getChallengeIcon = (category: string) => {
    switch (category) {
      case 'modules': return <Target className="h-5 w-5" />
      case 'videos': return <Play className="h-5 w-5" />
      case 'quizzes': return <Star className="h-5 w-5" />
      case 'streak': return <Flame className="h-5 w-5" />
      case 'xp': return <TrendingUp className="h-5 w-5" />
      default: return <Zap className="h-5 w-5" />
    }
  }

  const getChallengeColor = (category: string) => {
    switch (category) {
      case 'modules': return 'text-blue-500'
      case 'videos': return 'text-green-500'
      case 'quizzes': return 'text-purple-500'
      case 'streak': return 'text-orange-500'
      case 'xp': return 'text-yellow-500'
      default: return 'text-gray-500'
    }
  }

  const joinChallenge = (challengeId: string) => {
    // In real implementation, this would update Firestore
    toast({
      title: "Challenge Joined!",
      description: "You're now participating in this challenge. Good luck!",
    })
  }

  const claimReward = (challenge: Challenge) => {
    // In real implementation, this would award XP and badges
    toast({
      title: "Reward Claimed! 🎉",
      description: `You earned ${challenge.reward.xp} XP and the ${challenge.reward.badge} badge!`,
    })
  }

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <motion.div
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        className="w-full max-w-6xl max-h-[90vh] overflow-hidden bg-background rounded-lg shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Zap className="h-8 w-8 text-yellow-500" />
            <div>
              <h2 className="text-2xl font-bold">Challenge Mode</h2>
              <p className="text-muted-foreground">Compete with colleagues and earn exclusive rewards</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
            Close
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="active">Active Challenges</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            </TabsList>

            {/* Active Challenges */}
            <TabsContent value="active" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {getActiveChallenges().map((challenge) => (
                  <motion.div
                    key={challenge.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`${getChallengeColor(challenge.category)}`}>
                              {getChallengeIcon(challenge.category)}
                            </div>
                            <CardTitle className="text-lg">{challenge.title}</CardTitle>
                          </div>
                          <Badge variant={challenge.type === 'team' ? 'secondary' : 'default'}>
                            {challenge.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{challenge.description}</p>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        {/* Progress */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Your Progress</span>
                            <span className="font-semibold">
                              {challenge.userProgress} / {challenge.target}
                            </span>
                          </div>
                          <Progress 
                            value={getProgressPercentage(challenge.userProgress, challenge.target)} 
                            className="h-2"
                          />
                        </div>

                        {/* Time and Rank */}
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{getTimeRemaining(challenge.endDate)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Trophy className="h-4 w-4" />
                            <span>Rank #{challenge.userRank}</span>
                          </div>
                        </div>

                        {/* Reward */}
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="text-sm font-semibold">Reward</p>
                            <p className="text-xs text-muted-foreground">
                              {challenge.reward.xp} XP + {challenge.reward.badge} Badge
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="font-bold">{challenge.reward.xp}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setSelectedChallenge(challenge)}
                            className="flex-1"
                          >
                            View Details
                          </Button>
                          {challenge.userProgress >= challenge.target ? (
                            <Button 
                              size="sm" 
                              onClick={() => claimReward(challenge)}
                              className="flex-1"
                            >
                              Claim Reward
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              onClick={() => joinChallenge(challenge.id)}
                              className="flex-1"
                            >
                              Join Challenge
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            {/* Completed Challenges */}
            <TabsContent value="completed" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {getCompletedChallenges().map((challenge) => (
                  <Card key={challenge.id} className="relative overflow-hidden">
                    <div className="absolute top-4 right-4">
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    </div>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className={`${getChallengeColor(challenge.category)}`}>
                          {getChallengeIcon(challenge.category)}
                        </div>
                        <CardTitle className="text-lg">{challenge.title}</CardTitle>
                      </div>
                      <p className="text-sm text-muted-foreground">{challenge.description}</p>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span>Final Rank</span>
                        <span className="font-semibold">#{challenge.userRank}</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <div>
                          <p className="text-sm font-semibold text-green-700 dark:text-green-300">Completed!</p>
                          <p className="text-xs text-green-600 dark:text-green-400">
                            {challenge.reward.xp} XP earned
                          </p>
                        </div>
                        <Award className="h-5 w-5 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Upcoming Challenges */}
            <TabsContent value="upcoming" className="space-y-6">
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Upcoming Challenges</h3>
                <p className="text-muted-foreground">
                  New challenges will appear here. Check back soon!
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>

      {/* Challenge Detail Modal */}
      <AnimatePresence>
        {selectedChallenge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/50"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="w-full max-w-2xl bg-background rounded-lg shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">{selectedChallenge.title}</h3>
                <Button variant="ghost" size="sm" onClick={() => setSelectedChallenge(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <p className="text-muted-foreground">{selectedChallenge.description}</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-semibold">Target</p>
                    <p className="text-2xl font-bold">{selectedChallenge.target}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-semibold">Participants</p>
                    <p className="text-2xl font-bold">{selectedChallenge.participants.length}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Leaderboard</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedChallenge.leaderboard.slice(0, 10).map((entry, index) => (
                      <div key={entry.userId} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-sm">#{entry.rank}</span>
                          <span className="font-medium">{entry.name}</span>
                        </div>
                        <span className="font-semibold">{entry.progress}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedChallenge(null)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                  <Button 
                    onClick={() => joinChallenge(selectedChallenge.id)}
                    className="flex-1"
                  >
                    Join Challenge
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
} 