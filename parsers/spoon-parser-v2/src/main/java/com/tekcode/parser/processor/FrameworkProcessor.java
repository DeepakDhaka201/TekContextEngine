package com.tekcode.parser.processor;

import com.tekcode.parser.core.ParsingContext;
import com.tekcode.parser.core.FrameworkInfo;
import com.tekcode.parser.model.DependencyNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * Processor for detecting frameworks in the project
 */
public class FrameworkProcessor {
    private static final Logger logger = LoggerFactory.getLogger(FrameworkProcessor.class);

    private final ParsingContext context;

    // Framework detection patterns
    private static final Map<String, String[]> FRAMEWORK_PATTERNS = new HashMap<>();

    static {
        // Spring Boot
        FRAMEWORK_PATTERNS.put("spring-boot", new String[]{
            "org.springframework.boot:spring-boot-starter",
            "org.springframework.boot:spring-boot-autoconfigure",
            "@SpringBootApplication",
            "@EnableAutoConfiguration"
        });

        // Spring MVC
        FRAMEWORK_PATTERNS.put("spring-mvc", new String[]{
            "org.springframework:spring-webmvc",
            "org.springframework:spring-web",
            "@Controller",
            "@RestController"
        });

        // Spring Data
        FRAMEWORK_PATTERNS.put("spring-data", new String[]{
            "org.springframework.data:spring-data-jpa",
            "org.springframework.data:spring-data-commons",
            "@Repository",
            "@Entity"
        });

        // JUnit
        FRAMEWORK_PATTERNS.put("junit", new String[]{
            "org.junit.jupiter:junit-jupiter",
            "junit:junit",
            "@Test",
            "@TestCase"
        });

        // TestNG
        FRAMEWORK_PATTERNS.put("testng", new String[]{
            "org.testng:testng",
            "@Test",
            "@BeforeMethod"
        });

        // Quarkus
        FRAMEWORK_PATTERNS.put("quarkus", new String[]{
            "io.quarkus:quarkus-core",
            "io.quarkus:quarkus-arc",
            "@QuarkusApplication"
        });

        // Micronaut
        FRAMEWORK_PATTERNS.put("micronaut", new String[]{
            "io.micronaut:micronaut-core",
            "io.micronaut:micronaut-inject",
            "@MicronautApplication"
        });

        // Hibernate
        FRAMEWORK_PATTERNS.put("hibernate", new String[]{
            "org.hibernate:hibernate-core",
            "org.hibernate:hibernate-entitymanager",
            "@Entity",
            "@Table"
        });
    }

    public FrameworkProcessor(ParsingContext context) {
        this.context = context;
    }

    /**
     * Detects frameworks used in the project
     */
    public FrameworkInfo detectFrameworks() {
        FrameworkInfo frameworkInfo = new FrameworkInfo();

        try {
            // Always add Java as base framework
            frameworkInfo.addFramework("java", detectJavaVersion());

            // Detect frameworks from dependencies
            detectFromDependencies(frameworkInfo);

            // Detect frameworks from build files
            detectFromBuildFiles(frameworkInfo);

            // Detect frameworks from source code annotations
            detectFromSourceCode(frameworkInfo);

            // Set primary framework based on priority
            setPrimaryFramework(frameworkInfo);

            logger.info("Detected frameworks: {}", frameworkInfo.getAllFrameworks());

        } catch (Exception e) {
            logger.error("Error detecting frameworks", e);
            context.incrementErrorCount();
        }

        return frameworkInfo;
    }

    /**
     * Detects Java version
     */
    private String detectJavaVersion() {
        // Try to detect from system property first
        String javaVersion = System.getProperty("java.version");
        if (javaVersion != null) {
            return javaVersion;
        }

        // Try to detect from Maven pom.xml
        Path pomPath = Paths.get(context.getProjectPath(), "pom.xml");
        if (Files.exists(pomPath)) {
            String version = detectJavaVersionFromPom(pomPath);
            if (version != null) {
                return version;
            }
        }

        return "unknown";
    }

    /**
     * Detects Java version from Maven pom.xml
     */
    private String detectJavaVersionFromPom(Path pomPath) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document document = builder.parse(pomPath.toFile());

