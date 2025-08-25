import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  Language,
  NodeType,
  RelationshipType,
  BaseRelationship,
  HttpMethod
} from '../dto';

// Graph-based standardized output interfaces
export interface StandardizedGraphNode {
  id: string;
  nodeType: NodeType;
  properties: Record<string, any>;
}

export interface StandardizedGraphOutput {
  metadata: {
    codebaseName: string;
    language: Language;
    totalFiles: number;
    totalNodes: number;
    totalRelationships: number;
    parsingDuration: number;
    framework?: string;
    detectedFrameworks?: string[];
    parseTime: string;
    parserVersion: string;
  };
  nodes: StandardizedGraphNode[];
  relationships: BaseRelationship[];
}

// Parser input interfaces (matching both Java and TypeScript parser outputs)
export interface ParserMetadata {
  codebaseName: string;
  version?: string;
  parserVersion: string;
  parseTime: string;
  parsingDurationMs: number;
  framework: string;
  detectedFrameworks: string[];
  statistics?: {
    totalFiles: number;
    totalClasses: number;
    totalInterfaces: number;
    totalMethods: number;
    totalFields?: number;
    complexity?: number;
  };
}

export interface ParserOutput {
  metadata: ParserMetadata;
  codebaseName: string;
  files: any[];
  classes: any[];
  interfaces: any[];
  enums?: any[];
  methods: any[];
  fields?: any[];
  dependencies: any[];
  relationships: any[];
  apiEndpoints?: any[];
  testCases?: any[];
  documents?: any[];
  annotations?: any[];
}



