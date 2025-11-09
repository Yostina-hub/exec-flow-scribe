-- Add preferred_language column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'am' CHECK (preferred_language IN ('am', 'ti', 'en', 'or', 'so'));

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.preferred_language IS 'User preferred language for meetings: am (Amharic), ti (Tigrinya), en (English), or (Afaan Oromo), so (Somali)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_language ON public.profiles(preferred_language);