package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class DecoratorInfo {
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("arguments")
    private List<Object> arguments = new ArrayList<>();
    
    @JsonProperty("properties")
    private Map<String, Object> properties = new HashMap<>();

    public DecoratorInfo() {}

    public DecoratorInfo(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<Object> getArguments() {
        return arguments;
    }

    public void setArguments(List<Object> arguments) {
        this.arguments = arguments;
    }

    public void addArgument(Object argument) {
        this.arguments.add(argument);
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