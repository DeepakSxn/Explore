import { collection, addDoc, getDocs, serverTimestamp, doc, getDoc, updateDoc, deleteDoc, query, where, setDoc, orderBy } from "firebase/firestore"
import { db } from "@/firebase"

// Auto-suspension disabled: all suspension is manual-only
export const isAccountSuspended = (_createdAt: { seconds: number; nanoseconds: number } | null): boolean => {
  return false
}

// Function to get user data including suspension status
export const getUserData = async (userId: string) => {
  try {
    console.log("getUserData - Searching for user with userId:", userId)
    
    // Query users collection by userId field
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("userId", "==", userId))
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0]
      const userData = userDoc.data()
      console.log("getUserData - Raw userData:", userData)
      console.log("getUserData - manuallySuspended:", userData.manuallySuspended)
      
      const isSuspended = !!userData.manuallySuspended
      const daysUntilSuspension = 0
      
      const result = {
        ...userData,
        isSuspended,
        daysUntilSuspension,
        manuallySuspended: userData.manuallySuspended || false,
        suspendedAt: userData.suspendedAt,
        suspensionReason: userData.suspensionReason
      }
      
      console.log("getUserData - Final result:", result)
      return result
    }
    
    console.log("getUserData - No user found with userId:", userId)
    return null
  } catch (error) {
    console.error("Error getting user data:", error)
    return null
  }
}

// Function to add videos to Firestore (admin use)
export const addVideoToFirestore = async (videoData: {
  title: string
  duration: string
  thumbnail: string
}) => {
  try {
    const docRef = await addDoc(collection(db, "videos"), {
      ...videoData,
      createdAt: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error("Error adding video:", error)
    throw error
  }
}

// Function to get all videos
export const getVideosFromFirestore = async () => {
  try {
    const videosCollection = collection(db, "videos")
    const videoSnapshot = await getDocs(videosCollection)
    return videoSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Error getting videos:", error)
    throw error
  }
}

// Function to submit feedback
export const submitFeedback = async (userId: string, userEmail: string, feedback: string) => {
  try {
    const docRef = await addDoc(collection(db, "feedback"), {
      userId,
      userEmail,
      feedback,
      createdAt: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error("Error submitting feedback:", error)
    throw error
  }
}

// Function to get all suspended users
export const getSuspendedUsers = async () => {
  try {
    const usersCollection = collection(db, "users")
    const usersSnapshot = await getDocs(usersCollection)
    const users = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Array<{ id: string; createdAt?: { seconds: number; nanoseconds: number }; [key: string]: any }>
    
    // Filter suspended users
    return users.filter(user => !!user.manuallySuspended).map(user => ({
      ...user,
      isSuspended: true,
      daysUntilSuspension: 0
    }))
  } catch (error) {
    console.error("Error getting suspended users:", error)
    throw error
  }
}

// Function to get all users with suspension status
export const getAllUsersWithSuspensionStatus = async () => {
  try {
    const usersCollection = collection(db, "users")
    const usersSnapshot = await getDocs(usersCollection)
    const users = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Array<{ 
      id: string; 
      createdAt?: { seconds: number; nanoseconds: number }; 
      manuallySuspended?: boolean;
      suspendedAt?: { seconds: number; nanoseconds: number };
      suspensionReason?: string;
      [key: string]: any 
    }>
    
    return users.map(user => {
      const isSuspended = !!user.manuallySuspended
      const daysUntilSuspension = 0
      return {
        ...user,
        isSuspended,
        daysUntilSuspension,
        manuallySuspended: user.manuallySuspended || false,
        suspendedAt: user.suspendedAt,
        suspensionReason: user.suspensionReason
      }
    })
  } catch (error) {
    console.error("Error getting users with suspension status:", error)
    throw error
  }
}

// Function to manually suspend a user
export const suspendUser = async (userId: string, reason?: string) => {
  try {
    // Find user document by userId field
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("userId", "==", userId))
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0]
      await updateDoc(userDoc.ref, {
        manuallySuspended: true,
        suspendedAt: serverTimestamp(),
        suspensionReason: reason || "Manually suspended by admin"
      })
      return true
    }
    throw new Error("User not found")
  } catch (error) {
    console.error("Error suspending user:", error)
    throw error
  }
}

// Function to unsuspend a user
export const unsuspendUser = async (userId: string) => {
  try {
    // Find user document by userId field
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("userId", "==", userId))
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0]
      await updateDoc(userDoc.ref, {
        manuallySuspended: false,
        suspendedAt: null,
        suspensionReason: null,
        // Reset creation date to prevent auto-suspension
        createdAt: serverTimestamp()
      })
      return true
    }
    throw new Error("User not found")
  } catch (error) {
    console.error("Error unsuspending user:", error)
    throw error
  }
}

