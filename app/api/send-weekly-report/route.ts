import { NextResponse } from 'next/server';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';

interface VideoWatchEvent {
  id: string;
  userId: string;
  videoId: string;
  videoTitle?: string;
  watchDuration?: number;
  progressPercentage?: number;
  progress?: number;
  completed?: boolean;
  lastWatchedAt?: { seconds: number };
  watchedAt?: { seconds: number };
  firstWatchedAt?: { seconds: number };
  category?: string;
}

interface UserAnalytics {
  id: string;
  name?: string;
  email: string;
  companyName?: string;
  timeWatched: string;
  timeWatchedSeconds: number;
  videoCount: number;
  completionRate: number;
  lastActive: string;
  viewedVideos: {
    id: string;
    title: string;
    watchTime: string;
    completion: string;
    lastWatched: string;
    category?: string;
  }[];
}

interface CompanyAnalytics {
  name: string;
  userCount: number;
  totalWatchTime: string;
  totalWatchTimeSeconds: number;
  averageCompletionRate: number;
  videoCount: number;
  lastActive: string;
  users: UserAnalytics[];
}

const formatTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
};

const formatDate = (seconds: number): string => {
  if (!seconds) return "Unknown";
  const date = new Date(seconds * 1000);
  return date.toLocaleDateString();
};

