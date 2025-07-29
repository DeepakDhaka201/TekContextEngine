package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

/**
 * Represents a field in a Java class
 */
public class FieldNode {
    
    @JsonProperty("id")
    private String id;
    
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("type")
    private String type;
    
    @JsonProperty("visibility")
    private String visibility;
    
    @JsonProperty("isStatic")
    private boolean isStatic;
    
    @JsonProperty("isFinal")
    private boolean isFinal;
    
    @JsonProperty("decorators")
    private List<DecoratorInfo> decorators;
    
    @JsonProperty("properties")
    private Map<String, Object> properties = new HashMap<>();
    
    // === Getters and Setters ===
    
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    
    public String getVisibility() { return visibility; }
    public void setVisibility(String visibility) { this.visibility = visibility; }
    
    public boolean isStatic() { return isStatic; }
    public void setIsStatic(boolean isStatic) { this.isStatic = isStatic; }
    
    public boolean isFinal() { return isFinal; }
    public void setIsFinal(boolean isFinal) { this.isFinal = isFinal; }
    
    public List<DecoratorInfo> getDecorators() { return decorators; }
    public void setDecorators(List<DecoratorInfo> decorators) { this.decorators = decorators; }
    
    public Map<String, Object> getProperties() { return properties; }
    public void setProperties(Map<String, Object> properties) { this.properties = properties; }
}
