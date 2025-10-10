import { runQuery } from "./db";

let setupPromise: Promise<void> | null = null;

const tablesWithRls = [
  "homes",
  "home_members",
  "appliances",
  "schedules",
  "appliance_permissions",
  "appliance_events",
  "users",
];

const policyStatements = [
  `DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE polname = 'Enable read access for home members' AND tablename = 'homes'
    ) THEN
      EXECUTE 'CREATE POLICY "Enable read access for home members"
        ON public.homes FOR SELECT
        USING (
          id IN (
            SELECT home_id FROM home_members WHERE user_id = auth.uid()
          )
        )';
    END IF;
  END
  $$;`,
  `DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE polname = 'Enable home creation for owners' AND tablename = 'homes'
    ) THEN
      EXECUTE 'CREATE POLICY "Enable home creation for owners"
        ON public.homes FOR INSERT
        WITH CHECK (owner_id = auth.uid())';
    END IF;
  END
  $$;`,
  `DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE polname = 'Enable home updates for owners' AND tablename = 'homes'
    ) THEN
      EXECUTE 'CREATE POLICY "Enable home updates for owners"
        ON public.homes FOR UPDATE
        USING (owner_id = auth.uid())
        WITH CHECK (owner_id = auth.uid())';
    END IF;
  END
  $$;`,
  `DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE polname = 'Enable read access for members and owners' AND tablename = 'home_members'
    ) THEN
      EXECUTE 'CREATE POLICY "Enable read access for members and owners"
        ON public.home_members FOR SELECT
        USING (
          user_id = auth.uid() OR
          home_id IN (
            SELECT home_id FROM home_members WHERE user_id = auth.uid() AND role = ''owner''
          )
        )';
    END IF;
  END
  $$;`,
  `DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE polname = 'Enable membership insert for owners' AND tablename = 'home_members'
    ) THEN
      EXECUTE 'CREATE POLICY "Enable membership insert for owners"
        ON public.home_members FOR INSERT
        WITH CHECK (
          user_id = auth.uid() OR EXISTS (
            SELECT 1 FROM homes h
            WHERE h.id = home_members.home_id
              AND h.owner_id = auth.uid()
          )
        )';
    END IF;
  END
  $$;`,
  `DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE polname = 'Enable membership updates for owners' AND tablename = 'home_members'
    ) THEN
      EXECUTE 'CREATE POLICY "Enable membership updates for owners"
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
        )';
    END IF;
  END
  $$;`,
  `DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE polname = 'Enable appliance write access for owners and permitted members' AND tablename = 'appliances'
    ) THEN
      EXECUTE 'CREATE POLICY "Enable appliance write access for owners and permitted members"
        ON public.appliances FOR ALL
        USING (
          EXISTS (
            SELECT 1
            FROM home_members hm
            WHERE hm.home_id = appliances.home_id
              AND hm.user_id = auth.uid()
              AND (
                hm.role = ''owner'' OR
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
                hm.role = ''owner'' OR
                EXISTS (
                  SELECT 1 FROM appliance_permissions ap
                  WHERE ap.appliance_id = appliances.id
                    AND ap.home_member_id = hm.id
                )
              )
          )
        )';
    END IF;
  END
  $$;`,
  `DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE polname = 'Enable appliance read access for owners and permitted members' AND tablename = 'appliances'
    ) THEN
      EXECUTE 'CREATE POLICY "Enable appliance read access for owners and permitted members"
        ON public.appliances FOR SELECT
        USING (
          EXISTS (
            SELECT 1
            FROM home_members hm
            WHERE hm.home_id = appliances.home_id
              AND hm.user_id = auth.uid()
              AND (
                hm.role = ''owner'' OR
                EXISTS (
                  SELECT 1 FROM appliance_permissions ap
                  WHERE ap.appliance_id = appliances.id
                    AND ap.home_member_id = hm.id
                )
              )
          )
        )';
    END IF;
  END
  $$;`,
  `DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE polname = 'Enable schedule access for authorized users' AND tablename = 'schedules'
    ) THEN
      EXECUTE 'CREATE POLICY "Enable schedule access for authorized users"
        ON public.schedules FOR ALL
        USING (
          EXISTS (
            SELECT 1
            FROM appliances a
            JOIN home_members hm ON hm.home_id = a.home_id
            WHERE a.id = schedules.appliance_id
              AND hm.user_id = auth.uid()
              AND (
                hm.role = ''owner'' OR
                EXISTS (
                  SELECT 1 FROM appliance_permissions ap
                  WHERE ap.appliance_id = schedules.appliance_id
                    AND ap.home_member_id = hm.id
                )
              )
          )
        )
        WITH CHECK (
          user_id = auth.uid()
        )';
    END IF;
  END
  $$;`,
  `DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE polname = 'Enable permissions access for owners and members' AND tablename = 'appliance_permissions'
    ) THEN
      EXECUTE 'CREATE POLICY "Enable permissions access for owners and members"
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
                    AND owners.role = ''owner''
                )
              )
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM home_members owners
            WHERE owners.id = appliance_permissions.home_member_id
              AND owners.user_id = auth.uid()
              AND owners.role = ''owner''
          )
        )';
    END IF;
  END
  $$;`,
  `DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE polname = 'Enable appliance event access for authorized users' AND tablename = 'appliance_events'
    ) THEN
      EXECUTE 'CREATE POLICY "Enable appliance event access for authorized users"
        ON public.appliance_events FOR ALL
        USING (
          EXISTS (
            SELECT 1
            FROM appliances a
            JOIN home_members hm ON hm.home_id = a.home_id
            WHERE a.id = appliance_events.appliance_id
              AND hm.user_id = auth.uid()
              AND (
                hm.role = ''owner'' OR
                EXISTS (
                  SELECT 1 FROM appliance_permissions ap
                  WHERE ap.appliance_id = appliance_events.appliance_id
                    AND ap.home_member_id = hm.id
                )
              )
          )
        )
        WITH CHECK (
          user_id = auth.uid()
        )';
    END IF;
  END
  $$;`,
  `DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE polname = 'Enable profile read access' AND tablename = 'users'
    ) THEN
      EXECUTE 'CREATE POLICY "Enable profile read access"
        ON public.users FOR SELECT
        USING (id = auth.uid())';
    END IF;
  END
  $$;`,
  `DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE polname = 'Enable profile insert' AND tablename = 'users'
    ) THEN
      EXECUTE 'CREATE POLICY "Enable profile insert"
        ON public.users FOR INSERT
        WITH CHECK (id = auth.uid())';
    END IF;
  END
  $$;`,
  `DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE polname = 'Enable profile update' AND tablename = 'users'
    ) THEN
      EXECUTE 'CREATE POLICY "Enable profile update"
        ON public.users FOR UPDATE
        USING (id = auth.uid())
        WITH CHECK (id = auth.uid())';
    END IF;
  END
  $$;`,
];

async function runSetupOnce() {
  await runQuery(`CREATE TABLE IF NOT EXISTS appliance_events (
    id SERIAL PRIMARY KEY,
    appliance_id INTEGER REFERENCES appliances(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    status TEXT NOT NULL,
    power_usage INTEGER DEFAULT 0,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  )`);

  for (const table of tablesWithRls) {
    await runQuery(`ALTER TABLE IF EXISTS public.${table} ENABLE ROW LEVEL SECURITY`);
  }

  for (const statement of policyStatements) {
    await runQuery(statement);
  }
}

export const ensureDatabaseSetup = () => {
  if (!setupPromise) {
    setupPromise = runSetupOnce();
  }
  return setupPromise;
};
