-- Update models to match Vercel AI Gateway model identifiers
-- This migration updates the model IDs from OpenRouter format to Vercel AI Gateway format

-- Delete all existing data (cascade will handle messages and conversations)
DELETE FROM public.messages;
DELETE FROM public.conversations;
DELETE FROM public.models;

-- Insert new models with Vercel AI Gateway identifiers
INSERT INTO public.models (id, display_name)
VALUES
  ('mistral/mistral-small', 'Mistral Small'),
  ('zai/glm-4.5v', 'ZhipuAI GLM 4.5V'),
  ('openai/gpt-5-chat', 'OpenAI GPT-5 Chat');
