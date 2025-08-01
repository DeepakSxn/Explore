import { collection, addDoc, getDocs, serverTimestamp, doc, getDoc, updateDoc, deleteDoc, query, where } from "firebase/firestore"
import { db } from "@/firebase"

// Function to check if user account is suspended (30 days after creation)
export const isAccountSuspended = (createdAt: { seconds: number; nanoseconds: number } | null): boolean => {
  if (!createdAt || !createdAt.seconds) {
    return false // If no creation date, don't suspend
  }
  
  const creationDate = new Date(createdAt.seconds * 1000)
  const currentDate = new Date()
  const daysSinceCreation = Math.floor((currentDate.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24))
  
  return daysSinceCreation > 30
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
      
      const isAutoSuspended = isAccountSuspended(userData.createdAt)
      const isSuspended = userData.manuallySuspended || isAutoSuspended
      const daysUntilSuspension = isSuspended ? 0 : Math.max(0, 30 - Math.floor((new Date().getTime() - new Date((userData.createdAt?.seconds || 0) * 1000).getTime()) / (1000 * 60 * 60 * 24)))
      
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
    return users.filter(user => {
      const isSuspended = isAccountSuspended(user.createdAt || null)
      return isSuspended
    }).map(user => ({
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
      const isAutoSuspended = isAccountSuspended(user.createdAt || null)
      const isSuspended = user.manuallySuspended || isAutoSuspended
      const daysUntilSuspension = isSuspended ? 0 : Math.max(0, 30 - Math.floor((new Date().getTime() - new Date((user.createdAt?.seconds || 0) * 1000).getTime()) / (1000 * 60 * 60 * 24)))
      
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
    // Get all users
    const usersCollection = collection(db, "users")
    const usersSnapshot = await getDocs(usersCollection)
    const users = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    // Get all user progress data
    const progressCollection = collection(db, "userProgress")
    const progressSnapshot = await getDocs(progressCollection)
    const progressData = progressSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    // Combine user data with progress data
    const leaderboardData = users.map(user => {
      const userProgress = progressData.find(progress => progress.userId === user.userId)
      
      return {
        userId: user.userId,
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

    // Sort by total XP and assign ranks
    const sortedData = leaderboardData
      .sort((a, b) => b.totalXP - a.totalXP)
      .map((entry, index) => ({ ...entry, rank: index + 1 }))

    return sortedData
  } catch (error) {
    console.error("Error getting leaderboard data:", error)
    throw error
  }
}

