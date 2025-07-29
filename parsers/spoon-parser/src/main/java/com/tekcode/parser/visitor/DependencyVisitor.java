package com.tekcode.parser.visitor;

import com.tekcode.parser.model.DependencyNode;
import com.tekcode.parser.model.ParseResult;
import com.tekcode.parser.model.Relationship;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

public class DependencyVisitor {
    private static final Logger logger = LoggerFactory.getLogger(DependencyVisitor.class);
    private final ParseResult result;
    private final String projectPath;
    private final String codebaseName;

    public DependencyVisitor(ParseResult result, String projectPath, String codebaseName) {
        this.result = result;
        this.projectPath = projectPath;
        this.codebaseName = codebaseName;
    }

    public void extractDependencies() {
        // Try to find and parse pom.xml (Maven)
        Path pomPath = Paths.get(projectPath, "pom.xml");
        if (Files.exists(pomPath)) {
            parseMavenDependencies(pomPath.toFile());
        }
        
        // Try to find and parse build.gradle (Gradle)
        Path gradlePath = Paths.get(projectPath, "build.gradle");
        if (Files.exists(gradlePath)) {
            parseGradleDependencies(gradlePath.toFile());
        }
        
        // Try to find and parse build.gradle.kts (Gradle with Kotlin DSL)
        Path gradleKtsPath = Paths.get(projectPath, "build.gradle.kts");
        if (Files.exists(gradleKtsPath)) {
            parseGradleDependencies(gradleKtsPath.toFile());
        }
    }

    private void parseMavenDependencies(File pomFile) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.parse(pomFile);
            
            NodeList dependencies = doc.getElementsByTagName("dependency");
            
            for (int i = 0; i < dependencies.getLength(); i++) {
                Element dependency = (Element) dependencies.item(i);
                
                String groupId = getTextContent(dependency, "groupId");
                String artifactId = getTextContent(dependency, "artifactId");
                String version = getTextContent(dependency, "version");
                String scope = getTextContent(dependency, "scope");
                
                if (groupId != null && artifactId != null) {
                    DependencyNode depNode = new DependencyNode();
                    depNode.setName(codebaseName + ":" + groupId + ":" + artifactId);
                    depNode.setVersion(version != null ? version : "unknown");
                    depNode.setScope(scope != null ? scope : "compile");
                    depNode.setType("maven");
                    
                    result.addDependency(depNode);
                    
                    // Create DEPENDS_ON relationship
                    Relationship dependsOn = new Relationship(
                        "DEPENDS_ON",
                        "Codebase",
                        codebaseName,
                        "Dependency",
                        depNode.getName()
                    );
                    result.addRelationship(dependsOn);
                }
            }
            
            logger.info("Parsed {} Maven dependencies from pom.xml", dependencies.getLength());
            
        } catch (Exception e) {
            logger.error("Error parsing Maven dependencies from pom.xml", e);
        }
    }

    private void parseGradleDependencies(File gradleFile) {
        try {
            String content = Files.readString(gradleFile.toPath());
            
            // Simple regex-based parsing for Gradle dependencies
            // This is a basic implementation - a more robust parser would use AST
            String[] lines = content.split("\n");
            
            boolean inDependenciesBlock = false;
            int dependencyCount = 0;
            
            for (String line : lines) {
                line = line.trim();
                
                if (line.contains("dependencies") && line.contains("{")) {
                    inDependenciesBlock = true;
                    continue;
                }
                
                if (inDependenciesBlock && line.equals("}")) {
                    inDependenciesBlock = false;
                    continue;
                }
                
                if (inDependenciesBlock && (line.contains("implementation(") || 
                    line.contains("implementation ") ||
                    line.contains("api(") || 
                    line.contains("api ") ||
                    line.contains("compile(") || 
                    line.contains("compile ") ||
                    line.contains("testImplementation(") ||
                    line.contains("testImplementation ") ||
                    line.contains("runtimeOnly(") ||
                    line.contains("compileOnly(") ||
                    line.contains("testCompileOnly(") ||
                    line.contains("testRuntimeOnly("))) {
                    
                    String dependency = extractGradleDependency(line);
                    if (dependency != null) {
                        String[] parts = dependency.split(":");
                        if (parts.length >= 2) {
                            DependencyNode depNode = new DependencyNode();
                            depNode.setName(parts[0] + ":" + parts[1]);
                            depNode.setVersion(parts.length > 2 ? parts[2] : "unknown");
                            depNode.setScope(extractGradleScope(line));
                            depNode.setType("gradle");
                            
                            result.addDependency(depNode);
                            
                            // Create DEPENDS_ON relationship
                            Relationship dependsOn = new Relationship(
                                "DEPENDS_ON",
                                "Codebase",
                                codebaseName,
                                "Dependency",
                                codebaseName + ":" + depNode.getName()
                            );
                            result.addRelationship(dependsOn);
                            
                            dependencyCount++;
                        }
                    }
                }
            }
            
            logger.info("Parsed {} Gradle dependencies from {}", dependencyCount, gradleFile.getName());
            
        } catch (Exception e) {
            logger.error("Error parsing Gradle dependencies from " + gradleFile.getName(), e);
        }
    }

    private String getTextContent(Element parent, String tagName) {
        NodeList nodes = parent.getElementsByTagName(tagName);
        if (nodes.getLength() > 0) {
            return nodes.item(0).getTextContent();
        }
        return null;
    }

    private String extractGradleDependency(String line) {
        // Extract dependency string from Gradle syntax
        // Examples: implementation 'org.springframework:spring-core:5.3.21'
        //          implementation("org.springframework:spring-core:5.3.21")
        
        int start = -1;
        int end = -1;
        
        if (line.contains("'")) {
            start = line.indexOf("'") + 1;
            end = line.lastIndexOf("'");
        } else if (line.contains("\"")) {
            start = line.indexOf("\"") + 1;
            end = line.lastIndexOf("\"");
        }
        
        if (start > 0 && end > start) {
            return line.substring(start, end);
        }
        
        return null;
    }

    private String extractGradleScope(String line) {
        if (line.contains("testImplementation") || line.contains("testCompile") || 
            line.contains("testRuntimeOnly") || line.contains("testCompileOnly")) {
            return "test";
        } else if (line.contains("api")) {
            return "api";
        } else if (line.contains("implementation")) {
            return "implementation";
        } else if (line.contains("runtimeOnly")) {
            return "runtime";
        } else if (line.contains("compileOnly")) {
            return "compileOnly";
        } else if (line.contains("compile")) {
            return "compile";
        }
        return "implementation";
    }
}