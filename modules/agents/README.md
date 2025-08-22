# LangGraph Agentic System (TypeScript)

A flexible and extensible agentic system built with LangGraph.js that allows dynamic creation and management of agents through JSON configuration files.

## Features

- **Dynamic Agent Creation**: Define agents using JSON configuration files
- **Graph-Based Workflows**: Create complex agent interactions through graph structures
- **Tool Integration**: Extensible tool system with dummy implementations
- **State Management**: Built-in state and memory management for agent conversations
- **RESTful API**: Simple API for creating and invoking agents
- **Session Persistence**: Maintain conversation context across invocations

## Installation

```bash
# Install dependencies
npm install

# Start the agent system
npm run agent:start

# Run tests (in a separate terminal)
npm run agent:test
```

## API Endpoints

### Create Agent
```bash
POST /agents/create
Content-Type: application/json

{
  "agent": {
    "name": "my_agent",
    "description": "Description of the agent",
    "functionReference": "agentFunctions.generic",
    "tools": ["web_search_tool", "weather_tool"]
  }
}
```

### Create Graph
```bash
POST /graphs/create
Content-Type: application/json

{
  "graph": {
    "name": "my_graph",
    "nodes": [
      { "name": "agent_node", "agent": "my_agent" },
      { "name": "tool_node", "tool": "web_search_tool" }
    ],
    "entryPoint": "agent_node",
    "edges": [
      { "from": "agent_node", "to": "tool_node" },
      { "from": "tool_node", "to": "__end__" }
    ]
  }
}
```

### Invoke Graph
```bash
POST /graphs/invoke
Content-Type: application/json

{
  "graphId": "my_graph",
  "input": {
    "messages": [
      {"role": "human", "content": "Your message here"}
    ]
  },
  "sessionId": "optional-session-id"
}
```

### List Agents
```bash
GET /agents
```

### List Graphs
```bash
GET /graphs
```

## Architecture

### Directory Structure
```
modules/agents/
├── agents/          # Agent function implementations
├── api/            # Express API server
├── config/         # Configuration management
├── graphs/         # Graph building logic
├── tools/          # Tool implementations
├── types/          # TypeScript type definitions
├── index.ts        # Main entry point
└── test.ts         # Test suite
```

### Key Components

1. **Agent Functions** (`agents/agentFunctions.ts`)
   - Search Agent: Specializes in web searches
   - Summarize Agent: Creates summaries of conversations
   - Weather Agent: Provides weather information
   - Generic Agent: Multi-purpose agent with tool routing

2. **Tools** (`tools/dummyTools.ts`)
   - Weather Tool: Returns mock weather data
   - Search Tool: Returns mock search results
   - Calculator Tool: Performs basic arithmetic

3. **Graph Builder** (`graphs/graphBuilder.ts`)
   - Converts JSON configurations to executable LangGraph workflows
   - Handles node creation, edge connections, and conditional routing

4. **Config Manager** (`config/configManager.ts`)
   - Manages loading and saving of agent/graph configurations
   - File-based storage in JSON format

## Example Configurations

### Pre-configured Agents
- `search_agent`: Web search specialist
- `summarize_agent`: Information summarizer
- `weather_agent`: Weather information provider
- `generic_agent`: General-purpose assistant

### Pre-configured Graphs
- `research_graph`: Search → Tool → Summarize workflow
- `weather_graph`: Weather query → Tool workflow
- `versatile_graph`: Multi-tool conditional routing

## State Management

The system uses a shared state object that flows through the graph:

```typescript
{
  messages: BaseMessage[],    // Conversation history
  memory: string[],           // Shared memory/scratchpad
  currentAgent: string,       // Active agent name
  sessionId: string,          // Session identifier
  metadata: Record<string, any> // Additional metadata
}
```

## Extending the System

### Adding New Agent Functions

1. Create a new function in `agents/agentFunctions.ts`:
```typescript
export async function myAgentFunction(state: AgentState) {
  // Agent logic here
  return {
    messages: [...],
    memory: [...],
    currentAgent: "my_agent"
  };
}
```

2. Register it in `agentFunctionRegistry`:
```typescript
export const agentFunctionRegistry = {
  "agentFunctions.myAgent": myAgentFunction,
  // ...
};
```

### Adding New Tools

1. Create a new tool class in `tools/dummyTools.ts`:
```typescript
export class MyTool extends Tool {
  name = "my_tool";
  description = "Tool description";
  
  async _call(input: string): Promise<string> {
    // Tool logic here
    return result;
  }
}
```

2. Register it in `toolRegistry`:
```typescript
export const toolRegistry = {
  my_tool: new MyTool(),
  // ...
};
```

## Testing

Run the test suite to verify the system:

```bash
# Start the server first
npm run agent:start

# In another terminal, run tests
npm run agent:test
```

The test suite covers:
- Agent creation
- Graph creation
- Listing endpoints
- Graph invocation with different inputs

## Development

For development with auto-reload:

```bash
npm run agent:dev
```

## Troubleshooting

### Common Issues

1. **Port already in use**: Change the PORT environment variable
   ```bash
   PORT=3001 npm run agent:start
   ```

2. **Configuration not found**: Ensure the config directories exist
   - Default location: `./config/agents/` and `./config/graphs/`

3. **Graph compilation errors**: Check that all referenced agents exist and tool names are correct

## Future Enhancements

- [ ] Add real tool implementations (actual API calls)
- [ ] Implement dynamic tool discovery
- [ ] Add authentication and authorization
- [ ] Support for streaming responses
- [ ] Integration with vector databases for long-term memory
- [ ] Advanced routing conditions
- [ ] Graph visualization endpoint
- [ ] Metrics and monitoring