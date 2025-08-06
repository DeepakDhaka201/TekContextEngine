# Multi-Agent Systems Implementation Prompt

## Context
You are implementing Multi-Agent Systems - sophisticated orchestrations where multiple agents collaborate, communicate, and coordinate to solve complex problems. This is the most advanced agent type, requiring careful design of communication protocols, coordination strategies, shared knowledge management, and emergent behavior handling.

## Pre-Implementation Requirements

### 1. Documentation Review
Before starting, you MUST:
1. Read `/Users/sakshams/tekai/TekContextEngine/agenthub-design.md` - Section 2.6 Multi-Agent Systems
2. Study all implemented agent types thoroughly
3. Read Google ADK Multi-Agent docs: https://google.github.io/adk-docs/agents/multi-agents/
4. Research multi-agent coordination patterns:
   - Hierarchical (manager-worker)
   - Peer-to-peer
   - Blackboard systems
   - Market-based coordination
5. Study distributed systems concepts

### 2. Understand Complex Coordination
Research these critical topics:
- Agent communication protocols
- Distributed consensus algorithms
- Shared memory patterns
- Conflict resolution strategies
- Emergent behavior detection
- Byzantine fault tolerance

### 3. Architecture Analysis
Think deeply about:
- How agents discover and communicate
- Shared knowledge representation
- Coordination without central control
- Handling agent failures
- Preventing deadlocks and livelocks
- Scalability with many agents

## Implementation Steps

### Step 1: Multi-Agent System Types
Create `src/agents/multi-agent/types.ts`:

```typescript
// Consider:
// - Different coordination patterns
// - Communication protocols
// - Knowledge sharing mechanisms
// - Consensus strategies

export interface MultiAgentConfig extends BaseAgentConfig {
  agents: AgentDefinition[];
  coordination: CoordinationConfig;
  communication: CommunicationConfig;
  shared_knowledge?: SharedKnowledgeConfig;
  consensus?: ConsensusConfig;
  failure_handling?: MultiAgentFailureStrategy;
}

export interface AgentDefinition {
  id: string;
  agent: AgentConfig | IAgent;
  role: AgentRole;
  capabilities: string[];
  communication_channels?: string[];
  authority_level?: number;
}

export interface CoordinationConfig {
  type: 'hierarchical' | 'peer_to_peer' | 'blackboard' | 'market_based' | 'llm_orchestrated';
  config: CoordinationStrategyConfig;
  conflict_resolution?: ConflictResolutionStrategy;
}

export interface Message {
  id: string;
  from: string;
  to: string | string[];  // Broadcast if array
  type: MessageType;
  content: any;
  timestamp: number;
  require_ack?: boolean;
  ttl?: number;
}

export interface SharedKnowledge {
  facts: Map<string, Fact>;
  beliefs: Map<string, Belief>;
  goals: Map<string, Goal>;
  plans: Map<string, Plan>;
}
```

**Testing Requirements**:
- Validate agent role assignments
- Test message serialization
- Ensure coordination configs are valid

### Step 2: Communication Infrastructure
Create `src/agents/multi-agent/communication/`:

**Research First**:
1. Study actor model patterns
2. Message passing architectures
3. Pub/sub systems
4. Event sourcing
5. CQRS patterns

**Implementation Components**:

1. **Message Bus**:
   ```typescript
   class MessageBus {
     private channels = new Map<string, Set<string>>();  // channel -> subscribers
     private handlers = new Map<string, MessageHandler[]>();
     private messageLog: Message[] = [];
     
     async publish(message: Message): Promise<void> {
       // Log message
       this.messageLog.push(message);
       
       // Route to recipients
       if (Array.isArray(message.to)) {
         // Broadcast
         await this.broadcast(message);
       } else {
         // Direct message
         await this.direct(message);
       }
       
       // Handle acknowledgments if required
       if (message.require_ack) {
         await this.waitForAcknowledgment(message);
       }
     }
     
     subscribe(
       agentId: string,
       channel: string,
       handler: MessageHandler
     ): void {
       // Add to channel
       if (!this.channels.has(channel)) {
         this.channels.set(channel, new Set());
       }
       this.channels.get(channel).add(agentId);
       
       // Register handler
       const key = `${agentId}:${channel}`;
       if (!this.handlers.has(key)) {
         this.handlers.set(key, []);
       }
       this.handlers.get(key).push(handler);
     }
     
     async request(
       message: Message,
       timeout: number = 5000
     ): Promise<Message> {
       const responsePromise = this.waitForResponse(message.id);
       
       await this.publish(message);
       
       return Promise.race([
         responsePromise,
         this.createTimeoutPromise(timeout)
       ]);
     }
   }
   ```

