# LLM Agent Implementation Prompt (Modular Architecture)

## Context
You are implementing the LLM Agent - the most common agent type that provides direct interaction with language models. This agent extends the BaseAgent and leverages the modular architecture to provide a clean interface for LLM-based interactions with automatic model selection, memory management, and tool usage.

## Pre-Implementation Requirements

### 1. Documentation Review
You MUST read:
1. Base Agent implementation: `/Users/sakshams/tekai/TekContextEngine/prompts/07-base-agent-implementation.md`
2. LiteLLM module interface: `/Users/sakshams/tekai/TekContextEngine/prompts/01-litellm-module-implementation.md`
3. Memory module interface: `/Users/sakshams/tekai/TekContextEngine/prompts/04-memory-module-implementation.md`
4. OpenAI function calling spec: https://platform.openai.com/docs/guides/function-calling

### 2. Understand LLM Agent Requirements
The LLM Agent must:
- Provide simple chat completion interface
- Support streaming responses
- Handle tool calls automatically
- Manage conversation memory
- Support different prompting strategies
- Enable fine-grained control when needed

## Implementation Steps

### Step 1: LLM Agent Types
Create `agents/llm/types.ts`:

```typescript
import { AgentConfig, AgentInput, AgentOutput } from '../base/types';

export interface LLMAgentConfig extends AgentConfig {
  // Model settings
  model?: {
    primary?: string;           // Primary model to use
    fallback?: string[];        // Fallback models
    routing?: ModelRouting;     // Routing strategy
  };
  
  // Prompting
  prompting?: {
    systemPrompt?: string;      // System prompt
    promptTemplate?: string;    // Template for user prompts
    examples?: Example[];       // Few-shot examples
    format?: ResponseFormat;    // Output format requirements
  };
  
  // Memory settings
  memory?: {
    enabled?: boolean;          // Enable memory (default: true)
    maxMessages?: number;       // Max messages to keep
    summarizeAfter?: number;    // Summarize after N messages
    includeSystemPrompt?: boolean; // Include system in memory
  };
  
  // Tool settings
  tools?: {
    autoExecute?: boolean;      // Auto-execute tool calls
    requireConfirmation?: string[]; // Tools requiring confirmation
    maxIterations?: number;     // Max tool iterations
  };
  
  // Behavior
  behavior?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    stopSequences?: string[];
    responseValidation?: (response: string) => boolean;
  };
}

export interface LLMAgentInput extends AgentInput {
  // Additional LLM-specific options
  systemPromptOverride?: string;
  includeMemory?: boolean;
  clearMemory?: boolean;
  tools?: string[] | boolean;  // Tool names or true for all
}

export interface LLMAgentOutput extends AgentOutput {
  // Additional LLM-specific output
  model: string;              // Actual model used
  reasoning?: string;         // Chain-of-thought reasoning
  toolResults?: ToolResult[]; // Results from tool execution
  memoryUpdated?: boolean;    // Whether memory was updated
}

export type ModelRouting = 
  | 'cost'      // Optimize for cost
  | 'quality'   // Optimize for quality
  | 'speed'     // Optimize for speed
  | 'balanced'; // Balance all factors

export interface Example {
  input: string;
  output: string;
  explanation?: string;
}

export type ResponseFormat = 
  | 'text'      // Plain text
  | 'json'      // JSON object
  | 'markdown'  // Markdown formatted
  | 'code';     // Code with syntax

export interface ToolResult {
  tool: string;
  input: any;
  output: any;
  error?: string;
  duration?: number;
}
```

### Step 2: LLM Agent Implementation
Create `agents/llm/llm-agent.ts`:

