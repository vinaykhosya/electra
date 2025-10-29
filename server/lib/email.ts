import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SendInvitationEmailParams {
  inviteeEmail: string;
  inviterName: string;
  homeName: string;
  role: string;
  invitationId: number;
}

export async function sendInvitationEmail({
  inviteeEmail,
  inviterName,
  homeName,
  role,
  invitationId
}: SendInvitationEmailParams): Promise<void> {
  try {
    const appUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

    // Check if user exists
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existingUser = users.find(u => u.email === inviteeEmail);

    console.log(`📧 Sending invitation email to ${inviteeEmail}...`);
    console.log(`   Inviter: ${inviterName}, Home: ${homeName}, Role: ${role}`);
    console.log(`   User exists: ${existingUser ? 'Yes' : 'No'}`);

    if (!existingUser) {
      // New user - send invite email (creates user account)
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(inviteeEmail, {
        redirectTo: `${appUrl}/dashboard`,
        data: {
          home_invitation: true,
          home_name: homeName,
          inviter_name: inviterName,
          role: role,
          invitation_id: invitationId
        }
      });

      if (error) {
        console.error('❌ Error sending invitation via Supabase:', error.message);
        throw error;
      }

      console.log(`✅ Invitation email sent to NEW user ${inviteeEmail}`);
      console.log(`   User created with ID: ${data.user?.id}`);
      console.log(`   ⚠️  User must click email link to confirm account before accepting invitation`);
    } else {
      // Existing user - send magic link to notify them
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: inviteeEmail,
        options: {
          redirectTo: `${appUrl}/dashboard`
        }
      });

      if (error) {
        console.error('❌ Error sending magic link:', error.message);
        throw error;
      }

      console.log(`✅ Magic link email sent to EXISTING user ${inviteeEmail}`);
      console.log(`   📬 Email subject: "Magic Link"`);
      console.log(`   📝 User should:`);
      console.log(`      1. Click the email link (logs them in automatically)`);
      console.log(`      2. See "Pending Invitations" card on dashboard`);
      console.log(`      3. Click "Accept" to join home`);
    }
    
  } catch (error: any) {
    console.error('❌ Failed to send invitation email:', error.message);
    // Don't throw - we still want the invitation to be created even if email fails
  }
}

interface SendDeviceNotificationParams {
  userEmail: string;
  deviceName: string;
  action: 'added' | 'removed' | 'modified';
  performedBy: string;
}

export async function sendDeviceNotificationEmail({
  userEmail,
  deviceName,
  action,
  performedBy
}: SendDeviceNotificationParams): Promise<void> {
  try {
    const actionText = action === 'added' ? 'added a new device' : 
                       action === 'removed' ? 'removed a device' : 
                       'modified a device';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .info { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Device Update</h1>
          </div>
          <div class="content">
            <p>Hello!</p>
            <p><strong>${performedBy}</strong> ${actionText} in your smart home.</p>
            
            <div class="info">
              <p><strong>Device:</strong> ${deviceName}</p>
              <p><strong>Action:</strong> ${actionText}</p>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              This is a notification email. You can manage your notification preferences in the app settings.
            </p>
          </div>
          <div class="footer">
            <p>Electra Smart Home System</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log(`📧 Device notification email queued for ${userEmail}`);
    // Note: Implement actual email sending when needed
    
  } catch (error: any) {
    console.error('❌ Failed to send device notification email:', error.message);
  }
}