2. **Communication Protocols**:
   ```typescript
   interface CommunicationProtocol {
     // Negotiation
     propose(proposal: Proposal): Promise<Message>;
     accept(proposalId: string): Promise<Message>;
     reject(proposalId: string, reason?: string): Promise<Message>;
     
     // Information sharing
     inform(fact: Fact): Promise<Message>;
     query(query: Query): Promise<Message>;
     subscribe(topic: Topic): Promise<Message>;
     
     // Coordination
     request(action: ActionRequest): Promise<Message>;
     commit(transactionId: string): Promise<Message>;
     abort(transactionId: string): Promise<Message>;
   }
   
   class ACLProtocol implements CommunicationProtocol {
     // Agent Communication Language implementation
     // FIPA ACL standard messages
   }
   
   class CustomProtocol implements CommunicationProtocol {
     // Domain-specific protocol
   }
   ```

3. **Message Routing**:
   ```typescript
   class MessageRouter {
     route(message: Message, agents: Map<string, IAgent>): void {
       const strategy = this.getRoutingStrategy(message);
       
       switch (strategy) {
         case 'broadcast':
           this.broadcastToAll(message, agents);
           break;
           
         case 'role_based':
           this.routeByRole(message, agents);
           break;
           
         case 'capability_based':
           this.routeByCapability(message, agents);
           break;
           
         case 'load_balanced':
           this.routeWithLoadBalancing(message, agents);
           break;
       }
     }
   }
   ```

### Step 3: Coordination Strategies
Create `src/agents/multi-agent/coordination/`:

**Implement Different Coordination Patterns**:

1. **Hierarchical Coordination**:
   ```typescript
   class HierarchicalCoordinator implements CoordinationStrategy {
     private manager: IAgent;
     private workers: Map<string, IAgent>;
     
     async coordinate(
       task: Task,
       context: MultiAgentContext
     ): Promise<CoordinationPlan> {
       // Manager analyzes task
       const analysis = await this.manager.execute({
         task,
         available_workers: Array.from(this.workers.keys()),
         worker_capabilities: this.getWorkerCapabilities()
       });
       
       // Create work assignments
       const assignments = this.createAssignments(
         analysis.subtasks,
         this.workers
       );
       
       // Monitor execution
       const monitor = this.createExecutionMonitor(assignments);
       
       return {
         type: 'hierarchical',
         assignments,
         monitor,
         rollback_plan: this.createRollbackPlan(assignments)
       };
     }
     
     private createAssignments(
       subtasks: Subtask[],
       workers: Map<string, IAgent>
     ): WorkAssignment[] {
       // Capability matching
       // Load balancing
       // Priority ordering
       
       return subtasks.map(subtask => ({
         subtask,
         assigned_to: this.selectBestWorker(subtask, workers),
         deadline: this.calculateDeadline(subtask),
         dependencies: this.identifyDependencies(subtask, subtasks)
       }));
     }
   }
   ```

