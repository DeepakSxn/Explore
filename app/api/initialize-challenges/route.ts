import { NextResponse } from 'next/server'
import { initializeDefaultChallenges } from '@/app/firestore-utils'

export async function POST() {
  try {
    await initializeDefaultChallenges()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Default challenges initialized successfully' 
    })
  } catch (error) {
    console.error('Error initializing challenges:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to initialize challenges' 
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    await initializeDefaultChallenges()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Default challenges initialized successfully' 
    })
  } catch (error) {
    console.error('Error initializing challenges:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to initialize challenges' 
      },
      { status: 500 }
    )
  }
} 