            // Check maven.compiler.source property
            NodeList properties = document.getElementsByTagName("properties");
            if (properties.getLength() > 0) {
                Element propsElement = (Element) properties.item(0);
                NodeList sourceNodes = propsElement.getElementsByTagName("maven.compiler.source");
                if (sourceNodes.getLength() > 0) {
                    return sourceNodes.item(0).getTextContent().trim();
                }

                NodeList targetNodes = propsElement.getElementsByTagName("maven.compiler.target");
                if (targetNodes.getLength() > 0) {
                    return targetNodes.item(0).getTextContent().trim();
                }
            }

        } catch (Exception e) {
            logger.debug("Error reading Java version from pom.xml", e);
        }

        return null;
    }

    /**
     * Detects frameworks from project dependencies
     */
    private void detectFromDependencies(FrameworkInfo frameworkInfo) {
        // This would typically get dependencies from the DependencyProcessor
        // For now, we'll detect from build files directly
        logger.debug("Detecting frameworks from dependencies");
    }

    /**
     * Detects frameworks from build files (pom.xml, build.gradle)
     */
    private void detectFromBuildFiles(FrameworkInfo frameworkInfo) {
        // Check Maven pom.xml
        Path pomPath = Paths.get(context.getProjectPath(), "pom.xml");
        if (Files.exists(pomPath)) {
            detectFrameworksFromPom(pomPath, frameworkInfo);
        }

        // Check Gradle build files
        Path[] gradleFiles = {
            Paths.get(context.getProjectPath(), "build.gradle"),
            Paths.get(context.getProjectPath(), "build.gradle.kts")
        };

        for (Path gradlePath : gradleFiles) {
            if (Files.exists(gradlePath)) {
                detectFrameworksFromGradle(gradlePath, frameworkInfo);
            }
        }
    }

    /**
     * Detects frameworks from Maven pom.xml
     */
    private void detectFrameworksFromPom(Path pomPath, FrameworkInfo frameworkInfo) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document document = builder.parse(pomPath.toFile());

            // Check dependencies
            NodeList dependencyNodes = document.getElementsByTagName("dependency");
            for (int i = 0; i < dependencyNodes.getLength(); i++) {
                Node dependencyNode = dependencyNodes.item(i);
                if (dependencyNode.getNodeType() == Node.ELEMENT_NODE) {
                    Element dependency = (Element) dependencyNode;

                    String groupId = getElementText(dependency, "groupId");
                    String artifactId = getElementText(dependency, "artifactId");
                    String version = getElementText(dependency, "version");

                    if (groupId != null && artifactId != null) {
                        String dependencyString = groupId + ":" + artifactId;
                        checkDependencyForFrameworks(dependencyString, version, frameworkInfo);
                    }
                }
            }

        } catch (Exception e) {
            logger.debug("Error detecting frameworks from pom.xml", e);
        }
    }

    /**
     * Detects frameworks from Gradle build files
     */
    private void detectFrameworksFromGradle(Path gradlePath, FrameworkInfo frameworkInfo) {
        try {
            String content = Files.readString(gradlePath);

            // Simple pattern matching for dependencies
            String[] lines = content.split("\n");
            for (String line : lines) {
                line = line.trim();
                if (line.contains("implementation") || line.contains("compile") ||
                    line.contains("api") || line.contains("testImplementation")) {

                    // Extract dependency string
                    if (line.contains("'") || line.contains("\"")) {
                        String dependencyString = extractDependencyFromGradleLine(line);
                        if (dependencyString != null) {
                            checkDependencyForFrameworks(dependencyString, null, frameworkInfo);
                        }
                    }
                }
            }

        } catch (Exception e) {
            logger.debug("Error detecting frameworks from Gradle file: {}", gradlePath, e);
        }
    }

    /**
     * Extracts dependency string from Gradle line
     */
    private String extractDependencyFromGradleLine(String line) {
        // Extract content between quotes
        int start = Math.max(line.indexOf("'"), line.indexOf("\""));
        if (start == -1) return null;

        char quote = line.charAt(start);
        int end = line.indexOf(quote, start + 1);
        if (end == -1) return null;

        return line.substring(start + 1, end);
    }

    /**
     * Checks if a dependency indicates a specific framework
     */
    private void checkDependencyForFrameworks(String dependencyString, String version, FrameworkInfo frameworkInfo) {
        for (Map.Entry<String, String[]> entry : FRAMEWORK_PATTERNS.entrySet()) {
            String framework = entry.getKey();
            String[] patterns = entry.getValue();

            for (String pattern : patterns) {
                if (pattern.contains(":") && dependencyString.contains(pattern)) {
                    frameworkInfo.addFramework(framework, version);
                    logger.debug("Detected framework {} from dependency: {}", framework, dependencyString);
                    break;
                }
            }
        }
    }

    /**
     * Detects frameworks from source code annotations
     */
    private void detectFromSourceCode(FrameworkInfo frameworkInfo) {
        // This would require scanning the parsed source code for annotations
        // For now, we'll implement a basic version
        logger.debug("Source code framework detection not yet implemented");
    }

    /**
     * Sets the primary framework based on priority
     */
    private void setPrimaryFramework(FrameworkInfo frameworkInfo) {
        Set<String> frameworks = frameworkInfo.getAllFrameworks();

        // Priority order for primary framework selection
        String[] priorityOrder = {
            "spring-boot", "quarkus", "micronaut", "spring-mvc",
            "spring-data", "hibernate", "junit", "java"
        };

        for (String framework : priorityOrder) {
            if (frameworks.contains(framework)) {
                frameworkInfo.setPrimaryFramework(framework);
                break;
            }
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
}
