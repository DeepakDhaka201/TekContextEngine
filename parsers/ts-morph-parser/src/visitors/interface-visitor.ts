import { SourceFile, InterfaceDeclaration, SyntaxKind } from 'ts-morph';
import { ParseResult, InterfaceNode, DecoratorInfo } from '../models/parse-result';
import { ParserOptions } from '../parser';
import { generateInterfaceId, createFullyQualifiedName } from '../utils/id-generator';

export class InterfaceVisitor {
  constructor(
    private result: ParseResult,
    private options: ParserOptions,
    private codebaseName: string
  ) {}

  visitSourceFile(sourceFile: SourceFile): void {
    const interfaces = sourceFile.getInterfaces();
    
    for (const interfaceDeclaration of interfaces) {
      this.visitInterface(interfaceDeclaration, sourceFile);
    }
  }

  private visitInterface(interfaceDeclaration: InterfaceDeclaration, sourceFile: SourceFile): void {
    try {
      const name = interfaceDeclaration.getName();
      const fullyQualifiedName = this.getFullyQualifiedName(interfaceDeclaration, sourceFile);
      const interfaceId = generateInterfaceId(this.codebaseName, fullyQualifiedName);

      const interfaceNode: InterfaceNode = {
        id: interfaceId,
        name,
        fullyQualifiedName,
        comment: this.getComment(interfaceDeclaration) || '',
        visibility: this.getVisibility(interfaceDeclaration),
        filePath: sourceFile.getFilePath(),
        startLine: interfaceDeclaration.getStartLineNumber(),
        endLine: interfaceDeclaration.getEndLineNumber(),
        decorators: this.getDecorators(interfaceDeclaration),
        properties: {}
      };

      this.result.interfaces.push(interfaceNode);

      if (this.options.verbose) {
        console.log(`   🔗 Interface: ${name} (ID: ${interfaceId})`);
      }

    } catch (error) {
      console.error(`Error processing interface:`, error);
    }
  }

  private getFullyQualifiedName(interfaceDeclaration: InterfaceDeclaration, sourceFile: SourceFile): string {
    const interfaceName = interfaceDeclaration.getName();
    const filePath = sourceFile.getFilePath();

    return createFullyQualifiedName(filePath, interfaceName);
  }

  private getComment(interfaceDeclaration: InterfaceDeclaration): string | undefined {
    const jsDoc = interfaceDeclaration.getJsDocs();
    if (jsDoc.length > 0) {
      const comment = jsDoc[0]?.getComment();
      if (typeof comment === 'string') {
        return comment;
      }
    }

    // Try to get leading comments
    const leadingComments = interfaceDeclaration.getLeadingCommentRanges();
    if (leadingComments.length > 0) {
      return leadingComments[0]?.getText();
    }

    return undefined;
  }

  private getVisibility(interfaceDeclaration: InterfaceDeclaration): string {
    // TypeScript interfaces are always public when exported, package-private otherwise
    return interfaceDeclaration.isExported() ? 'public' : 'package';
  }

  private getDecorators(interfaceDeclaration: InterfaceDeclaration): DecoratorInfo[] {
    // TypeScript interfaces don't have decorators, but we return empty array for consistency
    return [];
  }

  // Framework-specific analysis is removed since the new structure doesn't have these properties
}