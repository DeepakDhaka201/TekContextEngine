# AgentHub Implementation Prompts

This directory contains comprehensive implementation prompts for building the AgentHub system using Claude Code. Each prompt is designed to guide Claude through implementing a specific component with deep thinking, proper documentation research, and thorough testing.

## Overview

AgentHub is a unified agent orchestration framework that provides:
- **Transparent LLM routing** via LiteLLM
- **Automatic observability** via Langfuse  
- **Multiple agent types** (LLM, Sequential, Loop, Parallel, Custom, Multi-Agent)
- **Simple, powerful APIs** for developers

## Implementation Order

Follow this sequence for best results:

1. **[01-base-agent-implementation.md](01-base-agent-implementation.md)** - Foundation with LiteLLM/Langfuse integration
2. **[02-llm-agent-implementation.md](02-llm-agent-implementation.md)** - Primary conversational agent
3. **[03-sequential-agent-implementation.md](03-sequential-agent-implementation.md)** - Step-by-step workflow orchestration
4. **[04-loop-agent-implementation.md](04-loop-agent-implementation.md)** - Iterative execution patterns
5. **[05-parallel-agent-implementation.md](05-parallel-agent-implementation.md)** - Concurrent agent execution
6. **[06-custom-agent-implementation.md](06-custom-agent-implementation.md)** - Framework for user-defined agents
7. **[07-multi-agent-implementation.md](07-multi-agent-implementation.md)** - Coordinated agent teams
8. **[08-agenthub-core-implementation.md](08-agenthub-core-implementation.md)** - Central factory and registry

## Using the Prompts

### For Each Implementation:

1. **Start a new Claude Code session** for each major component
2. **Provide the prompt** to Claude Code 
3. **Ensure access to**:
   - `/Users/sakshams/tekai/TekContextEngine/agenthub-design.md` - Core design document
   - Previously implemented components
   - External documentation links

### Key Principles Emphasized:

- **Context is King**: Always read documentation first
- **Break Down Tasks**: Think before implementing
- **Test Thoroughly**: Verify implementation completeness
- **No Shortcuts**: Do the hard things properly
- **Iterate**: Break down → test → read docs → search → learn → implement → test → move

## What Each Prompt Contains

### Structure:
1. **Context** - What is being built and why
2. **Pre-Implementation Requirements** - Documentation to read, concepts to understand
3. **Implementation Steps** - Detailed technical requirements
4. **Testing Requirements** - What must be tested
5. **Common Pitfalls** - What to avoid
6. **Validation Questions** - Final checklist

### Focus Areas:
- **Deep technical thinking** before coding
- **Research requirements** for external tools
- **Comprehensive testing** at each step
- **Production considerations** throughout
- **Developer experience** as a priority

## Expected Outcomes

After implementing all components:

### Technical Capabilities:
- ✅ Transparent LLM routing with automatic model selection
- ✅ Comprehensive tracing without developer configuration  
- ✅ Multiple agent types for different use cases
- ✅ Robust error handling and recovery
- ✅ Production-ready monitoring and health checks

### Developer Experience:
```typescript
// Simple usage - everything else is transparent
const agent = AgentHub.createAgent({
  type: 'llm',
  name: 'assistant',
  instruction: 'You are a helpful assistant'
});

const response = await agent.execute({ input: "Hello!" });
```

### Advanced Capabilities:
```typescript
// Complex multi-agent research system
const researchTeam = AgentHub.createAgent({
  type: 'multi_agent',
  name: 'research-team',
  agents: [
    { id: 'coordinator', agent: coordinatorAgent, role: 'manager' },
    { id: 'researcher', agent: researchAgent, role: 'worker' },
    { id: 'analyst', agent: analysisAgent, role: 'worker' },
    { id: 'writer', agent: writerAgent, role: 'worker' }
  ],
  coordination: { type: 'hierarchical' }
});
```

## Testing Strategy

Each prompt includes specific testing requirements:

1. **Unit Tests** - Component isolation
2. **Integration Tests** - Inter-component communication
3. **End-to-End Tests** - Complete workflows
4. **Performance Tests** - Benchmarks and optimization
5. **Chaos Tests** - Failure scenarios

## Documentation Requirements

Each implementation should include:

- **API Documentation** - JSDoc for all public APIs
- **Architecture Decisions** - Why specific choices were made
- **Usage Examples** - Common patterns
- **Performance Considerations** - Optimization notes
- **Migration Guides** - For updates

## Tips for Success

1. **Don't Rush** - Each component is complex
2. **Ask Questions** - If requirements are unclear
3. **Test Incrementally** - Don't wait until the end
4. **Keep Context** - Reference the design document frequently
5. **Think Production** - Consider scale, errors, monitoring

## Support

If you encounter issues:
1. Review the relevant prompt carefully
2. Check the design document for clarification
3. Ensure prerequisites are implemented
4. Test in isolation first
5. Use the debugging tools provided

Remember: The goal is a production-ready system that makes AI agent development simple while hiding all complexity. Take the time to do it right!