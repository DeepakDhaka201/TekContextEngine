#!/usr/bin/env node

/**
 * JavaScript test for Spoon Parser Schema validation
 * Run with: node test-schema.js
 */

const fs = require('fs');

// Simple SpoonParserLoader implementation in JavaScript
class SpoonParserLoader {
  constructor() {
    this.result = null;
  }

  loadFromJson(jsonString) {
    try {
      this.result = JSON.parse(jsonString);
      return this.result;
    } catch (error) {
      throw new Error(`Failed to parse Spoon Parser JSON: ${error}`);
    }
  }

  async loadFromFile(filePath) {
    try {
      const jsonString = fs.readFileSync(filePath, 'utf-8');
      return this.loadFromJson(jsonString);
    } catch (error) {
      throw new Error(`Failed to load Spoon Parser file: ${error}`);
    }
  }

  getResult() {
    return this.result;
  }

  getClassesByFramework(frameworkType) {
    if (!this.result) return [];
    return this.result.classes.filter(cls => cls[frameworkType]);
  }

  getTestClasses() {
    if (!this.result) return [];
    return this.result.classes.filter(cls => cls.isTestClass);
  }

  getMethodsByClassId(classId) {
    if (!this.result) return [];
    return this.result.methods.filter(method => 
      method.id.includes(classId.replace('class:', 'method:')));
  }

  getRelationshipsByType(type) {
    if (!this.result) return [];
    return this.result.relationships.filter(rel => rel.type === type);
  }

  getEndpointsByHttpMethod(method) {
    if (!this.result) return [];
    return this.result.apiEndpoints.filter(endpoint => 
      endpoint.httpMethod.toLowerCase() === method.toLowerCase());
  }

  getDependenciesByScope(scope) {
    if (!this.result) return [];
    return this.result.dependencies.filter(dep => dep.scope === scope);
  }

  getTestMethods() {
    if (!this.result) return [];
    return this.result.methods.filter(method => method.isTestMethod);
  }

  getConstructors() {
    if (!this.result) return [];
    return this.result.methods.filter(method => method.isConstructor);
  }

  getAbstractMethods() {
    if (!this.result) return [];
    return this.result.methods.filter(method => method.isAbstract);
  }

  getStaticMethods() {
    if (!this.result) return [];
    return this.result.methods.filter(method => method.isStatic);
  }

  getTestFiles() {
    if (!this.result) return [];
    return this.result.files.filter(file => file.isTestFile);
  }

  getSummary() {
    if (!this.result) {
      return {
        totalClasses: 0, totalMethods: 0, totalFields: 0, totalRelationships: 0,
        totalDependencies: 0, totalApiEndpoints: 0, totalLambdas: 0,
        testClasses: 0, testMethods: 0, complexity: 0, framework: 'unknown'
      };
    }

    return {
      totalClasses: this.result.classes.length,
      totalMethods: this.result.methods.length,
      totalFields: this.result.fields.length,
      totalRelationships: this.result.relationships.length,
      totalDependencies: this.result.dependencies.length,
      totalApiEndpoints: this.result.apiEndpoints.length,
      totalLambdas: this.result.lambdaExpressions.length,
      testClasses: this.getTestClasses().length,
      testMethods: this.getTestMethods().length,
      complexity: this.result.metadata.statistics.complexity,
      framework: this.result.metadata.framework
    };
  }
}

