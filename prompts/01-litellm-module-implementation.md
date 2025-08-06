# LiteLLM Module Implementation Prompt

## Context
You are implementing the LiteLLM Module - the core module that handles all LLM interactions through the LiteLLM proxy server. Since LiteLLM is Python-based, this module will be a TypeScript client that communicates with the LiteLLM proxy server via HTTP API. This module must handle model routing, retries, streaming, and provide a clean interface for other modules.

## Pre-Implementation Requirements

### 1. Setup LiteLLM Proxy Server
Before implementing the TypeScript module, ensure the LiteLLM proxy is running:

```bash
# Install LiteLLM
pip install litellm[proxy]

# Create config file: litellm_config.yaml
# Start proxy server
litellm --config litellm_config.yaml --port 8000
```

### 2. Documentation Review
You MUST read:
1. LiteLLM Proxy documentation: https://docs.litellm.ai/docs/proxy/quick_start
2. LiteLLM API reference: https://docs.litellm.ai/docs/proxy/api
3. OpenAI API format (which LiteLLM mimics): https://platform.openai.com/docs/api-reference
4. Study the revised architecture: `/Users/sakshams/tekai/TekContextEngine/agenthub-architecture-revised.md`

### 3. Understand Module Requirements
This module must:
- Connect to LiteLLM proxy server
- Handle all LLM operations (completion, streaming, embeddings)
- Provide consistent error handling
- Support request/response transformation
- Handle retries at the client level
- Provide health checks

## Implementation Steps

### Step 1: Module Interface and Types
Create `modules/litellm/types.ts`:

```typescript
export interface ILiteLLMModule {
  name: string;
  version: string;
  
  // Lifecycle
  initialize(config: LiteLLMConfig): Promise<void>;
  health(): Promise<HealthStatus>;
  shutdown(): Promise<void>;
  
  // Core operations
  complete(request: LLMRequest): Promise<LLMResponse>;
  stream(request: LLMRequest): AsyncIterableIterator<LLMStreamChunk>;
  embed(request: EmbedRequest): Promise<EmbedResponse>;
  
  // Model management
  listModels(): Promise<ModelInfo[]>;
  getModelInfo(model: string): Promise<ModelDetails>;
  
  // Usage tracking
  getUsage(timeframe?: TimeFrame): Promise<UsageStats>;
}

export interface LiteLLMConfig {
  proxyUrl: string;              // Default: http://localhost:8000
  apiKey?: string;               // Proxy API key if configured
  timeout?: number;              // Request timeout
  maxRetries?: number;           // Client-side retries
  retryDelay?: number;           // Delay between retries
  
  // Advanced options
  customHeaders?: Record<string, string>;
  httpAgent?: any;               // For connection pooling
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface LLMRequest {
  model?: string;                // Model name or 'auto' for routing
  messages: Message[];
  
  // Optional parameters
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  
  // Function calling
  tools?: Tool[];
  tool_choice?: 'auto' | 'none' | ToolChoice;
  
  // Routing hints
  routing_hints?: {
    priority?: 'cost' | 'speed' | 'quality';
    max_cost?: number;
    max_latency?: number;
    required_capabilities?: string[];
  };
  
  // Metadata
  user?: string;
  metadata?: Record<string, any>;
}

export interface LLMResponse {
  id: string;
  model: string;
  choices: Choice[];
  usage: TokenUsage;
  created: number;
  
  // Extended metadata
  _litellm_metadata?: {
    actual_model: string;
    response_cost: number;
    latency_ms: number;
    cache_hit?: boolean;
  };
}
```

### Step 2: HTTP Client Implementation
Create `modules/litellm/client.ts`:

**Research First**:
1. HTTP client best practices in Node.js
2. Connection pooling strategies
3. Streaming response handling
4. Error handling patterns

**Implementation Requirements**:

```typescript
import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';

class LiteLLMProxyClient {
  private client: AxiosInstance;
  private eventEmitter: EventEmitter;
  
  constructor(config: LiteLLMConfig) {
    this.client = axios.create({
      baseURL: config.proxyUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
        ...config.customHeaders
      }
    });
    
    this.setupInterceptors();
  }
  
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add request ID for tracing
        config.headers['X-Request-ID'] = generateRequestId();
        
        // Log request
        this.log('debug', 'LiteLLM Request', {
          method: config.method,
          url: config.url,
          headers: config.headers
        });
        
        return config;
      },
      (error) => {
        this.log('error', 'Request Error', error);
        return Promise.reject(error);
      }
    );
    
    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Extract and log metadata
        const metadata = response.headers['x-litellm-metadata'];
        if (metadata) {
          this.log('info', 'LiteLLM Metadata', JSON.parse(metadata));
        }
        
        return response;
      },
      async (error) => {
        // Handle specific error types
        if (error.response) {
          switch (error.response.status) {
            case 429: // Rate limit
              throw new RateLimitError(error.response.data);
            
            case 503: // Service unavailable
              throw new ServiceUnavailableError(error.response.data);
            
            default:
              throw new LiteLLMError(
                error.response.status,
                error.response.data
              );
          }
        }
        
        throw error;
      }
    );
  }
  
  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await this.client.post(endpoint, data);
    return response.data;
  }
  
  async *stream(endpoint: string, data: any): AsyncIterableIterator<any> {
    const response = await this.client.post(endpoint, {
      ...data,
      stream: true
    }, {
      responseType: 'stream'
    });
    
    for await (const chunk of response.data) {
      const lines = chunk.toString().split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            return;
          }
          
          try {
            yield JSON.parse(data);
          } catch (e) {
            this.log('warn', 'Failed to parse SSE chunk', { line });
          }
        }
      }
    }
  }
}
```

