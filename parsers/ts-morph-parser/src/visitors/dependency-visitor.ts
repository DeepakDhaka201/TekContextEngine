import { ParseResult, DependencyNode } from '../models/parse-result';
import { generateDependencyId } from '../utils/id-generator';
import * as fs from 'fs';
import * as path from 'path';

export class DependencyVisitor {
  constructor(
    private result: ParseResult,
    private projectPath: string
  ) {}

  async extractDependencies(): Promise<void> {
    // Analyze package.json dependencies
    this.analyzePackageJson(this.projectPath);
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
          const [groupId, artifactId] = this.parsePackageName(name);
          this.result.dependencies.push({
            id: generateDependencyId(this.result.codebaseName, groupId, artifactId),
            groupId,
            artifactId,
            version: version as string,
            scope: 'compile',
            type: 'npm',
            properties: { source: 'package.json', originalName: name }
          });
        }
      }

      // Process devDependencies
      if (packageJson.devDependencies) {
        for (const [name, version] of Object.entries(packageJson.devDependencies)) {
          const [groupId, artifactId] = this.parsePackageName(name);
          this.result.dependencies.push({
            id: generateDependencyId(this.result.codebaseName, groupId, artifactId),
            groupId,
            artifactId,
            version: version as string,
            scope: 'test',
            type: 'npm',
            properties: { source: 'package.json', originalName: name }
          });
        }
      }

      // Process peerDependencies
      if (packageJson.peerDependencies) {
        for (const [name, version] of Object.entries(packageJson.peerDependencies)) {
          const [groupId, artifactId] = this.parsePackageName(name);
          this.result.dependencies.push({
            id: generateDependencyId(this.result.codebaseName, groupId, artifactId),
            groupId,
            artifactId,
            version: version as string,
            scope: 'provided',
            type: 'npm',
            properties: { source: 'package.json', originalName: name }
          });
        }
      }

      // Process optionalDependencies
      if (packageJson.optionalDependencies) {
        for (const [name, version] of Object.entries(packageJson.optionalDependencies)) {
          const [groupId, artifactId] = this.parsePackageName(name);
          this.result.dependencies.push({
            id: generateDependencyId(this.result.codebaseName, groupId, artifactId),
            groupId,
            artifactId,
            version: version as string,
            scope: 'optional',
            type: 'npm',
            properties: { source: 'package.json', originalName: name }
          });
        }
      }

      console.log(`   📦 Analyzed package.json with ${this.result.dependencies.length} dependencies`);

    } catch (error) {
      console.error('Error analyzing package.json:', error);
    }
  }

  private parsePackageName(packageName: string): [string, string] {
    // For npm packages, we'll use a simple approach:
    // - If scoped (@org/package), use org as groupId and package as artifactId
    // - Otherwise, use 'npm' as groupId and full name as artifactId

    if (packageName.startsWith('@')) {
      const parts = packageName.substring(1).split('/');
      if (parts.length >= 2) {
        return [parts[0] || 'npm', parts.slice(1).join('/') || packageName];
      }
    }

    return ['npm', packageName];
  }
}