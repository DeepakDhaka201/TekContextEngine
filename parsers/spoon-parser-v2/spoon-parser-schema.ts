/**
 * TypeScript Schema for Spoon Parser v2 JSON Output
 * Generated for optimized LLM context (reduced fields)
 */

// ============================================================================
// CORE INTERFACES
// ============================================================================

export interface SpoonParserResult {
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
// METADATA & STATISTICS
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
// FILE NODES (OPTIMIZED)
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
// CLASS NODES (OPTIMIZED)
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
// INTERFACE NODES
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
// ENUM NODES
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
// METHOD NODES
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

export interface ParameterInfo {
  name: string;
  type: string;
  isVarArgs: boolean;
  decorators: DecoratorInfo[];
  properties: Record<string, any>;
}

// ============================================================================
// FIELD NODES
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
// DECORATOR/ANNOTATION INFO
// ============================================================================

export interface DecoratorInfo {
  name: string;
  fullyQualifiedName: string;
  properties: Record<string, any>;
}

// ============================================================================
// DEPENDENCY NODES
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
// RELATIONSHIP NODES
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
  | 'HAS_INNER_CLASS'
  | 'ANNOTATED_WITH'
  | 'THROWS'
  | 'RETURNS'
  | 'PARAMETER_TYPE'
  | 'GENERIC_TYPE'
  | 'IMPORTS'
  | 'PACKAGE_CONTAINS';

// ============================================================================
// API ENDPOINT NODES
// ============================================================================

export interface APIEndpointNode {
  path: string;
  httpMethod: string;
  methodName: string;
  className: string;
  properties: Record<string, any>;
}

// ============================================================================
// FUNCTIONAL PROGRAMMING NODES
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
// TEST NODES
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
// DOCUMENT NODES
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

// ============================================================================
// UTILITY FUNCTIONS & LOADER CLASS
// ============================================================================

/**
 * Utility class for loading and working with Spoon Parser results
 */
export class SpoonParserLoader {
  private result: SpoonParserResult | null = null;

  /**
   * Load Spoon Parser result from JSON string
   */
  public loadFromJson(jsonString: string): SpoonParserResult {
    try {
      this.result = JSON.parse(jsonString) as SpoonParserResult;
      return this.result;
    } catch (error) {
      throw new Error(`Failed to parse Spoon Parser JSON: ${error}`);
    }
  }

  /**
   * Load Spoon Parser result from file (Node.js environment)
   */
  public async loadFromFile(filePath: string): Promise<SpoonParserResult> {
    try {
      const fs = await import('fs/promises');
      const jsonString = await fs.readFile(filePath, 'utf-8');
      return this.loadFromJson(jsonString);
    } catch (error) {
      throw new Error(`Failed to load Spoon Parser file: ${error}`);
    }
  }

  /**
   * Get the loaded result
   */
  public getResult(): SpoonParserResult | null {
    return this.result;
  }

  /**
   * Get classes by framework type
   */
  public getClassesByFramework(frameworkType: keyof Pick<ClassNode,
    'isController' | 'isService' | 'isRepository' | 'isComponent' | 'isConfiguration' | 'isEntity'>): ClassNode[] {
    if (!this.result) return [];
    return this.result.classes.filter(cls => cls[frameworkType]);
  }

  /**
   * Get test classes
   */
  public getTestClasses(): ClassNode[] {
    if (!this.result) return [];
    return this.result.classes.filter(cls => cls.isTestClass);
  }

  /**
   * Get methods by class ID
   */
  public getMethodsByClassId(classId: string): MethodNode[] {
    if (!this.result) return [];
    return this.result.methods.filter(method =>
      method.id.includes(classId.replace('class:', 'method:')));
  }

  /**
   * Get fields by class ID
   */
  public getFieldsByClassId(classId: string): FieldNode[] {
    if (!this.result) return [];
    return this.result.fields.filter(field =>
      field.id.includes(classId.replace('class:', 'field:')));
  }

  /**
   * Get relationships by source ID
   */
  public getRelationshipsBySourceId(sourceId: string): Relationship[] {
    if (!this.result) return [];
    return this.result.relationships.filter(rel => rel.sourceId === sourceId);
  }

  /**
   * Get relationships by target ID
   */
  public getRelationshipsByTargetId(targetId: string): Relationship[] {
    if (!this.result) return [];
    return this.result.relationships.filter(rel => rel.targetId === targetId);
  }

  /**
   * Get relationships by type
   */
  public getRelationshipsByType(type: RelationshipType): Relationship[] {
    if (!this.result) return [];
    return this.result.relationships.filter(rel => rel.type === type);
  }

  /**
   * Get API endpoints by HTTP method
   */
  public getEndpointsByHttpMethod(method: string): APIEndpointNode[] {
    if (!this.result) return [];
    return this.result.apiEndpoints.filter(endpoint =>
      endpoint.httpMethod.toLowerCase() === method.toLowerCase());
  }

