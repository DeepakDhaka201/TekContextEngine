package com.tekcode.parser.processor;

import com.tekcode.parser.core.ParsingContext;
import com.tekcode.parser.model.APIEndpointNode;
import com.tekcode.parser.model.DecoratorInfo;
import com.tekcode.parser.util.IdGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import spoon.reflect.declaration.*;
import spoon.reflect.visitor.CtScanner;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Processor for extracting API endpoints from Spring Boot controllers
 */
public class APIEndpointProcessor {
    
    private static final Logger logger = LoggerFactory.getLogger(APIEndpointProcessor.class);
    private final ParsingContext context;
    private final List<APIEndpointNode> endpoints = new ArrayList<>();
    
    public APIEndpointProcessor(ParsingContext context) {
        this.context = context;
    }
    
    /**
     * Extract API endpoints from all types in the model
     */
    public List<APIEndpointNode> extractAPIEndpoints(List<CtType<?>> types) {
        logger.debug("Extracting API endpoints from {} types", types.size());
        
        for (CtType<?> type : types) {
            if (type instanceof CtClass) {
                processController((CtClass<?>) type);
            }
        }
        
        logger.debug("Found {} API endpoints", endpoints.size());
        return new ArrayList<>(endpoints);
    }
    
    /**
     * Process a class to check if it's a controller and extract endpoints
     */
    private void processController(CtClass<?> ctClass) {
        // Check if class has @RestController or @Controller annotation
        boolean isController = hasControllerAnnotation(ctClass);
        if (!isController) {
            return;
        }
        
        logger.debug("Processing controller: {}", ctClass.getQualifiedName());
        
        // Get base path from @RequestMapping on class
        String basePath = getBasePath(ctClass);
        
        // Process all methods in the controller
        for (CtMethod<?> method : ctClass.getMethods()) {
            processControllerMethod(ctClass, method, basePath);
        }
    }
    
