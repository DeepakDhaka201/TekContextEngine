import { startServer } from './api/server';
import { configManager } from './config/configManager';
import { AgentConfig, GraphConfig } from './types';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Main entry point for the LangGraph Agent System
 */
async function main() {
  console.log('🤖 Initializing LangGraph Agent System...\n');
  
  // Create example agent configurations
  await createExampleAgents();
  
  // Create example graph configuration
  await createExampleGraph();
  
  // Start the API server
  startServer();
}

/**
 * Create example agent configurations
 */
async function createExampleAgents() {
  // Get API key from environment
  const apiKey = process.env.OPENAI_API_KEY;
  
  const searchAgent: AgentConfig = {
    name: "search_agent",
    description: "An agent specialized in searching for information on the web",
    systemPrompt: `You are a research assistant specialized in finding information on the web.
Your primary role is to help users find accurate and relevant information.
When users ask questions, you should:
1. Analyze their query to understand what they're looking for
2. Use the web search tool to find relevant information
3. Provide clear, concise summaries of what you find
Always be helpful and thorough in your research.`,
    tools: ["web_search_tool"],
    openAIApiKey: apiKey,
    llmConfig: {
      model: "gpt-4o-mini",
      temperature: 0.7
    }
  };
  
  const weatherAgent: AgentConfig = {
    name: "weather_agent",
    description: "An agent that provides weather information for any location",
    systemPrompt: `You are a weather information specialist.
Your role is to provide accurate weather information for any location users ask about.
When users ask about weather:
1. Identify the location they're asking about
2. Use the weather tool to get current conditions
3. Present the information in a clear, friendly manner
If no location is specified, ask for clarification or default to a major city.`,
    tools: ["weather_tool"],
    openAIApiKey: apiKey,
    llmConfig: {
      model: "gpt-4o-mini",
      temperature: 0.5
    }
  };
  
  const calculatorAgent: AgentConfig = {
    name: "calculator_agent",
    description: "An agent that performs mathematical calculations",
    systemPrompt: `You are a mathematical assistant specialized in calculations.
Your role is to help users with mathematical problems and computations.
When users provide mathematical expressions or problems:
1. Identify the calculation needed
2. Use the calculator tool to compute the result
3. Explain the result clearly
Be precise and accurate in all calculations.`,
    tools: ["calculator_tool"],
    openAIApiKey: apiKey,
    llmConfig: {
      model: "gpt-4o-mini",
      temperature: 0.2
    }
  };
  
  const versatileAgent: AgentConfig = {
    name: "versatile_agent",
    description: "A multi-purpose agent that can search, check weather, and calculate",
    systemPrompt: `You are a versatile AI assistant with multiple capabilities.
You can help users with:
- Web searches for information
- Weather inquiries for any location
- Mathematical calculations

Analyze each user request and decide which tool is most appropriate:
- Use web_search_tool for general information queries
- Use weather_tool for weather-related questions
- Use calculator_tool for mathematical problems

Always be helpful, accurate, and clear in your responses.`,
    tools: ["web_search_tool", "weather_tool", "calculator_tool"],
    openAIApiKey: apiKey,
    llmConfig: {
      model: "gpt-4o-mini",
      temperature: 0.7
    }
  };
  
  // Save agents
  await configManager.saveAgentConfig(searchAgent);
  await configManager.saveAgentConfig(weatherAgent);
  await configManager.saveAgentConfig(calculatorAgent);
  await configManager.saveAgentConfig(versatileAgent);
  
  console.log('✅ Example agents created:');
  console.log('   - search_agent');
  console.log('   - weather_agent');
  console.log('   - calculator_agent');
  console.log('   - versatile_agent\n');
}

/**
 * Create example graph configuration
 */
async function createExampleGraph() {
  const researchGraph: GraphConfig = {
    name: "research_graph",
    nodes: [
      { name: "search", agent: "search_agent" },
      { name: "search_tool_node", tool: "web_search_tool" }
    ],
    entryPoint: "search",
    edges: [
      { from: "search", to: "search_tool_node" },
      { from: "search_tool_node", to: "__end__" }
    ]
  };
  
  const weatherGraph: GraphConfig = {
    name: "weather_graph",
    nodes: [
      { name: "weather", agent: "weather_agent" },
      { name: "weather_tool_node", tool: "weather_tool" }
    ],
    entryPoint: "weather",
    edges: [
      { from: "weather", to: "weather_tool_node" },
      { from: "weather_tool_node", to: "__end__" }
    ]
  };
  
  const versatileGraph: GraphConfig = {
    name: "versatile_graph",
    nodes: [
      { name: "agent", agent: "versatile_agent" },
      { name: "weather_tool", tool: "weather_tool" },
      { name: "search_tool", tool: "web_search_tool" },
      { name: "calculator_tool", tool: "calculator_tool" }
    ],
    entryPoint: "agent",
    edges: [
      { from: "weather_tool", to: "__end__" },
      { from: "search_tool", to: "__end__" },
      { from: "calculator_tool", to: "__end__" }
    ],
    conditionalEdges: [
      {
        from: "agent",
        conditions: [
          { condition: "has_tool_calls", to: "weather_tool" },
          { condition: "contains_weather", to: "weather_tool" },
          { condition: "contains_search", to: "search_tool" },
          { condition: "default", to: "__end__" }
        ]
      }
    ]
  };
  
  // Save graphs
  await configManager.saveGraphConfig(researchGraph);
  await configManager.saveGraphConfig(weatherGraph);
  await configManager.saveGraphConfig(versatileGraph);
  
  console.log('✅ Example graphs created:');
  console.log('   - research_graph');
  console.log('   - weather_graph');
  console.log('   - versatile_graph\n');
}

// Run if this is the main module
if (require.main === module) {
  main().catch(console.error);
}

// Export for use as a module
export { startServer, configManager, createExampleAgents, createExampleGraph };