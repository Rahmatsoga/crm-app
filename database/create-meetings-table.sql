-- ===================================================
-- ELEVATECH CRM — GOOGLE CALENDAR & ZOOM MEETINGS SCHEMA
-- ===================================================

CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  card_id UUID REFERENCES public.pipeline_cards(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  meeting_type VARCHAR(100) DEFAULT 'discovery_call' CHECK (meeting_type IN ('discovery_call', 'proposal_review', 'voiceover_review', 'demo', 'project_kickoff')),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location_or_url TEXT,
  zoom_join_url TEXT,
  google_calendar_url TEXT,
  host_name VARCHAR(100) DEFAULT 'Rahmat (Admin)',
  notes TEXT,
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated team members to read and manage meetings
CREATE POLICY "Authenticated users can read meetings" ON public.meetings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage meetings" ON public.meetings
  FOR ALL USING (auth.role() = 'authenticated');
