# DESIGNLY V3 runtime security
#
# Ez a migracio a `search_path` hardeninget es a kredit-RPC zarolasat vegzi.
#
# Elozmeny: a `20260924112704_designly_hardening.sql` a TELJES adatbazisra
# futtatta a policy-atirast (`WHERE schemaname = 'public'` minden `auth.uid()`
# policy-ra), ami egy megosztott Supabase projekten mas alkalmazasok policy-jait
# is atirta. Ez a migracio mar explicit tabla-listat hasznal.

-- A DESIGNLY sajat tablai, amiket ez a rendszer birtokol. Egy policy-atirast
-- csak ezekre szabad futtatni.
DO $$
DECLARE
  t text;
  r record;
  new_qual text;
  new_check text;
  owned_tables text[] := ARRAY[
    'profiles', 'projects', 'project_assets', 'campaigns', 'campaign_items',
    'ai_generation_jobs', 'leads', 'suppression_list', 'brand_kits',
    'credit_transactions', 'music_generations', 'admin_audit_log', 'admin_gifts',
    'payment_events', 'designly_projects', 'designly_generations'
  ];
BEGIN
  FOREACH t IN ARRAY owned_tables LOOP
    -- Csak akkor nyulunk hozza, ha a tabla letezik (a tobbsege nem biztos,
    -- hogy ebben a projektben ott van).
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      CONTINUE;
    END IF;

    FOR r IN
      SELECT policyname, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
        AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
    LOOP
      -- A mar normalizalt `(select auth.uid())` alakot nem bantjuk.
      IF position('(select auth.uid())' in coalesce(r.qual, '')) > 0
         OR position('(select auth.uid())' in coalesce(r.with_check, '')) > 0 THEN
        CONTINUE;
      END IF;

      new_qual := CASE WHEN r.qual IS NULL THEN NULL ELSE replace(r.qual, 'auth.uid()', '(select auth.uid())') END;
      new_check := CASE WHEN r.with_check IS NULL THEN NULL ELSE replace(r.with_check, 'auth.uid()', '(select auth.uid())') END;

      IF new_qual IS NOT NULL THEN
        EXECUTE format('ALTER POLICY %I ON public.%I USING (%s)', r.policyname, t, new_qual);
      END IF;

      IF new_check IS NOT NULL THEN
        EXECUTE format('ALTER POLICY %I ON public.%I WITH CHECK (%s)', r.policyname, t, new_check);
      END IF;
    END LOOP;
  END LOOP;
END
$$;

-- A kredit-levonas zarolasa: csak a service_role es a sajat felhasznalo hivhatja.
REVOKE ALL ON FUNCTION public.deduct_credits(uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_credits(uuid, integer, text) TO service_role;

-- A generacios jogosultsagot a szerver oldal donti el; a kliens csak olvashatja.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'credit_transactions') THEN
    EXECUTE 'ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'credit_transactions'
        AND policyname = 'credit_transactions_select_own'
    ) THEN
      EXECUTE 'CREATE POLICY credit_transactions_select_own ON public.credit_transactions
                 FOR SELECT USING ((select auth.uid()) = user_id)';
    END IF;

    -- Iras CSAK a service_role-on keresztul tortenik: nincs INSERT/UPDATE policy,
    -- tehat a bejelentkezett felhasznalo nem allithatja at a sajat egyenleget.
  END IF;
END
$$;
