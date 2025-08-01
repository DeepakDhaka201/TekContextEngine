package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

/**
 * Represents a Java class in the codebase
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonPropertyOrder({
    "id", "name", "fullyQualifiedName", "comment", "visibility", "isAbstract", "isFinal", "isStatic",
    "isInnerClass", "isAnonymous", "isGeneric", "filePath", "startLine", "endLine", "decorators",
    "isController", "isService", "isRepository", "isComponent", "isConfiguration", "isEntity", "isTestClass",
    "genericTypeParameters", "properties"
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

    @JsonProperty("isLocal")
    private boolean isLocal;

    @JsonProperty("isGeneric")
    private boolean isGeneric;

    @JsonProperty("enclosingClassId")
    private String enclosingClassId;

    @JsonProperty("enclosingMethodId")
    private String enclosingMethodId;
    
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

    
    @JsonProperty("genericTypeParameters")
    private List<String> genericTypeParameters;
    
    @JsonProperty("properties")
    @Builder.Default
    private Map<String, Object> properties = new HashMap<>();
}
