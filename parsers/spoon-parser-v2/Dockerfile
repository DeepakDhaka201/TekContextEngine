# Multi-stage build for Spoon Parser v2
FROM maven:3.9-openjdk-11-slim AS builder

# Set working directory
WORKDIR /build

# Copy pom.xml first for better Docker layer caching
COPY pom.xml .

# Download dependencies
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Build the application
RUN mvn clean package -DskipTests -B

# Runtime stage
FROM openjdk:11-jre-slim

# Install necessary packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy the built JAR from builder stage
COPY --from=builder /build/target/spoon-parser-v2-*-shaded.jar /app/spoon-parser-v2.jar

# Create non-root user for security
RUN groupadd -r spoonparser && useradd -r -g spoonparser spoonparser
RUN chown -R spoonparser:spoonparser /app
USER spoonparser

# Set JVM options for container environment
ENV JAVA_OPTS="-Xmx2g -Xms512m -XX:+UseG1GC -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD java -version || exit 1

# Default command
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/spoon-parser-v2.jar \"$@\"", "--"]

# Usage examples in comments:
# docker build -t spoon-parser-v2 .
# docker run -v $(pwd):/workspace spoon-parser-v2 my-service /workspace/src /workspace/output.json
# docker run -v $(pwd):/workspace spoon-parser-v2 my-service /workspace/project /workspace/result.json /workspace/config.json

# Labels for metadata
LABEL maintainer="TekCode Team"
LABEL version="2.0.0"
LABEL description="Advanced Java code parser using Spoon framework"
LABEL org.opencontainers.image.title="Spoon Parser v2"
LABEL org.opencontainers.image.description="Advanced Java code parser with comprehensive analysis capabilities"
LABEL org.opencontainers.image.version="2.0.0"
LABEL org.opencontainers.image.vendor="TekCode"
