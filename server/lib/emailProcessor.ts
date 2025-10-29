import { Resend } from 'resend';
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const FROM_EMAIL = process.env.FROM_EMAIL || 'Electra <onboarding@resend.dev>';

// Lazy initialization - only create Resend instance when needed
let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function processEmailQueue() {
  const resendClient = getResendClient();
  
  // Skip if Resend is not configured
  if (!resendClient) {
    return;
  }

  try {
    // Get pending emails
    const { data: pendingEmails, error } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      console.error('❌ Error fetching pending emails:', error.message);
      return;
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return; // No emails to process
    }

    console.log(`📧 Processing ${pendingEmails.length} pending emails...`);

    for (const email of pendingEmails) {
      try {
        // Send email using Resend
        const { data: sentEmail, error: sendError } = await resendClient.emails.send({
          from: FROM_EMAIL,
          to: email.to_email,
          subject: email.subject,
          html: email.body_html,
        });

        if (sendError) {
          throw sendError;
        }

        // Mark as sent
        await supabase
          .from('email_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', email.id);

        console.log(`✅ Email sent to ${email.to_email} (ID: ${sentEmail?.id})`);
        
      } catch (err: any) {
        console.error(`❌ Failed to send email ${email.id}:`, err.message);
        
        // Mark as failed
        await supabase
          .from('email_queue')
          .update({
            status: 'failed',
            error_message: err.message
          })
          .eq('id', email.id);
      }
    }
    
  } catch (error: any) {
    console.error('❌ Email queue processing error:', error.message);
  }
}

// Process emails every 30 seconds
export function startEmailProcessor() {
  // Check if Resend API key is configured
  if (!process.env.RESEND_API_KEY) {
    console.log('⚠️ RESEND_API_KEY not configured. Email sending is disabled.');
    console.log('   To enable email sending:');
    console.log('   1. Sign up at https://resend.com (free tier: 100 emails/day)');
    console.log('   2. Get your API key');
    console.log('   3. Add RESEND_API_KEY to server/.env');
    console.log('   4. Optionally add FROM_EMAIL (e.g., "Electra <hello@yourdomain.com>")');
    return;
  }

  console.log('📧 Email processor started');
  
  // Process immediately on start
  processEmailQueue();
  
  // Then process every 30 seconds
  setInterval(processEmailQueue, 30000);
}
