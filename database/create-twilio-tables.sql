-- ============================================
-- CREATE TWILIO COMMUNICATION & AUTOMATION TABLES
-- ============================================

-- 1. Communication Logs Table (SMS, WhatsApp, Voice Calls)
CREATE TABLE IF NOT EXISTS public.communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  card_id UUID REFERENCES public.pipeline_cards(id) ON DELETE SET NULL,
  channel VARCHAR(50) NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'voice', 'email')),
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_number VARCHAR(100),
  recipient_number VARCHAR(100) NOT NULL,
  message_body TEXT,
  call_duration_seconds INT DEFAULT 0,
  recording_url TEXT,
  status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'completed', 'received')),
  twilio_sid VARCHAR(255),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Pipeline Stage Automation Rules
CREATE TABLE IF NOT EXISTS public.pipeline_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID REFERENCES public.pipeline_stages(id) ON DELETE CASCADE,
  trigger_event VARCHAR(100) NOT NULL DEFAULT 'on_stage_entry',
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('send_sms', 'send_whatsapp', 'create_task', 'log_call_prompt')),
  template_body TEXT NOT NULL,
  delay_minutes INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_comm_logs_deal ON public.communication_logs(deal_id);
CREATE INDEX IF NOT EXISTS idx_comm_logs_client ON public.communication_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_comm_logs_card ON public.communication_logs(card_id);
CREATE INDEX IF NOT EXISTS idx_comm_logs_channel ON public.communication_logs(channel);
CREATE INDEX IF NOT EXISTS idx_auto_rules_stage ON public.pipeline_automation_rules(stage_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_automation_rules ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Allow full access to communication_logs" ON public.communication_logs;
CREATE POLICY "Allow full access to communication_logs" 
ON public.communication_logs FOR ALL 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access to pipeline_automation_rules" ON public.pipeline_automation_rules;
CREATE POLICY "Allow full access to pipeline_automation_rules" 
ON public.pipeline_automation_rules FOR ALL 
USING (true) 
WITH CHECK (true);

-- 6. Verification Output
SELECT 'Twilio tables created successfully!' AS status;
