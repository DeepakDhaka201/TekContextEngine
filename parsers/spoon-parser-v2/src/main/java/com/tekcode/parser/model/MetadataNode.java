package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

/**
 * Metadata information about the parsing process and results
 */
@JsonPropertyOrder({
    "codebaseName", "version", "parserVersion", "parseTime", "parsingDurationMs",
    "framework", "detectedFrameworks", "statistics", "configuration", "errors"
})
public class MetadataNode {
    
    @JsonProperty("codebaseName")
    private String codebaseName;
    
    @JsonProperty("version")
    private String version;
    
    @JsonProperty("parserVersion")
    private String parserVersion;
    
    @JsonProperty("parseTime")
    private String parseTime;
    
    @JsonProperty("parsingDurationMs")
    private long parsingDurationMs;
    
    @JsonProperty("framework")
    private String framework;
    
    @JsonProperty("detectedFrameworks")
    private List<String> detectedFrameworks;
    
    @JsonProperty("statistics")
    private StatisticsNode statistics;
    
    @JsonProperty("configuration")
    private Map<String, Object> configuration = new HashMap<>();
    
    @JsonProperty("errors")
    private List<String> errors;
    
    @JsonProperty("warnings")
    private List<String> warnings;
    
    // === Getters and Setters ===
    
    public String getCodebaseName() {
        return codebaseName;
    }
    
    public void setCodebaseName(String codebaseName) {
        this.codebaseName = codebaseName;
    }
    
    public String getVersion() {
        return version;
    }
    
    public void setVersion(String version) {
        this.version = version;
    }
    
    public String getParserVersion() {
        return parserVersion;
    }
    
    public void setParserVersion(String parserVersion) {
        this.parserVersion = parserVersion;
    }
    
    public String getParseTime() {
        return parseTime;
    }
    
    public void setParseTime(String parseTime) {
        this.parseTime = parseTime;
    }
    
    public long getParsingDurationMs() {
        return parsingDurationMs;
    }
    
    public void setParsingDurationMs(long parsingDurationMs) {
        this.parsingDurationMs = parsingDurationMs;
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
    
    public StatisticsNode getStatistics() {
        return statistics;
    }
    
    public void setStatistics(StatisticsNode statistics) {
        this.statistics = statistics;
    }
    
    public Map<String, Object> getConfiguration() {
        return configuration;
    }
    
    public void setConfiguration(Map<String, Object> configuration) {
        this.configuration = configuration;
    }
    
    public List<String> getErrors() {
        return errors;
    }
    
    public void setErrors(List<String> errors) {
        this.errors = errors;
    }
    
    public List<String> getWarnings() {
        return warnings;
    }
    
    public void setWarnings(List<String> warnings) {
        this.warnings = warnings;
    }
}
