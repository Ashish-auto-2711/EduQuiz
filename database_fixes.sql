-- 1. Enable RLS on subjects, chapters, quizzes, questions
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects FORCE ROW LEVEL SECURITY;

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters FORCE ROW LEVEL SECURITY;

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes FORCE ROW LEVEL SECURITY;

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions FORCE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public read" ON public.subjects;
DROP POLICY IF EXISTS "Allow admin write" ON public.subjects;
DROP POLICY IF EXISTS "Allow public read" ON public.chapters;
DROP POLICY IF EXISTS "Allow admin write" ON public.chapters;
DROP POLICY IF EXISTS "Allow public read" ON public.quizzes;
DROP POLICY IF EXISTS "Allow admin write" ON public.quizzes;
DROP POLICY IF EXISTS "Allow public read" ON public.questions;
DROP POLICY IF EXISTS "Allow admin write" ON public.questions;

-- 3. Create SELECT policies (accessible by anyone)
CREATE POLICY "Allow public read" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.chapters FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.questions FOR SELECT USING (true);

-- 4. Create admin write policies checking SUPER_ADMIN role in users table
CREATE POLICY "Allow admin write" ON public.subjects FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE public.users.id = (coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{"sub":"00000000-0000-0000-0000-000000000000"}')::jsonb->>'sub')::uuid 
      AND public.users.role = 'SUPER_ADMIN'
  )
);

CREATE POLICY "Allow admin write" ON public.chapters FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE public.users.id = (coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{"sub":"00000000-0000-0000-0000-000000000000"}')::jsonb->>'sub')::uuid 
      AND public.users.role = 'SUPER_ADMIN'
  )
);

CREATE POLICY "Allow admin write" ON public.quizzes FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE public.users.id = (coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{"sub":"00000000-0000-0000-0000-000000000000"}')::jsonb->>'sub')::uuid 
      AND public.users.role = 'SUPER_ADMIN'
  )
);

CREATE POLICY "Allow admin write" ON public.questions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE public.users.id = (coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{"sub":"00000000-0000-0000-0000-000000000000"}')::jsonb->>'sub')::uuid 
      AND public.users.role = 'SUPER_ADMIN'
  )
);

-- 5. Add missing foreign key indexes for performance
CREATE INDEX IF NOT EXISTS idx_quizzes_chapter_id ON public.quizzes(chapter_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON public.questions(quiz_id);
