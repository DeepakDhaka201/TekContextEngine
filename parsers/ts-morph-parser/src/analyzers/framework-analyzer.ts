import { ParseResult, ComponentNode, ServiceNode, ModuleNode, APIEndpointNode } from '../models/parse-result';
import { ParserOptions } from '../parser';

export class FrameworkAnalyzer {
  constructor(
    private result: ParseResult,
    private options: ParserOptions
  ) {}

  analyzeFramework(): void {
    const framework = this.result.metadata.framework;
    
    if (this.options.verbose) {
      console.log(`   🔧 Analyzing ${framework} framework patterns...`);
    }

    switch (framework) {
      case 'react':
        this.analyzeReact();
        break;
      case 'angular':
        this.analyzeAngular();
        break;
      case 'vue':
        this.analyzeVue();
        break;
      case 'nestjs':
        this.analyzeNestJS();
        break;
      case 'express':
        this.analyzeExpress();
        break;
      case 'nextjs':
        this.analyzeNextJS();
        break;
      default:
        this.analyzeGeneric();
    }

    if (this.options.verbose) {
      console.log(`   ✅ Framework analysis complete`);
    }
  }

  private analyzeReact(): void {
    // Initialize framework-specific collections
    this.result.components = [];

    // Analyze React components
    for (const classNode of this.result.classes) {
      if (classNode.isComponent) {
        const component = this.createReactComponent(classNode);
        this.result.components.push(component);
      }
    }

    // Analyze functional components (functions that return JSX)
    for (const method of this.result.methods) {
      if (this.isReactFunctionalComponent(method)) {
        const component = this.createReactFunctionalComponent(method);
        this.result.components.push(component);
      }
    }

    // Analyze hooks usage
    this.analyzeReactHooks();
  }

  private analyzeAngular(): void {
    this.result.components = [];
    this.result.services = [];
    this.result.modules = [];

    // Analyze Angular components
    for (const classNode of this.result.classes) {
      if (classNode.isComponent) {
        const component = this.createAngularComponent(classNode);
        this.result.components.push(component);
      }
      
      if (classNode.isService) {
        const service = this.createAngularService(classNode);
        this.result.services.push(service);
      }
    }

    // Analyze Angular modules
    this.analyzeAngularModules();
  }

  private analyzeVue(): void {
    this.result.components = [];

    // Analyze Vue components
    for (const classNode of this.result.classes) {
      if (classNode.isComponent) {
        const component = this.createVueComponent(classNode);
        this.result.components.push(component);
      }
    }
  }

  private analyzeNestJS(): void {
    this.result.services = [];
    this.result.modules = [];
    this.result.apiEndpoints = [];

    // Analyze NestJS controllers and services
    for (const classNode of this.result.classes) {
      if (classNode.isController) {
        this.analyzeNestJSController(classNode);
      }
      
      if (classNode.isService) {
        const service = this.createNestJSService(classNode);
        this.result.services.push(service);
      }
    }

    // Analyze NestJS modules
    this.analyzeNestJSModules();
  }

  private analyzeExpress(): void {
    this.result.apiEndpoints = [];

    // Analyze Express routes
    this.analyzeExpressRoutes();
  }

  private analyzeNextJS(): void {
    this.result.apiEndpoints = [];
    this.result.components = [];

    // Analyze Next.js API routes
    this.analyzeNextJSAPIRoutes();
    
    // Analyze Next.js pages (components)
    this.analyzeNextJSPages();
  }

  private analyzeGeneric(): void {
    // Generic analysis for unknown frameworks
    this.result.components = [];
    this.result.services = [];
    
    for (const classNode of this.result.classes) {
      if (classNode.isComponent) {
        const component: ComponentNode = {
          name: classNode.name,
          type: 'class',
          filePath: classNode.filePath,
          framework: 'unknown'
        };
        this.result.components.push(component);
      }
      
      if (classNode.isService) {
        const service: ServiceNode = {
          name: classNode.name,
          type: 'injectable',
          filePath: classNode.filePath,
          methods: this.getClassMethods(classNode.name, classNode.filePath)
        };
        this.result.services.push(service);
      }
    }
  }

  private createReactComponent(classNode: any): ComponentNode {
    const methods = this.getClassMethods(classNode.name, classNode.filePath);
    const lifecycle = methods.filter(m => this.result.methods.find(method => 
      method.name === m && method.isLifecycleMethod
    ));
    const events = methods.filter(m => this.result.methods.find(method => 
      method.name === m && method.isEventHandler
    ));

    return {
      name: classNode.name,
      type: 'class',
      filePath: classNode.filePath,
      lifecycle,
      events,
      framework: 'react'
    };
  }

