import { NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';

interface CompanyAdmin {
  id: string;
  companyName: string;
  adminEmail: string;
  adminName: string;
  isActive: boolean;
}

export async function GET() {
  try {
    console.log('Testing weekly reports system...');
    
    // Check if we can connect to Firestore
    const adminsSnapshot = await getDocs(collection(db, "companyAdmins"));
    const admins = adminsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as CompanyAdmin))
      .filter(admin => admin.isActive);

    // Check environment variables
    const envCheck = {
      hasEmailUser: !!process.env.EMAIL_USER,
      hasEmailPass: !!process.env.EMAIL_PASS,
      hasEmailAppPass: !!process.env.EMAIL_APP_PASSWORD,
      hasWeeklySecret: !!process.env.WEEKLY_REPORT_SECRET,
      hasBaseUrl: !!process.env.NEXT_PUBLIC_BASE_URL,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    };

    return NextResponse.json({
      success: true,
      message: 'Weekly reports system test completed',
      adminsFound: admins.length,
      environmentVariables: envCheck,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error testing weekly reports system:', error);
    return NextResponse.json(
      { 
        success: false,
        error: `Test failed: ${error.message}`,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 