2. **Blackboard Coordination**:
   ```typescript
   class BlackboardCoordinator implements CoordinationStrategy {
     private blackboard: Blackboard;
     private knowledgeSources: Map<string, KnowledgeSource>;
     
     async coordinate(
       task: Task,
       context: MultiAgentContext
     ): Promise<CoordinationPlan> {
       // Initialize blackboard with problem
       this.blackboard.initialize(task);
       
       // Knowledge sources monitor blackboard
       const monitors = Array.from(this.knowledgeSources.values()).map(
         ks => this.createMonitor(ks, this.blackboard)
       );
       
       // Control loop
       const controller = this.createController({
         blackboard: this.blackboard,
         knowledge_sources: this.knowledgeSources,
         termination_condition: task.completion_criteria
       });
       
       return {
         type: 'blackboard',
         blackboard: this.blackboard,
         monitors,
         controller
       };
     }
   }
   
   class Blackboard {
     private data = new Map<string, any>();
     private subscribers = new Map<string, Set<BlackboardListener>>();
     
     write(key: string, value: any, writerId: string): void {
       const event = {
         key,
         value,
         writer: writerId,
         timestamp: Date.now()
       };
       
       this.data.set(key, value);
       this.notifySubscribers(event);
     }
     
     read(pattern: string | RegExp): any[] {
       // Pattern matching on keys
       const matches = [];
       
       for (const [key, value] of this.data) {
         if (this.matches(key, pattern)) {
           matches.push({ key, value });
         }
       }
       
       return matches;
     }
   }
   ```

3. **Market-Based Coordination**:
   ```typescript
   class MarketBasedCoordinator implements CoordinationStrategy {
     private auctioneer: Auctioneer;
     private market: Market;
     
     async coordinate(
       task: Task,
       context: MultiAgentContext
     ): Promise<CoordinationPlan> {
       // Create auction for task
       const auction = this.auctioneer.createAuction({
         task,
         reserve_price: task.budget,
         auction_type: 'dutch',  // or 'english', 'sealed_bid'
         duration: task.deadline
       });
       
       // Agents bid based on capabilities and cost
       const bids = await this.collectBids(auction, context.agents);
       
       // Determine winners
       const winners = this.auctioneer.determineWinners(
         auction,
         bids,
         task.constraints
       );
       
       // Create contracts
       const contracts = winners.map(winner => 
         this.createContract(winner, task)
       );
       
       return {
         type: 'market_based',
         contracts,
         market_state: this.market.getState(),
         enforcement: this.createEnforcement(contracts)
       };
     }
   }
   ```

4. **Peer-to-Peer Coordination**:
   ```typescript
   class PeerToPeerCoordinator implements CoordinationStrategy {
     async coordinate(
       task: Task,
       context: MultiAgentContext
     ): Promise<CoordinationPlan> {
       // Agents negotiate directly
       const negotiationProtocol = new ConsensusProtocol({
         type: 'byzantine_fault_tolerant',
         quorum: Math.floor(context.agents.size * 2/3) + 1
       });
       
       // Each agent proposes solution
       const proposals = await this.collectProposals(
         task,
         context.agents
       );
       
       // Distributed consensus
       const consensus = await negotiationProtocol.reach(
         proposals,
         context.agents
       );
       
       return {
         type: 'peer_to_peer',
         consensus,
         execution_plan: this.createDistributedPlan(consensus),
         conflict_resolution: new ConflictResolver()
       };
     }
   }
   ```

### Step 4: Shared Knowledge Management
Create `src/agents/multi-agent/knowledge/`:

**Implementation Requirements**:

1. **Knowledge Base**:
   ```typescript
   class SharedKnowledgeBase {
     private facts = new Map<string, Fact>();
     private beliefs = new Map<string, Belief>();
     private goals = new Map<string, Goal>();
     private plans = new Map<string, Plan>();
     private locks = new Map<string, Lock>();
     
     async assertFact(
       fact: Fact,
       agentId: string
     ): Promise<void> {
       // Validate fact
       if (!this.validateFact(fact)) {
         throw new Error('Invalid fact');
       }
       
       // Check for conflicts
       const conflicts = this.findConflicts(fact);
       if (conflicts.length > 0) {
         await this.resolveConflicts(fact, conflicts, agentId);
       }
       
       // Add to knowledge base
       this.facts.set(fact.id, {
         ...fact,
         asserted_by: agentId,
         timestamp: Date.now()
       });
       
       // Trigger inference
       await this.runInference(fact);
     }
     
     async query(
       query: KnowledgeQuery
     ): Promise<QueryResult> {
       // Parse query
       const parsed = this.parseQuery(query);
       
       // Execute query
       const results = await this.executeQuery(parsed);
       
       // Apply reasoning
       const reasoned = await this.applyReasoning(
         results,
         query.reasoning_depth
       );
       
       return {
         results: reasoned,
         confidence: this.calculateConfidence(reasoned),
         sources: this.traceSources(reasoned)
       };
     }
   }
   ```

