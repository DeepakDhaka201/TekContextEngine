/**
 * Graph Validation Utilities and Factory Functions
 * For Neo4j Knowledge Graph DTOs
 */

import {
  BaseNode,
  NodeType,
  RelationshipType,
  ProjectNode,
  CodebaseNode,
  FileNode,
  ClassNode,
  InterfaceNode,
  MethodNode,
  Language,
  Visibility
} from './graph-nodes.dto';
import { BaseRelationship, RELATIONSHIP_SCHEMA } from './graph-relationships.dto';

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export class GraphValidationError extends Error {
  constructor(message: string, public nodeId?: string, public relationshipType?: RelationshipType) {
    super(message);
    this.name = 'GraphValidationError';
  }
}

export function validateNode(node: BaseNode): void {
  if (!node.id) {
    throw new GraphValidationError('Node ID is required');
  }

  if (!node.nodeType) {
    throw new GraphValidationError('Node type is required', node.id);
  }

  if (!Object.values(NodeType).includes(node.nodeType)) {
    throw new GraphValidationError(`Invalid node type: ${node.nodeType}`, node.id);
  }

  // Type-specific validation
  switch (node.nodeType) {
    case NodeType.PROJECT:
      validateProjectNode(node as ProjectNode);
      break;
    case NodeType.CODEBASE:
      validateCodebaseNode(node as CodebaseNode);
      break;
    case NodeType.FILE:
      validateFileNode(node as FileNode);
      break;
    case NodeType.CLASS:
      validateClassNode(node as ClassNode);
      break;
    case NodeType.INTERFACE:
      validateInterfaceNode(node as InterfaceNode);
      break;
    case NodeType.METHOD:
      validateMethodNode(node as MethodNode);
      break;
  }
}

export function validateRelationship(relationship: BaseRelationship): void {
  if (!relationship.type) {
    throw new GraphValidationError('Relationship type is required');
  }

  if (!relationship.startNodeId) {
    throw new GraphValidationError('Start node ID is required', undefined, relationship.type);
  }

  if (!relationship.endNodeId) {
    throw new GraphValidationError('End node ID is required', undefined, relationship.type);
  }

  if (!Object.values(RelationshipType).includes(relationship.type)) {
    throw new GraphValidationError(`Invalid relationship type: ${relationship.type}`);
  }
}

export function validateRelationshipCompatibility(
  relationship: BaseRelationship,
  startNode: BaseNode,
  endNode: BaseNode
): void {
  const schema = RELATIONSHIP_SCHEMA[relationship.type];
  
  if (!schema.startNodeTypes.includes(startNode.nodeType)) {
    throw new GraphValidationError(
      `Invalid start node type ${startNode.nodeType} for relationship ${relationship.type}. Expected: ${schema.startNodeTypes.join(', ')}`,
      startNode.id,
      relationship.type
    );
  }

  if (!schema.endNodeTypes.includes(endNode.nodeType)) {
    throw new GraphValidationError(
      `Invalid end node type ${endNode.nodeType} for relationship ${relationship.type}. Expected: ${schema.endNodeTypes.join(', ')}`,
      endNode.id,
      relationship.type
    );
  }
}

// ============================================================================
// NODE-SPECIFIC VALIDATION
// ============================================================================

function validateProjectNode(node: ProjectNode): void {
  if (!node.name) {
    throw new GraphValidationError('Project name is required', node.id);
  }
  if (!node.projectId) {
    throw new GraphValidationError('Project ID is required', node.id);
  }
}

function validateCodebaseNode(node: CodebaseNode): void {
  if (!node.name) {
    throw new GraphValidationError('Codebase name is required', node.id);
  }
  if (!node.gitUrl) {
    throw new GraphValidationError('Git URL is required', node.id);
  }
  if (!node.language) {
    throw new GraphValidationError('Language is required', node.id);
  }
  if (!Object.values(Language).includes(node.language)) {
    throw new GraphValidationError(`Invalid language: ${node.language}`, node.id);
  }
}

function validateFileNode(node: FileNode): void {
  if (!node.path) {
    throw new GraphValidationError('File path is required', node.id);
  }
  if (!node.fileName) {
    throw new GraphValidationError('File name is required', node.id);
  }
  if (!node.checksum) {
    throw new GraphValidationError('File checksum is required', node.id);
  }
  if (typeof node.lineCount !== 'number' || node.lineCount < 0) {
    throw new GraphValidationError('Valid line count is required', node.id);
  }
}

