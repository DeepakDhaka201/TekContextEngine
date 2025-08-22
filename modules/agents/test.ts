import axios from 'axios';
import { HumanMessage } from '@langchain/core/messages';

const API_BASE_URL = 'http://localhost:3000';

/**
 * Test script for the LangGraph Agent System
 */
async function runTests() {
  console.log('🧪 Starting LangGraph Agent System Tests\n');
  console.log('=' .repeat(50));
  
  // Wait for server to be ready
  await waitForServer();
  
  // Test 1: Create agents
  await testCreateAgents();
  
  // Test 2: Create graphs
  await testCreateGraphs();
  
  // Test 3: List agents and graphs
  await testListEndpoints();
  
  // Test 4: Invoke graphs
  await testInvokeGraphs();
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ All tests completed successfully!');
}

/**
 * Wait for server to be ready
 */
async function waitForServer() {
  console.log('⏳ Waiting for server to be ready...');
  
  for (let i = 0; i < 10; i++) {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      if (response.data.status === 'healthy') {
        console.log('✅ Server is ready!\n');
        return;
      }
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error('Server failed to start');
}

/**
 * Test creating agents
 */
async function testCreateAgents() {
  console.log('📝 Test 1: Creating Agents');
  console.log('-' .repeat(30));
  
  const testAgent = {
    agent: {
      name: "test_agent",
      description: "A test agent for demonstration",
      functionReference: "agentFunctions.generic",
      tools: ["web_search_tool", "calculator_tool"]
    }
  };
  
  try {
    const response = await axios.post(`${API_BASE_URL}/agents/create`, testAgent);
    console.log(`✅ Created agent: ${response.data.agent.name}`);
    console.log(`   Description: ${response.data.agent.description}`);
  } catch (error) {
    console.error('❌ Failed to create agent:', error.response?.data || error.message);
  }
  
  console.log();
}

/**
 * Test creating graphs
 */
async function testCreateGraphs() {
  console.log('📊 Test 2: Creating Graphs');
  console.log('-' .repeat(30));
  
  const testGraph = {
    graph: {
      name: "test_graph",
      nodes: [
        { name: "main_agent", agent: "generic_agent" },
        { name: "tool_node", tool: "calculator_tool" }
      ],
      entryPoint: "main_agent",
      edges: [
        { from: "main_agent", to: "tool_node" },
        { from: "tool_node", to: "__end__" }
      ]
    }
  };
  
  try {
    const response = await axios.post(`${API_BASE_URL}/graphs/create`, testGraph);
    console.log(`✅ Created graph: ${response.data.graph.name}`);
    console.log(`   Nodes: ${response.data.graph.nodes.map(n => n.name).join(', ')}`);
  } catch (error) {
    console.error('❌ Failed to create graph:', error.response?.data || error.message);
  }
  
  console.log();
}

/**
 * Test listing endpoints
 */
async function testListEndpoints() {
  console.log('📋 Test 3: Listing Agents and Graphs');
  console.log('-' .repeat(30));
  
  try {
    const agentsResponse = await axios.get(`${API_BASE_URL}/agents`);
    console.log(`✅ Available agents: ${agentsResponse.data.agents.join(', ')}`);
    
    const graphsResponse = await axios.get(`${API_BASE_URL}/graphs`);
    console.log(`✅ Available graphs: ${graphsResponse.data.graphs.join(', ')}`);
  } catch (error) {
    console.error('❌ Failed to list:', error.response?.data || error.message);
  }
  
  console.log();
}

/**
 * Test invoking graphs
 */
async function testInvokeGraphs() {
  console.log('🚀 Test 4: Invoking Graphs');
  console.log('-' .repeat(30));
  
  // Test 1: Weather graph
  console.log('\n🌤️  Testing weather_graph:');
  try {
    const weatherRequest = {
      graphId: "weather_graph",
      input: {
        messages: [{ role: "human", content: "What's the weather in New York?" }]
      }
    };
    
    const response = await axios.post(`${API_BASE_URL}/graphs/invoke`, weatherRequest);
    console.log('✅ Weather graph response:');
    console.log('   Session ID:', response.data.sessionId);
    console.log('   Messages:', response.data.messages.length);
    console.log('   Last message:', response.data.messages[response.data.messages.length - 1]?.content?.substring(0, 100) + '...');
  } catch (error) {
    console.error('❌ Weather graph failed:', error.response?.data || error.message);
  }
  
  // Test 2: Research graph
  console.log('\n🔍 Testing research_graph:');
  try {
    const researchRequest = {
      graphId: "research_graph",
      input: {
        messages: [new HumanMessage("Search for information about LangGraph")]
      }
    };
    
    const response = await axios.post(`${API_BASE_URL}/graphs/invoke`, researchRequest);
    console.log('✅ Research graph response:');
    console.log('   Session ID:', response.data.sessionId);
    console.log('   Messages:', response.data.messages.length);
    console.log('   Memory entries:', response.data.memory.length);
  } catch (error) {
    console.error('❌ Research graph failed:', error.response?.data || error.message);
  }
  
  // Test 3: Versatile graph with calculation
  console.log('\n🧮 Testing versatile_graph with calculation:');
  try {
    const calcRequest = {
      graphId: "versatile_graph",
      input: {
        messages: [new HumanMessage("Calculate 25 * 4 + 10")]
      }
    };
    
    const response = await axios.post(`${API_BASE_URL}/graphs/invoke`, calcRequest);
    console.log('✅ Versatile graph response:');
    console.log('   Result:', response.data.messages[response.data.messages.length - 1]?.content);
  } catch (error) {
    console.error('❌ Versatile graph failed:', error.response?.data || error.message);
  }
  
  console.log();
}

// Run tests if this is the main module
if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests };