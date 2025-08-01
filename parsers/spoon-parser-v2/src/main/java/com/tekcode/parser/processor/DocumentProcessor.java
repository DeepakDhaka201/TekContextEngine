package com.tekcode.parser.processor;

import com.tekcode.parser.core.ParsingContext;
import com.tekcode.parser.model.DocumentChunk;
import com.tekcode.parser.model.DocumentNode;
import com.tekcode.parser.model.Relationship;
import com.tekcode.parser.util.DocumentChunker;
import com.tekcode.parser.util.PathUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Processes documentation files (README, markdown, text files, etc.)
 */
public class DocumentProcessor {
    
    private static final Logger logger = LoggerFactory.getLogger(DocumentProcessor.class);
    private final ParsingContext context;
    
    // Supported document extensions
    private static final List<String> DOCUMENT_EXTENSIONS = Arrays.asList(
        ".md", ".markdown", ".txt", ".rst", ".adoc", ".asciidoc", ".readme"
    );
    
    public DocumentProcessor(ParsingContext context) {
        this.context = context;
    }
    
    /**
     * Scans the project directory for documentation files and processes them
     *
     * @return DocumentProcessingResult containing documents and chunks
     */
    public DocumentProcessingResult processDocuments() {
        List<DocumentNode> documents = new ArrayList<>();
        List<DocumentChunk> documentChunks = new ArrayList<>();
        List<Relationship> relationships = new ArrayList<>();
        
        try {
            Path startPath = Paths.get(context.getProjectPath());
            logger.info("Starting document scan from path: {}", startPath.toAbsolutePath());
            
            Files.walkFileTree(startPath, new SimpleFileVisitor<Path>() {
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    if (isDocumentFile(file)) {
                        logger.info("Found document file: {}", file);
                        SingleDocumentResult singleResult = processDocumentFile(file, attrs);
                        if (singleResult != null) {
                            if (singleResult.document != null) {
                                documents.add(singleResult.document);
                            }
                            documentChunks.addAll(singleResult.chunks);
                            relationships.addAll(singleResult.relationships);
                        }
                    }
                    return FileVisitResult.CONTINUE;
                }
                
                @Override
                public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                    // Skip hidden directories and common build/cache directories
                    String dirName = dir.getFileName().toString();
                    if (dirName.startsWith(".") || 
                        dirName.equals("target") || 
                        dirName.equals("build") || 
                        dirName.equals("node_modules") ||
                        dirName.equals("dist")) {
                        return FileVisitResult.SKIP_SUBTREE;
                    }
                    return FileVisitResult.CONTINUE;
                }
            });
            
