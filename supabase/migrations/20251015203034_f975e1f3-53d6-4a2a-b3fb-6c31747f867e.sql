-- Update AI provider preferences to use Gemini instead of NotebookLM
-- 1. Drop the existing constraint
ALTER TABLE public.ai_provider_preferences
DROP CONSTRAINT IF EXISTS ai_provider_preferences_provider_check;

-- 2. Rename the column
ALTER TABLE public.ai_provider_preferences
RENAME COLUMN notebooklm_api_key TO gemini_api_key;

-- 3. Add new constraint with 'gemini'
ALTER TABLE public.ai_provider_preferences
ADD CONSTRAINT ai_provider_preferences_provider_check
CHECK (provider IN ('lovable_ai', 'gemini'));

-- 4. Update any existing 'notebooklm' values to 'gemini'
UPDATE public.ai_provider_preferences
SET provider = 'gemini'
WHERE provider = 'notebooklm';