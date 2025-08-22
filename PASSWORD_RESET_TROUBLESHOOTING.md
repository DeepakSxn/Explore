# Password Reset Email Troubleshooting Guide

## 🚨 **Issue**: Password reset emails are not being received

### **Current Status**
- ✅ "Send Reset Link" button works
- ✅ Success message appears
- ❌ No email received in inbox

## 🔍 **Root Cause Analysis**

The issue is likely related to Firebase Authentication configuration. Here are the most common causes:

### **1. Firebase Authentication Settings**
Firebase needs proper configuration for password reset emails to work:

#### **Required Firebase Console Settings:**
1. **Go to Firebase Console** → Your Project → Authentication
2. **Settings** → **Authorized domains**
3. **Add your domain** (e.g., `localhost`, `yourdomain.com`)
4. **Templates** → **Password reset** → Configure email template

#### **Action URL Configuration:**
The action URL tells Firebase where to redirect users after clicking the reset link.

### **2. Email Delivery Issues**
- **Spam/Junk folder**: Check spam folder
- **Email provider blocking**: Some providers block Firebase emails
- **Domain verification**: Domain not verified in Firebase

### **3. Firebase Project Configuration**
- **Authentication enabled**: Ensure Email/Password auth is enabled
- **API key restrictions**: Check if API key has restrictions
- **Project settings**: Verify project is properly configured

## 🛠️ **Solutions**

### **Solution 1: Configure Firebase Authentication (Recommended)**

1. **Go to Firebase Console**
   - Navigate to: https://console.firebase.google.com/
   - Select your project: `demoauth-82b79`

2. **Configure Authorized Domains**
   - Go to: Authentication → Settings → Authorized domains
   - Add these domains:
     ```
     localhost
     yourdomain.com (if deployed)
     ```

3. **Configure Email Templates**
   - Go to: Authentication → Templates → Password reset
   - Customize the email template if needed
   - Ensure the action URL is correct

4. **Test the Configuration**
   - Use the debug section in the forgot password page
   - Check browser console for any errors

### **Solution 2: Check Email Provider Settings**

1. **Gmail Users**:
   - Check spam/junk folder
   - Add `noreply@demoauth-82b79.firebaseapp.com` to contacts
   - Check Gmail filters

2. **Other Email Providers**:
   - Check spam/junk folder
   - Whitelist Firebase domains
   - Check email provider's security settings

### **Solution 3: Alternative Implementation**

If Firebase password reset continues to fail, we can implement a custom solution:

```typescript
// Custom password reset using existing email system
const sendCustomPasswordReset = async (email: string) => {
  // Generate reset token
  const resetToken = generateResetToken()
  
  // Store in database with expiration
  await storeResetToken(email, resetToken, expiration)
  
  // Send email using existing email system
  await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div>
          <h2>Password Reset Request</h2>
          <p>Click the link below to reset your password:</p>
          <a href="${window.location.origin}/reset-password?token=${resetToken}">
            Reset Password
          </a>
        </div>
      `
    })
  })
}
```

## 🔧 **Debugging Steps**

### **Step 1: Check Browser Console**
1. Open browser developer tools (F12)
2. Go to Console tab
3. Try password reset
4. Look for any error messages

### **Step 2: Check Network Tab**
1. Open Network tab in developer tools
2. Try password reset
3. Look for failed requests
4. Check response status codes

### **Step 3: Use Debug Section**
1. Click "Show Debug Info" on forgot password page
2. Verify all URLs are correct
3. Check Firebase configuration

### **Step 4: Test Firebase Configuration**
```javascript
// Add this to test Firebase connection
import { getAuth, connectAuthEmulator } from "firebase/auth"

const auth = getAuth()
console.log("Firebase Auth initialized:", auth)
console.log("Current user:", auth.currentUser)
```

## 📋 **Checklist**

- [ ] Firebase Authentication enabled
- [ ] Authorized domains configured
- [ ] Email templates configured
- [ ] Action URL set correctly
- [ ] Checked spam/junk folder
- [ ] Verified email address
- [ ] No API key restrictions
- [ ] Network connectivity
- [ ] Browser console errors
- [ ] Firebase project settings

## 🚀 **Quick Fixes to Try**

### **Fix 1: Clear Browser Cache**
```bash
# Clear browser cache and cookies
# Try password reset again
```

### **Fix 2: Try Different Browser**
```bash
# Test in incognito/private mode
# Try different browser (Chrome, Firefox, Safari)
```

### **Fix 3: Check Environment Variables**
```bash
# Verify Firebase config in firebase.tsx
# Check if all required variables are set
```

### **Fix 4: Test with Different Email**
```bash
# Try with a different email address
# Test with Gmail, Outlook, etc.
```

## 📞 **Support**

If the issue persists:

1. **Check Firebase Console logs**
2. **Review browser console errors**
3. **Test with different email providers**
4. **Contact Firebase support if needed**

## 🔄 **Alternative Solutions**

### **Option 1: Custom Email System**
Use the existing email API (`/api/send-email`) for password resets

### **Option 2: Admin Password Reset**
Implement admin-triggered password resets

### **Option 3: SMS Verification**
Add SMS-based password reset as backup

---

**Last Updated**: Current Date
**Status**: Under Investigation
**Priority**: High
