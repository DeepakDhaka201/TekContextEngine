package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.List;

public class ParseResult {
    @JsonProperty("files")
    private List<FileNode> files = new ArrayList<>();
    
    @JsonProperty("classes")
    private List<ClassNode> classes = new ArrayList<>();
    
    @JsonProperty("interfaces")
    private List<InterfaceNode> interfaces = new ArrayList<>();
    
    @JsonProperty("methods")
    private List<MethodNode> methods = new ArrayList<>();
    
    @JsonProperty("dependencies")
    private List<DependencyNode> dependencies = new ArrayList<>();
    
    @JsonProperty("relationships")
    private List<Relationship> relationships = new ArrayList<>();
    
    // Framework-specific collections
    @JsonProperty("apiEndpoints")
    private List<APIEndpointNode> apiEndpoints = new ArrayList<>();
    
    @JsonProperty("documents")
    private List<DocumentNode> documents = new ArrayList<>();
    
    @JsonProperty("testCases")
    private List<TestCaseNode> testCases = new ArrayList<>();
    
    // Metadata
    @JsonProperty("metadata")
    private MetadataNode metadata;
    
    // Codebase name for globally unique IDs
    private String codebaseName;

    // Getters and setters
    public List<FileNode> getFiles() {
        return files;
    }

    public void setFiles(List<FileNode> files) {
        this.files = files;
    }

    public List<ClassNode> getClasses() {
        return classes;
    }

    public void setClasses(List<ClassNode> classes) {
        this.classes = classes;
    }

    public List<InterfaceNode> getInterfaces() {
        return interfaces;
    }

    public void setInterfaces(List<InterfaceNode> interfaces) {
        this.interfaces = interfaces;
    }

    public List<MethodNode> getMethods() {
        return methods;
    }

    public void setMethods(List<MethodNode> methods) {
        this.methods = methods;
    }

    public List<DependencyNode> getDependencies() {
        return dependencies;
    }

    public void setDependencies(List<DependencyNode> dependencies) {
        this.dependencies = dependencies;
    }

    public List<Relationship> getRelationships() {
        return relationships;
    }

    public void setRelationships(List<Relationship> relationships) {
        this.relationships = relationships;
    }
    
    // Helper methods to add items
    public void addFile(FileNode file) {
        this.files.add(file);
    }
    
    public void addClass(ClassNode clazz) {
        this.classes.add(clazz);
    }
    
    public void addInterface(InterfaceNode iface) {
        this.interfaces.add(iface);
    }
    
    public void addMethod(MethodNode method) {
        this.methods.add(method);
    }
    
    public void addDependency(DependencyNode dependency) {
        this.dependencies.add(dependency);
    }
    
    public void addRelationship(Relationship relationship) {
        this.relationships.add(relationship);
    }
    
    public List<APIEndpointNode> getApiEndpoints() {
        return apiEndpoints;
    }

    public void setApiEndpoints(List<APIEndpointNode> apiEndpoints) {
        this.apiEndpoints = apiEndpoints;
    }

    public MetadataNode getMetadata() {
        return metadata;
    }

    public void setMetadata(MetadataNode metadata) {
        this.metadata = metadata;
    }
    
    // Helper methods for framework-specific collections
    public void addApiEndpoint(APIEndpointNode endpoint) {
        this.apiEndpoints.add(endpoint);
    }
    
    public List<DocumentNode> getDocuments() {
        return documents;
    }

    public void setDocuments(List<DocumentNode> documents) {
        this.documents = documents;
    }
    
    public void addDocument(DocumentNode document) {
        this.documents.add(document);
    }
    
    public List<TestCaseNode> getTestCases() {
        return testCases;
    }

    public void setTestCases(List<TestCaseNode> testCases) {
        this.testCases = testCases;
    }
    
    public void addTestCase(TestCaseNode testCase) {
        this.testCases.add(testCase);
    }
    
    public String getCodebaseName() {
        return codebaseName;
    }
    
    public void setCodebaseName(String codebaseName) {
        this.codebaseName = codebaseName;
    }
}