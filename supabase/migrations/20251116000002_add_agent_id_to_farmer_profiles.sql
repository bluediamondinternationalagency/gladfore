-- Add agent_id column to farmer_profiles table to link farmers with their agents
ALTER TABLE farmer_profiles 
ADD COLUMN agent_id UUID REFERENCES agent_profiles(id);

-- Create index for faster agent-farmer queries
CREATE INDEX idx_farmer_profiles_agent_id ON farmer_profiles(agent_id);

-- Update existing farmers to have an agent (optional - you can skip this if you want to manually assign)
-- This assigns all existing farmers without an agent to the first available agent
-- Comment out if you don't want automatic assignment
DO $$
DECLARE
    first_agent_id UUID;
BEGIN
    SELECT id INTO first_agent_id FROM agent_profiles LIMIT 1;
    
    IF first_agent_id IS NOT NULL THEN
        UPDATE farmer_profiles 
        SET agent_id = first_agent_id 
        WHERE agent_id IS NULL;
    END IF;
END $$;
