-- Create enum for prompt usage status
CREATE TYPE prompt_usage_status AS ENUM ('success', 'failure', 'partial');

-- Create groups table
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    order_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create subgroups table
CREATE TABLE subgroups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    order_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create prompts table
CREATE TABLE prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    prompt_text TEXT NOT NULL,
    notes TEXT,
    favorites_count INTEGER DEFAULT 0,
    subgroup_id UUID NOT NULL REFERENCES subgroups(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create likes table with soft delete
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(prompt_id, user_id)
);

-- Create prompt usage table
CREATE TABLE prompt_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    sent_data TEXT NOT NULL,
    returned_data TEXT NOT NULL,
    status prompt_usage_status NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_groups_order_id ON groups(order_id);
CREATE INDEX idx_subgroups_group_id ON subgroups(group_id);
CREATE INDEX idx_subgroups_order_id ON subgroups(order_id);
CREATE INDEX idx_prompts_subgroup_id ON prompts(subgroup_id);
CREATE INDEX idx_prompts_group_id ON prompts(group_id);
CREATE INDEX idx_prompts_created_by ON prompts(created_by);
CREATE INDEX idx_likes_prompt_id ON likes(prompt_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_prompt_usage_prompt_id ON prompt_usage(prompt_id);
CREATE INDEX idx_prompt_usage_user_id ON prompt_usage(user_id);
CREATE INDEX idx_prompt_usage_created_at ON prompt_usage(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

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

-- Create function to update favorites count
CREATE OR REPLACE FUNCTION update_prompt_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE prompts 
        SET favorites_count = favorites_count + 1
        WHERE id = NEW.prompt_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        UPDATE prompts 
        SET favorites_count = favorites_count - 1
        WHERE id = NEW.prompt_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updating favorites count
CREATE TRIGGER update_prompt_favorites_count_trigger
    AFTER INSERT OR UPDATE ON likes
    FOR EACH ROW
    EXECUTE FUNCTION update_prompt_favorites_count(); 