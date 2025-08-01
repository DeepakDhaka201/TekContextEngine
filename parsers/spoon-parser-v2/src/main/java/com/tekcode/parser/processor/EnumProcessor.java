package com.tekcode.parser.processor;

import com.tekcode.parser.core.ParsingContext;
import com.tekcode.parser.model.DecoratorInfo;
import com.tekcode.parser.model.EnumConstantInfo;
import com.tekcode.parser.model.EnumNode;
import com.tekcode.parser.util.IdGenerator;
import com.tekcode.parser.util.PathUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import spoon.reflect.declaration.CtAnnotation;
import spoon.reflect.declaration.CtEnum;
import spoon.reflect.declaration.CtEnumValue;
import spoon.reflect.declaration.ModifierKind;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Processor for extracting enum-level information
 */
public class EnumProcessor {
    private static final Logger logger = LoggerFactory.getLogger(EnumProcessor.class);
    
    private final ParsingContext context;
    
    public EnumProcessor(ParsingContext context) {
        this.context = context;
    }
    
    /**
     * Processes an enum and extracts comprehensive information
     */
    public EnumNode processEnum(CtEnum<?> ctEnum) {
        try {
            if (!shouldIncludeEnum(ctEnum)) {
                return null;
            }
            
            EnumNode enumNode = new EnumNode();
            
            // Basic information
            enumNode.setName(ctEnum.getSimpleName());
            enumNode.setFullyQualifiedName(ctEnum.getQualifiedName());
            enumNode.setId(IdGenerator.generateEnumId(context.getCodebaseName(), ctEnum.getQualifiedName()));
            
            // Comments and documentation
            if (context.shouldIncludeComments() && ctEnum.getDocComment() != null) {
                enumNode.setComment(ctEnum.getDocComment());
            }
            
            // Visibility
            extractVisibility(enumNode, ctEnum);
            
            // Position information
            extractPositionInfo(enumNode, ctEnum);
            
            // Enum constants
            List<EnumConstantInfo> enumConstants = extractEnumConstants(ctEnum);
            enumNode.setEnumConstants(enumConstants);
            
            // Annotations/Decorators
            List<DecoratorInfo> decorators = new ArrayList<>();
            if (context.shouldExtractAnnotations()) {
                decorators = extractDecorators(ctEnum);
            }
            enumNode.setDecorators(decorators);
            
            // Metrics
            enumNode.setMethodCount(ctEnum.getMethods().size());
            enumNode.setFieldCount(ctEnum.getFields().size());
            
            logger.debug("Processed enum: {}", ctEnum.getQualifiedName());
            return enumNode;
            
        } catch (Exception e) {
            logger.error("Error processing enum: {}", ctEnum.getQualifiedName(), e);
            context.incrementErrorCount();
            return null;
        }
    }
    
