
-- Fix 1: Tighten assignments SELECT policy - remove public access
-- Students will use the edge function instead
DROP POLICY IF EXISTS "Anyone can view active assignments by access code" ON public.assignments;

-- Only teachers can view their own assignments directly
-- (The existing "Teachers can manage their own assignments" ALL policy covers this)

-- Fix 2: Add constraints to student_responses
-- Prevent empty names and enforce length
ALTER TABLE public.student_responses
ADD CONSTRAINT valid_student_name 
CHECK (length(trim(student_name)) > 0 AND length(student_name) <= 100);

-- Prevent duplicate submissions (same student + same assignment)
ALTER TABLE public.student_responses
ADD CONSTRAINT unique_student_submission 
UNIQUE (assignment_id, student_name);
