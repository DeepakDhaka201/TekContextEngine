package com.tekcode.parser.visitor;

import com.tekcode.parser.model.FileNode;
import com.tekcode.parser.model.ParseResult;
import spoon.reflect.cu.SourcePosition;
import spoon.reflect.declaration.CtCompilationUnit;
import spoon.reflect.visitor.CtAbstractVisitor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import com.tekcode.parser.util.PathUtils;

public class FileVisitor extends CtAbstractVisitor {
    private static final Logger logger = LoggerFactory.getLogger(FileVisitor.class);
    private final ParseResult result;
    private final String codebaseName;
    private final String projectPath;

    public FileVisitor(ParseResult result, String codebaseName, String projectPath) {
        this.result = result;
        this.codebaseName = codebaseName;
        this.projectPath = projectPath;
    }

    @Override
    public void visitCtCompilationUnit(CtCompilationUnit compilationUnit) {
        try {
            File file = compilationUnit.getFile();
            if (file != null && file.exists()) {
                FileNode fileNode = new FileNode();
                fileNode.setPath(PathUtils.toRelativePath(file.getAbsolutePath(), projectPath));
                fileNode.setFileName(file.getName());
                
                // Calculate checksum
                try {
                    byte[] content = Files.readAllBytes(file.toPath());
                    MessageDigest md = MessageDigest.getInstance("MD5");
                    byte[] digest = md.digest(content);
                    StringBuilder sb = new StringBuilder();
                    for (byte b : digest) {
                        sb.append(String.format("%02x", b));
                    }
                    fileNode.setChecksum(sb.toString());
                    
                    // Count lines
                    long lineCount = Files.lines(file.toPath()).count();
                    fileNode.setLineCount((int) lineCount);
                    
                } catch (IOException | NoSuchAlgorithmException e) {
                    logger.warn("Could not calculate checksum for file: " + file.getAbsolutePath(), e);
                    fileNode.setChecksum("");
                    fileNode.setLineCount(0);
                }
                
                result.addFile(fileNode);
            }
        } catch (Exception e) {
            logger.error("Error processing compilation unit", e);
        }
        
        super.visitCtCompilationUnit(compilationUnit);
    }
}