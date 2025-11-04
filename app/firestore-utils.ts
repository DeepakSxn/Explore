import { collection, addDoc, getDocs, serverTimestamp, doc, getDoc, updateDoc, deleteDoc, query, where, setDoc, orderBy } from "firebase/firestore"
import { db } from "@/firebase"
import { writeBatch } from "firebase/firestore"
import { sendFeedbackEmail, formatFeedbackForEmail } from "./feedback-email-service"

// Auto-suspension disabled: all suspension is manual-only
export const isAccountSuspended = (_createdAt: { seconds: number; nanoseconds: number } | null): boolean => {
  return false
}

// Function to get user data including suspension status
export const getUserData = async (userId: string) => {
  try {
    console.log("getUserData - Searching for user with userId:", userId)
    
    // Add timeout to prevent infinite loading
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('getUserData timeout after 10 seconds')), 10000)
    })
    
    // Query users collection by userId field
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("userId", "==", userId))
    const querySnapshot = await Promise.race([getDocs(q), timeoutPromise]) as any
    
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
    const feedbackData = {
      userId,
      userEmail,
      feedback,
      type: 'video_completion',
      createdAt: serverTimestamp(),
    }
    
    const docRef = await addDoc(collection(db, "feedback"), feedbackData)

    // Send email notification
    try {
      const emailData = formatFeedbackForEmail({
        ...feedbackData,
        id: docRef.id,
        companyName: 'Unknown Company' // You might want to get this from user data
      })
      await sendFeedbackEmail(emailData)
      console.log('Feedback email sent successfully')
    } catch (emailError) {
      console.error('Failed to send feedback email:', emailError)
      // Don't fail the feedback submission if email fails
    }

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

// Company Management Helpers
export const transferUserCompany = async (userId: string, targetCompanyName: string) => {
  try {
    const trimmedTarget = (targetCompanyName || "").trim()
    if (!trimmedTarget) throw new Error("Target company name is required")

    // Ensure target company exists in `companies` with normalizedName
    const normalized = trimmedTarget.toLowerCase()
    const companiesRef = collection(db, "companies")
    const existsSnap = await getDocs(query(companiesRef, where("normalizedName", "==", normalized)))
    if (existsSnap.empty) {
      await addDoc(companiesRef, {
        name: trimmedTarget,
        normalizedName: normalized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }

    // Find user doc by userId field and update companyName
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("userId", "==", userId))
    const qs = await getDocs(q)
    if (qs.empty) throw new Error("User not found")
    const userDoc = qs.docs[0]
    await updateDoc(userDoc.ref, {
      companyName: trimmedTarget,
      updatedAt: serverTimestamp(),
    })
    return true
  } catch (error) {
    console.error("Error transferring user company:", error)
    throw error
  }
}

export const mergeCompanies = async (sourceCompanyName: string, targetCompanyName: string, options?: { deleteSource?: boolean }) => {
  try {
    const src = (sourceCompanyName || "").trim()
    const dst = (targetCompanyName || "").trim()
    if (!src || !dst) throw new Error("Both source and target company names are required")
    const srcNorm = src.toLowerCase()
    const dstNorm = dst.toLowerCase()
    if (srcNorm === dstNorm) throw new Error("Source and target companies are the same")

    // Ensure destination company exists
    const companiesRef = collection(db, "companies")
    const dstSnap = await getDocs(query(companiesRef, where("normalizedName", "==", dstNorm)))
    if (dstSnap.empty) {
      await addDoc(companiesRef, {
        name: dst,
        normalizedName: dstNorm,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }

    // Find all users with companyName matching source (case-insensitive)
    const usersSnap = await getDocs(collection(db, "users"))
    const toUpdate = usersSnap.docs.filter((d) => {
      const name = (d.data().companyName || "").toLowerCase().trim()
      return !!name && name === srcNorm
    })

    const batch = writeBatch(db)
    toUpdate.forEach((d) => {
      batch.update(d.ref, { companyName: dst, updatedAt: serverTimestamp() })
    })
    if (toUpdate.length > 0) {
      await batch.commit()
    }

    // Optionally delete the source company document(s)
    if (options?.deleteSource) {
      const srcSnap = await getDocs(query(companiesRef, where("normalizedName", "==", srcNorm)))
      const deletions = srcSnap.docs.map((docu) => deleteDoc(docu.ref))
      if (deletions.length > 0) await Promise.all(deletions)
    }

    return { updatedUsers: toUpdate.length }
  } catch (error) {
    console.error("Error merging companies:", error)
    throw error
  }
}

// Module Order Management
export interface ModuleOrderDoc {
  category: string
  order: number
  updatedAt: any
}

export const saveModuleOrder = async (category: string, order: number) => {
  try {
    const ref = doc(db, "moduleOrders", category)
    await setDoc(ref, {
      category,
      order,
      updatedAt: serverTimestamp(),
    })
    return true
  } catch (error) {
    console.error("Error saving module order:", error)
    throw error
  }
}

export const getAllModuleOrders = async (): Promise<Record<string, number>> => {
  try {
    const snapshot = await getDocs(collection(db, "moduleOrders"))
    const mapping: Record<string, number> = {}
    snapshot.docs.forEach((d) => {
      const data = d.data() as ModuleOrderDoc
      if (data?.category && typeof data?.order === 'number') {
        mapping[data.category] = data.order
      }
    })
    return mapping
  } catch (error) {
    console.error("Error fetching module orders:", error)
    return {}
  }
}

// Module Video Order Management
export interface ModuleVideoOrderDoc {
  category: string
  videoOrders: Record<string, number>
  updatedAt: any
}

export const saveModuleVideoOrder = async (category: string, videoOrders: Record<string, number>) => {
  try {
    const ref = doc(db, "moduleVideoOrders", category)
    await setDoc(ref, {
      category,
      videoOrders,
      updatedAt: serverTimestamp(),
    })
    return true
  } catch (error) {
    console.error("Error saving module video order:", error)
    throw error
  }
}

export const getAllModuleVideoOrders = async (): Promise<Record<string, Record<string, number>>> => {
  try {
    const snapshot = await getDocs(collection(db, "moduleVideoOrders"))
    const mapping: Record<string, Record<string, number>> = {}
    snapshot.docs.forEach((d) => {
      const data = d.data() as ModuleVideoOrderDoc
      if (data?.category && data?.videoOrders) {
        mapping[data.category] = data.videoOrders
      }
    })
    return mapping
  } catch (error) {
    console.error("Error getting module video order:", error)
    return null
  }
}

// Module Display Name Overrides
export interface ModuleDisplayNameDoc {
  category: string
  displayName: string
  updatedAt: any
}

export const saveModuleDisplayName = async (category: string, displayName: string) => {
  try {
    const ref = doc(db, "moduleDisplayNames", category)
    await setDoc(ref, {
      category,
      displayName,
      updatedAt: serverTimestamp(),
    })
    return true
  } catch (error) {
    console.error("Error saving module display name:", error)
    throw error
  }
}

export const getAllModuleDisplayNames = async (): Promise<Record<string, string>> => {
  try {
    const snapshot = await getDocs(collection(db, "moduleDisplayNames"))
    const mapping: Record<string, string> = {}
    snapshot.docs.forEach((d) => {
      const data = d.data() as ModuleDisplayNameDoc
      if (data?.category && typeof data?.displayName === 'string') {
        mapping[data.category] = data.displayName
      }
    })
    return mapping
  } catch (error) {
    console.error("Error fetching module display names:", error)
    return {}
  }
}