# Automatic Weekly Reports Setup Guide

## 🎯 **Overview**
This system automatically sends weekly analytics reports to all company admins every Monday at 9:00 AM.

## 🚀 **Option 1: Vercel Cron Jobs (Recommended)**

### **Step 1: Deploy to Vercel**
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy your application

### **Step 2: Set Environment Variables in Vercel**
In your Vercel dashboard, add these environment variables:
```bash
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password
EMAIL_APP_PASSWORD=your-app-password
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
WEEKLY_REPORT_SECRET=your-secret-key-here
```

### **Step 3: Verify Cron Job**
The `vercel.json` file is already configured:
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

**Schedule Explanation:**
- `0 9 * * 1` = Every Monday at 9:00 AM
- `0 9 * * *` = Every day at 9:00 AM
- `0 9 1 * *` = First day of every month at 9:00 AM

## 🔧 **Option 2: Manual Cron Job (Linux/Mac)**

### **Step 1: Create a Script**
Create a file called `send-weekly-reports.sh`:
```bash
#!/bin/bash
curl -X POST https://your-domain.com/api/send-all-weekly-reports \
  -H "Content-Type: application/json" \
  -d '{"secret":"your-secret-key-here"}'
```

### **Step 2: Make it Executable**
```bash
chmod +x send-weekly-reports.sh
```

### **Step 3: Add to Crontab**
```bash
crontab -e
```

Add this line:
```bash
# Send weekly reports every Monday at 9:00 AM
0 9 * * 1 /path/to/your/send-weekly-reports.sh
```

## 🌐 **Option 3: External Services**

### **GitHub Actions**
Create `.github/workflows/weekly-reports.yml`:
```yaml
name: Weekly Reports
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9:00 AM UTC

jobs:
  send-reports:
    runs-on: ubuntu-latest
    steps:
      - name: Send Weekly Reports
        run: |
          curl -X POST https://your-domain.com/api/send-all-weekly-reports \
            -H "Content-Type: application/json" \
            -d '{"secret":"${{ secrets.WEEKLY_REPORT_SECRET }}"}'
```

### **AWS Lambda + EventBridge**
1. Create Lambda function to call your API
2. Set up EventBridge rule for weekly schedule
3. Configure environment variables

### **Google Cloud Functions + Cloud Scheduler**
1. Deploy function to call your API
2. Set up Cloud Scheduler job
3. Configure authentication

## 🧪 **Testing the System**

### **Manual Testing**
1. Go to `/admin-dashboard/company-admins`
2. Click **"Send Weekly Reports to All"**
3. Check console logs for results
4. Verify emails are received

### **API Testing**
```bash
# Test the API directly
curl -X POST https://your-domain.com/api/send-all-weekly-reports \
  -H "Content-Type: application/json" \
  -d '{"secret":"your-secret-key-here"}'

# Check API status
curl https://your-domain.com/api/send-all-weekly-reports
```

## 📊 **Monitoring & Logs**

### **Vercel Logs**
1. Go to Vercel dashboard
2. Select your project
3. Go to "Functions" tab
4. Check logs for `/api/send-all-weekly-reports`

### **Email Delivery Monitoring**
- Check email inboxes (and spam folders)
- Monitor email service logs
- Set up email delivery tracking

## ⚙️ **Configuration Options**

### **Change Schedule**
Edit `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/send-all-weekly-reports",
      "schedule": "0 9 * * 1"  // Change this
    }
  ]
}
```

### **Common Schedules:**
- `0 9 * * 1` - Every Monday at 9:00 AM
- `0 9 * * 0` - Every Sunday at 9:00 AM
- `0 9 1 * *` - First day of month at 9:00 AM
- `0 9 * * *` - Every day at 9:00 AM
- `0 */6 * * *` - Every 6 hours

### **Environment Variables**
```bash
# Required
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password
WEEKLY_REPORT_SECRET=your-secret-key

# Optional
NEXT_PUBLIC_BASE_URL=https://your-domain.com
EMAIL_APP_PASSWORD=your-app-password
```

## 🔒 **Security Considerations**

### **Secret Management**
- Use strong, unique secrets
- Store secrets in environment variables
- Never commit secrets to code
- Rotate secrets regularly

### **Access Control**
- Only admins can trigger manual reports
- Cron jobs use special authentication
- API logs all activities

## 🚨 **Troubleshooting**

### **Common Issues:**

1. **Emails Not Sending**
   - Check email configuration
   - Verify app password
   - Check spam folders

2. **Cron Job Not Running**
   - Check Vercel logs
   - Verify timezone settings
   - Test API manually

3. **No Company Data**
   - Ensure users exist in database
   - Check company name formatting
   - Verify admin accounts are active

### **Debug Commands:**
```bash
# Check email config
curl https://your-domain.com/api/check-email-config

# Test single report
curl -X POST https://your-domain.com/api/send-weekly-report \
  -H "Content-Type: application/json" \
  -d '{"companyName":"EOXS","adminEmail":"test@example.com","adminName":"Test Admin","isTest":true}'

# Check API status
curl https://your-domain.com/api/send-all-weekly-reports
```

## 📈 **Success Metrics**

### **Monitor These:**
- Number of reports sent successfully
- Email delivery rates
- API response times
- Error rates and types
- Admin engagement with reports

### **Set Up Alerts For:**
- Failed email sends
- API errors
- Cron job failures
- Empty reports (no user activity)

---

## ✅ **Setup Checklist**

- [ ] Deploy to Vercel (or other platform)
- [ ] Set environment variables
- [ ] Add company admins through dashboard
- [ ] Test email configuration
- [ ] Test manual report sending
- [ ] Verify cron job is working
- [ ] Monitor first automatic report
- [ ] Set up monitoring and alerts

**Need Help?** Check the logs and console output for detailed error messages. 