package com.tekcode.parser.framework;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class FrameworkDetector {
    private static final Logger logger = LoggerFactory.getLogger(FrameworkDetector.class);
    
    public enum Framework {
        SPRING_BOOT("spring-boot"),
        MAVEN("maven"),
        GRADLE("gradle"),
        PLAIN_JAVA("java");
        
        private final String name;
        
        Framework(String name) {
            this.name = name;
        }
        
        public String getName() {
            return name;
        }
    }
    
    /**
     * Simplified framework detection: Spring Boot + build tools only
     */
    public Set<Framework> detectFrameworks(String projectPath) {
        Set<Framework> detectedFrameworks = new HashSet<>();
        
        try {
            // Check build tools first
            detectedFrameworks.addAll(detectBuildTools(projectPath));
            
            // Check for Spring Boot only
            if (isSpringBoot(projectPath)) {
                detectedFrameworks.add(Framework.SPRING_BOOT);
            }
            
        } catch (Exception e) {
            logger.error("Error detecting frameworks for {}: {}", projectPath, e.getMessage(), e);
        }
        
        // Always include Java
        detectedFrameworks.add(Framework.PLAIN_JAVA);
        
        return detectedFrameworks;
    }
    
    /**
     * Gets the primary framework (most specific one)
     */
    public Framework detectFramework(String projectPath) {
        Set<Framework> frameworks = detectFrameworks(projectPath);
        return getPrimaryFramework(frameworks);
    }
    
    public Framework getPrimaryFramework(Set<Framework> frameworks) {
        if (frameworks.contains(Framework.SPRING_BOOT)) {
            return Framework.SPRING_BOOT;
        }
        return Framework.PLAIN_JAVA;
    }
    
    private Set<Framework> detectBuildTools(String projectPath) {
        Set<Framework> buildTools = new HashSet<>();
        
        // Check for Maven
        if (Files.exists(Paths.get(projectPath, "pom.xml"))) {
            buildTools.add(Framework.MAVEN);
        }
        
        // Check for Gradle
        if (Files.exists(Paths.get(projectPath, "build.gradle")) ||
            Files.exists(Paths.get(projectPath, "build.gradle.kts")) ||
            Files.exists(Paths.get(projectPath, "settings.gradle")) ||
            Files.exists(Paths.get(projectPath, "settings.gradle.kts"))) {
            buildTools.add(Framework.GRADLE);
        }
        
        return buildTools;
    }
    
    private boolean isSpringBoot(String projectPath) throws IOException {
        // Check for Spring Boot in build files using simple string matching
        
        // 1. Check Gradle for Spring Boot plugin
        if (hasGradleSpringBootPlugin(projectPath)) {
            return true;
        }
        
        // 2. Check Maven for Spring Boot parent or starter
        if (hasMavenSpringBootDependencies(projectPath)) {
            return true;
        }
        
        return false;
    }
    
    private boolean hasMavenSpringBootDependencies(String projectPath) throws IOException {
        Path pomPath = Paths.get(projectPath, "pom.xml");
        if (!Files.exists(pomPath)) {
            return false;
        }
        
        String pomContent = Files.readString(pomPath);
        
        // Check for Spring Boot parent or any Spring Boot starter
        return pomContent.contains("spring-boot-starter-parent") ||
               pomContent.contains("spring-boot-starter");
    }
    
    private boolean hasGradleSpringBootPlugin(String projectPath) throws IOException {
        // Check both .gradle and .gradle.kts files
        Path buildGradlePath = Paths.get(projectPath, "build.gradle");
        Path buildGradleKtsPath = Paths.get(projectPath, "build.gradle.kts");
        
        if (Files.exists(buildGradlePath)) {
            String buildContent = Files.readString(buildGradlePath);
            if (buildContent.contains("id 'org.springframework.boot'") ||
                buildContent.contains("id \"org.springframework.boot\"") ||
                buildContent.contains("io.spring.dependency-management")) {
                return true;
            }
        }
        
        if (Files.exists(buildGradleKtsPath)) {
            String buildContent = Files.readString(buildGradleKtsPath);
            if (buildContent.contains("id(\"org.springframework.boot\")") ||
                buildContent.contains("io.spring.dependency-management")) {
                return true;
            }
        }
        
        return false;
    }
    
}