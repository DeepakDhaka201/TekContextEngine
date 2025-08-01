import { SourceFile, EnumDeclaration, SyntaxKind } from 'ts-morph';
import { ParseResult, EnumNode, EnumConstantInfo, DecoratorInfo } from '../models/parse-result';
import { ParserOptions } from '../parser';
import { generateEnumId, createFullyQualifiedName } from '../utils/id-generator';

export class EnumVisitor {
  constructor(
    private result: ParseResult,
    private options: ParserOptions,
    private codebaseName: string
  ) {}

  visitSourceFile(sourceFile: SourceFile): void {
    const enums = sourceFile.getEnums();
    
    for (const enumDeclaration of enums) {
      this.visitEnum(enumDeclaration, sourceFile);
    }
  }

  private visitEnum(enumDeclaration: EnumDeclaration, sourceFile: SourceFile): void {
    try {
      const name = enumDeclaration.getName();
      const fullyQualifiedName = this.getFullyQualifiedName(enumDeclaration, sourceFile);
      const enumId = generateEnumId(this.codebaseName, fullyQualifiedName);
      
      const enumNode: EnumNode = {
        id: enumId,
        name,
        fullyQualifiedName,
        comment: this.getComment(enumDeclaration) || '',
        visibility: this.getVisibility(enumDeclaration),
        filePath: sourceFile.getFilePath(),
        startLine: enumDeclaration.getStartLineNumber(),
        endLine: enumDeclaration.getEndLineNumber(),
        enumConstants: this.getEnumConstants(enumDeclaration),
        decorators: this.getDecorators(enumDeclaration),
        properties: {}
      };

      this.result.enums.push(enumNode);

      if (this.options.verbose) {
        console.log(`   📋 Enum: ${name} (ID: ${enumId})`);
      }

    } catch (error) {
      console.error(`Error processing enum:`, error);
    }
  }

  private getFullyQualifiedName(enumDeclaration: EnumDeclaration, sourceFile: SourceFile): string {
    const enumName = enumDeclaration.getName();
    const filePath = sourceFile.getFilePath();
    
    return createFullyQualifiedName(filePath, enumName);
  }

  private getComment(enumDeclaration: EnumDeclaration): string | undefined {
    const jsDoc = enumDeclaration.getJsDocs();
    if (jsDoc.length > 0) {
      const comment = jsDoc[0]?.getComment();
      if (typeof comment === 'string') {
        return comment;
      }
    }

    // Try to get leading comments
    const leadingComments = enumDeclaration.getLeadingCommentRanges();
    if (leadingComments.length > 0) {
      return leadingComments[0]?.getText();
    }

    return undefined;
  }

  private getVisibility(enumDeclaration: EnumDeclaration): string {
    // TypeScript enums are always public when exported, package-private otherwise
    return enumDeclaration.isExported() ? 'public' : 'package';
  }

  private getDecorators(enumDeclaration: EnumDeclaration): DecoratorInfo[] {
    // TypeScript enums don't have decorators, but we return empty array for consistency
    return [];
  }

  private getEnumConstants(enumDeclaration: EnumDeclaration): EnumConstantInfo[] {
    const constants: EnumConstantInfo[] = [];
    const members = enumDeclaration.getMembers();
    
    members.forEach((member, index) => {
      const name = member.getName();
      const comment = this.getMemberComment(member);
      
      constants.push({
        name,
        ordinal: index,
        comment: comment || '',
        properties: {}
      });
    });
    
    return constants;
  }

  private getMemberComment(member: any): string | undefined {
    try {
      const jsDoc = member.getJsDocs?.();
      if (jsDoc && jsDoc.length > 0) {
        return jsDoc[0].getComment();
      }
      
      // Try to get leading comments
      const leadingComments = member.getLeadingCommentRanges?.();
      if (leadingComments && leadingComments.length > 0) {
        return leadingComments[0].getText();
      }
    } catch (error) {
      // Ignore errors when getting comments
    }
    
    return undefined;
  }
}