2. **Belief Revision**:
   ```typescript
   class BeliefRevisionEngine {
     revise(
       currentBeliefs: Map<string, Belief>,
       newInformation: Information
     ): Map<string, Belief> {
       // AGM belief revision
       // 1. Expansion
       const expanded = this.expand(currentBeliefs, newInformation);
       
       // 2. Contraction if inconsistent
       if (this.isInconsistent(expanded)) {
         const contracted = this.contract(
           expanded,
           this.findInconsistencies(expanded)
         );
         
         // 3. Revision
         return this.revise(contracted, newInformation);
       }
       
       return expanded;
     }
   }
   ```

### Step 5: Multi-Agent System Implementation
Create `src/agents/multi-agent/multi-agent-system.ts`:

**Core Implementation**:
```typescript
class MultiAgentSystem extends BaseAgent {
  private agents = new Map<string, IAgent>();
  private coordinator: CoordinationStrategy;
  private messageBus: MessageBus;
  private knowledgeBase: SharedKnowledgeBase;
  private monitor: SystemMonitor;
  
  async initialize(context: InitializationContext): Promise<void> {
    await super.initialize(context);
    
    // Initialize agents
    for (const agentDef of this.config.agents) {
      const agent = await this.createAgent(agentDef);
      this.agents.set(agentDef.id, agent);
      
      // Setup communication
      this.setupAgentCommunication(agentDef.id, agent);
    }
    
    // Initialize coordination
    this.coordinator = this.createCoordinator(
      this.config.coordination
    );
    
    // Initialize shared knowledge
    this.knowledgeBase = new SharedKnowledgeBase(
      this.config.shared_knowledge
    );
    
    // Start monitoring
    this.monitor = new SystemMonitor(this);
    await this.monitor.start();
  }
  
  protected async executeCore(input: AgentInput): Promise<AgentOutput> {
    const systemContext = this.createSystemContext(input);
    
    try {
      // Create coordination plan
      const plan = await this.coordinator.coordinate(
        input.task,
        systemContext
      );
      
      // Execute plan
      const execution = await this.executePlan(
        plan,
        systemContext
      );
      
      // Aggregate results
      const result = await this.aggregateResults(
        execution,
        systemContext
      );
      
      return {
        content: result,
        metadata: {
          agents_involved: execution.participants,
          coordination_type: plan.type,
          execution_time: execution.duration,
          messages_exchanged: this.messageBus.getMessageCount(),
          consensus_achieved: execution.consensus
        }
      };
      
    } catch (error) {
      return this.handleSystemError(error, systemContext);
    }
  }
  
  private async executePlan(
    plan: CoordinationPlan,
    context: SystemContext
  ): Promise<ExecutionResult> {
    const execution = new PlanExecution(plan, this.agents);
    
    // Setup execution monitoring
    const monitor = this.createExecutionMonitor(execution);
    
    // Start agents
    await this.startAgents(plan, context);
    
    // Monitor until completion
    while (!execution.isComplete()) {
      // Check for deadlocks
      if (this.detectDeadlock(execution)) {
        await this.resolveDeadlock(execution);
      }
      
      // Check for livelocks
      if (this.detectLivelock(execution)) {
        await this.resolveLivelock(execution);
      }
      
      // Process messages
      await this.messageBus.processMessages();
      
      // Update shared knowledge
      await this.knowledgeBase.synchronize();
      
      // Check health
      const health = await monitor.checkHealth();
      if (health.status === 'critical') {
        await this.handleCriticalState(health, execution);
      }
      
      await this.delay(100);  // Polling interval
    }
    
    return execution.getResult();
  }
  
  private detectDeadlock(execution: PlanExecution): boolean {
    // Build wait-for graph
    const waitGraph = this.buildWaitForGraph(execution);
    
    // Detect cycles
    return this.hasCycle(waitGraph);
  }
  
  private async resolveDeadlock(execution: PlanExecution): Promise<void> {
    // Strategy 1: Timeout and retry
    const timedOutAgents = execution.getTimedOutAgents();
    
    for (const agentId of timedOutAgents) {
      await this.restartAgent(agentId);
    }
    
    // Strategy 2: Resource preemption
    if (this.config.allow_preemption) {
      await this.preemptResources(execution);
    }
    
    // Strategy 3: Rollback
    if (execution.supportsRollback()) {
      await execution.rollbackToSafePoint();
    }
  }
}
```