@Injectable()
export class ParserOutputTransformerService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Transform parser output to standardized graph format
   */
  transformParserOutput(rawOutput: ParserOutput, language: string): StandardizedGraphOutput {
    this.logger.debug(`[PARSER-TRANSFORMER] Transforming ${language} parser output to graph format`);

    switch (language.toLowerCase()) {
      case 'java':
        return this.transformJavaToGraph(rawOutput);
      case 'typescript':
        return this.transformTypeScriptToGraph(rawOutput);
      default:
        throw new Error(`Unsupported language for transformation: ${language}`);
    }
  }

  /**
   * Generate globally unique ID for nodes
   */
  private generateNodeId(nodeType: NodeType, codebaseName: string, identifier: string): string {
    return `${codebaseName}:${nodeType.toLowerCase()}:${identifier}`;
  }

  /**
   * Generate globally unique ID for relationships
   */
  private generateRelationshipId(type: RelationshipType, sourceId: string, targetId: string): string {
    return `${type}:${sourceId}:${targetId}`;
  }

  /**
   * Transform Java (spoon-parser-v2) output to graph format
   */
  private transformJavaToGraph(rawOutput: ParserOutput): StandardizedGraphOutput {
    this.logger.log(`[PARSER-TRANSFORMER] Transforming Java output to graph format`, {
      codebaseName: rawOutput.codebaseName,
      filesCount: rawOutput.files?.length || 0,
      classesCount: rawOutput.classes?.length || 0,
      methodsCount: rawOutput.methods?.length || 0,
      interfacesCount: rawOutput.interfaces?.length || 0,
      relationshipsCount: rawOutput.relationships?.length || 0
    });

    const nodes: StandardizedGraphNode[] = [];
    const relationships: BaseRelationship[] = [];
    const codebaseName = rawOutput.codebaseName;

    // Create Project node
    const projectNode: StandardizedGraphNode = {
      id: this.generateNodeId(NodeType.PROJECT, codebaseName, codebaseName),
      nodeType: NodeType.PROJECT,
      properties: {
        name: codebaseName,
        projectId: codebaseName,
        description: `Java project: ${codebaseName}`
      }
    };
    nodes.push(projectNode);

    // Create Codebase node
    const codebaseNode: StandardizedGraphNode = {
      id: this.generateNodeId(NodeType.CODEBASE, codebaseName, codebaseName),
      nodeType: NodeType.CODEBASE,
      properties: {
        name: codebaseName,
        gitUrl: '', // Not available in parser output
        language: Language.JAVA,
        framework: rawOutput.metadata.framework,
        lastIndexedCommit: '', // Not available in parser output
        isActive: true
      }
    };
    nodes.push(codebaseNode);

    // Create Project -> Codebase relationship
    relationships.push({
      type: RelationshipType.HAS_CODEBASE,
      startNodeId: projectNode.id,
      endNodeId: codebaseNode.id,
      properties: {}
    });

    // Transform File nodes
    if (rawOutput.files && Array.isArray(rawOutput.files)) {
      for (const file of rawOutput.files) {
        const fileNode: StandardizedGraphNode = {
          id: this.generateNodeId(NodeType.FILE, codebaseName, file.path),
          nodeType: NodeType.FILE,
          properties: {
            path: file.path,
            fileName: file.fileName,
            checksum: file.checksum || '',
            lineCount: file.lineCount || 0,
            fileSize: file.fileSize || 0,
            extension: file.fileExtension || '',
            packageName: file.packageName || '',
            isTestFile: file.isTestFile || false
          }
        };
        nodes.push(fileNode);

        // Create Codebase -> File relationship
        relationships.push({
          type: RelationshipType.CONTAINS_FILE,
          startNodeId: codebaseNode.id,
          endNodeId: fileNode.id,
          properties: {}
        });
      }
    }

    // Transform Class nodes
    if (rawOutput.classes && Array.isArray(rawOutput.classes)) {
      for (const cls of rawOutput.classes) {
        const classNode: StandardizedGraphNode = {
          id: this.generateNodeId(NodeType.CLASS, codebaseName, cls.fullyQualifiedName || cls.name),
          nodeType: NodeType.CLASS,
          properties: {
            name: cls.name,
            fullyQualifiedName: cls.fullyQualifiedName || cls.name,
            comment: cls.comment || '',
            embedding: [], // Will be populated later
            visibility: cls.visibility?.toLowerCase() || 'public',
            isAbstract: cls.isAbstract || false,
            isFinal: cls.isFinal || false,
            isStatic: cls.isStatic || false,
            isInnerClass: cls.isInnerClass || false,
            startLine: cls.startLine || 0,
            endLine: cls.endLine || 0,
            filePath: cls.filePath || ''
          }
        };
        nodes.push(classNode);

        // Create File -> Class relationship
        if (cls.filePath) {
          const fileId = this.generateNodeId(NodeType.FILE, codebaseName, cls.filePath);
          relationships.push({
            type: RelationshipType.DEFINES_CLASS,
            startNodeId: fileId,
            endNodeId: classNode.id,
            properties: {}
          });
        }
      }
    }

    // Transform Interface nodes
    if (rawOutput.interfaces && Array.isArray(rawOutput.interfaces)) {
      for (const iface of rawOutput.interfaces) {
        const interfaceNode: StandardizedGraphNode = {
          id: this.generateNodeId(NodeType.INTERFACE, codebaseName, iface.fullyQualifiedName || iface.name),
          nodeType: NodeType.INTERFACE,
          properties: {
            name: iface.name,
            fullyQualifiedName: iface.fullyQualifiedName || iface.name,
            comment: iface.comment || '',
            embedding: [], // Will be populated later
            visibility: iface.visibility?.toLowerCase() || 'public',
            startLine: iface.startLine || 0,
            endLine: iface.endLine || 0,
            filePath: iface.filePath || ''
          }
        };
        nodes.push(interfaceNode);

        // Create File -> Interface relationship (using DEFINES_CLASS for now, could be DEFINES_INTERFACE)
        if (iface.filePath) {
          const fileId = this.generateNodeId(NodeType.FILE, codebaseName, iface.filePath);
          relationships.push({
            type: RelationshipType.DEFINES_CLASS, // Using DEFINES_CLASS as schema doesn't have DEFINES_INTERFACE
            startNodeId: fileId,
            endNodeId: interfaceNode.id,
            properties: { entityType: 'interface' }
          });
        }
      }
    }

    // Transform Method nodes
    if (rawOutput.methods && Array.isArray(rawOutput.methods)) {
      for (const method of rawOutput.methods) {
        const methodNode: StandardizedGraphNode = {
          id: this.generateNodeId(NodeType.METHOD, codebaseName, `${method.filePath}:${method.name}:${method.startLine}`),
          nodeType: NodeType.METHOD,
          properties: {
            name: method.name,
            signature: method.signature || '',
            returnType: method.returnType || 'void',
            comment: method.comment || '',
            body: method.body || '',
            visibility: method.visibility?.toLowerCase() || 'public',
            cyclomaticComplexity: method.cyclomaticComplexity || 0,
            embedding: [], // Will be populated later
            isStatic: method.isStatic || false,
            isAbstract: method.isAbstract || false,
            isConstructor: method.isConstructor || false,
            isTestMethod: method.isTestMethod || false,
            startLine: method.startLine || 0,
            endLine: method.endLine || 0,
            filePath: method.filePath || '',
            parameters: method.parameters || []
          }
        };
        nodes.push(methodNode);

        // Create File -> Method relationship
        if (method.filePath) {
          const fileId = this.generateNodeId(NodeType.FILE, codebaseName, method.filePath);
          relationships.push({
            type: RelationshipType.DEFINES_METHOD,
            startNodeId: fileId,
            endNodeId: methodNode.id,
            properties: {}
          });
        }
      }
    }

    // Transform Dependencies
    if (rawOutput.dependencies && Array.isArray(rawOutput.dependencies)) {
      for (const dep of rawOutput.dependencies) {
        const dependencyNode: StandardizedGraphNode = {
          id: this.generateNodeId(NodeType.DEPENDENCY, codebaseName, `${dep.name}:${dep.version || 'unknown'}`),
          nodeType: NodeType.DEPENDENCY,
          properties: {
            name: dep.name,
            version: dep.version || 'unknown',
            scope: dep.scope || 'compile',
            groupId: dep.groupId || '',
            artifactId: dep.artifactId || '',
            isDevDependency: dep.isDevDependency || false
          }
        };
        nodes.push(dependencyNode);

        // Create Codebase -> Dependency relationship
        relationships.push({
          type: RelationshipType.DEPENDS_ON,
          startNodeId: codebaseNode.id,
          endNodeId: dependencyNode.id,
          properties: { scope: dep.scope || 'compile' }
        });
      }
    }

    // Transform API Endpoints
    if (rawOutput.apiEndpoints && Array.isArray(rawOutput.apiEndpoints)) {
      for (const endpoint of rawOutput.apiEndpoints) {
        const endpointNode: StandardizedGraphNode = {
          id: this.generateNodeId(NodeType.API_ENDPOINT, codebaseName, `${endpoint.httpMethod}:${endpoint.path}`),
          nodeType: NodeType.API_ENDPOINT,
          properties: {
            httpMethod: endpoint.httpMethod || HttpMethod.GET,
            path: endpoint.path || '',
            description: endpoint.description || '',
            embedding: [], // Will be populated later
            requestSchema: endpoint.requestSchema || '',
            responseSchema: endpoint.responseSchema || '',
            statusCodes: endpoint.statusCodes || []
          }
        };
        nodes.push(endpointNode);
      }
    }

    // Transform Test Cases
    if (rawOutput.testCases && Array.isArray(rawOutput.testCases)) {
      for (const testCase of rawOutput.testCases) {
        const testCaseNode: StandardizedGraphNode = {
          id: this.generateNodeId(NodeType.TEST_CASE, codebaseName, `${testCase.filePath}:${testCase.name}`),
          nodeType: NodeType.TEST_CASE,
          properties: {
            name: testCase.name,
            filePath: testCase.filePath || '',
            className: testCase.className || '',
            methodName: testCase.methodName || '',
            testType: testCase.testType || 'UNIT',
            assertions: testCase.assertions || 0,
            startLine: testCase.startLine || 0,
            endLine: testCase.endLine || 0
          }
        };
        nodes.push(testCaseNode);
      }
    }

    // Transform relationships from parser output
    if (rawOutput.relationships && Array.isArray(rawOutput.relationships)) {
      for (const rel of rawOutput.relationships) {
        // Map parser relationship types to our schema relationship types
        let relationshipType: RelationshipType;
        switch (rel.type?.toLowerCase()) {
          case 'extends':
            relationshipType = RelationshipType.EXTENDS;
            break;
          case 'implements':
            relationshipType = RelationshipType.IMPLEMENTS;
            break;
          case 'calls':
            relationshipType = RelationshipType.CALLS;
            break;
          case 'uses':
            relationshipType = RelationshipType.USES_TYPE;
            break;
          default:
            continue; // Skip unknown relationship types
        }

        relationships.push({
          type: relationshipType,
          startNodeId: rel.sourceId || '',
          endNodeId: rel.targetId || '',
          properties: rel.properties || {}
        });
      }
    }

    return {
      metadata: {
        codebaseName: rawOutput.codebaseName,
        language: Language.JAVA,
        totalFiles: rawOutput.files?.length || 0,
        totalNodes: nodes.length,
        totalRelationships: relationships.length,
        parsingDuration: rawOutput.metadata.parsingDurationMs,
        framework: rawOutput.metadata.framework,
        detectedFrameworks: rawOutput.metadata.detectedFrameworks,
        parseTime: rawOutput.metadata.parseTime,
        parserVersion: rawOutput.metadata.parserVersion
      },
      nodes,
      relationships
    };
  }

  /**
   * Transform TypeScript (ts-morph-parser) output to graph format
   */
  private transformTypeScriptToGraph(rawOutput: ParserOutput): StandardizedGraphOutput {
    this.logger.log(`[PARSER-TRANSFORMER] Transforming TypeScript output to graph format`, {
      codebaseName: rawOutput.codebaseName,
      filesCount: rawOutput.files?.length || 0,
      classesCount: rawOutput.classes?.length || 0,
      methodsCount: rawOutput.methods?.length || 0,
      interfacesCount: rawOutput.interfaces?.length || 0,
      relationshipsCount: rawOutput.relationships?.length || 0
    });

    const nodes: StandardizedGraphNode[] = [];
    const relationships: BaseRelationship[] = [];
    const codebaseName = rawOutput.codebaseName;

    // Create Project node
    const projectNode: StandardizedGraphNode = {
      id: this.generateNodeId(NodeType.PROJECT, codebaseName, codebaseName),
      nodeType: NodeType.PROJECT,
      properties: {
        name: codebaseName,
        projectId: codebaseName,
        description: `TypeScript project: ${codebaseName}`
      }
    };
    nodes.push(projectNode);

    // Create Codebase node
    const codebaseNode: StandardizedGraphNode = {
      id: this.generateNodeId(NodeType.CODEBASE, codebaseName, codebaseName),
      nodeType: NodeType.CODEBASE,
      properties: {
        name: codebaseName,
        gitUrl: '', // Not available in parser output
        language: Language.TYPESCRIPT,
        framework: rawOutput.metadata.framework,
        lastIndexedCommit: '', // Not available in parser output
        isActive: true
      }
    };
    nodes.push(codebaseNode);

    // Create Project -> Codebase relationship
    relationships.push({
      type: RelationshipType.HAS_CODEBASE,
      startNodeId: projectNode.id,
      endNodeId: codebaseNode.id,
      properties: {}
    });

    // Transform File nodes (similar to Java)
    if (rawOutput.files && Array.isArray(rawOutput.files)) {
      for (const file of rawOutput.files) {
        const fileNode: StandardizedGraphNode = {
          id: this.generateNodeId(NodeType.FILE, codebaseName, file.path),
          nodeType: NodeType.FILE,
          properties: {
            path: file.path,
            fileName: file.fileName,
            checksum: file.checksum || '',
            lineCount: file.lineCount || 0,
            fileSize: file.fileSize || 0,
            extension: file.fileExtension || '',
            packageName: file.packageName || '',
            isTestFile: file.isTestFile || false
          }
        };
        nodes.push(fileNode);

        // Create Codebase -> File relationship
        relationships.push({
          type: RelationshipType.CONTAINS_FILE,
          startNodeId: codebaseNode.id,
          endNodeId: fileNode.id,
          properties: {}
        });
      }
    }

    // Transform Class nodes (similar to Java)
    if (rawOutput.classes && Array.isArray(rawOutput.classes)) {
      for (const cls of rawOutput.classes) {
        const classNode: StandardizedGraphNode = {
          id: this.generateNodeId(NodeType.CLASS, codebaseName, cls.fullyQualifiedName || cls.name),
          nodeType: NodeType.CLASS,
          properties: {
            name: cls.name,
            fullyQualifiedName: cls.fullyQualifiedName || cls.name,
            comment: cls.comment || '',
            embedding: [], // Will be populated later
            visibility: cls.visibility?.toLowerCase() || 'public',
            isAbstract: cls.isAbstract || false,
            isFinal: cls.isFinal || false,
            isStatic: cls.isStatic || false,
            isInnerClass: cls.isInnerClass || false,
            startLine: cls.startLine || 0,
            endLine: cls.endLine || 0,
            filePath: cls.filePath || ''
          }
        };
        nodes.push(classNode);

        // Create File -> Class relationship
        if (cls.filePath) {
          const fileId = this.generateNodeId(NodeType.FILE, codebaseName, cls.filePath);
          relationships.push({
            type: RelationshipType.DEFINES_CLASS,
            startNodeId: fileId,
            endNodeId: classNode.id,
            properties: {}
          });
        }
      }
    }

    // Transform Interface nodes (similar to Java)
    if (rawOutput.interfaces && Array.isArray(rawOutput.interfaces)) {
      for (const iface of rawOutput.interfaces) {
        const interfaceNode: StandardizedGraphNode = {
          id: this.generateNodeId(NodeType.INTERFACE, codebaseName, iface.fullyQualifiedName || iface.name),
          nodeType: NodeType.INTERFACE,
          properties: {
            name: iface.name,
            fullyQualifiedName: iface.fullyQualifiedName || iface.name,
            comment: iface.comment || '',
            embedding: [], // Will be populated later
            visibility: iface.visibility?.toLowerCase() || 'public',
            startLine: iface.startLine || 0,
            endLine: iface.endLine || 0,
            filePath: iface.filePath || ''
          }
        };
        nodes.push(interfaceNode);

        // Create File -> Interface relationship
        if (iface.filePath) {
          const fileId = this.generateNodeId(NodeType.FILE, codebaseName, iface.filePath);
          relationships.push({
            type: RelationshipType.DEFINES_CLASS, // Using DEFINES_CLASS as schema doesn't have DEFINES_INTERFACE
            startNodeId: fileId,
            endNodeId: interfaceNode.id,
            properties: { entityType: 'interface' }
          });
        }
      }
    }

    // Transform Method nodes (similar to Java)
    if (rawOutput.methods && Array.isArray(rawOutput.methods)) {
      for (const method of rawOutput.methods) {
        const methodNode: StandardizedGraphNode = {
          id: this.generateNodeId(NodeType.METHOD, codebaseName, `${method.filePath}:${method.name}:${method.startLine}`),
          nodeType: NodeType.METHOD,
          properties: {
            name: method.name,
            signature: method.signature || '',
            returnType: method.returnType || 'void',
            comment: method.comment || '',
            body: method.body || '',
            visibility: method.visibility?.toLowerCase() || 'public',
            cyclomaticComplexity: method.cyclomaticComplexity || 0,
            embedding: [], // Will be populated later
            isStatic: method.isStatic || false,
            isAbstract: method.isAbstract || false,
            isConstructor: method.isConstructor || false,
            isTestMethod: method.isTestMethod || false,
            startLine: method.startLine || 0,
            endLine: method.endLine || 0,
            filePath: method.filePath || '',
            parameters: method.parameters || []
          }
        };
        nodes.push(methodNode);

        // Create File -> Method relationship
        if (method.filePath) {
          const fileId = this.generateNodeId(NodeType.FILE, codebaseName, method.filePath);
          relationships.push({
            type: RelationshipType.DEFINES_METHOD,
            startNodeId: fileId,
            endNodeId: methodNode.id,
            properties: {}
          });
        }
      }
    }

    // Transform Dependencies (similar to Java)
    if (rawOutput.dependencies && Array.isArray(rawOutput.dependencies)) {
      for (const dep of rawOutput.dependencies) {
        const dependencyNode: StandardizedGraphNode = {
          id: this.generateNodeId(NodeType.DEPENDENCY, codebaseName, `${dep.name}:${dep.version || 'unknown'}`),
          nodeType: NodeType.DEPENDENCY,
          properties: {
            name: dep.name,
            version: dep.version || 'unknown',
            scope: dep.scope || 'runtime',
            isDevDependency: dep.isDevDependency || false
          }
        };
        nodes.push(dependencyNode);

        // Create Codebase -> Dependency relationship
        relationships.push({
          type: RelationshipType.DEPENDS_ON,
          startNodeId: codebaseNode.id,
          endNodeId: dependencyNode.id,
          properties: { scope: dep.scope || 'runtime' }
        });
      }
    }

    // Transform relationships from parser output (similar to Java)
    if (rawOutput.relationships && Array.isArray(rawOutput.relationships)) {
      for (const rel of rawOutput.relationships) {
        let relationshipType: RelationshipType;
        switch (rel.type?.toLowerCase()) {
          case 'extends':
            relationshipType = RelationshipType.EXTENDS;
            break;
          case 'implements':
            relationshipType = RelationshipType.IMPLEMENTS;
            break;
          case 'calls':
            relationshipType = RelationshipType.CALLS;
            break;
          case 'uses':
            relationshipType = RelationshipType.USES_TYPE;
            break;
          default:
            continue; // Skip unknown relationship types
        }

        relationships.push({
          type: relationshipType,
          startNodeId: rel.sourceId || '',
          endNodeId: rel.targetId || '',
          properties: rel.properties || {}
        });
      }
    }

    return {
      metadata: {
        codebaseName: rawOutput.codebaseName,
        language: Language.TYPESCRIPT,
        totalFiles: rawOutput.files?.length || 0,
        totalNodes: nodes.length,
        totalRelationships: relationships.length,
        parsingDuration: rawOutput.metadata.parsingDurationMs,
        framework: rawOutput.metadata.framework,
        detectedFrameworks: rawOutput.metadata.detectedFrameworks,
        parseTime: rawOutput.metadata.parseTime,
        parserVersion: rawOutput.metadata.parserVersion
      },
      nodes,
      relationships
    };
  }

  // Remove the old legacy methods below this point
}
