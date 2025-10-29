# 📡 API Endpoints Reference

## Base URL
```
http://localhost:3001/api
```

## Authentication
All endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## 🏠 Home Management Endpoints

### Send Invitation
```http
POST /home-management/send-invitation
Content-Type: application/json

{
  "home_id": 5,
  "invitee_email": "user@example.com",
  "role": "member" | "admin"
}
```

**Response**:
```json
{
  "invitation_id": 10,
  "home_name": "My Home",
  "invitee_email": "user@example.com",
  "role": "member",
  "expires_at": "2025-11-04T..."
}
```

### Get Home Invitations (sent by you)
```http
GET /home-management/homes/:homeId/invitations
```

### Get My Invitations (received by you)
```http
GET /home-management/my-invitations
```

### Accept Invitation
```http
POST /home-management/accept-invitation
Content-Type: application/json

{
  "invitation_id": 10
}
```

### Reject Invitation
```http
POST /home-management/reject-invitation
Content-Type: application/json

{
  "invitation_id": 10
}
```

### Get Home Members
```http
GET /home-management/homes/:homeId/members
```

### Update Member Role
```http
PATCH /home-management/homes/:homeId/members/:memberId/role
Content-Type: application/json

{
  "role": "admin" | "member"
}
```

### Remove Member
```http
DELETE /home-management/homes/:homeId/members/:memberId
```

### Delete Device with PIN
```http
POST /home-management/homes/:homeId/delete-device
Content-Type: application/json

{
  "device_id": 123,
  "security_pin": "1234"
}
```

### Update Security PIN
```http
PUT /home-management/homes/:homeId/security-pin
Content-Type: application/json

{
  "current_pin": "1234",
  "new_pin": "5678"
}
```

### Get Home Security Status
```http
GET /home-management/homes/:homeId/security-status
```

---

## 👨‍👧 Parental Controls Endpoints

### Invite Child
```http
POST /parental-controls/invite
Content-Type: application/json

{
  "child_email": "child@example.com"
}
```

**Response**:
```json
{
  "message": "Invitation sent"
}
```

### Get Pending Invitations (as child)
```http
GET /parental-controls/invitations
```

**Response**:
```json
[
  {
    "parent_id": "uuid",
    "parent_email": "parent@example.com",
    "parent_name": "Parent Name",
    "status": "pending",
    "created_at": "2025-10-28T..."
  }
]
```

### Accept Invitation (as child)
```http
POST /parental-controls/accept
Content-Type: application/json

{
  "parent_id": "uuid"
}
```

### Decline Invitation (as child)
```http
POST /parental-controls/decline
Content-Type: application/json

{
  "parent_id": "uuid"
}
```

### Get Children List (as parent)
```http
GET /parental-controls/children
```

**Response**:
```json
[
  {
    "id": "uuid",
    "email": "child@example.com",
    "full_name": "Child Name",
    "status": "accepted",
    "created_at": "2025-10-28T..."
  }
]
```

### Remove Child
```http
DELETE /parental-controls/children/:childId
```

---

## 🔐 Permissions Endpoints

### Grant Permission
```http
POST /permissions/grant
Content-Type: application/json

{
  "child_id": "uuid",
  "appliance_id": 123
}
```

**Response**:
```json
{
  "message": "Permission granted",
  "data": {
    "id": 1,
    "home_member_id": 5,
    "appliance_id": 123
  }
}
```

**Validations**:
- ✅ Verifies user is the parent
- ✅ Verifies child is a home member
- ✅ Verifies appliance belongs to child's home
- ✅ Prevents duplicate permissions

### Revoke Permission
```http
POST /permissions/revoke
Content-Type: application/json

{
  "child_id": "uuid",
  "appliance_id": 123
}
```

**Response**:
```json
{
  "message": "Permission revoked",
  "data": {
    "id": 1,
    "home_member_id": 5,
    "appliance_id": 123
  }
}
```

### List Child's Permissions
```http
GET /permissions/list/:childId
```

**Response**:
```json
[
  {
    "id": 1,
    "home_member_id": 5,
    "appliance_id": 123,
    "appliance_name": "Living Room Light",
    "device_type": "light"
  }
]
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "message": "You are not authorized to grant permissions for this user"
}
```

### 404 Not Found
```json
{
  "message": "Child not found in any home"
}
```

### 400 Bad Request
```json
{
  "message": "child_id and appliance_id are required"
}
```

### 500 Internal Server Error
```json
{
  "message": "Internal server error",
  "error": "Error details..."
}
```

---

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Example: Complete Flow

### 1. Parent invites child to home
```bash
curl -X POST http://localhost:3001/api/home-management/send-invitation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer PARENT_TOKEN" \
  -d '{
    "home_id": 5,
    "invitee_email": "child@example.com",
    "role": "member"
  }'
```

### 2. Child accepts home invitation
```bash
curl -X POST http://localhost:3001/api/home-management/accept-invitation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CHILD_TOKEN" \
  -d '{
    "invitation_id": 10
  }'
```

### 3. Parent invites child for parental control
```bash
curl -X POST http://localhost:3001/api/parental-controls/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer PARENT_TOKEN" \
  -d '{
    "child_email": "child@example.com"
  }'
```

### 4. Child accepts parental control
```bash
curl -X POST http://localhost:3001/api/parental-controls/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CHILD_TOKEN" \
  -d '{
    "parent_id": "parent-uuid"
  }'
```

### 5. Parent grants appliance permission
```bash
curl -X POST http://localhost:3001/api/permissions/grant \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer PARENT_TOKEN" \
  -d '{
    "child_id": "child-uuid",
    "appliance_id": 123
  }'
```

### 6. Parent views child's permissions
```bash
curl http://localhost:3001/api/permissions/list/child-uuid \
  -H "Authorization: Bearer PARENT_TOKEN"
```

---

## Notes

- All endpoints require authentication via Bearer token
- Tokens are obtained via Supabase Auth
- Tokens are available in browser local storage after login
- Parental control relationships are separate from home memberships
- A user can be a home member without being under parental control
- Permissions are tied to home membership (home_member_id)

---

## Related Documentation

- **FIX_SUMMARY.md** - Detailed explanation of fixes applied
- **TESTING_GUIDE.md** - Step-by-step testing instructions
- **API_DOCUMENTATION.md** - Original API documentation
