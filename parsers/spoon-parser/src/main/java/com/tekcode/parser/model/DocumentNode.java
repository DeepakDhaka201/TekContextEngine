package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class DocumentNode {
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("filePath")
    private String filePath;
    
    @JsonProperty("type")
    private String type; // "markdown", "text", "readme", etc.
    
    @JsonProperty("content")
    private String content;
    
    @JsonProperty("size")
    private long size; // File size in bytes
    
    @JsonProperty("lineCount")
    private int lineCount;
    
    @JsonProperty("lastModified")
    private String lastModified;
    
    @JsonProperty("encoding")
    private String encoding; // UTF-8, ASCII, etc.

    public DocumentNode() {}

    // Getters and setters
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getFilePath() {
        return filePath;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public long getSize() {
        return size;
    }

    public void setSize(long size) {
        this.size = size;
    }

    public int getLineCount() {
        return lineCount;
    }

    public void setLineCount(int lineCount) {
        this.lineCount = lineCount;
    }

    public String getLastModified() {
        return lastModified;
    }

    public void setLastModified(String lastModified) {
        this.lastModified = lastModified;
    }

    public String getEncoding() {
        return encoding;
    }

    public void setEncoding(String encoding) {
        this.encoding = encoding;
    }
}