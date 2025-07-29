package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

/**
 * Represents a source file in the codebase
 */
@JsonPropertyOrder({
    "path", "fileName", "absolutePath", "packageName", "fileExtension",
    "lineCount", "codeLines", "commentLines", "blankLines", "fileSize",
    "checksum", "lastModified", "isTestFile", "isGeneratedFile", "sourceCode"
})
public class FileNode {
    
    @JsonProperty("path")
    private String path;
    
    @JsonProperty("fileName")
    private String fileName;
    
    @JsonProperty("absolutePath")
    private String absolutePath;
    
    @JsonProperty("packageName")
    private String packageName;
    
    @JsonProperty("fileExtension")
    private String fileExtension;
    
    @JsonProperty("lineCount")
    private int lineCount;
    
    @JsonProperty("codeLines")
    private int codeLines;
    
    @JsonProperty("commentLines")
    private int commentLines;
    
    @JsonProperty("blankLines")
    private int blankLines;
    
    @JsonProperty("fileSize")
    private long fileSize;
    
    @JsonProperty("checksum")
    private String checksum;
    
    @JsonProperty("lastModified")
    private long lastModified;
    
    @JsonProperty("isTestFile")
    private boolean isTestFile;
    
    @JsonProperty("isGeneratedFile")
    private boolean isGeneratedFile;
    
    @JsonProperty("sourceCode")
    private String sourceCode;
    
    // === Getters and Setters ===
    
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
    
    public String getAbsolutePath() {
        return absolutePath;
    }
    
    public void setAbsolutePath(String absolutePath) {
        this.absolutePath = absolutePath;
    }
    
    public String getPackageName() {
        return packageName;
    }
    
    public void setPackageName(String packageName) {
        this.packageName = packageName;
    }
    
    public String getFileExtension() {
        return fileExtension;
    }
    
    public void setFileExtension(String fileExtension) {
        this.fileExtension = fileExtension;
    }
    
    public int getLineCount() {
        return lineCount;
    }
    
    public void setLineCount(int lineCount) {
        this.lineCount = lineCount;
    }
    
    public int getCodeLines() {
        return codeLines;
    }
    
    public void setCodeLines(int codeLines) {
        this.codeLines = codeLines;
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
    
    public long getFileSize() {
        return fileSize;
    }
    
    public void setFileSize(long fileSize) {
        this.fileSize = fileSize;
    }
    
    public String getChecksum() {
        return checksum;
    }
    
    public void setChecksum(String checksum) {
        this.checksum = checksum;
    }
    
    public long getLastModified() {
        return lastModified;
    }
    
    public void setLastModified(long lastModified) {
        this.lastModified = lastModified;
    }
    
    public boolean isTestFile() {
        return isTestFile;
    }
    
    public void setIsTestFile(boolean isTestFile) {
        this.isTestFile = isTestFile;
    }
    
    public boolean isGeneratedFile() {
        return isGeneratedFile;
    }
    
    public void setIsGeneratedFile(boolean isGeneratedFile) {
        this.isGeneratedFile = isGeneratedFile;
    }
    
    public String getSourceCode() {
        return sourceCode;
    }
    
    public void setSourceCode(String sourceCode) {
        this.sourceCode = sourceCode;
    }
    
    @Override
    public String toString() {
        return String.format("FileNode{path='%s', lines=%d, size=%d}", path, lineCount, fileSize);
    }
}
