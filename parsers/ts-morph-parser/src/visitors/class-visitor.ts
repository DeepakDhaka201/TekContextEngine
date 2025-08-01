import { SourceFile, ClassDeclaration, SyntaxKind, Scope, Decorator, TypeParameterDeclaration } from 'ts-morph';
import { ParseResult, ClassNode, DecoratorInfo } from '../models/parse-result';
import { ParserOptions } from '../parser';
import { generateClassId, createFullyQualifiedName } from '../utils/id-generator';

export class ClassVisitor {
  constructor(
    private result: ParseResult,
    private options: ParserOptions,
    private codebaseName: string
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

      const fullyQualifiedName = this.getFullyQualifiedName(classDeclaration, sourceFile);
      const classId = generateClassId(this.codebaseName, fullyQualifiedName);

      const classNode: ClassNode = {
        id: classId,
        name,
        fullyQualifiedName,
        comment: this.getComment(classDeclaration) || '',
        visibility: this.getVisibility(classDeclaration),
        isAbstract: classDeclaration.isAbstract(),
        isFinal: false, // TypeScript doesn't have final classes
        isStatic: false, // Top-level classes are not static
        isInnerClass: this.isInnerClass(classDeclaration),
        isAnonymous: false, // TypeScript doesn't have anonymous classes like Java
        isGeneric: this.hasGenericParameters(classDeclaration),
        filePath: sourceFile.getFilePath(),
        startLine: classDeclaration.getStartLineNumber(),
        endLine: classDeclaration.getEndLineNumber(),
        decorators: this.getDecorators(classDeclaration),

        // Framework-specific properties - initialize all to false
        isController: false,
        isService: false,
        isRepository: false,
        isComponent: false,
        isConfiguration: false,
        isEntity: false,
        isTestClass: this.isTestClass(classDeclaration, sourceFile),

        // Generic info
        genericTypeParameters: this.getGenericTypeParameters(classDeclaration),

        // Inner class context
        isLocal: false, // TypeScript doesn't have local classes like Java
        enclosingClassId: this.getEnclosingClassId(classDeclaration),
        enclosingMethodId: null, // TypeScript doesn't have method-local classes

        properties: {}
      };

      // Framework-specific analysis
      this.analyzeFrameworkSpecificClass(classNode, classDeclaration);

      this.result.classes.push(classNode);

      if (this.options.verbose) {
        console.log(`   🏗 Class: ${name} (ID: ${classId})`);
      }

    } catch (error) {
      console.error(`Error processing class:`, error);
    }
  }

  private getFullyQualifiedName(classDeclaration: ClassDeclaration, sourceFile: SourceFile): string {
    const className = classDeclaration.getName()!;
    const filePath = sourceFile.getFilePath();

    return createFullyQualifiedName(filePath, className);
  }

  private getComment(classDeclaration: ClassDeclaration): string | undefined {
    const jsDoc = classDeclaration.getJsDocs();
    if (jsDoc.length > 0) {
      const comment = jsDoc[0]?.getComment();
      if (typeof comment === 'string') {
        return comment;
      }
    }

    // Try to get leading comments
    const leadingComments = classDeclaration.getLeadingCommentRanges();
    if (leadingComments.length > 0) {
      return leadingComments[0]?.getText();
    }

    return undefined;
  }

  private getVisibility(classDeclaration: ClassDeclaration): string {
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
      const fullyQualifiedName = name; // For now, use simple name as FQN

      // Extract properties from decorator arguments
      const properties: Record<string, any> = {};
      const args = decorator.getArguments();

      if (args.length > 0) {
        args.forEach((arg, index) => {
          try {
            properties[`arg${index}`] = arg.getText();
          } catch {
            properties[`arg${index}`] = arg.getKindName();
          }
        });
      }

      decorators.push({
        name,
        fullyQualifiedName,
        properties
      });
    }

    return decorators;
  }

  private analyzeFrameworkSpecificClass(classNode: ClassNode, classDeclaration: ClassDeclaration): void {
    const decorators = classNode.decorators;
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
    if (decoratorNames.includes('Service')) {
      classNode.isService = true;
    }
    if (decoratorNames.includes('Repository')) {
      classNode.isRepository = true;
    }
    if (decoratorNames.includes('Entity')) {
      classNode.isEntity = true;
    }
    if (decoratorNames.includes('Configuration')) {
      classNode.isConfiguration = true;
    }
  }

  private isInnerClass(classDeclaration: ClassDeclaration): boolean {
    // Check if the class is nested inside another class
    const parent = classDeclaration.getParent();
    return parent?.getKind() === SyntaxKind.ClassDeclaration;
  }

  private hasGenericParameters(classDeclaration: ClassDeclaration): boolean {
    return classDeclaration.getTypeParameters().length > 0;
  }

  private getGenericTypeParameters(classDeclaration: ClassDeclaration): string[] | null {
    const typeParams = classDeclaration.getTypeParameters();
    if (typeParams.length === 0) {
      return null;
    }
    return typeParams.map(param => param.getName());
  }

  private getEnclosingClassId(classDeclaration: ClassDeclaration): string | null {
    const parent = classDeclaration.getParent();
    if (parent?.getKind() === SyntaxKind.ClassDeclaration) {
      const parentClass = parent as ClassDeclaration;
      const parentName = parentClass.getName();
      if (parentName) {
        const parentFqn = this.getFullyQualifiedName(parentClass, classDeclaration.getSourceFile());
        return generateClassId(this.codebaseName, parentFqn);
      }
    }
    return null;
  }

  private isTestClass(classDeclaration: ClassDeclaration, sourceFile: SourceFile): boolean {
    const fileName = sourceFile.getBaseName();
    const className = classDeclaration.getName() || '';

    // Check file name patterns
    if (fileName.includes('.test.') || fileName.includes('.spec.') ||
        fileName.endsWith('Test.ts') || fileName.endsWith('Spec.ts')) {
      return true;
    }

    // Check class name patterns
    if (className.endsWith('Test') || className.endsWith('Spec') ||
        className.includes('Test') || className.includes('Spec')) {
      return true;
    }

    return false;
  }
}