// Function to delete a user
export const deleteUser = async (userId: string) => {
  try {
    // Find user document by userId field
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("userId", "==", userId))
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0]
      await deleteDoc(userDoc.ref)
      return true
    }
    throw new Error("User not found")
  } catch (error) {
    console.error("Error deleting user:", error)
    throw error
  }
}

// Function to update user suspension reason
export const updateSuspensionReason = async (userId: string, reason: string) => {
  try {
    // Find user document by userId field
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("userId", "==", userId))
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0]
      await updateDoc(userDoc.ref, {
        suspensionReason: reason
      })
      return true
    }
    throw new Error("User not found")
  } catch (error) {
    console.error("Error updating suspension reason:", error)
    throw error
  }
}

// Function to get leaderboard data
export const getLeaderboardData = async () => {
  try {
    console.log("getLeaderboardData - Starting to fetch leaderboard data...")
    
    // Get all users
    const usersCollection = collection(db, "users")
    const usersSnapshot = await getDocs(usersCollection)
    const users = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Array<{
      id: string
      userId?: string
      name?: string
      email?: string
      companyName?: string
      department?: string
      avatar?: string
      [key: string]: any
    }>
    
    console.log("getLeaderboardData - Found users:", users.length)
    if (users.length === 0) {
      console.log("getLeaderboardData - No users found in the system")
      return []
    }
    console.log("getLeaderboardData - Sample user:", users[0])

    // Get all user progress data
    const progressCollection = collection(db, "userProgress")
    const progressSnapshot = await getDocs(progressCollection)
    const progressData = progressSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Array<{
      id: string
      userId?: string
      totalXP?: number
      currentLevel?: number
      currentStreak?: number
      totalVideosWatched?: number
      badges?: any[]
      achievements?: any[]
      [key: string]: any
    }>
    
    console.log("getLeaderboardData - Found progress entries:", progressData.length)
    if (progressData.length > 0) {
      console.log("getLeaderboardData - Sample progress:", progressData[0])
    }

    // Combine user data with progress data
    const leaderboardData = users.map(user => {
      // Try to find progress data by userId field first, then by document ID
      const userProgress = progressData.find(progress => 
        progress.userId === user.userId || progress.userId === user.id
      )
      
      console.log(`getLeaderboardData - User ${user.userId || user.id}:`, {
        hasProgress: !!userProgress,
        progressData: userProgress
      })
      
      return {
        userId: user.userId || user.id,
        name: user.name || user.email?.split('@')[0] || 'Anonymous',
        email: user.email || '',
        company: user.companyName || 'EOXS Corp',
        department: user.department || 'General',
        avatar: user.avatar,
        totalXP: userProgress?.totalXP || 0,
        currentLevel: userProgress?.currentLevel || 1,
        currentStreak: userProgress?.currentStreak || 0,
        totalVideosWatched: userProgress?.totalVideosWatched || 0,
        badgesEarned: userProgress?.badges?.length || 0,
        achievementsEarned: userProgress?.achievements?.length || 0,
        rank: 0,
        isCurrentUser: false
      }
    })

    console.log("getLeaderboardData - Combined data sample:", leaderboardData[0])

    // Sort by total XP and assign ranks
    const sortedData = leaderboardData
      .sort((a, b) => b.totalXP - a.totalXP)
      .map((entry, index) => ({ ...entry, rank: index + 1 }))

    console.log("getLeaderboardData - Final sorted data sample:", sortedData[0])
    console.log("getLeaderboardData - Total entries:", sortedData.length)

    return sortedData
  } catch (error) {
    console.error("Error getting leaderboard data:", error)
    throw error
  }
}

