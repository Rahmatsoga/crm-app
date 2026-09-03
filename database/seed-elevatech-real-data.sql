-- ============================================
-- ELEVATECH CRM - PRODUCTION SEED DATA
-- ============================================
-- Company: Elevatech
-- Date: September 2026
-- ============================================

-- STEP 1: Clean up old test data (optional)
DELETE FROM deals WHERE title IN ('sds', 'jag pipeline', 'test deal');
DELETE FROM clients WHERE name IN ('jag', 'Ashad bhai', 'faseeh bhai', 'asd', 'sad');

-- STEP 2: Insert Real Users (Team Members for Elevatech)
INSERT INTO users (
  id, 
  email, 
  first_name, 
  last_name, 
  role, 
  created_at, 
  updated_at
) VALUES 
  (gen_random_uuid(), 'rahmat@elevatech.com', 'Rahmat', 'Admin', 'admin', NOW(), NOW()),
  (gen_random_uuid(), 'maaz@elevatech.com', 'Maaz', 'Sales Rep', 'sales', NOW(), NOW()),
  (gen_random_uuid(), 'usama@elevatech.com', 'Usama', 'Support', 'support', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- STEP 3: Insert Real Elevatech Clients
INSERT INTO clients (
  id,
  name,
  email,
  phone,
  company_name,
  status,
  created_at,
  updated_at
) VALUES
  (gen_random_uuid(), 'Sarah Johnson', 'sarah@apexdental.com', '+92-300-123-4567', 'Apex Dental Group', 'active', NOW(), NOW()),
  (gen_random_uuid(), 'Mike Chen', 'mike@vanguardre.com', '+92-300-234-5678', 'Vanguard Real Estate', 'active', NOW(), NOW()),
  (gen_random_uuid(), 'Jessica Lee', 'jessica@saasify.io', '+1-415-555-0123', 'SaaSify Scale', 'prospect', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- STEP 4: Insert Real Deals for Elevatech Projects
INSERT INTO deals (
  id,
  title,
  client_id,
  value,
  probability,
  stage,
  status,
  expected_close_date,
  created_at,
  updated_at
) 
SELECT 
  gen_random_uuid(),
  'Voice AI Appointment Assistant',
  c.id,
  50000,
  75,
  'proposal',
  'open',
  '2026-09-30'::date,
  NOW(),
  NOW()
FROM clients c WHERE c.company_name = 'Apex Dental Group' OR c.name = 'Sarah Johnson'
LIMIT 1;

INSERT INTO deals (
  id,
  title,
  client_id,
  value,
  probability,
  stage,
  status,
  expected_close_date,
  created_at,
  updated_at
) 
SELECT 
  gen_random_uuid(),
  'Multi-Channel Lead Triage Engine',
  c.id,
  75000,
  40,
  'contacted',
  'open',
  '2026-10-31'::date,
  NOW(),
  NOW()
FROM clients c WHERE c.company_name = 'SaaSify Scale' OR c.name = 'Jessica Lee'
LIMIT 1;

INSERT INTO deals (
  id,
  title,
  client_id,
  value,
  probability,
  stage,
  status,
  expected_close_date,
  created_at,
  updated_at
) 
SELECT 
  gen_random_uuid(),
  'Enterprise Web Scraper & GHL Data Sync',
  c.id,
  60000,
  60,
  'negotiation',
  'open',
  '2026-11-30'::date,
  NOW(),
  NOW()
FROM clients c WHERE c.company_name = 'Vanguard Real Estate' OR c.name = 'Mike Chen'
LIMIT 1;

-- STEP 5: Verification Queries
SELECT '--- ELEVATECH USERS ---' as section;
SELECT email, role, created_at FROM users WHERE email LIKE '%@elevatech.com';

SELECT '--- ELEVATECH CLIENTS ---' as section;
SELECT name, company_name, email, status FROM clients WHERE company_name IN ('Apex Dental Group', 'Vanguard Real Estate', 'SaaSify Scale');

SELECT '--- ELEVATECH DEALS ---' as section;
SELECT title, value, probability, stage FROM deals WHERE title LIKE 'Voice AI%' OR title LIKE 'Multi-Channel%' OR title LIKE 'Enterprise%';