### Step 3: Core Module Implementation
Create `modules/litellm/index.ts`:

```typescript
export class LiteLLMModule implements ILiteLLMModule {
  readonly name = 'litellm';
  readonly version = '1.0.0';
  
  private client: LiteLLMProxyClient;
  private config: LiteLLMConfig;
  private initialized = false;
  private healthCheckInterval?: NodeJS.Timer;
  
  async initialize(config: LiteLLMConfig): Promise<void> {
    if (this.initialized) {
      throw new Error('LiteLLM module already initialized');
    }
    
    this.config = config;
    this.client = new LiteLLMProxyClient(config);
    
    // Verify connection
    const health = await this.health();
    if (health.status !== 'healthy') {
      throw new Error(`LiteLLM proxy unhealthy: ${health.message}`);
    }
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    this.initialized = true;
  }
  
  async complete(request: LLMRequest): Promise<LLMResponse> {
    this.ensureInitialized();
    
    // Transform request to OpenAI format
    const openAIRequest = this.transformRequest(request);
    
    // Add retry logic
    let lastError: Error;
    for (let i = 0; i < (this.config.maxRetries || 3); i++) {
      try {
        const response = await this.client.post<any>(
          '/v1/chat/completions',
          openAIRequest
        );
        
        return this.transformResponse(response);
        
      } catch (error) {
        lastError = error;
        
        // Don't retry on client errors
        if (error instanceof LiteLLMError && error.status < 500) {
          throw error;
        }
        
        // Wait before retry
        if (i < (this.config.maxRetries || 3) - 1) {
          await this.delay(this.calculateBackoff(i));
        }
      }
    }
    
    throw lastError!;
  }
  
  async *stream(request: LLMRequest): AsyncIterableIterator<LLMStreamChunk> {
    this.ensureInitialized();
    
    const openAIRequest = this.transformRequest(request);
    
    for await (const chunk of this.client.stream('/v1/chat/completions', openAIRequest)) {
      yield this.transformStreamChunk(chunk);
    }
  }
  
  async embed(request: EmbedRequest): Promise<EmbedResponse> {
    this.ensureInitialized();
    
    const response = await this.client.post<any>('/v1/embeddings', {
      model: request.model || 'text-embedding-ada-002',
      input: request.input,
      encoding_format: request.encoding_format
    });
    
    return {
      embeddings: response.data.map((d: any) => d.embedding),
      model: response.model,
      usage: response.usage
    };
  }
  
  async health(): Promise<HealthStatus> {
    try {
      const response = await this.client.post('/health', {});
      
      return {
        status: 'healthy',
        message: 'LiteLLM proxy is operational',
        details: response
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        details: { error }
      };
    }
  }
  
  private transformRequest(request: LLMRequest): any {
    // Transform to OpenAI format
    const transformed: any = {
      model: request.model || 'gpt-3.5-turbo',  // Default model
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
      top_p: request.top_p,
      frequency_penalty: request.frequency_penalty,
      presence_penalty: request.presence_penalty,
      stop: request.stop,
      user: request.user
    };
    
    // Add tools if present
    if (request.tools) {
      transformed.tools = request.tools;
      transformed.tool_choice = request.tool_choice;
    }
    
    // Add routing hints as metadata
    if (request.routing_hints) {
      transformed.metadata = {
        ...request.metadata,
        routing_hints: request.routing_hints
      };
    }
    
    return transformed;
  }
  
  private transformResponse(response: any): LLMResponse {
    return {
      id: response.id,
      model: response.model,
      choices: response.choices,
      usage: response.usage,
      created: response.created,
      _litellm_metadata: response._litellm_metadata
    };
  }
}
```

### Step 4: Error Handling
Create `modules/litellm/errors.ts`:

