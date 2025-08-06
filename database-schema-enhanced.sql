-- Enhanced Database Schema for AgentHub with Flowise Patterns
-- Supports workflow execution, execution tracking, runtime state, and human-in-the-loop

-- ============================================================================
-- CORE TABLES (Enhanced)
-- ============================================================================

-- Projects (existing, enhanced)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(100) UNIQUE NOT NULL,
    gitlab_group_id INTEGER,
    
    -- NEW: Enhanced metadata
    category VARCHAR(50) DEFAULT 'general',
    tags TEXT[], -- Array of tags
    settings JSONB DEFAULT '{}', -- Project-specific settings
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT projects_name_check CHECK (length(name) >= 1),
    CONSTRAINT projects_slug_check CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Users (existing, enhanced)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    gitlab_user_id INTEGER UNIQUE,
    
    -- NEW: Enhanced user data
    role VARCHAR(50) DEFAULT 'user', -- admin, user, viewer
    preferences JSONB DEFAULT '{}', -- User preferences
    settings JSONB DEFAULT '{}', -- User settings
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP,
    
    CONSTRAINT users_email_check CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$')
);

-- ============================================================================
-- WORKFLOW MANAGEMENT (NEW - Flowise Pattern)
-- ============================================================================

-- Agent Workflows (like Flowise ChatFlow)
CREATE TABLE IF NOT EXISTS agent_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(20) DEFAULT '1.0.0',
    
    -- Workflow type
    type VARCHAR(50) NOT NULL DEFAULT 'WORKFLOW', -- 'WORKFLOW', 'CHATFLOW', 'MULTIAGENT', 'ASSISTANT'
    
    -- Graph structure (JSON representation)
    flow_data JSONB NOT NULL, -- Contains nodes and edges
    
    -- Configuration
    api_config JSONB, -- API-specific configuration
    chatbot_config JSONB, -- Chatbot-specific configuration
    variables JSONB DEFAULT '[]', -- Workflow variables
    settings JSONB DEFAULT '{}', -- Workflow settings
    
    -- Metadata
    category VARCHAR(100),
    tags TEXT[],
    is_public BOOLEAN DEFAULT FALSE,
    is_template BOOLEAN DEFAULT FALSE,
    
    -- Ownership
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT workflow_name_length CHECK (length(name) >= 1),
    CONSTRAINT workflow_type_valid CHECK (type IN ('WORKFLOW', 'CHATFLOW', 'MULTIAGENT', 'ASSISTANT')),
    CONSTRAINT workflow_version_format CHECK (version ~ '^\d+\.\d+\.\d+$')
);

-- ============================================================================
-- EXECUTION TRACKING (NEW - Flowise Pattern) 
-- ============================================================================

-- Agent Executions (like Flowise Execution)
CREATE TABLE IF NOT EXISTS agent_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    workflow_id UUID REFERENCES agent_workflows(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL, -- Link to session
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Execution state
    state VARCHAR(50) NOT NULL DEFAULT 'PENDING', 
    -- 'PENDING', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'TERMINATED', 'TIMEOUT', 'WAITING_FOR_HUMAN'
    
    -- Execution data
    execution_data JSONB, -- Detailed execution results and state
    runtime_state JSONB DEFAULT '{}', -- Persistent runtime state
    form_data JSONB DEFAULT '{}', -- Form data persistence
    
    -- Node tracking
    current_node VARCHAR(255),
    completed_nodes TEXT[] DEFAULT '{}',
    failed_nodes TEXT[] DEFAULT '{}',
    skipped_nodes TEXT[] DEFAULT '{}',
    
    -- Progress tracking
    total_nodes INTEGER DEFAULT 0,
    nodes_executed INTEGER DEFAULT 0,
    
    -- Input/Output
    input_data JSONB,
    output_data JSONB,
    
    -- Error information
    error_message TEXT,
    error_stack TEXT,
    error_node VARCHAR(255),
    
    -- Timing
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    last_updated TIMESTAMP DEFAULT NOW(),
    
    -- Usage statistics
    total_tokens INTEGER DEFAULT 0,
    total_cost DECIMAL(10, 4) DEFAULT 0,
    model_usage JSONB DEFAULT '{}',
    
    CONSTRAINT execution_state_valid CHECK (
        state IN ('PENDING', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'TERMINATED', 'TIMEOUT', 'WAITING_FOR_HUMAN')
    )
);

