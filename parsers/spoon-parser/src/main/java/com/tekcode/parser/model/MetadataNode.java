package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class MetadataNode {
    @JsonProperty("codebaseName")
    private String codebaseName;
    
    @JsonProperty("framework")
    private String framework;
    
    @JsonProperty("detectedFrameworks")
    private List<String> detectedFrameworks;
    
    @JsonProperty("version")
    private String version;
    
    @JsonProperty("parseTime")
    private String parseTime;
    
    @JsonProperty("statistics")
    private StatisticsNode statistics;

    public MetadataNode() {}

    // Getters and setters
    public String getCodebaseName() {
        return codebaseName;
    }

    public void setCodebaseName(String codebaseName) {
        this.codebaseName = codebaseName;
    }

    public String getFramework() {
        return framework;
    }

    public void setFramework(String framework) {
        this.framework = framework;
    }

    public List<String> getDetectedFrameworks() {
        return detectedFrameworks;
    }

    public void setDetectedFrameworks(List<String> detectedFrameworks) {
        this.detectedFrameworks = detectedFrameworks;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public String getParseTime() {
        return parseTime;
    }

    public void setParseTime(String parseTime) {
        this.parseTime = parseTime;
    }

    public StatisticsNode getStatistics() {
        return statistics;
    }

    public void setStatistics(StatisticsNode statistics) {
        this.statistics = statistics;
    }
}