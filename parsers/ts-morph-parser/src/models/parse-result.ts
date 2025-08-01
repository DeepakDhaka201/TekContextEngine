// ============================================================================
// CORE INTERFACES - Aligned with Spoon Parser v2
// ============================================================================

export interface ParseResult {
  metadata: MetadataNode;
  codebaseName: string;
  files: FileNode[];
  classes: ClassNode[];
  interfaces: InterfaceNode[];
  enums: EnumNode[];
  methods: MethodNode[];
  fields: FieldNode[];
  dependencies: DependencyNode[];
  relationships: Relationship[];
  apiEndpoints: APIEndpointNode[];
  lambdaExpressions: LambdaExpressionNode[];
  methodReferences: MethodReferenceNode[];
  testCases: TestCaseNode[];
  documents: DocumentNode[];
}

// ============================================================================
// METADATA & STATISTICS - Aligned with Spoon Parser v2
// ============================================================================

export interface MetadataNode {
  codebaseName: string;
  version: string;
  parserVersion: string;
  parseTime: string; // ISO 8601 timestamp
  parsingDurationMs: number;
  framework: string;
  detectedFrameworks: string[];
  statistics: StatisticsNode;
  configuration: Record<string, any>;
  errors: string[] | null;
  warnings: string[] | null;
}

export interface StatisticsNode {
  totalFiles: number;
  totalLines: number;
  totalClasses: number;
  totalInterfaces: number;
  totalMethods: number;
  totalFields: number;
  complexity: number;
  testCoverage: number;
  duplicateLines: number;
  averageMethodComplexity: number;
  maxMethodComplexity: number;
  linesOfCode: number;
  commentLines: number;
  blankLines: number;
}

// ============================================================================
// FILE NODES - Aligned with Spoon Parser v2
// ============================================================================

export interface FileNode {
  path: string;
  fileName: string;
  packageName: string;
  fileExtension: string;
  fileSize: number;
  checksum: string;
  lastModified: number;
  isTestFile: boolean;
  sourceCode: string;
}

// ============================================================================
// CLASS NODES - Aligned with Spoon Parser v2
// ============================================================================

export interface ClassNode {
  id: string;
  name: string;
  fullyQualifiedName: string;
  comment: string;
  visibility: string;
  isAbstract: boolean;
  isFinal: boolean;
  isStatic: boolean;
  isInnerClass: boolean;
  isAnonymous: boolean;
  isGeneric: boolean;
  filePath: string;
  startLine: number;
  endLine: number;
  decorators: DecoratorInfo[];

  // Framework-specific properties
  isController: boolean;
  isService: boolean;
  isRepository: boolean;
  isComponent: boolean;
  isConfiguration: boolean;
  isEntity: boolean;
  isTestClass: boolean;

  // Generic info
  genericTypeParameters: string[] | null;

  // Inner class context
  isLocal: boolean;
  enclosingClassId: string | null;
  enclosingMethodId: string | null;

  properties: Record<string, any>;
}

// ============================================================================
// INTERFACE NODES - Aligned with Spoon Parser v2
// ============================================================================

export interface InterfaceNode {
  id: string;
  name: string;
  fullyQualifiedName: string;
  comment: string;
  visibility: string;
  filePath: string;
  startLine: number;
  endLine: number;
  decorators: DecoratorInfo[];
  properties: Record<string, any>;
}

// ============================================================================
// ENUM NODES - Aligned with Spoon Parser v2
// ============================================================================

export interface EnumNode {
  id: string;
  name: string;
  fullyQualifiedName: string;
  comment: string;
  visibility: string;
  filePath: string;
  startLine: number;
  endLine: number;
  enumConstants: EnumConstantInfo[];
  decorators: DecoratorInfo[];
  properties: Record<string, any>;
}

export interface EnumConstantInfo {
  name: string;
  ordinal: number;
  comment: string;
  properties: Record<string, any>;
}

// ============================================================================
// METHOD NODES - Aligned with Spoon Parser v2
// ============================================================================

export interface MethodNode {
  id: string;
  name: string;
  signature: string;
  returnType: string;
  comment: string;
  body: string;
  visibility: string;
  isAbstract: boolean;
  isFinal: boolean;
  isStatic: boolean;
  isConstructor: boolean;
  isTestMethod: boolean;
  filePath: string;
  startLine: number;
  endLine: number;
  cyclomaticComplexity: number;
  parameters: ParameterInfo[];
  decorators: DecoratorInfo[];
  properties: Record<string, any>;
}