```typescript
import { BaseAgent } from '../base/base-agent';

export class LLMAgent extends BaseAgent {
  readonly type = 'llm' as AgentType;
  
  protected config: LLMAgentConfig;
  private conversationMemory: ConversationMemory;
  
  constructor(config: LLMAgentConfig) {
    super(config);
    this.conversationMemory = new ConversationMemory(
      config.memory?.maxMessages || 20
    );
  }
  
  protected async executeCore(input: LLMAgentInput): Promise<LLMAgentOutput> {
    // Clear memory if requested
    if (input.clearMemory) {
      await this.clearMemory(input.sessionId);
    }
    
    // Build messages array
    const messages = await this.buildMessages(input);
    
    // Determine tools to use
    const tools = await this.determineTools(input);
    
    // Make LLM call
    const response = await this.callLLM(messages, tools, input.options);
    
    // Handle tool calls if any
    let toolResults: ToolResult[] = [];
    if (response.toolCalls && this.config.tools?.autoExecute !== false) {
      toolResults = await this.executeToolCalls(response.toolCalls, input);
      
      // Make follow-up call with tool results if needed
      if (toolResults.length > 0) {
        const followUpMessages = [
          ...messages,
          response.message,
          this.createToolResultsMessage(toolResults)
        ];
        
        const finalResponse = await this.callLLM(followUpMessages, [], input.options);
        response.message = finalResponse.message;
        response.usage = this.combineUsage(response.usage, finalResponse.usage);
      }
    }
    
    // Update memory if enabled
    let memoryUpdated = false;
    if (this.config.memory?.enabled !== false && input.includeMemory !== false) {
      await this.updateMemory(input, response.message.content);
      memoryUpdated = true;
    }
    
    return {
      content: response.message.content,
      toolCalls: response.toolCalls,
      usage: response.usage,
      model: response.model,
      toolResults,
      memoryUpdated,
      metadata: {
        ...response.metadata,
        duration: response.duration
      }
    };
  }
  
  protected async buildMessages(
    input: LLMAgentInput
  ): Promise<Message[]> {
    const messages: Message[] = [];
    
    // Add system prompt
    const systemPrompt = input.systemPromptOverride || 
                        this.config.prompting?.systemPrompt;
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }
    
    // Add examples if provided
    if (this.config.prompting?.examples) {
      for (const example of this.config.prompting.examples) {
        messages.push(
          { role: 'user', content: example.input },
          { role: 'assistant', content: example.output }
        );
      }
    }
    
    // Add conversation memory
    if (this.config.memory?.enabled !== false && input.includeMemory !== false) {
      const memories = await this.getRelevantMemories(input);
      messages.push(...memories);
    }
    
    // Add current input
    if (input.messages) {
      messages.push(...input.messages);
    } else if (input.prompt) {
      const prompt = this.formatPrompt(input.prompt);
      messages.push({ role: 'user', content: prompt });
    }
    
    return messages;
  }
  
  protected async getRelevantMemories(
    input: LLMAgentInput
  ): Promise<Message[]> {
    // Get working memory
    const memories = await this.modules.memory.getWorkingMemory({
      sessionId: input.sessionId,
      limit: this.config.memory?.maxMessages,
      types: ['user', 'assistant']
    });
    
    // Convert to messages
    return memories.map(mem => ({
      role: mem.type as 'user' | 'assistant',
      content: mem.content
    }));
  }
  
  protected async determineTools(
    input: LLMAgentInput
  ): Promise<Tool[]> {
    if (input.tools === false) {
      return [];
    }
    
    const toolNames = input.tools === true 
      ? Array.from(this.boundTools)
      : input.tools || this.config.modules?.tools || [];
    
    const tools: Tool[] = [];
    
    for (const toolName of toolNames) {
      const tool = await this.modules.tools.get(toolName);
      if (tool) {
        tools.push({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema
          }
        });
      }
    }
    
    return tools;
  }
  
  protected async callLLM(
    messages: Message[],
    tools: Tool[],
    options?: any
  ): Promise<LLMInternalResponse> {
    const startTime = Date.now();
    
    const request: LLMRequest = {
      model: this.selectModel(messages, options),
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined,
      temperature: options?.temperature || this.config.behavior?.temperature,
      max_tokens: options?.maxTokens || this.config.behavior?.maxTokens,
      top_p: options?.topP || this.config.behavior?.topP,
      stop: this.config.behavior?.stopSequences,
      user: this.id,
      
      // Routing hints for LiteLLM
      routing_hints: {
        priority: this.config.model?.routing || 'balanced',
        required_capabilities: tools.length > 0 ? ['function_calling'] : []
      }
    };
    
    const response = await this.complete(request);
    
    // Validate response if configured
    if (this.config.behavior?.responseValidation) {
      const isValid = this.config.behavior.responseValidation(
        response.choices[0].message.content || ''
      );
      
      if (!isValid) {
        throw new Error('Response validation failed');
      }
    }
    
    return {
      message: response.choices[0].message,
      toolCalls: response.choices[0].message.tool_calls,
      usage: response.usage,
      model: response.model,
      duration: Date.now() - startTime,
      metadata: response._litellm_metadata
    };
  }
  
  protected selectModel(messages: Message[], options?: any): string {
    // Allow override
    if (options?.model) {
      return options.model;
    }
    
    // Use configured primary model
    if (this.config.model?.primary) {
      return this.config.model.primary;
    }
    
    // Let LiteLLM router decide based on routing hints
    return 'auto';
  }
  
  protected async executeToolCalls(
    toolCalls: ToolCall[],
    input: LLMAgentInput
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];
    
    for (const toolCall of toolCalls) {
      const startTime = Date.now();
      
      try {
        // Check if confirmation required
        if (this.config.tools?.requireConfirmation?.includes(toolCall.function.name)) {
          // In a real implementation, this would request user confirmation
          console.log(`Tool ${toolCall.function.name} requires confirmation`);
        }
        
        // Parse arguments
        const args = JSON.parse(toolCall.function.arguments);
        
        // Execute tool
        const result = await this.executeTool(
          toolCall.function.name,
          args,
          {
            sessionId: input.sessionId,
            userId: input.userId,
            metadata: {
              toolCallId: toolCall.id
            }
          }
        );
        
        results.push({
          tool: toolCall.function.name,
          input: args,
          output: result.data,
          duration: Date.now() - startTime
        });
        
      } catch (error) {
        results.push({
          tool: toolCall.function.name,
          input: toolCall.function.arguments,
          output: null,
          error: error.message,
          duration: Date.now() - startTime
        });
      }
    }
    
    return results;
  }
  
  // Streaming support
  async *stream(input: LLMAgentInput): AsyncIterableIterator<AgentStreamOutput> {
    // Build messages
    const messages = await this.buildMessages(input);
    
    // Stream response
    let accumulated = '';
    let toolCalls: ToolCall[] = [];
    
    const request: LLMRequest = {
      model: this.selectModel(messages, input.options),
      messages,
      temperature: input.options?.temperature || this.config.behavior?.temperature,
      max_tokens: input.options?.maxTokens || this.config.behavior?.maxTokens,
      stream: true
    };
    
    for await (const chunk of this.streamComplete(request)) {
      if (chunk.choices[0].delta.content) {
        accumulated += chunk.choices[0].delta.content;
        
        yield {
          delta: chunk.choices[0].delta.content,
          accumulated,
          finished: false
        };
      }
      
      // Handle tool calls in streaming
      if (chunk.choices[0].delta.tool_calls) {
        // Accumulate tool calls
        // This is complex and depends on the streaming format
      }
    }
    
    // Update memory after streaming completes
    if (this.config.memory?.enabled !== false) {
      await this.updateMemory(input, accumulated);
    }
    
    yield {
      delta: '',
      accumulated,
      finished: true,
      metadata: {
        memoryUpdated: true
      }
    };
  }
  
  // Memory management
  protected async updateMemory(
    input: LLMAgentInput,
    response: string
  ): Promise<void> {
    const sessionId = input.sessionId;
    
    // Check if summarization needed
    const memories = await this.modules.memory.getWorkingMemory({
      sessionId,
      limit: 1000
    });
    
    if (memories.length > (this.config.memory?.summarizeAfter || 50)) {
      // Trigger async consolidation
      this.modules.memory.consolidate(sessionId).catch(err => {
        console.error('Memory consolidation failed:', err);
      });
    }
  }
  
  protected async clearMemory(sessionId: string): Promise<void> {
    await this.modules.memory.clearWorkingMemory(sessionId);
  }
  
  // Utility methods
  protected formatPrompt(prompt: string): string {
    if (this.config.prompting?.promptTemplate) {
      return this.config.prompting.promptTemplate.replace('{prompt}', prompt);
    }
    return prompt;
  }
  
  protected createToolResultsMessage(results: ToolResult[]): Message {
    const content = results.map(r => {
      if (r.error) {
        return `Tool ${r.tool} failed: ${r.error}`;
      }
      return `Tool ${r.tool} returned: ${JSON.stringify(r.output)}`;
    }).join('\n\n');
    
    return {
      role: 'tool',
      content
    };
  }
  
  protected combineUsage(usage1?: any, usage2?: any): any {
    if (!usage1) return usage2;
    if (!usage2) return usage1;
    
    return {
      promptTokens: (usage1.promptTokens || 0) + (usage2.promptTokens || 0),
      completionTokens: (usage1.completionTokens || 0) + (usage2.completionTokens || 0),
      totalTokens: (usage1.totalTokens || 0) + (usage2.totalTokens || 0),
      cost: (usage1.cost || 0) + (usage2.cost || 0)
    };
  }
  
  // Validation
  protected validateInput(input: LLMAgentInput): void {
    super.validateInput(input);
    
    if (!input.messages && !input.prompt) {
      throw new Error('Either messages or prompt must be provided');
    }
  }
  
  // Capabilities
  protected getCustomCapabilities(): Partial<AgentCapabilities> {
    return {
      supportsStreaming: true,
      supportsTools: true,
      maxContextLength: 128000, // Depends on model
      supportedModels: [
        'gpt-4',
        'gpt-3.5-turbo',
        'claude-3-opus',
        'claude-3-sonnet'
      ]
    };
  }
}
```

