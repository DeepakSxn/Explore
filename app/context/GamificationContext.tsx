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
  completedModules: string[]
  unlockedModules: string[]
  totalVideosWatched: number
  totalWatchTime: number // in minutes
  createdAt: any
  updatedAt: any
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
  DAILY_STREAK: 25,
  MODULE_COMPLETION: 500, // Increased from 200 to 500 as requested
  FEEDBACK_SUBMISSION: 10,
  FIRST_VIDEO: 100,
  STREAK_MILESTONES: [3, 7, 14, 30, 60, 100],
  LEVEL_XP_REQUIREMENTS: [
    0, 100, 250, 500, 1000, 2000, 3500, 5000, 7000, 10000,
    15000, 20000, 30000, 40000, 50000, 75000, 100000, 150000, 200000, 300000
  ]
}


interface GamificationContextType {
  userProgress: UserProgress | null
  loading: boolean
  addXP: (amount: number, reason: string) => Promise<{ levelUp: boolean; newLevel: number } | undefined>
  completeVideo: (videoId: string, watchTime: number) => Promise<void>
  submitFeedback: () => Promise<void>
  checkModuleCompletion: (videoId: string, videoCategory: string) => Promise<{ completed: boolean; moduleName?: string }>
  getCurrentLevel: () => number
  getXPToNextLevel: () => number
  getLevelProgress: () => number
  getTotalXP: () => number
  getTotalVideosWatched: () => number
  getCurrentStreak: () => number
  getLongestStreak: () => number
  getCompletedModules: () => string[]
  getUnlockedModules: () => string[]
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined)

export const useGamification = () => {
  const context = useContext(GamificationContext)
  if (context === undefined) {
    throw new Error('useGamification must be used within a GamificationProvider')
  }
  return context
}

