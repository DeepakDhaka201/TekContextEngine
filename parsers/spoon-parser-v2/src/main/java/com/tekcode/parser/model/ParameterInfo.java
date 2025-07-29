package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

/**
 * Represents method parameter information
 */
@JsonPropertyOrder({"name", "type", "isVarArgs", "isFinal"})
public class ParameterInfo {
    
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("type")
    private String type;
    
    @JsonProperty("isVarArgs")
    private boolean isVarArgs;
    
    @JsonProperty("isFinal")
    private boolean isFinal;
    
    // === Getters and Setters ===
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getType() {
        return type;
    }
    
    public void setType(String type) {
        this.type = type;
    }
    
    public boolean isVarArgs() {
        return isVarArgs;
    }
    
    public void setIsVarArgs(boolean isVarArgs) {
        this.isVarArgs = isVarArgs;
    }
    
    public boolean isFinal() {
        return isFinal;
    }
    
    public void setIsFinal(boolean isFinal) {
        this.isFinal = isFinal;
    }
    
    @Override
    public String toString() {
        return String.format("ParameterInfo{name='%s', type='%s'}", name, type);
    }
}
