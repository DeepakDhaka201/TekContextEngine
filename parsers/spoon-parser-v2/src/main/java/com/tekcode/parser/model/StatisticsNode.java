package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

/**
 * Statistical information about the parsed codebase
 */
@JsonPropertyOrder({
    "totalFiles", "totalLines", "totalClasses", "totalInterfaces", "totalMethods",
    "totalFields", "complexity", "testCoverage", "duplicateLines"
})
public class StatisticsNode {
    
    @JsonProperty("totalFiles")
    private int totalFiles;
    
    @JsonProperty("totalLines")
    private int totalLines;
    
    @JsonProperty("totalClasses")
    private int totalClasses;
    
    @JsonProperty("totalInterfaces")
    private int totalInterfaces;
    
    @JsonProperty("totalMethods")
    private int totalMethods;
    
    @JsonProperty("totalFields")
    private int totalFields;
    
    @JsonProperty("complexity")
    private int complexity;
    
    @JsonProperty("testCoverage")
    private double testCoverage;
    
    @JsonProperty("duplicateLines")
    private int duplicateLines;
    
    @JsonProperty("averageMethodComplexity")
    private double averageMethodComplexity;
    
    @JsonProperty("maxMethodComplexity")
    private int maxMethodComplexity;
    
    @JsonProperty("linesOfCode")
    private int linesOfCode;
    
    @JsonProperty("commentLines")
    private int commentLines;
    
    @JsonProperty("blankLines")
    private int blankLines;
    
    // === Getters and Setters ===
    
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
    
    public int getTotalClasses() {
        return totalClasses;
    }
    
    public void setTotalClasses(int totalClasses) {
        this.totalClasses = totalClasses;
    }
    
    public int getTotalInterfaces() {
        return totalInterfaces;
    }
    
    public void setTotalInterfaces(int totalInterfaces) {
        this.totalInterfaces = totalInterfaces;
    }
    
    public int getTotalMethods() {
        return totalMethods;
    }
    
    public void setTotalMethods(int totalMethods) {
        this.totalMethods = totalMethods;
    }
    
    public int getTotalFields() {
        return totalFields;
    }
    
    public void setTotalFields(int totalFields) {
        this.totalFields = totalFields;
    }
    
    public int getComplexity() {
        return complexity;
    }
    
    public void setComplexity(int complexity) {
        this.complexity = complexity;
    }
    
    public double getTestCoverage() {
        return testCoverage;
    }
    
    public void setTestCoverage(double testCoverage) {
        this.testCoverage = testCoverage;
    }
    
    public int getDuplicateLines() {
        return duplicateLines;
    }
    
    public void setDuplicateLines(int duplicateLines) {
        this.duplicateLines = duplicateLines;
    }
    
    public double getAverageMethodComplexity() {
        return averageMethodComplexity;
    }
    
    public void setAverageMethodComplexity(double averageMethodComplexity) {
        this.averageMethodComplexity = averageMethodComplexity;
    }
    
    public int getMaxMethodComplexity() {
        return maxMethodComplexity;
    }
    
    public void setMaxMethodComplexity(int maxMethodComplexity) {
        this.maxMethodComplexity = maxMethodComplexity;
    }
    
    public int getLinesOfCode() {
        return linesOfCode;
    }
    
    public void setLinesOfCode(int linesOfCode) {
        this.linesOfCode = linesOfCode;
    }
    
    public int getCommentLines() {
        return commentLines;
    }
    
    public void setCommentLines(int commentLines) {
        this.commentLines = commentLines;
    }
    
    public int getBlankLines() {
        return blankLines;
    }
    
    public void setBlankLines(int blankLines) {
        this.blankLines = blankLines;
    }
}
