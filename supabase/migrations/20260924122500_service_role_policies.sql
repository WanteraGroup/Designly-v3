-- DESIGNLY V3 — explicit service-role policies for isolated lead tables
DROP POLICY IF EXISTS leads_service_role_access ON public.leads;
CREATE POLICY leads_service_role_access
ON public.leads
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS suppression_service_role_access ON public.suppression_list;
CREATE POLICY suppression_service_role_access
ON public.suppression_list
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
