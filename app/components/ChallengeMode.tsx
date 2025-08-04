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
  X,
  Loader2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useGamification } from "../context/GamificationContext"
import { useAuth } from "../context/AuthContext"
import { toast } from "@/components/ui/use-toast"
import { 
  getActiveChallenges, 
  joinChallenge, 
  claimChallengeReward, 
  getUserChallengeParticipations,
  updateChallengeProgress,
  initializeDefaultChallenges,
  type Challenge as FirestoreChallenge,
  type ChallengeParticipation
} from "../firestore-utils"

interface Challenge extends FirestoreChallenge {
  userProgress: number
  userRank: number
  isParticipating: boolean
  rewardClaimed: boolean
}

interface ChallengeModeProps {
  isVisible: boolean
  onClose: () => void
}

export default function ChallengeMode({ isVisible, onClose }: ChallengeModeProps) {
  const { userProgress, refreshProgress } = useGamification()
  const { userData } = useAuth()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [activeTab, setActiveTab] = useState("active")
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)
  const [loading, setLoading] = useState(true)
  const [joiningChallenge, setJoiningChallenge] = useState<string | null>(null)
  const [claimingReward, setClaimingReward] = useState<string | null>(null)

  // Load challenges and user participations
  useEffect(() => {
    if (isVisible && userData) {
      loadChallenges()
    }
  }, [isVisible, userData])

  const loadChallenges = async () => {
    try {
      setLoading(true)
      
      // Initialize default challenges if none exist
      await initializeDefaultChallenges()
      
      // Get active challenges
      const activeChallenges = await getActiveChallenges()
      
      // Get user participations
      const userParticipations = await getUserChallengeParticipations(userData!.uid)
      
      // Combine challenge data with user participation data
      const challengesWithUserData: Challenge[] = activeChallenges.map(challenge => {
        const participation = userParticipations.find(p => p.challengeId === challenge.id)
        let userProgressValue = 0
        
        // Calculate user progress based on challenge category and actual user data
        if (userProgress) {
          switch (challenge.category) {
            case 'modules':
              userProgressValue = userProgress.completedModules?.length || 0
              break
            case 'videos':
              userProgressValue = userProgress.totalVideosWatched || 0
              break
            case 'quizzes':
              // Count perfect quiz scores
              userProgressValue = Object.values(userProgress.quizScores || {}).filter(score => score === 100).length
              break
            case 'streak':
              userProgressValue = userProgress.currentStreak || 0
              break
            case 'xp':
              userProgressValue = userProgress.totalXP || 0
              break
          }
        }

        // Find user's rank in leaderboard
        const userLeaderboardEntry = challenge.leaderboard.find(entry => entry.userId === userData!.uid)
        const userRank = userLeaderboardEntry?.rank || 0

        return {
          ...challenge,
          userProgress: participation?.progress || userProgressValue,
          userRank,
          isParticipating: !!participation,
          rewardClaimed: participation?.rewardClaimed || false
        }
      })

      setChallenges(challengesWithUserData)
    } catch (error) {
      console.error("Error loading challenges:", error)
      toast({
        title: "Error",
        description: "Failed to load challenges. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Update challenge progress when user data changes
  useEffect(() => {
    if (userProgress && userData && challenges.length > 0) {
      updateUserProgressInChallenges()
    }
  }, [userProgress, userData])

  const updateUserProgressInChallenges = async () => {
    try {
      for (const challenge of challenges) {
        if (challenge.isParticipating) {
          let progressValue = 0
          
          switch (challenge.category) {
            case 'modules':
              progressValue = userProgress!.completedModules?.length || 0
              break
            case 'videos':
              progressValue = userProgress!.totalVideosWatched || 0
              break
            case 'quizzes':
              progressValue = Object.values(userProgress!.quizScores || {}).filter(score => score === 100).length
              break
            case 'streak':
              progressValue = userProgress!.currentStreak || 0
              break
            case 'xp':
              progressValue = userProgress!.totalXP || 0
              break
          }

          // Update progress in Firestore
          await updateChallengeProgress(challenge.id, userData!.uid, progressValue)
        }
      }

      // Reload challenges to get updated data
      await loadChallenges()
    } catch (error) {
      console.error("Error updating challenge progress:", error)
    }
  }

  const getActiveChallenges = () => challenges.filter(c => c.isActive && !c.isCompleted)
  const getCompletedChallenges = () => challenges.filter(c => c.isCompleted || c.userProgress >= c.target)
  const getUpcomingChallenges = () => challenges.filter(c => !c.isActive && !c.isCompleted)

  const getTimeRemaining = (endDate: any) => {
    const now = new Date()
    const end = endDate?.toDate?.() || new Date(endDate)
    const diff = end.getTime() - now.getTime()
    
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

  const handleJoinChallenge = async (challengeId: string) => {
    if (!userData) return

    try {
      setJoiningChallenge(challengeId)
      await joinChallenge(challengeId, userData.uid, userData.name || "Anonymous", userData.email || "")
      
      toast({
        title: "Challenge Joined!",
        description: "You're now participating in this challenge. Good luck!",
      })

      // Reload challenges to update participation status
      await loadChallenges()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to join challenge. Please try again.",
        variant: "destructive"
      })
    } finally {
      setJoiningChallenge(null)
    }
  }

  const handleClaimReward = async (challenge: Challenge) => {
    if (!userData) return

    try {
      setClaimingReward(challenge.id)
      const reward = await claimChallengeReward(challenge.id, userData.uid)
      
      toast({
        title: "Reward Claimed! 🎉",
        description: `You earned ${reward.xpReward} XP and the ${reward.badgeReward} badge!`,
      })

      // Refresh user progress to show updated XP
      await refreshProgress()
      
      // Reload challenges to update claimed status
      await loadChallenges()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to claim reward. Please try again.",
        variant: "destructive"
      })
    } finally {
      setClaimingReward(null)
    }
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
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading challenges...</span>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="active">Active Challenges</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              </TabsList>

              {/* Active Challenges */}
              <TabsContent value="active" className="space-y-6">
                {getActiveChallenges().length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Active Challenges</h3>
                    <p className="text-muted-foreground">
                      Check back soon for new challenges!
                    </p>
                  </div>
                ) : (
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
                                <span>Rank #{challenge.userRank || 'N/A'}</span>
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
                              {challenge.isParticipating ? (
                                challenge.userProgress >= challenge.target && !challenge.rewardClaimed ? (
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleClaimReward(challenge)}
                                    disabled={claimingReward === challenge.id}
                                    className="flex-1"
                                  >
                                    {claimingReward === challenge.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      "Claim Reward"
                                    )}
                                  </Button>
                                ) : challenge.rewardClaimed ? (
                                  <Button 
                                    size="sm" 
                                    disabled
                                    className="flex-1"
                                  >
                                    Reward Claimed
                                  </Button>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    disabled
                                    className="flex-1"
                                  >
                                    In Progress
                                  </Button>
                                )
                              ) : (
                                <Button 
                                  size="sm" 
                                  onClick={() => handleJoinChallenge(challenge.id)}
                                  disabled={joiningChallenge === challenge.id}
                                  className="flex-1"
                                >
                                  {joiningChallenge === challenge.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Join Challenge"
                                  )}
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Completed Challenges */}
              <TabsContent value="completed" className="space-y-6">
                {getCompletedChallenges().length === 0 ? (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Completed Challenges</h3>
                    <p className="text-muted-foreground">
                      Complete challenges to see them here!
                    </p>
                  </div>
                ) : (
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
                            <span className="font-semibold">#{challenge.userRank || 'N/A'}</span>
                          </div>
                          
                          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                            <div>
                              <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                                {challenge.rewardClaimed ? 'Completed!' : 'Ready to Claim!'}
                              </p>
                              <p className="text-xs text-green-600 dark:text-green-400">
                                {challenge.reward.xp} XP earned
                              </p>
                            </div>
                            <Award className="h-5 w-5 text-green-500" />
                          </div>

                          {!challenge.rewardClaimed && (
                            <Button 
                              size="sm" 
                              onClick={() => handleClaimReward(challenge)}
                              disabled={claimingReward === challenge.id}
                              className="w-full"
                            >
                              {claimingReward === challenge.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Claim Reward"
                              )}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
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
          )}
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
                    {selectedChallenge.leaderboard.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No participants yet</p>
                    ) : (
                      selectedChallenge.leaderboard.slice(0, 10).map((entry, index) => (
                        <div key={entry.userId} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-sm">#{entry.rank}</span>
                            <span className="font-medium">{entry.name}</span>
                          </div>
                          <span className="font-semibold">{entry.progress}</span>
                        </div>
                      ))
                    )}
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
                  {!selectedChallenge.isParticipating && (
                    <Button 
                      onClick={() => handleJoinChallenge(selectedChallenge.id)}
                      disabled={joiningChallenge === selectedChallenge.id}
                      className="flex-1"
                    >
                      {joiningChallenge === selectedChallenge.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Join Challenge"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
} 