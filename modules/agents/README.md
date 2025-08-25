# LangGraph Agentic System - Complete Reference Guide

A flexible system for building AI agent workflows using LangGraph.js. Create intelligent agents that can talk to each other, use tools, and make decisions based on user input - all configured through simple JSON files.

## 🎯 What This System Does

This system lets you:
- **Create AI agents** with custom personalities and capabilities
- **Connect agents together** in workflows to solve complex tasks  
- **Add conditional routing** so agents can decide which path to take
- **Use tools** like web search, weather, and calculators
- **Manage conversations** with persistent memory across sessions
- **Scale securely** with proper API key management

## 🚀 Quick Start

### 1. Installation & Setup

```bash
# Install dependencies
npm install

# Set up your OpenAI API key
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Start the system
npm run agent:start
```

The server will start on `http://localhost:3000` with these endpoints ready to use.

### 2. Test the System

```bash
# Test a simple routing workflow
curl -X POST http://localhost:3000/graphs/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "graphId": "routing_test_graph",
    "input": {"text": "I need help with understanding this system"}
  }'
```

## 📊 System Architecture

### How It Works
```
User Input → API Server → Graph Builder → Agent Workflow → AI Response
                     ↓
               Config Files (JSON)
```

### Directory Structure
```
modules/agents/
├── agents/             # Agent logic and execution
│   ├── llmAgentExecutor.ts    # Main agent executor using OpenAI
│   └── agentFunctions.ts      # Legacy hardcoded agents (deprecated)
├── api/                # REST API server
│   └── server.ts              # Express server with all endpoints
├── config/             # Configuration management
│   ├── configManager.ts       # Loads/saves agent and graph configs
│   ├── secretManager.ts       # Secure API key management
│   ├── agents/                # Agent configuration files (*.json)
│   └── graphs/                # Graph configuration files (*.json)
├── graphs/             # Graph building and routing
│   └── graphBuilder.ts        # Converts JSON configs to executable workflows
├── tools/              # Available tools for agents
│   └── dummyTools.ts          # Sample tools (weather, search, calculator)
├── types/              # TypeScript definitions
│   └── index.ts               # All system interfaces and types
└── index.ts            # System entry point and initialization
```

## 🤖 Creating Agents

### What is an Agent?
An agent is an AI assistant with a specific personality, role, and set of capabilities defined by:
- **System Prompt**: Tells the AI how to behave
- **Tools**: What actions the agent can perform
- **Configuration**: Model settings, temperature, etc.

### Create an Agent via API

```bash
curl -X POST http://localhost:3000/agents/create \
  -H "Content-Type: application/json" \
  -d '{
    "agent": {
      "name": "customer_support",
      "description": "Helpful customer service agent",
      "systemPrompt": "You are a friendly customer support agent. Always start responses with 'SUPPORT:' and be helpful and empathetic.",
      "tools": [],
      "apiKeyRef": "DEFAULT_OPENAI_KEY",
      "llmConfig": {
        "model": "gpt-4o-mini",
        "temperature": 0.7,
        "maxTokens": 300
      }
    }
  }'
```

### Agent Configuration Options

```typescript
{
  "name": "string",              // Unique identifier
  "description": "string",       // What this agent does
  "systemPrompt": "string",      // AI personality and instructions
  "tools": ["tool_name"],        // Available tools (optional)
  "apiKeyRef": "string",         // Environment variable for API key
  "llmConfig": {
    "model": "gpt-4o-mini",      // OpenAI model to use
    "temperature": 0.7,          // Creativity (0-1)
    "maxTokens": 300             // Response length limit
  }
}
```

## 🔗 Building Workflows (Graphs)

### What is a Graph?
A graph defines how agents work together. Think of it as a flowchart where:
- **Nodes** are agents or tools
- **Edges** are connections between them
- **Conditional Edges** make decisions about which path to take

### Simple Linear Workflow

```json
{
  "graph": {
    "name": "help_workflow",
    "description": "Route user questions to appropriate specialists",
    "nodes": [
      {"name": "analyzer", "agent": "question_analyzer"},
      {"name": "helper", "agent": "customer_support"}
    ],
    "edges": [
      {"from": "__start__", "to": "analyzer"},
      {"from": "analyzer", "to": "helper"},
      {"from": "helper", "to": "__end__"}
    ],
    "entryPoint": "__start__"
  }
}
```

### Conditional Routing Workflow

```json
{
  "graph": {
    "name": "smart_routing",
    "description": "Routes to different agents based on input",
    "nodes": [
      {"name": "router", "agent": "router_agent"},
      {"name": "help_desk", "agent": "help_specialist"},
      {"name": "quick_chat", "agent": "short_handler"}
    ],
    "edges": [
      {"from": "__start__", "to": "router"},
      {"from": "help_desk", "to": "__end__"},
      {"from": "quick_chat", "to": "__end__"}
    ],
    "conditionalEdges": [{
      "from": "router",
      "routes": [
        {
          "condition": {"type": "simple", "expression": "contains:help"},
          "to": "help_desk"
        },
        {
          "condition": {"type": "simple", "expression": "length_lt:30"},
          "to": "quick_chat"
        }
      ],
      "defaultTo": "quick_chat"
    }],
    "entryPoint": "__start__"
  }
}
```

