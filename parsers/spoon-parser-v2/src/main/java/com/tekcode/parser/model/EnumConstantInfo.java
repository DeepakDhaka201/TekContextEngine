package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

/**
 * Represents an enum constant
 */
@JsonPropertyOrder({"name", "ordinal", "arguments", "comment", "decorators", "properties"})
public class EnumConstantInfo {
    
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("ordinal")
    private int ordinal;
    
    @JsonProperty("arguments")
    private List<String> arguments;
    
    @JsonProperty("comment")
    private String comment;
    
    @JsonProperty("decorators")
    private List<DecoratorInfo> decorators;
    
    @JsonProperty("properties")
    private Map<String, Object> properties = new HashMap<>();
    
    // === Getters and Setters ===
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public int getOrdinal() {
        return ordinal;
    }
    
    public void setOrdinal(int ordinal) {
        this.ordinal = ordinal;
    }
    
    public List<String> getArguments() {
        return arguments;
    }
    
    public void setArguments(List<String> arguments) {
        this.arguments = arguments;
    }
    
    public String getComment() {
        return comment;
    }
    
    public void setComment(String comment) {
        this.comment = comment;
    }
    
    public List<DecoratorInfo> getDecorators() {
        return decorators;
    }
    
    public void setDecorators(List<DecoratorInfo> decorators) {
        this.decorators = decorators;
    }
    
    public Map<String, Object> getProperties() {
        return properties;
    }
    
    public void setProperties(Map<String, Object> properties) {
        this.properties = properties;
    }
    
    @Override
    public String toString() {
        return String.format("EnumConstantInfo{name='%s', ordinal=%d}", name, ordinal);
    }
}