-- ============================================================================
-- ENHANCED CHAT MESSAGES (Flowise Pattern)
-- ============================================================================

-- Agent Messages (enhanced version of existing chat_messages)
CREATE TABLE IF NOT EXISTS agent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Context
    session_id VARCHAR(255) NOT NULL,
    execution_id UUID REFERENCES agent_executions(id) ON DELETE SET NULL,
    workflow_id UUID REFERENCES agent_workflows(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Message content
    role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system', 'tool', 'human', 'reasoning'
    content TEXT NOT NULL,
    
    -- Enhanced metadata (Flowise compatibility)
    source_documents JSONB, -- Documents used in response
    used_tools JSONB, -- Tools used in generating response  
    artifacts JSONB, -- Generated artifacts
    agent_reasoning TEXT, -- Agent reasoning chain
    
    -- Message metadata
    metadata JSONB DEFAULT '{}',
    
    -- Node context
    agent_id VARCHAR(255), -- Which agent created this
    node_id VARCHAR(255), -- Workflow node context
    
    -- Timing
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Performance
    tokens_used INTEGER,
    processing_time INTEGER, -- Milliseconds
    
    CONSTRAINT message_role_valid CHECK (
        role IN ('user', 'assistant', 'system', 'tool', 'human', 'reasoning')
    )
);

-- ============================================================================
-- HUMAN-IN-THE-LOOP INTERACTIONS (NEW)
-- ============================================================================

-- Human Interactions
CREATE TABLE IF NOT EXISTS human_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Context
    execution_id UUID REFERENCES agent_executions(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    node_id VARCHAR(255),
    
    -- Interaction details
    prompt TEXT NOT NULL,
    interaction_type VARCHAR(50) NOT NULL DEFAULT 'input', -- 'approval', 'input', 'choice', 'confirmation'
    
    -- Options
    timeout_seconds INTEGER,
    choices JSONB, -- For choice-type interactions
    required BOOLEAN DEFAULT TRUE,
    
    -- Response
    response JSONB,
    response_type VARCHAR(50), -- 'approved', 'rejected', 'input', 'choice'
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'expired', 'cancelled'
    
    -- Timing
    created_at TIMESTAMP DEFAULT NOW(),
    responded_at TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT interaction_type_valid CHECK (
        interaction_type IN ('approval', 'input', 'choice', 'confirmation')
    ),
    CONSTRAINT interaction_status_valid CHECK (
        status IN ('pending', 'completed', 'expired', 'cancelled')
    )
);

-- ============================================================================
-- AGENT POOL MANAGEMENT (NEW)
-- ============================================================================

-- Agent Definitions
CREATE TABLE IF NOT EXISTS agent_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Agent identity
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    description TEXT,
    agent_type VARCHAR(50) NOT NULL, -- 'llm', 'graph', 'loop', 'parallel', 'multi', 'workflow', 'human', 'custom'
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    
    -- Configuration
    config JSONB NOT NULL DEFAULT '{}', -- Agent configuration
    capabilities JSONB DEFAULT '{}', -- Agent capabilities
    
    -- Node properties (Flowise compatibility)
    label VARCHAR(255),
    category VARCHAR(100) DEFAULT 'Agents',
    icon VARCHAR(255),
    base_classes TEXT[],
    
    -- Input/Output specification
    input_schema JSONB,
    output_schema JSONB,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE, -- System-provided vs user-defined
    
    -- Ownership
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint on name+version
    UNIQUE(name, version),
    
    CONSTRAINT agent_type_valid CHECK (
        agent_type IN ('llm', 'graph', 'loop', 'parallel', 'multi', 'workflow', 'human', 'custom')
    )
);

