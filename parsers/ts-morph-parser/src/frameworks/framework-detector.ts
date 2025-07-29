import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

export type Framework = 
  | 'react' 
  | 'angular' 
  | 'vue' 
  | 'nestjs' 
  | 'express' 
  | 'nextjs'
  | 'nuxtjs'
  | 'svelte'
  | 'node'
  | 'typescript'
  | 'unknown';

export interface FrameworkSignature {
  dependencies: string[];
  files: string[];
  patterns: string[];
  score: number;
}

export class FrameworkDetector {
  private frameworks: Record<Framework, FrameworkSignature> = {
    react: {
      dependencies: ['react', '@types/react', 'react-dom', '@types/react-dom'],
      files: ['src/index.tsx', 'src/App.tsx', 'public/index.html'],
      patterns: ['*.tsx', '*.jsx', 'components/**/*'],
      score: 0
    },
    angular: {
      dependencies: ['@angular/core', '@angular/common', '@angular/cli'],
      files: ['angular.json', 'src/main.ts', 'src/app/app.module.ts'],
      patterns: ['*.component.ts', '*.service.ts', '*.module.ts'],
      score: 0
    },
    vue: {
      dependencies: ['vue', '@vue/cli', 'vue-router', 'vuex'],
      files: ['vue.config.js', 'src/main.ts', 'src/App.vue'],
      patterns: ['*.vue', 'components/**/*.vue'],
      score: 0
    },
    nestjs: {
      dependencies: ['@nestjs/core', '@nestjs/common', '@nestjs/platform-express'],
      files: ['nest-cli.json', 'src/main.ts', 'src/app.module.ts'],
      patterns: ['*.controller.ts', '*.service.ts', '*.module.ts', '*.guard.ts'],
      score: 0
    },
    express: {
      dependencies: ['express', '@types/express', 'cors', 'helmet'],
      files: ['server.ts', 'app.ts', 'index.ts'],
      patterns: ['routes/**/*', 'middleware/**/*', 'controllers/**/*'],
      score: 0
    },
    nextjs: {
      dependencies: ['next', 'react', 'react-dom'],
      files: ['next.config.js', 'pages/_app.tsx', 'pages/index.tsx'],
      patterns: ['pages/**/*', 'components/**/*', 'api/**/*'],
      score: 0
    },
    nuxtjs: {
      dependencies: ['nuxt', '@nuxt/typescript-build', 'vue'],
      files: ['nuxt.config.ts', 'pages/index.vue'],
      patterns: ['pages/**/*.vue', 'components/**/*.vue'],
      score: 0
    },
    svelte: {
      dependencies: ['svelte', '@sveltejs/kit', 'vite'],
      files: ['svelte.config.js', 'src/app.html'],
      patterns: ['*.svelte', 'routes/**/*'],
      score: 0
    },
    node: {
      dependencies: ['@types/node', 'typescript', 'ts-node'],
      files: ['package.json', 'tsconfig.json'],
      patterns: ['src/**/*.ts', 'lib/**/*.ts'],
      score: 0
    },
    typescript: {
      dependencies: ['typescript', '@types/node'],
      files: ['tsconfig.json'],
      patterns: ['**/*.ts', '**/*.tsx'],
      score: 0
    },
    unknown: {
      dependencies: [],
      files: [],
      patterns: [],
      score: 0
    }
  };

  async detectFramework(projectPath: string): Promise<Framework> {
    console.log('🔍 Detecting framework...');
    
    // Reset scores
    for (const framework of Object.keys(this.frameworks)) {
      this.frameworks[framework as Framework].score = 0;
    }

    // Check package.json for dependencies
    await this.analyzeDependencies(projectPath);
    
    // Check for framework-specific files
    await this.analyzeFiles(projectPath);
    
    // Check for file patterns
    await this.analyzePatterns(projectPath);
    
    // Find framework with highest score
    const detected = this.getBestMatch();
    
    console.log('📊 Framework detection scores:');
    for (const [name, config] of Object.entries(this.frameworks)) {
      if (config.score > 0) {
        console.log(`   ${name}: ${config.score}`);
      }
    }
    
    console.log(`🎯 Detected framework: ${detected}`);
    return detected;
  }

