package com.testproject;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Profile;
import org.springframework.boot.context.properties.ConfigurationProperties;
import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * Configuration class demonstrating:
 * - Configuration annotations
 * - Bean definitions
 * - Profile-specific configurations
 * - ConfigurationProperties
 * - Static methods
 */
@Configuration
public class ApplicationConfig {
    
    @Bean
    @Profile("development")
    public DataSource developmentDataSource() {
        DataSource dataSource = new DataSource();
        dataSource.setUrl("jdbc:h2:mem:testdb");
        dataSource.setUsername("sa");
        dataSource.setPassword("");
        return dataSource;
    }
    
    @Bean
    @Profile("production")
    public DataSource productionDataSource() {
        DataSource dataSource = new DataSource();
        dataSource.setUrl("jdbc:postgresql://localhost:5432/proddb");
        dataSource.setUsername("prod_user");
        dataSource.setPassword("prod_password");
        return dataSource;
    }
    
    @Bean
    public Executor taskExecutor() {
        ThreadPoolExecutor executor = new ThreadPoolExecutor(
            5,  // core pool size
            10, // maximum pool size
            60, // keep alive time
            java.util.concurrent.TimeUnit.SECONDS,
            new java.util.concurrent.LinkedBlockingQueue<>()
        );
        executor.setThreadFactory(new CustomThreadFactory());
        return executor;
    }
    
    @Bean
    @ConfigurationProperties(prefix = "app.security")
    public SecurityProperties securityProperties() {
        return new SecurityProperties();
    }
    
    @Bean
    public CacheManager cacheManager() {
        CacheManager cacheManager = new CacheManager();
        cacheManager.setCacheNames(java.util.Arrays.asList("users", "orders", "products"));
        return cacheManager;
    }
    
    /**
     * Static utility method
     */
    public static String getApplicationVersion() {
        return "1.0.0";
    }
    
    /**
     * Method with generic parameters
     */
    public <T> T createBean(Class<T> beanClass) {
        try {
            return beanClass.newInstance();
        } catch (Exception e) {
            throw new RuntimeException("Failed to create bean", e);
        }
    }
    
    /**
     * Inner class for thread factory
     */
    private static class CustomThreadFactory implements java.util.concurrent.ThreadFactory {
        private int counter = 0;
        
        @Override
        public Thread newThread(Runnable r) {
            Thread thread = new Thread(r);
            thread.setName("CustomThread-" + (++counter));
            thread.setDaemon(true);
            return thread;
        }
    }
}