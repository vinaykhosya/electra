# Fix for "Reset Password" Email Issue

## Problem
When inviting existing users to a home, they receive a generic "Reset Password" email from Supabase instead of a proper invitation email with context.

## Root Cause
Supabase's built-in email system doesn't allow customizing email templates via API - only through the dashboard. The `resetPasswordForEmail` and `generateLink` methods send generic emails.

## Solution Implemented

The code now supports **two email systems** with automatic fallback:

### 1. Resend (Recommended) - Custom HTML Emails ✨
- Beautiful, branded invitation emails
- Full control over content and design
- Shows home name, inviter name, and role
- **Free tier**: 100 emails/day, 3,000/month

### 2. Supabase Auth (Fallback) - Generic Emails
- Used automatically if Resend isn't configured
- New users get "Confirm Your Email"
- Existing users get "Magic Link" (better than Reset Password)

## How to Enable Custom Emails

### Step 1: Sign up for Resend (FREE)
1. Go to https://resend.com
2. Create a free account
3. Get your API key from the dashboard

### Step 2: Add to server/.env
```env
# Email Configuration
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=Electra <noreply@yourdomain.com>

# Optional: already set
FRONTEND_URL=http://localhost:3001
```

### Step 3: Restart Server
```powershell
taskkill /F /IM node.exe /T
cd "c:\Users\vinay\Downloads\project - Copy"
pnpm dev
```

## Testing

### Test 1: Without Resend (Current State)
- Send invitation → User gets "Magic Link" email
- Not ideal but functional

### Test 2: With Resend (After Setup)
- Send invitation → User gets beautiful custom email:
  ```
  🏠 Home Invitation
  
  [Inviter Name] has invited you to join their smart home.
  
  Home: [Home Name]
  Your Role: MEMBER
  
  [Accept Invitation →]
  ```

## Email Flow

```
Send Invitation
    ↓
Check if Resend configured?
    ├─ YES → Send custom HTML email ✅
    │        (Beautiful branded invitation)
    │
    └─ NO → Use Supabase fallback
           ├─ New user → "Confirm Email" 
           └─ Existing user → "Magic Link"
```

## What Each User Sees

### With Resend (Recommended)
- **Subject**: "[Name] invited you to join [Home Name]"
- **Content**: Custom HTML with home details and clear call-to-action
- **Branding**: Your app's colors and style

### Without Resend (Current)
- **New Users**: "Confirm your signup" (Supabase default)
- **Existing Users**: "Magic Link" (Supabase default)
- **No Context**: Generic message, no home/inviter details

## Next Steps

1. **Quick Fix**: Get Resend API key (5 minutes, free)
2. **Test**: Send invitation and verify custom email
3. **Production**: Keep using Resend for all emails

## Files Changed
- `server/lib/email.ts` - Added Resend integration with Supabase fallback
- Email now shows: home name, inviter, role, and custom styling
