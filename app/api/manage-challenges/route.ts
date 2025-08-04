import { NextResponse } from 'next/server'
import { updateChallengeStatus, deleteChallenge, createChallenge } from '@/app/firestore-utils'

// Create a new challenge
export async function POST(request: Request) {
  try {
    const data = await request.json()
    const challengeId = await createChallenge(data)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Challenge created successfully',
      challengeId
    })
  } catch (error) {
    console.error('Error creating challenge:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create challenge' 
      },
      { status: 500 }
    )
  }
}

// Update a challenge status
export async function PATCH(request: Request) {
  try {
    const data = await request.json()
    const { challengeId, isActive } = data
    
    if (!challengeId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Challenge ID is required' 
        },
        { status: 400 }
      )
    }
    
    await updateChallengeStatus(challengeId, isActive)
    
    return NextResponse.json({ 
      success: true, 
      message: `Challenge ${isActive ? 'activated' : 'deactivated'} successfully` 
    })
  } catch (error) {
    console.error('Error updating challenge status:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update challenge status' 
      },
      { status: 500 }
    )
  }
}

// Delete a challenge
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const challengeId = searchParams.get('challengeId')
    
    if (!challengeId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Challenge ID is required' 
        },
        { status: 400 }
      )
    }
    
    await deleteChallenge(challengeId)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Challenge deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting challenge:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete challenge' 
      },
      { status: 500 }
    )
  }
}