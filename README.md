# Electra Wireless - Smart Home Control System

A production-ready full-stack smart home automation platform with integrated home management, parental controls, and invite-code based membership system.

## 🚀 Recent Updates (October 29, 2025)

### ✅ Invite Code System
- **No more email dependencies!** Every user gets a unique 8-character invite code
- Share your code with others to receive home invitations
- In-app acceptance via "My Invitations" panel
- Codes auto-generated: vinayroyale123@gmail.com → `EDC814F5`, vinaybal26@gmail.com → `9E2218A0`

### ✅ Fixed Issues
1. **Home Invitations** - Resolved duplicate constraint errors with partial unique index
2. **Parental Controls** - Fixed auth queries to use Supabase Admin SDK
3. **Permissions Management** - Added security validation and new revoke/list endpoints
4. **In-App Notifications** - Implemented "My Invitations" panel in Home Settings

### 🎯 How Invite Codes Work
1. **Get Your Code**: Home Settings → Invitations → Your unique 8-char code displays at top
2. **Invite Someone**: Enter their code → Select role (Admin/Member) → Send
3. **Accept Invite**: Invitee sees it in "My Invitations" → Click Accept → Joined!

## Tech Stack

- **Frontend**: React 18 + React Router 6 (SPA) + TypeScript + Vite + TailwindCSS 3
- **Backend**: Express + TypeScript + Supabase (Postgres + Auth + RLS)
- **Database**: PostgreSQL with Row-Level Security policies
- **Testing**: Vitest

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server (both client + server)
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start
```

## Key Features

### 🏠 Home Management
- Multi-home support with role-based access (Owner/Admin/Member)
- Invite code system for easy member addition
- In-app invitation acceptance
- Security PIN for device deletion

### 👨‍👧 Parental Controls
- Parent-child relationship management
- Invite children by email or code
- Accept/decline invitations
- View and remove children

### 🔐 Permissions System
- Grant/revoke appliance access per member
- Home members dropdown (no parental relationship required)
- Proper security validation (only owners/admins can manage)
- List all permissions for any child

### 📱 Device Management
- Add/edit/delete smart home appliances
- Real-time device status
- Schedule-based automation
- Usage analytics and history

## API Endpoints

### Home Management
- `GET /api/v2/user/invite-code` - Get your unique invite code
- `POST /api/v2/homes/invite` - Send invitation (accepts email OR 8-char code)
- `GET /api/v2/invitations/my` - Get your pending invitations
- `PUT /api/v2/invitations/:id/accept` - Accept invitation
- `PUT /api/v2/invitations/:id/reject` - Reject invitation
- `GET /api/v2/homes/:id/members` - List home members
- `DELETE /api/v2/members/:id` - Remove member

### Parental Controls
- `POST /api/parental-controls/invite` - Invite child
- `GET /api/parental-controls/invitations` - Get pending invitations (as child)
- `POST /api/parental-controls/accept` - Accept invitation
- `GET /api/parental-controls/children` - Get children list

### Permissions
- `POST /api/permissions/grant` - Grant appliance permission
- `POST /api/permissions/revoke` - Revoke permission
- `GET /api/permissions/list/:childId` - List child's permissions

## Database Structure

### Key Tables
- `users` - User profiles with invite codes
- `homes` - Smart home definitions
- `home_members` - User-home relationships with roles
- `home_invitations` - Pending invitations (email-based, with partial unique index)
- `appliances` - Smart devices
- `appliance_permissions` - Member device access control
- `parental_controls` - Parent-child relationships

### Security
- Row-Level Security (RLS) enabled on all tables
- JWT-based authentication via Supabase Auth
- Role-based access control (Owner > Admin > Member)
- Security PIN for sensitive operations

## Environment Variables

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Database
POSTGRES_URL=your_postgres_connection_string

# Server
FRONTEND_URL=http://localhost:3001
```

## Documentation

- `FIX_SUMMARY.md` - Detailed explanation of recent fixes
- `TESTING_GUIDE.md` - Step-by-step testing instructions
- `API_ENDPOINTS.md` - Complete API reference
- `AGENTS.md` - Project architecture and guidelines

## Deployment

- **Standard**: `pnpm build` → Deploy to your server
- **Cloud**: Use Netlify or Vercel MCP integrations
- **Binary**: Self-contained executables available for Linux/macOS/Windows

---

## Development History

### Initial Goal & Analysis

The project began with a request to overhaul the database structure to improve security and add a comprehensive **Parental Controls** feature. The primary goals were:

-   To ensure that user data was strictly segregated and accessible only by authorized individuals.
-   To allow a primary account holder (e.g., a parent) to grant specific, limited permissions to other users for accessing home devices.
-   To make all database changes structured, version-controlled, and reversible.

The first step was a thorough analysis of the entire project to identify all necessary database policies required for a production-ready, secure application.

## 2. Database Overhaul Strategy

Based on the analysis, a multi-step strategy was formulated:

### Step 2.1: Clearing the Slate
To avoid conflicts and build a clean system, the plan was to first delete all existing Row-Level Security (RLS) policies and related table entries. This would prepare the database for a completely new and more robust security model.

### Step 2.2: Creating a Reversible Migration System
To safely manage the database changes, a system of migration scripts was established. For every change made, a corresponding "undo" script was also created.

-   **`up_migration_*.sql` files:** These scripts were created to apply new changes. Each file represents a step in the evolution of the database schema. For example:
    -   `up_migration_v2.sql` was created to handle schema changes for device scheduling.
    -   `up_migration_v3_step1.sql` and `up_migration_v3_step2.sql` were created to introduce the tables required for the parental controls feature. This included new tables like `homes`, `home_users` (to link users to a home and assign roles), and `user_device_permissions`.