// Challenge Management Functions
export interface Challenge {
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
  startDate: any // Firestore timestamp
  endDate: any // Firestore timestamp
  participants: string[]
  leaderboard: Array<{
    userId: string
    name: string
    progress: number
    rank: number
  }>
  isActive: boolean
  isCompleted: boolean
  createdAt: any
  updatedAt: any
}

export interface ChallengeParticipation {
  id: string
  challengeId: string
  userId: string
  userName: string
  userEmail: string
  progress: number
  rank: number
  joinedAt: any
  lastUpdated: any
  isCompleted: boolean
  rewardClaimed: boolean
}

export interface QuizAttempt {
  id: string
  videoId: string
  userId: string
  userName: string
  userEmail: string
  quizId: string
  score: number
  totalQuestions: number
  percentage: number
  isFirstAttempt: boolean
  isPerfectScore: boolean
  answers: Array<{
    questionId: string
    selectedAnswer: number
    correctAnswer: number
    isCorrect: boolean
  }>
  xpEarned: number
  completedAt: any
  rewatchedVideo: boolean
  attemptNumber: number
}

// Create a new challenge (admin function)
export const createChallenge = async (challengeData: Omit<Challenge, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const docRef = await addDoc(collection(db, "challenges"), {
      ...challengeData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    return docRef.id
  } catch (error) {
    console.error("Error creating challenge:", error)
    throw error
  }
}

// Get all challenges
export const getChallenges = async (): Promise<Challenge[]> => {
  try {
    const challengesCollection = collection(db, "challenges")
    const challengesSnapshot = await getDocs(challengesCollection)
    return challengesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Challenge[]
  } catch (error) {
    console.error("Error getting challenges:", error)
    throw error
  }
}

// Get active challenges
export const getActiveChallenges = async (): Promise<Challenge[]> => {
  try {
    const challenges = await getChallenges()
    const now = new Date()
    return challenges.filter(challenge => {
      const startDate = challenge.startDate?.toDate?.() || new Date(challenge.startDate)
      const endDate = challenge.endDate?.toDate?.() || new Date(challenge.endDate)
      return startDate <= now && endDate >= now && !challenge.isCompleted
    })
  } catch (error) {
    console.error("Error getting active challenges:", error)
    throw error
  }
}

// Join a challenge
export const joinChallenge = async (challengeId: string, userId: string, userName: string, userEmail: string) => {
  try {
    // Check if user is already participating
    const participationRef = collection(db, "challengeParticipations")
    const q = query(participationRef, where("challengeId", "==", challengeId), where("userId", "==", userId))
    const existingParticipation = await getDocs(q)
    
    if (!existingParticipation.empty) {
      throw new Error("Already participating in this challenge")
    }

    // Add user to challenge participants
    const challengeRef = doc(db, "challenges", challengeId)
    const challengeDoc = await getDoc(challengeRef)
    
    if (!challengeDoc.exists()) {
      throw new Error("Challenge not found")
    }

    const challenge = challengeDoc.data() as Challenge
    const updatedParticipants = [...challenge.participants, userId]
    
    await updateDoc(challengeRef, {
      participants: updatedParticipants,
      updatedAt: serverTimestamp()
    })

    // Create participation record
    const participationData: Omit<ChallengeParticipation, 'id'> = {
      challengeId,
      userId,
      userName,
      userEmail,
      progress: 0,
      rank: 0,
      joinedAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
      isCompleted: false,
      rewardClaimed: false
    }

    await addDoc(collection(db, "challengeParticipations"), participationData)

    return true
  } catch (error) {
    console.error("Error joining challenge:", error)
    throw error
  }
}

// Update challenge progress
export const updateChallengeProgress = async (challengeId: string, userId: string, progress: number) => {
  try {
    // Update participation record
    const participationRef = collection(db, "challengeParticipations")
    const q = query(participationRef, where("challengeId", "==", challengeId), where("userId", "==", userId))
    const participationSnapshot = await getDocs(q)
    
    if (participationSnapshot.empty) {
      throw new Error("Not participating in this challenge")
    }

    const participationDoc = participationSnapshot.docs[0]
    await updateDoc(participationDoc.ref, {
      progress,
      lastUpdated: serverTimestamp()
    })

    // Update challenge leaderboard
    await updateChallengeLeaderboard(challengeId)

    return true
  } catch (error) {
    console.error("Error updating challenge progress:", error)
    throw error
  }
}

// Update challenge leaderboard
export const updateChallengeLeaderboard = async (challengeId: string) => {
  try {
    // Get all participations for this challenge
    const participationRef = collection(db, "challengeParticipations")
    const q = query(participationRef, where("challengeId", "==", challengeId))
    const participationSnapshot = await getDocs(q)
    
    const participations = participationSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChallengeParticipation[]

    // Sort by progress (descending)
    const sortedParticipations = participations.sort((a, b) => b.progress - a.progress)

    // Create leaderboard
    const leaderboard = sortedParticipations.map((participation, index) => ({
      userId: participation.userId,
      name: participation.userName,
      progress: participation.progress,
      rank: index + 1
    }))

    // Update challenge with new leaderboard
    const challengeRef = doc(db, "challenges", challengeId)
    await updateDoc(challengeRef, {
      leaderboard,
      updatedAt: serverTimestamp()
    })

    return leaderboard
  } catch (error) {
    console.error("Error updating challenge leaderboard:", error)
    throw error
  }
}

// Get user's challenge participations
export const getUserChallengeParticipations = async (userId: string): Promise<ChallengeParticipation[]> => {
  try {
    const participationRef = collection(db, "challengeParticipations")
    const q = query(participationRef, where("userId", "==", userId))
    const participationSnapshot = await getDocs(q)
    
    return participationSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChallengeParticipation[]
  } catch (error) {
    console.error("Error getting user challenge participations:", error)
    throw error
  }
}

// Claim challenge reward
export const claimChallengeReward = async (challengeId: string, userId: string) => {
  try {
    // Check if user has completed the challenge
    const participationRef = collection(db, "challengeParticipations")
    const q = query(participationRef, where("challengeId", "==", challengeId), where("userId", "==", userId))
    const participationSnapshot = await getDocs(q)
    
    if (participationSnapshot.empty) {
      throw new Error("Not participating in this challenge")
    }

    const participationDoc = participationSnapshot.docs[0]
    const participation = participationDoc.data() as ChallengeParticipation

    if (participation.rewardClaimed) {
      throw new Error("Reward already claimed")
    }

    // Get challenge details
    const challengeRef = doc(db, "challenges", challengeId)
    const challengeDoc = await getDoc(challengeRef)
    
    if (!challengeDoc.exists()) {
      throw new Error("Challenge not found")
    }

    const challenge = challengeDoc.data() as Challenge

    // Check if challenge is completed
    if (participation.progress < challenge.target) {
      throw new Error("Challenge not completed yet")
    }

    // Mark reward as claimed
    await updateDoc(participationDoc.ref, {
      rewardClaimed: true,
      lastUpdated: serverTimestamp()
    })

    // Add XP to user progress
    const userProgressRef = doc(db, "userProgress", userId)
    const userProgressDoc = await getDoc(userProgressRef)
    
    if (userProgressDoc.exists()) {
      const currentXP = userProgressDoc.data().totalXP || 0
      await updateDoc(userProgressRef, {
        totalXP: currentXP + challenge.reward.xp,
        updatedAt: serverTimestamp()
      })
    }

    // Log reward claim
    await addDoc(collection(db, "challengeRewardLogs"), {
      challengeId,
      userId,
      challengeTitle: challenge.title,
      xpReward: challenge.reward.xp,
      badgeReward: challenge.reward.badge,
      claimedAt: serverTimestamp()
    })

    return {
      xpReward: challenge.reward.xp,
      badgeReward: challenge.reward.badge
    }
  } catch (error) {
    console.error("Error claiming challenge reward:", error)
    throw error
  }
}

// Quiz Management Functions
export const saveQuizAttempt = async (quizData: Omit<QuizAttempt, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, "quizAttempts"), {
      ...quizData,
      completedAt: serverTimestamp()
    })
    return docRef.id
  } catch (error) {
    console.error("Error saving quiz attempt:", error)
    throw error
  }
}

