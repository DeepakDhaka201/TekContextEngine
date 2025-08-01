package com.tekcode.parser.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Represents a source file in the codebase
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonPropertyOrder({
    "path", "fileName", "packageName", "fileExtension",
    "fileSize", "checksum", "lastModified", "isTestFile", "sourceCode"
})
public class FileNode {

    @JsonProperty("path")
    private String path;

    @JsonProperty("fileName")
    private String fileName;



    @JsonProperty("packageName")
    private String packageName;

    @JsonProperty("fileExtension")
    private String fileExtension;



    @JsonProperty("fileSize")
    private long fileSize;

    @JsonProperty("checksum")
    private String checksum;

    @JsonProperty("lastModified")
    private long lastModified;

    @JsonProperty("isTestFile")
    private boolean isTestFile;



    @JsonProperty("sourceCode")
    private String sourceCode;
}