export const GamificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  // Initialize user progress
  useEffect(() => {
    if (user) {
      initializeUserProgress()
    } else {
      setUserProgress(null)
      setLoading(false)
    }
  }, [user])

  const initializeUserProgress = async () => {
    if (!user) return

    try {
      setLoading(true)
      const progressRef = doc(db, "userProgress", user.uid)
      const progressDoc = await getDoc(progressRef)

      if (progressDoc.exists()) {
        const progressData = progressDoc.data() as UserProgress
        setUserProgress(progressData)
      } else {
        // Create new user progress
        const newProgress: UserProgress = {
          userId: user.uid,
          currentLevel: 1,
          totalXP: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastActivityDate: new Date().toISOString().split('T')[0],
          completedModules: [],
          unlockedModules: [],
          totalVideosWatched: 0,
          totalWatchTime: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }

        await setDoc(progressRef, newProgress)
        setUserProgress(newProgress)
      }
    } catch (error) {
      console.error("Error initializing user progress:", error)
    } finally {
      setLoading(false)
    }
  }

  const addXP = async (amount: number, reason: string): Promise<{ levelUp: boolean; newLevel: number } | undefined> => {
    if (!userProgress) return

    try {
      const newTotalXP = userProgress.totalXP + amount
      const newLevel = getLevelFromXP(newTotalXP)
      const levelUp = newLevel > userProgress.currentLevel

      const updatedProgress = {
        ...userProgress,
        totalXP: newTotalXP,
        currentLevel: newLevel,
        updatedAt: serverTimestamp()
      }

      // Update in database
      const progressRef = doc(db, "userProgress", user.uid)
      await updateDoc(progressRef, {
        totalXP: newTotalXP,
        currentLevel: newLevel,
        updatedAt: serverTimestamp()
      })

      setUserProgress(updatedProgress)

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

  const completeVideo = async (videoId: string, watchTime: number) => {
    if (!userProgress) return

    try {
      const isFirstVideo = userProgress.totalVideosWatched === 0
      const xpReward = isFirstVideo ? XP_CONFIG.FIRST_VIDEO : XP_CONFIG.VIDEO_COMPLETION

      await addXP(xpReward, `Video completion: ${videoId}`)

      // Update video count and watch time
      const updatedProgress = {
        ...userProgress,
        totalVideosWatched: userProgress.totalVideosWatched + 1,
        totalWatchTime: userProgress.totalWatchTime + watchTime,
        updatedAt: serverTimestamp()
      }

      const progressRef = doc(db, "userProgress", user.uid)
      await updateDoc(progressRef, {
        totalVideosWatched: updatedProgress.totalVideosWatched,
        totalWatchTime: updatedProgress.totalWatchTime,
        updatedAt: serverTimestamp()
      })

      setUserProgress(updatedProgress)

    } catch (error) {
      console.error("Error completing video:", error)
    }
  }

  const submitFeedback = async () => {
    if (!userProgress) return

    try {
      await addXP(XP_CONFIG.FEEDBACK_SUBMISSION, "Feedback submission")
    } catch (error) {
      console.error("Error submitting feedback:", error)
    }
  }



  const checkModuleCompletion = async (videoId: string, videoCategory: string): Promise<{ completed: boolean; moduleName?: string }> => {
    if (!userProgress) return { completed: false }

    try {
      // Check if all videos in this category have been watched
      const videosRef = collection(db, "videos")
      const categoryQuery = query(videosRef, where("category", "==", videoCategory))
      const categoryVideos = await getDocs(categoryQuery)
      
      if (categoryVideos.empty) return { completed: false }

      // Get all video watch events for this user
      const watchEventsRef = collection(db, "videoWatchEvents")
      const userWatchQuery = query(watchEventsRef, where("userId", "==", user.uid), where("completed", "==", true))
      const userWatchEvents = await getDocs(userWatchQuery)
      
      const watchedVideoIds = new Set(userWatchEvents.docs.map(doc => doc.data().videoId))
      const categoryVideoIds = categoryVideos.docs.map(doc => doc.id)
      
      const allVideosWatched = categoryVideoIds.every(id => watchedVideoIds.has(id))
      
      if (allVideosWatched && !userProgress.completedModules.includes(videoCategory)) {
        // Award module completion XP
        await addXP(XP_CONFIG.MODULE_COMPLETION, `Module completion: ${videoCategory}`)
        
        // Update completed modules
        const updatedModules = [...userProgress.completedModules, videoCategory]
        const updatedProgress = {
          ...userProgress,
          completedModules: updatedModules,
          updatedAt: serverTimestamp()
        }

        const progressRef = doc(db, "userProgress", user.uid)
        await updateDoc(progressRef, {
          completedModules: updatedModules,
          updatedAt: serverTimestamp()
        })

        setUserProgress(updatedProgress)
        
        return { completed: true, moduleName: videoCategory }
      }
      
      return { completed: false }
    } catch (error) {
      console.error("Error checking module completion:", error)
      return { completed: false }
    }
  }

  const getLevelFromXP = (xp: number): number => {
    const levels = XP_CONFIG.LEVEL_XP_REQUIREMENTS
    for (let i = levels.length - 1; i >= 0; i--) {
      if (xp >= levels[i]) {
        return i + 1
      }
    }
    return 1
  }

  const getCurrentLevel = (): number => {
    return userProgress?.currentLevel || 1
  }

  const getXPToNextLevel = (): number => {
    if (!userProgress) return 0
    const currentLevel = userProgress.currentLevel
    const nextLevelXP = XP_CONFIG.LEVEL_XP_REQUIREMENTS[currentLevel] || 0
    return nextLevelXP - userProgress.totalXP
  }

  const getLevelProgress = (): number => {
    if (!userProgress) return 0
    const currentLevel = userProgress.currentLevel
    const currentLevelXP = XP_CONFIG.LEVEL_XP_REQUIREMENTS[currentLevel - 1] || 0
    const nextLevelXP = XP_CONFIG.LEVEL_XP_REQUIREMENTS[currentLevel] || 0
    const progressXP = userProgress.totalXP - currentLevelXP
    const totalXPNeeded = nextLevelXP - currentLevelXP
    return totalXPNeeded > 0 ? (progressXP / totalXPNeeded) * 100 : 100
  }

  const getTotalXP = (): number => {
    return userProgress?.totalXP || 0
  }

  const getTotalVideosWatched = (): number => {
    return userProgress?.totalVideosWatched || 0
  }

  const getCurrentStreak = (): number => {
    return userProgress?.currentStreak || 0
  }

  const getLongestStreak = (): number => {
    return userProgress?.longestStreak || 0
  }


  const getCompletedModules = (): string[] => {
    return userProgress?.completedModules || []
  }

  const getUnlockedModules = (): string[] => {
    return userProgress?.unlockedModules || []
  }

  const value: GamificationContextType = {
    userProgress,
    loading,
    addXP,
    completeVideo,
    submitFeedback,
    checkModuleCompletion,
    getCurrentLevel,
    getXPToNextLevel,
    getLevelProgress,
    getTotalXP,
    getTotalVideosWatched,
    getCurrentStreak,
    getLongestStreak,
    getCompletedModules,
    getUnlockedModules
  }

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  )
}