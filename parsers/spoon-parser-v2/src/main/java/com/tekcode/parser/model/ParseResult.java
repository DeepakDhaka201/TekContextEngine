package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Root container for all parsing results
 * 
 * This class holds all extracted information from the Java project analysis.
 * Uses thread-safe collections to support parallel processing.
 */
@JsonPropertyOrder({
    "metadata", "codebaseName", "files", "classes", "interfaces", "methods", 
    "dependencies", "relationships", "apiEndpoints", "testCases", "documents"
})
public class ParseResult {
    
    @JsonProperty("metadata")
    private MetadataNode metadata;
    
    @JsonProperty("codebaseName")
    private String codebaseName;
    
    // Core entities
    @JsonProperty("files")
    private List<FileNode> files = new CopyOnWriteArrayList<>();
    
    @JsonProperty("classes")
    private List<ClassNode> classes = new CopyOnWriteArrayList<>();
    
    @JsonProperty("interfaces")
    private List<InterfaceNode> interfaces = new CopyOnWriteArrayList<>();

    @JsonProperty("enums")
    private List<EnumNode> enums = new CopyOnWriteArrayList<>();

    @JsonProperty("methods")
    private List<MethodNode> methods = new CopyOnWriteArrayList<>();

    @JsonProperty("fields")
    private List<FieldNode> fields = new CopyOnWriteArrayList<>();

    @JsonProperty("lambdaExpressions")
    private List<LambdaExpressionNode> lambdaExpressions = new CopyOnWriteArrayList<>();

    @JsonProperty("methodReferences")
    private List<MethodReferenceNode> methodReferences = new CopyOnWriteArrayList<>();

    // Dependencies and relationships
    @JsonProperty("dependencies")
    private List<DependencyNode> dependencies = new CopyOnWriteArrayList<>();
    
    @JsonProperty("relationships")
    private List<Relationship> relationships = new CopyOnWriteArrayList<>();
    
    // Framework-specific entities
    @JsonProperty("apiEndpoints")
    private List<APIEndpointNode> apiEndpoints = new CopyOnWriteArrayList<>();
    
    @JsonProperty("testCases")
    private List<TestCaseNode> testCases = new CopyOnWriteArrayList<>();
    
    @JsonProperty("documents")
    private List<DocumentNode> documents = new CopyOnWriteArrayList<>();

    @JsonProperty("documentChunks")
    private List<DocumentChunk> documentChunks = new CopyOnWriteArrayList<>();
    
    @JsonProperty("annotations")
    private List<AnnotationNode> annotations = new CopyOnWriteArrayList<>();
    
    // === Constructors ===
    
    public ParseResult() {
        // Default constructor for Jackson
    }
    
    public ParseResult(String codebaseName) {
        this.codebaseName = codebaseName;
    }
    
    // === Getters and Setters ===
    
    public MetadataNode getMetadata() {
        return metadata;
    }
    
    public void setMetadata(MetadataNode metadata) {
        this.metadata = metadata;
    }
    
    public String getCodebaseName() {
        return codebaseName;
    }
    
    public void setCodebaseName(String codebaseName) {
        this.codebaseName = codebaseName;
    }
    
    public List<FileNode> getFiles() {
        return files;
    }
    
    public void setFiles(List<FileNode> files) {
        this.files = files != null ? new CopyOnWriteArrayList<>(files) : new CopyOnWriteArrayList<>();
    }
    
    public List<ClassNode> getClasses() {
        return classes;
    }
    
    public void setClasses(List<ClassNode> classes) {
        this.classes = classes != null ? new CopyOnWriteArrayList<>(classes) : new CopyOnWriteArrayList<>();
    }
    
    public List<InterfaceNode> getInterfaces() {
        return interfaces;
    }
    
    public void setInterfaces(List<InterfaceNode> interfaces) {
        this.interfaces = interfaces != null ? new CopyOnWriteArrayList<>(interfaces) : new CopyOnWriteArrayList<>();
    }

    public List<EnumNode> getEnums() {
        return enums;
    }

    public void setEnums(List<EnumNode> enums) {
        this.enums = enums != null ? new CopyOnWriteArrayList<>(enums) : new CopyOnWriteArrayList<>();
    }

    public List<MethodNode> getMethods() {
        return methods;
    }
    
    public void setMethods(List<MethodNode> methods) {
        this.methods = methods != null ? new CopyOnWriteArrayList<>(methods) : new CopyOnWriteArrayList<>();
    }
    
    public List<FieldNode> getFields() {
        return fields;
    }
    
    public void setFields(List<FieldNode> fields) {
        this.fields = fields != null ? new CopyOnWriteArrayList<>(fields) : new CopyOnWriteArrayList<>();
    }

    public List<LambdaExpressionNode> getLambdaExpressions() {
        return lambdaExpressions;
    }

    public void setLambdaExpressions(List<LambdaExpressionNode> lambdaExpressions) {
        this.lambdaExpressions = lambdaExpressions != null ? new CopyOnWriteArrayList<>(lambdaExpressions) : new CopyOnWriteArrayList<>();
    }

    public List<MethodReferenceNode> getMethodReferences() {
        return methodReferences;
    }

    public void setMethodReferences(List<MethodReferenceNode> methodReferences) {
        this.methodReferences = methodReferences != null ? new CopyOnWriteArrayList<>(methodReferences) : new CopyOnWriteArrayList<>();
    }

