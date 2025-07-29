import { SourceFile, InterfaceDeclaration, SyntaxKind } from 'ts-morph';
import { ParseResult, InterfaceNode } from '../models/parse-result';
import { ParserOptions } from '../parser';

export class InterfaceVisitor {
  constructor(
    private result: ParseResult,
    private options: ParserOptions
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
      
      const interfaceNode: InterfaceNode = {
        name,
        fullyQualifiedName: this.getFullyQualifiedName(interfaceDeclaration, sourceFile),
        comment: this.getComment(interfaceDeclaration),
        filePath: sourceFile.getFilePath(),
        startLine: interfaceDeclaration.getStartLineNumber(),
        endLine: interfaceDeclaration.getEndLineNumber(),
        isExported: interfaceDeclaration.isExported()
      };

      // Framework-specific analysis
      this.analyzeFrameworkSpecificInterface(interfaceNode, interfaceDeclaration);

      this.result.interfaces.push(interfaceNode);

      if (this.options.verbose) {
        console.log(`   🔗 Interface: ${name} (${interfaceNode.isExported ? 'exported' : 'internal'})`);
      }

    } catch (error) {
      console.error(`Error processing interface:`, error);
    }
  }

  private getFullyQualifiedName(interfaceDeclaration: InterfaceDeclaration, sourceFile: SourceFile): string {
    const interfaceName = interfaceDeclaration.getName();
    const filePath = sourceFile.getFilePath();
    
    // Try to get namespace or module name
    const namespaces = interfaceDeclaration.getAncestors()
      .filter(ancestor => ancestor.getKind() === SyntaxKind.ModuleDeclaration)
      .map(ns => (ns as any).getName?.())
      .filter(Boolean);
    
    if (namespaces.length > 0) {
      return namespaces.join('.') + '.' + interfaceName;
    }
    
    // Use file path as namespace
    const relativePath = filePath.replace(/\.(ts|tsx|js|jsx)$/, '').replace(/[\/\\]/g, '.');
    return relativePath + '.' + interfaceName;
  }

  private getComment(interfaceDeclaration: InterfaceDeclaration): string | undefined {
    const jsDoc = interfaceDeclaration.getJsDocs();
    if (jsDoc.length > 0) {
      return jsDoc[0].getComment();
    }
    
    // Try to get leading comments
    const leadingComments = interfaceDeclaration.getLeadingCommentRanges();
    if (leadingComments.length > 0) {
      return leadingComments[0].getText();
    }
    
    return undefined;
  }

  private analyzeFrameworkSpecificInterface(interfaceNode: InterfaceNode, interfaceDeclaration: InterfaceDeclaration): void {
    const name = interfaceNode.name;
    
    // React Props detection
    if (name.endsWith('Props') || name.endsWith('Properties')) {
      interfaceNode.isProps = true;
    }
    
    // API Model detection
    if (name.endsWith('Response') || name.endsWith('Request') || 
        name.endsWith('DTO') || name.endsWith('Model') ||
        name.endsWith('Entity') || name.endsWith('Data')) {
      interfaceNode.isApiModel = true;
    }
    
    // Check if interface extends common base types
    const extendsClauses = interfaceDeclaration.getExtends();
    for (const extendsClause of extendsClauses) {
      const extendsText = extendsClause.getText();
      
      // React component props
      if (extendsText.includes('ComponentProps') || extendsText.includes('HTMLProps')) {
        interfaceNode.isProps = true;
      }
      
      // API response types
      if (extendsText.includes('Response') || extendsText.includes('ApiResponse')) {
        interfaceNode.isApiModel = true;
      }
    }
    
    // Check properties for framework patterns
    const properties = interfaceDeclaration.getProperties();
    const propertyNames = properties.map(prop => prop.getName());
    
    // React props patterns
    if (propertyNames.some(name => ['children', 'className', 'style', 'onClick', 'onChange'].includes(name))) {
      interfaceNode.isProps = true;
    }
    
    // API model patterns
    if (propertyNames.some(name => ['id', 'createdAt', 'updatedAt', 'status', 'data'].includes(name))) {
      interfaceNode.isApiModel = true;
    }
  }
}