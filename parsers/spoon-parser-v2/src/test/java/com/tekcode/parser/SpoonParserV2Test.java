package com.tekcode.parser;

import com.tekcode.parser.config.ParserConfig;
import com.tekcode.parser.model.ParseResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Basic tests for SpoonParserV2
 */
class SpoonParserV2Test {
    
    @Test
    void testParserConfigDefaults() {
        ParserConfig config = ParserConfig.defaultConfig();
        
        assertNotNull(config);
        assertTrue(config.isIncludeComments());
        assertTrue(config.isIncludePrivateMembers());
        assertTrue(config.isIncludeTestFiles());
        assertFalse(config.isIncludeGeneratedFiles());
        assertTrue(config.isEnableFrameworkDetection());
        assertTrue(config.isExtractCallGraph());
    }
    
    @Test
    void testParserConfigMinimal() {
        ParserConfig config = ParserConfig.minimalConfig();
        
        assertNotNull(config);
        assertFalse(config.isIncludeMethodBodies());
        assertFalse(config.isIncludeComments());
        assertFalse(config.isIncludePrivateMembers());
        assertFalse(config.isExtractCallGraph());
        assertFalse(config.isEnableFrameworkDetection());
    }
    
    @Test
    void testParserConfigComprehensive() {
        ParserConfig config = ParserConfig.comprehensiveConfig();
        
        assertNotNull(config);
        assertTrue(config.isIncludeMethodBodies());
        assertTrue(config.isIncludeComments());
        assertTrue(config.isIncludePrivateMembers());
        assertTrue(config.isIncludeSourceCode());
        assertTrue(config.isExtractCallGraph());
        assertTrue(config.isEnableFrameworkDetection());
        assertTrue(config.isIncludeTransitiveDependencies());
    }
    
    @Test
    void testParseResultInitialization() {
        ParseResult result = new ParseResult("test-codebase");
        
        assertNotNull(result);
        assertEquals("test-codebase", result.getCodebaseName());
        assertNotNull(result.getFiles());
        assertNotNull(result.getClasses());
        assertNotNull(result.getInterfaces());
        assertNotNull(result.getMethods());
        assertTrue(result.isEmpty());
        assertEquals(0, result.getTotalEntityCount());
    }
    
    @Test
    void testParseEmptyProject(@TempDir Path tempDir) throws IOException {
        // Create an empty Java project structure
        Path srcDir = tempDir.resolve("src/main/java");
        Files.createDirectories(srcDir);
        
        // Parse the empty project
        ParseResult result = SpoonParserV2.parseJavaProject(
            "empty-project", 
            tempDir.toString(), 
            ParserConfig.minimalConfig()
        );
        
        assertNotNull(result);
        assertEquals("empty-project", result.getCodebaseName());
        assertNotNull(result.getMetadata());
        assertTrue(result.isEmpty());
    }
    
    @Test
    void testParseSimpleJavaFile(@TempDir Path tempDir) throws IOException {
        // Create a simple Java file
        Path srcDir = tempDir.resolve("src/main/java/com/example");
        Files.createDirectories(srcDir);

        Path javaFile = srcDir.resolve("SimpleClass.java");
        String javaContent = "package com.example;\n\n" +
            "/**\n" +
            " * A simple test class\n" +
            " */\n" +
            "public class SimpleClass {\n" +
            "    private String name;\n" +
            "    private int count;\n" +
            "    \n" +
            "    public SimpleClass(String name) {\n" +
            "        this.name = name;\n" +
            "        this.count = 0;\n" +
            "    }\n" +
            "    \n" +
            "    public String getName() {\n" +
            "        return name;\n" +
            "    }\n" +
            "    \n" +
            "    public void incrementCount() {\n" +
            "        count++;\n" +
            "    }\n" +
            "    \n" +
            "    public int getCount() {\n" +
            "        return count;\n" +
            "    }\n" +
            "}\n";
        Files.writeString(javaFile, javaContent);

        // Parse the project
        ParseResult result = SpoonParserV2.parseJavaProject(
            "simple-project",
            tempDir.toString(),
            ParserConfig.defaultConfig()
        );

        assertNotNull(result);
        assertEquals("simple-project", result.getCodebaseName());
        assertFalse(result.isEmpty());

        // Should have found at least one file and one class
        assertTrue(result.getFiles().size() >= 1);
        assertTrue(result.getClasses().size() >= 1);
        assertTrue(result.getMethods().size() >= 3); // constructor + 3 methods

        // Verify no duplicates
        assertEquals(result.getFiles().size(),
                    result.getFiles().stream().map(f -> f.getPath()).distinct().count());
        assertEquals(result.getClasses().size(),
                    result.getClasses().stream().map(c -> c.getId()).distinct().count());
        assertEquals(result.getMethods().size(),
                    result.getMethods().stream().map(m -> m.getId()).distinct().count());

        // Verify metadata
        assertNotNull(result.getMetadata());
        assertNotNull(result.getMetadata().getStatistics());
        assertTrue(result.getMetadata().getStatistics().getTotalFiles() > 0);
        assertTrue(result.getMetadata().getStatistics().getTotalClasses() > 0);
        assertTrue(result.getMetadata().getStatistics().getTotalMethods() > 0);
    }

    @Test
    void testParseWithSpringBootAnnotations(@TempDir Path tempDir) throws IOException {
        // Create a Spring Boot controller
        Path srcDir = tempDir.resolve("src/main/java/com/example");
        Files.createDirectories(srcDir);

        Path controllerFile = srcDir.resolve("UserController.java");
        String controllerContent = "package com.example;\n\n" +
            "import org.springframework.web.bind.annotation.*;\n\n" +
            "@RestController\n" +
            "@RequestMapping(\"/api/users\")\n" +
            "public class UserController {\n" +
            "    \n" +
            "    @GetMapping(\"/{id}\")\n" +
            "    public String getUser(@PathVariable Long id) {\n" +
            "        return \"User \" + id;\n" +
            "    }\n" +
            "    \n" +
            "    @PostMapping\n" +
            "    public String createUser(@RequestBody String userData) {\n" +
            "        return \"Created user\";\n" +
            "    }\n" +
            "}\n";
        Files.writeString(controllerFile, controllerContent);

        // Parse with comprehensive config to get annotations
        ParseResult result = SpoonParserV2.parseJavaProject(
            "spring-project",
            tempDir.toString(),
            ParserConfig.comprehensiveConfig()
        );

        assertNotNull(result);
        assertFalse(result.isEmpty());

        // Should detect Spring Boot features
        assertTrue(result.getClasses().size() >= 1);

        // Find the controller class
        var controllerClass = result.getClasses().stream()
            .filter(c -> c.getName().equals("UserController"))
            .findFirst();

        assertTrue(controllerClass.isPresent());
        assertTrue(controllerClass.get().isController());

        // Should have methods with annotations
        assertTrue(result.getMethods().size() >= 2);
    }
}
