-- =============================================================================
-- Supabase Schema for Nile Egyptian International School Planner (Grade 2)
-- Generated for initialData.json & Full CRUD Operations
-- =============================================================================

-- 1. Create Classwork Table
CREATE TABLE IF NOT EXISTS public.classwork (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL,
    day TEXT NOT NULL,
    period INTEGER NOT NULL,
    subject TEXT NOT NULL,
    title TEXT NOT NULL,
    details TEXT,
    pages TEXT,
    completed BOOLEAN DEFAULT false NOT NULL,
    week INTEGER DEFAULT 1 NOT NULL,
    block INTEGER DEFAULT 1 NOT NULL,
    link_url TEXT,
    link_title TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Homework Table
CREATE TABLE IF NOT EXISTS public.homework (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL,
    assigned_day TEXT NOT NULL,
    due_day TEXT NOT NULL,
    subject TEXT NOT NULL,
    task TEXT NOT NULL,
    details TEXT,
    pages TEXT,
    completed BOOLEAN DEFAULT false NOT NULL,
    priority TEXT DEFAULT 'normal' NOT NULL,
    week INTEGER DEFAULT 1 NOT NULL,
    block INTEGER DEFAULT 1 NOT NULL,
    is_link_task BOOLEAN DEFAULT false NOT NULL,
    link_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Planner Settings Table (for storing active class, week, day, etc.)
CREATE TABLE IF NOT EXISTS public.planner_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Student Progress Table (for saving student completed items)
CREATE TABLE IF NOT EXISTS public.student_progress (
    student_name TEXT PRIMARY KEY,
    class_id TEXT,
    completed_classwork_ids JSONB DEFAULT '[]'::jsonb NOT NULL,
    completed_homework_ids JSONB DEFAULT '[]'::jsonb NOT NULL,
    last_active BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint NOT NULL
);

-- 5. Create Materials Table (for storing uploaded PDFs, metadata & storage URLs)
CREATE TABLE IF NOT EXISTS public.materials (
    id TEXT PRIMARY KEY,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    block INTEGER NOT NULL,
    section TEXT NOT NULL,
    class_id TEXT DEFAULT 'ALL',
    storage_url TEXT,
    file_data TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================================================
-- Indexes for High Performance Queries
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_classwork_class_week_block ON public.classwork (class_id, week, block);
CREATE INDEX IF NOT EXISTS idx_classwork_day_period ON public.classwork (day, period);
CREATE INDEX IF NOT EXISTS idx_homework_class_week_block ON public.homework (class_id, week, block);
CREATE INDEX IF NOT EXISTS idx_homework_assigned_due ON public.homework (assigned_day, due_day);
CREATE INDEX IF NOT EXISTS idx_materials_block_section ON public.materials (block, section);

-- =============================================================================
-- Enable Row Level Security (RLS) & Add Public Policies
-- =============================================================================
ALTER TABLE public.classwork ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- Allow Public (anon) and Authenticated full CRUD access
DROP POLICY IF EXISTS "Public classwork access" ON public.classwork;
CREATE POLICY "Public classwork access" ON public.classwork
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public homework access" ON public.homework;
CREATE POLICY "Public homework access" ON public.homework
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public planner_settings access" ON public.planner_settings;
CREATE POLICY "Public planner_settings access" ON public.planner_settings
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public student_progress access" ON public.student_progress;
CREATE POLICY "Public student_progress access" ON public.student_progress
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public materials access" ON public.materials;
CREATE POLICY "Public materials access" ON public.materials
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- Supabase Storage Bucket for Materials ('school_materials')
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('school_materials', 'school_materials', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Public Access to school_materials" ON storage.objects;
CREATE POLICY "Public Access to school_materials" ON storage.objects
    FOR ALL
    TO anon, authenticated
    USING (bucket_id = 'school_materials')
    WITH CHECK (bucket_id = 'school_materials');

-- Enable Realtime subscriptions for live updates across devices
ALTER PUBLICATION supabase_realtime ADD TABLE public.classwork;
ALTER PUBLICATION supabase_realtime ADD TABLE public.homework;
ALTER PUBLICATION supabase_realtime ADD TABLE public.planner_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.materials;

