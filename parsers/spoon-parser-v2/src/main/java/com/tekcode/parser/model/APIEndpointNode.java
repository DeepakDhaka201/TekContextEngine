package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.Map;
import java.util.HashMap;

/**
 * Represents an API endpoint
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class APIEndpointNode {

    @JsonProperty("id")
    private String id;

    @JsonProperty("path")
    private String path;

    @JsonProperty("httpMethod")
    private String httpMethod;

    @JsonProperty("methodName")
    private String methodName;

    @JsonProperty("className")
    private String className;

    @JsonProperty("properties")
    @Builder.Default
    private Map<String, Object> properties = new HashMap<>();
}
