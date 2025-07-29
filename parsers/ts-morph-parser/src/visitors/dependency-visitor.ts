import { SourceFile, ImportDeclaration, ExportDeclaration } from 'ts-morph';
import { ParseResult, DependencyNode, ImportInfo } from '../models/parse-result';
import { ParserOptions } from '../parser';
import * as fs from 'fs';
import * as path from 'path';

export class DependencyVisitor {
  constructor(
    private result: ParseResult,
    private options: ParserOptions
  ) {}

  visitProject(projectPath: string): void {
    // Analyze package.json dependencies
    this.analyzePackageJson(projectPath);
  }

  visitSourceFile(sourceFile: SourceFile): void {
    // Analyze import statements
    this.analyzeImports(sourceFile);
    
    // Analyze export statements
    this.analyzeExports(sourceFile);
  }

  private analyzePackageJson(projectPath: string): void {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      
      if (!fs.existsSync(packageJsonPath)) {
        return;
      }

      const packageContent = fs.readFileSync(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageContent);

      // Process dependencies
      if (packageJson.dependencies) {
        for (const [name, version] of Object.entries(packageJson.dependencies)) {
          this.result.dependencies.push({
            name,
            version: version as string,
            type: 'production',
            source: 'package.json'
          });
        }
      }

      // Process devDependencies
      if (packageJson.devDependencies) {
        for (const [name, version] of Object.entries(packageJson.devDependencies)) {
          this.result.dependencies.push({
            name,
            version: version as string,
            type: 'development',
            source: 'package.json'
          });
        }
      }

      // Process peerDependencies
      if (packageJson.peerDependencies) {
        for (const [name, version] of Object.entries(packageJson.peerDependencies)) {
          this.result.dependencies.push({
            name,
            version: version as string,
            type: 'peer',
            source: 'package.json'
          });
        }
      }

      // Process optionalDependencies
      if (packageJson.optionalDependencies) {
        for (const [name, version] of Object.entries(packageJson.optionalDependencies)) {
          this.result.dependencies.push({
            name,
            version: version as string,
            type: 'optional',
            source: 'package.json'
          });
        }
      }

      if (this.options.verbose) {
        console.log(`   📦 Analyzed package.json with ${this.result.dependencies.length} dependencies`);
      }

    } catch (error) {
      console.error('Error analyzing package.json:', error);
    }
  }

  private analyzeImports(sourceFile: SourceFile): void {
    const imports = sourceFile.getImportDeclarations();
    
    for (const importDeclaration of imports) {
      try {
        const importInfo = this.createImportInfo(importDeclaration, sourceFile);
        
        // Add to dependencies if it's an external module
        if (this.isExternalModule(importInfo.moduleName)) {
          const existingDep = this.result.dependencies.find(
            dep => dep.name === importInfo.moduleName && dep.source === 'import'
          );
          
          if (!existingDep) {
            this.result.dependencies.push({
              name: importInfo.moduleName,
              version: 'unknown',
              type: 'production',
              source: 'import'
            });
          }
        }
        
      } catch (error) {
        console.error(`Error processing import in ${sourceFile.getFilePath()}:`, error);
      }
    }
  }

  private analyzeExports(sourceFile: SourceFile): void {
    const exports = sourceFile.getExportDeclarations();
    
    for (const exportDeclaration of exports) {
      try {
        // Process re-exports
        const moduleSpecifier = exportDeclaration.getModuleSpecifier();
        if (moduleSpecifier) {
          const moduleName = moduleSpecifier.getLiteralValue();
          
          if (this.isExternalModule(moduleName)) {
            const existingDep = this.result.dependencies.find(
              dep => dep.name === moduleName && dep.source === 'import'
            );
            
            if (!existingDep) {
              this.result.dependencies.push({
                name: moduleName,
                version: 'unknown',
                type: 'production',
                source: 'import'
              });
            }
          }
        }
        
      } catch (error) {
        console.error(`Error processing export in ${sourceFile.getFilePath()}:`, error);
      }
    }
  }

  private createImportInfo(importDeclaration: ImportDeclaration, sourceFile: SourceFile): ImportInfo {
    const moduleSpecifier = importDeclaration.getModuleSpecifier();
    const moduleName = moduleSpecifier.getLiteralValue();
    
    const importClause = importDeclaration.getImportClause();
    let importedNames: string[] = [];
    let isDefaultImport = false;
    let isNamespaceImport = false;

    if (importClause) {
      // Default import
      const defaultImport = importClause.getDefaultImport();
      if (defaultImport) {
        isDefaultImport = true;
        importedNames.push(defaultImport.getText());
      }

      // Named imports
      const namedImports = importClause.getNamedImports();
      if (namedImports) {
        for (const namedImport of namedImports.getElements()) {
          importedNames.push(namedImport.getName());
        }
      }

      // Namespace import
      const namespaceImport = importClause.getNamespaceImport();
      if (namespaceImport) {
        isNamespaceImport = true;
        importedNames.push(namespaceImport.getName());
      }
    }

    return {
      moduleName,
      importedNames,
      isDefaultImport,
      isNamespaceImport,
      filePath: sourceFile.getFilePath()
    };
  }

  private isExternalModule(moduleName: string): boolean {
    // Check if it's a relative import
    if (moduleName.startsWith('./') || moduleName.startsWith('../')) {
      return false;
    }
    
    // Check if it's an absolute path
    if (moduleName.startsWith('/')) {
      return false;
    }
    
    // Check if it's a Node.js built-in module
    const builtinModules = [
      'fs', 'path', 'http', 'https', 'url', 'crypto', 'os', 'util',
      'events', 'stream', 'buffer', 'child_process', 'cluster',
      'dgram', 'dns', 'net', 'readline', 'repl', 'tls', 'tty',
      'vm', 'zlib', 'assert', 'console', 'module', 'process',
      'querystring', 'string_decoder', 'timers', 'v8'
    ];
    
    if (builtinModules.includes(moduleName)) {
      return false;
    }
    
    // It's an external module
    return true;
  }
}