    public List<DependencyNode> getDependencies() {
        return dependencies;
    }
    
    public void setDependencies(List<DependencyNode> dependencies) {
        this.dependencies = dependencies != null ? new CopyOnWriteArrayList<>(dependencies) : new CopyOnWriteArrayList<>();
    }
    
    public List<Relationship> getRelationships() {
        return relationships;
    }
    
    public void setRelationships(List<Relationship> relationships) {
        this.relationships = relationships != null ? new CopyOnWriteArrayList<>(relationships) : new CopyOnWriteArrayList<>();
    }
    
    public List<APIEndpointNode> getApiEndpoints() {
        return apiEndpoints;
    }
    
    public void setApiEndpoints(List<APIEndpointNode> apiEndpoints) {
        this.apiEndpoints = apiEndpoints != null ? new CopyOnWriteArrayList<>(apiEndpoints) : new CopyOnWriteArrayList<>();
    }
    
    public List<TestCaseNode> getTestCases() {
        return testCases;
    }
    
    public void setTestCases(List<TestCaseNode> testCases) {
        this.testCases = testCases != null ? new CopyOnWriteArrayList<>(testCases) : new CopyOnWriteArrayList<>();
    }
    
    public List<DocumentNode> getDocuments() {
        return documents;
    }
    
    public void setDocuments(List<DocumentNode> documents) {
        this.documents = documents != null ? new CopyOnWriteArrayList<>(documents) : new CopyOnWriteArrayList<>();
    }

    public List<DocumentChunk> getDocumentChunks() {
        return documentChunks;
    }

    public void setDocumentChunks(List<DocumentChunk> documentChunks) {
        this.documentChunks = documentChunks != null ? new CopyOnWriteArrayList<>(documentChunks) : new CopyOnWriteArrayList<>();
    }

    public List<AnnotationNode> getAnnotations() {
        return annotations;
    }
    
    public void setAnnotations(List<AnnotationNode> annotations) {
        this.annotations = annotations != null ? new CopyOnWriteArrayList<>(annotations) : new CopyOnWriteArrayList<>();
    }
    
    // === Helper methods for adding items (thread-safe) ===
    
    public void addFile(FileNode file) {
        if (file != null) {
            this.files.add(file);
        }
    }
    
    public void addClass(ClassNode clazz) {
        if (clazz != null) {
            this.classes.add(clazz);
        }
    }
    
    public void addInterface(InterfaceNode iface) {
        if (iface != null) {
            this.interfaces.add(iface);
        }
    }

    public void addEnum(EnumNode enumNode) {
        if (enumNode != null) {
            this.enums.add(enumNode);
        }
    }

    public void addMethod(MethodNode method) {
        if (method != null) {
            this.methods.add(method);
        }
    }
    
    public void addField(FieldNode field) {
        if (field != null) {
            this.fields.add(field);
        }
    }

    public void addLambdaExpression(LambdaExpressionNode lambda) {
        if (lambda != null) {
            this.lambdaExpressions.add(lambda);
        }
    }

    public void addMethodReference(MethodReferenceNode methodRef) {
        if (methodRef != null) {
            this.methodReferences.add(methodRef);
        }
    }

    public void addDependency(DependencyNode dependency) {
        if (dependency != null) {
            this.dependencies.add(dependency);
        }
    }
    
    public void addRelationship(Relationship relationship) {
        if (relationship != null) {
            this.relationships.add(relationship);
        }
    }
    
    public void addApiEndpoint(APIEndpointNode endpoint) {
        if (endpoint != null) {
            this.apiEndpoints.add(endpoint);
        }
    }
    
    public void addTestCase(TestCaseNode testCase) {
        if (testCase != null) {
            this.testCases.add(testCase);
        }
    }
    
    public void addDocument(DocumentNode document) {
        if (document != null) {
            this.documents.add(document);
        }
    }

    public void addDocumentChunk(DocumentChunk documentChunk) {
        if (documentChunk != null) {
            this.documentChunks.add(documentChunk);
        }
    }

    public void addAnnotation(AnnotationNode annotation) {
        if (annotation != null) {
            this.annotations.add(annotation);
        }
    }
    
    // === Utility methods ===
    
    /**
     * Gets the total number of entities in this result
     */
    public int getTotalEntityCount() {
        return files.size() + classes.size() + interfaces.size() + enums.size() +
               methods.size() + fields.size() + lambdaExpressions.size() +
               methodReferences.size() + dependencies.size() + apiEndpoints.size() +
               testCases.size() + documents.size() + documentChunks.size() + annotations.size();
    }
    
    /**
     * Checks if the result is empty (no entities found)
     */
    public boolean isEmpty() {
        return getTotalEntityCount() == 0;
    }
    
    /**
     * Gets a summary string of the parsing results
     */
    public String getSummary() {
        return String.format(
            "ParseResult{codebase='%s', files=%d, classes=%d, interfaces=%d, enums=%d, " +
            "methods=%d, fields=%d, lambdas=%d, methodRefs=%d, dependencies=%d, relationships=%d}",
            codebaseName, files.size(), classes.size(), interfaces.size(), enums.size(),
            methods.size(), fields.size(), lambdaExpressions.size(), methodReferences.size(),
            dependencies.size(), relationships.size()
        );
    }
    
    @Override
    public String toString() {
        return getSummary();
    }
}