-- ============================================================================
-- ENHANCED SESSION MANAGEMENT
-- ============================================================================

-- Sessions (enhanced)
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(255) PRIMARY KEY,
    
    -- References
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    
    -- Session data
    session_data JSONB DEFAULT '{}', -- Basic session data
    runtime_state JSONB DEFAULT '{}', -- Runtime state for workflows
    form_data JSONB DEFAULT '{}', -- Persistent form data
    variables JSONB DEFAULT '{}', -- Session variables
    
    -- Session metadata
    session_type VARCHAR(50) DEFAULT 'chat', -- 'chat', 'workflow', 'agent'
    title VARCHAR(255),
    description TEXT,
    
    -- Current context
    current_workflow_id UUID REFERENCES agent_workflows(id) ON DELETE SET NULL,
    current_execution_id UUID REFERENCES agent_executions(id) ON DELETE SET NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_accessed_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- ============================================================================
-- MEMORY AND VECTORIZATION (Enhanced)
-- ============================================================================

-- Memory Entries (enhanced)
CREATE TABLE IF NOT EXISTS memory_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Context
    session_id VARCHAR(255) REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    execution_id UUID REFERENCES agent_executions(id) ON DELETE SET NULL,
    
    -- Memory content
    content TEXT NOT NULL,
    summary TEXT,
    memory_type VARCHAR(50) NOT NULL, -- 'working', 'episodic', 'semantic', 'procedural'
    
    -- Classification
    entry_type VARCHAR(50) NOT NULL, -- 'user', 'assistant', 'system', 'tool', 'observation', 'reasoning'
    importance_score DECIMAL(3, 2) DEFAULT 0.5,
    confidence_score DECIMAL(3, 2) DEFAULT 0.5,
    
    -- Vector data
    embedding VECTOR(1536), -- OpenAI embedding dimension
    
    -- Context metadata
    agent_id VARCHAR(255),
    node_id VARCHAR(255),
    workflow_id UUID REFERENCES agent_workflows(id) ON DELETE SET NULL,
    
    -- Enhanced metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    references TEXT[], -- References to other memories
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    last_accessed_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    
    CONSTRAINT memory_importance_range CHECK (importance_score >= 0 AND importance_score <= 1),
    CONSTRAINT memory_confidence_range CHECK (confidence_score >= 0 AND confidence_score <= 1)
);

-- ============================================================================
-- TOOL INTEGRATION (Enhanced)
-- ============================================================================

-- Tool Definitions (enhanced)
CREATE TABLE IF NOT EXISTS tool_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tool identity
    name VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    description TEXT,
    version VARCHAR(20) DEFAULT '1.0.0',
    
    -- Tool specification
    tool_type VARCHAR(50) NOT NULL, -- 'function', 'api', 'webhook', 'script'
    input_schema JSONB NOT NULL, -- JSON schema for inputs
    output_schema JSONB, -- JSON schema for outputs
    
    -- Implementation
    implementation JSONB NOT NULL, -- Tool implementation details
    
    -- Configuration
    config JSONB DEFAULT '{}',
    requires_auth BOOLEAN DEFAULT FALSE,
    auth_type VARCHAR(50), -- 'api_key', 'oauth', 'basic', 'bearer'
    
    -- Security
    requires_confirmation BOOLEAN DEFAULT FALSE, -- Human approval needed
    security_level VARCHAR(20) DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE,
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    
    -- Ownership
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT tool_security_level_valid CHECK (
        security_level IN ('low', 'medium', 'high', 'critical')
    )
);

-- Tool Execution Log
CREATE TABLE IF NOT EXISTS tool_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Context
    tool_name VARCHAR(255) REFERENCES tool_definitions(name) ON DELETE CASCADE,
    session_id VARCHAR(255) REFERENCES sessions(id) ON DELETE SET NULL,
    execution_id UUID REFERENCES agent_executions(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Execution details
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
    
    -- Performance
    duration_ms INTEGER,
    tokens_used INTEGER,
    
    -- Human approval (if required)
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    
    -- Timestamps
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    
    CONSTRAINT tool_execution_status_valid CHECK (
        status IN ('pending', 'running', 'completed', 'failed', 'cancelled')
    )
);

