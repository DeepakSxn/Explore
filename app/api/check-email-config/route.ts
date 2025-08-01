import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check email environment variables
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const emailAppPass = process.env.EMAIL_APP_PASSWORD;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    const config = {
      hasEmailUser: !!emailUser,
      hasEmailPass: !!emailPass,
      hasEmailAppPass: !!emailAppPass,
      hasBaseUrl: !!baseUrl,
      emailUser: emailUser ? `${emailUser.substring(0, 3)}***@${emailUser.split('@')[1]}` : null,
      baseUrl: baseUrl || 'http://localhost:3000',
      allEnvVars: Object.keys(process.env).filter(key => key.includes('EMAIL'))
    };

    console.log('Email configuration check:', config);

    if (!emailUser) {
      return NextResponse.json({
        status: 'error',
        message: 'EMAIL_USER environment variable is not set',
        config
      }, { status: 500 });
    }

    if (!emailPass && !emailAppPass) {
      return NextResponse.json({
        status: 'error',
        message: 'Neither EMAIL_PASS nor EMAIL_APP_PASSWORD environment variables are set',
        config
      }, { status: 500 });
    }

    return NextResponse.json({
      status: 'success',
      message: 'Email configuration appears to be correct',
      config
    });

  } catch (error: any) {
    console.error('Error checking email configuration:', error);
    return NextResponse.json({
      status: 'error',
      message: `Error checking configuration: ${error.message}`,
      config: null
    }, { status: 500 });
  }
} 