  private createReactFunctionalComponent(method: any): ComponentNode {
    return {
      name: method.name,
      type: 'functional',
      filePath: method.filePath,
      hooks: this.extractReactHooks(method),
      framework: 'react'
    };
  }

  private createAngularComponent(classNode: any): ComponentNode {
    const methods = this.getClassMethods(classNode.name, classNode.filePath);
    const lifecycle = methods.filter(m => this.result.methods.find(method => 
      method.name === m && method.isLifecycleMethod
    ));

    return {
      name: classNode.name,
      type: 'class',
      filePath: classNode.filePath,
      lifecycle,
      framework: 'angular'
    };
  }

  private createVueComponent(classNode: any): ComponentNode {
    const methods = this.getClassMethods(classNode.name, classNode.filePath);
    const lifecycle = methods.filter(m => this.result.methods.find(method => 
      method.name === m && method.isLifecycleMethod
    ));

    return {
      name: classNode.name,
      type: 'class',
      filePath: classNode.filePath,
      lifecycle,
      framework: 'vue'
    };
  }

  private createNestJSService(classNode: any): ServiceNode {
    const dependencies = this.extractNestJSDependencies(classNode);
    
    return {
      name: classNode.name,
      type: 'injectable',
      filePath: classNode.filePath,
      dependencies,
      methods: this.getClassMethods(classNode.name, classNode.filePath)
    };
  }

  private analyzeNestJSController(classNode: any): void {
    const methods = this.result.methods.filter(m => 
      m.className === classNode.name && m.filePath === classNode.filePath
    );

    for (const method of methods) {
      if (method.isApiEndpoint) {
        const endpoint: APIEndpointNode = {
          httpMethod: method.httpMethod || 'GET',
          path: method.route || `/${method.name}`,
          methodName: method.name,
          className: classNode.name,
          filePath: classNode.filePath,
          parameters: method.parameters,
          returnType: method.returnType,
          decorators: method.decorators
        };
        
        this.result.apiEndpoints = this.result.apiEndpoints || [];
        this.result.apiEndpoints.push(endpoint);
      }
    }
  }

  private analyzeAngularModules(): void {
    // Look for @NgModule decorators
    for (const classNode of this.result.classes) {
      const hasNgModule = classNode.decorators?.some(d => d.name === 'NgModule');
      if (hasNgModule) {
        const module: ModuleNode = {
          name: classNode.name,
          type: 'angular',
          filePath: classNode.filePath,
          exports: [],
          imports: [],
          providers: this.extractAngularProviders(classNode),
          controllers: []
        };
        
        this.result.modules = this.result.modules || [];
        this.result.modules.push(module);
      }
    }
  }

  private analyzeNestJSModules(): void {
    // Look for @Module decorators
    for (const classNode of this.result.classes) {
      const hasModule = classNode.decorators?.some(d => d.name === 'Module');
      if (hasModule) {
        const module: ModuleNode = {
          name: classNode.name,
          type: 'nestjs',
          filePath: classNode.filePath,
          exports: [],
          imports: [],
          providers: this.extractNestJSProviders(classNode),
          controllers: this.extractNestJSControllers(classNode)
        };
        
        this.result.modules = this.result.modules || [];
        this.result.modules.push(module);
      }
    }
  }

  private analyzeReactHooks(): void {
    // Analyze React hooks usage in functional components
    for (const method of this.result.methods) {
      if (this.isReactFunctionalComponent(method)) {
        const hooks = this.extractReactHooks(method);
        // Add hooks information to component
        const component = this.result.components?.find(c => 
          c.name === method.name && c.filePath === method.filePath
        );
        if (component) {
          component.hooks = hooks;
        }
      }
    }
  }

  private analyzeExpressRoutes(): void {
    // Analyze Express route definitions
    for (const method of this.result.methods) {
      if (this.isExpressRoute(method)) {
        const endpoint: APIEndpointNode = {
          httpMethod: this.extractExpressMethod(method),
          path: this.extractExpressPath(method),
          methodName: method.name,
          className: method.className || 'Express',
          filePath: method.filePath,
          parameters: method.parameters,
          returnType: method.returnType
        };
        
        this.result.apiEndpoints = this.result.apiEndpoints || [];
        this.result.apiEndpoints.push(endpoint);
      }
    }
  }