// ============================================================================
// FIELD NODES - Aligned with Spoon Parser v2
// ============================================================================

export interface FieldNode {
  id: string;
  name: string;
  type: string;
  visibility: string;
  isStatic: boolean;
  isFinal: boolean;
  decorators: DecoratorInfo[];
  properties: Record<string, any>;
}

// ============================================================================
// DECORATOR/ANNOTATION INFO - Aligned with Spoon Parser v2
// ============================================================================

export interface DecoratorInfo {
  name: string;
  fullyQualifiedName: string;
  properties: Record<string, any>;
}

// ============================================================================
// PARAMETER INFO - Aligned with Spoon Parser v2
// ============================================================================

export interface ParameterInfo {
  name: string;
  type: string;
  isVarArgs: boolean;
  decorators: DecoratorInfo[];
  properties: Record<string, any>;
}

// ============================================================================
// DEPENDENCY NODES - Aligned with Spoon Parser v2
// ============================================================================

export interface DependencyNode {
  id: string;
  groupId: string;
  artifactId: string;
  version: string;
  scope: string;
  type: string;
  properties: Record<string, any>;
}

// ============================================================================
// RELATIONSHIP NODES - Aligned with Spoon Parser v2
// ============================================================================

export interface Relationship {
  id: string;
  type: RelationshipType;
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  properties: Record<string, any>;
}

export type RelationshipType =
  | 'EXTENDS'
  | 'IMPLEMENTS'
  | 'USES'
  | 'CALLS'
  | 'HAS_FIELD'
  | 'HAS_METHOD'
  | 'HAS_CONSTRUCTOR'
  | 'HAS_INNER_CLASS'
  | 'ANNOTATED_WITH'
  | 'THROWS'
  | 'RETURNS'
  | 'PARAMETER_TYPE'
  | 'GENERIC_TYPE'
  | 'IMPORTS'
  | 'PACKAGE_CONTAINS'
  | 'DEFINES_CLASS'
  | 'DEFINES_INTERFACE'
  | 'FIELD_TYPE'
  | 'USES_TYPE'
  | 'OVERRIDES'
  | 'DEPENDS_ON'
  | 'IMPLEMENTS_ENDPOINT'
  | 'CONTAINS_DOCUMENT'
  | 'CONTAINS'
  | 'EXPOSES_ENDPOINT'
  | 'USES_PROPS'
  | 'PROVIDES_SERVICE';

// ============================================================================
// API ENDPOINT NODES - Aligned with Spoon Parser v2
// ============================================================================

export interface APIEndpointNode {
  path: string;
  httpMethod: string;
  methodName: string;
  className: string;
  properties: Record<string, any>;
}

// ============================================================================
// FUNCTIONAL PROGRAMMING NODES - Aligned with Spoon Parser v2
// ============================================================================

export interface LambdaExpressionNode {
  id: string;
  expression: string;
  parameters: ParameterInfo[];
  returnType: string;
  functionalInterface: string;
  isBlockBody: boolean;
  filePath: string;
  startLine: number;
  endLine: number;
  enclosingMethodId: string;
  enclosingClassId: string;
  properties: Record<string, any>;
}

export interface MethodReferenceNode {
  id: string;
  reference: string;
  type: string;
  targetMethod: string;
  functionalInterface: string;
  filePath: string;
  startLine: number;
  endLine: number;
  enclosingMethodId: string;
  enclosingClassId: string;
  properties: Record<string, any>;
}

// ============================================================================
// TEST NODES - Aligned with Spoon Parser v2
// ============================================================================

export interface TestCaseNode {
  id: string;
  name: string;
  className: string;
  methodName: string;
  testType: string;
  assertions: number;
  filePath: string;
  startLine: number;
  endLine: number;
  properties: Record<string, any>;
}

// ============================================================================
// DOCUMENT NODES - Aligned with Spoon Parser v2
// ============================================================================

export interface DocumentNode {
  id: string;
  path: string;
  fileName: string;
  type: string;
  title: string;
  content: string;
  chunks: DocumentChunk[];
  properties: Record<string, any>;
}

export interface DocumentChunk {
  id: string;
  content: string;
  startLine: number;
  endLine: number;
  type: string;
  properties: Record<string, any>;
}