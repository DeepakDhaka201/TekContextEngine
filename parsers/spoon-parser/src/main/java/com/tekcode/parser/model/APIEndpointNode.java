package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class APIEndpointNode {
    @JsonProperty("id")
    private String id; // Globally unique identifier
    
    @JsonProperty("httpMethod")
    private String httpMethod;
    
    @JsonProperty("path")
    private String path;
    
    @JsonProperty("description")
    private String description;
    
    @JsonProperty("methodName")
    private String methodName;
    
    @JsonProperty("className")
    private String className;
    
    @JsonProperty("filePath")
    private String filePath;
    
    @JsonProperty("parameters")
    private List<String> parameters;
    
    @JsonProperty("returnType")
    private String returnType;

    public APIEndpointNode() {}

    // Getters and setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getHttpMethod() {
        return httpMethod;
    }

    public void setHttpMethod(String httpMethod) {
        this.httpMethod = httpMethod;
    }

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getMethodName() {
        return methodName;
    }

    public void setMethodName(String methodName) {
        this.methodName = methodName;
    }

    public String getClassName() {
        return className;
    }

    public void setClassName(String className) {
        this.className = className;
    }

    public String getFilePath() {
        return filePath;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public List<String> getParameters() {
        return parameters;
    }

    public void setParameters(List<String> parameters) {
        this.parameters = parameters;
    }

    public String getReturnType() {
        return returnType;
    }

    public void setReturnType(String returnType) {
        this.returnType = returnType;
    }

}