**Advanced Multi-Agent Features**:

1. **Emergent Behavior Detection**:
   ```typescript
   class EmergentBehaviorDetector {
     detect(
       systemState: SystemState,
       history: SystemHistory
     ): EmergentBehavior[] {
       const behaviors = [];
       
       // Pattern detection
       const patterns = this.detectPatterns(history);
       
       // Unexpected outcomes
       const anomalies = this.detectAnomalies(
         systemState,
         this.expectedState
       );
       
       // Self-organization
       const organization = this.detectSelfOrganization(
         systemState.agent_relationships
       );
       
       return behaviors;
     }
   }
   ```

2. **Adaptive Coordination**:
   ```typescript
   class AdaptiveCoordinator {
     async adapt(
       currentStrategy: CoordinationStrategy,
       performance: PerformanceMetrics
     ): Promise<CoordinationStrategy> {
       // Analyze performance
       const analysis = this.analyzePerformance(performance);
       
       // Determine if adaptation needed
       if (analysis.efficiency < this.threshold) {
         // Select new strategy
         const newStrategy = await this.selectStrategy(
           analysis,
           this.availableStrategies
         );
         
         // Gradual transition
         return this.transitionStrategy(
           currentStrategy,
           newStrategy
         );
       }
       
       return currentStrategy;
     }
   }
   ```

### Step 6: Example Multi-Agent Systems
Create `src/agents/multi-agent/examples/`:

**Example 1: Research Team**
```typescript
const researchTeam = new MultiAgentSystem({
  name: 'research-team',
  agents: [
    {
      id: 'coordinator',
      agent: {
        type: 'llm',
        name: 'research-coordinator',
        instruction: 'Coordinate research tasks and synthesize findings'
      },
      role: 'manager',
      capabilities: ['planning', 'synthesis', 'quality_control']
    },
    {
      id: 'web-researcher',
      agent: {
        type: 'llm',
        name: 'web-researcher',
        tools: ['web_search', 'web_scraper']
      },
      role: 'worker',
      capabilities: ['web_research', 'current_events']
    },
    {
      id: 'academic-researcher',
      agent: {
        type: 'llm',
        name: 'academic-researcher',
        tools: ['arxiv_search', 'scholar_search']
      },
      role: 'worker',
      capabilities: ['academic_research', 'paper_analysis']
    },
    {
      id: 'fact-checker',
      agent: {
        type: 'llm',
        name: 'fact-checker',
        instruction: 'Verify claims and check sources'
      },
      role: 'validator',
      capabilities: ['verification', 'source_validation']
    }
  ],
  coordination: {
    type: 'hierarchical',
    config: {
      manager: 'coordinator',
      workers: ['web-researcher', 'academic-researcher'],
      validators: ['fact-checker']
    }
  },
  communication: {
    protocol: 'acl',
    channels: ['research', 'validation', 'synthesis']
  },
  shared_knowledge: {
    type: 'blackboard',
    sections: ['sources', 'claims', 'verified_facts']
  }
});
```