```typescript
export class LiteLLMError extends Error {
  constructor(
    public status: number,
    public data: any
  ) {
    super(`LiteLLM Error ${status}: ${JSON.stringify(data)}`);
    this.name = 'LiteLLMError';
  }
}

export class RateLimitError extends LiteLLMError {
  constructor(data: any) {
    super(429, data);
    this.name = 'RateLimitError';
  }
  
  get retryAfter(): number {
    return this.data.retry_after || 60;
  }
}

export class ServiceUnavailableError extends LiteLLMError {
  constructor(data: any) {
    super(503, data);
    this.name = 'ServiceUnavailableError';
  }
}

export class ModelNotFoundError extends LiteLLMError {
  constructor(model: string) {
    super(404, { error: `Model '${model}' not found` });
    this.name = 'ModelNotFoundError';
  }
}
```

### Step 5: Module Factory and Wrapping
Create `modules/litellm/factory.ts`:

```typescript
import { wrapModule } from '../common/wrapper';

export function createLiteLLMModule(config: LiteLLMConfig): ILiteLLMModule {
  const module = new LiteLLMModule();
  
  // Wrap for monitoring and access control
  return wrapModule(module, {
    name: 'litellm',
    monitoring: {
      trackLatency: true,
      trackErrors: true,
      trackUsage: true
    },
    access: {
      rateLimit: {
        requests: 1000,
        window: 60000  // 1 minute
      }
    }
  });
}
```

### Step 6: Testing

Create comprehensive tests for:

1. **Unit Tests** (`__tests__/unit/`)
   - Request transformation
   - Response transformation
   - Error handling
   - Retry logic

2. **Integration Tests** (`__tests__/integration/`)
   - Real proxy connection
   - Completion requests
   - Streaming
   - Embeddings
   - Error scenarios

3. **Load Tests** (`__tests__/load/`)
   - Concurrent requests
   - Rate limiting
   - Connection pooling

### Step 7: Configuration Examples

Create `modules/litellm/config/`:

**Example proxy configuration**:
```yaml
# litellm_config.yaml
model_list:
  - model_name: "gpt-4"
    litellm_params:
      model: "openai/gpt-4"
      api_key: "${OPENAI_API_KEY}"
      
  - model_name: "claude-3"
    litellm_params:
      model: "anthropic/claude-3-opus-20240229"
      api_key: "${ANTHROPIC_API_KEY}"
      
  - model_name: "llama-3"
    litellm_params:
      model: "together_ai/meta-llama/Llama-3-70b-chat-hf"
      api_key: "${TOGETHER_API_KEY}"

router_settings:
  routing_strategy: "latency-based"
  
  model_group_alias:
    "fast": ["gpt-3.5-turbo", "claude-3-haiku"]
    "quality": ["gpt-4", "claude-3-opus"]
    
  fallbacks:
    "gpt-4": ["claude-3", "llama-3"]
    "claude-3": ["gpt-4", "llama-3"]
    
  retry_after: 5
  allowed_fails: 3
  
  set_verbose: true
  
general_settings:
  master_key: "${LITELLM_MASTER_KEY}"
  database_url: "postgresql://localhost/litellm"
  
  # Caching
  cache: true
  cache_params:
    type: "redis"
    host: "localhost"
    port: 6379
    
  # Monitoring
  success_callback: ["langfuse"]
  failure_callback: ["langfuse"]
```

## Post-Implementation Validation

### 1. Functionality Checklist
- [ ] Connects to LiteLLM proxy successfully
- [ ] Handles completions with all parameters
- [ ] Streaming works properly
- [ ] Embeddings generation works
- [ ] Retry logic functions correctly
- [ ] Error handling covers all cases
- [ ] Health checks work

### 2. Performance Requirements
- [ ] Request latency < 50ms overhead
- [ ] Connection pooling works
- [ ] No memory leaks
- [ ] Handles 1000+ req/sec

### 3. Integration Requirements
- [ ] Works with module wrapper
- [ ] Monitoring hooks functional
- [ ] Follows module interface
- [ ] Configuration validation

## Common Pitfalls to Avoid

1. **Don't bypass the proxy** - All LLM calls must go through LiteLLM proxy
2. **Don't ignore streaming edge cases** - Handle partial chunks, connection drops
3. **Don't hardcode endpoints** - Use configuration
4. **Don't forget health monitoring** - Critical for production
5. **Don't skip error transformation** - Provide consistent errors
6. **Don't ignore rate limits** - Implement client-side throttling

## Debugging Tools

Create `modules/litellm/debug.ts`:
```typescript
export class LiteLLMDebugger {
  // Request/response logging
  // Latency tracking
  // Error analysis
  // Model usage statistics
}
```

## Final Validation Questions

1. Can the module handle proxy server restarts gracefully?
2. Does streaming work with large responses?
3. Are all errors properly typed and handled?
4. Is the configuration flexible enough?
5. Does health monitoring provide useful information?
6. Is the module truly independent?

## Next Steps
Once the LiteLLM module is complete and tested, proceed to implement the Langfuse module (02-langfuse-module-implementation.md) for observability integration.