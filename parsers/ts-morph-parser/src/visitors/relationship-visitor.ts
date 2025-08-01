import { ParseResult, Relationship } from '../models/parse-result';
import { ParserOptions } from '../parser';
import { generateRelationshipId } from '../utils/id-generator';

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
    this.buildClassToMethodRelationships();

    if (this.options.verbose) {
      console.log(`   ✅ Built ${this.result.relationships.length} relationships`);
    }
  }

  private buildFileToClassRelationships(): void {
    for (const classNode of this.result.classes) {
      this.addRelationship({
        id: generateRelationshipId('CONTAINS', classNode.filePath, classNode.id),
        type: 'CONTAINS',
        sourceType: 'File',
        sourceId: classNode.filePath,
        targetType: 'Class',
        targetId: classNode.id,
        properties: {}
      });
    }
  }

  private buildFileToInterfaceRelationships(): void {
    for (const interfaceNode of this.result.interfaces) {
      this.addRelationship({
        id: generateRelationshipId('CONTAINS', interfaceNode.filePath, interfaceNode.id),
        type: 'CONTAINS',
        sourceType: 'File',
        sourceId: interfaceNode.filePath,
        targetType: 'Interface',
        targetId: interfaceNode.id,
        properties: {}
      });
    }
  }



  private buildClassToMethodRelationships(): void {
    for (const methodNode of this.result.methods) {
      // Find the class that contains this method by matching file path and looking for class context
      const classNode = this.result.classes.find(c => c.filePath === methodNode.filePath);

      if (classNode) {
        const relationshipType = methodNode.isConstructor ? 'HAS_CONSTRUCTOR' : 'HAS_METHOD';

        this.addRelationship({
          id: generateRelationshipId(relationshipType, classNode.id, methodNode.id),
          type: relationshipType,
          sourceType: 'Class',
          sourceId: classNode.id,
          targetType: 'Method',
          targetId: methodNode.id,
          properties: {
            methodType: methodNode.isConstructor ? 'constructor' : 'method',
            visibility: methodNode.visibility,
            isStatic: methodNode.isStatic,
            isAbstract: methodNode.isAbstract
          }
        });
      }
    }
  }

  private addRelationship(relationship: Relationship): void {
    // Check if relationship already exists
    const exists = this.result.relationships.some(r =>
      r.type === relationship.type &&
      r.sourceId === relationship.sourceId &&
      r.targetId === relationship.targetId
    );

    if (!exists) {
      this.result.relationships.push(relationship);
    }
  }
}