package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Map;
import java.util.HashMap;

/**
 * Represents a documentation file
 */
public class DocumentNode {
    
    @JsonProperty("id")
    private String id;
    
    @JsonProperty("path")
    private String path;
    
    @JsonProperty("title")
    private String title;
    
    @JsonProperty("content")
    private String content;
    
    @JsonProperty("type")
    private String type;
    
    @JsonProperty("properties")
    private Map<String, Object> properties = new HashMap<>();
    
    // === Getters and Setters ===
    
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    
    public Map<String, Object> getProperties() { return properties; }
    public void setProperties(Map<String, Object> properties) { this.properties = properties; }
}
