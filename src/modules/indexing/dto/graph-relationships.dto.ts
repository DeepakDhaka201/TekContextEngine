/**
 * Graph Relationship DTOs for Neo4j Knowledge Graph
 * Based on the comprehensive schema for TekAI Context Engine
 */

import { RelationshipType, NodeType } from './graph-nodes.dto';

// ============================================================================
// BASE RELATIONSHIP INTERFACE
// ============================================================================

export interface BaseRelationship {
  type: RelationshipType;
  startNodeId: string;
  endNodeId: string;
  properties?: Record<string, any>;
}

// ============================================================================
// RELATIONSHIP DTOs
// ============================================================================

export interface HasCodebaseRelationship extends BaseRelationship {
  type: RelationshipType.HAS_CODEBASE;
  startNodeType: NodeType.PROJECT;
  endNodeType: NodeType.CODEBASE;
}

export interface ContainsFileRelationship extends BaseRelationship {
  type: RelationshipType.CONTAINS_FILE;
  startNodeType: NodeType.CODEBASE;
  endNodeType: NodeType.FILE;
}

export interface AuthoredRelationship extends BaseRelationship {
  type: RelationshipType.AUTHORED;
  startNodeType: NodeType.AUTHOR;
  endNodeType: NodeType.COMMIT;
}

export interface ModifiedInRelationship extends BaseRelationship {
  type: RelationshipType.MODIFIED_IN;
  startNodeType: NodeType.FILE;
  endNodeType: NodeType.COMMIT;
  changeType?: 'ADDED' | 'MODIFIED' | 'DELETED' | 'RENAMED';
  linesAdded?: number;
  linesDeleted?: number;
}

export interface DefinesClassRelationship extends BaseRelationship {
  type: RelationshipType.DEFINES_CLASS;
  startNodeType: NodeType.FILE;
  endNodeType: NodeType.CLASS;
}

export interface DefinesMethodRelationship extends BaseRelationship {
  type: RelationshipType.DEFINES_METHOD;
  startNodeType: NodeType.FILE;
  endNodeType: NodeType.METHOD;
}

export interface HasMethodRelationship extends BaseRelationship {
  type: RelationshipType.HAS_METHOD;
  startNodeType: NodeType.CLASS;
  endNodeType: NodeType.METHOD;
}

export interface CallsRelationship extends BaseRelationship {
  type: RelationshipType.CALLS;
  startNodeType: NodeType.METHOD;
  endNodeType: NodeType.METHOD;
  callCount?: number;
  isRecursive?: boolean;
  callLine?: number;
}

export interface ImplementsRelationship extends BaseRelationship {
  type: RelationshipType.IMPLEMENTS;
  startNodeType: NodeType.CLASS;
  endNodeType: NodeType.INTERFACE;
}

export interface ExtendsRelationship extends BaseRelationship {
  type: RelationshipType.EXTENDS;
  startNodeType: NodeType.CLASS;
  endNodeType: NodeType.CLASS;
}

export interface UsesTypeRelationship extends BaseRelationship {
  type: RelationshipType.USES_TYPE;
  startNodeType: NodeType.METHOD;
  endNodeType: NodeType.CLASS | NodeType.INTERFACE;
  usageType?: 'PARAMETER' | 'RETURN_TYPE' | 'LOCAL_VARIABLE' | 'FIELD_TYPE';
}

export interface AnnotatedWithRelationship extends BaseRelationship {
  type: RelationshipType.ANNOTATED_WITH;
  startNodeType: NodeType.CLASS | NodeType.METHOD;
  endNodeType: NodeType.ANNOTATION;
  annotationValues?: Record<string, any>;
}

export interface ImplementsEndpointRelationship extends BaseRelationship {
  type: RelationshipType.IMPLEMENTS_ENDPOINT;
  startNodeType: NodeType.METHOD;
  endNodeType: NodeType.API_ENDPOINT;
}

export interface TestsRelationship extends BaseRelationship {
  type: RelationshipType.TESTS;
  startNodeType: NodeType.TEST_CASE;
  endNodeType: NodeType.CLASS | NodeType.METHOD;
  testType?: 'UNIT' | 'INTEGRATION' | 'E2E';
  coverage?: number;
}

export interface DependsOnRelationship extends BaseRelationship {
  type: RelationshipType.DEPENDS_ON;
  startNodeType: NodeType.CODEBASE;
  endNodeType: NodeType.DEPENDENCY;
  scope?: 'COMPILE' | 'RUNTIME' | 'TEST' | 'PROVIDED';
}

export interface DescribedInRelationship extends BaseRelationship {
  type: RelationshipType.DESCRIBED_IN;
  startNodeType: NodeType.CLASS | NodeType.METHOD | NodeType.API_ENDPOINT;
  endNodeType: NodeType.CHUNK;
  relevanceScore?: number;
}

export interface HasChunkRelationship extends BaseRelationship {
  type: RelationshipType.HAS_CHUNK;
  startNodeType: NodeType.DOCUMENT;
  endNodeType: NodeType.CHUNK;
  chunkOrder?: number;
}

export interface DocumentsRelationship extends BaseRelationship {
  type: RelationshipType.DOCUMENTS;
  startNodeType: NodeType.DOCUMENT;
  endNodeType: NodeType.USER_FLOW;
}

export interface PublishesToRelationship extends BaseRelationship {
  type: RelationshipType.PUBLISHES_TO;
  startNodeType: NodeType.METHOD;
  endNodeType: NodeType.KAFKA_TOPIC;
  messageSchema?: string;
}

