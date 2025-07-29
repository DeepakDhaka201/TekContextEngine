package com.tekcode.parser.core;

import java.util.*;

/**
 * Information about detected frameworks in the project
 */
public class FrameworkInfo {
    
    private final Set<String> detectedFrameworks;
    private final Map<String, String> frameworkVersions;
    private String primaryFramework;
    
    public FrameworkInfo() {
        this.detectedFrameworks = new HashSet<>();
        this.frameworkVersions = new HashMap<>();
    }
    
    public void addFramework(String framework) {
        detectedFrameworks.add(framework);
        if (primaryFramework == null) {
            primaryFramework = framework;
        }
    }
    
    public void addFramework(String framework, String version) {
        addFramework(framework);
        frameworkVersions.put(framework, version);
    }
    
    public void setPrimaryFramework(String framework) {
        this.primaryFramework = framework;
    }
    
    public boolean isFrameworkDetected(String framework) {
        return detectedFrameworks.contains(framework);
    }
    
    public Set<String> getAllFrameworks() {
        return Collections.unmodifiableSet(detectedFrameworks);
    }
    
    public String getPrimaryFramework() {
        return primaryFramework != null ? primaryFramework : "java";
    }
    
    public String getFrameworkVersion(String framework) {
        return frameworkVersions.get(framework);
    }
    
    public Map<String, String> getAllFrameworkVersions() {
        return Collections.unmodifiableMap(frameworkVersions);
    }
    
    public boolean isEmpty() {
        return detectedFrameworks.isEmpty();
    }
    
    @Override
    public String toString() {
        return String.format("FrameworkInfo{primary=%s, detected=%s}", 
                           primaryFramework, detectedFrameworks);
    }
}