  private async analyzeDependencies(projectPath: string): Promise<void> {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      const allDeps = {
        ...packageJson.dependencies || {},
        ...packageJson.devDependencies || {},
        ...packageJson.peerDependencies || {}
      };

      for (const [framework, config] of Object.entries(this.frameworks)) {
        for (const dep of config.dependencies) {
          if (allDeps[dep]) {
            config.score += 10; // High weight for dependencies
            console.log(`   ✓ Found ${dep} dependency for ${framework}`);
          }
        }
      }
    } catch (error) {
      console.log('   ⚠ Could not read package.json');
    }
  }

  private async analyzeFiles(projectPath: string): Promise<void> {
    for (const [framework, config] of Object.entries(this.frameworks)) {
      for (const file of config.files) {
        try {
          const filePath = path.join(projectPath, file);
          await fs.access(filePath);
          config.score += 5; // Medium weight for specific files
          console.log(`   ✓ Found ${file} for ${framework}`);
        } catch {
          // File doesn't exist, continue
        }
      }
    }
  }

  private async analyzePatterns(projectPath: string): Promise<void> {
    for (const [framework, config] of Object.entries(this.frameworks)) {
      for (const pattern of config.patterns) {
        try {
          const files = await glob(pattern, { 
            cwd: projectPath,
            ignore: ['node_modules/**', 'dist/**', 'build/**']
          });
          
          if (files.length > 0) {
            // Score based on number of matching files
            const score = Math.min(files.length, 10); // Cap at 10
            config.score += score;
            console.log(`   ✓ Found ${files.length} files matching ${pattern} for ${framework}`);
          }
        } catch (error) {
          console.log(`   ⚠ Error checking pattern ${pattern}: ${error}`);
        }
      }
    }
  }

  private getBestMatch(): Framework {
    let bestFramework: Framework = 'unknown';
    let bestScore = 0;

    for (const [framework, config] of Object.entries(this.frameworks)) {
      if (config.score > bestScore) {
        bestScore = config.score;
        bestFramework = framework as Framework;
      }
    }

    // If score is too low, default to 'typescript' if we have TS files
    if (bestScore < 5 && this.frameworks.typescript.score > 0) {
      return 'typescript';
    }

    // If still no good match, check for Node.js patterns
    if (bestScore < 3 && this.frameworks.node.score > 0) {
      return 'node';
    }

    return bestFramework;
  }

  // Get framework-specific analysis configuration
  getFrameworkConfig(framework: Framework) {
    const configs = {
      react: {
        componentPatterns: ['**/*.tsx', '**/*.jsx'],
        hookPatterns: ['use*.ts', 'use*.tsx'],
        testPatterns: ['**/*.test.tsx', '**/*.spec.tsx'],
        apiPatterns: [],
        decoratorPatterns: []
      },
      angular: {
        componentPatterns: ['**/*.component.ts'],
        servicePatterns: ['**/*.service.ts'],
        modulePatterns: ['**/*.module.ts'],
        testPatterns: ['**/*.spec.ts'],
        decoratorPatterns: ['@Component', '@Injectable', '@NgModule']
      },
      vue: {
        componentPatterns: ['**/*.vue'],
        composablePatterns: ['composables/**/*.ts'],
        testPatterns: ['**/*.spec.ts'],
        apiPatterns: [],
        decoratorPatterns: []
      },
      nestjs: {
        controllerPatterns: ['**/*.controller.ts'],
        servicePatterns: ['**/*.service.ts'],
        modulePatterns: ['**/*.module.ts'],
        guardPatterns: ['**/*.guard.ts'],
        testPatterns: ['**/*.spec.ts'],
        decoratorPatterns: ['@Controller', '@Injectable', '@Module', '@Get', '@Post', '@Put', '@Delete']
      },
      express: {
        routePatterns: ['routes/**/*.ts', 'controllers/**/*.ts'],
        middlewarePatterns: ['middleware/**/*.ts'],
        testPatterns: ['**/*.test.ts', '**/*.spec.ts'],
        apiPatterns: ['api/**/*.ts'],
        decoratorPatterns: []
      },
      nextjs: {
        pagePatterns: ['pages/**/*.tsx', 'app/**/*.tsx'],
        apiPatterns: ['pages/api/**/*.ts', 'app/api/**/*.ts'],
        componentPatterns: ['components/**/*.tsx'],
        testPatterns: ['**/*.test.tsx'],
        decoratorPatterns: []
      },
      nuxtjs: {
        pagePatterns: ['pages/**/*.vue'],
        componentPatterns: ['components/**/*.vue'],
        testPatterns: ['**/*.spec.ts'],
        apiPatterns: ['server/api/**/*.ts'],
        decoratorPatterns: []
      },
      svelte: {
        componentPatterns: ['**/*.svelte'],
        routePatterns: ['src/routes/**/*'],
        testPatterns: ['**/*.test.ts'],
        apiPatterns: [],
        decoratorPatterns: []
      },
      node: {
        modulePatterns: ['**/*.ts'],
        testPatterns: ['**/*.test.ts', '**/*.spec.ts'],
        apiPatterns: [],
        decoratorPatterns: []
      },
      typescript: {
        modulePatterns: ['**/*.ts', '**/*.tsx'],
        testPatterns: ['**/*.test.ts', '**/*.spec.ts'],
        apiPatterns: [],
        decoratorPatterns: []
      },
      unknown: {
        modulePatterns: ['**/*.ts', '**/*.tsx'],
        testPatterns: [],
        apiPatterns: [],
        decoratorPatterns: []
      }
    };

    return configs[framework] || configs.unknown;
  }
}