import { SourceFile, MethodDeclaration, FunctionDeclaration, ConstructorDeclaration, GetAccessorDeclaration, SetAccessorDeclaration, SyntaxKind, Scope } from 'ts-morph';
import { ParseResult, MethodNode, ParameterInfo, DecoratorInfo } from '../models/parse-result';
import { ParserOptions } from '../parser';

export class MethodVisitor {
  constructor(
    private result: ParseResult,
    private options: ParserOptions
  ) {}

  visitSourceFile(sourceFile: SourceFile): void {
    // Visit class methods
    const classes = sourceFile.getClasses();
    for (const classDeclaration of classes) {
      // Methods
      for (const method of classDeclaration.getMethods()) {
        this.visitMethod(method, sourceFile, classDeclaration.getName());
      }
      
      // Constructors
      for (const constructor of classDeclaration.getConstructors()) {
        this.visitConstructor(constructor, sourceFile, classDeclaration.getName());
      }
      
      // Getters
      for (const getter of classDeclaration.getGetAccessors()) {
        this.visitGetter(getter, sourceFile, classDeclaration.getName());
      }
      
      // Setters
      for (const setter of classDeclaration.getSetAccessors()) {
        this.visitSetter(setter, sourceFile, classDeclaration.getName());
      }
    }
    
    // Visit standalone functions
    const functions = sourceFile.getFunctions();
    for (const func of functions) {
      this.visitFunction(func, sourceFile);
    }
  }

  private visitMethod(method: MethodDeclaration, sourceFile: SourceFile, className?: string): void {
    try {
      const methodNode = this.createMethodNode(method, sourceFile, className, false);
      this.analyzeFrameworkSpecificMethod(methodNode, method);
      this.result.methods.push(methodNode);

      if (this.options.verbose) {
        console.log(`   ⚙️ Method: ${methodNode.name} (${methodNode.visibility})`);
      }
    } catch (error) {
      console.error(`Error processing method:`, error);
    }
  }

  private visitConstructor(constructor: ConstructorDeclaration, sourceFile: SourceFile, className?: string): void {
    try {
      const methodNode = this.createConstructorNode(constructor, sourceFile, className);
      this.result.methods.push(methodNode);

      if (this.options.verbose) {
        console.log(`   🏗️ Constructor: ${className || 'unknown'}`);
      }
    } catch (error) {
      console.error(`Error processing constructor:`, error);
    }
  }

  private visitFunction(func: FunctionDeclaration, sourceFile: SourceFile): void {
    try {
      const methodNode = this.createFunctionNode(func, sourceFile);
      this.analyzeFrameworkSpecificMethod(methodNode, func);
      this.result.methods.push(methodNode);

      if (this.options.verbose) {
        console.log(`   🔧 Function: ${methodNode.name}`);
      }
    } catch (error) {
      console.error(`Error processing function:`, error);
    }
  }

  private visitGetter(getter: GetAccessorDeclaration, sourceFile: SourceFile, className?: string): void {
    try {
      const methodNode = this.createGetterNode(getter, sourceFile, className);
      this.result.methods.push(methodNode);
    } catch (error) {
      console.error(`Error processing getter:`, error);
    }
  }

  private visitSetter(setter: SetAccessorDeclaration, sourceFile: SourceFile, className?: string): void {
    try {
      const methodNode = this.createSetterNode(setter, sourceFile, className);
      this.result.methods.push(methodNode);
    } catch (error) {
      console.error(`Error processing setter:`, error);
    }
  }

  private createMethodNode(method: MethodDeclaration, sourceFile: SourceFile, className?: string, isConstructor = false): MethodNode {
    const name = method.getName();
    const signature = this.buildSignature(method);
    const returnType = method.getReturnType().getText();
    const parameters = this.getParameters(method);
    const decorators = this.getDecorators(method);

    return {
      name,
      signature,
      returnType,
      comment: this.getComment(method),
      body: method.getBodyText(),
      visibility: this.getVisibility(method),
      cyclomaticComplexity: this.calculateCyclomaticComplexity(method),
      parameters,
      isAsync: method.isAsync(),
      isStatic: method.isStatic(),
      isAbstract: method.isAbstract(),
      filePath: sourceFile.getFilePath(),
      className,
      startLine: method.getStartLineNumber(),
      endLine: method.getEndLineNumber(),
      isConstructor,
      isGetter: false,
      isSetter: false,
      decorators
    };
  }

  private createConstructorNode(constructor: ConstructorDeclaration, sourceFile: SourceFile, className?: string): MethodNode {
    const signature = this.buildConstructorSignature(constructor);
    const parameters = this.getConstructorParameters(constructor);

    return {
      name: 'constructor',
      signature,
      returnType: 'void',
      comment: this.getComment(constructor),
      body: constructor.getBodyText(),
      visibility: this.getConstructorVisibility(constructor),
      cyclomaticComplexity: this.calculateCyclomaticComplexity(constructor),
      parameters,
      isAsync: false,
      isStatic: false,
      isAbstract: false,
      filePath: sourceFile.getFilePath(),
      className,
      startLine: constructor.getStartLineNumber(),
      endLine: constructor.getEndLineNumber(),
      isConstructor: true,
      isGetter: false,
      isSetter: false
    };
  }