-- ============================================================================
-- ENHANCED INDEXES FOR PERFORMANCE
-- ============================================================================

-- Workflow indexes
CREATE INDEX IF NOT EXISTS idx_workflows_project ON agent_workflows(project_id);
CREATE INDEX IF NOT EXISTS idx_workflows_type ON agent_workflows(type);
CREATE INDEX IF NOT EXISTS idx_workflows_created_by ON agent_workflows(created_by);
CREATE INDEX IF NOT EXISTS idx_workflows_updated_at ON agent_workflows(updated_at DESC);

-- Execution indexes
CREATE INDEX IF NOT EXISTS idx_executions_workflow ON agent_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_session ON agent_executions(session_id);
CREATE INDEX IF NOT EXISTS idx_executions_state ON agent_executions(state);
CREATE INDEX IF NOT EXISTS idx_executions_user ON agent_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_executions_started_at ON agent_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_completed_at ON agent_executions(completed_at DESC);

-- Message indexes
CREATE INDEX IF NOT EXISTS idx_messages_session ON agent_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_execution ON agent_messages(execution_id);
CREATE INDEX IF NOT EXISTS idx_messages_workflow ON agent_messages(workflow_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON agent_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_role ON agent_messages(role);

-- Human interaction indexes
CREATE INDEX IF NOT EXISTS idx_interactions_execution ON human_interactions(execution_id);
CREATE INDEX IF NOT EXISTS idx_interactions_session ON human_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_interactions_status ON human_interactions(status);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON human_interactions(created_at DESC);

-- Session indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at DESC);

