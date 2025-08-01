import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { to } = await req.json();

    if (!to) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    console.log('Testing email to:', to);

    // Send a simple test email
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject: 'Test Email - Video Analytics Platform',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Test Email</h2>
            <p>This is a test email to verify that the email system is working correctly.</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Platform:</strong> Video Analytics Platform</p>
            <hr style="margin: 20px 0;">
            <p style="color: #666; font-size: 14px;">
              If you received this email, the email system is working properly.
            </p>
          </div>
        `,
      }),
    });

    console.log('Email test response status:', emailResponse.status);

    if (!emailResponse.ok) {
      const error = await emailResponse.json();
      console.error('Email test error:', error);
      return NextResponse.json(
        { error: `Failed to send test email: ${error.error}` },
        { status: 500 }
      );
    }

    const result = await emailResponse.json();
    console.log('Email test success:', result);

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: result.messageId
    });

  } catch (error: any) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { error: `Failed to send test email: ${error.message}` },
      { status: 500 }
    );
  }
} 