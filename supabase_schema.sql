-- ==============================================================================
-- Nile Egyptian International School - KG 1 App Database Schema (Supabase)
-- Full SQL Setup: Tables, Storage Bucket, RLS Policies, Realtime Publication
-- ==============================================================================

-- 1. Enable UUID Extension (if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. CREATE DATABASE TABLES
-- ==============================================================================

-- Table 1: classwork (الدروس والخطة الأسبوعية لكل حصة)
CREATE TABLE IF NOT EXISTS public.classwork (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL,           -- 'KG1A', 'KG1B', 'KG1C', 'KG1D', 'KG1E' or 'ALL'
    day TEXT NOT NULL,                -- 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'
    period INTEGER NOT NULL,          -- 1 to 6
    subject TEXT NOT NULL,            -- 'Mathematics', 'English', 'Arabic', 'Science', etc.
    title TEXT NOT NULL,              -- Lesson title
    details TEXT,                     -- Lesson details / instructions
    pages TEXT,                       -- Student book pages / workbook
    completed BOOLEAN DEFAULT false,  -- Completion status
    block INTEGER DEFAULT 1,          -- Topic 1, 2, 3, 4
    week INTEGER DEFAULT 1,           -- Week 1, 2, 3, 4
    link_url TEXT,                    -- Video link or resource URL
    link_title TEXT,                  -- Video title
    links JSONB DEFAULT '[]'::jsonb,  -- Array of structured links [{url, title, type}]
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table 2: homework (الواجبات المنزلية المقررة ومواعيد التسليم)
CREATE TABLE IF NOT EXISTS public.homework (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL,           -- 'KG1A', 'KG1B', 'KG1C', 'KG1D', 'KG1E' or 'ALL'
    assigned_day TEXT NOT NULL,       -- School day assigned
    due_day TEXT NOT NULL,            -- School day due for submission
    subject TEXT NOT NULL,            -- Subject name
    task TEXT NOT NULL,               -- Assignment description
    details TEXT,                     -- Detailed task notes
    pages TEXT,                       -- Book / workbook pages
    completed BOOLEAN DEFAULT false,  -- Completed checkmark
    priority TEXT DEFAULT 'normal',   -- 'normal' | 'urgent'
    block INTEGER DEFAULT 1,          -- Topic 1, 2, 3, 4
    week INTEGER DEFAULT 1,           -- Week 1, 2, 3, 4
    link_url TEXT,                    -- Link to digital homework or video
    link_title TEXT,                  -- Link title
    links JSONB DEFAULT '[]'::jsonb,  -- Array of structured links [{url, title, type}]
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table 3: timetables (جداول الحصص الأسبوعية لكل فصل)
CREATE TABLE IF NOT EXISTS public.timetables (
    class_id TEXT PRIMARY KEY,        -- 'KG1A', 'KG1B', 'KG1C', 'KG1D', 'KG1E'
    schedule JSONB NOT NULL,          -- Full 6-day timetable mapping
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table 4: student_progress (سجل إنجازات الطلاب الفردية)
CREATE TABLE IF NOT EXISTS public.student_progress (
    student_name TEXT PRIMARY KEY,    -- Student unique name
    class_id TEXT,                    -- Class ID
    completed_classwork_ids JSONB DEFAULT '[]'::jsonb,
    completed_homework_ids JSONB DEFAULT '[]'::jsonb,
    last_active BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table 5: materials (سجل ملفات الماتيريال والكتب والـ PDFs)
CREATE TABLE IF NOT EXISTS public.materials (
    id TEXT PRIMARY KEY,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_data TEXT,                   -- Base64 preview (optional fallback)
    file_url TEXT,                    -- Direct Supabase Storage public URL
    block INTEGER NOT NULL DEFAULT 1, -- Topic 1, 2, 3, 4
    section TEXT NOT NULL DEFAULT 'Main sheet', -- 'Main sheet', 'Week 1', etc.
    class_id TEXT DEFAULT 'ALL',      -- Class target or 'ALL'
    title TEXT,
    category TEXT,
    notes TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table 6: planner_settings (إعدادات التيرم والـ Topic والأسبوع النشط)
CREATE TABLE IF NOT EXISTS public.planner_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    current_block INTEGER DEFAULT 1,
    current_week INTEGER DEFAULT 1,
    active_term TEXT DEFAULT 'Term 2',
    settings JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table 7: tomorrow_notes (ملاحظات تحضير الغد وأدوات الحقيبة المدرسية)
CREATE TABLE IF NOT EXISTS public.tomorrow_notes (
    id TEXT PRIMARY KEY,
    class_id TEXT DEFAULT 'ALL',
    target_day TEXT NOT NULL,         -- Sunday, Monday, Tuesday, Wednesday, Thursday
    subject TEXT,
    note TEXT NOT NULL,
    arabic_note TEXT,
    bag_item TEXT,
    block INTEGER DEFAULT 1,
    week INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 3. INITIAL SEEDING FOR GLOBAL SETTINGS
-- ==============================================================================
INSERT INTO public.planner_settings (id, current_block, current_week, active_term, settings)
VALUES ('global', 1, 1, 'Term 2', '{"school": "Nile Egyptian International School", "grade": "KG 1"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) & POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.classwork ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tomorrow_notes ENABLE ROW LEVEL SECURITY;

-- Drop policies if re-running to avoid duplicate errors
DROP POLICY IF EXISTS "Public full access to classwork" ON public.classwork;
DROP POLICY IF EXISTS "Public full access to homework" ON public.homework;
DROP POLICY IF EXISTS "Public full access to timetables" ON public.timetables;
DROP POLICY IF EXISTS "Public full access to student_progress" ON public.student_progress;
DROP POLICY IF EXISTS "Public full access to materials" ON public.materials;
DROP POLICY IF EXISTS "Public full access to planner_settings" ON public.planner_settings;
DROP POLICY IF EXISTS "Public full access to tomorrow_notes" ON public.tomorrow_notes;

-- Create open access policies for school community (Students, Parents, Teachers)
CREATE POLICY "Public full access to classwork"
    ON public.classwork FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Public full access to homework"
    ON public.homework FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Public full access to timetables"
    ON public.timetables FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Public full access to student_progress"
    ON public.student_progress FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Public full access to materials"
    ON public.materials FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Public full access to planner_settings"
    ON public.planner_settings FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Public full access to tomorrow_notes"
    ON public.tomorrow_notes FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 5. SUPABASE STORAGE BUCKET FOR PDF MATERIALS & ACTIVITIES
-- ==============================================================================

-- Create the public bucket 'materials' if it does not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'materials',
    'materials',
    true,
    52428800, -- 50 MB max file size
    ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies for 'materials' bucket
DROP POLICY IF EXISTS "Materials Bucket Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Materials Bucket Public Insert" ON storage.objects;
DROP POLICY IF EXISTS "Materials Bucket Public Update" ON storage.objects;
DROP POLICY IF EXISTS "Materials Bucket Public Delete" ON storage.objects;

CREATE POLICY "Materials Bucket Public Read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'materials');

CREATE POLICY "Materials Bucket Public Insert"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'materials');

CREATE POLICY "Materials Bucket Public Update"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'materials')
    WITH CHECK (bucket_id = 'materials');

CREATE POLICY "Materials Bucket Public Delete"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'materials');

-- ==============================================================================
-- 6. REALTIME SUBSCRIPTIONS PUBLICATION
-- ==============================================================================

-- Safely add tables to supabase_realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.classwork;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.homework;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.timetables;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_progress;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.materials;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.planner_settings;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tomorrow_notes;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
