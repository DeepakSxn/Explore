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

export async function POST(req: Request) {
  try {
    // Check if this is a cron job request or manual request
    const userAgent = req.headers.get('user-agent') || '';
    const isCronJob = userAgent.includes('Vercel') || userAgent.includes('cron');
    
    console.log('Weekly reports API called:', { 
      isCronJob, 
      userAgent: userAgent.substring(0, 100),
      timestamp: new Date().toISOString() 
    });

    // For cron jobs, skip secret check; for manual requests, require secret
    if (!isCronJob) {
      try {
        const body = await req.json();
        const { secret } = body;
        
        console.log('Manual request - checking secret...');
        
        if (!secret) {
          console.error('No secret provided in manual request');
          return NextResponse.json(
            { error: 'Secret is required for manual requests' },
            { status: 400 }
          );
        }
        
        if (secret !== process.env.WEEKLY_REPORT_SECRET) {
          console.error('Invalid secret provided:', { 
            provided: secret.substring(0, 10) + '...',
            expected: process.env.WEEKLY_REPORT_SECRET ? 'set' : 'not set'
          });
          return NextResponse.json(
            { error: 'Invalid secret provided' },
            { status: 401 }
          );
        }
        
        console.log('Secret validation passed');
      } catch (parseError) {
        console.error('Failed to parse request body:', parseError);
        return NextResponse.json(
          { error: 'Invalid request body - JSON expected' },
          { status: 400 }
        );
      }
    }

    console.log('Starting weekly report generation...', { isCronJob, timestamp: new Date().toISOString() });

    // Fetch all active company admins
    const adminsSnapshot = await getDocs(collection(db, "companyAdmins"));
    const admins = adminsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as CompanyAdmin))
      .filter(admin => admin.isActive);

    console.log(`Found ${admins.length} active company admins`);

    if (admins.length === 0) {
      console.log('No active company admins found');
      return NextResponse.json({
        success: true,
        message: 'No active company admins found',
        reportsSent: 0,
        timestamp: new Date().toISOString()
      });
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Send reports to each admin
    for (const admin of admins) {
      try {
        console.log(`Sending report to ${admin.adminEmail} for company ${admin.companyName}`);
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/send-weekly-report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyName: admin.companyName,
            adminEmail: admin.adminEmail,
            adminName: admin.adminName,
            isTest: false
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`Successfully sent report to ${admin.adminEmail}`);
          results.push({
            company: admin.companyName,
            admin: admin.adminEmail,
            status: 'success',
            analytics: result.analytics
          });
          successCount++;
        } else {
          const error = await response.json();
          console.error(`Failed to send report to ${admin.adminEmail}:`, error);
          results.push({
            company: admin.companyName,
            admin: admin.adminEmail,
            status: 'error',
            error: error.error
          });
          errorCount++;
        }
      } catch (error: any) {
        console.error(`Error sending report to ${admin.adminEmail}:`, error);
        results.push({
          company: admin.companyName,
          admin: admin.adminEmail,
          status: 'error',
          error: error.message
        });
        errorCount++;
      }
    }

    const summary = {
      success: true,
      message: `Weekly reports sent to ${successCount} admins, ${errorCount} failed`,
      reportsSent: successCount,
      reportsFailed: errorCount,
      results,
      timestamp: new Date().toISOString()
    };

    console.log('Weekly report generation completed:', summary);
    return NextResponse.json(summary);

  } catch (error: any) {
    console.error('Error sending all weekly reports:', error);
    return NextResponse.json(
      { 
        error: `Failed to send weekly reports: ${error.message}`,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Also support GET requests for testing
export async function GET() {
  return NextResponse.json({
    message: 'Weekly reports API is running',
    instructions: 'Use POST with secret for manual triggering, or set up cron job for automatic weekly sending',
    timestamp: new Date().toISOString()
  });
} 