### Step 3: Conversation Memory Helper
Create `agents/llm/conversation-memory.ts`:

```typescript
export class ConversationMemory {
  private messages: Message[] = [];
  
  constructor(private maxMessages: number) {}
  
  add(message: Message): void {
    this.messages.push(message);
    
    // Trim if exceeds max
    if (this.messages.length > this.maxMessages) {
      // Keep system prompts and recent messages
      const systemMessages = this.messages.filter(m => m.role === 'system');
      const recentMessages = this.messages
        .filter(m => m.role !== 'system')
        .slice(-this.maxMessages);
      
      this.messages = [...systemMessages, ...recentMessages];
    }
  }
  
  getMessages(): Message[] {
    return [...this.messages];
  }
  
  clear(): void {
    this.messages = [];
  }
  
  getTokenEstimate(): number {
    // Rough estimate: 1 token per 4 characters
    return this.messages.reduce((sum, msg) => {
      return sum + Math.ceil(msg.content.length / 4);
    }, 0);
  }
}
```

### Step 4: LLM Agent Factory
Create `agents/llm/factory.ts`:

```typescript
import { AgentFactory } from '../base/factory';

export class LLMAgentFactory extends AgentFactory<LLMAgent> {
  createAgent(config: LLMAgentConfig): LLMAgent {
    return new LLMAgent(config);
  }
}

// Register with global registry
import { agentFactoryRegistry } from '../base/factory';

agentFactoryRegistry.register('llm', new LLMAgentFactory());

// Convenience function
export async function createLLMAgent(
  config: LLMAgentConfig
): Promise<LLMAgent> {
  const factory = new LLMAgentFactory();
  return factory.create(config);
}
```

