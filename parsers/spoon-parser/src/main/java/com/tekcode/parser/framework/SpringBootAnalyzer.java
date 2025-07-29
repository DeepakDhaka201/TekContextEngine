package com.tekcode.parser.framework;

import com.tekcode.parser.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import com.tekcode.parser.util.PathUtils;

/**
 * Simplified Spring Boot analyzer focusing on essential features only
 */
public class SpringBootAnalyzer {
    private static final Logger logger = LoggerFactory.getLogger(SpringBootAnalyzer.class);
    private final String codebaseName;
    private final String projectPath;
    
    public SpringBootAnalyzer(String codebaseName, String projectPath) {
        this.codebaseName = codebaseName;
        this.projectPath = projectPath;
    }
    
    public void analyzeSpringBootSpecifics(ParseResult result) {
        logger.info("Analyzing Spring Boot specific features...");
        
        // Ensure collections are initialized
        if (result.getApiEndpoints() == null) {
            result.setApiEndpoints(new ArrayList<>());
        }
        
        // 1. Find REST Controllers and their endpoints
        analyzeRestControllers(result);
        
        // 2. Mark Spring components (Services, Repositories, etc.)
        markSpringComponents(result);
        
        // 3. Extract API endpoints from controller methods
        extractApiEndpoints(result);
    }
    
    private void analyzeRestControllers(ParseResult result) {
        for (ClassNode classNode : result.getClasses()) {
            if (hasAnnotation(classNode, "RestController") || hasAnnotation(classNode, "Controller")) {
                classNode.setController(true);
                
                // Extract base path if present
                String basePath = extractRequestMappingPath(classNode);
                if (basePath != null) {
                    classNode.addProperty("basePath", basePath);
                }
            }
        }
    }
    
    private void markSpringComponents(ParseResult result) {
        for (ClassNode classNode : result.getClasses()) {
            // Mark services
            if (hasAnnotation(classNode, "Service")) {
                classNode.setService(true);
            }
            
            // Mark repositories
            if (hasAnnotation(classNode, "Repository")) {
                classNode.setRepository(true);
            }
            
            // Mark components
            if (hasAnnotation(classNode, "Component")) {
                classNode.setComponent(true);
            }
            
            // Mark configurations
            if (hasAnnotation(classNode, "Configuration") || hasAnnotation(classNode, "SpringBootApplication")) {
                classNode.setConfiguration(true);
            }
            
            // Mark entities
            if (hasAnnotation(classNode, "Entity")) {
                classNode.setEntity(true);
                
                // Extract table name if present
                String tableName = extractTableName(classNode);
                if (tableName != null) {
                    classNode.addProperty("tableName", tableName);
                }
            }
        }
    }
    
    private void extractApiEndpoints(ParseResult result) {
        // Find all controller classes
        List<ClassNode> controllers = result.getClasses().stream()
                .filter(c -> c.isController())
                .collect(Collectors.toList());
        
        for (ClassNode controller : controllers) {
            String basePath = (String) controller.getProperties().get("basePath");
            
            // Find all methods in this controller
            List<MethodNode> controllerMethods = result.getMethods().stream()
                    .filter(m -> m.getClassName() != null && 
                                m.getClassName().equals(controller.getFullyQualifiedName()))
                    .collect(Collectors.toList());
            
            for (MethodNode method : controllerMethods) {
                APIEndpointNode endpoint = extractEndpointFromMethod(method, basePath, controller);
                if (endpoint != null) {
                    result.addApiEndpoint(endpoint);
                    method.setApiEndpoint(true);
                    method.setHttpMethod(endpoint.getHttpMethod());
                    method.setRequestPath(endpoint.getPath());
                    
                    // Create IMPLEMENTS_ENDPOINT relationship
                    Relationship implementsEndpoint = new Relationship(
                        "IMPLEMENTS_ENDPOINT",
                        "Method",
                        method.getId(),
                        "APIEndpoint",
                        endpoint.getId()
                    );
                    result.addRelationship(implementsEndpoint);
                }
            }
        }
    }
    
