-- This is the UP migration script (Step 1).
-- It will delete all existing data and alter the tables.

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
DROP POLICY IF EXISTS "Home members can view devices in their home" ON public.devices;

-- Drop existing tables that are being recreated
DROP TABLE IF EXISTS public.parental_controls;

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
