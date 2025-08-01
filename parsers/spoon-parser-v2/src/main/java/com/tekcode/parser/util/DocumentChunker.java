package com.tekcode.parser.util;

import com.tekcode.parser.config.ParserConfig;
import com.tekcode.parser.model.DocumentChunk;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Utility class for chunking document content based on various strategies
 */
public class DocumentChunker {
    
    private static final Logger logger = LoggerFactory.getLogger(DocumentChunker.class);
    
    // Patterns for different chunking strategies
    private static final Pattern SENTENCE_PATTERN = Pattern.compile("(?<=[.!?])\\s+");
    private static final Pattern PARAGRAPH_PATTERN = Pattern.compile("\\n\\s*\\n");
    private static final Pattern WORD_PATTERN = Pattern.compile("\\s+");
    private static final Pattern MARKDOWN_HEADER_PATTERN = Pattern.compile("^#{1,6}\\s+.*$", Pattern.MULTILINE);
    
    /**
     * Chunks document content based on the configuration
     * 
     * @param documentId The ID of the document being chunked
     * @param content The content to chunk
     * @param config The parser configuration
     * @return List of DocumentChunk objects
     */
    public static List<DocumentChunk> chunkDocument(String documentId, String content, ParserConfig config) {
        if (content == null || content.trim().isEmpty()) {
            logger.debug("Empty content for document: {}", documentId);
            return new ArrayList<>();
        }
        
        if (!config.isEnableDocumentChunking()) {
            // If chunking is disabled, return the entire content as a single chunk
            DocumentChunk singleChunk = new DocumentChunk(
                documentId + ":chunk:0", 
                documentId, 
                0, 
                content
            );
            singleChunk.setStartPosition(0);
            singleChunk.setEndPosition(content.length());
            singleChunk.setChunkType("full_document");
            return List.of(singleChunk);
        }
        
        String strategy = config.getDocumentChunkStrategy().toLowerCase();
        int chunkSize = config.getDocumentChunkSize();
        int overlap = config.getDocumentChunkOverlap();
        
        logger.debug("Chunking document {} with strategy: {}, size: {}, overlap: {}", 
                    documentId, strategy, chunkSize, overlap);
        
        switch (strategy) {
            case "character":
                return chunkByCharacter(documentId, content, chunkSize, overlap);
            case "word":
                return chunkByWord(documentId, content, chunkSize, overlap);
            case "sentence":
                return chunkBySentence(documentId, content, chunkSize, overlap);
            case "paragraph":
                return chunkByParagraph(documentId, content, chunkSize, overlap);
            case "markdown":
                return chunkByMarkdownStructure(documentId, content, chunkSize, overlap, config.isPreserveMarkdownStructure());
            default:
                logger.warn("Unknown chunking strategy: {}. Falling back to character-based chunking.", strategy);
                return chunkByCharacter(documentId, content, chunkSize, overlap);
        }
    }
    
    /**
     * Chunks content by character count
     */
    private static List<DocumentChunk> chunkByCharacter(String documentId, String content, int chunkSize, int overlap) {
        List<DocumentChunk> chunks = new ArrayList<>();
        int contentLength = content.length();
        int chunkIndex = 0;
        int start = 0;
        
        while (start < contentLength) {
            int end = Math.min(start + chunkSize, contentLength);
            String chunkContent = content.substring(start, end);
            
            DocumentChunk chunk = createChunk(documentId, chunkIndex, chunkContent, start, end);
            chunk.setChunkType("character");
            chunk.setOverlap(chunkIndex > 0 ? Math.min(overlap, start) : 0);
            
            chunks.add(chunk);
            
            // Move start position considering overlap
            start = Math.max(start + chunkSize - overlap, start + 1);
            chunkIndex++;
        }
        
        return chunks;
    }
    
