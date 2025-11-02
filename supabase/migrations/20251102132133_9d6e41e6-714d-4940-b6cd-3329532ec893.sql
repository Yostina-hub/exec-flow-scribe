-- Add openai_api_key column to ai_provider_preferences table
ALTER TABLE ai_provider_preferences 
ADD COLUMN IF NOT EXISTS openai_api_key TEXT;