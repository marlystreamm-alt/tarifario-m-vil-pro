REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='block_security_events_mutation') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.block_security_events_mutation() FROM PUBLIC, anon, authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='prevent_security_event_mutation') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.prevent_security_event_mutation() FROM PUBLIC, anon, authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='update_updated_at_column') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated';
  END IF;
END $$;