export const getQuizAttemptsForVideo = async (userId: string, videoId: string): Promise<QuizAttempt[]> => {
  try {
    const quizAttemptsRef = collection(db, "quizAttempts")
    const q = query(
      quizAttemptsRef, 
      where("userId", "==", userId), 
      where("videoId", "==", videoId),
      orderBy("completedAt", "desc")
    )
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as QuizAttempt[]
  } catch (error) {
    console.error("Error getting quiz attempts:", error)
    throw error
  }
}

// Module Video Order Management
export interface ModuleVideoOrderDoc {
  category: string
  videoIds: string[]
  updatedAt: any
}

export const saveModuleVideoOrder = async (category: string, videoIds: string[]) => {
  try {
    const docRef = doc(db, "moduleVideoOrders", category)
    await setDoc(docRef, {
      category,
      videoIds,
      updatedAt: serverTimestamp(),
    })
    return true
  } catch (error) {
    console.error("Error saving module video order:", error)
    throw error
  }
}

export const getAllModuleVideoOrders = async (): Promise<Record<string, string[]>> => {
  try {
    const snapshot = await getDocs(collection(db, "moduleVideoOrders"))
    const mapping: Record<string, string[]> = {}
    snapshot.docs.forEach((d) => {
      const data = d.data() as ModuleVideoOrderDoc
      if (data?.category && Array.isArray(data?.videoIds)) {
        mapping[data.category] = data.videoIds
      }
    })
    return mapping
  } catch (error) {
    console.error("Error fetching module video orders:", error)
    return {}
  }
}

