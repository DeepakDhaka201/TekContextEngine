package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.HashMap;
import java.util.Map;

public class Relationship {
    @JsonProperty("type")
    private String type;
    
    @JsonProperty("startNodeType")
    private String startNodeType;
    
    @JsonProperty("startNodeId")
    private String startNodeId;
    
    @JsonProperty("endNodeType")
    private String endNodeType;
    
    @JsonProperty("endNodeId")
    private String endNodeId;
    
    @JsonProperty("properties")
    private Map<String, Object> properties = new HashMap<>();

    public Relationship() {}

    public Relationship(String type, String startNodeType, String startNodeId, 
                       String endNodeType, String endNodeId) {
        this.type = type;
        this.startNodeType = startNodeType;
        this.startNodeId = startNodeId;
        this.endNodeType = endNodeType;
        this.endNodeId = endNodeId;
    }

    // Getters and setters
    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getStartNodeType() {
        return startNodeType;
    }

    public void setStartNodeType(String startNodeType) {
        this.startNodeType = startNodeType;
    }

    public String getStartNodeId() {
        return startNodeId;
    }

    public void setStartNodeId(String startNodeId) {
        this.startNodeId = startNodeId;
    }

    public String getEndNodeType() {
        return endNodeType;
    }

    public void setEndNodeType(String endNodeType) {
        this.endNodeType = endNodeType;
    }

    public String getEndNodeId() {
        return endNodeId;
    }

    public void setEndNodeId(String endNodeId) {
        this.endNodeId = endNodeId;
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