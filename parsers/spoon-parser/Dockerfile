# Use Maven with OpenJDK 11 for building
FROM maven:3.8.6-openjdk-11 AS build

WORKDIR /app

# Copy pom.xml first for better caching
COPY pom.xml .

# Download dependencies
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Build the application
RUN mvn clean package -DskipTests

# Use OpenJDK 11 runtime for the final image
FROM openjdk:11-jre-slim

WORKDIR /app

# Install necessary tools for better debugging
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the built JAR from the build stage
COPY --from=build /app/target/spoon-parser-*-shaded.jar /app/spoon-parser.jar

# Create directories for input and output
RUN mkdir -p /input /output

# Set default environment variables
ENV JAVA_OPTS="-Xmx2g -Xms512m"

# Create entrypoint script
RUN echo '#!/bin/bash\n\
INPUT_DIR=${INPUT_DIR:-/input}\n\
OUTPUT_FILE=${OUTPUT_FILE:-/output/parse-result.json}\n\
\n\
echo "Starting Spoon parser..."\n\
echo "Input directory: $INPUT_DIR"\n\
echo "Output file: $OUTPUT_FILE"\n\
\n\
# Check if input directory exists and has files\n\
if [ ! -d "$INPUT_DIR" ]; then\n\
    echo "Error: Input directory $INPUT_DIR does not exist"\n\
    exit 1\n\
fi\n\
\n\
# Count Java files\n\
JAVA_FILES=$(find "$INPUT_DIR" -name "*.java" | wc -l)\n\
echo "Found $JAVA_FILES Java files to parse"\n\
\n\
if [ "$JAVA_FILES" -eq 0 ]; then\n\
    echo "Warning: No Java files found in $INPUT_DIR"\n\
fi\n\
\n\
# Run the parser\n\
java $JAVA_OPTS -jar /app/spoon-parser.jar "$INPUT_DIR" "$OUTPUT_FILE"\n\
\n\
# Check if output was created\n\
if [ -f "$OUTPUT_FILE" ]; then\n\
    echo "Parse completed successfully. Output written to $OUTPUT_FILE"\n\
    # Show file size\n\
    ls -lh "$OUTPUT_FILE"\n\
else\n\
    echo "Error: Output file was not created"\n\
    exit 1\n\
fi' > /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh

# Expose volume mount points
VOLUME ["/input", "/output"]

ENTRYPOINT ["/app/entrypoint.sh"]