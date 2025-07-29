package com.tekcode.parser.config;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.Set;
import java.util.HashSet;
import java.util.Arrays;

/**
 * Configuration class for the Spoon Parser v2
 * 
 * Provides comprehensive configuration options for parsing behavior,
 * framework detection, output formatting, and performance tuning.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class ParserConfig {
    
    // === Core Parsing Options ===
    
    @JsonProperty("includeMethodBodies")
    private boolean includeMethodBodies = false;
    
    @JsonProperty("includeComments")
    private boolean includeComments = true;
    
    @JsonProperty("includePrivateMembers")
    private boolean includePrivateMembers = true;
    
    @JsonProperty("includeTestFiles")
    private boolean includeTestFiles = true;
    
    @JsonProperty("includeGeneratedFiles")
    private boolean includeGeneratedFiles = false;
    
    // === Framework Detection ===
    
    @JsonProperty("enableFrameworkDetection")
    private boolean enableFrameworkDetection = true;
    
    @JsonProperty("frameworksToDetect")
    private Set<String> frameworksToDetect = new HashSet<>(Arrays.asList(
        "spring-boot", "spring-mvc", "quarkus", "micronaut", "junit", "testng"
    ));
    
    // === Relationship Extraction ===
    
    @JsonProperty("extractCallGraph")
    private boolean extractCallGraph = true;
    
    @JsonProperty("extractTypeUsage")
    private boolean extractTypeUsage = true;
    
    @JsonProperty("extractInheritance")
    private boolean extractInheritance = true;
    
    @JsonProperty("extractAnnotations")
    private boolean extractAnnotations = true;
    
    @JsonProperty("extractFieldRelationships")
    private boolean extractFieldRelationships = true;
    
    // === Dependency Analysis ===
    
    @JsonProperty("extractDependencies")
    private boolean extractDependencies = true;
    
    @JsonProperty("includeMavenDependencies")
    private boolean includeMavenDependencies = true;
    
    @JsonProperty("includeGradleDependencies")
    private boolean includeGradleDependencies = true;
    
    @JsonProperty("includeTransitiveDependencies")
    private boolean includeTransitiveDependencies = false;
    
    // === Performance Options ===
    
    @JsonProperty("maxMemoryMB")
    private int maxMemoryMB = 2048;
    
    @JsonProperty("enableParallelProcessing")
    private boolean enableParallelProcessing = true;
    
    @JsonProperty("maxThreads")
    private int maxThreads = Runtime.getRuntime().availableProcessors();
    
    @JsonProperty("enableProgressReporting")
    private boolean enableProgressReporting = true;
    
    // === Output Options ===
    
    @JsonProperty("prettyPrintJson")
    private boolean prettyPrintJson = true;
    
    @JsonProperty("includeSourceCode")
    private boolean includeSourceCode = false;
    
    @JsonProperty("includeLineNumbers")
    private boolean includeLineNumbers = true;
    
    @JsonProperty("includeFileChecksums")
    private boolean includeFileChecksums = true;
    
    // === Filtering Options ===
    
    @JsonProperty("excludePatterns")
    private Set<String> excludePatterns = new HashSet<>(Arrays.asList(
        ".*\\.generated\\..*",
        ".*target/generated-sources/.*",
        ".*build/generated/.*"
    ));
    
    @JsonProperty("includePatterns")
    private Set<String> includePatterns = new HashSet<>(Arrays.asList(
        ".*\\.java$"
    ));
    
    @JsonProperty("excludePackages")
    private Set<String> excludePackages = new HashSet<>();
    
    @JsonProperty("includePackages")
    private Set<String> includePackages = new HashSet<>();
    
    // === Validation Options ===
    
    @JsonProperty("validateOutput")
    private boolean validateOutput = true;
    
    @JsonProperty("failOnErrors")
    private boolean failOnErrors = false;
    
    @JsonProperty("maxErrorsBeforeAbort")
    private int maxErrorsBeforeAbort = 100;
    
    // === Static Factory Methods ===
    
    /**
     * Creates a default configuration suitable for most use cases
     */
    public static ParserConfig defaultConfig() {
        return new ParserConfig();
    }
    
    /**
     * Creates a minimal configuration for fast parsing
     */
    public static ParserConfig minimalConfig() {
        ParserConfig config = new ParserConfig();
        config.includeMethodBodies = false;
        config.includeComments = false;
        config.includePrivateMembers = false;
        config.extractCallGraph = false;
        config.extractTypeUsage = false;
        config.extractFieldRelationships = false;
        config.enableFrameworkDetection = false;
        return config;
    }
    
    /**
     * Creates a comprehensive configuration for detailed analysis
     */
    public static ParserConfig comprehensiveConfig() {
        ParserConfig config = new ParserConfig();
        config.includeMethodBodies = true;
        config.includeComments = true;
        config.includePrivateMembers = true;
        config.includeSourceCode = true;
        config.extractCallGraph = true;
        config.extractTypeUsage = true;
        config.extractFieldRelationships = true;
        config.extractInheritance = true;
        config.extractAnnotations = true;
        config.enableFrameworkDetection = true;
        config.includeTransitiveDependencies = true;
        return config;
    }
    
    // === Getters and Setters ===
    
    public boolean isIncludeMethodBodies() { return includeMethodBodies; }
    public void setIncludeMethodBodies(boolean includeMethodBodies) { this.includeMethodBodies = includeMethodBodies; }
    
    public boolean isIncludeComments() { return includeComments; }
    public void setIncludeComments(boolean includeComments) { this.includeComments = includeComments; }
    
    public boolean isIncludePrivateMembers() { return includePrivateMembers; }
    public void setIncludePrivateMembers(boolean includePrivateMembers) { this.includePrivateMembers = includePrivateMembers; }
    
    public boolean isIncludeTestFiles() { return includeTestFiles; }
    public void setIncludeTestFiles(boolean includeTestFiles) { this.includeTestFiles = includeTestFiles; }
    
    public boolean isIncludeGeneratedFiles() { return includeGeneratedFiles; }
    public void setIncludeGeneratedFiles(boolean includeGeneratedFiles) { this.includeGeneratedFiles = includeGeneratedFiles; }
    
    public boolean isEnableFrameworkDetection() { return enableFrameworkDetection; }
    public void setEnableFrameworkDetection(boolean enableFrameworkDetection) { this.enableFrameworkDetection = enableFrameworkDetection; }
    
    public Set<String> getFrameworksToDetect() { return frameworksToDetect; }
    public void setFrameworksToDetect(Set<String> frameworksToDetect) { this.frameworksToDetect = frameworksToDetect; }
    
    public boolean isExtractCallGraph() { return extractCallGraph; }
    public void setExtractCallGraph(boolean extractCallGraph) { this.extractCallGraph = extractCallGraph; }
    
    public boolean isExtractTypeUsage() { return extractTypeUsage; }
    public void setExtractTypeUsage(boolean extractTypeUsage) { this.extractTypeUsage = extractTypeUsage; }
    
    public boolean isExtractInheritance() { return extractInheritance; }
    public void setExtractInheritance(boolean extractInheritance) { this.extractInheritance = extractInheritance; }
    
    public boolean isExtractAnnotations() { return extractAnnotations; }
    public void setExtractAnnotations(boolean extractAnnotations) { this.extractAnnotations = extractAnnotations; }
    
    public boolean isExtractFieldRelationships() { return extractFieldRelationships; }
    public void setExtractFieldRelationships(boolean extractFieldRelationships) { this.extractFieldRelationships = extractFieldRelationships; }
    
    public boolean isExtractDependencies() { return extractDependencies; }
    public void setExtractDependencies(boolean extractDependencies) { this.extractDependencies = extractDependencies; }
    
    public boolean isIncludeMavenDependencies() { return includeMavenDependencies; }
    public void setIncludeMavenDependencies(boolean includeMavenDependencies) { this.includeMavenDependencies = includeMavenDependencies; }
    
    public boolean isIncludeGradleDependencies() { return includeGradleDependencies; }
    public void setIncludeGradleDependencies(boolean includeGradleDependencies) { this.includeGradleDependencies = includeGradleDependencies; }
    
    public boolean isIncludeTransitiveDependencies() { return includeTransitiveDependencies; }
    public void setIncludeTransitiveDependencies(boolean includeTransitiveDependencies) { this.includeTransitiveDependencies = includeTransitiveDependencies; }
    
    public int getMaxMemoryMB() { return maxMemoryMB; }
    public void setMaxMemoryMB(int maxMemoryMB) { this.maxMemoryMB = maxMemoryMB; }
    
    public boolean isEnableParallelProcessing() { return enableParallelProcessing; }
    public void setEnableParallelProcessing(boolean enableParallelProcessing) { this.enableParallelProcessing = enableParallelProcessing; }
    
    public int getMaxThreads() { return maxThreads; }
    public void setMaxThreads(int maxThreads) { this.maxThreads = maxThreads; }
    
    public boolean isEnableProgressReporting() { return enableProgressReporting; }
    public void setEnableProgressReporting(boolean enableProgressReporting) { this.enableProgressReporting = enableProgressReporting; }
    
    public boolean isPrettyPrintJson() { return prettyPrintJson; }
    public void setPrettyPrintJson(boolean prettyPrintJson) { this.prettyPrintJson = prettyPrintJson; }
    
    public boolean isIncludeSourceCode() { return includeSourceCode; }
    public void setIncludeSourceCode(boolean includeSourceCode) { this.includeSourceCode = includeSourceCode; }
    
    public boolean isIncludeLineNumbers() { return includeLineNumbers; }
    public void setIncludeLineNumbers(boolean includeLineNumbers) { this.includeLineNumbers = includeLineNumbers; }
    
    public boolean isIncludeFileChecksums() { return includeFileChecksums; }
    public void setIncludeFileChecksums(boolean includeFileChecksums) { this.includeFileChecksums = includeFileChecksums; }
    
    public Set<String> getExcludePatterns() { return excludePatterns; }
    public void setExcludePatterns(Set<String> excludePatterns) { this.excludePatterns = excludePatterns; }
    
    public Set<String> getIncludePatterns() { return includePatterns; }
    public void setIncludePatterns(Set<String> includePatterns) { this.includePatterns = includePatterns; }
    
    public Set<String> getExcludePackages() { return excludePackages; }
    public void setExcludePackages(Set<String> excludePackages) { this.excludePackages = excludePackages; }
    
    public Set<String> getIncludePackages() { return includePackages; }
    public void setIncludePackages(Set<String> includePackages) { this.includePackages = includePackages; }
    
    public boolean isValidateOutput() { return validateOutput; }
    public void setValidateOutput(boolean validateOutput) { this.validateOutput = validateOutput; }
    
    public boolean isFailOnErrors() { return failOnErrors; }
    public void setFailOnErrors(boolean failOnErrors) { this.failOnErrors = failOnErrors; }
    
    public int getMaxErrorsBeforeAbort() { return maxErrorsBeforeAbort; }
    public void setMaxErrorsBeforeAbort(int maxErrorsBeforeAbort) { this.maxErrorsBeforeAbort = maxErrorsBeforeAbort; }
    
    @Override
    public String toString() {
        return String.format("ParserConfig{frameworks=%s, callGraph=%s, typeUsage=%s, dependencies=%s, threads=%d}", 
                           enableFrameworkDetection, extractCallGraph, extractTypeUsage, extractDependencies, maxThreads);
    }
}