export interface SubscribesToRelationship extends BaseRelationship {
  type: RelationshipType.SUBSCRIBES_TO;
  startNodeType: NodeType.METHOD;
  endNodeType: NodeType.KAFKA_TOPIC;
  consumerGroup?: string;
}

// ============================================================================
// UNION TYPES FOR TYPE SAFETY
// ============================================================================

export type GraphRelationship = 
  | HasCodebaseRelationship
  | ContainsFileRelationship
  | AuthoredRelationship
  | ModifiedInRelationship
  | DefinesClassRelationship
  | DefinesMethodRelationship
  | HasMethodRelationship
  | CallsRelationship
  | ImplementsRelationship
  | ExtendsRelationship
  | UsesTypeRelationship
  | AnnotatedWithRelationship
  | ImplementsEndpointRelationship
  | TestsRelationship
  | DependsOnRelationship
  | DescribedInRelationship
  | HasChunkRelationship
  | DocumentsRelationship
  | PublishesToRelationship
  | SubscribesToRelationship;

// ============================================================================
// RELATIONSHIP VALIDATION SCHEMA
// ============================================================================

export const RELATIONSHIP_SCHEMA: Record<RelationshipType, {
  startNodeTypes: NodeType[];
  endNodeTypes: NodeType[];
  description: string;
}> = {
  [RelationshipType.HAS_CODEBASE]: {
    startNodeTypes: [NodeType.PROJECT],
    endNodeTypes: [NodeType.CODEBASE],
    description: 'A project contains codebases'
  },
  [RelationshipType.CONTAINS_FILE]: {
    startNodeTypes: [NodeType.CODEBASE],
    endNodeTypes: [NodeType.FILE],
    description: 'A codebase contains files'
  },
  [RelationshipType.AUTHORED]: {
    startNodeTypes: [NodeType.AUTHOR],
    endNodeTypes: [NodeType.COMMIT],
    description: 'An author wrote a commit'
  },
  [RelationshipType.MODIFIED_IN]: {
    startNodeTypes: [NodeType.FILE],
    endNodeTypes: [NodeType.COMMIT],
    description: 'A file was modified in a commit'
  },
  [RelationshipType.DEFINES_CLASS]: {
    startNodeTypes: [NodeType.FILE],
    endNodeTypes: [NodeType.CLASS],
    description: 'A file defines a class'
  },
  [RelationshipType.DEFINES_METHOD]: {
    startNodeTypes: [NodeType.FILE],
    endNodeTypes: [NodeType.METHOD],
    description: 'A file defines a standalone function'
  },
  [RelationshipType.HAS_METHOD]: {
    startNodeTypes: [NodeType.CLASS],
    endNodeTypes: [NodeType.METHOD],
    description: 'A class has methods'
  },
  [RelationshipType.CALLS]: {
    startNodeTypes: [NodeType.METHOD],
    endNodeTypes: [NodeType.METHOD],
    description: 'The directed call graph between methods'
  },
  [RelationshipType.IMPLEMENTS]: {
    startNodeTypes: [NodeType.CLASS],
    endNodeTypes: [NodeType.INTERFACE],
    description: 'A class implements an interface'
  },
  [RelationshipType.EXTENDS]: {
    startNodeTypes: [NodeType.CLASS],
    endNodeTypes: [NodeType.CLASS],
    description: 'A class extends another class'
  },
  [RelationshipType.USES_TYPE]: {
    startNodeTypes: [NodeType.METHOD],
    endNodeTypes: [NodeType.CLASS, NodeType.INTERFACE],
    description: 'A method uses a class/interface as a type'
  },
  [RelationshipType.ANNOTATED_WITH]: {
    startNodeTypes: [NodeType.CLASS, NodeType.METHOD],
    endNodeTypes: [NodeType.ANNOTATION],
    description: 'Code is decorated with an annotation'
  },
  [RelationshipType.IMPLEMENTS_ENDPOINT]: {
    startNodeTypes: [NodeType.METHOD],
    endNodeTypes: [NodeType.API_ENDPOINT],
    description: 'A method provides the logic for an API endpoint'
  },
  [RelationshipType.TESTS]: {
    startNodeTypes: [NodeType.TEST_CASE],
    endNodeTypes: [NodeType.CLASS, NodeType.METHOD],
    description: 'A test case covers a specific piece of code'
  },
  [RelationshipType.DEPENDS_ON]: {
    startNodeTypes: [NodeType.CODEBASE],
    endNodeTypes: [NodeType.DEPENDENCY],
    description: 'A codebase depends on an external library'
  },
  [RelationshipType.DESCRIBED_IN]: {
    startNodeTypes: [NodeType.CLASS, NodeType.METHOD, NodeType.API_ENDPOINT],
    endNodeTypes: [NodeType.CHUNK],
    description: 'Code is described by a documentation chunk'
  },
  [RelationshipType.HAS_CHUNK]: {
    startNodeTypes: [NodeType.DOCUMENT],
    endNodeTypes: [NodeType.CHUNK],
    description: 'A document is broken down into chunks'
  },
  [RelationshipType.DOCUMENTS]: {
    startNodeTypes: [NodeType.DOCUMENT],
    endNodeTypes: [NodeType.USER_FLOW],
    description: 'A document describes a high-level user flow'
  },
  [RelationshipType.PUBLISHES_TO]: {
    startNodeTypes: [NodeType.METHOD],
    endNodeTypes: [NodeType.KAFKA_TOPIC],
    description: 'A method publishes messages to a topic'
  },
  [RelationshipType.SUBSCRIBES_TO]: {
    startNodeTypes: [NodeType.METHOD],
    endNodeTypes: [NodeType.KAFKA_TOPIC],
    description: 'A method consumes messages from a topic'
  }
};
