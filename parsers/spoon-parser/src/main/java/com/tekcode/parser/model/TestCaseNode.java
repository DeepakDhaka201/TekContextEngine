package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class TestCaseNode {
    @JsonProperty("id")
    private String id; // Globally unique identifier
    
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("filePath")
    private String filePath;
    
    @JsonProperty("className")
    private String className;
    
    @JsonProperty("methodName")
    private String methodName;
    
    @JsonProperty("testType")
    private String testType; // unit, integration, e2e
    
    @JsonProperty("framework")
    private String framework; // JUnit, TestNG, etc.

    public TestCaseNode() {}

    // Getters and setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getFilePath() {
        return filePath;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public String getClassName() {
        return className;
    }

    public void setClassName(String className) {
        this.className = className;
    }

    public String getMethodName() {
        return methodName;
    }

    public void setMethodName(String methodName) {
        this.methodName = methodName;
    }

    public String getTestType() {
        return testType;
    }

    public void setTestType(String testType) {
        this.testType = testType;
    }

    public String getFramework() {
        return framework;
    }

    public void setFramework(String framework) {
        this.framework = framework;
    }
}