-   **`down_migration_*.sql` files:** For each "up" script, a corresponding "down" script was created. These files contain the SQL commands to reverse the changes, ensuring that we could roll back to a previous state at any point if an error occurred.

## 3. Implementation of Parental Controls & Security

This was the core of the update, executed through the migration scripts.

### Step 3.1: Schema Creation for Parental Controls
The database schema was modified to support the concept of a "home" managed by a primary user.
-   A `homes` table was designed to define a household.
-   A `home_users` table was designed to connect multiple users to a single `home`, with specific roles like `admin` (the parent) or `member` (the child/guest).
-   A `user_device_permissions` table was designed to give the `admin` user the ability to specify exactly which devices a `member` user is allowed to access or control.

### Step 3.2: Crafting New RLS Policies
With the new schema in place, a new set of RLS policies was written from scratch.
-   **Deletion of Old Policies:** The first action in the migration was to remove all old policies.
-   **Creation of New Policies:** New, more secure policies were then attached to critical tables (like `devices`, `schedules`, etc.). These policies work by checking the `home_users` and `user_device_permissions` tables to verify that a user has the right to see or modify a piece of data. For example, a user can only see a device if they are a member of the home that owns the device.

---

## 4. Current Status & Completed Work

The foundational database work has been completed with all SQL migration scripts in place. The backend API endpoints have been fully updated to enforce the new RLS policies and support the parental controls feature. The frontend components for Parental Controls have been implemented and integrated.

**Automatic Home Creation**: A database trigger has been implemented that automatically creates a default home for each user when they sign up. The home is named using the pattern "{User's Name}'s Home" (e.g., "vinay's Home"). Users can later change the home name from the settings page. This eliminates the need for users to manually create a home after signup.

**RLS Policy Implementation**: All Row-Level Security (RLS) policies have been created and applied to the following tables:
- `homes`: Policies for viewing, creating, updating, and deleting homes
- `home_members`: Policies for managing home memberships (fixed to prevent infinite recursion)
- `users`: Policies for user profile management
- `appliances`: Policies for viewing and managing appliances based on home membership
- `appliance_permissions`: Policies for managing device permissions
- `device_credentials`: Policies for managing device authentication credentials
- `appliance_events`: Policies for viewing and managing appliance events
- `schedules`: Policies for viewing and managing device schedules
- `devices`: Policies for viewing and managing devices
- `parental_controls`: Policies for managing parent-child relationships

**Infinite Recursion Fix**: The "infinite recursion detected in policy for relation 'home_members'" error was resolved by implementing non-recursive policies. The key fix was ensuring that the `SELECT` policy on `home_members` only checks `auth.uid() = user_id` without referencing `home_members` in a subquery. This breaks the circular dependency between `homes` and `home_members` tables.

**Reference SQL for Infinite Recursion Fix**: If you encounter the infinite recursion error again, use the following SQL query to reset and fix the policies:

```sql
BEGIN;

-- Drop all policies on 'homes'
DROP POLICY IF EXISTS "Allow members to see their home" ON public.homes;
DROP POLICY IF EXISTS "Allow members to see their homes" ON public.homes;
DROP POLICY IF EXISTS "Allow authenticated users to create a home" ON public.homes;
DROP POLICY IF EXISTS "Allow home owners to update their home" ON public.homes;

-- Drop all policies on 'home_members'
DROP POLICY IF EXISTS "Allow members to read their own membership" ON public.home_members;
DROP POLICY IF EXISTS "Enable read access for members and owners" ON public.home_members;
DROP POLICY IF EXISTS "Allow home owners to add members" ON public.home_members;
DROP POLICY IF EXISTS "Allow home owners to remove members" ON public.home_members;

-- Create safe policies for 'homes'
CREATE POLICY "Allow members to see their homes"
ON public.homes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.home_members
    WHERE home_members.home_id = homes.id
      AND home_members.user_id = auth.uid()
  )
);

CREATE POLICY "Allow authenticated users to create a home"
ON public.homes FOR INSERT
WITH CHECK ( auth.role() = 'authenticated' );

CREATE POLICY "Allow home owners to update their home"
ON public.homes FOR UPDATE
USING ( auth.uid() = owner_id )
WITH CHECK ( auth.uid() = owner_id );

-- Create safe policies for 'home_members' (non-recursive)
CREATE POLICY "Allow members to read their own membership"
ON public.home_members FOR SELECT
USING ( auth.uid() = user_id );

CREATE POLICY "Allow home owners to add members"
ON public.home_members FOR INSERT
WITH CHECK (
  auth.uid() = (SELECT owner_id FROM public.homes WHERE id = home_members.home_id)
);

CREATE POLICY "Allow home owners to remove members"
ON public.home_members FOR DELETE
USING (
  auth.uid() = (SELECT owner_id FROM public.homes WHERE id = home_members.home_id)
);

COMMIT;
```

**Remaining Tasks:**

1.  **Testing and Deployment:**
    -   **End-to-End Testing:** Test the entire system to ensure all features work correctly.
    -   **Policy Verification:** Verify that all RLS policies are secure and don't have any unintended loopholes.
    -   **Performance Testing:** Test the application under load to ensure it performs well.

## 5. How to Reverse Changes

To revert the database to its state before this work began, the `down_migration_*.sql` scripts should be executed in the reverse order of the `up` scripts. This will safely remove the new tables, policies, and restore the previous schema.