package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

/**
 * Represents a method or constructor in the codebase
 */
@JsonPropertyOrder({
    "id", "name", "signature", "returnType", "comment", "body", "visibility", 
    "isAbstract", "isFinal", "isStatic", "isConstructor", "isTestMethod",
    "filePath", "startLine", "endLine", "cyclomaticComplexity", "parameters",
    "decorators", "properties"
})
public class MethodNode {
    
    @JsonProperty("id")
    private String id;
    
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("signature")
    private String signature;
    
    @JsonProperty("returnType")
    private String returnType;
    
    @JsonProperty("comment")
    private String comment;
    
    @JsonProperty("body")
    private String body;
    
    @JsonProperty("visibility")
    private String visibility;
    
    @JsonProperty("isAbstract")
    private boolean isAbstract;
    
    @JsonProperty("isFinal")
    private boolean isFinal;
    
    @JsonProperty("isStatic")
    private boolean isStatic;
    
    @JsonProperty("isConstructor")
    private boolean isConstructor;
    
    @JsonProperty("isTestMethod")
    private boolean isTestMethod;
    
    @JsonProperty("filePath")
    private String filePath;
    
    @JsonProperty("startLine")
    private int startLine;
    
    @JsonProperty("endLine")
    private int endLine;
    
    @JsonProperty("cyclomaticComplexity")
    private int cyclomaticComplexity;
    
    @JsonProperty("parameters")
    private List<ParameterInfo> parameters;
    
    @JsonProperty("decorators")
    private List<DecoratorInfo> decorators;
    
    @JsonProperty("properties")
    private Map<String, Object> properties = new HashMap<>();
    
    // === Getters and Setters ===
    
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
    
    public String getSignature() {
        return signature;
    }
    
    public void setSignature(String signature) {
        this.signature = signature;
    }
    
    public String getReturnType() {
        return returnType;
    }
    
    public void setReturnType(String returnType) {
        this.returnType = returnType;
    }
    
    public String getComment() {
        return comment;
    }
    
    public void setComment(String comment) {
        this.comment = comment;
    }
    
    public String getBody() {
        return body;
    }
    
    public void setBody(String body) {
        this.body = body;
    }
    
    public String getVisibility() {
        return visibility;
    }
    
    public void setVisibility(String visibility) {
        this.visibility = visibility;
    }
    
    public boolean isAbstract() {
        return isAbstract;
    }
    
    public void setIsAbstract(boolean isAbstract) {
        this.isAbstract = isAbstract;
    }
    
    public boolean isFinal() {
        return isFinal;
    }
    
    public void setIsFinal(boolean isFinal) {
        this.isFinal = isFinal;
    }
    
    public boolean isStatic() {
        return isStatic;
    }
    
    public void setIsStatic(boolean isStatic) {
        this.isStatic = isStatic;
    }
    
    public boolean isConstructor() {
        return isConstructor;
    }
    
    public void setIsConstructor(boolean isConstructor) {
        this.isConstructor = isConstructor;
    }
    
    public boolean isTestMethod() {
        return isTestMethod;
    }
    
    public void setIsTestMethod(boolean isTestMethod) {
        this.isTestMethod = isTestMethod;
    }
    
    public String getFilePath() {
        return filePath;
    }
    
    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }
    
    public int getStartLine() {
        return startLine;
    }
    
    public void setStartLine(int startLine) {
        this.startLine = startLine;
    }
    
    public int getEndLine() {
        return endLine;
    }
    
    public void setEndLine(int endLine) {
        this.endLine = endLine;
    }
    
    public int getCyclomaticComplexity() {
        return cyclomaticComplexity;
    }
    
    public void setCyclomaticComplexity(int cyclomaticComplexity) {
        this.cyclomaticComplexity = cyclomaticComplexity;
    }
    
    public List<ParameterInfo> getParameters() {
        return parameters;
    }
    
    public void setParameters(List<ParameterInfo> parameters) {
        this.parameters = parameters;
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
        return String.format("MethodNode{name='%s', signature='%s'}", name, signature);
    }
}
