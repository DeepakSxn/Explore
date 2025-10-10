"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
} from "firebase/auth"
import { auth } from "@/firebase"
import { getUserData } from "../firestore-utils"

interface UserData {
  userId: string
  email: string
  name?: string
  companyName?: string
  phoneCountryCode?: string
  phoneNumber?: string
  createdAt?: { seconds: number; nanoseconds: number }
  isSuspended: boolean
  daysUntilSuspension: number
  manuallySuspended?: boolean
  suspendedAt?: { seconds: number; nanoseconds: number }
  suspensionReason?: string
  role?: string
}

interface AuthContextType {
  user: User | null
  userData: UserData | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUserData: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      if (user) {
        let retryCount = 0
        const maxRetries = 3
        
        const fetchUserDataWithRetry = async (): Promise<void> => {
          try {
            console.log(`AuthContext - Fetching user data (attempt ${retryCount + 1}/${maxRetries})`)
            const data = await getUserData(user.uid)
            setUserData(data as UserData)
            console.log("AuthContext - User data fetched successfully")
          } catch (error) {
            console.error(`AuthContext - Error fetching user data (attempt ${retryCount + 1}):`, error)
            retryCount++
            
            if (retryCount < maxRetries) {
              console.log(`AuthContext - Retrying in ${retryCount * 1000}ms...`)
              setTimeout(fetchUserDataWithRetry, retryCount * 1000)
              return
            } else {
              console.error("AuthContext - Max retries reached, setting userData to null")
              setUserData(null)
            }
          }
        }
        
        await fetchUserDataWithRetry()
      } else {
        setUserData(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signup = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password)
  }

  const logout = async () => {
    await signOut(auth)
    setUserData(null)
  }

  const refreshUserData = async () => {
    if (user) {
      try {
        const data = await getUserData(user.uid)
        setUserData(data as UserData)
      } catch (error) {
        console.error("Error refreshing user data:", error)
      }
    }
  }

  const value = {
    user,
    userData,
    loading,
    login,
    signup,
    logout,
    refreshUserData,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

