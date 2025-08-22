import express, { Request, Response } from 'express';
import cors from 'cors';
import { configManager } from '../config/configManager';
import { graphBuilder } from '../graphs/graphBuilder';
import {
  AgentConfig,
  CreateAgentRequest,
  CreateGraphRequest,
  InvokeGraphRequest
} from '../types';
import { HumanMessage } from '@langchain/core/messages';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Store compiled graphs in memory
const compiledGraphs = new Map<string, any>();

/**
 * POST /agents/create
 * Create a new agent configuration
 */
app.post('/agents/create', async (req: Request, res: Response) => {
  try {
    const { agent } = req.body as CreateAgentRequest;
    
    if (!agent || !agent.name) {
      return res.status(400).json({ 
        error: 'Invalid agent configuration' 
      });
    }
    
    // Save agent configuration
    const filepath : string = await configManager.saveAgentConfig(agent);
    
    res.json({
      success: true,
      message: `Agent '${agent.name}' created successfully`,
      filepath,
      agent
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ 
      error: 'Failed to create agent',
      details: error.message 
    });
  }
});

/**
 * POST /graphs/create
 * Create a new graph configuration
 */
app.post('/graphs/create', async (req: Request, res: Response) => {
  try {
    const { graph } = req.body as CreateGraphRequest;
    
    if (!graph || !graph.name) {
      return res.status(400).json({ 
        error: 'Invalid graph configuration' 
      });
    }
    
    // Validate that all referenced agents exist
    for (const node of graph.nodes) {
      if (node.agent) {
        const agentConfig = await configManager.loadAgentConfig(node.agent);
        if (!agentConfig) {
          return res.status(400).json({ 
            error: `Agent '${node.agent}' not found` 
          });
        }
      }
    }
    
    // Save graph configuration
    const filepath = await configManager.saveGraphConfig(graph);
    
    // Try to compile the graph to validate it
    try {
      const compiledGraph = await graphBuilder.buildGraph(graph);
      compiledGraphs.set(graph.name, compiledGraph);
    } catch (compileError) {
      console.warn('Graph saved but compilation failed:', compileError);
    }
    
    res.json({
      success: true,
      message: `Graph '${graph.name}' created successfully`,
      filepath,
      graph
    });
  } catch (error) {
    console.error('Error creating graph:', error);
    res.status(500).json({ 
      error: 'Failed to create graph',
      details: error.message 
    });
  }
});

/**
 * POST /graphs/invoke
 * Invoke a graph with input
 */
app.post('/graphs/invoke', async (req: Request, res: Response) => {
  try {
    const { graphId, input, sessionId } = req.body as InvokeGraphRequest;
    
    if (!graphId) {
      return res.status(400).json({ 
        error: 'Graph ID is required' 
      });
    }
    
    // Get or compile the graph
    let compiledGraph = compiledGraphs.get(graphId);
    
    if (!compiledGraph) {
      // Load and compile graph if not cached
      const graphConfig = await configManager.loadGraphConfig(graphId);
      if (!graphConfig) {
        return res.status(404).json({ 
          error: `Graph '${graphId}' not found` 
        });
      }
      
      compiledGraph = await graphBuilder.buildGraph(graphConfig);
      compiledGraphs.set(graphId, compiledGraph);
    }
    
    // Prepare input state with messages
    const inputMessages = input.messages || 
      (input.text ? [new HumanMessage(input.text)] : [new HumanMessage("Hello")]);
    
    const inputState = {
      messages: inputMessages,
      memory: [],
      sessionId: sessionId || uuidv4(),
      currentAgent: "",
      metadata: input.metadata || {}
    };
    
    // Configure thread for session persistence
    const threadConfig = {
      configurable: {
        thread_id: inputState.sessionId
      }
    };
    
    // Invoke the graph with input state
    const result = await compiledGraph.invoke(inputState, threadConfig);
    
    // Transform messages to clean format
    const cleanMessages = result.messages?.map((msg: any) => {
      // Determine message type from id array
      let messageType: 'human' | 'assistant' | 'system' = 'system';
      
      if (msg.id && Array.isArray(msg.id)) {
        if (msg.id.includes('HumanMessage')) {
          messageType = 'human';
        } else if (msg.id.includes('AIMessage')) {
          messageType = 'assistant';
        }
      } else if (msg.constructor) {
        const constructorName = msg.constructor.name;
        if (constructorName === 'HumanMessage') {
          messageType = 'human';
        } else if (constructorName === 'AIMessage') {
          messageType = 'assistant';
        }
      }
      
      return {
        type: messageType,
        content: msg.kwargs?.content || msg.content || '',
        timestamp: new Date().toISOString()
      };
    }) || [];
    
    // Extract last assistant response
    const lastAssistantMessage = cleanMessages
      .filter((msg: any) => msg.type === 'assistant')
      .pop();
    
    // Build clean response object
    const cleanResponse = {
      sessionId: result.sessionId || inputState.sessionId,
      response: lastAssistantMessage?.content || 'No response generated',
      conversation: cleanMessages,
      metadata: {
        agent: result.currentAgent || 'unknown',
        timestamp: new Date().toISOString(),
        messageCount: cleanMessages.length
      }
    };
    
    res.json(cleanResponse);
  } catch (error) {
    console.error('Error invoking graph:', error);
    res.status(500).json({ 
      error: 'Failed to invoke graph',
      details: error.message 
    });
  }
});

/**
 * GET /agents
 * List all agents
 */
app.get('/agents', async (req: Request, res: Response) => {
  try {
    const agents = await configManager.listAgents();
    res.json({ agents });
  } catch (error) {
    console.error('Error listing agents:', error);
    res.status(500).json({ 
      error: 'Failed to list agents',
      details: error.message 
    });
  }
});

/**
 * GET /graphs
 * List all graphs
 */
app.get('/graphs', async (req: Request, res: Response) => {
  try {
    const graphs = await configManager.listGraphs();
    res.json({ graphs });
  } catch (error) {
    console.error('Error listing graphs:', error);
    res.status(500).json({ 
      error: 'Failed to list graphs',
      details: error.message 
    });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/**
 * Start the server
 */
export function startServer() {
  app.listen(PORT, () => {
    console.log(`🚀 LangGraph Agent API Server running on port ${PORT}`);
    console.log(`📝 API Endpoints:`);
    console.log(`   POST /agents/create - Create a new agent`);
    console.log(`   POST /graphs/create - Create a new graph`);
    console.log(`   POST /graphs/invoke - Invoke a graph`);
    console.log(`   GET  /agents - List all agents`);
    console.log(`   GET  /graphs - List all graphs`);
    console.log(`   GET  /health - Health check`);
  });
}

// Export app for testing
export default app;