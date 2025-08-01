package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import java.util.Map;
import java.util.HashMap;

/**
 * Represents a method reference in the codebase
 */
@JsonPropertyOrder({
    "id", "referenceType", "targetClass", "targetMethod", "functionalInterface", 
    "filePath", "startLine", "endLine", "enclosingMethodId", "properties"
})
public class MethodReferenceNode {
    
    @JsonProperty("id")
    private String id;
    
    @JsonProperty("referenceType")
    private String referenceType; // STATIC, INSTANCE_BOUND, INSTANCE_UNBOUND, CONSTRUCTOR
    
    @JsonProperty("targetClass")
    private String targetClass;
    
    @JsonProperty("targetMethod")
    private String targetMethod;
    
    @JsonProperty("functionalInterface")
    private String functionalInterface;
    
    @JsonProperty("filePath")
    private String filePath;
    
    @JsonProperty("startLine")
    private int startLine;
    
    @JsonProperty("endLine")
    private int endLine;
    
    @JsonProperty("enclosingMethodId")
    private String enclosingMethodId;
    
    @JsonProperty("enclosingClassId")
    private String enclosingClassId;
    
    @JsonProperty("properties")
    private Map<String, Object> properties = new HashMap<>();
    
    // === Getters and Setters ===
    
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getReferenceType() {
        return referenceType;
    }
    
    public void setReferenceType(String referenceType) {
        this.referenceType = referenceType;
    }
    
    public String getTargetClass() {
        return targetClass;
    }
    
    public void setTargetClass(String targetClass) {
        this.targetClass = targetClass;
    }
    
    public String getTargetMethod() {
        return targetMethod;
    }
    
    public void setTargetMethod(String targetMethod) {
        this.targetMethod = targetMethod;
    }
    
    public String getFunctionalInterface() {
        return functionalInterface;
    }
    
    public void setFunctionalInterface(String functionalInterface) {
        this.functionalInterface = functionalInterface;
    }
    
    public String getFilePath() {
        return filePath;
    }
    
    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }
    
    public int getStartLine() {
        return startLine;
    }
    
    public void setStartLine(int startLine) {
        this.startLine = startLine;
    }
    
    public int getEndLine() {
        return endLine;
    }
    
    public void setEndLine(int endLine) {
        this.endLine = endLine;
    }
    
    public String getEnclosingMethodId() {
        return enclosingMethodId;
    }
    
    public void setEnclosingMethodId(String enclosingMethodId) {
        this.enclosingMethodId = enclosingMethodId;
    }
    
    public String getEnclosingClassId() {
        return enclosingClassId;
    }
    
    public void setEnclosingClassId(String enclosingClassId) {
        this.enclosingClassId = enclosingClassId;
    }
    
    public Map<String, Object> getProperties() {
        return properties;
    }
    
    public void setProperties(Map<String, Object> properties) {
        this.properties = properties;
    }
    
    @Override
    public String toString() {
        return String.format("MethodReferenceNode{id='%s', type='%s', target='%s::%s'}", 
                           id, referenceType, targetClass, targetMethod);
    }
}
