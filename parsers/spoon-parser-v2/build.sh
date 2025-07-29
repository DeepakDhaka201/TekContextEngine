#!/bin/bash

# Build script for Spoon Parser v2

set -e

echo "=== Building Spoon Parser v2 ==="

# Check if Maven is installed
if ! command -v mvn &> /dev/null; then
    echo "Error: Maven is not installed. Please install Maven first."
    exit 1
fi

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "Error: Java is not installed. Please install Java 11 or higher."
    exit 1
fi

# Check Java version
JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt 11 ]; then
    echo "Error: Java 11 or higher is required. Current version: $JAVA_VERSION"
    exit 1
fi

echo "Java version: $(java -version 2>&1 | head -n 1)"
echo "Maven version: $(mvn -version | head -n 1)"

# Clean and compile
echo "Cleaning previous builds..."
mvn clean

echo "Compiling source code..."
mvn compile

# Run tests
echo "Running tests..."
mvn test

# Package the application
echo "Packaging application..."
mvn package -DskipTests

# Check if JAR was created
JAR_FILE=$(find target -name "spoon-parser-v2-*.jar" | head -n 1)
if [ -z "$JAR_FILE" ]; then
    echo "Error: JAR file not found in target directory"
    exit 1
fi

echo "Build successful!"
echo "JAR file created: $JAR_FILE"

# Make the JAR executable
chmod +x "$JAR_FILE"

# Create a simple test
echo "Running basic test..."
mkdir -p test-output

# Create a simple test Java file
mkdir -p test-input/src/main/java/com/test
cat > test-input/src/main/java/com/test/TestClass.java << 'EOF'
package com.test;

public class TestClass {
    private String name;
    
    public TestClass(String name) {
        this.name = name;
    }
    
    public String getName() {
        return name;
    }
}
EOF

# Test the parser
echo "Testing parser with sample project..."
java -jar "$JAR_FILE" test-project test-input test-output/result.json

if [ -f "test-output/result.json" ]; then
    echo "Test successful! Output file created: test-output/result.json"
    echo "File size: $(du -h test-output/result.json | cut -f1)"
    
    # Show a preview of the output
    echo "Preview of output:"
    head -n 20 test-output/result.json
else
    echo "Test failed: Output file not created"
    exit 1
fi

# Clean up test files
rm -rf test-input test-output

echo "=== Build and test completed successfully! ==="
echo "Usage: java -jar $JAR_FILE <codebase-name> <input-directory> <output-file> [config-file]"
