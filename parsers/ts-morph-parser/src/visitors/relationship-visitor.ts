import { SourceFile, ClassDeclaration, InterfaceDeclaration, MethodDeclaration, FunctionDeclaration } from 'ts-morph';
import { ParseResult, Relationship } from '../models/parse-result';
import { ParserOptions } from '../parser';

export class RelationshipVisitor {
  constructor(
    private result: ParseResult,
    private options: ParserOptions
  ) {}

  buildRelationships(): void {
    if (this.options.verbose) {
      console.log('   🔗 Building relationships...');
    }

    this.buildFileToClassRelationships();
    this.buildFileToInterfaceRelationships();
    this.buildFileToMethodRelationships();
    this.buildClassToMethodRelationships();
    this.buildInheritanceRelationships();
    this.buildImplementationRelationships();
    this.buildDependencyRelationships();
    this.buildFrameworkRelationships();

    if (this.options.verbose) {
      console.log(`   ✅ Built ${this.result.relationships.length} relationships`);
    }
  }

  private buildFileToClassRelationships(): void {
    for (const classNode of this.result.classes) {
      this.addRelationship({
        type: 'CONTAINS',
        startNodeType: 'File',
        startNodeId: classNode.filePath,
        endNodeType: 'Class',
        endNodeId: classNode.fullyQualifiedName
      });
    }
  }

  private buildFileToInterfaceRelationships(): void {
    for (const interfaceNode of this.result.interfaces) {
      this.addRelationship({
        type: 'CONTAINS',
        startNodeType: 'File',
        startNodeId: interfaceNode.filePath,
        endNodeType: 'Interface',
        endNodeId: interfaceNode.fullyQualifiedName
      });
    }
  }

  private buildFileToMethodRelationships(): void {
    for (const methodNode of this.result.methods) {
      // Standalone functions have file relationship
      if (!methodNode.className) {
        this.addRelationship({
          type: 'CONTAINS',
          startNodeType: 'File',
          startNodeId: methodNode.filePath,
          endNodeType: 'Method',
          endNodeId: `${methodNode.filePath}:${methodNode.name}`
        });
      }
    }
  }

  private buildClassToMethodRelationships(): void {
    for (const methodNode of this.result.methods) {
      if (methodNode.className) {
        const classNode = this.result.classes.find(c => 
          c.name === methodNode.className && c.filePath === methodNode.filePath
        );
        
        if (classNode) {
          const relationshipType = methodNode.isConstructor ? 'HAS_CONSTRUCTOR' : 'HAS_METHOD';
          
          this.addRelationship({
            type: relationshipType,
            startNodeType: 'Class',
            startNodeId: classNode.fullyQualifiedName,
            endNodeType: 'Method',
            endNodeId: `${classNode.fullyQualifiedName}:${methodNode.name}`,
            properties: {
              methodType: methodNode.isConstructor ? 'constructor' : 
                         methodNode.isGetter ? 'getter' :
                         methodNode.isSetter ? 'setter' : 'method',
              visibility: methodNode.visibility,
              isStatic: methodNode.isStatic,
              isAbstract: methodNode.isAbstract
            }
          });
        }
      }
    }
  }

  private buildInheritanceRelationships(): void {
    // This would require analyzing extends clauses in the AST
    // For now, we'll implement basic inheritance detection
    // This can be enhanced by analyzing the ts-morph AST more deeply
  }

  private buildImplementationRelationships(): void {
    // This would require analyzing implements clauses in the AST
    // For now, we'll implement basic implementation detection
    // This can be enhanced by analyzing the ts-morph AST more deeply
  }

  private buildDependencyRelationships(): void {
    for (const dependency of this.result.dependencies) {
      // Find files that import this dependency
      const dependentFiles = this.result.files.filter(file => {
        // This is a simplified check - in reality we'd need to analyze import statements
        return true; // Placeholder
      });

      for (const file of dependentFiles) {
        this.addRelationship({
          type: 'DEPENDS_ON',
          startNodeType: 'File',
          startNodeId: file.path,
          endNodeType: 'Dependency',
          endNodeId: dependency.name,
          properties: {
            dependencyType: dependency.type,
            version: dependency.version
          }
        });
      }
    }
  }

  private buildFrameworkRelationships(): void {
    // API Endpoint relationships
    for (const method of this.result.methods) {
      if (method.isApiEndpoint && method.className) {
        const classNode = this.result.classes.find(c => 
          c.name === method.className && c.filePath === method.filePath
        );
        
        if (classNode?.isController) {
          this.addRelationship({
            type: 'EXPOSES_ENDPOINT',
            startNodeType: 'Class',
            startNodeId: classNode.fullyQualifiedName,
            endNodeType: 'APIEndpoint',
            endNodeId: `${method.httpMethod}:${method.route || method.name}`,
            properties: {
              httpMethod: method.httpMethod,
              route: method.route,
              methodName: method.name
            }
          });
        }
      }
    }

    // Component relationships
    for (const classNode of this.result.classes) {
      if (classNode.isComponent) {
        // Find props interfaces
        const propsInterface = this.result.interfaces.find(i => 
          i.isProps && i.filePath === classNode.filePath
        );
        
        if (propsInterface) {
          this.addRelationship({
            type: 'USES_PROPS',
            startNodeType: 'Class',
            startNodeId: classNode.fullyQualifiedName,
            endNodeType: 'Interface',
            endNodeId: propsInterface.fullyQualifiedName
          });
        }
      }
    }

    // Service relationships
    for (const classNode of this.result.classes) {
      if (classNode.isService) {
        // Find methods that are lifecycle or event handlers
        const serviceMethods = this.result.methods.filter(m => 
          m.className === classNode.name && m.filePath === classNode.filePath
        );
        
        for (const method of serviceMethods) {
          if (method.isApiEndpoint) {
            this.addRelationship({
              type: 'PROVIDES_SERVICE',
              startNodeType: 'Class',
              startNodeId: classNode.fullyQualifiedName,
              endNodeType: 'Method',
              endNodeId: `${classNode.fullyQualifiedName}:${method.name}`,
              properties: {
                serviceType: 'api',
                httpMethod: method.httpMethod
              }
            });
          }
        }
      }
    }
  }

  private addRelationship(relationship: Relationship): void {
    // Check for duplicates
    const exists = this.result.relationships.some(r => 
      r.type === relationship.type &&
      r.startNodeType === relationship.startNodeType &&
      r.startNodeId === relationship.startNodeId &&
      r.endNodeType === relationship.endNodeType &&
      r.endNodeId === relationship.endNodeId
    );

    if (!exists) {
      this.result.relationships.push(relationship);
    }
  }
}