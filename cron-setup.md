# Weekly Analytics Reports - Setup Guide

## Overview
This system automatically sends weekly analytics reports to company admins every week. Here's how to set it up:

## 1. Environment Variables
Add these to your `.env.local` file:

```bash
# Email Configuration (already set up)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Weekly Report Secret (for security)
WEEKLY_REPORT_SECRET=your-secret-key-here

# Base URL for API calls
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

## 2. Setting Up Automated Weekly Reports

### Option A: Using Cron Job (Linux/Mac)
Add this to your crontab (`crontab -e`):

```bash
# Send weekly reports every Monday at 9:00 AM
0 9 * * 1 curl -X POST https://your-domain.com/api/send-all-weekly-reports \
  -H "Content-Type: application/json" \
  -d '{"secret":"your-secret-key-here"}'
```

### Option B: Using Vercel Cron Jobs
Add this to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/send-all-weekly-reports",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

### Option C: Using External Services
- **GitHub Actions**: Create a workflow that runs weekly
- **AWS Lambda**: Set up a scheduled function
- **Google Cloud Functions**: Use Cloud Scheduler
- **Heroku Scheduler**: Add-on for Heroku apps

## 3. Manual Testing

### Test Individual Company Report
```bash
curl -X POST https://your-domain.com/api/send-weekly-report \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Your Company Name",
    "adminEmail": "admin@company.com",
    "adminName": "Admin Name",
    "isTest": true
  }'
```

### Test All Weekly Reports
```bash
curl -X POST https://your-domain.com/api/send-all-weekly-reports \
  -H "Content-Type: application/json" \
  -d '{"secret":"your-secret-key-here"}'
```

## 4. Admin Dashboard Features

### Company Admins Page (`/admin-dashboard/company-admins`)
- **Add Company Admin**: Select company, enter admin name and email
- **View All Admins**: See all company admins with their status
- **Send Test Email**: Test the email system for any admin
- **Remove Admin**: Delete admin access
- **Statistics**: View total companies, active admins, and users

### Features:
- ✅ Automatic weekly email reports
- ✅ Beautiful HTML email templates
- ✅ Company-specific analytics
- ✅ User activity details
- ✅ Top performers highlighting
- ✅ Test email functionality
- ✅ Admin management interface

## 5. Email Report Content

Each weekly report includes:
- **Company Summary**: Total users, watch time, videos watched
- **User Activity**: Individual user performance
- **Top Performers**: Most active users and highest completion rates
- **Visual Charts**: Easy-to-read statistics
- **Professional Design**: Branded email template

## 6. Security Notes

- The `WEEKLY_REPORT_SECRET` prevents unauthorized access to the API
- Only active admins receive reports
- Test emails are clearly marked as tests
- Email addresses are validated before sending

## 7. Troubleshooting

### Common Issues:
1. **Emails not sending**: Check email credentials in environment variables
2. **No data in reports**: Ensure users have watched videos in the last week
3. **Cron not working**: Verify the cron syntax and server timezone
4. **API errors**: Check server logs for detailed error messages

### Debug Commands:
```bash
# Check if email API is working
curl -X POST https://your-domain.com/api/send-email \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","html":"<p>Test</p>"}'

# Check weekly report API
curl -X POST https://your-domain.com/api/send-weekly-report \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Test Company","adminEmail":"test@example.com","adminName":"Test Admin","isTest":true}'
```

## 8. Customization

### Modify Email Template
Edit the `generateEmailHTML` function in `/api/send-weekly-report/route.ts`

### Change Report Frequency
Update the cron schedule (e.g., daily: `0 9 * * *`, monthly: `0 9 1 * *`)

### Add More Analytics
Extend the `generateCompanyAnalytics` function to include additional metrics

## 9. Monitoring

### Logs to Monitor:
- Email sending success/failure
- Report generation errors
- API response times
- User activity data availability

### Recommended Alerts:
- Failed email sends
- Empty reports (no user activity)
- API errors
- Cron job failures

---

**Need Help?** Check the server logs or contact your system administrator for assistance with setup and troubleshooting. 