  private analyzeNextJSAPIRoutes(): void {
    // Analyze Next.js API routes in /pages/api/ or /app/api/
    const apiFiles = this.result.files.filter(f => 
      f.path.includes('/api/') && (f.path.includes('/pages/') || f.path.includes('/app/'))
    );

    for (const file of apiFiles) {
      const methods = this.result.methods.filter(m => m.filePath === file.path);
      
      for (const method of methods) {
        if (this.isNextJSAPIHandler(method)) {
          const endpoint: APIEndpointNode = {
            httpMethod: this.extractNextJSMethod(method, file.path),
            path: this.extractNextJSPath(file.path),
            methodName: method.name,
            className: 'NextJS',
            filePath: file.path,
            parameters: method.parameters,
            returnType: method.returnType
          };
          
          this.result.apiEndpoints = this.result.apiEndpoints || [];
          this.result.apiEndpoints.push(endpoint);
        }
      }
    }
  }

  private analyzeNextJSPages(): void {
    // Analyze Next.js pages as components
    const pageFiles = this.result.files.filter(f => 
      f.path.includes('/pages/') && !f.path.includes('/api/')
    );

    for (const file of pageFiles) {
      const methods = this.result.methods.filter(m => m.filePath === file.path);
      const pageComponent = methods.find(m => this.isNextJSPageComponent(m));
      
      if (pageComponent) {
        const component: ComponentNode = {
          name: pageComponent.name,
          type: 'functional',
          filePath: file.path,
          framework: 'nextjs'
        };
        
        this.result.components = this.result.components || [];
        this.result.components.push(component);
      }
    }
  }

  // Helper methods
  private getClassMethods(className: string, filePath: string): string[] {
    return this.result.methods
      .filter(m => m.className === className && m.filePath === filePath)
      .map(m => m.name);
  }

  private isReactFunctionalComponent(method: any): boolean {
    return method.returnType.includes('JSX') || 
           method.returnType.includes('React.ReactElement') ||
           method.returnType.includes('ReactNode');
  }

  private isExpressRoute(method: any): boolean {
    return method.body?.includes('app.') || method.body?.includes('router.');
  }

  private isNextJSAPIHandler(method: any): boolean {
    return method.name === 'default' || method.name === 'handler';
  }

  private isNextJSPageComponent(method: any): boolean {
    return method.name === 'default' && this.isReactFunctionalComponent(method);
  }

  private extractReactHooks(method: any): string[] {
    const hooks: string[] = [];
    const body = method.body || '';
    
    const hookPatterns = [
      /useState/g,
      /useEffect/g,
      /useContext/g,
      /useReducer/g,
      /useCallback/g,
      /useMemo/g,
      /useRef/g,
      /useImperativeHandle/g,
      /useLayoutEffect/g,
      /useDebugValue/g
    ];

    for (const pattern of hookPatterns) {
      const matches = body.match(pattern);
      if (matches) {
        hooks.push(...matches);
      }
    }

    return [...new Set(hooks)]; // Remove duplicates
  }

  private extractNestJSDependencies(classNode: any): string[] {
    // Extract dependencies from constructor parameters with @Inject decorators
    return [];
  }

  private extractAngularProviders(classNode: any): string[] {
    // Extract providers from @NgModule decorator
    return [];
  }

  private extractNestJSProviders(classNode: any): string[] {
    // Extract providers from @Module decorator
    return [];
  }

  private extractNestJSControllers(classNode: any): string[] {
    // Extract controllers from @Module decorator
    return [];
  }

  private extractExpressMethod(method: any): string {
    const body = method.body || '';
    if (body.includes('.get(')) return 'GET';
    if (body.includes('.post(')) return 'POST';
    if (body.includes('.put(')) return 'PUT';
    if (body.includes('.delete(')) return 'DELETE';
    if (body.includes('.patch(')) return 'PATCH';
    return 'GET';
  }

  private extractExpressPath(method: any): string {
    // Extract path from Express route definition
    return '/';
  }

  private extractNextJSMethod(method: any, filePath: string): string {
    // Next.js API routes can handle multiple methods
    return 'GET';
  }

  private extractNextJSPath(filePath: string): string {
    // Convert file path to API route path
    const apiIndex = filePath.indexOf('/api/');
    if (apiIndex === -1) return '/';
    
    let path = filePath.substring(apiIndex + 4);
    path = path.replace(/\.(ts|tsx|js|jsx)$/, '');
    path = path.replace(/\/index$/, '');
    
    return '/' + path;
  }
}