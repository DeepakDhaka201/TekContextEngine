package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import java.util.Map;
import java.util.HashMap;

/**
 * Represents a documentation file (metadata only - content is stored in DocumentChunk entities)
 */
@JsonPropertyOrder({
    "id", "path", "title", "type", "totalSize", "totalChunks", "chunkSize",
    "chunkOverlap", "encoding", "lastModified", "properties"
})
public class DocumentNode {

    @JsonProperty("id")
    private String id;

    @JsonProperty("path")
    private String path;

    @JsonProperty("title")
    private String title;

    @JsonProperty("type")
    private String type;

    @JsonProperty("totalSize")
    private long totalSize;

    @JsonProperty("totalChunks")
    private int totalChunks;

    @JsonProperty("chunkSize")
    private int chunkSize;

    @JsonProperty("chunkOverlap")
    private int chunkOverlap;

    @JsonProperty("encoding")
    private String encoding;

    @JsonProperty("lastModified")
    private String lastModified;

    @JsonProperty("properties")
    private Map<String, Object> properties = new HashMap<>();

    // === Getters and Setters ===

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public long getTotalSize() { return totalSize; }
    public void setTotalSize(long totalSize) { this.totalSize = totalSize; }

    public int getTotalChunks() { return totalChunks; }
    public void setTotalChunks(int totalChunks) { this.totalChunks = totalChunks; }

    public int getChunkSize() { return chunkSize; }
    public void setChunkSize(int chunkSize) { this.chunkSize = chunkSize; }

    public int getChunkOverlap() { return chunkOverlap; }
    public void setChunkOverlap(int chunkOverlap) { this.chunkOverlap = chunkOverlap; }

    public String getEncoding() { return encoding; }
    public void setEncoding(String encoding) { this.encoding = encoding; }

    public String getLastModified() { return lastModified; }
    public void setLastModified(String lastModified) { this.lastModified = lastModified; }

    public Map<String, Object> getProperties() { return properties; }
    public void setProperties(Map<String, Object> properties) { this.properties = properties; }
}