    private APIEndpointNode extractEndpointFromMethod(MethodNode method, String basePath, ClassNode controller) {
        String httpMethod = null;
        String path = null;
        
        // Check for HTTP method annotations
        if (hasAnnotation(method, "GetMapping")) {
            httpMethod = "GET";
            path = extractPathFromAnnotation(method, "GetMapping");
        } else if (hasAnnotation(method, "PostMapping")) {
            httpMethod = "POST";
            path = extractPathFromAnnotation(method, "PostMapping");
        } else if (hasAnnotation(method, "PutMapping")) {
            httpMethod = "PUT";
            path = extractPathFromAnnotation(method, "PutMapping");
        } else if (hasAnnotation(method, "DeleteMapping")) {
            httpMethod = "DELETE";
            path = extractPathFromAnnotation(method, "DeleteMapping");
        } else if (hasAnnotation(method, "PatchMapping")) {
            httpMethod = "PATCH";
            path = extractPathFromAnnotation(method, "PatchMapping");
        } else if (hasAnnotation(method, "RequestMapping")) {
            httpMethod = extractHttpMethodFromRequestMapping(method);
            path = extractPathFromAnnotation(method, "RequestMapping");
        }
        
        if (httpMethod == null) {
            return null;
        }
        
        // Build full path
        String fullPath = buildFullPath(basePath, path, method.getName());
        
        // Create endpoint node
        APIEndpointNode endpoint = new APIEndpointNode();
        endpoint.setId(codebaseName + ":endpoint:" + httpMethod + ":" + fullPath);
        endpoint.setHttpMethod(httpMethod);
        endpoint.setPath(fullPath);
        endpoint.setDescription(method.getComment());
        endpoint.setMethodName(method.getName());
        endpoint.setClassName(controller.getName());
        endpoint.setFilePath(controller.getFilePath());
        endpoint.setParameters(method.getParameters());
        endpoint.setReturnType(method.getReturnType());
        
        return endpoint;
    }
    
    
    // Helper methods
    private boolean hasAnnotation(ClassNode classNode, String annotationName) {
        if (classNode.getDecorators() == null) return false;
        
        return classNode.getDecorators().stream()
                .anyMatch(d -> {
                    String decoratorName = d.getName();
                    return decoratorName.equals(annotationName) || 
                           decoratorName.equals("@" + annotationName) ||
                           decoratorName.equalsIgnoreCase(annotationName) ||
                           decoratorName.equalsIgnoreCase("@" + annotationName);
                });
    }
    
    private boolean hasAnnotation(MethodNode method, String annotationName) {
        if (method.getDecorators() == null) return false;
        
        return method.getDecorators().stream()
                .anyMatch(d -> {
                    String decoratorName = d.getName();
                    return decoratorName.equals(annotationName) || 
                           decoratorName.equals("@" + annotationName) ||
                           decoratorName.equalsIgnoreCase(annotationName) ||
                           decoratorName.equalsIgnoreCase("@" + annotationName);
                });
    }
    
    private String extractRequestMappingPath(ClassNode classNode) {
        if (classNode.getDecorators() == null) return null;
        
        return classNode.getDecorators().stream()
                .filter(d -> d.getName().equals("RequestMapping") || 
                           d.getName().equals("@RequestMapping"))
                .findFirst()
                .map(d -> {
                    if (d.getArguments() != null && !d.getArguments().isEmpty()) {
                        // First, specifically look for path or value parameters
                        for (Object arg : d.getArguments()) {
                            String argStr = arg.toString();
                            
                            // Check for explicit path parameter first
                            if (argStr.contains("path=")) {
                                String[] parts = argStr.split("path=", 2);
                                if (parts.length > 1) {
                                    String value = parts[1].split(",")[0].trim();
                                    String cleanValue = value.replace("\\\"", "").replace("\"", "").replace("'", "").trim();
                                    if (cleanValue.startsWith("/")) {
                                        return cleanValue;
                                    }
                                }
                            }
                            
                            // Check for value parameter
                            if (argStr.contains("value=")) {
                                String[] parts = argStr.split("value=", 2);
                                if (parts.length > 1) {
                                    String value = parts[1].split(",")[0].trim();
                                    String cleanValue = value.replace("\\\"", "").replace("\"", "").replace("'", "").trim();
                                    if (cleanValue.startsWith("/")) {
                                        return cleanValue;
                                    }
                                }
                            }
                        }
                        
                        // If no named path/value parameter found, look for positional path arguments
                        for (Object arg : d.getArguments()) {
                            String argStr = arg.toString();
                            
                            // Skip non-path parameters
                            if (argStr.contains("produces=") || argStr.contains("consumes=") || 
                                argStr.contains("headers=") || argStr.contains("method=") ||
                                argStr.contains("MediaType.") || argStr.contains("RequestMethod.")) {
                                continue;
                            }
                            
                            // Clean up quotes and check if it's a path
                            String cleanArg = argStr.replace("\\\"", "").replace("\"", "").replace("'", "").trim();
                            if (cleanArg.startsWith("/")) {
                                return cleanArg;
                            }
                        }
                    }
                    return null;
                })
                .orElse(null);
    }
    
