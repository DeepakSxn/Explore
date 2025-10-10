// firebase.tsx
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyC6p_v1jNO0AsNaikYARxjO0tcek1iAuu8",
  authDomain: "demoauth-82b79.firebaseapp.com",
  projectId: "demoauth-82b79",
  storageBucket: "demoauth-82b79.firebasestorage.app",
  messagingSenderId: "502473124629",
  appId: "1:502473124629:web:07d3a191cf0757f94e571c",
  measurementId: "G-M7LYX2QWWT",
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

// Utility function to test Firebase connection
export const testFirebaseConnection = async (): Promise<boolean> => {
  try {
    // Simple test to check if Firebase is accessible
    const testPromise = new Promise((resolve, reject) => {
      const unsubscribe = auth.onAuthStateChanged(
        (user) => {
          unsubscribe()
          resolve(true)
        },
        (error) => {
          unsubscribe()
          reject(error)
        }
      )
    })
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Firebase connection timeout')), 5000)
    })
    
    await Promise.race([testPromise, timeoutPromise])
    console.log("Firebase connection test: SUCCESS")
    return true
  } catch (error) {
    console.error("Firebase connection test: FAILED", error)
    return false
  }
}

