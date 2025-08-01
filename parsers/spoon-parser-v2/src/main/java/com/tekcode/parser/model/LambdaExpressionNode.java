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
 * Represents a lambda expression in the codebase
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonPropertyOrder({
    "id", "expression", "parameters", "returnType", "functionalInterface",
    "isBlockBody", "filePath", "startLine", "endLine", "enclosingMethodId",
    "properties"
})
public class LambdaExpressionNode {

    @JsonProperty("id")
    private String id;

    @JsonProperty("expression")
    private String expression;

    @JsonProperty("parameters")
    private List<ParameterInfo> parameters;

    @JsonProperty("returnType")
    private String returnType;

    @JsonProperty("functionalInterface")
    private String functionalInterface;

    @JsonProperty("isBlockBody")
    private boolean isBlockBody;

    @JsonProperty("filePath")
    private String filePath;

    @JsonProperty("startLine")
    private int startLine;

    @JsonProperty("endLine")
    private int endLine;

    @JsonProperty("enclosingMethodId")
    private String enclosingMethodId;

    @JsonProperty("enclosingClassId")
    private String enclosingClassId;

    @JsonProperty("properties")
    @Builder.Default
    private Map<String, Object> properties = new HashMap<>();
}
