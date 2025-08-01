package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import java.util.List;

/**
 * Represents method parameter information
 */
@JsonPropertyOrder({"name", "type", "isVarArgs", "isFinal", "decorators"})
public class ParameterInfo {

    @JsonProperty("name")
    private String name;

    @JsonProperty("type")
    private String type;

    @JsonProperty("isVarArgs")
    private boolean isVarArgs;

    @JsonProperty("isFinal")
    private boolean isFinal;

    @JsonProperty("decorators")
    private List<DecoratorInfo> decorators;

    // === Getters and Setters ===

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    @JsonIgnore
    public boolean isVarArgs() {
        return isVarArgs;
    }

    public void setIsVarArgs(boolean isVarArgs) {
        this.isVarArgs = isVarArgs;
    }

    @JsonIgnore
    public boolean isFinal() {
        return isFinal;
    }

    public void setIsFinal(boolean isFinal) {
        this.isFinal = isFinal;
    }

    public List<DecoratorInfo> getDecorators() {
        return decorators;
    }

    public void setDecorators(List<DecoratorInfo> decorators) {
        this.decorators = decorators;
    }

    @Override
    public String toString() {
        return String.format("ParameterInfo{name='%s', type='%s'}", name, type);
    }
}
