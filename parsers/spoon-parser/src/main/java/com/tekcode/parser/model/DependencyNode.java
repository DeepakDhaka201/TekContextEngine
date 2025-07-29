package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class DependencyNode {
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("version")
    private String version;
    
    @JsonProperty("scope")
    private String scope;
    
    @JsonProperty("type")
    private String type; // maven, gradle, etc.

    public DependencyNode() {}

    public DependencyNode(String name, String version) {
        this.name = name;
        this.version = version;
    }

    // Getters and setters
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public String getScope() {
        return scope;
    }

    public void setScope(String scope) {
        this.scope = scope;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }
}