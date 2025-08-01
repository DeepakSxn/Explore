"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs, orderBy, serverTimestamp, addDoc } from "firebase/firestore"
import { db } from "@/firebase"
import { useAuth } from "./AuthContext"

// Types for gamification system
export interface UserProgress {
  userId: string
  currentLevel: number
  totalXP: number
  currentStreak: number
  longestStreak: number
  lastActivityDate: string
  badges: Badge[]
  completedModules: string[]
  unlockedModules: string[]
  quizScores: Record<string, number>
  totalVideosWatched: number
  totalWatchTime: number // in minutes
  achievements: Achievement[]
  createdAt: any
  updatedAt: any
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  earnedAt: any
  category: 'video' | 'streak' | 'quiz' | 'module' | 'special'
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  earnedAt: any
  xpReward: number
  category: 'milestone' | 'streak' | 'completion' | 'perfect' | 'special'
}

export interface Quiz {
  id: string
  videoId: string
  questions: QuizQuestion[]
  xpReward: number
  requiredScore: number
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
}

export interface LearningPath {
  id: string
  name: string
  description: string
  modules: LearningModule[]
  requiredLevel: number
  xpReward: number
}

export interface LearningModule {
  id: string
  name: string
  description: string
  videos: string[]
  requiredXP: number
  isUnlocked: boolean
  isCompleted: boolean
  progress: number
  xpReward: number
}

// XP and Level Configuration
export const XP_CONFIG = {
  VIDEO_COMPLETION: 50,
  QUIZ_PERFECT: 100,
  QUIZ_PASS: 50,
  DAILY_STREAK: 25,
  MODULE_COMPLETION: 200,
  FEEDBACK_SUBMISSION: 10,
  FIRST_VIDEO: 100,
  STREAK_MILESTONES: [3, 7, 14, 30, 60, 100],
  LEVEL_XP_REQUIREMENTS: [
    0, 100, 250, 500, 1000, 2000, 3500, 5000, 7000, 10000,
    15000, 20000, 30000, 40000, 50000, 75000, 100000, 150000, 200000, 300000
  ]
}

// Badge Definitions
export const BADGES = {
  FIRST_VIDEO: {
    id: 'first_video',
    name: 'First Steps',
    description: 'Watched your first video',
    icon: '🎬',
    category: 'video' as const
  },
  STREAK_3: {
    id: 'streak_3',
    name: 'Getting Started',
    description: '3-day learning streak',
    icon: '🔥',
    category: 'streak' as const
  },
  STREAK_7: {
    id: 'streak_7',
    name: 'Week Warrior',
    description: '7-day learning streak',
    icon: '🔥🔥',
    category: 'streak' as const
  },
  STREAK_30: {
    id: 'streak_30',
    name: 'Monthly Master',
    description: '30-day learning streak',
    icon: '🔥🔥🔥',
    category: 'streak' as const
  },
  QUIZ_MASTER: {
    id: 'quiz_master',
    name: 'Quiz Master',
    description: 'Perfect score on 5 quizzes',
    icon: '🧠',
    category: 'quiz' as const
  },
  MODULE_COMPLETER: {
    id: 'module_completer',
    name: 'Module Master',
    description: 'Completed your first module',
    icon: '📚',
    category: 'module' as const
  },
  FEEDBACK_GIVER: {
    id: 'feedback_giver',
    name: 'Helpful Hero',
    description: 'Submitted your first feedback',
    icon: '💬',
    category: 'special' as const
  }
}

// Achievement Definitions
export const ACHIEVEMENTS = {
  FIRST_LEVEL: {
    id: 'first_level',
    name: 'Level Up!',
    description: 'Reached your first level',
    icon: '⭐',
    xpReward: 50,
    category: 'milestone' as const
  },
  VIDEO_WATCHER: {
    id: 'video_watcher',
    name: 'Video Enthusiast',
    description: 'Watched 10 videos',
    icon: '📺',
    xpReward: 100,
    category: 'milestone' as const
  },
  PERFECT_QUIZ: {
    id: 'perfect_quiz',
    name: 'Perfect Score',
    description: 'Got 100% on a quiz',
    icon: '🎯',
    xpReward: 75,
    category: 'perfect' as const
  },
  STREAK_CHAMPION: {
    id: 'streak_champion',
    name: 'Streak Champion',
    description: 'Maintained a 7-day streak',
    icon: '🏆',
    xpReward: 200,
    category: 'streak' as const
  }
}

