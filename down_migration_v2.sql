-- This is the DOWN migration script.
-- It will revert the changes made by the UP migration script.

-- Drop new policies
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Parents can view their children's data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Parents can manage their own parent-child relationships" ON public.parental_controls;
DROP POLICY IF EXISTS "Home members can view the homes they belong to" ON public.homes;
DROP POLICY IF EXISTS "Home owners can create homes" ON public.homes;
DROP POLICY IF EXISTS "Home owners can update their homes" ON public.homes;
DROP POLICY IF EXISTS "Home owners can delete their homes" ON public.homes;
DROP POLICY IF EXISTS "Home members can view other members of the same home" ON public.home_members;
DROP POLICY IF EXISTS "Home owners can add any user to their home" ON public.home_members;
DROP POLICY IF EXISTS "Adults can add children to the home" ON public.home_members;
DROP POLICY IF EXISTS "Home owners can update member roles" ON public.home_members;
DROP POLICY IF EXISTS "Users can leave a home" ON public.home_members;
DROP POLICY IF EXISTS "Home owners can remove members" ON public.home_members;
DROP POLICY IF EXISTS "Home members can view appliances in their home" ON public.appliances;
DROP POLICY IF EXISTS "Owners and adults can create appliances" ON public.appliances;
DROP POLICY IF EXISTS "Owners and adults can update appliances" ON public.appliances;
DROP POLICY IF EXISTS "Owners and adults can delete appliances" ON public.appliances;
DROP POLICY IF EXISTS "Owners and adults can manage appliance permissions" ON public.appliance_permissions;
DROP POLICY IF EXISTS "Users can manage schedules for appliances they have access to" ON public.schedules;
DROP POLICY IF EXISTS "Users can view events for appliances they have access to" ON public.appliance_events;
DROP POLICY IF EXISTS "Owners and adults can manage device credentials" ON public.device_credentials;
DROP POLICY IF EXISTS "Home members can view devices in their home" ON public.devices;

-- Drop parental_controls table
DROP TABLE IF EXISTS public.parental_controls;

-- Remove role from home_members table
ALTER TABLE public.home_members DROP COLUMN IF EXISTS role;

-- Alter devices table to change home_id back to uuid
ALTER TABLE public.devices DROP COLUMN IF EXISTS home_id;
ALTER TABLE public.devices ADD COLUMN home_id UUID;

-- Re-create original policies
CREATE POLICY "Enable read access for home members"
  ON public.homes FOR SELECT
  USING (
    id IN (
      SELECT home_id FROM home_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Enable home creation for owners"
  ON public.homes FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Enable home updates for owners"
  ON public.homes FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Enable read access for members and owners"
  ON public.home_members FOR SELECT
  USING (
    home_id IN (SELECT home_id FROM home_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Enable membership insert for owners"
  ON public.home_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM homes h
      WHERE h.id = home_members.home_id
        AND h.owner_id = auth.uid()
    )
  );

CREATE POLICY "Enable membership updates for owners"
  ON public.home_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM homes h
      WHERE h.id = home_members.home_id
        AND h.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM homes h
      WHERE h.id = home_members.home_id
        AND h.owner_id = auth.uid()
    )
  );

CREATE POLICY "Enable appliance write access for owners and permitted members"
  ON public.appliances FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM home_members hm
      WHERE hm.home_id = appliances.home_id
        AND hm.user_id = auth.uid()
        AND (
          hm.role = 'owner' OR
          EXISTS (
            SELECT 1 FROM appliance_permissions ap
            WHERE ap.appliance_id = appliances.id
              AND ap.home_member_id = hm.id
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM home_members hm
      WHERE hm.home_id = appliances.home_id
        AND hm.user_id = auth.uid()
        AND (
          hm.role = 'owner' OR
          EXISTS (
            SELECT 1 FROM appliance_permissions ap
            WHERE ap.appliance_id = appliances.id
              AND ap.home_member_id = hm.id
          )
        )
    )
  );

CREATE POLICY "Enable appliance read access for owners and permitted members"
  ON public.appliances FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM home_members hm
      WHERE hm.home_id = appliances.home_id
        AND hm.user_id = auth.uid()
        AND (
          hm.role = 'owner' OR
          EXISTS (
            SELECT 1 FROM appliance_permissions ap
            WHERE ap.appliance_id = appliances.id
              AND ap.home_member_id = hm.id
          )
        )
    )
  );

CREATE POLICY "Enable schedule access for authorized users"
  ON public.schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM appliances a
      JOIN home_members hm ON hm.home_id = a.home_id
      WHERE a.id = schedules.appliance_id
        AND hm.user_id = auth.uid()
        AND (
          hm.role = 'owner' OR
          EXISTS (
            SELECT 1 FROM appliance_permissions ap
            WHERE ap.appliance_id = schedules.appliance_id
              AND ap.home_member_id = hm.id
          )
        )
    )
  )
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Enable permissions access for owners and members"
  ON public.appliance_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM home_members hm
      WHERE hm.id = appliance_permissions.home_member_id
        AND (
          hm.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM home_members owners
            WHERE owners.home_id = hm.home_id
              AND owners.user_id = auth.uid()
              AND owners.role = 'owner'
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM home_members owners
      WHERE owners.id = appliance_permissions.home_member_id
        AND owners.user_id = auth.uid()
        AND owners.role = 'owner'
    )
  );

CREATE POLICY "Enable appliance event access for authorized users"
  ON public.appliance_events FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM appliances a
      JOIN home_members hm ON hm.home_id = a.home_id
      WHERE a.id = appliance_events.appliance_id
        AND hm.user_id = auth.uid()
        AND (
          hm.role = 'owner' OR
          EXISTS (
            SELECT 1 FROM appliance_permissions ap
            WHERE ap.appliance_id = appliance_events.appliance_id
              AND ap.home_member_id = hm.id
          )
        )
    )
  )
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Enable profile read access"
  ON public.users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Enable profile insert"
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Enable profile update"
  ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