export const getModuleVideoOrder = async (category: string): Promise<string[] | null> => {
  try {
    const ref = doc(db, "moduleVideoOrders", category)
    const d = await getDoc(ref)
    if (d.exists()) {
      const data = d.data() as ModuleVideoOrderDoc
      return data.videoIds || []
    }
    return null
  } catch (error) {
    console.error("Error getting module video order:", error)
    return null
  }
}

export const checkIfVideoWasWatched = async (userId: string, videoId: string): Promise<boolean> => {
  try {
    const watchEventsRef = collection(db, "videoWatchEvents")
    const q = query(
      watchEventsRef,
      where("userId", "==", userId),
      where("videoId", "==", videoId),
      where("completed", "==", true)
    )
    const snapshot = await getDocs(q)
    return !snapshot.empty
  } catch (error) {
    console.error("Error checking if video was watched:", error)
    return false
  }
}

export const getQuizStatsForUser = async (userId: string) => {
  try {
    const quizAttemptsRef = collection(db, "quizAttempts")
    const q = query(quizAttemptsRef, where("userId", "==", userId))
    const snapshot = await getDocs(q)
    
    const attempts = snapshot.docs.map(doc => doc.data()) as QuizAttempt[]
    
    const stats = {
      totalAttempts: attempts.length,
      firstAttempts: attempts.filter(a => a.isFirstAttempt).length,
      rewatchedAttempts: attempts.filter(a => a.rewatchedVideo).length,
      perfectScores: attempts.filter(a => a.isPerfectScore).length,
      averageScore: attempts.length > 0 ? attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length : 0,
      totalXPEarned: attempts.reduce((sum, a) => sum + a.xpEarned, 0),
      uniqueVideosQuized: new Set(attempts.map(a => a.videoId)).size
    }
    
    return stats
  } catch (error) {
    console.error("Error getting quiz stats:", error)
    throw error
  }
}

