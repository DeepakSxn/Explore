import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Simple health check endpoint
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Server is running'
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

