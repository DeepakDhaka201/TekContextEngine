/**
 * Utility class for generating consistent, unique IDs for various entities
 * Aligned with Java Spoon Parser v2 IdGenerator
 * 
 * All IDs follow the format: codebaseName:entityType:identifier
 * This ensures global uniqueness across different codebases and entity types.
 */

const SEPARATOR = ':';
const UNKNOWN = 'unknown';

/**
 * Sanitizes a string for use in IDs by removing or replacing problematic characters
 */
function sanitize(input: string | null | undefined): string {
  if (!input) {
    return UNKNOWN;
  }
  
  return input
    .replace(/[<>]/g, '_') // Replace angle brackets
    .replace(/\s+/g, '_') // Replace whitespace with underscores
    .replace(/[^\w\-_.]/g, '') // Remove non-word characters except dash, underscore, dot
    .trim();
}

/**
 * Generates a unique ID for a file
 */
export function generateFileId(codebaseName: string, filePath: string): string {
  return `${sanitize(codebaseName)}${SEPARATOR}file${SEPARATOR}${sanitize(filePath)}`;
}

/**
 * Generates a unique ID for a class
 */
export function generateClassId(codebaseName: string, fullyQualifiedName: string): string {
  return `${sanitize(codebaseName)}${SEPARATOR}class${SEPARATOR}${sanitize(fullyQualifiedName)}`;
}

/**
 * Generates a unique ID for an interface
 */
export function generateInterfaceId(codebaseName: string, fullyQualifiedName: string): string {
  return `${sanitize(codebaseName)}${SEPARATOR}interface${SEPARATOR}${sanitize(fullyQualifiedName)}`;
}

/**
 * Generates a unique ID for an enum
 */
export function generateEnumId(codebaseName: string, fullyQualifiedName: string): string {
  return `${sanitize(codebaseName)}${SEPARATOR}enum${SEPARATOR}${sanitize(fullyQualifiedName)}`;
}

/**
 * Generates a unique ID for a method
 */
export function generateMethodId(codebaseName: string, className: string, methodSignature: string): string {
  return `${sanitize(codebaseName)}${SEPARATOR}method${SEPARATOR}${sanitize(className)}.${sanitize(methodSignature)}`;
}

/**
 * Generates a unique ID for a field
 */
export function generateFieldId(codebaseName: string, className: string, fieldName: string): string {
  return `${sanitize(codebaseName)}${SEPARATOR}field${SEPARATOR}${sanitize(className)}.${sanitize(fieldName)}`;
}

/**
 * Generates a unique ID for an annotation/decorator
 */
export function generateAnnotationId(codebaseName: string, annotationName: string): string {
  return `${sanitize(codebaseName)}${SEPARATOR}annotation${SEPARATOR}${sanitize(annotationName)}`;
}

/**
 * Generates a unique ID for a dependency
 */
export function generateDependencyId(codebaseName: string, groupId: string, artifactId: string): string {
  return `${sanitize(codebaseName)}${SEPARATOR}dependency${SEPARATOR}${sanitize(groupId)}.${sanitize(artifactId)}`;
}

/**
 * Generates a unique ID for a package
 */
export function generatePackageId(codebaseName: string, packageName: string): string {
  return `${sanitize(codebaseName)}${SEPARATOR}package${SEPARATOR}${sanitize(packageName)}`;
}

/**
 * Generates a unique ID for a test case
 */
export function generateTestCaseId(codebaseName: string, testClassName: string, testMethodName: string): string {
  return `${sanitize(codebaseName)}${SEPARATOR}test${SEPARATOR}${sanitize(testClassName)}.${sanitize(testMethodName)}`;
}

/**
 * Generates a unique ID for an API endpoint
 */
export function generateApiEndpointId(codebaseName: string, httpMethod: string, path: string): string {
  return `${sanitize(codebaseName)}${SEPARATOR}endpoint${SEPARATOR}${sanitize(httpMethod)}${SEPARATOR}${sanitize(path)}`;
}

/**
 * Generate unique ID for API endpoint with class and method info
 */
export function generateAPIEndpointId(codebaseName: string, className: string, methodName: string, httpMethod: string): string {
  return `${sanitize(codebaseName)}${SEPARATOR}endpoint${SEPARATOR}${sanitize(className)}${SEPARATOR}${sanitize(methodName)}${SEPARATOR}${sanitize(httpMethod)}`;
}

/**
 * Generates a unique ID for a relationship
 */
export function generateRelationshipId(relationshipType: string, sourceId: string, targetId: string): string {
  return `rel${SEPARATOR}${sanitize(relationshipType)}${SEPARATOR}${sanitize(sourceId)}${SEPARATOR}${sanitize(targetId)}`;
}

/**
 * Generates a unique ID for a lambda expression
 */
export function generateLambdaId(codebaseName: string, enclosingClassId: string, enclosingMethodId: string, lineNumber: number): string {
  return `${sanitize(codebaseName)}${SEPARATOR}lambda${SEPARATOR}${sanitize(enclosingClassId)}.${sanitize(enclosingMethodId)}.${lineNumber}`;
}

/**
 * Generates a unique ID for a method reference
 */
export function generateMethodReferenceId(codebaseName: string, enclosingClassId: string, enclosingMethodId: string, lineNumber: number): string {
  return `${sanitize(codebaseName)}${SEPARATOR}methodref${SEPARATOR}${sanitize(enclosingClassId)}.${sanitize(enclosingMethodId)}.${lineNumber}`;
}

/**
 * Generates a unique ID for a document
 */
export function generateDocumentId(codebaseName: string, filePath: string): string {
  return `${sanitize(codebaseName)}${SEPARATOR}document${SEPARATOR}${sanitize(filePath)}`;
}

/**
 * Extracts the codebase name from an entity ID
 */
export function extractCodebaseName(entityId: string): string | null {
  if (!entityId) {
    return null;
  }
  
  const parts = entityId.split(SEPARATOR, 2);
  return parts.length > 0 ? (parts[0] || null) : null;
}

/**
 * Extracts the entity type from an entity ID
 */
export function extractEntityType(entityId: string): string | null {
  if (!entityId) {
    return null;
  }
  
  const parts = entityId.split(SEPARATOR, 3);
  return parts.length > 1 ? (parts[1] || null) : null;
}

/**
 * Extracts the identifier from an entity ID
 */
export function extractIdentifier(entityId: string): string | null {
  if (!entityId) {
    return null;
  }
  
  const parts = entityId.split(SEPARATOR, 3);
  return parts.length > 2 ? (parts[2] || null) : null;
}

/**
 * Validates if an ID follows the expected format
 */
export function isValidId(entityId: string): boolean {
  if (!entityId) {
    return false;
  }
  
  const parts = entityId.split(SEPARATOR);
  return parts.length >= 3;
}

/**
 * Creates a fully qualified name from module path and class name
 */
export function createFullyQualifiedName(modulePath: string, className: string): string {
  // Convert file path to package-like structure
  const packageName = modulePath
    .replace(/^\.\//, '') // Remove leading ./
    .replace(/\.(ts|js)$/, '') // Remove file extension
    .replace(/\//g, '.') // Replace slashes with dots
    .replace(/index$/, '') // Remove index from end
    .replace(/\.$/, ''); // Remove trailing dot
  
  return packageName ? `${packageName}.${className}` : className;
}

/**
 * Generates method signature from name and parameters
 */
export function generateMethodSignature(methodName: string, parameters: Array<{name: string, type: string}>): string {
  const paramTypes = parameters.map(p => p.type).join(',');
  return `${methodName}(${paramTypes})`;
}
