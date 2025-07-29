package com.testproject;

import java.util.List;
import java.util.ArrayList;

/**
 * Comprehensive test class for inner classes demonstrating:
 * - Static nested classes
 * - Non-static inner classes
 * - Local classes (within methods)
 * - Anonymous classes
 * - Nested inner classes (multiple levels)
 */
public class InnerClassTestCase {
    
    private String outerField = "outer";
    
    /**
     * Static nested class
     */
    public static class StaticNestedClass {
        private String staticNestedField = "static nested";
        
        public void staticNestedMethod() {
            System.out.println("Static nested method");
        }
        
        /**
         * Inner class within static nested class
         */
        public class InnerInStaticNested {
            private String deepNestedField = "deep nested";
            
            public void deepMethod() {
                System.out.println("Deep nested: " + deepNestedField);
            }
        }
    }
    
    /**
     * Non-static inner class
     */
    public class InnerClass {
        private String innerField = "inner";
        
        public void innerMethod() {
            System.out.println("Inner method accessing: " + outerField);
        }
        
        /**
         * Nested inner class (multiple levels)
         */
        public class NestedInnerClass {
            private String nestedInnerField = "nested inner";
            
            public void nestedInnerMethod() {
                System.out.println("Nested inner: " + nestedInnerField + ", " + innerField + ", " + outerField);
            }
            
            /**
             * Triple nested class
             */
            public class TripleNestedClass {
                public void tripleNestedMethod() {
                    System.out.println("Triple nested accessing all levels");
                }
            }
        }
    }
    
    /**
     * Protected inner class
     */
    protected class ProtectedInnerClass {
        protected void protectedInnerMethod() {
            System.out.println("Protected inner method");
        }
    }
    
    /**
     * Private inner class
     */
    private class PrivateInnerClass implements Runnable {
        private final String message;
        
        public PrivateInnerClass(String message) {
            this.message = message;
        }
        
        @Override
        public void run() {
            System.out.println("Private inner running: " + message);
        }
    }
    
    /**
     * Abstract inner class
     */
    public abstract class AbstractInnerClass {
        protected abstract void abstractMethod();
        
        public void concreteMethod() {
            System.out.println("Concrete method in abstract inner class");
        }
    }
    
    /**
     * Final inner class
     */
    public final class FinalInnerClass extends BaseEntity {
        @Override
        public String getEntityName() {
            return "FinalInnerClass";
        }
        
        public void finalInnerMethod() {
            System.out.println("Final inner method");
        }
    }
    
    /**
     * Method demonstrating local classes and anonymous classes
     */
    public void methodWithLocalAndAnonymousClasses() {
        final String localVar = "local variable";
        
        /**
         * Local class within method
         */
        class LocalClass {
            private String localClassField = "local class";
            
            public void localClassMethod() {
                System.out.println("Local class accessing: " + localVar + ", " + outerField);
            }
            
            /**
             * Inner class within local class
             */
            class InnerLocalClass {
                public void innerLocalMethod() {
                    System.out.println("Inner local class");
                }
            }
        }
        
        // Create instance of local class
        LocalClass localInstance = new LocalClass();
        localInstance.localClassMethod();
        
        // Anonymous class implementing Runnable
        Runnable anonymousRunnable = new Runnable() {
            private String anonymousField = "anonymous";
            
            @Override
            public void run() {
                System.out.println("Anonymous class: " + anonymousField + ", " + localVar + ", " + outerField);
            }
            
            public void customAnonymousMethod() {
                System.out.println("Custom method in anonymous class");
            }
        };
        
        // Anonymous class extending BaseEntity
        BaseEntity anonymousEntity = new BaseEntity("anonymous-creator") {
            @Override
            public String getEntityName() {
                return "AnonymousEntity";
            }
            
            public void customEntityMethod() {
                System.out.println("Custom method in anonymous entity");
            }
        };
        
        // Anonymous class with generic type
        Comparable<String> anonymousComparable = new Comparable<String>() {
            @Override
            public int compareTo(String other) {
                return outerField.compareTo(other);
            }
        };
        
        anonymousRunnable.run();
        System.out.println("Anonymous entity: " + anonymousEntity.getEntityName());
        System.out.println("Comparison result: " + anonymousComparable.compareTo("test"));
    }
    
    /**
     * Method that returns anonymous class
     */
    public Runnable createAnonymousRunner(final String parameter) {
        return new Runnable() {
            @Override
            public void run() {
                System.out.println("Anonymous runner with parameter: " + parameter);
            }
        };
    }
    
    /**
     * Generic inner class
     */
    public class GenericInnerClass<T> {
        private T genericField;
        
        public GenericInnerClass(T value) {
            this.genericField = value;
        }
        
        public T getGenericField() {
            return genericField;
        }
        
        /**
         * Nested generic inner class
         */
        public class NestedGenericInner<U> {
            private U nestedGenericField;
            
            public void processGeneric(T outerGeneric, U innerGeneric) {
                this.nestedGenericField = innerGeneric;
                System.out.println("Processing generics: " + outerGeneric + ", " + innerGeneric);
            }
        }
    }
    
    /**
     * Enum as inner class
     */
    public enum InnerEnum {
        VALUE1("First Value"),
        VALUE2("Second Value"),
        VALUE3("Third Value");
        
        private final String description;
        
        InnerEnum(String description) {
            this.description = description;
        }
        
        public String getDescription() {
            return description;
        }
    }
    
    /**
     * Interface as inner type
     */
    public interface InnerInterface {
        void innerInterfaceMethod();
        
        default void defaultInnerMethod() {
            System.out.println("Default method in inner interface");
        }
        
        /**
         * Nested interface within interface
         */
        interface NestedInnerInterface {
            void nestedInterfaceMethod();
        }
    }
    
    /**
     * Class implementing inner interface
     */
    public class InnerInterfaceImpl implements InnerInterface {
        @Override
        public void innerInterfaceMethod() {
            System.out.println("Implementing inner interface method");
        }
    }
    
    // Main method to test inner classes
    public static void main(String[] args) {
        InnerClassTestCase outer = new InnerClassTestCase();
        
        // Test static nested class
        StaticNestedClass staticNested = new StaticNestedClass();
        staticNested.staticNestedMethod();
        
        // Test non-static inner class
        InnerClass inner = outer.new InnerClass();
        inner.innerMethod();
        
        // Test nested inner class
        InnerClass.NestedInnerClass nestedInner = inner.new NestedInnerClass();
        nestedInner.nestedInnerMethod();
        
        // Test method with local and anonymous classes
        outer.methodWithLocalAndAnonymousClasses();
        
        // Test anonymous runner
        Runnable runner = outer.createAnonymousRunner("test parameter");
        runner.run();
        
        // Test generic inner class
        GenericInnerClass<String> genericInner = outer.new GenericInnerClass<>("generic value");
        System.out.println("Generic field: " + genericInner.getGenericField());
        
        // Test inner enum
        System.out.println("Inner enum: " + InnerEnum.VALUE1.getDescription());
        
        // Test inner interface implementation
        InnerInterfaceImpl interfaceImpl = outer.new InnerInterfaceImpl();
        interfaceImpl.innerInterfaceMethod();
        interfaceImpl.defaultInnerMethod();
    }
}