-- Memory indexes
CREATE INDEX IF NOT EXISTS idx_memory_session ON memory_entries(session_id);
CREATE INDEX IF NOT EXISTS idx_memory_user ON memory_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_type ON memory_entries(memory_type);
CREATE INDEX IF NOT EXISTS idx_memory_importance ON memory_entries(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_memory_created_at ON memory_entries(created_at DESC);

-- Vector similarity search index (requires pgvector extension)
CREATE INDEX IF NOT EXISTS idx_memory_embedding ON memory_entries USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Tool execution indexes
CREATE INDEX IF NOT EXISTS idx_tool_exec_tool ON tool_executions(tool_name);
CREATE INDEX IF NOT EXISTS idx_tool_exec_session ON tool_executions(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_exec_execution ON tool_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_tool_exec_started_at ON tool_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_exec_status ON tool_executions(status);

-- Agent definition indexes
CREATE INDEX IF NOT EXISTS idx_agents_type ON agent_definitions(agent_type);
CREATE INDEX IF NOT EXISTS idx_agents_active ON agent_definitions(is_active);
CREATE INDEX IF NOT EXISTS idx_agents_system ON agent_definitions(is_system);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at 
    BEFORE UPDATE ON agent_workflows 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at 
    BEFORE UPDATE ON agent_definitions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tools_updated_at 
    BEFORE UPDATE ON tool_definitions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update last_updated in executions
CREATE OR REPLACE FUNCTION update_execution_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_executions_last_updated 
    BEFORE UPDATE ON agent_executions 
    FOR EACH ROW EXECUTE FUNCTION update_execution_last_updated();

-- Function to update session last_accessed_at
CREATE OR REPLACE FUNCTION update_session_last_accessed()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sessions 
    SET last_accessed_at = NOW() 
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update session access time when messages are added
CREATE TRIGGER update_session_access_on_message 
    AFTER INSERT ON agent_messages 
    FOR EACH ROW EXECUTE FUNCTION update_session_last_accessed();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Active executions view
CREATE VIEW active_executions AS
SELECT 
    e.*,
    w.name as workflow_name,
    w.type as workflow_type,
    s.title as session_title
FROM agent_executions e
JOIN agent_workflows w ON e.workflow_id = w.id
LEFT JOIN sessions s ON e.session_id = s.id
WHERE e.state IN ('RUNNING', 'PAUSED', 'WAITING_FOR_HUMAN');

-- Execution summary view
CREATE VIEW execution_summary AS
SELECT 
    e.id,
    e.workflow_id,
    w.name as workflow_name,
    e.session_id,
    e.state,
    e.nodes_executed,
    e.total_nodes,
    CASE 
        WHEN e.total_nodes > 0 THEN (e.nodes_executed::DECIMAL / e.total_nodes * 100)
        ELSE 0 
    END as completion_percentage,
    e.started_at,
    e.completed_at,
    CASE 
        WHEN e.completed_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (e.completed_at - e.started_at))
        ELSE 
            EXTRACT(EPOCH FROM (NOW() - e.started_at))
    END as duration_seconds,
    e.total_tokens,
    e.total_cost
FROM agent_executions e
JOIN agent_workflows w ON e.workflow_id = w.id;

-- Human interactions pending view
CREATE VIEW pending_human_interactions AS
SELECT 
    hi.*,
    e.workflow_id,
    w.name as workflow_name,
    s.title as session_title
FROM human_interactions hi
JOIN agent_executions e ON hi.execution_id = e.id
JOIN agent_workflows w ON e.workflow_id = w.id
LEFT JOIN sessions s ON hi.session_id = s.id
WHERE hi.status = 'pending'
AND (hi.expires_at IS NULL OR hi.expires_at > NOW());

-- Tool usage statistics view
CREATE VIEW tool_usage_stats AS
SELECT 
    td.name,
    td.display_name,
    COUNT(te.id) as execution_count,
    AVG(te.duration_ms) as avg_duration_ms,
    SUM(te.tokens_used) as total_tokens,
    MAX(te.completed_at) as last_used_at,
    COUNT(CASE WHEN te.status = 'completed' THEN 1 END) as successful_executions,
    COUNT(CASE WHEN te.status = 'failed' THEN 1 END) as failed_executions
FROM tool_definitions td
LEFT JOIN tool_executions te ON td.name = te.tool_name
WHERE td.is_active = true
GROUP BY td.name, td.display_name;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert system agent definitions
INSERT INTO agent_definitions (name, display_name, description, agent_type, version, config, is_system, is_active)
VALUES 
    ('llm', 'LLM Agent', 'Direct LLM interaction agent', 'llm', '1.0.0', '{}', true, true),
    ('graph', 'Graph Agent', 'Graph-based workflow execution agent', 'graph', '1.0.0', '{}', true, true),
    ('human', 'Human Agent', 'Human-in-the-loop agent', 'human', '1.0.0', '{}', true, true)
ON CONFLICT (name, version) DO NOTHING;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE agent_workflows IS 'Workflow definitions using Flowise-style graph structure';
COMMENT ON TABLE agent_executions IS 'Execution tracking with state management and resume capability';
COMMENT ON TABLE agent_messages IS 'Enhanced chat messages with Flowise compatibility features';
COMMENT ON TABLE human_interactions IS 'Human-in-the-loop interaction tracking';
COMMENT ON TABLE agent_definitions IS 'Agent pool management and dynamic loading support';
COMMENT ON TABLE tool_executions IS 'Tool execution logging with approval workflow';

COMMENT ON COLUMN agent_workflows.flow_data IS 'JSON containing nodes and edges for workflow graph';
COMMENT ON COLUMN agent_executions.runtime_state IS 'Persistent state for workflow resume capability';
COMMENT ON COLUMN agent_executions.execution_data IS 'Detailed execution state and node outputs';
COMMENT ON COLUMN sessions.runtime_state IS 'Session-level runtime state persistence';
COMMENT ON COLUMN memory_entries.embedding IS 'Vector embedding for semantic search (requires pgvector)';