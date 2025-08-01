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
 * Represents a Java enum in the codebase
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonPropertyOrder({
    "id", "name", "fullyQualifiedName", "comment", "visibility", "filePath",
    "startLine", "endLine", "enumConstants", "methodCount", "fieldCount",
    "decorators", "properties"
})
public class EnumNode {

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

    @JsonProperty("filePath")
    private String filePath;

    @JsonProperty("startLine")
    private int startLine;

    @JsonProperty("endLine")
    private int endLine;

    @JsonProperty("enumConstants")
    private List<EnumConstantInfo> enumConstants;

    @JsonProperty("methodCount")
    private int methodCount;

    @JsonProperty("fieldCount")
    private int fieldCount;

    @JsonProperty("decorators")
    private List<DecoratorInfo> decorators;

    @JsonProperty("properties")
    @Builder.Default
    private Map<String, Object> properties = new HashMap<>();
}
