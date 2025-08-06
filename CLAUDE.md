# CLAUDE.md - AgentHub Implementation Guide

## 🎯 Project Status: Implementation Phase
We are now building the AgentHub system based on the comprehensive prompts in the `/prompts` directory.

## 📚 Essential Reading Before Any Work
1. **[CORE-PRINCIPLES.md](./CORE-PRINCIPLES.md)** - Our implementation philosophy and standards
2. **[00-master-implementation-orchestration.md](./prompts/00-master-implementation-orchestration.md)** - Implementation sequence and guidelines
3. **[IMPLEMENTATION-TRACKER.md](./IMPLEMENTATION-TRACKER.md)** - Current progress and status
4. **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** - Quick lookup for common patterns

## 🏗️ Current Implementation Focus
Check [IMPLEMENTATION-TRACKER.md](./IMPLEMENTATION-TRACKER.md) for the current module being implemented.

## Common Development Commands

### Build and Run
```bash
# Development mode with hot reload
npm run start:dev

# Production build
npm run build
npm run start:prod

# Run with Docker (development)
chmod +x scripts/dev.sh && ./scripts/dev.sh

# Run with Docker (production)
chmod +x scripts/prod.sh && ./scripts/prod.sh
```

### Database Management
```bash
# Run migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate

# Seed database
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

### Testing
```bash
# Run all tests with coverage
npm run test:all

# Run specific test types
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests
npm run test:e2e         # End-to-end tests

# Run quality checks (lint + type check)
npm run test:quality

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:cov
```

### Code Quality
```bash
# Run linter
npm run lint

# Format code
npm run format

# Type checking
npx tsc --noEmit
```

### Worker Process
```bash
# Start background worker
npm run worker
```

## 📝 Documentation Standards
**EVERY function, class, and module MUST have comprehensive documentation:**
```typescript
/**
 * What it does and why it exists
 * 
 * @description Detailed explanation
 * @param {Type} name - What it is, constraints, valid ranges
 * @returns What is returned and what it means
 * @throws When this error occurs and why
 * @example How to use it
 * 
 * Implementation notes:
 * - Key decisions and trade-offs
 * - Performance characteristics
 * - Future improvements
 */
```

## 🧪 Testing Requirements
- Write tests alongside implementation
- Test normal cases, edge cases, and error conditions
- Aim for >80% code coverage
- Integration tests for module interactions

## 💡 Core Principles Reminder
1. **We do the hard work** - No shortcuts, handle all edge cases
2. **Comments teach** - Explain WHY, not WHAT
3. **Errors guide users** - Make errors helpful with solutions
4. **Performance matters** - Measure, optimize, document
5. **Security first** - Never trust input, always validate

## 🚀 Session Startup Checklist
- [ ] Read CORE-PRINCIPLES.md
- [ ] Check IMPLEMENTATION-TRACKER.md for current status
- [ ] Read the relevant implementation prompt
- [ ] Review any existing code
- [ ] Plan the session goals

## High-Level Architecture

### AgentHub Design Pattern
AgentHub is a modular agent orchestration system that provides:
- **Module Registry**: Central connection point for all modules
- **Base Agent**: Foundation for all agent types with transparent LLM/tracing
- **Core Modules**: Session state, memory, execution, streaming, human-in-loop
- **Agent Types**: LLM, Graph, Loop, Parallel, Custom, Multi-Agent
- **Flowise Patterns**: Node-based workflow execution with state persistence

### Key Architectural Components

1. **Module-Based Architecture**: Each capability is a self-contained module with clear interfaces and dependencies

2. **Agent Hierarchy**: All agents extend BaseAgent which provides transparent LLM routing (LiteLLM) and observability (Langfuse)

3. **State Management**: Centralized session state with runtime persistence, execution tracking, and human interaction state

4. **Workflow Execution**: Graph-based workflow engine with parallel execution, conditional branching, and resume capability

5. **Human-in-the-Loop**: Seamless integration of human approval, input, and decision workflows

6. **Real-time Streaming**: SSE-based streaming for progress updates and interactive experiences

## Implementation Workflow

1. **Start with Module Prompts**: Each module has a detailed implementation prompt in `/prompts`
2. **Follow the Sequence**: Use the order specified in `00-master-implementation-orchestration.md`
3. **Write Tests First**: TDD approach helps clarify requirements
4. **Document Thoroughly**: Every public API needs examples
5. **Integration Test**: Ensure modules work together
6. **Update Tracker**: Keep `IMPLEMENTATION-TRACKER.md` current

# important-instruction-reminders
- **Quality over speed** - Do the hard work, be diligent
- **Understanding over copying** - Think deeply before coding
- **Teaching over hiding** - Comments should educate future developers
- **Test everything** - Untested code is broken code
- **Document thoroughly** - Every public API needs examples
- **Follow the prompts** - Implementation prompts contain critical details
- **Update tracking** - Keep implementation tracker current