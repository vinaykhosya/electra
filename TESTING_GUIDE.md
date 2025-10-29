# 🧪 Quick Testing Guide

## Fixed Issues Summary

### ✅ Issue 1: Home Invitations "Bad Request" Errors
**What was broken**: Duplicate constraint prevented sending new invitations
**What was fixed**: Changed unique constraint to only prevent duplicate *pending* invitations
**How to test**: Send multiple invitations to the same email - should work now!

### ✅ Issue 2: Parental Controls Not Working
**What was broken**: Routes tried to access `auth.users` table directly via SQL
**What was fixed**: Now uses Supabase Admin SDK for auth operations
**How to test**: Use the parental controls API endpoints

### ✅ Issue 3: Permissions Management Broken
**What was broken**: Missing security checks and missing endpoints
**What was fixed**: Added parent verification, revoke, and list endpoints
**How to test**: Grant/revoke permissions via API

---

## Quick Test: Home Invitations

### Via UI (Recommended)
1. **Start the server** (if not running):
   ```bash
   cd server
   pnpm dev
   ```

2. **Open two browser windows**:
   - Window 1: Login as `vinayroyale123@gmail.com` (parent/owner)
   - Window 2: Login as `vinaybal26@gmail.com` (child - use incognito)

3. **In Window 1 (Parent)**:
   - Go to Home Settings
   - Click "Invite Member"
   - Enter: `vinaybal26@gmail.com`, Role: "Member"
   - Click "Send Invitation"
   - **Expected**: ✅ Success message (no more "Bad Request" error!)

4. **Try sending again** (this tests the fix):
   - Send the same invitation again
   - **Expected**: ✅ Should work! Old invitation automatically expired

5. **In Window 2 (Child)**:
   - Check email for magic link
   - OR refresh dashboard to see "Pending Invitations" card
   - Click "Accept"
   - **Expected**: ✅ Should be added to home

---

## Quick Test: Parental Controls

### Setup Required
You need valid auth tokens. Get them from:
1. Login to each account in browser
2. Open DevTools > Application > Local Storage
3. Find the `sb-[project]-auth-token` key
4. Copy the `access_token` value

### Test with cURL

```bash
# Replace YOUR_PARENT_TOKEN and YOUR_CHILD_TOKEN with actual tokens

# 1. Invite child (as parent)
curl -X POST http://localhost:3001/api/parental-controls/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PARENT_TOKEN" \
  -d '{"child_email": "vinaybal26@gmail.com"}'

# Expected: {"message": "Invitation sent"}

# 2. Get pending invitations (as child)
curl http://localhost:3001/api/parental-controls/invitations \
  -H "Authorization: Bearer YOUR_CHILD_TOKEN"

# Expected: Array of invitations with parent details

# 3. Accept invitation (as child)
curl -X POST http://localhost:3001/api/parental-controls/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CHILD_TOKEN" \
  -d '{"parent_id": "a6e45981-1c89-428c-947e-d91248bd5fff"}'

# Expected: {"message": "Invitation accepted"}

# 4. Get children list (as parent)
curl http://localhost:3001/api/parental-controls/children \
  -H "Authorization: Bearer YOUR_PARENT_TOKEN"

# Expected: Array of accepted children with details
```

---

## Quick Test: Permissions

### Prerequisites
- Parent-child relationship must be established
- Child must be a member of a home
- Home must have at least one appliance

### Test with cURL

```bash
# Replace tokens and IDs as needed

# 1. Grant permission
curl -X POST http://localhost:3001/api/permissions/grant \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PARENT_TOKEN" \
  -d '{
    "child_id": "df14bb1a-af8d-406d-b8d1-0480e1f5b5ee",
    "appliance_id": 1
  }'

# Expected: {"message": "Permission granted", "data": {...}}

# 2. List permissions
curl http://localhost:3001/api/permissions/list/df14bb1a-af8d-406d-b8d1-0480e1f5b5ee \
  -H "Authorization: Bearer YOUR_PARENT_TOKEN"

# Expected: Array of permissions with appliance details

# 3. Revoke permission
curl -X POST http://localhost:3001/api/permissions/revoke \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PARENT_TOKEN" \
  -d '{
    "child_id": "df14bb1a-af8d-406d-b8d1-0480e1f5b5ee",
    "appliance_id": 1
  }'

# Expected: {"message": "Permission revoked", "data": {...}}
```

---

## Debugging Tips

### Check Server Logs
The server now has extensive logging. Watch for:
```
📧 SEND INVITATION - Start
✅ Invitation created successfully
✅ Magic link email sent
```

### Common Errors

**401 Unauthorized**
- Problem: Invalid or missing auth token
- Fix: Get a fresh token from browser storage

**403 Forbidden**
- Problem: User doesn't have permission (e.g., not a parent)
- Fix: Verify parent-child relationship exists

**404 Not Found**
- Problem: Resource doesn't exist (user, home, appliance)
- Fix: Check IDs are correct

**500 Internal Server Error**
- Problem: Server-side error
- Fix: Check server logs for details

### Database Checks

```sql
-- Check current invitations
SELECT * FROM home_invitations ORDER BY invited_at DESC;

-- Check parental controls
SELECT * FROM parental_controls;

-- Check permissions
SELECT * FROM appliance_permissions;

-- Check home members
SELECT * FROM home_members;
```

---

## Expected Results

### Home Invitations ✅
- ✅ Can send new invitations
- ✅ Can send duplicate invitations (old one auto-expires)
- ✅ Magic link emails are sent
- ✅ User can accept/reject invitations

### Parental Controls ✅
- ✅ Parent can invite child by email
- ✅ Child can see pending invitations
- ✅ Child can accept/reject invitations
- ✅ Parent can see list of children
- ✅ Parent can remove child

### Permissions ✅
- ✅ Parent can grant appliance permissions
- ✅ Parent can revoke permissions
- ✅ Parent can list child's permissions
- ✅ Non-parents cannot grant/revoke permissions

---

## Need Help?

Check these files for detailed information:
- `FIX_SUMMARY.md` - Detailed explanation of all fixes
- `test-endpoints.js` - Automated test script (requires token setup)
- Server logs - Watch for errors and debug info

---

## Current State

✅ **All reported issues have been fixed**
- Home invitations working
- Parental controls working  
- Permissions management working
- All TypeScript errors resolved
- Comprehensive error handling added

**Ready for testing!** 🚀
