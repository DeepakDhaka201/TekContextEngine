import { SourceFile, ClassDeclaration, SyntaxKind, Scope } from 'ts-morph';
import { ParseResult, ClassNode, DecoratorInfo } from '../models/parse-result';
import { ParserOptions } from '../parser';

export class ClassVisitor {
  constructor(
    private result: ParseResult,
    private options: ParserOptions
  ) {}

  visitSourceFile(sourceFile: SourceFile): void {
    const classes = sourceFile.getClasses();
    
    for (const classDeclaration of classes) {
      this.visitClass(classDeclaration, sourceFile);
    }
  }

  private visitClass(classDeclaration: ClassDeclaration, sourceFile: SourceFile): void {
    try {
      const name = classDeclaration.getName();
      if (!name) return;

      const classNode: ClassNode = {
        name,
        fullyQualifiedName: this.getFullyQualifiedName(classDeclaration, sourceFile),
        comment: this.getComment(classDeclaration),
        visibility: this.getVisibility(classDeclaration),
        isAbstract: classDeclaration.isAbstract(),
        isExported: classDeclaration.isExported(),
        filePath: sourceFile.getFilePath(),
        startLine: classDeclaration.getStartLineNumber(),
        endLine: classDeclaration.getEndLineNumber(),
        decorators: this.getDecorators(classDeclaration)
      };

      // Framework-specific analysis
      this.analyzeFrameworkSpecificClass(classNode, classDeclaration);

      this.result.classes.push(classNode);

      if (this.options.verbose) {
        console.log(`   🏗 Class: ${name} (${classNode.isExported ? 'exported' : 'internal'})`);
      }

    } catch (error) {
      console.error(`Error processing class:`, error);
    }
  }

  private getFullyQualifiedName(classDeclaration: ClassDeclaration, sourceFile: SourceFile): string {
    const className = classDeclaration.getName()!;
    const filePath = sourceFile.getFilePath();
    
    // Try to get namespace or module name
    const namespaces = classDeclaration.getAncestors()
      .filter(ancestor => ancestor.getKind() === SyntaxKind.ModuleDeclaration)
      .map(ns => (ns as any).getName?.())
      .filter(Boolean);
    
    if (namespaces.length > 0) {
      return namespaces.join('.') + '.' + className;
    }
    
    // Use file path as namespace
    const relativePath = filePath.replace(/\.(ts|tsx|js|jsx)$/, '').replace(/[\/\\]/g, '.');
    return relativePath + '.' + className;
  }

  private getComment(classDeclaration: ClassDeclaration): string | undefined {
    const jsDoc = classDeclaration.getJsDocs();
    if (jsDoc.length > 0) {
      return jsDoc[0].getComment();
    }
    
    // Try to get leading comments
    const leadingComments = classDeclaration.getLeadingCommentRanges();
    if (leadingComments.length > 0) {
      return leadingComments[0].getText();
    }
    
    return undefined;
  }

  private getVisibility(classDeclaration: ClassDeclaration): 'public' | 'private' | 'protected' | 'package' {
    if (classDeclaration.hasModifier(SyntaxKind.PrivateKeyword)) {
      return 'private';
    }
    if (classDeclaration.hasModifier(SyntaxKind.ProtectedKeyword)) {
      return 'protected';
    }
    if (classDeclaration.hasModifier(SyntaxKind.PublicKeyword) || classDeclaration.isExported()) {
      return 'public';
    }
    return 'package';
  }

  private getDecorators(classDeclaration: ClassDeclaration): DecoratorInfo[] {
    const decorators: DecoratorInfo[] = [];
    
    for (const decorator of classDeclaration.getDecorators()) {
      const name = decorator.getName();
      const args = decorator.getArguments().map(arg => {
        try {
          return arg.getText();
        } catch {
          return arg.getKindName();
        }
      });

      decorators.push({
        name,
        arguments: args.length > 0 ? args : undefined
      });
    }
    
    return decorators;
  }

  private analyzeFrameworkSpecificClass(classNode: ClassNode, classDeclaration: ClassDeclaration): void {
    const decorators = classNode.decorators || [];
    const decoratorNames = decorators.map(d => d.name);
    
    // Angular
    if (decoratorNames.includes('Component')) {
      classNode.isComponent = true;
    }
    if (decoratorNames.includes('Injectable')) {
      classNode.isService = true;
    }
    
    // NestJS
    if (decoratorNames.includes('Controller')) {
      classNode.isController = true;
    }
    if (decoratorNames.includes('Injectable')) {
      classNode.isService = true;
    }
    
    // React (class components)
    const extendsClauses = classDeclaration.getExtends();
    if (extendsClauses) {
      const extendsText = extendsClauses.getText();
      if (extendsText.includes('Component') || extendsText.includes('PureComponent')) {
        classNode.isComponent = true;
      }
    }
    
    // General service patterns
    if (classNode.name.endsWith('Service') || classNode.name.endsWith('Repository')) {
      classNode.isService = true;
    }
    
    // General component patterns
    if (classNode.name.endsWith('Component') || classNode.name.endsWith('Widget')) {
      classNode.isComponent = true;
    }
    
    // Controller patterns
    if (classNode.name.endsWith('Controller') || classNode.name.endsWith('Handler')) {
      classNode.isController = true;
    }
  }
}