### Step 5: Preset Configurations
Create `agents/llm/presets.ts`:

```typescript
export const LLMAgentPresets = {
  // Simple chatbot
  chatbot: {
    name: 'Chatbot',
    description: 'Simple conversational agent',
    prompting: {
      systemPrompt: 'You are a helpful assistant.'
    },
    memory: {
      enabled: true,
      maxMessages: 20
    },
    behavior: {
      temperature: 0.7
    }
  },
  
  // Code assistant
  codeAssistant: {
    name: 'Code Assistant',
    description: 'Programming help and code generation',
    prompting: {
      systemPrompt: 'You are an expert programmer. Provide clear, well-commented code.',
      format: 'code' as ResponseFormat
    },
    model: {
      routing: 'quality' as ModelRouting
    },
    behavior: {
      temperature: 0.3
    }
  },
  
  // Research assistant
  researcher: {
    name: 'Research Assistant',
    description: 'In-depth research and analysis',
    prompting: {
      systemPrompt: 'You are a research assistant. Provide thorough, well-sourced analysis.',
      format: 'markdown' as ResponseFormat
    },
    model: {
      routing: 'quality' as ModelRouting
    },
    memory: {
      enabled: true,
      summarizeAfter: 10
    },
    tools: {
      autoExecute: true
    },
    behavior: {
      temperature: 0.5,
      maxTokens: 2000
    }
  }
};
```

## Testing Requirements

### 1. Unit Tests
- Message building with memory
- Tool selection and execution
- Model selection logic
- Response validation
- Memory management

### 2. Integration Tests
- Full conversation flow
- Tool execution with real tools
- Memory persistence
- Streaming functionality
- Error recovery

### 3. Performance Tests
- Response latency
- Memory usage with long conversations
- Streaming performance
- Tool execution overhead

## Usage Examples

```typescript
// Basic usage
const agent = await createLLMAgent({
  name: 'Assistant',
  prompting: {
    systemPrompt: 'You are a helpful AI assistant.'
  }
});

const response = await agent.execute({
  prompt: 'What is the weather like?',
  sessionId: 'session-123'
});

// With tools
const agentWithTools = await createLLMAgent({
  name: 'Tool User',
  modules: {
    tools: ['weather', 'calculator']
  },
  tools: {
    autoExecute: true
  }
});

// Streaming
for await (const chunk of agent.stream({ 
  prompt: 'Tell me a story',
  sessionId: 'session-123'
})) {
  console.log(chunk.delta);
}

// Using presets
const codeAgent = await createLLMAgent({
  ...LLMAgentPresets.codeAssistant,
  name: 'My Code Helper'
});
```

## Common Pitfalls to Avoid

1. **Don't forget memory limits** - Long conversations need management
2. **Don't ignore tool errors** - Handle gracefully
3. **Don't hardcode models** - Use routing for flexibility
4. **Don't skip validation** - Validate responses when critical
5. **Don't block on memory operations** - Use async where possible
6. **Don't expose raw LLM responses** - Transform to consistent format

## Final Validation Questions

1. Is the LLM agent easy to use for simple cases?
2. Does memory management work transparently?
3. Are tool calls handled automatically?
4. Does streaming work smoothly?
5. Is model selection intelligent?
6. Are errors handled gracefully?

## Next Steps
After completing the LLM Agent, implement the Sequential Agent (09-sequential-agent-implementation.md) for workflow-based execution.