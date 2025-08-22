import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { 
  AgentStateAnnotation, 
  AgentState, 
  GraphConfig, 
  AgentConfig,
  ConditionalEdgeConfig
} from "../types";
import { LLMAgentExecutor } from "../agents/llmAgentExecutor";
import { toolRegistry } from "../tools/dummyTools";
import { configManager } from "../config/configManager";
import { ToolMessage, AIMessage } from "@langchain/core/messages";

/**
 * Graph Builder
 * Creates LangGraph StateGraph from JSON configuration
 */
export class GraphBuilder {
  private checkpointer: MemorySaver;

  constructor() {
    this.checkpointer = new MemorySaver();
  }

  /**
   * Build a graph from configuration
   */
  async buildGraph(graphConfig: GraphConfig) {
    // Initialize new state graph - cast to any for dynamic node names
    const workflow = new StateGraph(AgentStateAnnotation) as any;

    // Add nodes to the graph
    for (const node of graphConfig.nodes) {
      if (node.agent) {
        // Load and add agent node
        const agentConfig = await configManager.loadAgentConfig(node.agent);
        if (agentConfig) {
          const agentFunction = this.getAgentFunction(agentConfig);
          workflow.addNode(node.name, agentFunction);
        } else {
          throw new Error(`Agent configuration not found: ${node.agent}`);
        }
      } else if (node.tool) {
        // Add tool node
        const tool = toolRegistry[node.tool];
        if (tool) {
          const toolNode = this.createToolNode(node.tool);
          workflow.addNode(node.name, toolNode);
        } else {
          throw new Error(`Tool not found: ${node.tool}`);
        }
      }
    }

    // Configure entry point
    if (graphConfig.entryPoint === "__start__") {
      const startEdge = graphConfig.edges.find(e => e.from === "__start__");
      if (startEdge && startEdge.to !== "__end__") {
        workflow.addEdge(START, startEdge.to);
      }
    } else if (graphConfig.entryPoint !== "__end__") {
      workflow.addEdge(START, graphConfig.entryPoint);
    }

    // Add edges between nodes
    for (const edge of graphConfig.edges) {
      if (edge.from === "__start__") continue; // Already handled
      
      if (edge.to === "__end__") {
        workflow.addEdge(edge.from, END);
      } else {
        workflow.addEdge(edge.from, edge.to);
      }
    }

    // Add conditional edges if configured
    if (graphConfig.conditionalEdges) {
      for (const condEdge of graphConfig.conditionalEdges) {
        const routingFunction = this.createEnhancedRoutingFunction(condEdge);
        
        // If pathMap is provided, use it for cleaner routing
        if (condEdge.pathMap) {
          workflow.addConditionalEdges(condEdge.from, routingFunction, condEdge.pathMap);
        } else {
          workflow.addConditionalEdges(condEdge.from, routingFunction);
        }
      }
    }

    // Set finish point if specified
    if (graphConfig.finishPoint) {
      workflow.addEdge(graphConfig.finishPoint, END);
    }

    // Compile graph with memory persistence
    return workflow.compile({ 
      checkpointer: this.checkpointer 
    });
  }

  /**
   * Get agent function from configuration
   */
  private getAgentFunction(agentConfig: AgentConfig) {
    // Create agent function from config using LLM executor
    return LLMAgentExecutor.createAgentFunction(agentConfig);
  }

