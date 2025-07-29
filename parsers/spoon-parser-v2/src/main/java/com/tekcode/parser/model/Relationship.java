package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Map;
import java.util.HashMap;

/**
 * Represents a relationship between entities
 */
public class Relationship {
    
    @JsonProperty("id")
    private String id;
    
    @JsonProperty("type")
    private String type;
    
    @JsonProperty("sourceType")
    private String sourceType;
    
    @JsonProperty("sourceId")
    private String sourceId;
    
    @JsonProperty("targetType")
    private String targetType;
    
    @JsonProperty("targetId")
    private String targetId;
    
    @JsonProperty("properties")
    private Map<String, Object> properties = new HashMap<>();
    
    public Relationship() {}
    
    public Relationship(String type, String sourceType, String sourceId, String targetType, String targetId) {
        this.type = type;
        this.sourceType = sourceType;
        this.sourceId = sourceId;
        this.targetType = targetType;
        this.targetId = targetId;
    }
    
    // === Getters and Setters ===
    
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    
    public String getSourceType() { return sourceType; }
    public void setSourceType(String sourceType) { this.sourceType = sourceType; }
    
    public String getSourceId() { return sourceId; }
    public void setSourceId(String sourceId) { this.sourceId = sourceId; }
    
    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }
    
    public String getTargetId() { return targetId; }
    public void setTargetId(String targetId) { this.targetId = targetId; }
    
    public Map<String, Object> getProperties() { return properties; }
    public void setProperties(Map<String, Object> properties) { this.properties = properties; }
    
    public void addProperty(String key, Object value) {
        this.properties.put(key, value);
    }
}
