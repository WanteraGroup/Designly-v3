-- Keep credit deduction server-side only.
REVOKE EXECUTE ON FUNCTION public.deduct_credits(uuid, integer, text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_credits(uuid, integer, text) TO service_role;