function validateClassNode(node: ClassNode): void {
  if (!node.name) {
    throw new GraphValidationError('Class name is required', node.id);
  }
  if (!node.fullyQualifiedName) {
    throw new GraphValidationError('Fully qualified name is required', node.id);
  }
  if (node.visibility && !Object.values(Visibility).includes(node.visibility)) {
    throw new GraphValidationError(`Invalid visibility: ${node.visibility}`, node.id);
  }
}

function validateInterfaceNode(node: InterfaceNode): void {
  if (!node.name) {
    throw new GraphValidationError('Interface name is required', node.id);
  }
  if (!node.fullyQualifiedName) {
    throw new GraphValidationError('Fully qualified name is required', node.id);
  }
  if (node.visibility && !Object.values(Visibility).includes(node.visibility)) {
    throw new GraphValidationError(`Invalid visibility: ${node.visibility}`, node.id);
  }
}

function validateMethodNode(node: MethodNode): void {
  if (!node.name) {
    throw new GraphValidationError('Method name is required', node.id);
  }
  if (!node.signature) {
    throw new GraphValidationError('Method signature is required', node.id);
  }
  if (node.visibility && !Object.values(Visibility).includes(node.visibility)) {
    throw new GraphValidationError(`Invalid visibility: ${node.visibility}`, node.id);
  }
  if (node.cyclomaticComplexity !== undefined && node.cyclomaticComplexity < 0) {
    throw new GraphValidationError('Cyclomatic complexity must be non-negative', node.id);
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createProjectNode(
  projectId: string,
  name: string,
  description?: string
): ProjectNode {
  const node: ProjectNode = {
    id: `project:${projectId}`,
    nodeType: NodeType.PROJECT,
    projectId,
    name,
    description,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  validateNode(node);
  return node;
}

export function createCodebaseNode(
  codebaseId: string,
  name: string,
  gitUrl: string,
  language: Language,
  framework?: string,
  lastIndexedCommit?: string
): CodebaseNode {
  const node: CodebaseNode = {
    id: `codebase:${codebaseId}`,
    nodeType: NodeType.CODEBASE,
    name,
    gitUrl,
    language,
    framework,
    lastIndexedCommit,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  validateNode(node);
  return node;
}

export function createFileNode(
  path: string,
  fileName: string,
  checksum: string,
  lineCount: number,
  packageName?: string
): FileNode {
  const node: FileNode = {
    id: `file:${checksum}:${path}`,
    nodeType: NodeType.FILE,
    path,
    fileName,
    checksum,
    lineCount,
    packageName,
    extension: fileName.split('.').pop(),
    isTestFile: isTestFile(path),
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  validateNode(node);
  return node;
}

export function createClassNode(
  fullyQualifiedName: string,
  name: string,
  filePath?: string,
  comment?: string,
  visibility?: Visibility
): ClassNode {
  const node: ClassNode = {
    id: `class:${fullyQualifiedName}`,
    nodeType: NodeType.CLASS,
    name,
    fullyQualifiedName,
    comment,
    visibility,
    filePath,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  validateNode(node);
  return node;
}

export function createMethodNode(
  signature: string,
  name: string,
  returnType?: string,
  filePath?: string,
  visibility?: Visibility
): MethodNode {
  const node: MethodNode = {
    id: `method:${signature}`,
    nodeType: NodeType.METHOD,
    name,
    signature,
    returnType,
    visibility,
    filePath,
    parameters: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  validateNode(node);
  return node;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function isTestFile(filePath: string): boolean {
  const testPatterns = [
    /\.test\.(ts|tsx|js|jsx|java)$/,
    /\.spec\.(ts|tsx|js|jsx|java)$/,
    /__tests__\//,
    /\/test\//,
    /\/tests\//,
    /Test\.java$/,
    /Tests\.java$/
  ];
  
  return testPatterns.some(pattern => pattern.test(filePath));
}

export function generateNodeId(nodeType: NodeType, identifier: string): string {
  return `${nodeType.toLowerCase()}:${identifier}`;
}

export function parseNodeId(nodeId: string): { nodeType: string; identifier: string } {
  const [nodeType, ...identifierParts] = nodeId.split(':');
  return {
    nodeType,
    identifier: identifierParts.join(':')
  };
}
