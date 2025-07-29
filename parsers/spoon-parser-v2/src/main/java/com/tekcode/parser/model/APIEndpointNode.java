package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Map;
import java.util.HashMap;

/**
 * Represents an API endpoint
 */
public class APIEndpointNode {
    
    @JsonProperty("id")
    private String id;
    
    @JsonProperty("path")
    private String path;
    
    @JsonProperty("httpMethod")
    private String httpMethod;
    
    @JsonProperty("methodName")
    private String methodName;
    
    @JsonProperty("className")
    private String className;
    
    @JsonProperty("properties")
    private Map<String, Object> properties = new HashMap<>();
    
    // === Getters and Setters ===
    
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }
    
    public String getHttpMethod() { return httpMethod; }
    public void setHttpMethod(String httpMethod) { this.httpMethod = httpMethod; }
    
    public String getMethodName() { return methodName; }
    public void setMethodName(String methodName) { this.methodName = methodName; }
    
    public String getClassName() { return className; }
    public void setClassName(String className) { this.className = className; }
    
    public Map<String, Object> getProperties() { return properties; }
    public void setProperties(Map<String, Object> properties) { this.properties = properties; }
}
