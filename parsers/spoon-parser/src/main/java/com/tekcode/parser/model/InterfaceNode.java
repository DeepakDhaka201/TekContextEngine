package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class InterfaceNode {
    @JsonProperty("id")
    private String id; // Globally unique identifier
    
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("fullyQualifiedName")
    private String fullyQualifiedName;
    
    @JsonProperty("comment")
    private String comment;
    
    @JsonProperty("filePath")
    private String filePath;
    
    @JsonProperty("startLine")
    private int startLine;
    
    @JsonProperty("endLine")
    private int endLine;
    
    @JsonProperty("decorators")
    private List<DecoratorInfo> decorators;

    public InterfaceNode() {}

    public InterfaceNode(String name, String fullyQualifiedName) {
        this.name = name;
        this.fullyQualifiedName = fullyQualifiedName;
    }

    // Getters and setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getFullyQualifiedName() {
        return fullyQualifiedName;
    }

    public void setFullyQualifiedName(String fullyQualifiedName) {
        this.fullyQualifiedName = fullyQualifiedName;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
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
    
    public List<DecoratorInfo> getDecorators() {
        return decorators;
    }

    public void setDecorators(List<DecoratorInfo> decorators) {
        this.decorators = decorators;
    }
}