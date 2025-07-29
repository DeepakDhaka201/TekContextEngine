package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ClassNode {
    @JsonProperty("id")
    private String id; // Globally unique identifier
    
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("fullyQualifiedName")
    private String fullyQualifiedName;
    
    @JsonProperty("comment")
    private String comment;
    
    @JsonProperty("visibility")
    private String visibility;
    
    @JsonProperty("isAbstract")
    private boolean isAbstract;
    
    @JsonProperty("isFinal")
    private boolean isFinal;
    
    @JsonProperty("isStatic")
    private boolean isStatic;
    
    @JsonProperty("filePath")
    private String filePath;
    
    @JsonProperty("startLine")
    private int startLine;
    
    @JsonProperty("endLine")
    private int endLine;
    
    // Framework-specific properties
    @JsonProperty("decorators")
    private List<DecoratorInfo> decorators;
    
    // Spring Boot specific properties
    @JsonProperty("isController")
    private boolean isController;
    
    @JsonProperty("isService")
    private boolean isService;
    
    @JsonProperty("isRepository")
    private boolean isRepository;
    
    @JsonProperty("isComponent")
    private boolean isComponent;
    
    @JsonProperty("isConfiguration")
    private boolean isConfiguration;
    
    @JsonProperty("isEntity")
    private boolean isEntity;
    
    // Additional properties for framework-specific data
    @JsonProperty("properties")
    private Map<String, Object> properties = new HashMap<>();

    public ClassNode() {}

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

    public String getVisibility() {
        return visibility;
    }

    public void setVisibility(String visibility) {
        this.visibility = visibility;
    }

    public boolean isAbstract() {
        return isAbstract;
    }

    public void setAbstract(boolean abstract1) {
        isAbstract = abstract1;
    }

    public boolean isFinal() {
        return isFinal;
    }

    public void setFinal(boolean final1) {
        isFinal = final1;
    }

    public boolean isStatic() {
        return isStatic;
    }

    public void setStatic(boolean static1) {
        isStatic = static1;
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

    public boolean isController() {
        return isController;
    }

    public void setController(boolean controller) {
        isController = controller;
    }

    public boolean isService() {
        return isService;
    }

    public void setService(boolean service) {
        isService = service;
    }

    public boolean isRepository() {
        return isRepository;
    }

    public void setRepository(boolean repository) {
        isRepository = repository;
    }

    public boolean isComponent() {
        return isComponent;
    }

    public void setComponent(boolean component) {
        isComponent = component;
    }

    public boolean isConfiguration() {
        return isConfiguration;
    }

    public void setConfiguration(boolean configuration) {
        isConfiguration = configuration;
    }

    public boolean isEntity() {
        return isEntity;
    }

    public void setEntity(boolean entity) {
        isEntity = entity;
    }
    
    public Map<String, Object> getProperties() {
        return properties;
    }
    
    public void setProperties(Map<String, Object> properties) {
        this.properties = properties;
    }
    
    public void addProperty(String key, Object value) {
        this.properties.put(key, value);
    }
}