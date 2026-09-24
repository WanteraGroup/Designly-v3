-- DESIGNLY security/performance hardening
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor_user_id ON public.admin_audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target_user_id ON public.admin_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_gifts_granted_by ON public.admin_gifts(granted_by);
CREATE INDEX IF NOT EXISTS idx_admin_gifts_plan_id ON public.admin_gifts(plan_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_jobs_campaign_id ON public.ai_generation_jobs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_jobs_project_id ON public.ai_generation_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_campaign_items_project_id ON public.campaign_items(project_id);
CREATE INDEX IF NOT EXISTS idx_campaign_items_user_id ON public.campaign_items(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_brand_kit_id ON public.campaigns(brand_kit_id);
CREATE INDEX IF NOT EXISTS idx_music_generations_user_id ON public.music_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_payment_id ON public.payment_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_project_assets_project_id ON public.project_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_brand_kit_id ON public.projects(brand_kit_id);

REVOKE EXECUTE ON FUNCTION public.get_generation_costs() FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, text) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_generation_costs(jsonb) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_my_profile(text, text) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_my_profile(text, text, text) FROM PUBLIC, authenticated;

CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id uuid,
  p_amount integer,
  p_description text DEFAULT ''
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile profiles%ROWTYPE;
  v_new_balance integer;
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 100000 THEN
    RAISE EXCEPTION 'Invalid credit amount';
  END IF;
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;

  IF v_profile.role IN ('owner','admin') THEN
    IF v_profile.credits < p_amount THEN RETURN false; END IF;
  ELSIF v_profile.unlimited_access = true THEN
    INSERT INTO credit_transactions (user_id, amount, type, description, balance_after)
    VALUES (
      p_user_id, 0, 'generation',
      left(coalesce(p_description, ''), 500) || ' (GIFTED FULL UNLOCK - no deduction)',
      v_profile.credits
    );
    RETURN true;
  ELSIF v_profile.credits < p_amount THEN
    RETURN false;
  END IF;

  v_new_balance := v_profile.credits - p_amount;
  UPDATE profiles SET credits = v_new_balance, updated_at = now() WHERE id = p_user_id;
  INSERT INTO credit_transactions (user_id, amount, type, description, balance_after)
  VALUES (p_user_id, -p_amount, 'generation', left(coalesce(p_description, ''), 500), v_new_balance);
  RETURN true;
END;
$function$;

ALTER FUNCTION public.update_my_profile(text, text) SECURITY INVOKER;
ALTER FUNCTION public.update_my_profile(text, text, text) SECURITY INVOKER;

DROP POLICY IF EXISTS campaigns_public_demo ON public.campaigns;
DROP POLICY IF EXISTS leads_public_demo ON public.leads;
DROP POLICY IF EXISTS suppression_public_demo ON public.suppression_list;

DO $$
DECLARE
  r record;
  new_qual text;
  new_check text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
  LOOP
    new_qual := CASE WHEN r.qual IS NULL THEN NULL ELSE replace(r.qual, 'auth.uid()', '(select auth.uid())') END;
    new_check := CASE WHEN r.with_check IS NULL THEN NULL ELSE replace(r.with_check, 'auth.uid()', '(select auth.uid())') END;

    IF new_qual IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)', r.policyname, r.schemaname, r.tablename, new_qual);
    END IF;

    IF new_check IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I WITH CHECK (%s)', r.policyname, r.schemaname, r.tablename, new_check);
    END IF;
  END LOOP;
END
$$;
