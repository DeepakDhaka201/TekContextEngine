package com.tekcode.parser.processor;

import com.tekcode.parser.core.ParsingContext;
import com.tekcode.parser.model.DependencyNode;
import com.tekcode.parser.util.IdGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Processor for extracting project dependencies
 */
public class DependencyProcessor {
    private static final Logger logger = LoggerFactory.getLogger(DependencyProcessor.class);

    private final ParsingContext context;

    // Gradle dependency patterns
    private static final Pattern GRADLE_DEPENDENCY_PATTERN = Pattern.compile(
        "(implementation|compile|testImplementation|testCompile|api|compileOnly|runtimeOnly)\\s*['\"]([^'\"]+)['\"]"
    );

    private static final Pattern GRADLE_DEPENDENCY_BLOCK_PATTERN = Pattern.compile(
        "(implementation|compile|testImplementation|testCompile|api|compileOnly|runtimeOnly)\\s*\\(\\s*group:\\s*['\"]([^'\"]+)['\"]\\s*,\\s*name:\\s*['\"]([^'\"]+)['\"]\\s*,\\s*version:\\s*['\"]([^'\"]+)['\"]\\s*\\)"
    );

    public DependencyProcessor(ParsingContext context) {
        this.context = context;
    }

    /**
     * Extracts dependencies from build files
     */
    public List<DependencyNode> extractDependencies() {
        List<DependencyNode> dependencies = new ArrayList<>();

        try {
            // Extract from Maven pom.xml
            if (context.getConfig().isIncludeMavenDependencies()) {
                dependencies.addAll(extractMavenDependencies());
            }

            // Extract from Gradle build files
            if (context.getConfig().isIncludeGradleDependencies()) {
                dependencies.addAll(extractGradleDependencies());
            }

            logger.info("Extracted {} dependencies", dependencies.size());

        } catch (Exception e) {
            logger.error("Error extracting dependencies", e);
            context.incrementErrorCount();
        }

        return dependencies;
    }

    /**
     * Extracts dependencies from Maven pom.xml files
     */
    private List<DependencyNode> extractMavenDependencies() {
        List<DependencyNode> dependencies = new ArrayList<>();

        Path pomPath = Paths.get(context.getProjectPath(), "pom.xml");
        if (!Files.exists(pomPath)) {
            logger.debug("No pom.xml found at: {}", pomPath);
            return dependencies;
        }

        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document document = builder.parse(pomPath.toFile());

            // Extract dependencies
            NodeList dependencyNodes = document.getElementsByTagName("dependency");
            for (int i = 0; i < dependencyNodes.getLength(); i++) {
                Node dependencyNode = dependencyNodes.item(i);
                if (dependencyNode.getNodeType() == Node.ELEMENT_NODE) {
                    Element dependency = (Element) dependencyNode;

                    DependencyNode depNode = createMavenDependencyNode(dependency);
                    if (depNode != null) {
                        dependencies.add(depNode);
                    }
                }
            }

            logger.debug("Extracted {} Maven dependencies from pom.xml", dependencies.size());

        } catch (Exception e) {
            logger.error("Error parsing pom.xml: {}", pomPath, e);
            context.incrementErrorCount();
        }

