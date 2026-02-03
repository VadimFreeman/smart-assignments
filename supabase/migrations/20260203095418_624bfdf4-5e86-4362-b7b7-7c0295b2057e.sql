-- Fix function search_path for generate_access_code
CREATE OR REPLACE FUNCTION public.generate_access_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$;

-- The "Anyone can submit responses" policy with `WITH CHECK (true)` is intentional
-- because students don't have accounts and need to submit responses anonymously.
-- This is a design requirement for the application.