    /**
     * Determines if an enum should be included based on configuration
     */
    private boolean shouldIncludeEnum(CtEnum<?> ctEnum) {
        // Check visibility
        if (!context.shouldIncludePrivateMembers() && ctEnum.hasModifier(ModifierKind.PRIVATE)) {
            return false;
        }
        
        // Check package filters
        String packageName = ctEnum.getPackage() != null ? ctEnum.getPackage().getQualifiedName() : "";
        
        // Check exclude packages
        for (String excludePackage : context.getConfig().getExcludePackages()) {
            if (packageName.startsWith(excludePackage)) {
                return false;
            }
        }
        
        // Check include packages (if specified)
        if (!context.getConfig().getIncludePackages().isEmpty()) {
            boolean matches = false;
            for (String includePackage : context.getConfig().getIncludePackages()) {
                if (packageName.startsWith(includePackage)) {
                    matches = true;
                    break;
                }
            }
            if (!matches) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Extracts visibility information
     */
    private void extractVisibility(EnumNode enumNode, CtEnum<?> ctEnum) {
        if (ctEnum.hasModifier(ModifierKind.PUBLIC)) {
            enumNode.setVisibility("public");
        } else if (ctEnum.hasModifier(ModifierKind.PROTECTED)) {
            enumNode.setVisibility("protected");
        } else if (ctEnum.hasModifier(ModifierKind.PRIVATE)) {
            enumNode.setVisibility("private");
        } else {
            enumNode.setVisibility("package");
        }
    }
    
    /**
     * Extracts position information (file path, line numbers)
     */
    private void extractPositionInfo(EnumNode enumNode, CtEnum<?> ctEnum) {
        if (ctEnum.getPosition() != null && ctEnum.getPosition().isValidPosition()) {
            var position = ctEnum.getPosition();
            
            if (position.getFile() != null) {
                String filePath = PathUtils.toRelativePath(
                    position.getFile().getAbsolutePath(), 
                    context.getProjectPath()
                );
                enumNode.setFilePath(filePath);
            }
            
            enumNode.setStartLine(position.getLine());
            enumNode.setEndLine(position.getEndLine());
        }
    }
    
    /**
     * Extracts enum constants information
     */
    private List<EnumConstantInfo> extractEnumConstants(CtEnum<?> ctEnum) {
        List<EnumConstantInfo> constants = new ArrayList<>();
        
        List<CtEnumValue<?>> enumValues = ctEnum.getEnumValues();
        for (int i = 0; i < enumValues.size(); i++) {
            CtEnumValue<?> enumValue = enumValues.get(i);
            
            try {
                EnumConstantInfo constantInfo = new EnumConstantInfo();
                constantInfo.setName(enumValue.getSimpleName());
                constantInfo.setOrdinal(i);
                
                // Extract constructor arguments if any
                // Note: Spoon doesn't directly expose enum constructor arguments
                // This would require more complex analysis of the enum value initialization
                
                // Extract comments
                if (context.shouldIncludeComments() && enumValue.getDocComment() != null) {
                    constantInfo.setComment(enumValue.getDocComment());
                }
                
                // Extract annotations
                List<DecoratorInfo> decorators = new ArrayList<>();
                if (context.shouldExtractAnnotations()) {
                    for (CtAnnotation<?> annotation : enumValue.getAnnotations()) {
                        try {
                            DecoratorInfo decorator = new DecoratorInfo();
                            decorator.setName(annotation.getAnnotationType().getSimpleName());
                            decorator.setFullyQualifiedName(annotation.getAnnotationType().getQualifiedName());

                            Map<String, Object> properties = new HashMap<>();
                            annotation.getValues().forEach((key, value) -> {
                                properties.put(key, value != null ? value.toString() : null);
                            });
                            decorator.setProperties(properties);

                            decorators.add(decorator);
                        } catch (Exception e) {
                            logger.warn("Error extracting annotation from enum constant: {}", annotation, e);
                        }
                    }
                }
                constantInfo.setDecorators(decorators);
                
                constants.add(constantInfo);
                
            } catch (Exception e) {
                logger.warn("Error extracting enum constant: {}", enumValue.getSimpleName(), e);
            }
        }
        
        return constants;
    }
    
    /**
     * Extracts annotation/decorator information
     */
    private List<DecoratorInfo> extractDecorators(CtEnum<?> ctEnum) {
        List<DecoratorInfo> decorators = new ArrayList<>();
        
        for (CtAnnotation<?> annotation : ctEnum.getAnnotations()) {
            try {
                DecoratorInfo decorator = new DecoratorInfo();
                decorator.setName(annotation.getAnnotationType().getSimpleName());
                decorator.setFullyQualifiedName(annotation.getAnnotationType().getQualifiedName());
                
                // Extract annotation values
                Map<String, Object> properties = new HashMap<>();
                annotation.getValues().forEach((key, value) -> {
                    properties.put(key, value != null ? value.toString() : null);
                });
                decorator.setProperties(properties);
                
                decorators.add(decorator);
                
            } catch (Exception e) {
                logger.warn("Error extracting annotation: {}", annotation, e);
            }
        }
        
        return decorators;
    }
}
