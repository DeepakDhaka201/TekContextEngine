import { AgentState, AgentConfig } from "../types";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { toolRegistry } from "../tools/dummyTools";
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * LLM-based Agent Executor
 * Creates agent functions that use OpenAI LLMs with system prompts
 */
export class LLMAgentExecutor {
  
  /**
   * Create an agent function from configuration
   * Returns a function that can be used as a node in the graph
   */
  static createAgentFunction(agentConfig: AgentConfig) {
    return async (state: AgentState): Promise<Partial<AgentState>> => {
      // Get API key from agent config or environment
      const apiKey = agentConfig.openAIApiKey || process.env.OPENAI_API_KEY;
      
      // Validate API key is present
      if (!apiKey) {
        throw new Error(
          `OpenAI API key not found. Please provide it in agent config or set OPENAI_API_KEY in your .env file. ` +
          `Agent "${agentConfig.name}" requires an LLM to function.`
        );
      }

      // Handle initial state with no messages
      if (!state.messages || state.messages.length === 0) {
        // Create LLM instance for initial greeting
        const model = new ChatOpenAI({
          modelName: agentConfig.llmConfig?.model || "gpt-4o-mini",
          temperature: agentConfig.llmConfig?.temperature || 0.7,
          maxTokens: agentConfig.llmConfig?.maxTokens || 500,
          openAIApiKey: apiKey,
        });

        // Generate introduction based on system prompt
        const systemMessage = new SystemMessage(agentConfig.systemPrompt);
        const humanMessage = new HumanMessage("Hello, introduce yourself briefly.");
        const response = await model.invoke([systemMessage, humanMessage]);
        
        return {
          messages: [response],
          memory: [`${agentConfig.name}: Initialized and ready`],
          currentAgent: agentConfig.name
        };
      }

      // Initialize LLM with agent configuration
      const model = new ChatOpenAI({
        modelName: agentConfig.llmConfig?.model || "gpt-4o-mini",
        temperature: agentConfig.llmConfig?.temperature || 0.7,
        maxTokens: agentConfig.llmConfig?.maxTokens || 500,
        openAIApiKey: apiKey,
      });

      // Bind tools if configured
      const tools = agentConfig.tools
        .map(toolName => toolRegistry[toolName])
        .filter(tool => tool !== undefined);
      const modelWithTools = tools.length > 0 ? model.bindTools(tools) : model;

      // Prepare messages: system prompt + conversation history
      const systemMessage = new SystemMessage(agentConfig.systemPrompt);
      const conversationHistory = state.messages.filter(
        msg => !(msg instanceof SystemMessage)
      );
      const messagesForLLM = [systemMessage, ...conversationHistory];

      try {
        // Invoke LLM with prepared messages
        const response = await modelWithTools.invoke(messagesForLLM);
        
        // Return state update with response
        return {
          messages: [response],
          memory: [`${agentConfig.name} responded at ${new Date().toISOString()}`],
          currentAgent: agentConfig.name
        };
      } catch (error: any) {
        // Handle LLM errors gracefully
        console.error(`LLM Error for ${agentConfig.name}:`, error?.message || error);
        return {
          messages: [new AIMessage(`Error: ${error?.message || 'Unknown error occurred'}`)],
          memory: [`${agentConfig.name} encountered error: ${error?.message}`],
          currentAgent: agentConfig.name
        };
      }
    };
  }
}

export default LLMAgentExecutor;