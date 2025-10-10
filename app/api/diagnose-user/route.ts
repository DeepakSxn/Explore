import { NextRequest, NextResponse } from 'next/server'
import { 
  collection, 
  query,
  where,
  getDocs,
  orderBy 
} from 'firebase/firestore'
import { db } from '@/firebase'

export async function POST(request: NextRequest) {
  try {
    const { userEmail } = await request.json()
    
    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 })
    }

    console.log(`Diagnosing user: ${userEmail}`)
    
    const diagnosis = {
      userEmail,
      timestamp: new Date().toISOString(),
      userDocuments: [],
      videoWatchEvents: [],
      userProgress: [],
      issues: [],
      recommendations: []
    }

    // Step 1: Check user documents
    const usersRef = collection(db, 'users')
    
    // Search by email
    const userByEmailQuery = query(usersRef, where('email', '==', userEmail))
    const userByEmailDocs = await getDocs(userByEmailQuery)
    
    // Search by userId (derived from email)
    const derivedUserId = userEmail.replace(/[@.]/g, '_')
    const userByUserIdQuery = query(usersRef, where('userId', '==', derivedUserId))
    const userByUserIdDocs = await getDocs(userByUserIdQuery)
    
    // Collect all user documents
    const allUserDocs = new Map()
    
    userByEmailDocs.docs.forEach(doc => {
      allUserDocs.set(doc.id, { source: 'email_search', ...doc.data() })
    })
    
    userByUserIdDocs.docs.forEach(doc => {
      if (allUserDocs.has(doc.id)) {
        allUserDocs.get(doc.id).source += ', userId_search'
      } else {
        allUserDocs.set(doc.id, { source: 'userId_search', ...doc.data() })
      }
    })
    
    diagnosis.userDocuments = Array.from(allUserDocs.entries()).map(([id, data]) => ({
      documentId: id,
      ...data
    }))

    // Step 2: Check video watch events
    const eventsRef = collection(db, 'videoWatchEvents')
    
    // Search by userEmail
    const eventsByEmailQuery = query(eventsRef, where('userEmail', '==', userEmail))
    const eventsByEmailDocs = await getDocs(eventsByEmailQuery)
    
    // Search by userId
    const eventsByUserIdQuery = query(eventsRef, where('userId', '==', derivedUserId))
    const eventsByUserIdDocs = await getDocs(eventsByUserIdQuery)
    
    // Collect all events
    const allEvents = new Map()
    
    eventsByEmailDocs.docs.forEach(doc => {
      allEvents.set(doc.id, { source: 'email_search', ...doc.data() })
    })
    
    eventsByUserIdDocs.docs.forEach(doc => {
      if (allEvents.has(doc.id)) {
        allEvents.get(doc.id).source += ', userId_search'
      } else {
        allEvents.set(doc.id, { source: 'userId_search', ...doc.data() })
      }
    })
    
    diagnosis.videoWatchEvents = Array.from(allEvents.entries()).map(([id, data]) => ({
      documentId: id,
      ...data
    }))

    // Step 3: Check user progress
    const progressRef = collection(db, 'userProgress')
    const progressQuery = query(progressRef, where('userId', '==', derivedUserId))
    const progressDocs = await getDocs(progressQuery)
    
    diagnosis.userProgress = progressDocs.docs.map(doc => ({
      documentId: doc.id,
      ...doc.data()
    }))

    // Step 4: Analyze issues
    if (diagnosis.userDocuments.length === 0) {
      diagnosis.issues.push({
        type: 'missing_user_document',
        severity: 'high',
        message: 'No user document found in users collection',
        impact: 'User will not appear in User Management section'
      })
      diagnosis.recommendations.push('Create user document in users collection')
    } else if (diagnosis.userDocuments.length > 1) {
      diagnosis.issues.push({
        type: 'duplicate_user_documents',
        severity: 'medium',
        message: `Found ${diagnosis.userDocuments.length} user documents`,
        impact: 'May cause inconsistent behavior'
      })
      diagnosis.recommendations.push('Remove duplicate user documents, keep only one')
    }

    if (diagnosis.videoWatchEvents.length === 0) {
      diagnosis.issues.push({
        type: 'missing_video_events',
        severity: 'high',
        message: 'No video watch events found',
        impact: 'User will not appear in Individual Analytics section'
      })
      diagnosis.recommendations.push('Verify video watch events exist with correct userId/userEmail')
    }

    if (diagnosis.userProgress.length === 0) {
      diagnosis.issues.push({
        type: 'missing_user_progress',
        severity: 'low',
        message: 'No user progress document found',
        impact: 'User may have incomplete gamification data'
      })
      diagnosis.recommendations.push('Create user progress document for complete user profile')
    }

    // Step 5: Check for data consistency issues
    if (diagnosis.userDocuments.length > 0 && diagnosis.videoWatchEvents.length > 0) {
      const userDoc = diagnosis.userDocuments[0]
      const sampleEvent = diagnosis.videoWatchEvents[0]
      
      // Check userId consistency
      if (userDoc.userId !== sampleEvent.userId) {
        diagnosis.issues.push({
          type: 'userId_mismatch',
          severity: 'high',
          message: `User document userId (${userDoc.userId}) doesn't match event userId (${sampleEvent.userId})`,
          impact: 'Analytics will not link user data with video events'
        })
        diagnosis.recommendations.push('Update userId fields to match between collections')
      }
      
      // Check email consistency
      if (userDoc.email !== sampleEvent.userEmail) {
        diagnosis.issues.push({
          type: 'email_mismatch',
          severity: 'medium',
          message: `User document email (${userDoc.email}) doesn't match event userEmail (${sampleEvent.userEmail})`,
          impact: 'May cause lookup issues in some queries'
        })
        diagnosis.recommendations.push('Update email fields to match between collections')
      }
    }

    // Step 6: Check date ranges for analytics filtering
    if (diagnosis.videoWatchEvents.length > 0) {
      const events = diagnosis.videoWatchEvents
      const now = new Date()
      const recentEvents = events.filter(event => {
        const eventDate = event.lastWatchedAt?.seconds 
          ? new Date(event.lastWatchedAt.seconds * 1000)
          : event.watchedAt?.seconds 
          ? new Date(event.watchedAt.seconds * 1000)
          : null
        
        if (!eventDate) return false
        
        const daysDiff = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24)
        return daysDiff <= 30 // Events within last 30 days
      })
      
      if (recentEvents.length === 0) {
        diagnosis.issues.push({
          type: 'old_video_events',
          severity: 'medium',
          message: 'All video events are older than 30 days',
          impact: 'User may not appear when date filters are applied in analytics'
        })
        diagnosis.recommendations.push('Check if analytics page is filtering by date range')
      }
    }

    // Step 7: Summary
    const summary = {
      canAppearInUserManagement: diagnosis.userDocuments.length > 0,
      canAppearInIndividualAnalytics: diagnosis.userDocuments.length > 0 && diagnosis.videoWatchEvents.length > 0,
      hasDataConsistencyIssues: diagnosis.issues.some(issue => 
        ['userId_mismatch', 'email_mismatch', 'duplicate_user_documents'].includes(issue.type)
      ),
      totalIssues: diagnosis.issues.length,
      criticalIssues: diagnosis.issues.filter(issue => issue.severity === 'high').length
    }

    return NextResponse.json({
      success: true,
      diagnosis,
      summary
    })
    
  } catch (error) {
    console.error('Error diagnosing user:', error)
    return NextResponse.json(
      { error: 'Failed to diagnose user', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'User diagnosis API endpoint',
    usage: 'POST with { userEmail: "email@domain.com" }'
  })
}
