package com.tekcode.parser.visitor;

import com.tekcode.parser.model.DocumentNode;
import com.tekcode.parser.model.ParseResult;
import com.tekcode.parser.model.Relationship;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Instant;
import com.tekcode.parser.util.PathUtils;
import java.util.Arrays;
import java.util.List;

public class DocumentVisitor {
    private static final Logger logger = LoggerFactory.getLogger(DocumentVisitor.class);
    private final ParseResult result;
    private final String codebaseName;
    private final String projectPath;
    
    // Supported document extensions
    private static final List<String> DOCUMENT_EXTENSIONS = Arrays.asList(
        ".md", ".markdown", ".txt", ".rst", ".adoc", ".asciidoc"
    );

    public DocumentVisitor(ParseResult result, String codebaseName, String projectPath) {
        this.result = result;
        this.codebaseName = codebaseName;
        this.projectPath = projectPath;
    }

    public void visitDocuments() {
        try {
            Path startPath = Paths.get(projectPath);
            Files.walkFileTree(startPath, new SimpleFileVisitor<Path>() {
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    if (isDocumentFile(file)) {
                        processDocumentFile(file, attrs);
                    }
                    return FileVisitResult.CONTINUE;
                }
            });
        } catch (IOException e) {
            logger.error("Error walking file tree for documents", e);
        }
    }

    private boolean isDocumentFile(Path file) {
        String fileName = file.getFileName().toString().toLowerCase();
        return DOCUMENT_EXTENSIONS.stream().anyMatch(fileName::endsWith);
    }

    private void processDocumentFile(Path file, BasicFileAttributes attrs) {
        try {
            DocumentNode documentNode = new DocumentNode();
            
            // Basic file information
            documentNode.setName(file.getFileName().toString());
            documentNode.setFilePath(PathUtils.toRelativePath(file.toAbsolutePath().toString(), projectPath));
            documentNode.setType(getDocumentType(file));
            documentNode.setSize(attrs.size());
            documentNode.setLastModified(Instant.ofEpochMilli(attrs.lastModifiedTime().toMillis()).toString());
            
            // Read content
            String content = readFileContent(file);
            documentNode.setContent(content);
            documentNode.setLineCount(countLines(content));
            documentNode.setEncoding(detectEncoding(file));
            
            result.addDocument(documentNode);
            
            // Create relationship
            Relationship relationship = new Relationship(
                "CONTAINS_DOCUMENT",
                "Project",
                codebaseName,
                "Document",
                codebaseName + ":" + documentNode.getFilePath()
            );
            result.addRelationship(relationship);
            
            logger.debug("Processed document: {}", file.getFileName());
            
        } catch (Exception e) {
            logger.error("Error processing document file: " + file, e);
        }
    }

    private String getDocumentType(Path file) {
        String fileName = file.getFileName().toString().toLowerCase();
        
        if (fileName.endsWith(".md") || fileName.endsWith(".markdown")) {
            return "markdown";
        } else if (fileName.endsWith(".txt")) {
            return "text";
        } else if (fileName.endsWith(".rst")) {
            return "restructuredtext";
        } else if (fileName.endsWith(".adoc") || fileName.endsWith(".asciidoc")) {
            return "asciidoc";
        }
        
        // Special cases
        if (fileName.equals("readme.md") || fileName.equals("readme.markdown") || 
            fileName.equals("readme.txt") || fileName.equals("readme")) {
            return "readme";
        }
        
        return "document";
    }

    private String readFileContent(Path file) throws IOException {
        // Limit file size to prevent memory issues
        long fileSize = Files.size(file);
        if (fileSize > 10 * 1024 * 1024) { // 10MB limit
            logger.warn("Document file {} is too large ({}), truncating content", file, fileSize);
            byte[] bytes = new byte[10 * 1024 * 1024];
            try (var stream = Files.newInputStream(file)) {
                stream.read(bytes);
            }
            return new String(bytes, StandardCharsets.UTF_8);
        }
        
        return Files.readString(file, StandardCharsets.UTF_8);
    }

    private int countLines(String content) {
        if (content == null || content.isEmpty()) {
            return 0;
        }
        return content.split("\r\n|\r|\n", -1).length;
    }

    private String detectEncoding(Path file) {
        try {
            // Simple encoding detection - could be enhanced
            byte[] bytes = Files.readAllBytes(file);
            if (bytes.length >= 3 && bytes[0] == (byte) 0xEF && bytes[1] == (byte) 0xBB && bytes[2] == (byte) 0xBF) {
                return "UTF-8 with BOM";
            }
            
            // Try to decode as UTF-8
            Charset.forName("UTF-8").newDecoder().decode(java.nio.ByteBuffer.wrap(bytes));
            return "UTF-8";
        } catch (Exception e) {
            return "ASCII"; // Fallback
        }
    }
}