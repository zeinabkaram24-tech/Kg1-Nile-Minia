-- ============================================================
-- Nile Egyptian International School - Supabase Database Schema
-- Run this script in the Supabase SQL Editor (SQL Query)
-- ============================================================

-- 1. Table: classwork (الدروس والخطة الصفية)
CREATE TABLE IF NOT EXISTS public.classwork (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL,
    day TEXT NOT NULL,
    period INTEGER NOT NULL,
    subject TEXT NOT NULL,
    title TEXT NOT NULL,
    details TEXT,
    pages TEXT,
    completed BOOLEAN DEFAULT false,
    block INTEGER DEFAULT 1,
    week INTEGER DEFAULT 1,
    link_url TEXT,
    link_title TEXT,
    links JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Table: homework (الواجبات المدرسية)
CREATE TABLE IF NOT EXISTS public.homework (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL,
    assigned_day TEXT NOT NULL,
    due_day TEXT NOT NULL,
    subject TEXT NOT NULL,
    task TEXT NOT NULL,
    details TEXT,
    pages TEXT,
    completed BOOLEAN DEFAULT false,
    priority TEXT DEFAULT 'normal',
    block INTEGER DEFAULT 1,
    week INTEGER DEFAULT 1,
    link_url TEXT,
    link_title TEXT,
    links JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Table: timetables (جداول الحصص المدرسية للفصول)
CREATE TABLE IF NOT EXISTS public.timetables (
    class_id TEXT PRIMARY KEY,
    schedule JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Table: student_progress (إنجازات وتقدم الطلاب)
CREATE TABLE IF NOT EXISTS public.student_progress (
    student_name TEXT PRIMARY KEY,
    class_id TEXT,
    completed_classwork_ids JSONB DEFAULT '[]'::jsonb,
    completed_homework_ids JSONB DEFAULT '[]'::jsonb,
    last_active BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for high-performance filtering
CREATE INDEX IF NOT EXISTS idx_classwork_class_day ON public.classwork(class_id, day);
CREATE INDEX IF NOT EXISTS idx_classwork_block_week ON public.classwork(block, week);
CREATE INDEX IF NOT EXISTS idx_homework_class ON public.homework(class_id);
CREATE INDEX IF NOT EXISTS idx_homework_assigned_due ON public.homework(assigned_day, due_day);

-- Enable Row Level Security (RLS)
ALTER TABLE public.classwork ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

-- Permissive policies for Anon and Authenticated roles
DROP POLICY IF EXISTS "Allow public read access to classwork" ON public.classwork;
CREATE POLICY "Allow public read access to classwork" ON public.classwork FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public write access to classwork" ON public.classwork;
CREATE POLICY "Allow public write access to classwork" ON public.classwork FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access to homework" ON public.homework;
CREATE POLICY "Allow public read access to homework" ON public.homework FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public write access to homework" ON public.homework;
CREATE POLICY "Allow public write access to homework" ON public.homework FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access to timetables" ON public.timetables;
CREATE POLICY "Allow public read access to timetables" ON public.timetables FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public write access to timetables" ON public.timetables;
CREATE POLICY "Allow public write access to timetables" ON public.timetables FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to student_progress" ON public.student_progress;
CREATE POLICY "Allow public access to student_progress" ON public.student_progress FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for all tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'classwork'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.classwork;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'homework'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.homework;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'timetables'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.timetables;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'student_progress'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_progress;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
