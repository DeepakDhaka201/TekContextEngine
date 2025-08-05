/**
 * Graph Node DTOs for Neo4j Knowledge Graph
 * Based on the comprehensive schema for TekAI Context Engine
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum NodeType {
  PROJECT = 'Project',
  CODEBASE = 'Codebase',
  COMMIT = 'Commit',
  AUTHOR = 'Author',
  FILE = 'File',
  CLASS = 'Class',
  INTERFACE = 'Interface',
  METHOD = 'Method',
  ANNOTATION = 'Annotation',
  API_ENDPOINT = 'APIEndpoint',
  TEST_CASE = 'TestCase',
  DEPENDENCY = 'Dependency',
  DOCUMENT = 'Document',
  CHUNK = 'Chunk',
  KAFKA_TOPIC = 'KafkaTopic',
  USER_FLOW = 'UserFlow'
}

export enum RelationshipType {
  HAS_CODEBASE = 'HAS_CODEBASE',
  CONTAINS_FILE = 'CONTAINS_FILE',
  AUTHORED = 'AUTHORED',
  MODIFIED_IN = 'MODIFIED_IN',
  DEFINES_CLASS = 'DEFINES_CLASS',
  DEFINES_METHOD = 'DEFINES_METHOD',
  HAS_METHOD = 'HAS_METHOD',
  CALLS = 'CALLS',
  IMPLEMENTS = 'IMPLEMENTS',
  EXTENDS = 'EXTENDS',
  USES_TYPE = 'USES_TYPE',
  ANNOTATED_WITH = 'ANNOTATED_WITH',
  IMPLEMENTS_ENDPOINT = 'IMPLEMENTS_ENDPOINT',
  TESTS = 'TESTS',
  DEPENDS_ON = 'DEPENDS_ON',
  DESCRIBED_IN = 'DESCRIBED_IN',
  HAS_CHUNK = 'HAS_CHUNK',
  DOCUMENTS = 'DOCUMENTS',
  PUBLISHES_TO = 'PUBLISHES_TO',
  SUBSCRIBES_TO = 'SUBSCRIBES_TO'
}

export enum Visibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  PROTECTED = 'protected',
  INTERNAL = 'internal',
  PACKAGE = 'package'
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS'
}

export enum Language {
  JAVA = 'java',
  TYPESCRIPT = 'typescript',
  JAVASCRIPT = 'javascript',
  PYTHON = 'python',
  CSHARP = 'csharp',
  GO = 'go',
  RUST = 'rust',
  KOTLIN = 'kotlin',
  SCALA = 'scala'
}

// ============================================================================
// BASE INTERFACES
// ============================================================================

export interface BaseNode {
  id: string;
  nodeType: NodeType;
  createdAt?: Date;
  updatedAt?: Date;
  properties?: Record<string, any>;
}



// ============================================================================
// NODE DTOs
// ============================================================================

export interface ProjectNode extends BaseNode {
  nodeType: NodeType.PROJECT;
  name: string;
  projectId: string;
  description?: string;
}

export interface CodebaseNode extends BaseNode {
  nodeType: NodeType.CODEBASE;
  name: string;
  gitUrl: string;
  language: Language;
  framework?: string;
  lastIndexedCommit?: string;
  branch?: string;
  isActive?: boolean;
}

export interface CommitNode extends BaseNode {
  nodeType: NodeType.COMMIT;
  hash: string;
  message: string;
  timestamp: Date;
  authorEmail?: string;
  authorName?: string;
}

export interface AuthorNode extends BaseNode {
  nodeType: NodeType.AUTHOR;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface FileNode extends BaseNode {
  nodeType: NodeType.FILE;
  path: string;
  fileName: string;
  checksum: string;
  lineCount: number;
  fileSize?: number;
  extension?: string;
  packageName?: string;
  isTestFile?: boolean;
}

export interface ClassNode extends BaseNode {
  nodeType: NodeType.CLASS;
  name: string;
  fullyQualifiedName: string;
  comment?: string;
  embedding?: number[];
  visibility?: Visibility;
  isAbstract?: boolean;
  isFinal?: boolean;
  isStatic?: boolean;
  isInnerClass?: boolean;
  startLine?: number;
  endLine?: number;
  filePath?: string;
}

export interface InterfaceNode extends BaseNode {
  nodeType: NodeType.INTERFACE;
  name: string;
  fullyQualifiedName: string;
  comment?: string;
  embedding?: number[];
  visibility?: Visibility;
  startLine?: number;
  endLine?: number;
  filePath?: string;
}

export interface MethodNode extends BaseNode {
  nodeType: NodeType.METHOD;
  name: string;
  signature: string;
  returnType?: string;
  comment?: string;
  body?: string;
  visibility?: Visibility;
  cyclomaticComplexity?: number;
  embedding?: number[];
  isStatic?: boolean;
  isAbstract?: boolean;
  isConstructor?: boolean;
  isTestMethod?: boolean;
  startLine?: number;
  endLine?: number;
  filePath?: string;
  parameters?: MethodParameter[];
}

export interface MethodParameter {
  name: string;
  type: string;
  isOptional?: boolean;
  defaultValue?: string;
}

export interface AnnotationNode extends BaseNode {
  nodeType: NodeType.ANNOTATION;
  name: string;
  fullyQualifiedName: string;
  properties?: Record<string, any>;
}

export interface APIEndpointNode extends BaseNode {
  nodeType: NodeType.API_ENDPOINT;
  httpMethod: HttpMethod;
  path: string;
  description?: string;
  embedding?: number[];
  requestSchema?: string;
  responseSchema?: string;
  statusCodes?: number[];
}

export interface TestCaseNode extends BaseNode {
  nodeType: NodeType.TEST_CASE;
  name: string;
  filePath: string;
  className?: string;
  methodName?: string;
  testType?: string;
  assertions?: number;
  startLine?: number;
  endLine?: number;
}

export interface DependencyNode extends BaseNode {
  nodeType: NodeType.DEPENDENCY;
  name: string;
  version: string;
  scope?: string;
  groupId?: string;
  artifactId?: string;
  isDevDependency?: boolean;
}

export interface DocumentNode extends BaseNode {
  nodeType: NodeType.DOCUMENT;
  path: string;
  title: string;
  type?: string;
  content?: string;
  size?: number;
  lastModified?: Date;
  labels?: string[];
}

export interface ChunkNode extends BaseNode {
  nodeType: NodeType.CHUNK;
  text: string;
  embedding?: number[];
  startLine?: number;
  endLine?: number;
  chunkIndex?: number;
  documentPath?: string;
}

export interface KafkaTopicNode extends BaseNode {
  nodeType: NodeType.KAFKA_TOPIC;
  name: string;
  partitions?: number;
  replicationFactor?: number;
  description?: string;
}

export interface UserFlowNode extends BaseNode {
  nodeType: NodeType.USER_FLOW;
  name: string;
  description?: string;
  steps?: string[];
  priority?: number;
}
