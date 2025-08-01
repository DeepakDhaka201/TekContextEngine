package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

/**
 * Represents a Java interface in the codebase
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterfaceNode {

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

    @JsonProperty("decorators")
    private List<DecoratorInfo> decorators;

    @JsonProperty("methodCount")
    private int methodCount;

    @JsonProperty("properties")
    @Builder.Default
    private Map<String, Object> properties = new HashMap<>();
}