## 🎛️ Routing Conditions (Decision Making)

### Simple Conditions
These are easy patterns that work for most use cases:

```typescript
// Text contains a keyword
{"type": "simple", "expression": "contains:help"}

// Message length checks
{"type": "simple", "expression": "length_lt:50"}   // Less than 50 characters
{"type": "simple", "expression": "length_gt:100"}  // More than 100 characters

// Always true (fallback)
{"type": "simple", "expression": "default"}
```

### JavaScript Conditions
For complex logic, use JavaScript expressions:

```typescript
{
  "type": "javascript",
  "expression": "(message.length > 80) && (utils.contains(message.content, 'explain') || utils.contains(message.content, 'detail'))"
}
```

Available variables:
- `message.content` - The user's message
- `message.length` - Character count
- `utils.contains(text, keyword)` - Check if text contains keyword
- `state.messageCount` - Number of messages in conversation

## 🔐 Security & API Keys

### Environment Variables
The system uses environment variables to keep API keys secure:

```bash
# .env file
DEFAULT_OPENAI_KEY=your_openai_api_key_here
SUPPORT_AGENT_KEY=different_key_for_support_agent
RESEARCH_AGENT_KEY=another_key_for_research
```

### API Key Priority
The system looks for API keys in this order:
1. Agent-specific key (e.g., `CUSTOMER_SUPPORT_OPENAI_KEY`)
2. Referenced key (e.g., `apiKeyRef: "SUPPORT_AGENT_KEY"`)
3. Default key (`DEFAULT_OPENAI_KEY`)
4. Standard key (`OPENAI_API_KEY`)

### What's Protected
The `.gitignore` file prevents these sensitive files from being committed:
- `.env` files
- `config/agents/*.json` (contains API key references)
- `config/graphs/*.json` (may contain sensitive routing logic)
- Any file with "secret", "private", or "credential" in the name

## 🛠️ Tools System

### Available Tools
```typescript
// Weather information
"weather_tool": "Returns current weather for any city"

// Web search
"web_search_tool": "Performs web searches and returns results"  

// Calculator
"calculator_tool": "Performs mathematical calculations"
```

### How Agents Use Tools
1. Agent receives user request
2. If agent has tools, it can decide to call them
3. Tool executes and returns result
4. Agent incorporates result into response

### Adding New Tools
```typescript
export class MyCustomTool extends Tool {
  name = "my_custom_tool";
  description = "What this tool does";
  
  async _call(input: string): Promise<string> {
    // Your tool logic here
    return "Tool result";
  }
}

// Register in toolRegistry
export const toolRegistry = {
  my_custom_tool: new MyCustomTool(),
  // ... other tools
};
```

## 📡 API Reference

### Health Check
```bash
GET /health
```

### List All Agents
```bash
GET /agents
```

### List All Graphs  
```bash
GET /graphs
```

### Create Agent
```bash
POST /agents/create
Content-Type: application/json

{
  "agent": {
    "name": "my_agent",
    "description": "Agent description",
    "systemPrompt": "You are a helpful assistant...",
    "tools": ["web_search_tool"],
    "apiKeyRef": "DEFAULT_OPENAI_KEY",
    "llmConfig": {
      "model": "gpt-4o-mini",
      "temperature": 0.7,
      "maxTokens": 500
    }
  }
}
```

### Create Graph
```bash
POST /graphs/create
Content-Type: application/json

{
  "graph": {
    "name": "my_workflow",
    "description": "Workflow description",
    "nodes": [
      {"name": "start_agent", "agent": "my_agent"}
    ],
    "edges": [
      {"from": "__start__", "to": "start_agent"},
      {"from": "start_agent", "to": "__end__"}
    ],
    "entryPoint": "__start__"
  }
}
```

### Run a Workflow
```bash
POST /graphs/invoke
Content-Type: application/json

{
  "graphId": "my_workflow",
  "input": {
    "text": "Your message here"
  },
  "sessionId": "optional-session-id-for-memory"
}
```

### Response Format
```json
{
  "sessionId": "uuid-session-id",
  "response": "Final agent response",
  "conversation": [
    {"type": "human", "content": "User input", "timestamp": "..."},
    {"type": "assistant", "content": "Agent response", "timestamp": "..."}
  ],
  "metadata": {
    "agent": "final_agent_name",
    "timestamp": "...",
    "messageCount": 2
  }
}
```

## 🎯 Example Workflows

### 1. Customer Support Routing
Routes customer inquiries to appropriate specialists:

