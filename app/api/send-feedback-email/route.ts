import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Force Node.js runtime so SMTP works on Vercel/Next
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  // With hardcoded credentials this is just a health check
  return new Response(
    JSON.stringify({ ok: true, runtime: 'nodejs', creds: 'hardcoded' }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  )
}

export async function POST(req: Request) {
  try {
    const { feedbackData } = await req.json();
    if (!feedbackData) {
      return NextResponse.json({ error: 'Missing feedback data' }, { status: 400 });
    }

    // Hardcoded Gmail credentials & recipient (per your request)
    const emailUser = 'Eoxsfeedback@gmail.com'
    const emailPass = 'zzmythgqojeoljlz'
    const feedbackEmail = 'sheenam@eoxsteam.com'

    // Simplest possible transport (Gmail SMTP)
    // Build message once
    const { userEmail, feedback, type, videoTitle, rating, companyName } = feedbackData
    const subject =
      type === 'video_specific'
        ? `New Video Review${videoTitle ? ` - ${videoTitle}` : ''}`
        : type === 'playlist_creation'
        ? 'New Playlist Recommendation'
        : 'New Video Completion Feedback'

    const textLines = [
      `From: ${userEmail || 'Unknown User'}`,
      companyName ? `Company: ${companyName}` : undefined,
      videoTitle ? `Video: ${videoTitle}` : undefined,
      rating ? `Rating: ${rating}/5` : undefined,
      '',
      'Feedback:',
      feedback || 'No feedback provided',
    ].filter(Boolean)

    // Strategy 1: simplest Gmail service transporter
    let lastErr: any = null
    try {
      const t1 = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: emailUser, pass: emailPass },
      })
      await t1.sendMail({ from: emailUser, to: feedbackEmail, subject, text: textLines.join('\n') })
      return NextResponse.json({ success: true, method: 'gmail-service' })
    } catch (e: any) {
      lastErr = e
    }

    // Strategy 2: explicit SMTP (gmail) fallback
    try {
      const t2 = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: emailUser, pass: emailPass },
      })
      await t2.sendMail({ from: emailUser, to: feedbackEmail, subject, text: textLines.join('\n') })
      return NextResponse.json({ success: true, method: 'smtp-fallback' })
    } catch (e2: any) {
      return NextResponse.json({
        error: e2?.message || lastErr?.message || 'Email send failed',
      }, { status: 500 })
    }

    // Minimal subject/body based on type
    // unreachable – returns above on success/failure
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Email send failed' }, { status: 500 });
  }
}


