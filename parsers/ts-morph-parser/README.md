# TypeScript Parser for Neo4j Knowledge Graphs

A powerful TypeScript AST parser built with ts-morph that extracts code structure and generates Neo4j-compatible JSON for building knowledge graphs. The parser is framework-aware and can detect and analyze patterns specific to React, Angular, Vue, NestJS, Express, and Next.js.

## Features

- **Framework Detection**: Automatically detects and analyzes framework-specific patterns
- **Comprehensive AST Analysis**: Extracts files, classes, interfaces, methods, dependencies, and relationships
- **Neo4j Compatible**: Generates JSON output ready for Neo4j import
- **Docker Support**: Containerized for easy deployment and integration
- **Framework-Specific Analysis**: Deep analysis of components, services, API endpoints, and more

## Supported Frameworks

- **React**: Components, hooks, lifecycle methods, props interfaces
- **Angular**: Components, services, modules, dependency injection
- **Vue**: Components, lifecycle methods, reactive properties
- **NestJS**: Controllers, services, modules, decorators, API endpoints
- **Express**: Routes, middleware, API endpoints
- **Next.js**: Pages, API routes, components
- **Generic TypeScript**: Classes, interfaces, functions, modules

## Usage

### Docker (Recommended)

```bash
# Build the Docker image
docker build -t ts-morph-parser .

# Parse a TypeScript project
docker run --rm \
  -v /path/to/your/project:/input \
  -v /path/to/output:/output \
  ts-morph-parser /input /output/result.json --framework react --verbose
```

### Local Installation

```bash
# Install dependencies
npm install

# Build the parser
npm run build

# Parse a project
npm run start /path/to/project output.json --framework nestjs
```

### Command Line Options

```bash
ts-morph-parser <input-directory> <output-file> [options]

Options:
  -f, --framework <framework>    Force framework detection (react, angular, vue, nestjs, express, nextjs)
  -v, --verbose                  Enable verbose logging
  --include-node-modules         Include node_modules in analysis
  --max-file-size <size>         Maximum file size to process in KB (default: 500)
  -h, --help                     Display help
```

## Output Format

The parser generates a JSON file containing:

### Nodes
- **Files**: Source file metadata
- **Classes**: Class definitions with framework-specific properties
- **Interfaces**: Interface definitions and props detection
- **Methods**: Function/method analysis with complexity metrics
- **Dependencies**: Package and import dependencies
- **Components**: Framework-specific component analysis
- **Services**: Service and provider analysis
- **API Endpoints**: REST API endpoint extraction

### Relationships
- **CONTAINS**: File-to-class, class-to-method relationships
- **EXTENDS**: Inheritance relationships
- **IMPLEMENTS**: Interface implementation
- **DEPENDS_ON**: Dependency relationships
- **EXPOSES_ENDPOINT**: Controller-to-endpoint relationships
- **USES_PROPS**: Component-to-props relationships

### Metadata
- Framework information
- Parse statistics
- Complexity metrics

## Framework-Specific Features

### React
- Functional and class component detection
- Hook usage analysis
- Props interface identification
- Event handler detection
- Lifecycle method analysis

### Angular
- Component and service detection
- Dependency injection analysis
- Module structure mapping
- Lifecycle hook identification
- Decorator analysis

### NestJS
- Controller and service mapping
- API endpoint extraction
- Module dependency analysis
- Decorator-based routing
- Injectable service detection

### Express
- Route handler identification
- Middleware detection
- API endpoint mapping

## Example Output Structure

```json
{
  "files": [
    {
      "path": "/src/components/Button.tsx",
      "fileName": "Button.tsx",
      "extension": ".tsx",
      "framework": "react",
      "isTest": false,
      "lineCount": 45
    }
  ],
  "classes": [
    {
      "name": "Button",
      "fullyQualifiedName": "components.Button",
      "isComponent": true,
      "isExported": true,
      "filePath": "/src/components/Button.tsx"
    }
  ],
  "methods": [
    {
      "name": "onClick",
      "isEventHandler": true,
      "className": "Button",
      "visibility": "public",
      "cyclomaticComplexity": 2
    }
  ],
  "relationships": [
    {
      "type": "CONTAINS",
      "startNodeType": "File",
      "startNodeId": "/src/components/Button.tsx",
      "endNodeType": "Class",
      "endNodeId": "components.Button"
    }
  ]
}
```

## Integration with TekAI Context Engine

This parser is designed to integrate with the TekAI Context Engine pipeline:

1. **Git Sync Task**: Downloads the codebase
2. **TypeScript Parser Task**: Runs this parser to extract code structure
3. **Neo4j Import Task**: Imports the generated JSON into Neo4j
4. **Embedding Task**: Generates vector embeddings for semantic search

## Development

### Prerequisites
- Node.js 18+
- TypeScript 5+
- Docker (for containerized usage)

### Building
```bash
npm run build
```

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.