  /**
   * Get dependencies by scope
   */
  public getDependenciesByScope(scope: string): DependencyNode[] {
    if (!this.result) return [];
    return this.result.dependencies.filter(dep => dep.scope === scope);
  }

  /**
   * Get test methods
   */
  public getTestMethods(): MethodNode[] {
    if (!this.result) return [];
    return this.result.methods.filter(method => method.isTestMethod);
  }

  /**
   * Get abstract methods
   */
  public getAbstractMethods(): MethodNode[] {
    if (!this.result) return [];
    return this.result.methods.filter(method => method.isAbstract);
  }

  /**
   * Get static methods
   */
  public getStaticMethods(): MethodNode[] {
    if (!this.result) return [];
    return this.result.methods.filter(method => method.isStatic);
  }

  /**
   * Get constructors
   */
  public getConstructors(): MethodNode[] {
    if (!this.result) return [];
    return this.result.methods.filter(method => method.isConstructor);
  }

  /**
   * Get lambda expressions by class ID
   */
  public getLambdaExpressionsByClassId(classId: string): LambdaExpressionNode[] {
    if (!this.result) return [];
    return this.result.lambdaExpressions.filter(lambda => lambda.enclosingClassId === classId);
  }

  /**
   * Get files by package
   */
  public getFilesByPackage(packageName: string): FileNode[] {
    if (!this.result) return [];
    return this.result.files.filter(file => file.packageName === packageName);
  }

  /**
   * Get test files
   */
  public getTestFiles(): FileNode[] {
    if (!this.result) return [];
    return this.result.files.filter(file => file.isTestFile);
  }

  /**
   * Get summary statistics
   */
  public getSummary(): {
    totalClasses: number;
    totalMethods: number;
    totalFields: number;
    totalRelationships: number;
    totalDependencies: number;
    totalApiEndpoints: number;
    totalLambdas: number;
    testClasses: number;
    testMethods: number;
    complexity: number;
    framework: string;
  } {
    if (!this.result) {
      return {
        totalClasses: 0, totalMethods: 0, totalFields: 0, totalRelationships: 0,
        totalDependencies: 0, totalApiEndpoints: 0, totalLambdas: 0,
        testClasses: 0, testMethods: 0, complexity: 0, framework: 'unknown'
      };
    }

    return {
      totalClasses: this.result.classes.length,
      totalMethods: this.result.methods.length,
      totalFields: this.result.fields.length,
      totalRelationships: this.result.relationships.length,
      totalDependencies: this.result.dependencies.length,
      totalApiEndpoints: this.result.apiEndpoints.length,
      totalLambdas: this.result.lambdaExpressions.length,
      testClasses: this.getTestClasses().length,
      testMethods: this.getTestMethods().length,
      complexity: this.result.metadata.statistics.complexity,
      framework: this.result.metadata.framework
    };
  }
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isSpoonParserResult(obj: any): obj is SpoonParserResult {
  return obj &&
    typeof obj === 'object' &&
    'metadata' in obj &&
    'codebaseName' in obj &&
    Array.isArray(obj.files) &&
    Array.isArray(obj.classes) &&
    Array.isArray(obj.methods) &&
    Array.isArray(obj.relationships);
}

export function isClassNode(obj: any): obj is ClassNode {
  return obj &&
    typeof obj === 'object' &&
    'id' in obj &&
    'name' in obj &&
    'fullyQualifiedName' in obj &&
    typeof obj.isAbstract === 'boolean';
}

export function isMethodNode(obj: any): obj is MethodNode {
  return obj &&
    typeof obj === 'object' &&
    'id' in obj &&
    'name' in obj &&
    'signature' in obj &&
    typeof obj.isConstructor === 'boolean';
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/*
// Example usage:
const loader = new SpoonParserLoader();

// Load from file
const result = await loader.loadFromFile('comprehensive-test-analysis-v2-OPTIMIZED.json');

// Get summary
const summary = loader.getSummary();
console.log(`Framework: ${summary.framework}`);
console.log(`Classes: ${summary.totalClasses}`);
console.log(`Methods: ${summary.totalMethods}`);

// Get Spring controllers
const controllers = loader.getClassesByFramework('isController');
console.log(`Controllers found: ${controllers.length}`);

// Get API endpoints
const getEndpoints = loader.getEndpointsByHttpMethod('GET');
console.log(`GET endpoints: ${getEndpoints.length}`);

// Get test classes and methods
const testClasses = loader.getTestClasses();
const testMethods = loader.getTestMethods();
console.log(`Test classes: ${testClasses.length}, Test methods: ${testMethods.length}`);

// Get relationships
const extendsRelations = loader.getRelationshipsByType('EXTENDS');
const implementsRelations = loader.getRelationshipsByType('IMPLEMENTS');
console.log(`Inheritance: ${extendsRelations.length}, Implementations: ${implementsRelations.length}`);
*/
