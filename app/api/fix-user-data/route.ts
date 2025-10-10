import { NextRequest, NextResponse } from 'next/server'
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc,
  serverTimestamp,
  query,
  where,
  getDocs 
} from 'firebase/firestore'
import { db } from '@/firebase'

export async function POST(request: NextRequest) {
  try {
    const { userEmail, correctUserId } = await request.json()
    
    if (!userEmail || !correctUserId) {
      return NextResponse.json({ 
        error: 'User email and correct userId are required' 
      }, { status: 400 })
    }

    console.log(`Fixing user data for: ${userEmail} with userId: ${correctUserId}`)
    
    const fixes = []
    
    // Step 1: Find and fix user document
    const usersRef = collection(db, 'users')
    const userQuery = query(usersRef, where('email', '==', userEmail))
    const userDocs = await getDocs(userQuery)
    
    if (!userDocs.empty) {
      const userDoc = userDocs.docs[0]
      const userData = userDoc.data()
      
      // Update the user document with the correct userId
      await updateDoc(userDoc.ref, {
        userId: correctUserId,
        updatedAt: serverTimestamp()
      })
      
      fixes.push({
        type: 'user_document_updated',
        message: `Updated user document ${userDoc.id} with userId: ${correctUserId}`,
        details: {
          documentId: userDoc.id,
          oldUserId: userData.userId || 'undefined',
          newUserId: correctUserId
        }
      })
    } else {
      return NextResponse.json({ 
        error: 'User document not found' 
      }, { status: 404 })
    }
    
    // Step 2: Create user progress document if missing
    const userProgressRef = doc(db, 'userProgress', correctUserId)
    const userProgressData = {
      userId: correctUserId,
      totalXP: 0,
      currentLevel: 1,
      currentStreak: 0,
      totalVideosWatched: 0,
      badges: [],
      achievements: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    
    await setDoc(userProgressRef, userProgressData)
    fixes.push({
      type: 'user_progress_created',
      message: `Created user progress document for userId: ${correctUserId}`,
      details: {
        documentId: correctUserId,
        initialData: userProgressData
      }
    })
    
    // Step 3: Verify the fix
    const verification = await verifyUserFix(userEmail, correctUserId)
    
    return NextResponse.json({
      success: true,
      message: `Successfully fixed user data for ${userEmail}`,
      fixes,
      verification
    })
    
  } catch (error) {
    console.error('Error fixing user data:', error)
    return NextResponse.json(
      { error: 'Failed to fix user data', details: error.message },
      { status: 500 }
    )
  }
}

async function verifyUserFix(userEmail: string, userId: string) {
  try {
    // Check user document
    const usersRef = collection(db, 'users')
    const userQuery = query(usersRef, where('email', '==', userEmail))
    const userDocs = await getDocs(userQuery)
    
    // Check video watch events
    const eventsRef = collection(db, 'videoWatchEvents')
    const eventsQuery = query(eventsRef, where('userId', '==', userId))
    const eventDocs = await getDocs(eventsQuery)
    
    // Check user progress
    const progressRef = collection(db, 'userProgress')
    const progressQuery = query(progressRef, where('userId', '==', userId))
    const progressDocs = await getDocs(progressQuery)
    
    const userDoc = userDocs.docs[0]?.data()
    
    return {
      userExists: !userDocs.empty,
      userIdMatches: userDoc?.userId === userId,
      hasWatchEvents: eventDocs.size > 0,
      hasProgress: !progressDocs.empty,
      eventCount: eventDocs.size,
      willAppearInUserManagement: !userDocs.empty,
      willAppearInIndividualAnalytics: !userDocs.empty && eventDocs.size > 0 && userDoc?.userId === userId,
      dataConsistency: {
        userDocumentUserId: userDoc?.userId,
        expectedUserId: userId,
        isConsistent: userDoc?.userId === userId
      }
    }
  } catch (error) {
    console.error('Error verifying fix:', error)
    return { error: 'Verification failed' }
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'User data fix API endpoint',
    usage: 'POST with { userEmail: "email@domain.com", correctUserId: "correct_user_id" }'
  })
}