        return dependencies;
    }

    /**
     * Creates a dependency node from Maven XML element
     */
    private DependencyNode createMavenDependencyNode(Element dependency) {
        try {
            String groupId = getElementText(dependency, "groupId");
            String artifactId = getElementText(dependency, "artifactId");
            String version = getElementText(dependency, "version");
            String scope = getElementText(dependency, "scope");
            String type = getElementText(dependency, "type");

            if (groupId == null || artifactId == null) {
                logger.warn("Invalid Maven dependency: missing groupId or artifactId");
                return null;
            }

            DependencyNode depNode = new DependencyNode();
            depNode.setGroupId(groupId);
            depNode.setArtifactId(artifactId);
            depNode.setVersion(version != null ? version : "unknown");
            depNode.setScope(scope != null ? scope : "compile");
            depNode.setType(type != null ? type : "jar");
            depNode.setId(IdGenerator.generateDependencyId(context.getCodebaseName(), groupId, artifactId));

            return depNode;

        } catch (Exception e) {
            logger.warn("Error creating Maven dependency node", e);
            return null;
        }
    }

    /**
     * Gets text content from XML element
     */
    private String getElementText(Element parent, String tagName) {
        NodeList nodeList = parent.getElementsByTagName(tagName);
        if (nodeList.getLength() > 0) {
            Node node = nodeList.item(0);
            if (node != null) {
                return node.getTextContent().trim();
            }
        }
        return null;
    }

    /**
     * Extracts dependencies from Gradle build files
     */
    private List<DependencyNode> extractGradleDependencies() {
        List<DependencyNode> dependencies = new ArrayList<>();

        // Check for build.gradle (Groovy) and build.gradle.kts (Kotlin)
        Path[] gradleFiles = {
            Paths.get(context.getProjectPath(), "build.gradle"),
            Paths.get(context.getProjectPath(), "build.gradle.kts")
        };

        for (Path gradlePath : gradleFiles) {
            if (Files.exists(gradlePath)) {
                dependencies.addAll(parseGradleFile(gradlePath));
            }
        }

        return dependencies;
    }

    /**
     * Parses a Gradle build file for dependencies
     */
    private List<DependencyNode> parseGradleFile(Path gradlePath) {
        List<DependencyNode> dependencies = new ArrayList<>();

        try {
            String content = Files.readString(gradlePath);

            // Parse simple string dependencies (e.g., implementation 'group:artifact:version')
            Matcher matcher = GRADLE_DEPENDENCY_PATTERN.matcher(content);
            while (matcher.find()) {
                String scope = matcher.group(1);
                String dependencyString = matcher.group(2);

                DependencyNode depNode = parseGradleDependencyString(dependencyString, scope);
                if (depNode != null) {
                    dependencies.add(depNode);
                }
            }

            // Parse block-style dependencies
            Matcher blockMatcher = GRADLE_DEPENDENCY_BLOCK_PATTERN.matcher(content);
            while (blockMatcher.find()) {
                String scope = blockMatcher.group(1);
                String groupId = blockMatcher.group(2);
                String artifactId = blockMatcher.group(3);
                String version = blockMatcher.group(4);

                DependencyNode depNode = createGradleDependencyNode(groupId, artifactId, version, scope);
                if (depNode != null) {
                    dependencies.add(depNode);
                }
            }

            logger.debug("Extracted {} Gradle dependencies from {}", dependencies.size(), gradlePath.getFileName());

        } catch (Exception e) {
            logger.error("Error parsing Gradle file: {}", gradlePath, e);
            context.incrementErrorCount();
        }

        return dependencies;
    }

    /**
     * Parses a Gradle dependency string (group:artifact:version format)
     */
    private DependencyNode parseGradleDependencyString(String dependencyString, String scope) {
        String[] parts = dependencyString.split(":");
        if (parts.length >= 2) {
            String groupId = parts[0];
            String artifactId = parts[1];
            String version = parts.length > 2 ? parts[2] : "unknown";

            return createGradleDependencyNode(groupId, artifactId, version, scope);
        }

        logger.warn("Invalid Gradle dependency format: {}", dependencyString);
        return null;
    }

    /**
     * Creates a dependency node from Gradle information
     */
    private DependencyNode createGradleDependencyNode(String groupId, String artifactId, String version, String scope) {
        try {
            DependencyNode depNode = new DependencyNode();
            depNode.setGroupId(groupId);
            depNode.setArtifactId(artifactId);
            depNode.setVersion(version);
            depNode.setScope(mapGradleScope(scope));
            depNode.setType("jar");
            depNode.setId(IdGenerator.generateDependencyId(context.getCodebaseName(), groupId, artifactId));

            return depNode;

        } catch (Exception e) {
            logger.warn("Error creating Gradle dependency node: {}:{}:{}", groupId, artifactId, version, e);
            return null;
        }
    }

    /**
     * Maps Gradle scopes to Maven-style scopes
     */
    private String mapGradleScope(String gradleScope) {
        switch (gradleScope.toLowerCase()) {
            case "implementation":
            case "compile":
                return "compile";
            case "testimplementation":
            case "testcompile":
                return "test";
            case "api":
                return "compile";
            case "compileonly":
                return "provided";
            case "runtimeonly":
                return "runtime";
            default:
                return gradleScope;
        }
    }
}
