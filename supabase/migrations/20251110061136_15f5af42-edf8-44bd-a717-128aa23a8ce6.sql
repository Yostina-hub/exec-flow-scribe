-- Bootstrap helper: detect if any Admin exists
create or replace function public.has_any_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where r.name = 'Admin'
  );
$$;

-- Allow first Admin self-assignment when no Admin exists yet
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='user_roles' AND policyname='Bootstrap: first admin self-assign'
  ) THEN
    CREATE POLICY "Bootstrap: first admin self-assign"
      ON public.user_roles
      FOR INSERT
      TO authenticated
      WITH CHECK (
        NOT public.has_any_admin()
        AND user_id = auth.uid()
        AND role_id = (
          select id from public.roles where name = 'Admin' limit 1
        )
      );
  END IF;
END $$;