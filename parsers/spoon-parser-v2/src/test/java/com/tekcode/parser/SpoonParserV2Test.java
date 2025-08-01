package com.tekcode.parser;

import com.tekcode.parser.config.ParserConfig;
import com.tekcode.parser.model.ParseResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Collectors;

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

    @Test
    void testParseWithEnumsAndFunctionalConstructs(@TempDir Path tempDir) throws IOException {
        // Create a comprehensive Java file with enums, inner classes, lambdas, and method references
        Path srcDir = tempDir.resolve("src/main/java/com/example");
        Files.createDirectories(srcDir);

        Path javaFile = srcDir.resolve("ComprehensiveClass.java");
        String javaContent = "package com.example;\n\n" +
            "import java.util.*;\n" +
            "import java.util.stream.*;\n\n" +
            "public class ComprehensiveClass {\n" +
            "    \n" +
            "    // Enum definition\n" +
            "    public enum Status {\n" +
            "        ACTIVE(\"Active\"),\n" +
            "        INACTIVE(\"Inactive\"),\n" +
            "        PENDING(\"Pending\");\n" +
            "        \n" +
            "        private final String displayName;\n" +
            "        \n" +
            "        Status(String displayName) {\n" +
            "            this.displayName = displayName;\n" +
            "        }\n" +
            "        \n" +
            "        public String getDisplayName() {\n" +
            "            return displayName;\n" +
            "        }\n" +
            "    }\n" +
            "    \n" +
            "    // Static nested class\n" +
            "    public static class StaticNested {\n" +
            "        private String value;\n" +
            "        \n" +
            "        public StaticNested(String value) {\n" +
            "            this.value = value;\n" +
            "        }\n" +
            "    }\n" +
            "    \n" +
            "    // Inner class\n" +
            "    public class InnerClass {\n" +
            "        public void doSomething() {\n" +
            "            System.out.println(\"Inner class method\");\n" +
            "        }\n" +
            "    }\n" +
            "    \n" +
            "    private List<String> items = new ArrayList<>();\n" +
            "    \n" +
            "    public void demonstrateFunctionalProgramming() {\n" +
            "        // Lambda expressions\n" +
            "        items.stream()\n" +
            "            .filter(item -> item.length() > 3)\n" +
            "            .map(item -> item.toUpperCase())\n" +
            "            .forEach(item -> System.out.println(item));\n" +
            "        \n" +
            "        // Method references\n" +
            "        items.stream()\n" +
            "            .map(String::toUpperCase)\n" +
            "            .forEach(System.out::println);\n" +
            "        \n" +
            "        // Constructor reference\n" +
            "        List<String> newList = items.stream()\n" +
            "            .collect(ArrayList::new, ArrayList::add, ArrayList::addAll);\n" +
            "        \n" +
            "        // Anonymous class\n" +
            "        Runnable task = new Runnable() {\n" +
            "            @Override\n" +
            "            public void run() {\n" +
            "                System.out.println(\"Anonymous class\");\n" +
            "            }\n" +
            "        };\n" +
            "    }\n" +
            "}\n";

        Files.writeString(javaFile, javaContent);

        // Parse with comprehensive config
        ParseResult result = SpoonParserV2.parseJavaProject(
            "comprehensive-project",
            tempDir.toString(),
            ParserConfig.comprehensiveConfig()
        );

        assertNotNull(result);
        assertFalse(result.isEmpty());

        // Should have found classes (including inner classes)
        assertTrue(result.getClasses().size() >= 3); // ComprehensiveClass + StaticNested + InnerClass

        // Should have found enum
        assertTrue(result.getEnums().size() >= 1);

        // Should have found lambda expressions
        assertTrue(result.getLambdaExpressions().size() >= 3);

        // Should have found method references
        assertTrue(result.getMethodReferences().size() >= 3);

        // Verify enum details
        var statusEnum = result.getEnums().stream()
            .filter(e -> e.getName().equals("Status"))
            .findFirst();
        assertTrue(statusEnum.isPresent());
        assertEquals(3, statusEnum.get().getEnumConstants().size());

        // Verify inner class details
        var innerClasses = result.getClasses().stream()
            .filter(c -> c.isInnerClass())
            .collect(Collectors.toList());
        assertTrue(innerClasses.size() >= 2); // StaticNested + InnerClass

        // Verify static nested class
        var staticNested = innerClasses.stream()
            .filter(c -> c.getName().equals("StaticNested"))
            .findFirst();
        assertTrue(staticNested.isPresent());
        assertTrue(staticNested.get().isStatic());

        // Verify inner class
        var innerClass = innerClasses.stream()
            .filter(c -> c.getName().equals("InnerClass"))
            .findFirst();
        assertTrue(innerClass.isPresent());
        assertFalse(innerClass.get().isStatic());

        // Verify no duplicates
        assertEquals(result.getClasses().size(),
                    result.getClasses().stream().map(c -> c.getId()).distinct().count());
        assertEquals(result.getEnums().size(),
                    result.getEnums().stream().map(e -> e.getId()).distinct().count());
        assertEquals(result.getLambdaExpressions().size(),
                    result.getLambdaExpressions().stream().map(l -> l.getId()).distinct().count());
        assertEquals(result.getMethodReferences().size(),
                    result.getMethodReferences().stream().map(m -> m.getId()).distinct().count());
    }
}