interface GamificationContextType {
  userProgress: UserProgress | null
  loading: boolean
  addXP: (amount: number, reason: string) => Promise<{ levelUp: boolean; newLevel: number } | undefined>
  completeVideo: (videoId: string, watchTime: number) => Promise<void>
  completeQuiz: (quizId: string, score: number, totalQuestions: number) => Promise<void>
  submitFeedback: () => Promise<void>
  checkAndAwardBadges: () => Promise<void>
  checkAndAwardAchievements: () => Promise<void>
  getCurrentLevel: () => number
  getXPToNextLevel: () => number
  getLevelProgress: () => number
  refreshProgress: () => Promise<void>
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined)

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const { user, userData } = useAuth()
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null)
  const [loading, setLoading] = useState(true)

  // Initialize user progress
  useEffect(() => {
    if (user && userData) {
      initializeUserProgress()
    } else {
      setLoading(false)
    }
  }, [user, userData])

  const initializeUserProgress = async () => {
    if (!user) return

    try {
      setLoading(true)
      const progressDoc = doc(db, "userProgress", user.uid)
      const progressSnap = await getDoc(progressDoc)

      if (progressSnap.exists()) {
        setUserProgress(progressSnap.data() as UserProgress)
      } else {
        // Create new user progress
        const newProgress: UserProgress = {
          userId: user.uid,
          currentLevel: 1,
          totalXP: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastActivityDate: new Date().toISOString().split('T')[0],
          badges: [],
          completedModules: [],
          unlockedModules: ['Sales'], // Start with Sales module unlocked
          quizScores: {},
          totalVideosWatched: 0,
          totalWatchTime: 0,
          achievements: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }

        await setDoc(progressDoc, newProgress)
        setUserProgress(newProgress)
      }
    } catch (error) {
      console.error("Error initializing user progress:", error)
    } finally {
      setLoading(false)
    }
  }

  const addXP = async (amount: number, reason: string) => {
    if (!user || !userProgress) return

    try {
      const newTotalXP = userProgress.totalXP + amount
      const newLevel = calculateLevel(newTotalXP)
      const levelUp = newLevel > userProgress.currentLevel

      const updatedProgress = {
        ...userProgress,
        totalXP: newTotalXP,
        currentLevel: newLevel,
        updatedAt: serverTimestamp()
      }

      // Update Firestore
      const progressDoc = doc(db, "userProgress", user.uid)
      await updateDoc(progressDoc, {
        totalXP: newTotalXP,
        currentLevel: newLevel,
        updatedAt: serverTimestamp()
      })

      setUserProgress(updatedProgress)

      // Check for achievements after XP gain
      await checkAndAwardAchievements()

      // Log XP gain
      await addDoc(collection(db, "xpLogs"), {
        userId: user.uid,
        amount,
        reason,
        totalXP: newTotalXP,
        level: newLevel,
        timestamp: serverTimestamp()
      })

      return { levelUp, newLevel }
    } catch (error) {
      console.error("Error adding XP:", error)
    }
  }

  const calculateLevel = (totalXP: number): number => {
    for (let i = XP_CONFIG.LEVEL_XP_REQUIREMENTS.length - 1; i >= 0; i--) {
      if (totalXP >= XP_CONFIG.LEVEL_XP_REQUIREMENTS[i]) {
        return i + 1
      }
    }
    return 1
  }

  const completeVideo = async (videoId: string, watchTime: number) => {
    if (!user || !userProgress) return

    try {
      // Add XP for video completion
      await addXP(XP_CONFIG.VIDEO_COMPLETION, `Video completion: ${videoId}`)

      // Update streak
      await updateStreak()

      // Update video stats
      const updatedProgress = {
        ...userProgress,
        totalVideosWatched: userProgress.totalVideosWatched + 1,
        totalWatchTime: userProgress.totalWatchTime + Math.round(watchTime / 60), // Convert to minutes
        updatedAt: serverTimestamp()
      }

      const progressDoc = doc(db, "userProgress", user.uid)
      await updateDoc(progressDoc, {
        totalVideosWatched: updatedProgress.totalVideosWatched,
        totalWatchTime: updatedProgress.totalWatchTime,
        updatedAt: serverTimestamp()
      })

      setUserProgress(updatedProgress)

      // Check for badges
      await checkAndAwardBadges()
    } catch (error) {
      console.error("Error completing video:", error)
    }
  }

  const updateStreak = async () => {
    if (!user || !userProgress) return

    const today = new Date().toISOString().split('T')[0]
    const lastActivity = userProgress.lastActivityDate
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    let newStreak = userProgress.currentStreak

    if (lastActivity === today) {
      // Already logged activity today
      return
    } else if (lastActivity === yesterdayStr) {
      // Consecutive day
      newStreak += 1
    } else {
      // Streak broken
      newStreak = 1
    }

    const updatedProgress = {
      ...userProgress,
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, userProgress.longestStreak),
      lastActivityDate: today,
      updatedAt: serverTimestamp()
    }

    const progressDoc = doc(db, "userProgress", user.uid)
    await updateDoc(progressDoc, {
      currentStreak: newStreak,
      longestStreak: updatedProgress.longestStreak,
      lastActivityDate: today,
      updatedAt: serverTimestamp()
    })

    setUserProgress(updatedProgress)

    // Check for streak-based badges
    await checkAndAwardBadges()
  }

  const completeQuiz = async (quizId: string, score: number, totalQuestions: number) => {
    if (!user || !userProgress) return

    try {
      const percentage = (score / totalQuestions) * 100
      const xpReward = percentage === 100 ? XP_CONFIG.QUIZ_PERFECT : XP_CONFIG.QUIZ_PASS

      // Add XP
      await addXP(xpReward, `Quiz completion: ${quizId}`)

      // Update quiz scores
      const updatedQuizScores = {
        ...userProgress.quizScores,
        [quizId]: percentage
      }

      const updatedProgress = {
        ...userProgress,
        quizScores: updatedQuizScores,
        updatedAt: serverTimestamp()
      }

      const progressDoc = doc(db, "userProgress", user.uid)
      await updateDoc(progressDoc, {
        quizScores: updatedQuizScores,
        updatedAt: serverTimestamp()
      })

      setUserProgress(updatedProgress)

      // Check for quiz-related badges
      await checkAndAwardBadges()
    } catch (error) {
      console.error("Error completing quiz:", error)
    }
  }

  const submitFeedback = async () => {
    if (!user || !userProgress) return

    try {
      await addXP(XP_CONFIG.FEEDBACK_SUBMISSION, "Feedback submission")
      await checkAndAwardBadges()
    } catch (error) {
      console.error("Error submitting feedback:", error)
    }
  }

  const checkAndAwardBadges = async () => {
    if (!user || !userProgress) return

    const newBadges: Badge[] = []

    // Check for first video badge
    if (userProgress.totalVideosWatched === 1 && !userProgress.badges.find(b => b.id === BADGES.FIRST_VIDEO.id)) {
      newBadges.push({
        ...BADGES.FIRST_VIDEO,
        earnedAt: serverTimestamp()
      })
    }

    // Check for streak badges
    if (userProgress.currentStreak >= 3 && !userProgress.badges.find(b => b.id === BADGES.STREAK_3.id)) {
      newBadges.push({
        ...BADGES.STREAK_3,
        earnedAt: serverTimestamp()
      })
    }

    if (userProgress.currentStreak >= 7 && !userProgress.badges.find(b => b.id === BADGES.STREAK_7.id)) {
      newBadges.push({
        ...BADGES.STREAK_7,
        earnedAt: serverTimestamp()
      })
    }

    if (userProgress.currentStreak >= 30 && !userProgress.badges.find(b => b.id === BADGES.STREAK_30.id)) {
      newBadges.push({
        ...BADGES.STREAK_30,
        earnedAt: serverTimestamp()
      })
    }

    // Check for quiz master badge
    const perfectQuizzes = Object.values(userProgress.quizScores).filter(score => score === 100).length
    if (perfectQuizzes >= 5 && !userProgress.badges.find(b => b.id === BADGES.QUIZ_MASTER.id)) {
      newBadges.push({
        ...BADGES.QUIZ_MASTER,
        earnedAt: serverTimestamp()
      })
    }

    // Check for feedback badge
    if (!userProgress.badges.find(b => b.id === BADGES.FEEDBACK_GIVER.id)) {
      newBadges.push({
        ...BADGES.FEEDBACK_GIVER,
        earnedAt: serverTimestamp()
      })
    }

    if (newBadges.length > 0) {
      const updatedBadges = [...userProgress.badges, ...newBadges]
      const updatedProgress = {
        ...userProgress,
        badges: updatedBadges,
        updatedAt: serverTimestamp()
      }

      const progressDoc = doc(db, "userProgress", user.uid)
      await updateDoc(progressDoc, {
        badges: updatedBadges,
        updatedAt: serverTimestamp()
      })

      setUserProgress(updatedProgress)

      // Log badge awards
      for (const badge of newBadges) {
        await addDoc(collection(db, "badgeLogs"), {
          userId: user.uid,
          badgeId: badge.id,
          badgeName: badge.name,
          timestamp: serverTimestamp()
        })
      }
    }
  }

  const checkAndAwardAchievements = async () => {
    if (!user || !userProgress) return

    const newAchievements: Achievement[] = []

    // Check for first level achievement
    if (userProgress.currentLevel >= 2 && !userProgress.achievements.find(a => a.id === ACHIEVEMENTS.FIRST_LEVEL.id)) {
      newAchievements.push({
        ...ACHIEVEMENTS.FIRST_LEVEL,
        earnedAt: serverTimestamp()
      })
    }

    // Check for video watcher achievement
    if (userProgress.totalVideosWatched >= 10 && !userProgress.achievements.find(a => a.id === ACHIEVEMENTS.VIDEO_WATCHER.id)) {
      newAchievements.push({
        ...ACHIEVEMENTS.VIDEO_WATCHER,
        earnedAt: serverTimestamp()
      })
    }

    // Check for perfect quiz achievement
    const hasPerfectQuiz = Object.values(userProgress.quizScores).some(score => score === 100)
    if (hasPerfectQuiz && !userProgress.achievements.find(a => a.id === ACHIEVEMENTS.PERFECT_QUIZ.id)) {
      newAchievements.push({
        ...ACHIEVEMENTS.PERFECT_QUIZ,
        earnedAt: serverTimestamp()
      })
    }

    // Check for streak champion achievement
    if (userProgress.currentStreak >= 7 && !userProgress.achievements.find(a => a.id === ACHIEVEMENTS.STREAK_CHAMPION.id)) {
      newAchievements.push({
        ...ACHIEVEMENTS.STREAK_CHAMPION,
        earnedAt: serverTimestamp()
      })
    }

    if (newAchievements.length > 0) {
      const updatedAchievements = [...userProgress.achievements, ...newAchievements]
      const updatedProgress = {
        ...userProgress,
        achievements: updatedAchievements,
        updatedAt: serverTimestamp()
      }

      const progressDoc = doc(db, "userProgress", user.uid)
      await updateDoc(progressDoc, {
        achievements: updatedAchievements,
        updatedAt: serverTimestamp()
      })

      setUserProgress(updatedProgress)

      // Award XP for achievements
      for (const achievement of newAchievements) {
        await addXP(achievement.xpReward, `Achievement: ${achievement.name}`)
      }

      // Log achievement awards
      for (const achievement of newAchievements) {
        await addDoc(collection(db, "achievementLogs"), {
          userId: user.uid,
          achievementId: achievement.id,
          achievementName: achievement.name,
          xpReward: achievement.xpReward,
          timestamp: serverTimestamp()
        })
      }
    }
  }

  const getCurrentLevel = (): number => {
    return userProgress?.currentLevel || 1
  }

  const getXPToNextLevel = (): number => {
    if (!userProgress) return XP_CONFIG.LEVEL_XP_REQUIREMENTS[1]
    const currentLevel = userProgress.currentLevel
    const nextLevelXP = XP_CONFIG.LEVEL_XP_REQUIREMENTS[currentLevel] || XP_CONFIG.LEVEL_XP_REQUIREMENTS[currentLevel - 1]
    return nextLevelXP - userProgress.totalXP
  }

  const getLevelProgress = (): number => {
    if (!userProgress) return 0
    const currentLevel = userProgress.currentLevel
    const currentLevelXP = XP_CONFIG.LEVEL_XP_REQUIREMENTS[currentLevel - 1] || 0
    const nextLevelXP = XP_CONFIG.LEVEL_XP_REQUIREMENTS[currentLevel] || currentLevelXP + 100
    const xpInCurrentLevel = userProgress.totalXP - currentLevelXP
    const xpNeededForLevel = nextLevelXP - currentLevelXP
    return Math.min(100, (xpInCurrentLevel / xpNeededForLevel) * 100)
  }

  const refreshProgress = async () => {
    if (user) {
      await initializeUserProgress()
    }
  }

  const value = {
    userProgress,
    loading,
    addXP,
    completeVideo,
    completeQuiz,
    submitFeedback,
    checkAndAwardBadges,
    checkAndAwardAchievements,
    getCurrentLevel,
    getXPToNextLevel,
    getLevelProgress,
    refreshProgress
  }

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  )
}

export function useGamification() {
  const context = useContext(GamificationContext)
  if (context === undefined) {
    throw new Error("useGamification must be used within a GamificationProvider")
  }
  return context
} 