package com.tekcode.parser.util;

import com.tekcode.parser.core.ParsingContext;
import com.tekcode.parser.model.DecoratorInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import spoon.reflect.declaration.CtAnnotation;
import spoon.reflect.declaration.CtElement;
import spoon.reflect.declaration.CtModifiable;
import spoon.reflect.declaration.ModifierKind;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Common utility methods shared across processors to eliminate code duplication
 */
public class ProcessorUtils {
    
    private static final Logger logger = LoggerFactory.getLogger(ProcessorUtils.class);
    
    /**
     * Extracts position information (file path, line numbers) from any Spoon element
     */
    public static void extractPositionInfo(Object targetNode, CtElement element, ParsingContext context) {
        if (element.getPosition() != null && element.getPosition().isValidPosition()) {
            var position = element.getPosition();
            
            if (position.getFile() != null) {
                String filePath = PathUtils.toRelativePath(
                    position.getFile().getAbsolutePath(),
                    context.getProjectPath()
                );
                setFilePath(targetNode, filePath);
            }
            
            setLineNumbers(targetNode, position.getLine(), position.getEndLine());
        }
    }
    
    /**
     * Extracts annotation/decorator information from any annotated element
     */
    public static List<DecoratorInfo> extractDecorators(CtElement element) {
        List<DecoratorInfo> decorators = new ArrayList<>();
        
        for (CtAnnotation<?> annotation : element.getAnnotations()) {
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
    
    /**
     * Gets visibility string from a modifiable element
     */
    public static String getVisibility(CtModifiable element) {
        if (element.hasModifier(ModifierKind.PUBLIC)) {
            return "public";
        } else if (element.hasModifier(ModifierKind.PROTECTED)) {
            return "protected";
        } else if (element.hasModifier(ModifierKind.PRIVATE)) {
            return "private";
        } else {
            return "package";
        }
    }
    
    /**
     * Checks if element has specific modifier
     */
    public static boolean hasModifier(CtModifiable element, ModifierKind modifier) {
        return element.hasModifier(modifier);
    }
    
    /**
     * Checks if package should be included based on configuration
     */
    public static boolean shouldIncludePackage(String packageName, ParsingContext context) {
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
    
    // === Private helper methods using reflection to set properties ===
    
    private static void setFilePath(Object targetNode, String filePath) {
        try {
            var method = targetNode.getClass().getMethod("setFilePath", String.class);
            method.invoke(targetNode, filePath);
        } catch (Exception e) {
            logger.debug("Could not set filePath on {}: {}", targetNode.getClass().getSimpleName(), e.getMessage());
        }
    }
    
    private static void setLineNumbers(Object targetNode, int startLine, int endLine) {
        try {
            var startMethod = targetNode.getClass().getMethod("setStartLine", int.class);
            var endMethod = targetNode.getClass().getMethod("setEndLine", int.class);
            startMethod.invoke(targetNode, startLine);
            endMethod.invoke(targetNode, endLine);
        } catch (Exception e) {
            logger.debug("Could not set line numbers on {}: {}", targetNode.getClass().getSimpleName(), e.getMessage());
        }
    }
}
