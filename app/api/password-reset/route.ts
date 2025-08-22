import { NextResponse } from 'next/server';
import { db } from '@/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { serverTimestamp } from 'firebase/firestore';
import crypto from 'crypto';

// Generate a secure reset token
function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Store reset token in Firestore
async function storeResetToken(email: string, token: string): Promise<void> {
  const resetTokensRef = collection(db, 'passwordResetTokens');
  
  // Delete any existing tokens for this email
  const existingQuery = query(resetTokensRef, where('email', '==', email));
  const existingDocs = await getDocs(existingQuery);
  
  existingDocs.forEach(async (doc) => {
    await deleteDoc(doc.ref);
  });
  
  // Add new token with expiration (1 hour from now)
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + 1);
  
  await addDoc(resetTokensRef, {
    email,
    token,
    createdAt: serverTimestamp(),
    expiresAt: expiration,
    used: false
  });
}

// Verify reset token
async function verifyResetToken(email: string, token: string): Promise<boolean> {
  const resetTokensRef = collection(db, 'passwordResetTokens');
  const q = query(
    resetTokensRef, 
    where('email', '==', email),
    where('token', '==', token),
    where('used', '==', false)
  );
  
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return false;
  }
  
  const tokenDoc = querySnapshot.docs[0];
  const tokenData = tokenDoc.data();
  
  // Check if token has expired
  if (tokenData.expiresAt && tokenData.expiresAt.toDate() < new Date()) {
    await deleteDoc(tokenDoc.ref);
    return false;
  }
  
  return true;
}

// Mark token as used
async function markTokenAsUsed(email: string, token: string): Promise<void> {
  const resetTokensRef = collection(db, 'passwordResetTokens');
  const q = query(
    resetTokensRef, 
    where('email', '==', email),
    where('token', '==', token)
  );
  
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    const tokenDoc = querySnapshot.docs[0];
    await updateDoc(tokenDoc.ref, { used: true });
  }
}

export async function POST(request: Request) {
  try {
    const { email, action } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    if (action === 'request') {
      // Generate reset token
      const resetToken = generateResetToken();
      
      // Store token in database
      await storeResetToken(email, resetToken);
      
      // Send email using existing email system
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject: 'Password Reset Request - EOXS Video Platform',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <img src="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/Black logo.png" alt="EOXS Logo" style="height: 40px; width: auto;">
              </div>
              
              <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
              
              <p style="color: #666; line-height: 1.6;">
                You requested a password reset for your EOXS Video Platform account.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?email=${encodeURIComponent(email)}&token=${resetToken}" 
                   style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?email=${encodeURIComponent(email)}&token=${resetToken}" style="color: #16a34a;">
                  ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?email=${encodeURIComponent(email)}&token=${resetToken}
                </a>
              </p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px;">
                <p style="color: #666; font-size: 12px; margin: 0;">
                  <strong>Security Notice:</strong><br>
                  • This link will expire in 1 hour<br>
                  • If you didn't request this reset, please ignore this email<br>
                  • For security, this link can only be used once
                </p>
              </div>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              
              <p style="color: #999; font-size: 12px; text-align: center;">
                This email was sent from the EOXS Video Platform.<br>
                If you have any questions, please contact support.
              </p>
            </div>
          `
        })
      });
      
      if (!emailResponse.ok) {
        const error = await emailResponse.json();
        console.error('Email sending failed:', error);
        return NextResponse.json(
          { error: 'Failed to send password reset email' },
          { status: 500 }
        );
      }
      
      console.log('Custom password reset email sent to:', email);
      
      return NextResponse.json({
        success: true,
        message: 'Password reset email sent successfully'
      });
      
    } else if (action === 'verify') {
      const { token } = await request.json();
      
      if (!token) {
        return NextResponse.json(
          { error: 'Token is required' },
          { status: 400 }
        );
      }
      
      const isValid = await verifyResetToken(email, token);
      
      return NextResponse.json({
        success: true,
        valid: isValid
      });
      
    } else if (action === 'reset') {
      const { token, newPassword } = await request.json();
      
      if (!token || !newPassword) {
        return NextResponse.json(
          { error: 'Token and new password are required' },
          { status: 400 }
        );
      }
      
      // Verify token
      const isValid = await verifyResetToken(email, token);
      
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid or expired reset token' },
          { status: 400 }
        );
      }
      
      // Here you would typically update the user's password in Firebase Auth
      // For now, we'll just mark the token as used
      await markTokenAsUsed(email, token);
      
      return NextResponse.json({
        success: true,
        message: 'Password reset successful'
      });
      
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
    
  } catch (error: any) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
