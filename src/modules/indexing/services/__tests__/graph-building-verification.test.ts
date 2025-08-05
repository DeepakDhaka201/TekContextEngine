import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { GraphService } from '../graph.service';
import { Neo4jService } from '../neo4j.service';
import { ParserOutputTransformerService, Language } from '../parser-output-transformer.service';
import { TekProject, Codebase } from '@/entities';

describe('Graph Building Verification', () => {
  let graphService: GraphService;
  let transformerService: ParserOutputTransformerService;
  let neo4jService: Neo4jService;

  const mockLogger = {
    log: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  const mockNeo4jService = {
    connect: jest.fn(),
    createConstraintsAndIndexes: jest.fn(),
    createOrUpdateProject: jest.fn(),
    createOrUpdateCodebase: jest.fn(),
    executeBatch: jest.fn().mockResolvedValue({
      nodesCreated: 10,
      nodesUpdated: 5,
      relationshipsCreated: 8,
      relationshipsUpdated: 2
    }),
    deleteFilesFromCodebase: jest.fn()
  };

  const mockProjectRepository = {
    findOne: jest.fn()
  };

  const mockCodebaseRepository = {
    findOne: jest.fn().mockResolvedValue({
      id: 'test-codebase',
      name: 'Test Codebase',
      language: 'java',
      gitlabUrl: 'https://gitlab.com/test',
      lastSyncCommit: 'abc123',
      project: {
        id: 'test-project',
        name: 'Test Project'
      }
    })
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GraphService,
        ParserOutputTransformerService,
        {
          provide: Neo4jService,
          useValue: mockNeo4jService
        },
        {
          provide: getRepositoryToken(TekProject),
          useValue: mockProjectRepository
        },
        {
          provide: getRepositoryToken(Codebase),
          useValue: mockCodebaseRepository
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger
        }
      ]
    }).compile();

    graphService = module.get<GraphService>(GraphService);
    transformerService = module.get<ParserOutputTransformerService>(ParserOutputTransformerService);
    neo4jService = module.get<Neo4jService>(Neo4jService);
  });

  describe('Spoon-v2 Parser Output Processing', () => {
    it('should correctly transform spoon-v2 output structure', () => {
      // Sample spoon-v2 output structure
      const spoonV2Output = {
        metadata: {
          codebaseName: 'test-project',
          version: '2.0.0',
          parserVersion: 'spoon-parser-v2',
          parseTime: '2025-07-29T22:32:45.848571Z',
          parsingDurationMs: 1709,
          framework: 'spring-boot',
          detectedFrameworks: ['junit', 'java', 'spring-boot'],
          statistics: {
            totalFiles: 5,
            totalClasses: 10,
            totalMethods: 50
          }
        },
        codebaseName: 'test-project',
        files: [
          {
            path: 'src/main/java/com/example/User.java',
            fileName: 'User.java',
            packageName: 'com.example',
            fileExtension: 'java',
            fileSize: 1024,
            checksum: 'abc123',
            lastModified: 1234567890,
            isTestFile: false
          }
        ],
        classes: [
          {
            id: 'test-project:class:com.example.User',
            name: 'User',
            fullyQualifiedName: 'com.example.User',
            filePath: 'src/main/java/com/example/User.java',
            startLine: 10,
            visibility: 'public',
            isAbstract: false,
            isStatic: false
          }
        ],
        methods: [
          {
            id: 'test-project:method:com.example.User.getName()',
            name: 'getName',
            signature: 'getName()',
            returnType: 'String',
            filePath: 'src/main/java/com/example/User.java',
            startLine: 15,
            visibility: 'public',
            isStatic: false,
            isAbstract: false
          }
        ],
        interfaces: [],
        enums: [],
        fields: [],
        dependencies: [],
        relationships: [
          {
            id: 'rel:EXTENDS:test-project_class_com.example.User:test-project_class_com.example.BaseEntity',
            type: 'EXTENDS',
            sourceType: 'class',
            sourceId: 'test-project:class:com.example.User',
            targetType: 'class',
            targetId: 'test-project:class:com.example.BaseEntity',
            properties: {}
          }
        ],
        apiEndpoints: [],
        lambdaExpressions: [],
        methodReferences: [],
        testCases: [],
        documents: []
      };

      const result = transformerService.transformSpoonV2Output(spoonV2Output);

      // Verify the transformation
      expect(result.metadata.language).toBe(Language.JAVA);
      expect(result.metadata.totalFiles).toBe(1);
      expect(result.metadata.framework).toBe('spring-boot');
      expect(result.files).toHaveLength(1);

      const file = result.files[0];
      expect(file.language).toBe(Language.JAVA);
      expect(file.symbols).toHaveLength(2); // 1 class + 1 method
      expect(file.relationships).toHaveLength(1);

      // Verify class symbol
      const classSymbol = file.symbols.find(s => s.type === 'class');
      expect(classSymbol).toBeDefined();
      expect(classSymbol!.name).toBe('User');

      // Verify method symbol
      const methodSymbol = file.symbols.find(s => s.type === 'method');
      expect(methodSymbol).toBeDefined();
      expect(methodSymbol!.name).toBe('getName');

      // Verify relationship
      const relationship = file.relationships[0];
      expect(relationship.type).toBe('extends');
      expect(relationship.source).toBe('test-project:class:com.example.User');
      expect(relationship.target).toBe('test-project:class:com.example.BaseEntity');
    });

    it('should handle missing relationships gracefully', () => {
      const spoonV2Output = {
        metadata: {
          codebaseName: 'test-project',
          parsingDurationMs: 100,
          framework: 'java'
        },
        codebaseName: 'test-project',
        files: [
          {
            path: 'src/main/java/com/example/Simple.java',
            fileName: 'Simple.java',
            packageName: 'com.example',
            fileExtension: 'java'
          }
        ],
        classes: [],
        methods: [],
        interfaces: [],
        enums: [],
        fields: [],
        dependencies: [],
        relationships: [], // Empty relationships
        apiEndpoints: [],
        lambdaExpressions: [],
        methodReferences: [],
        testCases: [],
        documents: []
      };

      const result = transformerService.transformSpoonV2Output(spoonV2Output);

      expect(result.files).toHaveLength(1);
      expect(result.files[0].relationships).toHaveLength(0);
      expect(result.files[0].symbols).toHaveLength(0);
    });
  });

  describe('Graph Service Relationship Processing', () => {
    it('should extract entity names from spoon IDs correctly', () => {
      // Access private method for testing
      const extractEntityName = (graphService as any).extractEntityNameFromSpoonId.bind(graphService);
      const extractFullyQualifiedName = (graphService as any).extractFullyQualifiedNameFromSpoonId.bind(graphService);

      // Test entity name extraction
      expect(extractEntityName('test-project:class:com.example.User')).toBe('User');
      expect(extractEntityName('test-project:method:com.example.User.getName()')).toBe('getName()');
      expect(extractEntityName('test-project:interface:com.example.Repository')).toBe('Repository');
      expect(extractEntityName('')).toBeNull();
      expect(extractEntityName('invalid-format')).toBeNull();

      // Test fully qualified name extraction
      expect(extractFullyQualifiedName('test-project:class:com.example.User')).toBe('com.example.User');
      expect(extractFullyQualifiedName('test-project:method:com.example.User.getName()')).toBe('com.example.User.getName()');
      expect(extractFullyQualifiedName('')).toBeNull();
    });

    it('should process batch with relationships correctly', async () => {
      const files = [
        {
          path: 'src/main/java/com/example/User.java',
          fileName: 'User.java',
          packageName: 'com.example',
          language: Language.JAVA,
          symbols: [
            {
              name: 'User',
              type: 'class' as const,
              visibility: 'public' as const,
              line: 10
            }
          ],
          imports: [],
          exports: [],
          relationships: [
            {
              type: 'extends' as const,
              source: 'test-project:class:com.example.User',
              target: 'test-project:class:com.example.BaseEntity'
            }
          ]
        }
      ];

      const config = {
        url: 'bolt://localhost:7687',
        username: 'neo4j',
        password: 'password',
        database: 'neo4j',
        batchSize: 100
      };

      const result = await graphService.updateCodebaseGraph('test-codebase', files, config);

      expect(mockNeo4jService.connect).toHaveBeenCalledWith(config);
      expect(mockNeo4jService.executeBatch).toHaveBeenCalled();
      expect(result.nodesCreated).toBe(10);
      expect(result.relationshipsCreated).toBe(8);

      // Verify that the batch execution was called with correct queries
      const batchCalls = mockNeo4jService.executeBatch.mock.calls;
      expect(batchCalls).toHaveLength(1);
      
      const queries = batchCalls[0][0];
      expect(queries).toEqual(expect.arrayContaining([
        expect.objectContaining({
          query: expect.stringContaining('MERGE (source)-[:EXTENDS]->(target)')
        })
      ]));
    });
  });

  describe('Language Detection', () => {
    it('should detect Java language from file extensions', () => {
      const spoonV2Output = {
        metadata: {
          codebaseName: 'test-project',
          detectedFrameworks: ['java']
        },
        codebaseName: 'test-project',
        files: [
          {
            path: 'src/main/java/com/example/User.java',
            fileName: 'User.java',
            packageName: 'com.example',
            fileExtension: 'java'
          }
        ],
        classes: [],
        methods: [],
        interfaces: [],
        enums: [],
        fields: [],
        dependencies: [],
        relationships: [],
        apiEndpoints: [],
        lambdaExpressions: [],
        methodReferences: [],
        testCases: [],
        documents: []
      };

      const result = transformerService.transformSpoonV2Output(spoonV2Output);

      expect(result.metadata.language).toBe(Language.JAVA);
      expect(result.files[0].language).toBe(Language.JAVA);
    });

    it('should detect TypeScript language from file extensions', () => {
      const spoonV2Output = {
        metadata: {
          codebaseName: 'test-project'
        },
        codebaseName: 'test-project',
        files: [
          {
            path: 'src/components/User.tsx',
            fileName: 'User.tsx',
            packageName: 'src.components',
            fileExtension: 'tsx'
          }
        ],
        classes: [],
        methods: [],
        interfaces: [],
        enums: [],
        fields: [],
        dependencies: [],
        relationships: [],
        apiEndpoints: [],
        lambdaExpressions: [],
        methodReferences: [],
        testCases: [],
        documents: []
      };

      const result = transformerService.transformSpoonV2Output(spoonV2Output);

      expect(result.metadata.language).toBe(Language.TYPESCRIPT);
      expect(result.files[0].language).toBe(Language.TYPESCRIPT);
    });
  });
});
