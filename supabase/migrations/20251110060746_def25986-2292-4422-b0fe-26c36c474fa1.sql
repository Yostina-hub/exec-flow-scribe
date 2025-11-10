-- Guarded policy creation to avoid duplicates
-- user_roles admin policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Admins can select user_roles'
  ) THEN
    CREATE POLICY "Admins can select user_roles"
      ON public.user_roles
      FOR SELECT
      TO authenticated
      USING (public.is_admin(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Admins can insert user_roles'
  ) THEN
    CREATE POLICY "Admins can insert user_roles"
      ON public.user_roles
      FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Admins can update user_roles'
  ) THEN
    CREATE POLICY "Admins can update user_roles"
      ON public.user_roles
      FOR UPDATE
      TO authenticated
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Admins can delete user_roles'
  ) THEN
    CREATE POLICY "Admins can delete user_roles"
      ON public.user_roles
      FOR DELETE
      TO authenticated
      USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Ensure RLS enabled (idempotent)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- roles table read policy
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'roles' AND policyname = 'Authenticated can read roles'
  ) THEN
    CREATE POLICY "Authenticated can read roles"
      ON public.roles
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;
