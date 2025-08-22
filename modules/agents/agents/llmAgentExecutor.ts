import { AgentState, AgentConfig } from "../types";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { toolRegistry } from "../tools/dummyTools";
import { secretManager } from "../config/secretManager";

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
      // Resolve API key using SecretManager
      let apiKey: string;
      try {
        // Support both new (apiKeyRef) and old (openAIApiKey) formats
        if (agentConfig.openAIApiKey) {
          // Backwards compatibility: direct key in config (deprecated)
          console.warn(`Agent '${agentConfig.name}' uses deprecated direct API key. Consider using apiKeyRef instead.`);
          apiKey = agentConfig.openAIApiKey;
        } else {
          // Use SecretManager to resolve key from environment
          apiKey = secretManager.resolveAgentKey(agentConfig);
        }
      } catch (error) {
        throw new Error(
          `Failed to resolve API key for agent '${agentConfig.name}': ${error.message}`
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