const generateCompanyAnalytics = async (companyName: string): Promise<CompanyAnalytics | null> => {
  try {
    // Normalize the company name for case-insensitive comparison
    const normalizedCompanyName = companyName.toLowerCase().trim();
    
    // Fetch all users and filter by normalized company name
    const usersSnapshot = await getDocs(collection(db, "users"));
    
    // Filter users by case-insensitive company name
    const usersData = usersSnapshot.docs
      .map((doc) => ({
        id: doc.id,
        userId: doc.data().userId,
        name: doc.data().name || "Unknown User",
        email: doc.data().email || "Unknown Email",
        companyName: doc.data().companyName,
      }))
      .filter(user => {
        const userCompanyName = user.companyName?.toLowerCase().trim();
        return userCompanyName === normalizedCompanyName;
      });

    if (usersData.length === 0) {
      return null;
    }

    // Create a map of userId to user data
    const userMap = new Map();
    usersData.forEach((user) => {
      userMap.set(user.userId, user);
    });

    // Fetch watch events for the last week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const eventsQuery = query(
      collection(db, "videoWatchEvents"),
      where("lastWatchedAt", ">=", oneWeekAgo),
      orderBy("lastWatchedAt", "desc")
    );
    const eventsSnapshot = await getDocs(eventsQuery);

    if (eventsSnapshot.empty) {
      // Return empty analytics if no events
      return {
        name: companyName,
        userCount: usersData.length,
        totalWatchTime: "0s",
        totalWatchTimeSeconds: 0,
        averageCompletionRate: 0,
        videoCount: 0,
        lastActive: "No activity",
        users: []
      };
    }

    const events = eventsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as VideoWatchEvent[];

    // Process user analytics
    const userAnalyticsMap = new Map<string, UserAnalytics>();
    const userVideoMap = new Map<string, Set<string>>();

    // Collect unique videos watched by each user
    events.forEach((event) => {
      const userId = event.userId;
      const videoId = event.videoId;

      if (!userVideoMap.has(userId)) {
        userVideoMap.set(userId, new Set());
      }
      userVideoMap.get(userId)?.add(videoId);
    });

    // Process each user
    for (const userId of userVideoMap.keys()) {
      const userData = userMap.get(userId);
      if (!userData) continue;

      const userEvents = events.filter((event) => event.userId === userId);
      if (userEvents.length === 0) continue;

      // Find most recent event for last active time
      const mostRecentEvent = userEvents.reduce((latest, current) => {
        const latestTime = latest.lastWatchedAt?.seconds || latest.watchedAt?.seconds || 0;
        const currentTime = current.lastWatchedAt?.seconds || current.watchedAt?.seconds || 0;
        return currentTime > latestTime ? current : latest;
      }, userEvents[0]);

      const lastActiveTimestamp = mostRecentEvent.lastWatchedAt?.seconds || mostRecentEvent.watchedAt?.seconds || 0;

      // Initialize user analytics
      const userAnalytics: UserAnalytics = {
        id: userId,
        name: userData.name,
        email: userData.email,
        companyName: userData.companyName,
        timeWatched: "0s",
        timeWatchedSeconds: 0,
        videoCount: 0,
        completionRate: 0,
        lastActive: formatDate(lastActiveTimestamp),
        viewedVideos: [],
      };

      // Process each unique video
      const uniqueVideos = userVideoMap.get(userId) || new Set();
      let totalWatchTimeSeconds = 0;
      let completedVideosCount = 0;

      for (const videoId of uniqueVideos) {
        const videoEvents = userEvents.filter((event) => event.videoId === videoId);
        if (videoEvents.length === 0) continue;

        // Find most complete event
        const mostCompleteEvent = videoEvents.reduce((best, current) => {
          if (current.completed && !best.completed) return current;
          if (best.completed && !current.completed) return best;

          const bestProgress = best.progressPercentage || best.progress || 0;
          const currentProgress = current.progressPercentage || current.progress || 0;
          if (currentProgress > bestProgress) return current;
          if (bestProgress > currentProgress) return best;

          const bestTime = best.lastWatchedAt?.seconds || best.watchedAt?.seconds || 0;
          const currentTime = current.lastWatchedAt?.seconds || current.watchedAt?.seconds || 0;
          return currentTime > bestTime ? current : best;
        }, videoEvents[0]);

        // Calculate watch time
        const videoWatchTime = videoEvents.reduce((total, event) => {
          return total + (event.watchDuration || 0);
        }, 0);

        totalWatchTimeSeconds += videoWatchTime;

        // Determine completion
        const isCompleted = mostCompleteEvent.completed || 
          (mostCompleteEvent.progressPercentage || mostCompleteEvent.progress || 0) >= 90;

        if (isCompleted) {
          completedVideosCount++;
        }

        const lastWatchedTimestamp = mostCompleteEvent.lastWatchedAt?.seconds || mostCompleteEvent.watchedAt?.seconds || 0;

        userAnalytics.viewedVideos.push({
          id: videoId,
          title: mostCompleteEvent.videoTitle || "Unknown Video",
          watchTime: formatTime(videoWatchTime),
          completion: isCompleted ? "100%" : `${Math.round(mostCompleteEvent.progressPercentage || mostCompleteEvent.progress || 0)}%`,
          lastWatched: formatDate(lastWatchedTimestamp),
          category: mostCompleteEvent.category || "Uncategorized",
        });
      }

      // Update user analytics
      userAnalytics.videoCount = userAnalytics.viewedVideos.length;
      userAnalytics.timeWatchedSeconds = totalWatchTimeSeconds;
      userAnalytics.timeWatched = formatTime(totalWatchTimeSeconds);
      userAnalytics.completionRate = userAnalytics.viewedVideos.length > 0 
        ? completedVideosCount / userAnalytics.viewedVideos.length 
        : 0;

      userAnalyticsMap.set(userId, userAnalytics);
    }

    // Create company analytics
    const userAnalyticsArray = Array.from(userAnalyticsMap.values());
    const totalWatchTimeSeconds = userAnalyticsArray.reduce((sum, user) => sum + user.timeWatchedSeconds, 0);
    const averageCompletionRate = userAnalyticsArray.length > 0 
      ? userAnalyticsArray.reduce((sum, user) => sum + user.completionRate, 0) / userAnalyticsArray.length 
      : 0;

    // Count unique videos
    const companyVideos = new Set<string>();
    userAnalyticsArray.forEach((user) => {
      user.viewedVideos.forEach((video) => {
        companyVideos.add(video.id);
      });
    });

    // Find most recent activity
    const mostRecentUser = userAnalyticsArray.reduce((latest, current) => {
      const latestTime = new Date(latest.lastActive).getTime();
      const currentTime = new Date(current.lastActive).getTime();
      return currentTime > latestTime ? current : latest;
    }, userAnalyticsArray[0]);

    return {
      name: companyName,
      userCount: userAnalyticsArray.length,
      totalWatchTime: formatTime(totalWatchTimeSeconds),
      totalWatchTimeSeconds,
      averageCompletionRate,
      videoCount: companyVideos.size,
      lastActive: mostRecentUser?.lastActive || "No activity",
      users: userAnalyticsArray.sort((a, b) => b.timeWatchedSeconds - a.timeWatchedSeconds),
    };
  } catch (error) {
    console.error("Error generating company analytics:", error);
    return null;
  }
};

