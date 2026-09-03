-- ============================================
-- ELEVATECH CRM - PRODUCTION SEED DATA (FIXED UUIDs)
-- ============================================

-- STEP 1: Insert Real Elevatech Clients
INSERT INTO public.clients (id, name, email, phone, company_name, status, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Sarah Johnson', 'sarah@apexdental.com', '+92-300-123-4567', 'Apex Dental Group', 'active', NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Mike Chen', 'mike@vanguardre.com', '+92-300-234-5678', 'Vanguard Real Estate', 'active', NOW()),
  ('33333333-3333-3333-3333-333333333333', 'Jessica Lee', 'jessica@saasify.io', '+1-415-555-0123', 'SaaSify Scale', 'lead', NOW())
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  company_name = EXCLUDED.company_name,
  status = EXCLUDED.status;

-- STEP 2: Insert Real Elevatech Deals
INSERT INTO public.deals (id, title, client_id, value, stage, created_at) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Voice AI Appointment Assistant', '11111111-1111-1111-1111-111111111111', 50000, 'proposal', NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Multi-Channel Lead Triage Engine', '33333333-3333-3333-3333-333333333333', 75000, 'contacted', NOW()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Enterprise Web Scraper & GHL Data Sync', '22222222-2222-2222-2222-222222222222', 60000, 'negotiation', NOW())
ON CONFLICT (id) DO UPDATE SET 
  title = EXCLUDED.title,
  client_id = EXCLUDED.client_id,
  value = EXCLUDED.value,
  stage = EXCLUDED.stage;

-- STEP 3: Verification
SELECT name, company_name, email, status FROM public.clients;
SELECT title, value, stage FROM public.deals;
