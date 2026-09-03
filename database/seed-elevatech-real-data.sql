-- ============================================
-- ELEVATECH CRM - PRODUCTION SEED DATA
-- ============================================
-- Company: Elevatech
-- Date: September 2026
-- ============================================

-- STEP 1: Insert Real Elevatech Clients (matching public.clients schema)
INSERT INTO public.clients (
  id,
  name,
  email,
  phone,
  company_name,
  status,
  created_at
) VALUES
  (gen_random_uuid(), 'Sarah Johnson', 'sarah@apexdental.com', '+92-300-123-4567', 'Apex Dental Group', 'active', NOW()),
  (gen_random_uuid(), 'Mike Chen', 'mike@vanguardre.com', '+92-300-234-5678', 'Vanguard Real Estate', 'active', NOW()),
  (gen_random_uuid(), 'Jessica Lee', 'jessica@saasify.io', '+1-415-555-0123', 'SaaSify Scale', 'lead', NOW())
ON CONFLICT DO NOTHING;

-- STEP 2: Insert Real Deals for Elevatech Projects (matching public.deals schema)
INSERT INTO public.deals (
  id,
  title,
  client_id,
  value,
  stage,
  created_at
) 
SELECT 
  gen_random_uuid(),
  'Voice AI Appointment Assistant',
  c.id,
  50000,
  'proposal',
  NOW()
FROM public.clients c WHERE c.company_name = 'Apex Dental Group' OR c.name = 'Sarah Johnson'
LIMIT 1;

INSERT INTO public.deals (
  id,
  title,
  client_id,
  value,
  stage,
  created_at
) 
SELECT 
  gen_random_uuid(),
  'Multi-Channel Lead Triage Engine',
  c.id,
  75000,
  'contacted',
  NOW()
FROM public.clients c WHERE c.company_name = 'SaaSify Scale' OR c.name = 'Jessica Lee'
LIMIT 1;

INSERT INTO public.deals (
  id,
  title,
  client_id,
  value,
  stage,
  created_at
) 
SELECT 
  gen_random_uuid(),
  'Enterprise Web Scraper & GHL Data Sync',
  c.id,
  60000,
  'negotiation',
  NOW()
FROM public.clients c WHERE c.company_name = 'Vanguard Real Estate' OR c.name = 'Mike Chen'
LIMIT 1;

-- STEP 3: Verification Queries
SELECT '--- ELEVATECH CLIENTS ---' as section;
SELECT name, company_name, email, status FROM public.clients WHERE company_name IN ('Apex Dental Group', 'Vanguard Real Estate', 'SaaSify Scale');

SELECT '--- ELEVATECH DEALS ---' as section;
SELECT title, value, stage FROM public.deals WHERE title LIKE 'Voice AI%' OR title LIKE 'Multi-Channel%' OR title LIKE 'Enterprise%';
