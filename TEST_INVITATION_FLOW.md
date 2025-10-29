# 🧪 Two-Account Invitation Test Guide

## Current Setup (Ready to Test!)

**Server Status**: ✅ Running on http://localhost:3001
**Email System**: ✅ Supabase-only (no Resend needed)
**Database State**:
- Home ID: 5 ("vinay's Home")
- Owner: vinayroyale123@gmail.com
- Pending Invitation: vinaybal26@gmail.com (invitation #6)

## Test Flow

### Step 1: Owner Sends Invitation (Normal Window)
1. **Already logged in as**: vinayroyale123@gmail.com
2. **Go to**: Home Settings → Members tab
3. **Email field**: vinaybal26@gmail.com
4. **Role**: Member
5. **Click**: "Send Invite"
6. **Expected**: 
   - ✅ Success message
   - 📧 Email sent to vinaybal26@gmail.com
   - 📋 Invitation shows as "pending" in database

### Step 2: Check Email (vinaybal26@gmail.com)
1. Open vinaybal26@gmail.com inbox
2. Look for email from Supabase:
   - **Subject**: "Magic Link" (for existing users)
   - OR "Confirm your signup" (for new users)
3. **Click the link in the email**
   - This automatically logs you in as vinaybal26@gmail.com
   - Redirects to http://localhost:3001/dashboard

### Step 3: Accept Invitation (Incognito Window)
1. After clicking email link, you're now at dashboard
2. **Look for**: "Pending Invitations" card at top
3. **You should see**:
   ```
   Pending Invitations (1)
   
   vinay's Home
   Invited by vinayroyale123@gmail.com as MEMBER
   Expires: [date]
   
   [Accept]  [Decline]
   ```
4. **Click**: "Accept"
5. **Expected**:
   - ✅ "Invitation Accepted!" toast message
   - 🔄 Page reloads automatically after 1.5 seconds
   - ✅ You're now a member!

### Step 4: Verify Member Added (Both Windows)

**In Incognito Window (vinaybal26@gmail.com)**:
- Pending Invitations card disappears
- You can now see home controls
- Home name shows "vinay's Home" in header

**In Normal Window (vinayroyale123@gmail.com)**:
- Refresh Home Settings page
- Go to Members tab
- **You should see**:
  ```
  Home Members (2)
  
  ✅ vinayroyale123@gmail.com - Owner
  ✅ vinaybal26@gmail.com - Member  [Admin ▼] [🗑️]
  ```

## 🎯 Success Criteria

✅ Invitation email received  
✅ Email link logs in automatically  
✅ Pending Invitations card appears  
✅ Accept button works  
✅ Page refreshes and member appears  
✅ Both accounts see updated member list  

## 🐛 Troubleshooting

### Email not received?
- Check spam folder
- Verify email in Supabase Dashboard → Authentication → Users
- Wait 1-2 minutes (Supabase emails can be delayed)

### "Invitation not found" error?
- Make sure you're logged in as vinaybal26@gmail.com
- Check that invitation hasn't expired (7 days)
- Verify invitation status in database

### Member not showing after accept?
- Hard refresh page (Ctrl+F5)
- Check browser console for errors
- Verify in database: `home_members` table should have new row

### Magic Link expired?
- Re-send invitation from owner account
- New magic link will be generated

## 📊 Database Verification

Run this in Supabase SQL Editor to check status:

\`\`\`sql
-- Check home members
SELECT 
  u.email,
  hm.role,
  hm.joined_at
FROM home_members hm
JOIN auth.users u ON u.id = hm.user_id
WHERE hm.home_id = 5;

-- Check pending invitations
SELECT 
  id,
  invitee_email,
  status,
  invited_at,
  expires_at
FROM home_invitations
WHERE home_id = 5 AND status = 'pending';
\`\`\`

## 🔧 Quick Fixes

### Clear old invitation
If you want to test fresh:
\`\`\`sql
DELETE FROM home_invitations WHERE id = 6;
\`\`\`

### Reset member
\`\`\`sql
DELETE FROM home_members WHERE user_id = 'dc58bf84-448a-494a-a25b-f53339537a8a';
\`\`\`

## ✨ What's Working

1. **Email System**: Supabase sends "Magic Link" emails to existing users
2. **Auth Flow**: Magic link auto-logs in the user
3. **Accept Logic**: RPC function adds user to `home_members` table
4. **UI Updates**: Page auto-refreshes to show new member
5. **Real-time Sync**: Both accounts see updated member list

The system is ready to test! 🚀
