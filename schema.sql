-- Exam Management System - Complete Schema
-- Please copy and run ALL of this in your Supabase SQL Editor.

-- 1. Create a Helper Function for Role checking to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 2. User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Teacher')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;

CREATE POLICY "Admins can read all roles" ON public.user_roles
    FOR SELECT USING ( public.get_auth_role() = 'Admin' );

CREATE POLICY "Users can read own role" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- 3. Exams Table
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    program TEXT, -- BHM, BIM, BBS, B.Ed, MBS
    year_or_semester TEXT,
    exam_type TEXT, -- First Internal, Final Internal
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    result_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Upcoming', 'Ongoing', 'Completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Exams are viewable by authenticated users" ON public.exams;
DROP POLICY IF EXISTS "Admins can insert exams" ON public.exams;
DROP POLICY IF EXISTS "Admins can update exams" ON public.exams;

CREATE POLICY "Exams are viewable by authenticated users" ON public.exams
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert exams" ON public.exams
    FOR INSERT WITH CHECK ( public.get_auth_role() = 'Admin' );

CREATE POLICY "Admins can update exams" ON public.exams
    FOR UPDATE USING ( public.get_auth_role() = 'Admin' );

-- 4. Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Subjects are viewable by authenticated users" ON public.subjects;
DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;

CREATE POLICY "Subjects are viewable by authenticated users" ON public.subjects
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage subjects" ON public.subjects
    FOR ALL USING ( public.get_auth_role() = 'Admin' );

-- 5. Exam Subjects (Links exams to subjects with specific FM/PM)
CREATE TABLE IF NOT EXISTS public.exam_subjects (
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    full_marks NUMERIC NOT NULL DEFAULT 100,
    pass_marks NUMERIC NOT NULL DEFAULT 40,
    PRIMARY KEY (exam_id, subject_id)
);

ALTER TABLE public.exam_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Exam subjects viewable by authenticated" ON public.exam_subjects;
DROP POLICY IF EXISTS "Admins can manage exam subjects" ON public.exam_subjects;

CREATE POLICY "Exam subjects viewable by authenticated" ON public.exam_subjects
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage exam subjects" ON public.exam_subjects
    FOR ALL USING ( public.get_auth_role() = 'Admin' );

-- 6. Teacher Subjects Mapping
CREATE TABLE IF NOT EXISTS public.teacher_subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    UNIQUE(teacher_id, subject_id)
);

ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view mapped teacher subjects" ON public.teacher_subjects;
DROP POLICY IF EXISTS "Admins can manage teacher subjects" ON public.teacher_subjects;

CREATE POLICY "Users can view mapped teacher subjects" ON public.teacher_subjects
    FOR SELECT TO authenticated USING (
        auth.uid() = teacher_id OR public.get_auth_role() = 'Admin'
    );

CREATE POLICY "Admins can manage teacher subjects" ON public.teacher_subjects
    FOR ALL USING ( public.get_auth_role() = 'Admin' );

-- 7. Results (Marks Entry)
CREATE TABLE IF NOT EXISTS public.results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_name TEXT NOT NULL,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    marks NUMERIC NOT NULL,
    result TEXT, -- 'Pass' or 'Fail' or nullable
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(student_name, exam_id, subject_id)
);

ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Results viewable by authenticated" ON public.results;
DROP POLICY IF EXISTS "Admins can manage all results" ON public.results;
DROP POLICY IF EXISTS "Teachers can insert results" ON public.results;
DROP POLICY IF EXISTS "Teachers can update results" ON public.results;

CREATE POLICY "Results viewable by authenticated" ON public.results
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage all results" ON public.results
    FOR ALL USING ( public.get_auth_role() = 'Admin' );

CREATE POLICY "Teachers can insert results" ON public.results
    FOR INSERT WITH CHECK ( public.get_auth_role() = 'Teacher' );

CREATE POLICY "Teachers can update results" ON public.results
    FOR UPDATE USING ( public.get_auth_role() = 'Teacher' );

-- Insert default subjects (BIM 8th Sem example) with FIXED UUIDs to match UI hardcoding
INSERT INTO public.subjects (id, name, code) VALUES
('00000000-0000-0000-0000-000000000229', 'IT Entrepreneurship and Supply Chain Management', 'IT 229'),
('00000000-0000-0000-0000-000000000230', 'Economics of Information and Communication', 'IT 230'),
('00000000-0000-0000-0000-000000000306', 'Software Project Management', 'IT 306'),
('00000000-0000-0000-0000-000000000307', 'Operating Systems', 'IT 307'),
('00000000-0000-0000-0000-000000000308', 'Data Mining and Data Warehousing', 'IT 308'),
('00000000-0000-0000-0000-000000000350', 'Internship', 'IT 350')
ON CONFLICT (id) DO NOTHING;