  /**
   * Create a tool node that executes a specific tool
   */
  private createToolNode(toolName: string) {
    return async (state: AgentState) => {
      const tool = toolRegistry[toolName];
      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`);
      }

      // Extract tool calls from last message
      const lastMessage = state.messages[state.messages.length - 1];
      
      if ('tool_calls' in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls.length > 0) {
        const toolCall = lastMessage.tool_calls[0];
        
        // Execute tool with appropriate arguments
        const result = await tool.invoke(
          toolCall.args?.query || 
          toolCall.args?.city || 
          toolCall.args?.expression || 
          JSON.stringify(toolCall.args)
        );
        
        // Return tool result message
        const toolMessage = new ToolMessage({
          content: result,
          tool_call_id: toolCall.id
        });
        
        return {
          messages: [toolMessage],
          memory: [`Tool ${toolName} executed with result: ${result.substring(0, 100)}...`]
        };
      }
      
      // No tool calls found
      return {
        memory: [`Tool node ${toolName} called but no tool calls found`]
      };
    };
  }

  /**
   * Create configurable routing function based on expressions defined in JSON
   * This is fully configurable from the graph configuration
   */
  private createEnhancedRoutingFunction(condEdge: ConditionalEdgeConfig) {
    return (state: AgentState): string | typeof END => {
      const lastMessage = state.messages[state.messages.length - 1];
      
      // Prepare context for expression evaluation
      const context = this.createRoutingContext(state, lastMessage);
      
      // Evaluate each route condition in order
      for (const route of condEdge.routes) {
        if (this.evaluateRoutingExpression(route.condition, context)) {
          return condEdge.pathMap ? route.condition.expression : 
                 (route.to === "__end__" ? END : route.to);
        }
      }
      
      // Default route if specified
      if (condEdge.defaultTo) {
        return condEdge.defaultTo === "__end__" ? END : condEdge.defaultTo;
      }
      
      return END;
    };
  }

  /**
   * Create context object for routing expression evaluation
   */
  private createRoutingContext(state: AgentState, lastMessage: any) {
    const content = lastMessage?.content || '';
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    
    return {
      // Message properties
      message: {
        content: contentStr,
        contentLower: contentStr.toLowerCase(),
        length: contentStr.length,
        hasToolCalls: 'tool_calls' in lastMessage && 
                     Array.isArray(lastMessage.tool_calls) && 
                     lastMessage.tool_calls.length > 0
      },
      // State properties
      state: {
        messageCount: state.messages?.length || 0,
        currentAgent: state.currentAgent || '',
        sessionId: state.sessionId || ''
      },
      // Utility functions that can be used in expressions
      utils: {
        contains: (text: string, keyword: string) => text.toLowerCase().includes(keyword.toLowerCase()),
        length: (text: string) => text.length,
        isEmpty: (text: string) => !text || text.trim() === ''
      }
    };
  }

  /**
   * Evaluate routing expressions defined in the graph configuration
   */
  private evaluateRoutingExpression(condition: any, context: any): boolean {
    try {
      if (condition.type === 'javascript') {
        // For JavaScript expressions, create a safe evaluation environment
        const func = new Function('context', `
          const { message, state, utils } = context;
          return ${condition.expression};
        `);
        return func(context);
      } else {
        // Simple expression evaluation for basic conditions
        return this.evaluateSimpleExpression(condition.expression, context);
      }
    } catch (error) {
      console.warn(`Error evaluating routing condition: ${condition.expression}`, error);
      return false;
    }
  }

  /**
   * Evaluate simple expressions for basic routing
   */
  private evaluateSimpleExpression(expression: string, context: any): boolean {
    const { message } = context;
    
    // Simple pattern matching for common cases
    if (expression === 'has_tool_calls') {
      return message.hasToolCalls;
    }
    
    if (expression.startsWith('contains:')) {
      const keyword = expression.substring(9);
      return message.contentLower.includes(keyword.toLowerCase());
    }
    
    if (expression.startsWith('length_gt:')) {
      const threshold = parseInt(expression.substring(10));
      return message.length > threshold;
    }
    
    if (expression.startsWith('length_lt:')) {
      const threshold = parseInt(expression.substring(10));
      return message.length < threshold;
    }
    
    if (expression === 'default' || expression === 'true') {
      return true;
    }
    
    // Default: check if expression matches content as keyword
    return message.contentLower.includes(expression.toLowerCase());
  }

  /**
   * Create a simple graph for testing
   */
  async createSimpleTestGraph() {
    const workflow = new StateGraph(AgentStateAnnotation) as any;
    
    // Add a simple agent node
    workflow.addNode("agent", async (state: AgentState) => {
      const lastMessage = state.messages[state.messages.length - 1];
      const content = typeof lastMessage.content === 'string' 
        ? lastMessage.content 
        : JSON.stringify(lastMessage.content);
      
      // Decide if we need to use a tool
      if (content.toLowerCase().includes('weather')) {
        return {
          messages: [new AIMessage({
            content: "I'll check the weather for you",
            tool_calls: [{
              id: `call_${Date.now()}`,
              name: "weather_tool",
              args: { city: "San Francisco" }
            }]
          })],
          currentAgent: "agent"
        };
      }
      
      return {
        messages: [new AIMessage(`Processed: ${content}`)],
        currentAgent: "agent"
      };
    });
    
    // Add tool node
    const tools = Object.values(toolRegistry);
    const toolNode = new ToolNode(tools);
    workflow.addNode("tools", toolNode);
    
    // Add routing function
    function shouldContinue(state: AgentState): string | typeof END {
      const lastMessage = state.messages[state.messages.length - 1];
      if ('tool_calls' in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls.length > 0) {
        return "tools";
      }
      return END;
    }
    
    // Set up edges
    workflow.addEdge(START, "agent");
    workflow.addConditionalEdges("agent", shouldContinue);
    workflow.addEdge("tools", "agent");
    
    return workflow.compile({ checkpointer: this.checkpointer });
  }
}

// Export singleton instance
export const graphBuilder = new GraphBuilder();