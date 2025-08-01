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
 * Represents a field in a Java class
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FieldNode {

    @JsonProperty("id")
    private String id;

    @JsonProperty("name")
    private String name;

    @JsonProperty("type")
    private String type;

    @JsonProperty("visibility")
    private String visibility;

    @JsonProperty("isStatic")
    private boolean isStatic;

    @JsonProperty("isFinal")
    private boolean isFinal;

    @JsonProperty("decorators")
    private List<DecoratorInfo> decorators;

    @JsonProperty("properties")
    @Builder.Default
    private Map<String, Object> properties = new HashMap<>();
}
