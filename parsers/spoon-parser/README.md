# Spoon Parser for Neo4j Knowledge Graph

This Docker-based parser uses [Spoon](https://spoon.gforge.inria.fr/) to analyze Java source code and extract structured information for building a Neo4j knowledge graph.

## Features

- **Comprehensive Code Analysis**: Extracts classes, methods, interfaces, annotations, and their relationships
- **Call Graph Generation**: Identifies method-to-method call relationships
- **Dependency Extraction**: Parses Maven (pom.xml) and Gradle (build.gradle) dependencies
- **Docker Containerized**: Runs in isolation with consistent environment
- **JSON Output**: Produces structured JSON output compatible with Neo4j ingestion

## Usage

### Quick Start with Docker Compose

1. **Set environment variables** (optional):
   ```bash
   export JAVA_SOURCE_PATH=/path/to/your/java/project
   export OUTPUT_PATH=/path/to/output/directory
   ```

2. **Run the parser**:
   ```bash
   docker-compose up --build
   ```

### Manual Docker Build and Run

1. **Build the image**:
   ```bash
   docker build -t spoon-parser .
   ```

2. **Run the parser**:
   ```bash
   docker run --rm \
     -v /path/to/java/source:/input:ro \
     -v /path/to/output:/output \
     spoon-parser
   ```

### Environment Variables

- `INPUT_DIR`: Input directory containing Java source files (default: `/input`)
- `OUTPUT_FILE`: Output JSON file path (default: `/output/parse-result.json`)
- `JAVA_OPTS`: JVM options (default: `-Xmx2g -Xms512m`)

## Output Format

The parser generates a JSON file containing:

```json
{
  "files": [...],           // File nodes with path, checksum, line count
  "classes": [...],         // Class nodes with properties and metadata
  "interfaces": [...],      // Interface definitions
  "methods": [...],         // Method nodes with signature, complexity, etc.
  "annotations": [...],     // Annotation nodes and their values
  "dependencies": [...],    // External dependencies from pom.xml/build.gradle
  "relationships": [...]    // All relationships between nodes
}
```

### Node Types

- **File**: Source files with metadata
- **Class**: Java classes with modifiers, comments, and position info
- **Interface**: Java interfaces
- **Method**: Methods and constructors with complexity metrics
- **Annotation**: Annotations with their parameter values
- **Dependency**: External libraries from build files

### Relationship Types

- `DEFINES_CLASS`: File → Class
- `DEFINES_INTERFACE`: File → Interface  
- `HAS_METHOD`: Class → Method
- `EXTENDS`: Class → Class
- `IMPLEMENTS`: Class → Interface
- `CALLS`: Method → Method
- `ANNOTATED_WITH`: Class/Method → Annotation

## Integration with Pipeline

This parser is designed to be used by the TekAI Context Engine pipeline:

```typescript
// Example usage in code-parsing.task.ts
const result = await execAsync(`docker run --rm \
  -v "${clonePath}:/input:ro" \
  -v "${tempDir}:/output" \
  spoon-parser`);

const parseResult = JSON.parse(await fs.readFile(path.join(tempDir, 'parse-result.json'), 'utf8'));
```

## Development

### Local Development

1. **Build with Maven**:
   ```bash
   mvn clean package
   ```

2. **Run locally**:
   ```bash
   java -jar target/spoon-parser-*-shaded.jar /path/to/java/source output.json
   ```

### Testing

Test with a sample Java project:

```bash
mkdir -p sample-java/src/main/java/com/example
echo 'package com.example; public class Hello { public static void main(String[] args) { System.out.println("Hello"); } }' > sample-java/src/main/java/com/example/Hello.java

docker-compose up --build
```

## Troubleshooting

### Common Issues

1. **No Java files found**: Ensure the mounted directory contains `.java` files
2. **Out of memory**: Increase `JAVA_OPTS` memory settings
3. **Permission denied**: Check file permissions on mounted volumes

### Debugging

Run with interactive shell:
```bash
docker run --rm -it \
  -v /path/to/java/source:/input:ro \
  -v /path/to/output:/output \
  --entrypoint /bin/bash \
  spoon-parser
```

## Performance

- **Memory**: Recommended 2-4GB RAM for large projects
- **Time**: ~1-5 minutes for typical Spring Boot applications
- **Output Size**: ~1-10MB JSON for medium-sized projects

## Limitations

- Java source code only (no bytecode analysis)
- Basic cyclomatic complexity calculation
- Limited Gradle dependency parsing (regex-based)
- No cross-project dependency resolution