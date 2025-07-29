package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class StatisticsNode {
    @JsonProperty("totalFiles")
    private int totalFiles;
    
    @JsonProperty("totalLines")
    private int totalLines;
    
    @JsonProperty("complexity")
    private int complexity;

    public StatisticsNode() {}

    public int getTotalFiles() {
        return totalFiles;
    }

    public void setTotalFiles(int totalFiles) {
        this.totalFiles = totalFiles;
    }

    public int getTotalLines() {
        return totalLines;
    }

    public void setTotalLines(int totalLines) {
        this.totalLines = totalLines;
    }

    public int getComplexity() {
        return complexity;
    }

    public void setComplexity(int complexity) {
        this.complexity = complexity;
    }
}