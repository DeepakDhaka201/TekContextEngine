package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.List;

public class MethodNode {
    @JsonProperty("id")
    private String id; // Globally unique identifier
    
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
    
    @JsonProperty("cyclomaticComplexity")
    private int cyclomaticComplexity;
    
    @JsonProperty("parameters")
    private List<String> parameters = new ArrayList<>();
    
    @JsonProperty("isAbstract")
    private boolean isAbstract;
    
    @JsonProperty("isStatic")
    private boolean isStatic;
    
    @JsonProperty("isFinal")
    private boolean isFinal;
    
    @JsonProperty("isSynchronized")
    private boolean isSynchronized;
    
    @JsonProperty("filePath")
    private String filePath;
    
    @JsonProperty("className")
    private String className;
    
    @JsonProperty("startLine")
    private int startLine;
    
    @JsonProperty("endLine")
    private int endLine;
    
    @JsonProperty("isConstructor")
    private boolean isConstructor;
    
    
    // Spring Boot specific properties
    @JsonProperty("decorators")
    private List<DecoratorInfo> decorators;
    
    @JsonProperty("isApiEndpoint")
    private boolean isApiEndpoint;
    
    @JsonProperty("httpMethod")
    private String httpMethod;
    
    @JsonProperty("requestPath")
    private String requestPath;
    

    public MethodNode() {}

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

    public int getCyclomaticComplexity() {
        return cyclomaticComplexity;
    }

    public void setCyclomaticComplexity(int cyclomaticComplexity) {
        this.cyclomaticComplexity = cyclomaticComplexity;
    }

    public List<String> getParameters() {
        return parameters;
    }

    public void setParameters(List<String> parameters) {
        this.parameters = parameters;
    }

    public boolean isAbstract() {
        return isAbstract;
    }

    public void setAbstract(boolean abstract1) {
        isAbstract = abstract1;
    }

    public boolean isStatic() {
        return isStatic;
    }

    public void setStatic(boolean static1) {
        isStatic = static1;
    }

    public boolean isFinal() {
        return isFinal;
    }

    public void setFinal(boolean final1) {
        isFinal = final1;
    }

    public boolean isSynchronized() {
        return isSynchronized;
    }

    public void setSynchronized(boolean synchronized1) {
        isSynchronized = synchronized1;
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

    public boolean isConstructor() {
        return isConstructor;
    }

    public void setConstructor(boolean constructor) {
        isConstructor = constructor;
    }

    
    public List<DecoratorInfo> getDecorators() {
        return decorators;
    }

    public void setDecorators(List<DecoratorInfo> decorators) {
        this.decorators = decorators;
    }

    public boolean isApiEndpoint() {
        return isApiEndpoint;
    }

    public void setApiEndpoint(boolean apiEndpoint) {
        isApiEndpoint = apiEndpoint;
    }

    public String getHttpMethod() {
        return httpMethod;
    }

    public void setHttpMethod(String httpMethod) {
        this.httpMethod = httpMethod;
    }

    public String getRequestPath() {
        return requestPath;
    }

    public void setRequestPath(String requestPath) {
        this.requestPath = requestPath;
    }

}