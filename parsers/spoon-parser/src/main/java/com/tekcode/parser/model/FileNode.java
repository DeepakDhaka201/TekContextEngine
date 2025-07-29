package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class FileNode {
    @JsonProperty("path")
    private String path;
    
    @JsonProperty("fileName")
    private String fileName;
    
    @JsonProperty("checksum")
    private String checksum;
    
    @JsonProperty("lineCount")
    private int lineCount;

    public FileNode() {}

    public FileNode(String path, String fileName, String checksum, int lineCount) {
        this.path = path;
        this.fileName = fileName;
        this.checksum = checksum;
        this.lineCount = lineCount;
    }

    // Getters and setters
    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getChecksum() {
        return checksum;
    }

    public void setChecksum(String checksum) {
        this.checksum = checksum;
    }

    public int getLineCount() {
        return lineCount;
    }

    public void setLineCount(int lineCount) {
        this.lineCount = lineCount;
    }
}