package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

/**
 * Represents a Java class in the codebase
 */
@JsonPropertyOrder({
    "id", "name", "fullyQualifiedName", "comment", "visibility", "isAbstract", "isFinal", "isStatic",
    "isInnerClass", "isAnonymous", "isGeneric", "filePath", "startLine", "endLine", "decorators",
    "isController", "isService", "isRepository", "isComponent", "isConfiguration", "isEntity", "isTestClass",
    "fieldCount", "methodCount", "constructorCount", "inheritanceDepth", "genericTypeParameters", "properties"
})
public class ClassNode {
    
    @JsonProperty("id")
    private String id;
    
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("fullyQualifiedName")
    private String fullyQualifiedName;
    
    @JsonProperty("comment")
    private String comment;
    
    @JsonProperty("visibility")
    private String visibility;
    
    @JsonProperty("isAbstract")
    private boolean isAbstract;
    
    @JsonProperty("isFinal")
    private boolean isFinal;
    
    @JsonProperty("isStatic")
    private boolean isStatic;
    
    @JsonProperty("isInnerClass")
    private boolean isInnerClass;
    
    @JsonProperty("isAnonymous")
    private boolean isAnonymous;
    
    @JsonProperty("isGeneric")
    private boolean isGeneric;
    
    @JsonProperty("filePath")
    private String filePath;
    
    @JsonProperty("startLine")
    private int startLine;
    
    @JsonProperty("endLine")
    private int endLine;
    
    @JsonProperty("decorators")
    private List<DecoratorInfo> decorators;
    
    // Framework-specific properties
    @JsonProperty("isController")
    private boolean isController;
    
    @JsonProperty("isService")
    private boolean isService;
    
    @JsonProperty("isRepository")
    private boolean isRepository;
    
    @JsonProperty("isComponent")
    private boolean isComponent;
    
    @JsonProperty("isConfiguration")
    private boolean isConfiguration;
    
    @JsonProperty("isEntity")
    private boolean isEntity;
    
    @JsonProperty("isTestClass")
    private boolean isTestClass;
    
    // Metrics
    @JsonProperty("fieldCount")
    private int fieldCount;
    
    @JsonProperty("staticFieldCount")
    private int staticFieldCount;
    
    @JsonProperty("methodCount")
    private int methodCount;
    
    @JsonProperty("constructorCount")
    private int constructorCount;
    
    @JsonProperty("inheritanceDepth")
    private int inheritanceDepth;
    
    @JsonProperty("genericTypeParameters")
    private List<String> genericTypeParameters;
    
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
    
    public String getFullyQualifiedName() {
        return fullyQualifiedName;
    }
    
    public void setFullyQualifiedName(String fullyQualifiedName) {
        this.fullyQualifiedName = fullyQualifiedName;
    }
    
    public String getComment() {
        return comment;
    }
    
    public void setComment(String comment) {
        this.comment = comment;
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
    
    public boolean isInnerClass() {
        return isInnerClass;
    }
    
    public void setIsInnerClass(boolean isInnerClass) {
        this.isInnerClass = isInnerClass;
    }
    
    public boolean isAnonymous() {
        return isAnonymous;
    }
    
    public void setIsAnonymous(boolean isAnonymous) {
        this.isAnonymous = isAnonymous;
    }
    
    public boolean isGeneric() {
        return isGeneric;
    }
    
    public void setIsGeneric(boolean isGeneric) {
        this.isGeneric = isGeneric;
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
    
    public List<DecoratorInfo> getDecorators() {
        return decorators;
    }
    
    public void setDecorators(List<DecoratorInfo> decorators) {
        this.decorators = decorators;
    }
    
    public boolean isController() {
        return isController;
    }
    
    public void setIsController(boolean isController) {
        this.isController = isController;
    }
    
    public boolean isService() {
        return isService;
    }
    
    public void setIsService(boolean isService) {
        this.isService = isService;
    }
    
    public boolean isRepository() {
        return isRepository;
    }
    
    public void setIsRepository(boolean isRepository) {
        this.isRepository = isRepository;
    }
    
    public boolean isComponent() {
        return isComponent;
    }
    
    public void setIsComponent(boolean isComponent) {
        this.isComponent = isComponent;
    }
    
    public boolean isConfiguration() {
        return isConfiguration;
    }
    
    public void setIsConfiguration(boolean isConfiguration) {
        this.isConfiguration = isConfiguration;
    }
    
    public boolean isEntity() {
        return isEntity;
    }
    
    public void setIsEntity(boolean isEntity) {
        this.isEntity = isEntity;
    }
    
    public boolean isTestClass() {
        return isTestClass;
    }
    
    public void setIsTestClass(boolean isTestClass) {
        this.isTestClass = isTestClass;
    }
    
    public int getFieldCount() {
        return fieldCount;
    }
    
    public void setFieldCount(int fieldCount) {
        this.fieldCount = fieldCount;
    }
    
    public int getStaticFieldCount() {
        return staticFieldCount;
    }
    
    public void setStaticFieldCount(int staticFieldCount) {
        this.staticFieldCount = staticFieldCount;
    }
    
    public int getMethodCount() {
        return methodCount;
    }
    
    public void setMethodCount(int methodCount) {
        this.methodCount = methodCount;
    }
    
    public int getConstructorCount() {
        return constructorCount;
    }
    
    public void setConstructorCount(int constructorCount) {
        this.constructorCount = constructorCount;
    }
    
    public int getInheritanceDepth() {
        return inheritanceDepth;
    }
    
    public void setInheritanceDepth(int inheritanceDepth) {
        this.inheritanceDepth = inheritanceDepth;
    }
    
    public List<String> getGenericTypeParameters() {
        return genericTypeParameters;
    }
    
    public void setGenericTypeParameters(List<String> genericTypeParameters) {
        this.genericTypeParameters = genericTypeParameters;
    }
    
    public Map<String, Object> getProperties() {
        return properties;
    }
    
    public void setProperties(Map<String, Object> properties) {
        this.properties = properties;
    }
    
    @Override
    public String toString() {
        return String.format("ClassNode{name='%s', id='%s'}", name, id);
    }
}
