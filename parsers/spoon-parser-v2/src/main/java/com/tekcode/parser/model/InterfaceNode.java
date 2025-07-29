package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

/**
 * Represents a Java interface in the codebase
 */
public class InterfaceNode {
    
    @JsonProperty("id")
    private String id;
    
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("fullyQualifiedName")
    private String fullyQualifiedName;
    
    @JsonProperty("comment")
    private String comment;
    
    @JsonProperty("visibility")
    private String visibility;
    
    @JsonProperty("filePath")
    private String filePath;
    
    @JsonProperty("startLine")
    private int startLine;
    
    @JsonProperty("endLine")
    private int endLine;
    
    @JsonProperty("decorators")
    private List<DecoratorInfo> decorators;
    
    @JsonProperty("methodCount")
    private int methodCount;
    
    @JsonProperty("properties")
    private Map<String, Object> properties = new HashMap<>();
    
    // === Getters and Setters ===
    
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getFullyQualifiedName() { return fullyQualifiedName; }
    public void setFullyQualifiedName(String fullyQualifiedName) { this.fullyQualifiedName = fullyQualifiedName; }
    
    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
    
    public String getVisibility() { return visibility; }
    public void setVisibility(String visibility) { this.visibility = visibility; }
    
    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }
    
    public int getStartLine() { return startLine; }
    public void setStartLine(int startLine) { this.startLine = startLine; }
    
    public int getEndLine() { return endLine; }
    public void setEndLine(int endLine) { this.endLine = endLine; }
    
    public List<DecoratorInfo> getDecorators() { return decorators; }
    public void setDecorators(List<DecoratorInfo> decorators) { this.decorators = decorators; }
    
    public int getMethodCount() { return methodCount; }
    public void setMethodCount(int methodCount) { this.methodCount = methodCount; }
    
    public Map<String, Object> getProperties() { return properties; }
    public void setProperties(Map<String, Object> properties) { this.properties = properties; }
}
