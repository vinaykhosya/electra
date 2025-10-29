-- This is the UP migration script.
-- It will delete all existing data and create the new policy structure.

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for home members" ON public.homes;
DROP POLICY IF EXISTS "Enable home creation for owners" ON public.homes;
DROP POLICY IF EXISTS "Enable home updates for owners" ON public.homes;
DROP POLICY IF EXISTS "Enable read access for members and owners" ON public.home_members;
DROP POLICY IF EXISTS "Enable membership insert for owners" ON public.home_members;
DROP POLICY IF EXISTS "Enable membership updates for owners" ON public.home_members;
DROP POLICY IF EXISTS "Enable appliance write access for owners and permitted members" ON public.appliances;
DROP POLICY IF EXISTS "Enable appliance read access for owners and permitted members" ON public.appliances;
DROP POLICY IF EXISTS "Enable schedule access for authorized users" ON public.schedules;
DROP POLICY IF EXISTS "Enable permissions access for owners and members" ON public.appliance_permissions;
DROP POLICY IF EXISTS "Enable appliance event access for authorized users" ON public.appliance_events;
DROP POLICY IF EXISTS "Enable profile read access" ON public.users;
DROP POLICY IF EXISTS "Enable profile insert" ON public.users;
DROP POLICY IF EXISTS "Enable profile update" ON public.users;

-- Truncate all tables to clear existing data
TRUNCATE TABLE public.homes, public.home_members, public.appliances, public.schedules, public.appliance_permissions, public.appliance_events, public.users, public.device_credentials, public.devices RESTART IDENTITY CASCADE;

-- Alter devices table to change home_id to integer
ALTER TABLE public.devices DROP COLUMN IF EXISTS home_id;
ALTER TABLE public.devices ADD COLUMN home_id INTEGER REFERENCES public.homes(id);

-- Create parental_controls table
CREATE TABLE public.parental_controls (
  id BIGSERIAL PRIMARY KEY,
  parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add role to home_members table
ALTER TABLE public.home_members ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member';

-- Enable RLS on all tables
ALTER TABLE public.homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appliance_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appliance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parental_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Create new policies

-- users table policies
CREATE POLICY "Users can view their own data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Parents can view their children's data" ON public.users FOR SELECT USING (
  id IN (SELECT child_id FROM public.parental_controls WHERE parent_id = auth.uid())
);
CREATE POLICY "Users can update their own data" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- parental_controls table policies
CREATE POLICY "Parents can manage their own parent-child relationships" ON public.parental_controls FOR ALL USING (auth.uid() = parent_id);
CREATE POLICY "Children can view and accept their own invitations" ON public.parental_controls FOR ALL USING (auth.uid() = child_id);

-- homes table policies
CREATE POLICY "Home members can view the homes they belong to" ON public.homes FOR SELECT USING (
  id IN (SELECT home_id FROM public.home_members WHERE user_id = auth.uid())
);
CREATE POLICY "Home owners can create homes" ON public.homes FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Home owners can update their homes" ON public.homes FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Home owners can delete their homes" ON public.homes FOR DELETE USING (owner_id = auth.uid());

-- home_members table policies
CREATE POLICY "Home members can view other members of the same home" ON public.home_members FOR SELECT USING (
  home_id IN (SELECT home_id FROM public.home_members WHERE user_id = auth.uid())
);
CREATE POLICY "Home owners can add any user to their home" ON public.home_members FOR INSERT WITH CHECK (
  home_id IN (SELECT id FROM public.homes WHERE owner_id = auth.uid())
);
CREATE POLICY "Adults can add children to the home" ON public.home_members FOR INSERT WITH CHECK (
  role = 'child' AND home_id IN (SELECT home_id FROM public.home_members WHERE user_id = auth.uid() AND role = 'adult')
);
CREATE POLICY "Home owners can update member roles" ON public.home_members FOR UPDATE USING (
  home_id IN (SELECT id FROM public.homes WHERE owner_id = auth.uid())
);
CREATE POLICY "Users can leave a home" ON public.home_members FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Home owners can remove members" ON public.home_members FOR DELETE USING (
  home_id IN (SELECT id FROM public.homes WHERE owner_id = auth.uid())
);

-- appliances table policies
CREATE POLICY "Home members can view appliances in their home" ON public.appliances FOR SELECT USING (
  home_id IN (SELECT home_id FROM public.home_members WHERE user_id = auth.uid())
);
CREATE POLICY "Owners and adults can create appliances" ON public.appliances FOR INSERT WITH CHECK (
  home_id IN (SELECT home_id FROM public.home_members WHERE user_id = auth.uid() AND (role = 'owner' OR role = 'adult'))
);
CREATE POLICY "Owners and adults can update appliances" ON public.appliances FOR UPDATE USING (
  home_id IN (SELECT home_id FROM public.home_members WHERE user_id = auth.uid() AND (role = 'owner' OR role = 'adult'))
);
CREATE POLICY "Owners and adults can delete appliances" ON public.appliances FOR DELETE USING (
  home_id IN (SELECT home_id FROM public.home_members WHERE user_id = auth.uid() AND (role = 'owner' OR role = 'adult'))
);

-- appliance_permissions table policies
CREATE POLICY "Owners and adults can manage appliance permissions" ON public.appliance_permissions FOR ALL USING (
  home_member_id IN (SELECT id FROM public.home_members WHERE home_id IN (SELECT home_id FROM public.home_members WHERE user_id = auth.uid() AND (role = 'owner' OR role = 'adult')))
);

-- schedules and appliance_events policies
CREATE POLICY "Users can manage schedules for appliances they have access to" ON public.schedules FOR ALL USING (
  appliance_id IN (SELECT id FROM public.appliances)
) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view events for appliances they have access to" ON public.appliance_events FOR ALL USING (
  appliance_id IN (SELECT id FROM public.appliances)
) WITH CHECK (user_id = auth.uid());

-- device_credentials and devices policies
CREATE POLICY "Owners and adults can manage device credentials" ON public.device_credentials FOR ALL USING (
  appliance_id IN (SELECT id FROM public.appliances WHERE home_id IN (SELECT home_id FROM public.home_members WHERE user_id = auth.uid() AND (role = 'owner' OR role = 'adult')))
);

CREATE POLICY "Home members can view devices in their home" ON public.devices FOR SELECT USING (
  home_id IN (SELECT home_id FROM public.home_members WHERE user_id = auth.uid())
);
