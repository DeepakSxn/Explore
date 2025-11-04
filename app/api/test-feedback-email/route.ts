import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🧪 Testing feedback email...');
    
    const testFeedbackData = {
      userEmail: 'test@example.com',
      feedback: 'This is a test feedback message',
      type: 'video_completion' as const,
      companyName: 'Test Company',
      createdAt: { seconds: Math.floor(Date.now() / 1000) }
    };

    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/send-feedback-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ feedbackData: testFeedbackData }),
    });

    const result = await response.json();
    
    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully!',
        result
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to send test email',
        error: result
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Test failed:', error);
    return NextResponse.json({
      success: false,
      message: 'Test error',
      error: error.message
    }, { status: 500 });
  }
}