    /**
     * Chunks content by word count
     */
    private static List<DocumentChunk> chunkByWord(String documentId, String content, int chunkSize, int overlap) {
        String[] words = WORD_PATTERN.split(content);
        List<DocumentChunk> chunks = new ArrayList<>();
        int chunkIndex = 0;
        int start = 0;
        
        while (start < words.length) {
            int end = Math.min(start + chunkSize, words.length);
            String chunkContent = String.join(" ", java.util.Arrays.copyOfRange(words, start, end));
            
            int startPos = getWordPosition(content, words, start);
            int endPos = getWordPosition(content, words, end);
            
            DocumentChunk chunk = createChunk(documentId, chunkIndex, chunkContent, startPos, endPos);
            chunk.setChunkType("word");
            chunk.setOverlap(chunkIndex > 0 ? Math.min(overlap, start) : 0);
            
            chunks.add(chunk);
            
            start = Math.max(start + chunkSize - overlap, start + 1);
            chunkIndex++;
        }
        
        return chunks;
    }
    
    /**
     * Chunks content by sentences
     */
    private static List<DocumentChunk> chunkBySentence(String documentId, String content, int chunkSize, int overlap) {
        String[] sentences = SENTENCE_PATTERN.split(content);
        List<DocumentChunk> chunks = new ArrayList<>();
        int chunkIndex = 0;
        int start = 0;
        
        while (start < sentences.length) {
            int end = Math.min(start + chunkSize, sentences.length);
            String chunkContent = String.join(" ", java.util.Arrays.copyOfRange(sentences, start, end));
            
            DocumentChunk chunk = createChunk(documentId, chunkIndex, chunkContent, 0, chunkContent.length());
            chunk.setChunkType("sentence");
            chunk.setOverlap(chunkIndex > 0 ? Math.min(overlap, start) : 0);
            
            chunks.add(chunk);
            
            start = Math.max(start + chunkSize - overlap, start + 1);
            chunkIndex++;
        }
        
        return chunks;
    }
    
    /**
     * Chunks content by paragraphs
     */
    private static List<DocumentChunk> chunkByParagraph(String documentId, String content, int chunkSize, int overlap) {
        String[] paragraphs = PARAGRAPH_PATTERN.split(content);
        List<DocumentChunk> chunks = new ArrayList<>();
        int chunkIndex = 0;
        int start = 0;
        
        while (start < paragraphs.length) {
            int end = Math.min(start + chunkSize, paragraphs.length);
            String chunkContent = String.join("\n\n", java.util.Arrays.copyOfRange(paragraphs, start, end));
            
            DocumentChunk chunk = createChunk(documentId, chunkIndex, chunkContent, 0, chunkContent.length());
            chunk.setChunkType("paragraph");
            chunk.setOverlap(chunkIndex > 0 ? Math.min(overlap, start) : 0);
            
            chunks.add(chunk);
            
            start = Math.max(start + chunkSize - overlap, start + 1);
            chunkIndex++;
        }
        
        return chunks;
    }
    
    /**
     * Chunks content by markdown structure (headers, sections)
     */
    private static List<DocumentChunk> chunkByMarkdownStructure(String documentId, String content, int chunkSize, int overlap, boolean preserveStructure) {
        if (!preserveStructure) {
            return chunkByCharacter(documentId, content, chunkSize, overlap);
        }
        
        // For now, fall back to paragraph chunking for markdown
        // This could be enhanced to respect markdown headers and structure
        List<DocumentChunk> chunks = chunkByParagraph(documentId, content, chunkSize, overlap);
        chunks.forEach(chunk -> chunk.setChunkType("markdown"));
        
        return chunks;
    }
    
    /**
     * Creates a DocumentChunk with common properties
     */
    private static DocumentChunk createChunk(String documentId, int chunkIndex, String content, int startPos, int endPos) {
        String chunkId = documentId + ":chunk:" + chunkIndex;
        DocumentChunk chunk = new DocumentChunk(chunkId, documentId, chunkIndex, content);
        chunk.setStartPosition(startPos);
        chunk.setEndPosition(endPos);
        return chunk;
    }
    
    /**
     * Gets the character position of a word in the original content
     */
    private static int getWordPosition(String content, String[] words, int wordIndex) {
        if (wordIndex >= words.length) {
            return content.length();
        }
        
        int position = 0;
        for (int i = 0; i < wordIndex && i < words.length; i++) {
            int wordStart = content.indexOf(words[i], position);
            if (wordStart >= 0) {
                position = wordStart + words[i].length();
            }
        }
        
        return Math.min(position, content.length());
    }
}