    private String extractPathFromAnnotation(MethodNode method, String annotationName) {
        if (method.getDecorators() == null) return null;
        
        return method.getDecorators().stream()
                .filter(d -> d.getName().equals(annotationName) || 
                           d.getName().equals("@" + annotationName))
                .findFirst()
                .map(d -> {
                    if (d.getArguments() != null && !d.getArguments().isEmpty()) {
                        // First, specifically look for path or value parameters
                        for (Object arg : d.getArguments()) {
                            String argStr = arg.toString();
                            
                            // Check for explicit path parameter first
                            if (argStr.contains("path=")) {
                                String[] parts = argStr.split("path=", 2);
                                if (parts.length > 1) {
                                    String value = parts[1].split(",")[0].trim();
                                    String cleanValue = value.replace("\\\"", "").replace("\"", "").replace("'", "").trim();
                                    if (cleanValue.startsWith("/")) {
                                        return cleanValue;
                                    }
                                }
                            }
                            
                            // Check for value parameter
                            if (argStr.contains("value=")) {
                                String[] parts = argStr.split("value=", 2);
                                if (parts.length > 1) {
                                    String value = parts[1].split(",")[0].trim();
                                    String cleanValue = value.replace("\\\"", "").replace("\"", "").replace("'", "").trim();
                                    if (cleanValue.startsWith("/")) {
                                        return cleanValue;
                                    }
                                }
                            }
                        }
                        
                        // If no named path/value parameter found, look for positional path arguments
                        for (Object arg : d.getArguments()) {
                            String argStr = arg.toString();
                            
                            // Skip non-path parameters
                            if (argStr.contains("produces=") || argStr.contains("consumes=") || 
                                argStr.contains("headers=") || argStr.contains("method=") ||
                                argStr.contains("MediaType.") || argStr.contains("RequestMethod.")) {
                                continue;
                            }
                            
                            // Clean up quotes and check if it's a path
                            String cleanArg = argStr.replace("\\\"", "").replace("\"", "").replace("'", "").trim();
                            if (cleanArg.startsWith("/")) {
                                return cleanArg;
                            }
                        }
                    }
                    return "";
                })
                .orElse("");
    }
    
    private String extractHttpMethodFromRequestMapping(MethodNode method) {
        // For @RequestMapping, default to GET if no method specified
        return "GET";
    }
    
    private String buildFullPath(String basePath, String methodPath, String methodName) {
        StringBuilder path = new StringBuilder();
        
        if (basePath != null && !basePath.isEmpty()) {
            if (!basePath.startsWith("/")) {
                path.append("/");
            }
            path.append(basePath);
        }
        
        if (methodPath != null && !methodPath.isEmpty()) {
            if (!methodPath.startsWith("/") && !path.toString().endsWith("/")) {
                path.append("/");
            }
            path.append(methodPath);
        } else {
            // If no path specified, use method name as path
            if (!path.toString().endsWith("/")) {
                path.append("/");
            }
            path.append(methodName);
        }
        
        return path.toString();
    }
    
    private String extractTableName(ClassNode entity) {
        if (entity.getDecorators() == null) return entity.getName().toLowerCase();
        
        return entity.getDecorators().stream()
                .filter(d -> d.getName().equals("Table") || d.getName().equals("@Table"))
                .findFirst()
                .map(d -> {
                    if (d.getProperties() != null && d.getProperties().get("name") != null) {
                        return d.getProperties().get("name").toString().replace("\"", "");
                    }
                    return entity.getName().toLowerCase();
                })
                .orElse(entity.getName().toLowerCase());
    }
    
}