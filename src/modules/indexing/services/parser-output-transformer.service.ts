import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  Language,
  Visibility,
  MethodParameter
} from '../dto';

export interface StandardizedSymbol {
  name: string;
  type: 'class' | 'interface' | 'method' | 'function' | 'field' | 'property' | 'enum' | 'variable';
  visibility?: Visibility;
  isStatic?: boolean;
  isAbstract?: boolean;
  returnType?: string;
  parameters?: MethodParameter[];
  annotations?: string[];
  line?: number;
  column?: number;
  fullyQualifiedName?: string;
  comment?: string;
  cyclomaticComplexity?: number;
}

export interface StandardizedRelationship {
  type: 'extends' | 'implements' | 'uses' | 'calls' | 'imports';
  source: string;
  target: string;
  line?: number;
  properties?: Record<string, any>;
}

export interface StandardizedFile {
  path: string;
  fileName: string;
  packageName?: string;
  language: Language;
  symbols: StandardizedSymbol[];
  imports?: string[];
  exports?: string[];
  relationships: StandardizedRelationship[];
  checksum?: string;
  lineCount?: number;
  fileSize?: number;
  isTestFile?: boolean;
}

export interface StandardizedParserOutput {
  metadata: {
    language: Language;
    totalFiles: number;
    totalSymbols: number;
    parsingDuration: number;
    framework?: string;
    detectedFrameworks?: string[];
    codebaseName?: string;
  };
  files: StandardizedFile[];
}

