// Service to automatically send feedback emails when new feedback is received

export interface FeedbackEmailData {
  userEmail: string;
  feedback: string;
  type: 'video_completion' | 'playlist_creation' | 'video_specific';
  videoTitle?: string;
  rating?: number;
  companyName?: string;
  createdAt: any;
}

export async function sendFeedbackEmail(feedbackData: FeedbackEmailData): Promise<boolean> {
  try {
    const response = await fetch('/api/send-feedback-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ feedbackData }),
    });

    if (!response.ok) {
      // try to read JSON, fall back to text for clearer diagnostics
      let details: any = null;
      try {
        details = await response.json();
      } catch (e) {
        try {
          const text = await response.text();
          details = { message: text || response.statusText };
        } catch (_) {
          details = { message: 'No error body returned' };
        }
      }
      console.error('Failed to send feedback email:', details);
      return false;
    }

    const result = await response.json();
    console.log('Feedback email sent successfully:', result);
    return true;
  } catch (error) {
    console.error('Error sending feedback email:', error);
    return false;
  }
}

// Function to format feedback data for email
export function formatFeedbackForEmail(feedback: any): FeedbackEmailData {
  return {
    userEmail: feedback.userEmail || 'Unknown User',
    feedback: feedback.feedback || feedback.recommendation || 'No feedback provided',
    type: feedback.type || 'video_completion',
    videoTitle: feedback.videoTitle,
    rating: feedback.rating,
    companyName: feedback.companyName || 'Unknown Company',
    createdAt: feedback.createdAt
  };
}


