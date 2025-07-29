package com.tekcode.parser.core;

import com.tekcode.parser.config.ParserConfig;

/**
 * Context object that holds shared state and configuration for the parsing process
 * 
 * This class provides a centralized way to access configuration and shared data
 * across all processors during the parsing operation.
 */
public class ParsingContext {
    
    private final String codebaseName;
    private final String projectPath;
    private final ParserConfig config;
    
    // Shared state
    private FrameworkInfo frameworkInfo;
    private int errorCount = 0;
    private int warningCount = 0;
    
    public ParsingContext(String codebaseName, String projectPath, ParserConfig config) {
        this.codebaseName = codebaseName;
        this.projectPath = projectPath;
        this.config = config;
    }
    
    // === Getters ===
    
    public String getCodebaseName() {
        return codebaseName;
    }
    
    public String getProjectPath() {
        return projectPath;
    }
    
    public ParserConfig getConfig() {
        return config;
    }
    
    public FrameworkInfo getFrameworkInfo() {
        return frameworkInfo;
    }
    
    public void setFrameworkInfo(FrameworkInfo frameworkInfo) {
        this.frameworkInfo = frameworkInfo;
    }
    
    public int getErrorCount() {
        return errorCount;
    }
    
    public int getWarningCount() {
        return warningCount;
    }
    
    // === Error/Warning tracking ===
    
    public void incrementErrorCount() {
        this.errorCount++;
    }
    
    public void incrementWarningCount() {
        this.warningCount++;
    }
    
    public boolean hasExceededMaxErrors() {
        return errorCount >= config.getMaxErrorsBeforeAbort();
    }
    
    // === Convenience methods ===
    
    public boolean shouldIncludePrivateMembers() {
        return config.isIncludePrivateMembers();
    }
    
    public boolean shouldIncludeComments() {
        return config.isIncludeComments();
    }
    
    public boolean shouldIncludeMethodBodies() {
        return config.isIncludeMethodBodies();
    }
    
    public boolean shouldIncludeTestFiles() {
        return config.isIncludeTestFiles();
    }
    
    public boolean shouldExtractCallGraph() {
        return config.isExtractCallGraph();
    }
    
    public boolean shouldExtractTypeUsage() {
        return config.isExtractTypeUsage();
    }
    
    public boolean shouldExtractInheritance() {
        return config.isExtractInheritance();
    }
    
    public boolean shouldExtractAnnotations() {
        return config.isExtractAnnotations();
    }
    
    public boolean shouldExtractFieldRelationships() {
        return config.isExtractFieldRelationships();
    }
    
    public boolean isFrameworkDetected(String frameworkName) {
        return frameworkInfo != null && frameworkInfo.isFrameworkDetected(frameworkName);
    }
    
    public boolean isSpringBootProject() {
        return isFrameworkDetected("spring-boot");
    }
    
    public boolean isTestFrameworkProject() {
        return isFrameworkDetected("junit") || isFrameworkDetected("testng");
    }
}