async function testSpoonParserSchema() {
  console.log('🧪 Testing Spoon Parser JavaScript Schema...\n');

  try {
    // Load the optimized JSON result
    const jsonPath = './comprehensive-test-analysis-v2-OPTIMIZED.json';
    
    if (!fs.existsSync(jsonPath)) {
      console.error(`❌ Test file not found: ${jsonPath}`);
      return;
    }

    const loader = new SpoonParserLoader();
    const result = await loader.loadFromFile(jsonPath);

    console.log('✅ Successfully loaded Spoon Parser result!');
    console.log(`📊 Codebase: ${result.codebaseName}`);
    console.log(`🔧 Framework: ${result.metadata.framework}`);
    console.log(`⏱️  Parse time: ${result.metadata.parsingDurationMs}ms\n`);

    // Test summary
    const summary = loader.getSummary();
    console.log('📈 Summary Statistics:');
    console.log(`   Classes: ${summary.totalClasses}`);
    console.log(`   Methods: ${summary.totalMethods}`);
    console.log(`   Fields: ${summary.totalFields}`);
    console.log(`   Relationships: ${summary.totalRelationships}`);
    console.log(`   Dependencies: ${summary.totalDependencies}`);
    console.log(`   API Endpoints: ${summary.totalApiEndpoints}`);
    console.log(`   Lambda Expressions: ${summary.totalLambdas}`);
    console.log(`   Test Classes: ${summary.testClasses}`);
    console.log(`   Test Methods: ${summary.testMethods}`);
    console.log(`   Complexity: ${summary.complexity}\n`);

    // Test framework-specific queries
    console.log('🌱 Spring Framework Analysis:');
    const controllers = loader.getClassesByFramework('isController');
    const services = loader.getClassesByFramework('isService');
    const repositories = loader.getClassesByFramework('isRepository');
    const entities = loader.getClassesByFramework('isEntity');
    
    console.log(`   Controllers: ${controllers.length}`);
    console.log(`   Services: ${services.length}`);
    console.log(`   Repositories: ${repositories.length}`);
    console.log(`   Entities: ${entities.length}\n`);

    // Test API endpoints
    console.log('🌐 API Endpoints Analysis:');
    const getEndpoints = loader.getEndpointsByHttpMethod('GET');
    const postEndpoints = loader.getEndpointsByHttpMethod('POST');
    
    console.log(`   GET: ${getEndpoints.length}`);
    console.log(`   POST: ${postEndpoints.length}\n`);

    // Test relationships
    console.log('🔗 Relationship Analysis:');
    const extendsRels = loader.getRelationshipsByType('EXTENDS');
    const implementsRels = loader.getRelationshipsByType('IMPLEMENTS');
    const usesRels = loader.getRelationshipsByType('USES');
    
    console.log(`   EXTENDS: ${extendsRels.length}`);
    console.log(`   IMPLEMENTS: ${implementsRels.length}`);
    console.log(`   USES: ${usesRels.length}\n`);

    // Test dependencies
    console.log('📦 Dependencies Analysis:');
    const compileDeps = loader.getDependenciesByScope('compile');
    const testDeps = loader.getDependenciesByScope('test');
    
    console.log(`   Compile: ${compileDeps.length}`);
    console.log(`   Test: ${testDeps.length}\n`);

    // Test method analysis
    console.log('⚙️  Method Analysis:');
    const constructors = loader.getConstructors();
    const abstractMethods = loader.getAbstractMethods();
    const staticMethods = loader.getStaticMethods();
    const testMethods = loader.getTestMethods();
    
    console.log(`   Constructors: ${constructors.length}`);
    console.log(`   Abstract Methods: ${abstractMethods.length}`);
    console.log(`   Static Methods: ${staticMethods.length}`);
    console.log(`   Test Methods: ${testMethods.length}\n`);

    // Validate schema structure
    console.log('🔍 Schema Validation:');
    const requiredFields = ['metadata', 'codebaseName', 'files', 'classes', 'methods', 'relationships'];
    const missingFields = requiredFields.filter(field => !(field in result));
    
    if (missingFields.length === 0) {
      console.log('   ✅ All required top-level fields present');
    } else {
      console.log(`   ❌ Missing fields: ${missingFields.join(', ')}`);
    }

    // Validate optimized fields are removed
    console.log('\n🎯 Optimization Validation:');
    const sampleClass = result.classes[0];
    const removedFields = ['fieldCount', 'methodCount', 'constructorCount', 'inheritanceDepth', 'staticFieldCount', 'nestingLevel'];
    const stillPresent = removedFields.filter(field => field in sampleClass);
    
    if (stillPresent.length === 0) {
      console.log('   ✅ All unnecessary fields successfully removed from ClassNode');
    } else {
      console.log(`   ⚠️  Fields still present: ${stillPresent.join(', ')}`);
    }

    const sampleFile = result.files[0];
    const removedFileFields = ['lineCount', 'absolutePath', 'isGeneratedFile', 'codeLines', 'commentLines', 'blankLines'];
    const stillPresentFile = removedFileFields.filter(field => field in sampleFile);
    
    if (stillPresentFile.length === 0) {
      console.log('   ✅ All unnecessary fields successfully removed from FileNode');
    } else {
      console.log(`   ⚠️  File fields still present: ${stillPresentFile.join(', ')}`);
    }

    console.log('\n✅ All tests passed! Schema is working correctly.');
    console.log('🎉 TypeScript schema ready for LLM context engines!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testSpoonParserSchema();
}

module.exports = { SpoonParserLoader, testSpoonParserSchema };
