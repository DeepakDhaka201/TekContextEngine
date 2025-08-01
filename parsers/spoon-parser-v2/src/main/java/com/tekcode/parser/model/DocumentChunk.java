package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

/**
 * Represents a chunk of a document for processing and analysis
 */
@JsonPropertyOrder({
    "id", "documentId", "chunkIndex", "content", "startPosition", "endPosition", 
    "characterCount", "wordCount", "lineCount", "overlap", "chunkType", "properties"
})
public class DocumentChunk {
    
    @JsonProperty("id")
    private String id;
    
    @JsonProperty("documentId")
    private String documentId;
    
    @JsonProperty("chunkIndex")
    private int chunkIndex;
    
    @JsonProperty("content")
    private String content;
    
    @JsonProperty("startPosition")
    private int startPosition;
    
    @JsonProperty("endPosition")
    private int endPosition;
    
    @JsonProperty("characterCount")
    private int characterCount;
    
    @JsonProperty("wordCount")
    private int wordCount;
    
    @JsonProperty("lineCount")
    private int lineCount;
    
    @JsonProperty("overlap")
    private int overlap;
    
    @JsonProperty("chunkType")
    private String chunkType; // "content", "header", "code_block", etc.
    
    @JsonProperty("properties")
    private java.util.Map<String, Object> properties = new java.util.HashMap<>();
    
    // === Constructors ===
    
    public DocumentChunk() {}
    
    public DocumentChunk(String id, String documentId, int chunkIndex, String content) {
        this.id = id;
        this.documentId = documentId;
        this.chunkIndex = chunkIndex;
        this.content = content;
        this.characterCount = content != null ? content.length() : 0;
        this.wordCount = content != null ? content.split("\\s+").length : 0;
        this.lineCount = content != null ? content.split("\r\n|\r|\n", -1).length : 0;
    }
    
    // === Getters and Setters ===
    
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getDocumentId() { return documentId; }
    public void setDocumentId(String documentId) { this.documentId = documentId; }
    
    public int getChunkIndex() { return chunkIndex; }
    public void setChunkIndex(int chunkIndex) { this.chunkIndex = chunkIndex; }
    
    public String getContent() { return content; }
    public void setContent(String content) { 
        this.content = content;
        // Auto-calculate metrics when content is set
        this.characterCount = content != null ? content.length() : 0;
        this.wordCount = content != null ? content.split("\\s+").length : 0;
        this.lineCount = content != null ? content.split("\r\n|\r|\n", -1).length : 0;
    }
    
    public int getStartPosition() { return startPosition; }
    public void setStartPosition(int startPosition) { this.startPosition = startPosition; }
    
    public int getEndPosition() { return endPosition; }
    public void setEndPosition(int endPosition) { this.endPosition = endPosition; }
    
    public int getCharacterCount() { return characterCount; }
    public void setCharacterCount(int characterCount) { this.characterCount = characterCount; }
    
    public int getWordCount() { return wordCount; }
    public void setWordCount(int wordCount) { this.wordCount = wordCount; }
    
    public int getLineCount() { return lineCount; }
    public void setLineCount(int lineCount) { this.lineCount = lineCount; }
    
    public int getOverlap() { return overlap; }
    public void setOverlap(int overlap) { this.overlap = overlap; }
    
    public String getChunkType() { return chunkType; }
    public void setChunkType(String chunkType) { this.chunkType = chunkType; }
    
    public java.util.Map<String, Object> getProperties() { return properties; }
    public void setProperties(java.util.Map<String, Object> properties) { this.properties = properties; }
    
    // === Utility Methods ===
    
    /**
     * Checks if this chunk has overlap with the previous chunk
     */
    public boolean hasOverlap() {
        return overlap > 0;
    }
    
    /**
     * Gets the effective content (without overlap if specified)
     */
    public String getEffectiveContent() {
        if (overlap > 0 && content != null && content.length() > overlap) {
            return content.substring(overlap);
        }
        return content;
    }
    
    /**
     * Adds a custom property to the chunk
     */
    public void addProperty(String key, Object value) {
        properties.put(key, value);
    }
    
    @Override
    public String toString() {
        return String.format("DocumentChunk{id='%s', documentId='%s', chunkIndex=%d, characterCount=%d}", 
                           id, documentId, chunkIndex, characterCount);
    }
}