// Delete a challenge
export const deleteChallenge = async (challengeId: string) => {
  try {
    const challengeRef = doc(db, "challenges", challengeId)
    await deleteDoc(challengeRef)
    
    // Also clean up related participation records
    const participationRef = collection(db, "challengeParticipations")
    const q = query(participationRef, where("challengeId", "==", challengeId))
    const participationSnapshot = await getDocs(q)
    
    const batch = participationSnapshot.docs.map(doc => deleteDoc(doc.ref))
    await Promise.all(batch)
    
    return true
  } catch (error) {
    console.error("Error deleting challenge:", error)
    throw error
  }
}

// Update challenge status (active/inactive)
export const updateChallengeStatus = async (challengeId: string, isActive: boolean) => {
  try {
    const challengeRef = doc(db, "challenges", challengeId)
    await updateDoc(challengeRef, {
      isActive,
      updatedAt: serverTimestamp()
    })
    return true
  } catch (error) {
    console.error("Error updating challenge status:", error)
    throw error
  }
}

// Initialize default challenges (run once to set up initial challenges)
export const initializeDefaultChallenges = async () => {
  try {
    const existingChallenges = await getChallenges()
    
    if (existingChallenges.length > 0) {
      console.log("Challenges already exist, skipping initialization")
      return
    }

    const defaultChallenges = [
      {
        title: "Module Master Challenge",
        description: "Complete 3 modules in 7 days to unlock a special badge",
        type: "weekly" as const,
        category: "modules" as const,
        target: 3,
        reward: {
          xp: 500,
          badge: "Module Master",
          title: "Module Master"
        },
        startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        participants: [],
        leaderboard: [],
        isActive: true,
        isCompleted: false
      },
      {
        title: "Video Watcher Challenge",
        description: "Watch 10 videos this week to earn bonus XP",
        type: "weekly" as const,
        category: "videos" as const,
        target: 10,
        reward: {
          xp: 300,
          badge: "Video Enthusiast",
          title: "Video Enthusiast"
        },
        startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
        participants: [],
        leaderboard: [],
        isActive: true,
        isCompleted: false
      },
      {
        title: "Quiz Master Challenge",
        description: "Get perfect scores on 5 quizzes",
        type: "individual" as const,
        category: "quizzes" as const,
        target: 5,
        reward: {
          xp: 750,
          badge: "Quiz Master",
          title: "Quiz Master"
        },
        startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
        participants: [],
        leaderboard: [],
        isActive: true,
        isCompleted: false
      },
      {
        title: "Learning Streak Challenge",
        description: "Maintain a 7-day learning streak",
        type: "weekly" as const,
        category: "streak" as const,
        target: 7,
        reward: {
          xp: 400,
          badge: "Streak Champion",
          title: "Streak Champion"
        },
        startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        participants: [],
        leaderboard: [],
        isActive: true,
        isCompleted: false
      }
    ]

    for (const challenge of defaultChallenges) {
      await createChallenge(challenge)
    }

    console.log("Default challenges initialized successfully")
  } catch (error) {
    console.error("Error initializing default challenges:", error)
    throw error
  }
}