    /**
     * Check if class has controller annotations
     */
    private boolean hasControllerAnnotation(CtClass<?> ctClass) {
        for (CtAnnotation<? extends java.lang.annotation.Annotation> annotation : ctClass.getAnnotations()) {
            String annotationName = annotation.getAnnotationType().getQualifiedName();
            String simpleName = annotation.getAnnotationType().getSimpleName();
            if ("org.springframework.web.bind.annotation.RestController".equals(annotationName) ||
                "org.springframework.stereotype.Controller".equals(annotationName) ||
                "RestController".equals(simpleName) ||
                "Controller".equals(simpleName)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Get base path from class-level @RequestMapping
     */
    private String getBasePath(CtClass<?> ctClass) {
        for (CtAnnotation<? extends java.lang.annotation.Annotation> annotation : ctClass.getAnnotations()) {
            String annotationName = annotation.getAnnotationType().getQualifiedName();
            String simpleName = annotation.getAnnotationType().getSimpleName();
            if ("org.springframework.web.bind.annotation.RequestMapping".equals(annotationName) ||
                "RequestMapping".equals(simpleName)) {
                return extractPathFromAnnotation(annotation);
            }
        }
        return "";
    }
    
    /**
     * Process a controller method to extract endpoint information
     */
    private void processControllerMethod(CtClass<?> ctClass, CtMethod<?> method, String basePath) {
        List<String> httpMethods = new ArrayList<>();
        String path = "";
        
        // Check for mapping annotations
        for (CtAnnotation<? extends java.lang.annotation.Annotation> annotation : method.getAnnotations()) {
            String annotationName = annotation.getAnnotationType().getQualifiedName();
            String simpleName = annotation.getAnnotationType().getSimpleName();

            if ("org.springframework.web.bind.annotation.RequestMapping".equals(annotationName) ||
                "RequestMapping".equals(simpleName)) {
                httpMethods.addAll(extractHttpMethodsFromRequestMapping(annotation));
                path = extractPathFromAnnotation(annotation);
            } else if ("org.springframework.web.bind.annotation.GetMapping".equals(annotationName) ||
                       "GetMapping".equals(simpleName)) {
                httpMethods.add("GET");
                path = extractPathFromAnnotation(annotation);
            } else if ("org.springframework.web.bind.annotation.PostMapping".equals(annotationName) ||
                       "PostMapping".equals(simpleName)) {
                httpMethods.add("POST");
                path = extractPathFromAnnotation(annotation);
            } else if ("org.springframework.web.bind.annotation.PutMapping".equals(annotationName) ||
                       "PutMapping".equals(simpleName)) {
                httpMethods.add("PUT");
                path = extractPathFromAnnotation(annotation);
            } else if ("org.springframework.web.bind.annotation.DeleteMapping".equals(annotationName) ||
                       "DeleteMapping".equals(simpleName)) {
                httpMethods.add("DELETE");
                path = extractPathFromAnnotation(annotation);
            } else if ("org.springframework.web.bind.annotation.PatchMapping".equals(annotationName) ||
                       "PatchMapping".equals(simpleName)) {
                httpMethods.add("PATCH");
                path = extractPathFromAnnotation(annotation);
            }
        }
        
        // If we found mapping annotations, create endpoint
        if (!httpMethods.isEmpty()) {
            for (String httpMethod : httpMethods) {
                createAPIEndpoint(ctClass, method, httpMethod, basePath, path);
            }
        }
    }
    
    /**
     * Create an API endpoint node
     */
    private void createAPIEndpoint(CtClass<?> ctClass, CtMethod<?> method, String httpMethod, String basePath, String path) {
        APIEndpointNode endpoint = new APIEndpointNode();
        
        // Generate ID
        String endpointId = IdGenerator.generateAPIEndpointId(
            context.getCodebaseName(), 
            ctClass.getQualifiedName(), 
            method.getSimpleName(), 
            httpMethod
        );
        endpoint.setId(endpointId);
        
        // Basic information
        endpoint.setPath(combinePaths(basePath, path));
        endpoint.setHttpMethod(httpMethod);
        endpoint.setMethodName(method.getSimpleName());
        endpoint.setClassName(ctClass.getQualifiedName());

        // Store additional information in properties
        endpoint.getProperties().put("returnType", method.getType().getQualifiedName());

        // Parameters
        List<String> parameters = new ArrayList<>();
        for (CtParameter<?> param : method.getParameters()) {
            parameters.add(param.getType().getQualifiedName() + " " + param.getSimpleName());
        }
        endpoint.getProperties().put("parameters", parameters);

        // Decorators/Annotations
        List<Map<String, String>> decorators = new ArrayList<>();
        for (CtAnnotation<? extends java.lang.annotation.Annotation> annotation : method.getAnnotations()) {
            Map<String, String> decorator = new HashMap<>();
            decorator.put("name", annotation.getAnnotationType().getSimpleName());
            decorator.put("fullName", annotation.getAnnotationType().getQualifiedName());
            decorators.add(decorator);
        }
        endpoint.getProperties().put("decorators", decorators);

        // File information
        if (method.getPosition() != null && method.getPosition().getFile() != null) {
            endpoint.getProperties().put("filePath", method.getPosition().getFile().getPath());
            endpoint.getProperties().put("startLine", method.getPosition().getLine());
            endpoint.getProperties().put("endLine", method.getPosition().getEndLine());
        }
        
        endpoints.add(endpoint);
        logger.debug("Created API endpoint: {} {}", httpMethod, endpoint.getPath());
    }
    
    /**
     * Extract path from annotation (handles both value and path attributes)
     */
    private String extractPathFromAnnotation(CtAnnotation<? extends java.lang.annotation.Annotation> annotation) {
        // Try to get path from annotation values
        // This is a simplified implementation - in practice you'd need to handle more complex cases
        String path = annotation.toString();
        if (path.contains("path = \"")) {
            int start = path.indexOf("path = \"") + 8;
            int end = path.indexOf("\"", start);
            if (end > start) {
                return path.substring(start, end);
            }
        }
        if (path.contains("value = \"")) {
            int start = path.indexOf("value = \"") + 9;
            int end = path.indexOf("\"", start);
            if (end > start) {
                return path.substring(start, end);
            }
        }
        return "";
    }
    
    /**
     * Extract HTTP methods from @RequestMapping annotation
     */
    private List<String> extractHttpMethodsFromRequestMapping(CtAnnotation<? extends java.lang.annotation.Annotation> annotation) {
        List<String> methods = new ArrayList<>();
        String annotationStr = annotation.toString();
        
        // Simple parsing - in practice you'd want more robust parsing
        if (annotationStr.contains("RequestMethod.GET")) {
            methods.add("GET");
        }
        if (annotationStr.contains("RequestMethod.POST")) {
            methods.add("POST");
        }
        if (annotationStr.contains("RequestMethod.PUT")) {
            methods.add("PUT");
        }
        if (annotationStr.contains("RequestMethod.DELETE")) {
            methods.add("DELETE");
        }
        if (annotationStr.contains("RequestMethod.PATCH")) {
            methods.add("PATCH");
        }
        
        // If no specific method found, default to GET
        if (methods.isEmpty()) {
            methods.add("GET");
        }
        
        return methods;
    }
    
    /**
     * Combine base path and method path
     */
    private String combinePaths(String basePath, String methodPath) {
        if (basePath.isEmpty()) {
            return methodPath.isEmpty() ? "/" : methodPath;
        }
        if (methodPath.isEmpty()) {
            return basePath;
        }
        
        String combined = basePath;
        if (!basePath.endsWith("/") && !methodPath.startsWith("/")) {
            combined += "/";
        }
        combined += methodPath;
        
        return combined;
    }
}
