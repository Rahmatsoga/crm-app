-- ============================================
-- CREATE CUSTOM PIPELINE SYSTEM TABLES
-- ============================================

-- Table 1: Custom Pipelines
CREATE TABLE IF NOT EXISTS public.custom_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  project_id UUID,
  pipeline_name VARCHAR(255) NOT NULL,
  description TEXT,
  stage_count INT NOT NULL DEFAULT 5,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Table 2: Pipeline Stages
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL,
  stage_name VARCHAR(255) NOT NULL,
  stage_order INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (pipeline_id) REFERENCES custom_pipelines(id) ON DELETE CASCADE,
  UNIQUE(pipeline_id, stage_order)
);

-- Table 3: Pipeline Cards (Deals/Tasks in Stages)
CREATE TABLE IF NOT EXISTS public.pipeline_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL,
  deal_id UUID,
  card_title VARCHAR(255) NOT NULL,
  card_value DECIMAL(12,2),
  assigned_to UUID,
  card_order INT DEFAULT 0,
  checklist JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (stage_id) REFERENCES pipeline_stages(id) ON DELETE CASCADE,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_pipelines_tenant ON custom_pipelines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_project ON custom_pipelines(project_id);
CREATE INDEX IF NOT EXISTS idx_stages_pipeline ON pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_cards_stage ON pipeline_cards(stage_id);
CREATE INDEX IF NOT EXISTS idx_cards_deal ON pipeline_cards(deal_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.custom_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_cards ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE PERMISSIVE / AUTH POLICIES
-- ============================================
-- Custom Pipelines Policy
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'custom_pipelines' AND policyname = 'Allow authenticated users full access to custom_pipelines'
  ) THEN
    CREATE POLICY "Allow authenticated users full access to custom_pipelines" 
    ON custom_pipelines FOR ALL 
    USING (auth.role() = 'authenticated' OR auth.role() = 'anon') 
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
  END IF;
END $$;

-- Pipeline Stages Policy
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pipeline_stages' AND policyname = 'Allow authenticated users full access to pipeline_stages'
  ) THEN
    CREATE POLICY "Allow authenticated users full access to pipeline_stages" 
    ON pipeline_stages FOR ALL 
    USING (auth.role() = 'authenticated' OR auth.role() = 'anon') 
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
  END IF;
END $$;

-- Pipeline Cards Policy
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pipeline_cards' AND policyname = 'Allow authenticated users full access to pipeline_cards'
  ) THEN
    CREATE POLICY "Allow authenticated users full access to pipeline_cards" 
    ON pipeline_cards FOR ALL 
    USING (auth.role() = 'authenticated' OR auth.role() = 'anon') 
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
  END IF;
END $$;

-- ============================================
-- VERIFY TABLES CREATED
-- ============================================
SELECT 'Pipeline Tables created successfully!' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('custom_pipelines', 'pipeline_stages', 'pipeline_cards');