@Injectable()
export class ParserOutputTransformerService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Transform parser output to standardized format
   */
  transformParserOutput(rawOutput: any, language: string): StandardizedParserOutput {
    this.logger.debug(`[PARSER-TRANSFORMER] Transforming ${language} parser output`);

    switch (language.toLowerCase()) {
      case 'java':
        return this.transformJavaOutput(rawOutput);
      case 'typescript':
        return this.transformTypeScriptOutput(rawOutput);
      default:
        throw new Error(`Unsupported language for transformation: ${language}`);
    }
  }

  /**
   * Transform Java (spoon-parser-v2) output
   */
  private transformJavaOutput(rawOutput: any): StandardizedParserOutput {
    this.logger.log(`[PARSER-TRANSFORMER] Raw Java output structure:`, {
      hasFiles: !!rawOutput.files,
      filesIsArray: Array.isArray(rawOutput.files),
      filesCount: rawOutput.files?.length || 0,
      hasClasses: !!rawOutput.classes,
      classesCount: rawOutput.classes?.length || 0,
      hasMethods: !!rawOutput.methods,
      methodsCount: rawOutput.methods?.length || 0,
      hasInterfaces: !!rawOutput.interfaces,
      interfacesCount: rawOutput.interfaces?.length || 0,
      hasFields: !!rawOutput.fields,
      fieldsCount: rawOutput.fields?.length || 0,
      hasEnums: !!rawOutput.enums,
      enumsCount: rawOutput.enums?.length || 0,
      hasRelationships: !!rawOutput.relationships,
      relationshipsCount: rawOutput.relationships?.length || 0,
      topLevelKeys: Object.keys(rawOutput)
    });

    // Create a map of files to build file-centric structure
    const fileMap = new Map<string, StandardizedFile>();

    // Initialize files from FileNode list
    if (rawOutput.files && Array.isArray(rawOutput.files)) {
      for (const file of rawOutput.files) {
        fileMap.set(file.path, {
          path: file.path,
          fileName: file.fileName,
          packageName: file.packageName || '',
          language: Language.JAVA,
          symbols: [],
          imports: [], // Will be populated from dependencies if available
          exports: [],
          relationships: []
        });
      }
    }

    // Add classes to their respective files
    if (rawOutput.classes && Array.isArray(rawOutput.classes)) {
      for (const cls of rawOutput.classes) {
        const file = fileMap.get(cls.filePath);
        if (file) {
          file.symbols.push({
            name: cls.name,
            type: 'class',
            visibility: cls.visibility?.toLowerCase(),
            isStatic: cls.isStatic,
            isAbstract: cls.isAbstract,
            annotations: cls.decorators?.map((d: any) => d.name) || [],
            line: cls.startLine
          });
        }
      }
    }

    // Add methods to their respective files
    if (rawOutput.methods && Array.isArray(rawOutput.methods)) {
      for (const method of rawOutput.methods) {
        const file = fileMap.get(method.filePath);
        if (file) {
          file.symbols.push({
            name: method.name,
            type: 'method',
            visibility: method.visibility?.toLowerCase(),
            isStatic: method.isStatic,
            isAbstract: method.isAbstract,
            returnType: method.returnType,
            parameters: method.parameters?.map((p: any) => ({
              name: p.name,
              type: p.type
            })) || [],
            annotations: method.decorators?.map((d: any) => d.name) || [],
            line: method.startLine
          });
        }
      }
    }

    // Add interfaces to their respective files
    if (rawOutput.interfaces && Array.isArray(rawOutput.interfaces)) {
      for (const iface of rawOutput.interfaces) {
        const file = fileMap.get(iface.filePath);
        if (file) {
          file.symbols.push({
            name: iface.name,
            type: 'interface',
            visibility: iface.visibility?.toLowerCase() || 'public',
            annotations: iface.decorators?.map((d: any) => d.name) || [],
            line: iface.startLine
          });
        }
      }
    }

    // Add fields to their respective files
    if (rawOutput.fields && Array.isArray(rawOutput.fields)) {
      for (const field of rawOutput.fields) {
        // Fields don't have filePath directly, we need to find the class they belong to
        // For now, we'll skip fields or try to match by class name if available
        // This is a limitation of the current structure
        this.logger.debug(`[PARSER-TRANSFORMER] Skipping field ${field.name} - no filePath available`);
      }
    }

    // Add enums to their respective files
    if (rawOutput.enums && Array.isArray(rawOutput.enums)) {
      for (const enumNode of rawOutput.enums) {
        const file = fileMap.get(enumNode.filePath);
        if (file) {
          file.symbols.push({
            name: enumNode.name,
            type: 'enum',
            visibility: enumNode.visibility?.toLowerCase() || 'public',
            annotations: enumNode.decorators?.map((d: any) => d.name) || [],
            line: enumNode.startLine
          });
        }
      }
    }

    // Add relationships to their respective files
    if (rawOutput.relationships && Array.isArray(rawOutput.relationships)) {
      for (const rel of rawOutput.relationships) {
        // Relationships might not have a specific file, so we'll try to find the source file
        // This is a best-effort approach
        if (rel.sourceFilePath) {
          const file = fileMap.get(rel.sourceFilePath);
          if (file) {
            file.relationships.push({
              type: rel.type,
              source: rel.source,
              target: rel.target,
              line: rel.line
            });
          }
        }
      }
    }

    const files = Array.from(fileMap.values());

    return {
      metadata: {
        language: Language.JAVA,
        totalFiles: files.length,
        totalSymbols: files.reduce((sum, file) => sum + file.symbols.length, 0),
        parsingDuration: rawOutput.metadata?.parsingDurationMs || 0,
        framework: rawOutput.metadata?.framework,
        detectedFrameworks: rawOutput.metadata?.detectedFrameworks,
        codebaseName: rawOutput.codebaseName
      },
      files
    };
  }

  /**
   * Transform TypeScript (ts-morph-parser) output
   */
  private transformTypeScriptOutput(rawOutput: any): StandardizedParserOutput {
    this.logger.log(`[PARSER-TRANSFORMER] Raw TypeScript output structure:`, {
      hasFiles: !!rawOutput.files,
      filesIsArray: Array.isArray(rawOutput.files),
      filesCount: rawOutput.files?.length || 0,
      hasClasses: !!rawOutput.classes,
      classesCount: rawOutput.classes?.length || 0,
      hasMethods: !!rawOutput.methods,
      methodsCount: rawOutput.methods?.length || 0,
      hasInterfaces: !!rawOutput.interfaces,
      interfacesCount: rawOutput.interfaces?.length || 0,
      hasFields: !!rawOutput.fields,
      fieldsCount: rawOutput.fields?.length || 0,
      hasEnums: !!rawOutput.enums,
      enumsCount: rawOutput.enums?.length || 0,
      hasRelationships: !!rawOutput.relationships,
      relationshipsCount: rawOutput.relationships?.length || 0,
      topLevelKeys: Object.keys(rawOutput)
    });

    // Create a map of files to build file-centric structure
    const fileMap = new Map<string, StandardizedFile>();

    // Initialize files from FileNode list
    if (rawOutput.files && Array.isArray(rawOutput.files)) {
      for (const file of rawOutput.files) {
        // Detect language from file extension or metadata
        let detectedLanguage = Language.TYPESCRIPT; // default
        if (file.fileExtension) {
          switch (file.fileExtension.toLowerCase()) {
            case '.java':
            case 'java':
              detectedLanguage = Language.JAVA;
              break;
            case '.ts':
            case '.tsx':
            case 'ts':
            case 'tsx':
              detectedLanguage = Language.TYPESCRIPT;
              break;
            case '.js':
            case '.jsx':
            case 'js':
            case 'jsx':
              detectedLanguage = Language.JAVASCRIPT;
              break;
            default:
              // Try to detect from metadata if available
              if (rawOutput.metadata?.detectedFrameworks?.includes('java')) {
                detectedLanguage = Language.JAVA;
              }
              break;
          }
        }

        fileMap.set(file.path, {
          path: file.path,
          fileName: file.fileName,
          packageName: file.packageName || '',
          language: detectedLanguage,
          symbols: [],
          imports: [], // Will be populated from dependencies if available
          exports: [],
          relationships: []
        });
      }
    }

    // Add classes to their respective files
    if (rawOutput.classes && Array.isArray(rawOutput.classes)) {
      for (const cls of rawOutput.classes) {
        const file = fileMap.get(cls.filePath);
        if (file) {
          file.symbols.push({
            name: cls.name,
            type: 'class',
            visibility: cls.visibility?.toLowerCase() || 'public',
            isStatic: cls.isStatic,
            isAbstract: cls.isAbstract,
            annotations: cls.decorators?.map((d: any) => d.name) || [],
            line: cls.startLine
          });
        }
      }
    }

    // Add methods to their respective files
    if (rawOutput.methods && Array.isArray(rawOutput.methods)) {
      for (const method of rawOutput.methods) {
        const file = fileMap.get(method.filePath);
        if (file) {
          file.symbols.push({
            name: method.name,
            type: 'method',
            visibility: method.visibility?.toLowerCase() || 'public',
            isStatic: method.isStatic,
            isAbstract: method.isAbstract,
            returnType: method.returnType,
            parameters: method.parameters?.map((p: any) => ({
              name: p.name,
              type: p.type
            })) || [],
            annotations: method.decorators?.map((d: any) => d.name) || [],
            line: method.startLine
          });
        }
      }
    }

    // Add interfaces to their respective files
    if (rawOutput.interfaces && Array.isArray(rawOutput.interfaces)) {
      for (const iface of rawOutput.interfaces) {
        const file = fileMap.get(iface.filePath);
        if (file) {
          file.symbols.push({
            name: iface.name,
            type: 'interface',
            visibility: Visibility.PUBLIC,
            annotations: iface.decorators?.map((d: any) => d.name) || [],
            line: iface.startLine
          });
        }
      }
    }

    // Add fields to their respective files
    if (rawOutput.fields && Array.isArray(rawOutput.fields)) {
      for (const field of rawOutput.fields) {
        const file = fileMap.get(field.filePath);
        if (file) {
          file.symbols.push({
            name: field.name,
            type: 'field',
            visibility: field.visibility?.toLowerCase() || 'public',
            isStatic: field.isStatic,
            returnType: field.type,
            annotations: field.decorators?.map((d: any) => d.name) || [],
            line: field.startLine
          });
        }
      }
    }

    // Add enums to their respective files
    if (rawOutput.enums && Array.isArray(rawOutput.enums)) {
      for (const enumNode of rawOutput.enums) {
        const file = fileMap.get(enumNode.filePath);
        if (file) {
          file.symbols.push({
            name: enumNode.name,
            type: 'enum',
            visibility: enumNode.visibility?.toLowerCase() || 'public',
            annotations: enumNode.decorators?.map((d: any) => d.name) || [],
            line: enumNode.startLine
          });
        }
      }
    }

    // Add relationships to their respective files
    if (rawOutput.relationships && Array.isArray(rawOutput.relationships)) {
      for (const rel of rawOutput.relationships) {
        // For spoon-v2, relationships have sourceId and targetId
        // We need to extract the file path from the sourceId to associate with the correct file
        if (rel.sourceId && rel.targetId) {
          // Try to find the source file by looking for classes/interfaces/methods in files
          let sourceFile = null;

          // Look through all files to find where the source entity is defined
          for (const [filePath, file] of fileMap.entries()) {
            const hasSourceEntity = file.symbols.some(symbol => {
              const symbolId = this.generateSymbolIdFromSpoonId(rel.sourceId, symbol);
              return symbolId === rel.sourceId || rel.sourceId.includes(symbol.name);
            });

            if (hasSourceEntity) {
              sourceFile = file;
              break;
            }
          }

          if (sourceFile) {
            sourceFile.relationships.push({
              type: rel.type.toLowerCase() as any,
              source: rel.sourceId,
              target: rel.targetId,
              properties: rel.properties
            });
          }
        }
      }
    }

    const files = Array.from(fileMap.values());

    // Determine the primary language from the files
    const languageCounts = new Map<Language, number>();
    files.forEach(file => {
      const count = languageCounts.get(file.language) || 0;
      languageCounts.set(file.language, count + 1);
    });

    // Get the most common language
    let primaryLanguage = Language.TYPESCRIPT;
    let maxCount = 0;
    for (const [lang, count] of languageCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        primaryLanguage = lang;
      }
    }

    return {
      metadata: {
        language: primaryLanguage,
        totalFiles: files.length,
        totalSymbols: files.reduce((sum, file) => sum + file.symbols.length, 0),
        parsingDuration: rawOutput.metadata?.parsingDurationMs || 0,
        framework: rawOutput.metadata?.framework,
        detectedFrameworks: rawOutput.metadata?.detectedFrameworks,
        codebaseName: rawOutput.codebaseName
      },
      files
    };
  }

  /**
   * Generate a symbol ID that matches the spoon parser format
   */
  private generateSymbolIdFromSpoonId(spoonId: string, symbol: StandardizedSymbol): string {
    // Spoon IDs are in format: "codebase:type:fullyQualifiedName"
    // e.g., "comprehensive-test-project:class:com.testproject.BaseEntity"
    const parts = spoonId.split(':');
    if (parts.length >= 3) {
      const codebaseName = parts[0];
      const entityType = parts[1];
      const fullyQualifiedName = parts.slice(2).join(':');

      // Check if this symbol matches
      if (fullyQualifiedName.endsWith(symbol.name)) {
        return spoonId;
      }
    }
    return '';
  }
}
