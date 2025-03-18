-- Create triggers for updating updated_at
CREATE TRIGGER update_groups_updated_at
    BEFORE UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subgroups_updated_at
    BEFORE UPDATE ON subgroups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompts_updated_at
    BEFORE UPDATE ON prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- First drop any existing triggers and functions
DROP TRIGGER IF EXISTS update_prompt_favorites_count_trigger ON likes;
DROP FUNCTION IF EXISTS update_prompt_favorites_count();
DROP FUNCTION IF EXISTS increment_favorites_count();
DROP FUNCTION IF EXISTS decrement_favorites_count();

-- Create clean stored procedures for favorites count
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