```bash
# Create the workflow
curl -X POST http://localhost:3000/graphs/create -H "Content-Type: application/json" -d '{
  "graph": {
    "name": "customer_support",
    "nodes": [
      {"name": "intake", "agent": "support_router"},
      {"name": "billing", "agent": "billing_specialist"},
      {"name": "technical", "agent": "tech_support"},
      {"name": "general", "agent": "general_support"}
    ],
    "edges": [
      {"from": "__start__", "to": "intake"},
      {"from": "billing", "to": "__end__"},
      {"from": "technical", "to": "__end__"},
      {"from": "general", "to": "__end__"}
    ],
    "conditionalEdges": [{
      "from": "intake",
      "routes": [
        {"condition": {"type": "simple", "expression": "contains:billing"}, "to": "billing"},
        {"condition": {"type": "simple", "expression": "contains:technical"}, "to": "technical"}
      ],
      "defaultTo": "general"
    }],
    "entryPoint": "__start__"
  }
}'

# Test billing question
curl -X POST http://localhost:3000/graphs/invoke -H "Content-Type: application/json" -d '{
  "graphId": "customer_support", 
  "input": {"text": "I have a billing question about my subscription"}
}'
```

### 2. Content Processing Pipeline
Processes content through multiple agents:

```bash
# Create pipeline
curl -X POST http://localhost:3000/graphs/create -H "Content-Type: application/json" -d '{
  "graph": {
    "name": "content_pipeline",
    "nodes": [
      {"name": "analyzer", "agent": "content_analyzer"},
      {"name": "editor", "agent": "content_editor"},
      {"name": "reviewer", "agent": "content_reviewer"}
    ],
    "edges": [
      {"from": "__start__", "to": "analyzer"},
      {"from": "analyzer", "to": "editor"}, 
      {"from": "editor", "to": "reviewer"},
      {"from": "reviewer", "to": "__end__"}
    ],
    "entryPoint": "__start__"
  }
}'
```

## 🔍 Troubleshooting

### Common Issues

**1. "Agent not found" errors**
```bash
# Check what agents exist
curl http://localhost:3000/agents

# Make sure the agent name matches exactly
```

**2. API key errors** 
```bash
# Check your .env file exists and has the right key
cat .env

# Verify the key works
curl -H "Authorization: Bearer your-key" https://api.openai.com/v1/models
```

**3. Graph won't compile**
```bash
# Check all referenced agents exist
# Verify edge connections are valid (no broken paths)
# Ensure conditional routing has valid expressions
```

**4. Port already in use**
```bash
# Use different port
PORT=3001 npm run agent:start
```

**5. Routing not working as expected**
```bash
# Test conditions individually
# Check message format (should be simple text)
# Verify agent responses start with expected prefixes
```

### Debug Mode
```bash
# Start with debug logging
DEBUG=* npm run agent:start

# Or start in development mode
npm run agent:dev
```

## 📈 What We've Built

### Current Capabilities
✅ **Dynamic Agent Creation** - Create agents via JSON without code changes  
✅ **Secure API Key Management** - Environment-based key resolution  
✅ **Flexible Routing System** - Both simple and JavaScript-based conditions  
✅ **Session Persistence** - Conversations maintain context  
✅ **Tool Integration** - Agents can use external tools  
✅ **Type Safety** - Full TypeScript support  
✅ **Git Security** - Sensitive files properly ignored  
✅ **RESTful API** - Clean endpoints for all operations  

### Tested Features
✅ **Help Routing** - Routes "help" requests to specialists  
✅ **Length-based Routing** - Different agents for short/long messages  
✅ **Complex Conditions** - JavaScript expressions for detailed logic  
✅ **Default Fallbacks** - System never gets stuck  
✅ **Multi-agent Workflows** - Agents passing work to each other  

## 🚀 Next Steps

### Immediate Enhancements
- **Real Tool Integration** - Connect to actual APIs (weather, search)
- **Streaming Responses** - Real-time response streaming
- **Graph Visualization** - Visual editor for workflows
- **Agent Templates** - Pre-built agent configurations

### Advanced Features  
- **Vector Memory** - Long-term memory with embeddings
- **Dynamic Tool Discovery** - Agents can discover new tools
- **Multi-model Support** - Support for different AI providers
- **Workflow Analytics** - Track performance and usage

### Enterprise Features
- **Authentication** - User management and permissions
- **Rate Limiting** - Prevent API abuse
- **Audit Logging** - Track all system activity
- **Horizontal Scaling** - Multi-instance deployments

---

## 💡 Key Concepts Summary

**Agent** = AI with personality + tools + configuration  
**Graph** = Workflow connecting agents together  
**Routing** = Decision-making logic for choosing paths  
**State** = Information flowing through the workflow  
**Session** = Persistent conversation memory  
**Tools** = External capabilities agents can use

This system is designed to be **simple to use** but **powerful to extend**. Start with basic agents and simple workflows, then add complexity as needed.