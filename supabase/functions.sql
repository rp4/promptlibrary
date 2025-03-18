-- Function to increment favorites count
CREATE OR REPLACE FUNCTION increment_favorites_count(prompt_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE prompts
  SET favorites_count = favorites_count + 1
  WHERE id = prompt_id;
END;
$$;

-- Function to decrement favorites count
CREATE OR REPLACE FUNCTION decrement_favorites_count(prompt_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE prompts
  SET favorites_count = favorites_count - 1
  WHERE id = prompt_id;
END;
$$; 