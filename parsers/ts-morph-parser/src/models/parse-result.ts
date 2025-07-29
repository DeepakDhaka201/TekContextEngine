export interface ParseResult {
  files: FileNode[];
  classes: ClassNode[];
  interfaces: InterfaceNode[];
  methods: MethodNode[];
  dependencies: DependencyNode[];
  relationships: Relationship[];
  
  // Framework-specific nodes
  apiEndpoints?: APIEndpointNode[];
  components?: ComponentNode[];
  services?: ServiceNode[];
  modules?: ModuleNode[];
  
  // Metadata
  metadata: {
    framework: string;
    version: string;
    parseTime: string;
    statistics: {
      totalFiles: number;
      totalLines: number;
      complexity: number;
    };
  };
}

export interface FileNode {
  path: string;
  fileName: string;
  checksum: string;
  lineCount: number;
  extension: string;
  isTest: boolean;
  framework?: string | undefined;
}

export interface ClassNode {
  name: string;
  fullyQualifiedName: string;
  comment?: string;
  visibility: 'public' | 'private' | 'protected' | 'package';
  isAbstract: boolean;
  isExported: boolean;
  filePath: string;
  startLine: number;
  endLine: number;
  
  // Framework-specific properties
  isComponent?: boolean;
  isService?: boolean;
  isController?: boolean;
  decorators?: DecoratorInfo[];
}

export interface InterfaceNode {
  name: string;
  fullyQualifiedName: string;
  comment?: string;
  filePath: string;
  startLine: number;
  endLine: number;
  isExported: boolean;
  
  // Framework-specific
  isApiModel?: boolean;
  isProps?: boolean;
}

export interface MethodNode {
  name: string;
  signature: string;
  returnType: string;
  comment?: string;
  body?: string;
  visibility: 'public' | 'private' | 'protected';
  cyclomaticComplexity: number;
  parameters: ParameterInfo[];
  isAsync: boolean;
  isStatic: boolean;
  isAbstract: boolean;
  filePath: string;
  className?: string;
  startLine: number;
  endLine: number;
  
  // Method type flags
  isConstructor: boolean;
  isGetter: boolean;
  isSetter: boolean;
  
  // Framework-specific
  isApiEndpoint?: boolean;
  isEventHandler?: boolean;
  isLifecycleMethod?: boolean;
  decorators?: DecoratorInfo[];
  httpMethod?: string;
  route?: string;
}

export interface APIEndpointNode {
  httpMethod: string;
  path: string;
  description?: string;
  methodName: string;
  className: string;
  filePath: string;
  parameters: ParameterInfo[];
  returnType: string;
  decorators?: DecoratorInfo[];
  middleware?: string[];
}

export interface ComponentNode {
  name: string;
  type: 'functional' | 'class' | 'hoc';
  filePath: string;
  props?: string[];
  hooks?: string[];
  lifecycle?: string[];
  events?: string[];
  framework: string;
}

export interface ServiceNode {
  name: string;
  type: 'injectable' | 'provider' | 'singleton';
  filePath: string;
  dependencies?: string[];
  methods: string[];
  isGlobal?: boolean;
}

export interface ModuleNode {
  name: string;
  type: 'esm' | 'commonjs' | 'angular' | 'nestjs';
  filePath: string;
  exports: string[];
  imports: string[];
  providers?: string[];
  controllers?: string[];
}

export interface DependencyNode {
  name: string;
  version: string;
  type: 'production' | 'development' | 'peer' | 'optional';
  source: 'package.json' | 'import' | 'require';
}

export interface Relationship {
  type: string;
  startNodeType: string;
  startNodeId: string;
  endNodeType: string;
  endNodeId: string;
  properties?: Record<string, any>;
}

export interface ParameterInfo {
  name: string;
  type: string;
  isOptional: boolean;
  defaultValue?: string;
  decorators?: DecoratorInfo[];
}

export interface DecoratorInfo {
  name: string;
  arguments?: any[];
  properties?: Record<string, any>;
}

export interface ImportInfo {
  moduleName: string;
  importedNames: string[];
  isDefaultImport: boolean;
  isNamespaceImport: boolean;
  filePath: string;
}