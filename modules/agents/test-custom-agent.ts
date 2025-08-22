import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_BASE_URL = 'http://localhost:3000';

/**
 * Test creating custom agents with custom system prompts
 */
async function testCustomAgents() {
  console.log('🧪 Testing Custom Agent Creation with System Prompts\n');
  console.log('=' .repeat(50));
  
  // Wait for server to be ready
  await waitForServer();
  
  // Test 1: Create a Poetry Agent
  await createPoetryAgent();
  
  // Test 2: Create a Code Review Agent
  await createCodeReviewAgent();
  
  // Test 3: Create a custom graph with these agents
  await createCustomGraph();
  
  // Test 4: Invoke the agents
  await testAgentInvocations();
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ All custom agent tests completed!');
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
 * Create a poetry agent
 */
async function createPoetryAgent() {
  console.log('📝 Creating Poetry Agent');
  console.log('-' .repeat(30));
  
  const poetryAgent: any = {
    agent: {
      name: "poetry_agent",
      description: "An AI poet that creates beautiful poetry",
      systemPrompt: `You are a talented poet with a deep appreciation for language and emotion.
Your role is to create beautiful, meaningful poetry based on user requests.

When users ask for poetry:
- Understand the theme, mood, or topic they want
- Create original, creative poems
- Use various poetic forms (haiku, sonnet, free verse, etc.)
- Include vivid imagery and emotional depth
- Explain your creative choices if asked

Be creative, expressive, and thoughtful in your poetry.`,
      tools: [],  // No tools needed for poetry
      llmConfig: {
        model: "gpt-4o-mini",
        temperature: 0.9,  // Higher temperature for creativity
        maxTokens: 500
      }
    }
  };
  
  try {
    const response = await axios.post(`${API_BASE_URL}/agents/create`, poetryAgent);
    console.log(`✅ Created agent: ${response.data.agent.name}`);
    console.log(`   Description: ${response.data.agent.description}`);
  } catch (error: any) {
    console.error('❌ Failed to create poetry agent:', error.response?.data || error.message);
  }
  
  console.log();
}

/**
 * Create a code review agent
 */
async function createCodeReviewAgent() {
  console.log('👨‍💻 Creating Code Review Agent');
  console.log('-' .repeat(30));
  
  const codeReviewAgent: any = {
    agent: {
      name: "code_review_agent",
      description: "An expert code reviewer that provides constructive feedback",
      systemPrompt: `You are an experienced software engineer specializing in code review.
Your role is to review code and provide constructive, helpful feedback.

When reviewing code:
1. Check for code quality and best practices
2. Identify potential bugs or issues
3. Suggest improvements for readability and maintainability
4. Comment on performance considerations
5. Acknowledge what's done well
6. Be constructive and educational in your feedback

Focus on being helpful rather than critical. Explain the reasoning behind your suggestions.`,
      tools: [],  // Could add code analysis tools later
      llmConfig: {
        model: "gpt-4o-mini",
        temperature: 0.3,  // Lower temperature for more consistent analysis
        maxTokens: 800
      }
    }
  };
  
  try {
    const response = await axios.post(`${API_BASE_URL}/agents/create`, codeReviewAgent);
    console.log(`✅ Created agent: ${response.data.agent.name}`);
    console.log(`   Description: ${response.data.agent.description}`);
  } catch (error: any) {
    console.error('❌ Failed to create code review agent:', error.response?.data || error.message);
  }
  
  console.log();
}

/**
 * Create a custom graph
 */
async function createCustomGraph() {
  console.log('📊 Creating Custom Graph');
  console.log('-' .repeat(30));
  
  const poetryGraph = {
    graph: {
      name: "poetry_graph",
      nodes: [
        { name: "poet", agent: "poetry_agent" }
      ],
      entryPoint: "poet",
      edges: [
        { from: "poet", to: "__end__" }
      ]
    }
  };
  
  try {
    const response = await axios.post(`${API_BASE_URL}/graphs/create`, poetryGraph);
    console.log(`✅ Created graph: ${response.data.graph.name}`);
  } catch (error: any) {
    console.error('❌ Failed to create graph:', error.response?.data || error.message);
  }
  
  console.log();
}

/**
 * Test agent invocations
 */
async function testAgentInvocations() {
  console.log('🚀 Testing Agent Invocations');
  console.log('-' .repeat(30));
  
  // Test 1: Poetry Agent
  console.log('\n📜 Testing Poetry Agent:');
  try {
    const poetryRequest = {
      graphId: "poetry_graph",
      input: {
        messages: [{ 
          role: "human", 
          content: "Write a short haiku about artificial intelligence" 
        }]
      }
    };
    
    const response = await axios.post(`${API_BASE_URL}/graphs/invoke`, poetryRequest);
    console.log('✅ Poetry agent response:');
    const lastMessage = response.data.messages[response.data.messages.length - 1];
    console.log('\n' + lastMessage.kwargs?.content || lastMessage.content);
  } catch (error: any) {
    console.error('❌ Poetry agent failed:', error.response?.data || error.message);
  }
  
  // Test 2: Create and test a translator agent on the fly
  console.log('\n🌍 Creating and Testing Translator Agent:');
  
  const translatorAgent = {
    agent: {
      name: "translator_agent",
      description: "A multilingual translator",
      systemPrompt: `You are a professional translator fluent in multiple languages.
Translate text accurately while preserving meaning, tone, and cultural context.
When translating:
- Identify the source and target languages
- Provide accurate translations
- Explain any cultural nuances or idioms
- Offer alternative translations when appropriate`,
      tools: [],
      llmConfig: {
        model: "gpt-4o-mini",
        temperature: 0.3
      }
    }
  };
  
  try {
    // Create the agent
    await axios.post(`${API_BASE_URL}/agents/create`, translatorAgent);
    
    // Create a graph for it
    const translatorGraph = {
      graph: {
        name: "translator_graph",
        nodes: [{ name: "translator", agent: "translator_agent" }],
        entryPoint: "translator",
        edges: [{ from: "translator", to: "__end__" }]
      }
    };
    await axios.post(`${API_BASE_URL}/graphs/create`, translatorGraph);
    
    // Test it
    const translateRequest = {
      graphId: "translator_graph",
      input: {
        messages: [{ 
          role: "human", 
          content: "Translate 'Hello, how are you?' to French, Spanish, and Japanese" 
        }]
      }
    };
    
    const response = await axios.post(`${API_BASE_URL}/graphs/invoke`, translateRequest);
    console.log('✅ Translator agent response:');
    const lastMessage = response.data.messages[response.data.messages.length - 1];
    console.log('\n' + (lastMessage.kwargs?.content || lastMessage.content));
  } catch (error: any) {
    console.error('❌ Translator agent failed:', error.response?.data || error.message);
  }
  
  console.log();
}

// Run tests if this is the main module
if (require.main === module) {
  testCustomAgents().catch(console.error);
}

export { testCustomAgents };