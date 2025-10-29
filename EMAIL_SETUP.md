# Email Setup Guide for Electra

The Electra app now supports sending email invitations! This guide will walk you through setting up email functionality.

## Quick Setup (5 minutes)

### Step 1: Sign up for Resend (FREE)

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account
3. **Free tier includes:**
   - 100 emails per day
   - 3,000 emails per month
   - Perfect for home management apps!

### Step 2: Get Your API Key

1. After signing up, go to your Resend Dashboard
2. Click **API Keys** in the sidebar
3. Click **Create API Key**
4. Name it "Electra Home Management"
5. Copy the API key (starts with `re_`)

### Step 3: Configure Electra

1. Open `server/.env`
2. Find the EMAIL CONFIGURATION section
3. Uncomment and set your API key:

```env
RESEND_API_KEY=re_your_actual_api_key_here
FROM_EMAIL=Electra <noreply@yourdomain.com>
```

**Note:** For testing, you can use the default `FROM_EMAIL` which is `Electra <onboarding@resend.dev>`

### Step 4: Restart the Server

```bash
cd server
pnpm dev
```

You should see: `📧 Email processor started`

## How It Works

### Email Queue System

1. **When you send an invitation:**
   - Invitation is created in the database ✅
   - Email is queued in the `email_queue` table 📥
   - Response is sent immediately (non-blocking) ⚡

2. **Email processor runs every 30 seconds:**
   - Checks for pending emails in the queue
   - Sends them using Resend API 📧
   - Marks them as `sent` or `failed`
   - Logs the results

### Email Types

#### 1. **Invitation to Existing User**
When you invite someone who already has an Electra account:
- Subject: "🏠 [Inviter Name] invited you to join [Home Name]"
- Content: Explains the invitation with role details
- Action: "Open Electra App" button
- They'll see the invitation in their Dashboard

#### 2. **Invitation to New User**
When you invite someone who doesn't have an account:
- Subject: "🏠 You've been invited to join [Home Name] on Electra!"
- Content: Welcome message with signup instructions
- Action: "Sign Up & Accept Invitation" button
- After signup with that email, they'll see the pending invitation

## Verifying Email Functionality

### Check Email Queue

You can check if emails are being queued:

```sql
SELECT * FROM public.email_queue 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check Email Status

- `status = 'pending'` - Waiting to be sent
- `status = 'sent'` - Successfully sent (check `sent_at` timestamp)
- `status = 'failed'` - Failed to send (check `error_message`)

### Server Logs

Watch the server logs when invitations are sent:

```
📧 SEND INVITATION - Start
✅ Invitation created successfully
✅ Invitation email queued for user@example.com
📧 Email will be sent by the email processor service

[30 seconds later]
📧 Processing 1 pending emails...
✅ Email sent to user@example.com (ID: abc123)
```

## Testing Without Email (Development)

If you don't configure `RESEND_API_KEY`, the app still works:

- ⚠️ Server shows: "RESEND_API_KEY not configured. Email sending is disabled."
- ✅ Invitations are still created in the database
- ✅ Users can see and accept invitations in the app
- ❌ No email notifications are sent

This is perfect for development and testing!

## Alternative Email Services

While we use Resend, you can adapt the code to use:

- **SendGrid** - More features, but more complex setup
- **AWS SES** - Very cheap, requires AWS account
- **Mailgun** - Similar to Resend
- **Postmark** - Great for transactional emails

To switch providers, modify `server/lib/emailProcessor.ts`

## Troubleshooting

### "RESEND_API_KEY not configured"

**Solution:** Add your Resend API key to `server/.env` and restart the server.

### Emails not being sent

1. Check the email queue:
   ```sql
   SELECT * FROM public.email_queue WHERE status = 'failed';
   ```

2. Check server logs for errors

3. Verify your Resend API key is correct

4. Check Resend dashboard for delivery status

### Emails going to spam

1. **Use a custom domain** in Resend (recommended)
2. Set up SPF, DKIM, and DMARC records
3. Use a recognizable sender name
4. Keep email content professional

### Rate limits reached

Free tier limits:
- 100 emails/day
- 3,000 emails/month

**Solutions:**
- Upgrade Resend plan
- Implement daily invitation limits per user
- Add email confirmation before sending

## Production Recommendations

1. **Use a custom domain:**
   - Configure your domain in Resend
   - Use `FROM_EMAIL=Electra <noreply@yourdomain.com>`

2. **Monitor email queue:**
   - Set up alerts for failed emails
   - Clear old sent emails periodically

3. **Add email templates:**
   - Customize email designs in `server/lib/email.ts`
   - Add your branding and colors

4. **Track email engagement:**
   - Use Resend webhooks for open/click tracking
   - Store engagement data for analytics

## Cost Comparison

| Service | Free Tier | Paid Plans |
|---------|-----------|------------|
| **Resend** | 100/day (3K/month) | $20/mo (50K emails) |
| SendGrid | 100/day | $20/mo (40K emails) |
| AWS SES | None | $0.10 per 1K emails |
| Mailgun | None | $15/mo (1,250 emails) |

**Winner for Home Apps:** Resend - Perfect balance of free tier and simplicity!

## Need Help?

- Resend Docs: https://resend.com/docs
- Resend Support: https://resend.com/support
- Check server logs for detailed error messages
- Review the email queue table for delivery status

---

**🎉 Congratulations!** Your Electra app can now send beautiful email invitations!