  private createFunctionNode(func: FunctionDeclaration, sourceFile: SourceFile): MethodNode {
    const name = func.getName() || 'anonymous';
    const signature = this.buildFunctionSignature(func);
    const returnType = func.getReturnType().getText();
    const parameters = this.getFunctionParameters(func);

    return {
      name,
      signature,
      returnType,
      comment: this.getComment(func),
      body: func.getBodyText(),
      visibility: func.isExported() ? 'public' : 'private',
      cyclomaticComplexity: this.calculateCyclomaticComplexity(func),
      parameters,
      isAsync: func.isAsync(),
      isStatic: false,
      isAbstract: false,
      filePath: sourceFile.getFilePath(),
      startLine: func.getStartLineNumber(),
      endLine: func.getEndLineNumber(),
      isConstructor: false,
      isGetter: false,
      isSetter: false
    };
  }

  private createGetterNode(getter: GetAccessorDeclaration, sourceFile: SourceFile, className?: string): MethodNode {
    const name = getter.getName();
    const returnType = getter.getReturnType().getText();

    return {
      name,
      signature: `get ${name}(): ${returnType}`,
      returnType,
      comment: this.getComment(getter),
      body: getter.getBodyText(),
      visibility: this.getAccessorVisibility(getter),
      cyclomaticComplexity: this.calculateCyclomaticComplexity(getter),
      parameters: [],
      isAsync: false,
      isStatic: getter.isStatic(),
      isAbstract: getter.isAbstract(),
      filePath: sourceFile.getFilePath(),
      className,
      startLine: getter.getStartLineNumber(),
      endLine: getter.getEndLineNumber(),
      isConstructor: false,
      isGetter: true,
      isSetter: false
    };
  }

  private createSetterNode(setter: SetAccessorDeclaration, sourceFile: SourceFile, className?: string): MethodNode {
    const name = setter.getName();
    const parameters = this.getSetterParameters(setter);

    return {
      name,
      signature: `set ${name}(${parameters.map(p => `${p.name}: ${p.type}`).join(', ')})`,
      returnType: 'void',
      comment: this.getComment(setter),
      body: setter.getBodyText(),
      visibility: this.getAccessorVisibility(setter),
      cyclomaticComplexity: this.calculateCyclomaticComplexity(setter),
      parameters,
      isAsync: false,
      isStatic: setter.isStatic(),
      isAbstract: setter.isAbstract(),
      filePath: sourceFile.getFilePath(),
      className,
      startLine: setter.getStartLineNumber(),
      endLine: setter.getEndLineNumber(),
      isConstructor: false,
      isGetter: false,
      isSetter: true
    };
  }

  private buildSignature(method: MethodDeclaration): string {
    const name = method.getName();
    const parameters = method.getParameters()
      .map(p => `${p.getName()}: ${p.getType().getText()}`)
      .join(', ');
    const returnType = method.getReturnType().getText();
    return `${name}(${parameters}): ${returnType}`;
  }

  private buildConstructorSignature(constructor: ConstructorDeclaration): string {
    const parameters = constructor.getParameters()
      .map(p => `${p.getName()}: ${p.getType().getText()}`)
      .join(', ');
    return `constructor(${parameters})`;
  }

  private buildFunctionSignature(func: FunctionDeclaration): string {
    const name = func.getName() || 'anonymous';
    const parameters = func.getParameters()
      .map(p => `${p.getName()}: ${p.getType().getText()}`)
      .join(', ');
    const returnType = func.getReturnType().getText();
    return `${name}(${parameters}): ${returnType}`;
  }

  private getParameters(method: MethodDeclaration): ParameterInfo[] {
    return method.getParameters().map(param => ({
      name: param.getName(),
      type: param.getType().getText(),
      isOptional: param.hasQuestionToken(),
      defaultValue: param.getInitializer()?.getText(),
      decorators: this.getParameterDecorators(param)
    }));
  }

  private getConstructorParameters(constructor: ConstructorDeclaration): ParameterInfo[] {
    return constructor.getParameters().map(param => ({
      name: param.getName(),
      type: param.getType().getText(),
      isOptional: param.hasQuestionToken(),
      defaultValue: param.getInitializer()?.getText(),
      decorators: this.getParameterDecorators(param)
    }));
  }

  private getFunctionParameters(func: FunctionDeclaration): ParameterInfo[] {
    return func.getParameters().map(param => ({
      name: param.getName(),
      type: param.getType().getText(),
      isOptional: param.hasQuestionToken(),
      defaultValue: param.getInitializer()?.getText()
    }));
  }

  private getSetterParameters(setter: SetAccessorDeclaration): ParameterInfo[] {
    return setter.getParameters().map(param => ({
      name: param.getName(),
      type: param.getType().getText(),
      isOptional: param.hasQuestionToken(),
      defaultValue: param.getInitializer()?.getText()
    }));
  }