**Example 2: Trading System**
```typescript
const tradingSystem = new MultiAgentSystem({
  name: 'trading-system',
  agents: [
    {
      id: 'market-analyzer',
      agent: marketAnalysisAgent,
      role: 'analyst',
      capabilities: ['technical_analysis', 'sentiment_analysis']
    },
    {
      id: 'risk-manager',
      agent: riskManagementAgent,
      role: 'validator',
      capabilities: ['risk_assessment', 'position_sizing']
    },
    {
      id: 'trade-executor',
      agent: tradeExecutionAgent,
      role: 'executor',
      capabilities: ['order_placement', 'execution_optimization']
    },
    {
      id: 'portfolio-optimizer',
      agent: portfolioOptimizationAgent,
      role: 'strategist',
      capabilities: ['portfolio_analysis', 'rebalancing']
    }
  ],
  coordination: {
    type: 'market_based',
    config: {
      auction_type: 'continuous_double',
      pricing_mechanism: 'dynamic',
      reputation_system: true
    }
  },
  consensus: {
    type: 'weighted_voting',
    config: {
      weight_by: 'historical_performance',
      threshold: 0.7
    }
  }
});
```

**Example 3: Distributed Problem Solver**
```typescript
const problemSolver = new MultiAgentSystem({
  name: 'distributed-solver',
  agents: Array.from({ length: 10 }, (_, i) => ({
    id: `solver-${i}`,
    agent: {
      type: 'custom',
      class: 'ProblemSolverAgent',
      config: {
        specialization: ['optimization', 'constraint_satisfaction', 'search'][i % 3]
      }
    },
    role: 'peer',
    capabilities: ['problem_decomposition', 'solution_generation', 'validation']
  })),
  coordination: {
    type: 'peer_to_peer',
    config: {
      consensus_algorithm: 'raft',
      gossip_protocol: true,
      failure_detection: 'heartbeat'
    }
  },
  communication: {
    protocol: 'custom',
    topology: 'mesh',
    routing: 'epidemic'
  },
  failure_handling: {
    strategy: 'self_healing',
    redundancy: 3,
    checkpointing: true
  }
});
```

### Step 7: Testing and Monitoring
Create `src/agents/multi-agent/testing/`:

**System Testing Framework**:
```typescript
class MultiAgentTestFramework {
  async testCoordination(
    system: MultiAgentSystem,
    scenario: CoordinationScenario
  ): Promise<TestResult> {
    // Test coordination patterns
    // Test message passing
    // Test consensus achievement
    // Test failure handling
  }
  
  async testScalability(
    system: MultiAgentSystem,
    agentCounts: number[]
  ): Promise<ScalabilityReport> {
    // Test with increasing agents
    // Measure performance degradation
    // Identify bottlenecks
  }
  
  async chaos(
    system: MultiAgentSystem,
    chaosConfig: ChaosConfig
  ): Promise<ChaosReport> {
    // Random agent failures
    // Network partitions
    // Message delays/drops
    // Resource exhaustion
  }
}
```

## Post-Implementation Validation

### 1. Coordination Testing
- [ ] All coordination strategies work
- [ ] Deadlock detection and resolution
- [ ] Consensus achievement
- [ ] Conflict resolution
- [ ] Emergent behavior handling

### 2. Communication Testing
- [ ] Message delivery guarantees
- [ ] Broadcast functionality
- [ ] Protocol compliance
- [ ] Performance under load

### 3. Robustness Testing
- [ ] Agent failure handling
- [ ] Network partition tolerance
- [ ] Byzantine fault tolerance
- [ ] Self-healing capabilities

### 4. Performance Testing
- [ ] Scalability with agent count
- [ ] Message throughput
- [ ] Coordination overhead
- [ ] Resource utilization

## Common Pitfalls to Avoid

1. **Don't ignore distributed systems theory** - CAP theorem applies
2. **Don't assume reliable communication** - handle failures
3. **Don't create tight coupling** - maintain agent autonomy
4. **Don't ignore emergent behaviors** - monitor and adapt
5. **Don't forget debugging tools** - distributed debugging is hard
6. **Don't overlook security** - agents can be compromised

## Final Validation Questions

1. Can the system handle 100+ agents effectively?
2. Does coordination scale with complexity?
3. Is communication reliable and efficient?
4. Can the system recover from partial failures?
5. Is emergent behavior detected and managed?
6. Are debugging tools sufficient?
7. Is the system secure against malicious agents?

## Next Steps
Complete the implementation with AgentHub Core (08-agenthub-core-implementation.md) which ties everything together.