            logger.info("Document scan completed. Found {} documents with {} chunks",
                       documents.size(), documentChunks.size());

        } catch (IOException e) {
            logger.error("Error walking file tree for documents", e);
            context.incrementErrorCount();
        }

        return new DocumentProcessingResult(documents, documentChunks, relationships);
    }
    
    /**
     * Checks if a file is a documentation file based on its extension
     */
    private boolean isDocumentFile(Path file) {
        String fileName = file.getFileName().toString().toLowerCase();
        
        // Check for README files without extension
        if (fileName.equals("readme") || fileName.startsWith("readme.")) {
            return true;
        }
        
        // Check for supported extensions
        return DOCUMENT_EXTENSIONS.stream().anyMatch(fileName::endsWith);
    }
    
    /**
     * Processes a single document file and creates DocumentNode with chunks
     */
    private SingleDocumentResult processDocumentFile(Path file, BasicFileAttributes attrs) {
        try {
            DocumentNode documentNode = new DocumentNode();
            
            // Generate unique ID
            String relativePath = PathUtils.toRelativePath(file.toAbsolutePath().toString(), context.getProjectPath());
            documentNode.setId(context.getCodebaseName() + ":document:" + relativePath);
            
            // Basic file information
            documentNode.setPath(relativePath);
            documentNode.setTitle(file.getFileName().toString());
            documentNode.setType(getDocumentType(file));
            
            // File metadata
            documentNode.setTotalSize(attrs.size());
            documentNode.setLastModified(Instant.ofEpochMilli(attrs.lastModifiedTime().toMillis()).toString());
            documentNode.setEncoding(detectEncoding(file));

            // Read and chunk content
            String content = readFileContent(file);
            List<DocumentChunk> chunks = DocumentChunker.chunkDocument(documentNode.getId(), content, context.getConfig());

            // Update document metadata
            documentNode.setTotalChunks(chunks.size());
            documentNode.setChunkSize(context.getConfig().getDocumentChunkSize());
            documentNode.setChunkOverlap(context.getConfig().getDocumentChunkOverlap());
            documentNode.getProperties().put("lineCount", countLines(content));
            documentNode.getProperties().put("originalContentLength", content.length());

            // Create HAS_CHUNK relationships
            List<Relationship> relationships = new ArrayList<>();
            for (DocumentChunk chunk : chunks) {
                Relationship hasChunkRel = new Relationship(
                    "HAS_CHUNK",
                    "Document",
                    documentNode.getId(),
                    "DocumentChunk",
                    chunk.getId()
                );
                relationships.add(hasChunkRel);
            }

            logger.debug("Processed document: {} ({} bytes, {} chunks)", relativePath, attrs.size(), chunks.size());
            return new SingleDocumentResult(documentNode, chunks, relationships);
            
        } catch (Exception e) {
            logger.error("Error processing document file: " + file, e);
            context.incrementErrorCount();
            return null;
        }
    }
    
    /**
     * Determines the document type based on file extension
     */
    private String getDocumentType(Path file) {
        String fileName = file.getFileName().toString().toLowerCase();
        
        if (fileName.startsWith("readme")) {
            return "readme";
        } else if (fileName.endsWith(".md") || fileName.endsWith(".markdown")) {
            return "markdown";
        } else if (fileName.endsWith(".txt")) {
            return "text";
        } else if (fileName.endsWith(".rst")) {
            return "restructuredtext";
        } else if (fileName.endsWith(".adoc") || fileName.endsWith(".asciidoc")) {
            return "asciidoc";
        } else {
            return "document";
        }
    }
    
    /**
     * Reads the content of a file with size limits
     */
    private String readFileContent(Path file) throws IOException {
        // Limit file size to prevent memory issues (10MB limit)
        long fileSize = Files.size(file);
        if (fileSize > 10 * 1024 * 1024) {
            logger.warn("Document file {} is too large ({}), truncating content", file, fileSize);
            byte[] bytes = new byte[10 * 1024 * 1024];
            try (var stream = Files.newInputStream(file)) {
                stream.read(bytes);
            }
            return new String(bytes, StandardCharsets.UTF_8);
        }
        
        return Files.readString(file, StandardCharsets.UTF_8);
    }
    
    /**
     * Counts the number of lines in content
     */
    private int countLines(String content) {
        if (content == null || content.isEmpty()) {
            return 0;
        }
        return content.split("\r\n|\r|\n", -1).length;
    }
    
    /**
     * Detects file encoding (simplified - assumes UTF-8)
     */
    private String detectEncoding(Path file) {
        // For simplicity, assume UTF-8. Could be enhanced with actual encoding detection
        return "UTF-8";
    }

    /**
     * Result class for processing multiple documents
     */
    public static class DocumentProcessingResult {
        public final List<DocumentNode> documents;
        public final List<DocumentChunk> chunks;
        public final List<Relationship> relationships;

        public DocumentProcessingResult(List<DocumentNode> documents, List<DocumentChunk> chunks, List<Relationship> relationships) {
            this.documents = documents != null ? documents : new ArrayList<>();
            this.chunks = chunks != null ? chunks : new ArrayList<>();
            this.relationships = relationships != null ? relationships : new ArrayList<>();
        }
    }

    /**
     * Result class for processing a single document
     */
    public static class SingleDocumentResult {
        public final DocumentNode document;
        public final List<DocumentChunk> chunks;
        public final List<Relationship> relationships;

        public SingleDocumentResult(DocumentNode document, List<DocumentChunk> chunks, List<Relationship> relationships) {
            this.document = document;
            this.chunks = chunks != null ? chunks : new ArrayList<>();
            this.relationships = relationships != null ? relationships : new ArrayList<>();
        }
    }
}