  private getDecorators(method: MethodDeclaration): DecoratorInfo[] {
    return method.getDecorators().map(decorator => ({
      name: decorator.getName(),
      arguments: decorator.getArguments().map(arg => arg.getText())
    }));
  }

  private getParameterDecorators(param: any): DecoratorInfo[] {
    try {
      const decorators = param.getDecorators?.() || [];
      return decorators.map((decorator: any) => ({
        name: decorator.getName(),
        arguments: decorator.getArguments().map((arg: any) => arg.getText())
      }));
    } catch {
      return [];
    }
  }

  private getVisibility(method: MethodDeclaration): 'public' | 'private' | 'protected' {
    if (method.hasModifier(SyntaxKind.PrivateKeyword)) return 'private';
    if (method.hasModifier(SyntaxKind.ProtectedKeyword)) return 'protected';
    return 'public';
  }

  private getConstructorVisibility(constructor: ConstructorDeclaration): 'public' | 'private' | 'protected' {
    if (constructor.hasModifier(SyntaxKind.PrivateKeyword)) return 'private';
    if (constructor.hasModifier(SyntaxKind.ProtectedKeyword)) return 'protected';
    return 'public';
  }

  private getAccessorVisibility(accessor: GetAccessorDeclaration | SetAccessorDeclaration): 'public' | 'private' | 'protected' {
    if (accessor.hasModifier(SyntaxKind.PrivateKeyword)) return 'private';
    if (accessor.hasModifier(SyntaxKind.ProtectedKeyword)) return 'protected';
    return 'public';
  }

  private getComment(node: any): string | undefined {
    const jsDoc = node.getJsDocs?.();
    if (jsDoc && jsDoc.length > 0) {
      return jsDoc[0].getComment();
    }
    
    const leadingComments = node.getLeadingCommentRanges?.();
    if (leadingComments && leadingComments.length > 0) {
      return leadingComments[0].getText();
    }
    
    return undefined;
  }

  private calculateCyclomaticComplexity(node: any): number {
    // Basic cyclomatic complexity calculation
    // Start with 1 (linear path) and add 1 for each decision point
    let complexity = 1;
    
    try {
      const text = node.getBodyText?.() || node.getText();
      if (!text) return complexity;
      
      // Count decision points
      const decisionKeywords = [
        /\bif\s*\(/g,
        /\belse\s+if\b/g,
        /\bwhile\s*\(/g,
        /\bfor\s*\(/g,
        /\bswitch\s*\(/g,
        /\bcase\s+/g,
        /\bcatch\s*\(/g,
        /&&/g,
        /\|\|/g,
        /\?/g  // ternary operator
      ];
      
      for (const regex of decisionKeywords) {
        const matches = text.match(regex);
        if (matches) {
          complexity += matches.length;
        }
      }
    } catch (error) {
      // If we can't calculate complexity, default to 1
    }
    
    return complexity;
  }

  private analyzeFrameworkSpecificMethod(methodNode: MethodNode, methodDeclaration: any): void {
    const decorators = methodNode.decorators || [];
    const decoratorNames = decorators.map(d => d.name);
    const methodName = methodNode.name;
    
    // HTTP method decorators (NestJS, Angular)
    const httpDecorators = ['Get', 'Post', 'Put', 'Delete', 'Patch', 'Options', 'Head'];
    const httpDecorator = decoratorNames.find(name => httpDecorators.includes(name));
    
    if (httpDecorator) {
      methodNode.isApiEndpoint = true;
      methodNode.httpMethod = httpDecorator.toUpperCase();
      
      // Extract route from decorator argument
      const decorator = decorators.find(d => d.name === httpDecorator);
      if (decorator && decorator.arguments && decorator.arguments.length > 0) {
        methodNode.route = decorator.arguments[0].replace(/['"]/g, '');
      }
    }
    
    // React lifecycle methods
    const reactLifecycleMethods = [
      'componentDidMount', 'componentDidUpdate', 'componentWillUnmount',
      'componentDidCatch', 'getSnapshotBeforeUpdate', 'shouldComponentUpdate'
    ];
    if (reactLifecycleMethods.includes(methodName)) {
      methodNode.isLifecycleMethod = true;
    }
    
    // React event handlers
    if (methodName.startsWith('on') || methodName.startsWith('handle')) {
      methodNode.isEventHandler = true;
    }
    
    // Angular lifecycle methods
    const angularLifecycleMethods = [
      'ngOnInit', 'ngOnDestroy', 'ngOnChanges', 'ngAfterViewInit',
      'ngAfterContentInit', 'ngAfterViewChecked', 'ngAfterContentChecked'
    ];
    if (angularLifecycleMethods.includes(methodName)) {
      methodNode.isLifecycleMethod = true;
    }
    
    // Vue lifecycle methods
    const vueLifecycleMethods = [
      'created', 'mounted', 'updated', 'destroyed', 'beforeCreate',
      'beforeMount', 'beforeUpdate', 'beforeDestroy'
    ];
    if (vueLifecycleMethods.includes(methodName)) {
      methodNode.isLifecycleMethod = true;
    }
  }
}