package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.Map;
import java.util.HashMap;

/**
 * Represents a project dependency
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DependencyNode {

    @JsonProperty("id")
    private String id;

    @JsonProperty("groupId")
    private String groupId;

    @JsonProperty("artifactId")
    private String artifactId;

    @JsonProperty("version")
    private String version;

    @JsonProperty("scope")
    private String scope;

    @JsonProperty("type")
    private String type;

    @JsonProperty("properties")
    @Builder.Default
    private Map<String, Object> properties = new HashMap<>();
}
