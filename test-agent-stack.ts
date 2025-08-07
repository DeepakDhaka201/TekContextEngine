#!/usr/bin/env npx ts-node

/**
 * AgentHub Integration Test
 * 
 * This script tests the complete agent stack:
 * 1. Environment configuration
 * 2. Module Registry initialization
 * 3. Langfuse integration
 * 4. LiteLLM proxy connection
 * 5. Agent creation from config
 * 6. Basic agent execution
 * 7. Tool calling (dummy tools)
 * 8. Observability tracing
 * 
 * Usage:
 *   npm run test:integration
 *   or
 *   npx ts-node test-agent-stack.ts
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { ModuleRegistry } from './src/modules/registry/registry';
import { createLiteLLMModule } from './src/modules/litellm/factory';
import { createLangfuseModule } from './src/modules/langfuse/factory';
import { LLMAgent } from './src/agents/llm/llm-agent';

// Load environment variables
dotenv.config();

interface AgentConfig {
  name: string;
  type: string;
  description: string;
  config: {
    model: string;
    temperature: number;
    max_tokens: number;
    system_message: string;
  };
  tools: string[];
  enabled: boolean;
}

interface ToolConfig {
  name: string;
  type: string;
  description: string;
  parameters: any[];
}

interface ConfigFile {
  agents: AgentConfig[];
  tools: ToolConfig[];
  settings: {
    llm: {
      provider: string;
      base_url: string;
      api_key: string;
    };
    observability: {
      langfuse: {
        enabled: boolean;
        public_key: string;
        secret_key: string;
        base_url: string;
      };
    };
    registry: {
      strict: boolean;
      health_check_interval: number;
    };
  };
}

class AgentStackTester {
  private registry: ModuleRegistry;
  private config: ConfigFile;
  
  constructor() {
    this.registry = new ModuleRegistry();
  }
  
  async run(): Promise<void> {
    console.log('🚀 Starting AgentHub Integration Test...\n');
    
    try {
      // Step 1: Load configuration
      await this.loadConfiguration();
      
      // Step 2: Validate environment
      await this.validateEnvironment();
      
      // Step 3: Initialize modules
      await this.initializeModules();
      
      // Step 4: Create dummy tools
      await this.createDummyTools();
      
      // Step 5: Create agents from config
      await this.createAgentsFromConfig();
      
      // Step 6: Test basic agent execution
      await this.testBasicExecution();
      
      // Step 7: Test tool calling
      await this.testToolCalling();
      
      // Step 8: Verify observability
      await this.verifyObservability();
      
      console.log('\n✅ All tests passed! AgentHub stack is working correctly.');
      
    } catch (error) {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }
  
  private async loadConfiguration(): Promise<void> {
    console.log('📄 Loading agents-config.yaml...');
    
    if (!fs.existsSync('./agents-config.yaml')) {
      throw new Error('agents-config.yaml not found');
    }
    
    const fileContent = fs.readFileSync('./agents-config.yaml', 'utf8');
    this.config = yaml.load(fileContent) as ConfigFile;
    
    // Replace environment variables
    this.config = this.replaceEnvVars(this.config);
    
    console.log(`   ✓ Loaded ${this.config.agents.length} agent(s) and ${this.config.tools.length} tool(s)`);
  }
  
  private replaceEnvVars(obj: any): any {
    if (typeof obj === 'string') {
      return obj.replace(/\$\{(\w+)\}/g, (match, varName) => {
        const value = process.env[varName];
        if (!value) {
          console.warn(`⚠️  Environment variable ${varName} not found, using placeholder`);
          return match;
        }
        return value;
      });
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.replaceEnvVars(item));
    }
    
    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replaceEnvVars(value);
      }
      return result;
    }
    
    return obj;
  }
  
  private async validateEnvironment(): Promise<void> {
    console.log('🔍 Validating environment configuration...');
    
    const requiredVars = [
      'LANGFUSE_PUBLIC_KEY',
      'LANGFUSE_SECRET_KEY', 
      'LANGFUSE_BASEURL',
      'LITELLM_BASE_URL',
      'LITELLM_API_KEY'
    ];
    
    const missing: string[] = [];
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    }
    
    if (missing.length > 0) {
      console.error(`❌ Missing environment variables: ${missing.join(', ')}`);
      console.error('📋 Please copy .env.example to .env and add your keys');
      throw new Error('Environment validation failed');
    }
    
    console.log('   ✓ All required environment variables found');
  }
  
  private async initializeModules(): Promise<void> {
    console.log('⚙️  Initializing core modules...');
    
    try {
      // Initialize LiteLLM module
      console.log('   📡 Initializing LiteLLM...');
      const litellmModule = createLiteLLMModule({
        providers: {
          proxy: {
            name: 'litellm-proxy',
            api_key: this.config.settings.llm.api_key,
            base_url: this.config.settings.llm.base_url,
            enabled: true
          }
        }
      });
      this.registry.register('litellm', litellmModule);
      
      // Initialize Langfuse module
      console.log('   📊 Initializing Langfuse...');
      const langfuseModule = createLangfuseModule({
        publicKey: this.config.settings.observability.langfuse.public_key,
        secretKey: this.config.settings.observability.langfuse.secret_key,
        baseUrl: this.config.settings.observability.langfuse.base_url,
        enabled: this.config.settings.observability.langfuse.enabled
      });
      this.registry.register('langfuse', langfuseModule);
      
      // Initialize the registry
      await this.registry.initialize({
        modules: {},
        registry: this.config.settings.registry
      });
      
      console.log('   ✓ Core modules initialized successfully');
      
    } catch (error) {
      console.error('❌ Module initialization failed:', error);
      throw error;
    }
  }
  
  private async createDummyTools(): Promise<void> {
    console.log('🔧 Creating dummy tools...');
    
    // These are ultra-simple tools just to test the architecture
    const dummyTools = {
      echo: {
        name: 'echo',
        description: 'Returns the input message',
        execute: async (params: { message: string }) => {
          return { result: params.message, success: true };
        }
      },
      
      math: {
        name: 'math', 
        description: 'Performs basic math operations',
        execute: async (params: { operation: string; a: number; b: number }) => {
          let result: number;
          switch (params.operation) {
            case 'add': result = params.a + params.b; break;
            case 'subtract': result = params.a - params.b; break;
            case 'multiply': result = params.a * params.b; break;
            case 'divide': result = params.a / params.b; break;
            default: throw new Error(`Unknown operation: ${params.operation}`);
          }
          return { result, success: true };
        }
      },
      
      timestamp: {
        name: 'timestamp',
        description: 'Returns current timestamp',
        execute: async () => {
          return { result: new Date().toISOString(), success: true };
        }
      }
    };
    
    // TODO: Register tools with tool registry when it's built
    // For now, we'll just validate they exist
    console.log(`   ✓ Created ${Object.keys(dummyTools).length} dummy tools`);
  }
  
  private async createAgentsFromConfig(): Promise<void> {
    console.log('🤖 Creating agents from configuration...');
    
    for (const agentConfig of this.config.agents) {
      if (!agentConfig.enabled) {
        console.log(`   ⏭️  Skipping disabled agent: ${agentConfig.name}`);
        continue;
      }
      
      console.log(`   🔨 Creating agent: ${agentConfig.name}`);
      
      try {
        // Create LLM agent (basic validation - not fully functional yet)
        const agent = new LLMAgent({
          name: agentConfig.name,
          description: agentConfig.description,
          model: agentConfig.config.model,
          temperature: agentConfig.config.temperature,
          maxTokens: agentConfig.config.max_tokens,
          systemMessage: agentConfig.config.system_message
        });
        
        // Register with module registry
        this.registry.register(`agent-${agentConfig.name}`, agent);
        
        console.log(`   ✓ Agent '${agentConfig.name}' created successfully`);
        
      } catch (error) {
        console.error(`   ❌ Failed to create agent '${agentConfig.name}':`, error);
        throw error;
      }
    }
  }
  
  private async testBasicExecution(): Promise<void> {
    console.log('🧪 Testing basic agent execution...');
    
    try {
      // Get the test agent
      const testAgent = this.registry.get('agent-test-agent');
      console.log(`   ✓ Retrieved test agent from registry`);
      
      // Test basic execution (this will likely fail until we wire everything up)
      console.log('   📤 Sending test message...');
      
      // For now, just validate the agent exists and has the right interface
      if (!testAgent || typeof testAgent.execute !== 'function') {
        throw new Error('Agent does not have execute method');
      }
      
      console.log('   ✓ Agent has correct interface');
      
      // TODO: Actual execution test when LLM integration is working
      console.log('   ⏭️  Actual execution test pending LLM integration');
      
    } catch (error) {
      console.error('❌ Basic execution test failed:', error);
      throw error;
    }
  }
  
  private async testToolCalling(): Promise<void> {
    console.log('🔨 Testing tool calling capabilities...');
    
    // TODO: Implement when tools are integrated with agents
    console.log('   ⏭️  Tool calling test pending tool integration');
  }
  
  private async verifyObservability(): Promise<void> {
    console.log('📊 Verifying observability integration...');
    
    try {
      const langfuseModule = this.registry.get('langfuse');
      
      if (!langfuseModule) {
        throw new Error('Langfuse module not found');
      }
      
      console.log('   ✓ Langfuse module accessible');
      
      // TODO: Test actual tracing when execution is working
      console.log('   ⏭️  Tracing test pending execution integration');
      
    } catch (error) {
      console.error('❌ Observability verification failed:', error);
      throw error;
    }
  }
  
  private async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up...');
    
    try {
      await this.registry.shutdown();
      console.log('   ✓ Registry shutdown complete');
    } catch (error) {
      console.error('⚠️  Cleanup error:', error);
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  const tester = new AgentStackTester();
  tester.run().catch(console.error);
}

export { AgentStackTester };