const generateEmailHTML = (companyAnalytics: CompanyAnalytics, adminName: string): string => {
  const currentDate = new Date().toLocaleDateString();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekStartStr = weekStart.toLocaleDateString();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Weekly Analytics Report - ${companyAnalytics.name}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #667eea; }
        .stat-number { font-size: 2em; font-weight: bold; color: #667eea; }
        .stat-label { color: #666; margin-top: 5px; }
        .section { margin-bottom: 30px; }
        .section-title { font-size: 1.5em; color: #333; margin-bottom: 15px; border-bottom: 2px solid #667eea; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .user-row:hover { background-color: #f5f5f5; }
        .completion-high { color: #28a745; }
        .completion-medium { color: #ffc107; }
        .completion-low { color: #dc3545; }
        .footer { margin-top: 40px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; text-align: center; color: #666; }
        .highlight { background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 Weekly Analytics Report</h1>
        <p><strong>${companyAnalytics.name}</strong></p>
        <p>Report Period: ${weekStartStr} - ${currentDate}</p>
        <p>Generated for: ${adminName}</p>
      </div>

      <div class="highlight">
        <strong>📈 Summary:</strong> This week, ${companyAnalytics.userCount} users from ${companyAnalytics.name} watched ${companyAnalytics.videoCount} unique videos for a total of ${companyAnalytics.totalWatchTime}.
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">${companyAnalytics.userCount}</div>
          <div class="stat-label">Active Users</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${companyAnalytics.totalWatchTime}</div>
          <div class="stat-label">Total Watch Time</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${companyAnalytics.videoCount}</div>
          <div class="stat-label">Videos Watched</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${(companyAnalytics.averageCompletionRate * 100).toFixed(0)}%</div>
          <div class="stat-label">Avg. Completion Rate</div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">👥 User Activity Details</h2>
        ${companyAnalytics.users.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Videos Watched</th>
                <th>Watch Time</th>
                <th>Completion Rate</th>
                <th>Last Active</th>
              </tr>
            </thead>
            <tbody>
              ${companyAnalytics.users.map(user => `
                <tr class="user-row">
                  <td>
                    <strong>${user.name || 'Unknown User'}</strong><br>
                    <small>${user.email}</small>
                  </td>
                  <td>${user.videoCount}</td>
                  <td>${user.timeWatched}</td>
                  <td class="completion-${user.completionRate >= 0.7 ? 'high' : user.completionRate >= 0.4 ? 'medium' : 'low'}">
                    ${(user.completionRate * 100).toFixed(0)}%
                  </td>
                  <td>${user.lastActive}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p>No user activity recorded this week.</p>'}
      </div>

      <div class="section">
        <h2 class="section-title">🎯 Top Performers</h2>
        ${companyAnalytics.users.length > 0 ? `
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">${companyAnalytics.users[0]?.name || 'N/A'}</div>
              <div class="stat-label">Most Active User</div>
              <small>${companyAnalytics.users[0]?.timeWatched || '0s'} watched</small>
            </div>
            <div class="stat-card">
              <div class="stat-number">${companyAnalytics.users.find(u => u.completionRate === Math.max(...companyAnalytics.users.map(u => u.completionRate)))?.name || 'N/A'}</div>
              <div class="stat-label">Highest Completion Rate</div>
              <small>${(Math.max(...companyAnalytics.users.map(u => u.completionRate)) * 100).toFixed(0)}%</small>
            </div>
          </div>
        ` : '<p>No data available for top performers.</p>'}
      </div>

      <div class="footer">
        <p>This report was automatically generated by the Video Analytics Platform.</p>
        <p>For questions or support, please contact your system administrator.</p>
        <p><small>Report generated on ${currentDate}</small></p>
      </div>
    </body>
    </html>
  `;
};

export async function POST(req: Request) {
  try {
    const { companyName, adminEmail, adminName, isTest = false } = await req.json();

    console.log('Weekly report request:', { companyName, adminEmail, adminName, isTest });

    if (!companyName || !adminEmail || !adminName) {
      console.error('Missing required fields:', { companyName, adminEmail, adminName });
      return NextResponse.json(
        { error: 'Missing required fields: companyName, adminEmail, or adminName' },
        { status: 400 }
      );
    }

    // Generate company analytics
    console.log('Generating analytics for company:', companyName);
    const companyAnalytics = await generateCompanyAnalytics(companyName);
    
    if (!companyAnalytics) {
      console.log('No analytics data found for company:', companyName);
      // Instead of returning an error, create a basic report with no data
      const emptyAnalytics: CompanyAnalytics = {
        name: companyName,
        userCount: 0,
        totalWatchTime: "0s",
        totalWatchTimeSeconds: 0,
        averageCompletionRate: 0,
        videoCount: 0,
        lastActive: "No activity",
        users: []
      };
      
      // Generate email HTML for empty analytics
      const emailHTML = generateEmailHTML(emptyAnalytics, adminName);
      
      // Determine subject line
      const subject = isTest 
        ? `[TEST] Weekly Analytics Report - ${companyName}`
        : `Weekly Analytics Report - ${companyName}`;

      console.log('Sending email with empty analytics to:', adminEmail);

      // Send email using existing email API
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: adminEmail,
          subject,
          html: emailHTML,
        }),
      });

      if (!emailResponse.ok) {
        const error = await emailResponse.json();
        console.error('Email API error:', error);
        return NextResponse.json(
          { error: `Failed to send email: ${error.error}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: isTest ? 'Test email sent successfully (no data available)' : 'Weekly report sent successfully (no data available)',
        analytics: {
          userCount: 0,
          totalWatchTime: "0s",
          videoCount: 0,
          averageCompletionRate: 0,
        }
      });
    }

    // Generate email HTML
    const emailHTML = generateEmailHTML(companyAnalytics, adminName);
    
    // Determine subject line
    const subject = isTest 
      ? `[TEST] Weekly Analytics Report - ${companyName}`
      : `Weekly Analytics Report - ${companyName}`;

    console.log('Sending email with analytics to:', adminEmail, 'Subject:', subject);

    // Send email using existing email API
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: adminEmail,
        subject,
        html: emailHTML,
      }),
    });

    console.log('Email API response status:', emailResponse.status);

    if (!emailResponse.ok) {
      const error = await emailResponse.json();
      console.error('Email API error:', error);
      return NextResponse.json(
        { error: `Failed to send email: ${error.error}` },
        { status: 500 }
      );
    }

    const emailResult = await emailResponse.json();
    console.log('Email sent successfully:', emailResult);

    return NextResponse.json({
      success: true,
      message: isTest ? 'Test email sent successfully' : 'Weekly report sent successfully',
      analytics: {
        userCount: companyAnalytics.userCount,
        totalWatchTime: companyAnalytics.totalWatchTime,
        videoCount: companyAnalytics.videoCount,
        averageCompletionRate: companyAnalytics.averageCompletionRate,
      }
    });

  } catch (error: any) {
    console.error('Error sending weekly report:', error);
    return NextResponse.json(
      { error: `Failed to send weekly report: ${error.message}` },
      { status: 500 }
    );
  }
} 