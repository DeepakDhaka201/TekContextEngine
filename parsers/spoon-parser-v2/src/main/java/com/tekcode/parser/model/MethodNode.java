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
 * Represents a method or constructor in the codebase
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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
    @Builder.Default
    private Map<String, Object> properties = new HashMap<>();
}
