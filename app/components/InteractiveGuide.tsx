"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  MessageCircle, 
  X, 
  Sparkles, 
  Zap, 
  Target, 
  BookOpen, 
  Trophy,
  Flame,
  Star,
  ArrowRight,
  Lightbulb,
  HelpCircle
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useGamification } from "../context/GamificationContext"
import { useAuth } from "../context/AuthContext"

interface GuideMessage {
  id: string
  type: 'welcome' | 'tip' | 'achievement' | 'motivation' | 'help'
  title: string
  message: string
  icon: React.ReactNode
  action?: {
    text: string
    onClick: () => void
  }
  autoHide?: boolean
  duration?: number
}

interface InteractiveGuideProps {
  isVisible: boolean
  onClose: () => void
  onAction?: (action: string) => void
}

export default function InteractiveGuide({ isVisible, onClose, onAction }: InteractiveGuideProps) {
  const { userProgress } = useGamification()
  const { userData } = useAuth()
  const [currentMessage, setCurrentMessage] = useState<GuideMessage | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showPulse, setShowPulse] = useState(false)

  // Generate contextual messages based on user progress
  useEffect(() => {
    if (!userProgress || !isVisible) return

    const messages: GuideMessage[] = []

    // Welcome message for new users
    if (userProgress.totalVideosWatched === 0) {
      messages.push({
        id: 'welcome',
        type: 'welcome',
        title: 'Welcome to EOXSplore! 👋',
        message: `Hi ${userData?.name || 'there'}! I'm Sparky, your learning companion. I'll help you master EOXS and earn awesome rewards along the way!`,
        icon: <Sparkles className="h-5 w-5" />,
        action: {
          text: 'Start Learning',
          onClick: () => onAction?.('start-learning')
        }
      })
    }

    // First video completion
    if (userProgress.totalVideosWatched === 1) {
      messages.push({
        id: 'first-video',
        type: 'achievement',
        title: 'First Video Complete! 🎉',
        message: 'Amazing! You\'ve watched your first video and earned your first badge. Keep up the great work!',
        icon: <Trophy className="h-5 w-5" />,
        autoHide: true,
        duration: 5000
      })
    }

    // Streak motivation
    if (userProgress.currentStreak >= 3 && userProgress.currentStreak <= 7) {
      messages.push({
        id: 'streak-motivation',
        type: 'motivation',
        title: 'Incredible Streak! 🔥',
        message: `You're on a ${userProgress.currentStreak}-day learning streak! Don't break the chain - watch a video today!`,
        icon: <Flame className="h-5 w-5" />,
        action: {
          text: 'Watch Now',
          onClick: () => onAction?.('watch-video')
        }
      })
    }

    // Level up motivation
    const levelProgress = userProgress.currentLevel < 10 ? 
      ((userProgress.totalXP - (userProgress.currentLevel - 1) * 100) / 100) * 100 : 0
    
    if (levelProgress >= 80 && levelProgress < 100) {
      messages.push({
        id: 'level-up',
        type: 'motivation',
        title: 'Almost There! ⭐',
        message: `You're ${Math.round(100 - levelProgress)} XP away from level ${userProgress.currentLevel + 1}! Complete a quiz or watch another video to level up!`,
        icon: <Target className="h-5 w-5" />,
        action: {
          text: 'Earn XP',
          onClick: () => onAction?.('earn-xp')
        }
      })
    }

    // Learning tips
    const tips = [
      {
        id: 'quiz-tip',
        title: 'Pro Tip: Take Quizzes! 🧠',
        message: 'Complete quizzes after videos to earn bonus XP and test your understanding.',
        icon: <Lightbulb className="h-5 w-5" />
      },
      {
        id: 'streak-tip',
        title: 'Daily Learning Habit 📅',
        message: 'Watch at least one video daily to maintain your streak and earn streak bonuses!',
        icon: <Flame className="h-5 w-5" />
      },
      {
        id: 'feedback-tip',
        title: 'Share Your Thoughts 💬',
        message: 'Leave feedback on videos to help improve the platform and earn XP rewards.',
        icon: <MessageCircle className="h-5 w-5" />
      }
    ]

    // Show random tip if no other messages
    if (messages.length === 0 && Math.random() < 0.3) {
      const randomTip = tips[Math.floor(Math.random() * tips.length)]
      messages.push({
        ...randomTip,
        type: 'tip' as const,
        autoHide: true,
        duration: 8000
      })
    }

    // Set current message
    if (messages.length > 0) {
      setCurrentMessage(messages[0])
      setShowPulse(true)
    }
  }, [userProgress, isVisible, userData])

  // Auto-hide messages
  useEffect(() => {
    if (currentMessage?.autoHide && currentMessage.duration) {
      const timer = setTimeout(() => {
        setCurrentMessage(null)
        setShowPulse(false)
      }, currentMessage.duration)

      return () => clearTimeout(timer)
    }
  }, [currentMessage])

  const handleAction = (action: string) => {
    onAction?.(action)
    setCurrentMessage(null)
    setShowPulse(false)
  }

  const handleClose = () => {
    setCurrentMessage(null)
    setShowPulse(false)
    onClose()
  }

  const handleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Main Guide Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        className="relative"
      >
        <Button
          onClick={handleExpand}
          className={`h-14 w-14 rounded-full shadow-lg ${
            showPulse ? 'animate-pulse' : ''
          }`}
          variant="default"
        >
          <div className="relative">
            <MessageCircle className="h-6 w-6" />
            {showPulse && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
              />
            )}
          </div>
        </Button>
      </motion.div>

      {/* Expanded Guide Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="guide-panel"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-16 right-0 w-80"
          >
            <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-50 to-purple-50">
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">Sparky</h3>
                      <p className="text-xs text-muted-foreground">Your Learning Guide</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                {/* Current Message */}
                {currentMessage ? (
                  <motion.div
                    key={currentMessage.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-blue-600 mt-1">
                        {currentMessage.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">
                          {currentMessage.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {currentMessage.message}
                        </p>
                      </div>
                    </div>

                    {currentMessage.action && (
                      <Button
                        size="sm"
                        onClick={() => handleAction(currentMessage.action!.text.toLowerCase().replace(' ', '-'))}
                        className="w-full"
                      >
                        {currentMessage.action.text}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-4"
                  >
                    <HelpCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No messages right now. Keep learning and I'll have tips for you!
                    </p>
                  </motion.div>
                )}

                {/* Quick Stats */}
                {userProgress && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-center">
                        <div className="font-bold text-blue-600">{userProgress.currentLevel}</div>
                        <div className="text-muted-foreground">Level</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-orange-600">{userProgress.currentStreak}</div>
                        <div className="text-muted-foreground">Streak</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-green-600">{userProgress.totalVideosWatched}</div>
                        <div className="text-muted-foreground">Videos</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-purple-600">{userProgress.badges?.length || 0}</div>
                        <div className="text-muted-foreground">Badges</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 