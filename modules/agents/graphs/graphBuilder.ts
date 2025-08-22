import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { AgentStateAnnotation, AgentState, GraphConfig, AgentConfig } from "../types";
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
    // Initialize new state graph
    const workflow = new StateGraph(AgentStateAnnotation);

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
      if (startEdge) {
        workflow.addEdge(START, startEdge.to as any);
      }
    } else {
      workflow.addEdge(START, graphConfig.entryPoint as any);
    }

    // Add edges between nodes
    for (const edge of graphConfig.edges) {
      if (edge.from === "__start__") continue; // Already handled
      
      if (edge.to === "__end__") {
        workflow.addEdge(edge.from as any, END);
      } else {
        workflow.addEdge(edge.from as any, edge.to as any);
      }
    }

    // Add conditional edges if configured
    if (graphConfig.conditionalEdges) {
      for (const condEdge of graphConfig.conditionalEdges) {
        const routingFunction = this.createRoutingFunction(condEdge.conditions);
        workflow.addConditionalEdges(condEdge.from as any, routingFunction as any);
      }
    }

    // Set finish point if specified
    if (graphConfig.finishPoint) {
      workflow.addEdge(graphConfig.finishPoint as any, END);
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
   * Create routing function for conditional edges
   */
  private createRoutingFunction(conditions: { condition: string; to: string }[]) {
    return (state: AgentState) => {
      const lastMessage = state.messages[state.messages.length - 1];
      if (!lastMessage || !lastMessage.content) {
        return END;
      }
      
      // Normalize content for comparison
      const content = typeof lastMessage.content === 'string' 
        ? lastMessage.content.toLowerCase() 
        : JSON.stringify(lastMessage.content).toLowerCase();
      
      // Check each condition
      for (const cond of conditions) {
        if (cond.condition === "has_tool_calls") {
          if ('tool_calls' in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls.length > 0) {
            return cond.to;
          }
        } else if (cond.condition === "contains_search") {
          if (content.includes('search')) {
            return cond.to;
          }
        } else if (cond.condition === "contains_weather") {
          if (content.includes('weather')) {
            return cond.to;
          }
        } else if (cond.condition === "default") {
          return cond.to;
        }
      }
      
      return END; // Default if no condition matches
    };
  }

  /**
   * Create a simple graph for testing
   */
  async createSimpleTestGraph() {
    const workflow = new StateGraph(AgentStateAnnotation);
    
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
    function shouldContinue(state: AgentState) {
      const lastMessage = state.messages[state.messages.length - 1];
      if ('tool_calls' in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls.length > 0) {
        return "tools";
      }
      return END;
    }
    
    // Set up edges
    workflow.addEdge(START, "agent" as any);
    workflow.addConditionalEdges("agent" as any, shouldContinue as any);
    workflow.addEdge("tools" as any, "agent" as any);
    
    return workflow.compile({ checkpointer: this.checkpointer });
  }
}

// Export singleton instance
export const graphBuilder = new GraphBuilder();