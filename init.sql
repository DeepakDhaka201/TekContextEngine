-- Ensure the database exists
SELECT 'CREATE DATABASE tekaicontextengine2_dev' 
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'tekaicontextengine2_dev')\gexec

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE tekaicontextengine2_dev TO postgres;

-- Ensure proper authentication
ALTER USER postgres PASSWORD 'postgres';
