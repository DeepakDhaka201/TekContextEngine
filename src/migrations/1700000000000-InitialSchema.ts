import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
    name = 'InitialSchema1700000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create UUID extension
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        
        // Create enums
        await queryRunner.query(`
            CREATE TYPE "project_status_enum" AS ENUM('active', 'archived', 'deleted')
        `);
        
        await queryRunner.query(`
            CREATE TYPE "dependency_type_enum" AS ENUM('compile', 'runtime', 'test', 'provided')
        `);
        
        await queryRunner.query(`
            CREATE TYPE "sync_mode_enum" AS ENUM('manual', 'auto', 'webhook')
        `);
        
        await queryRunner.query(`
            CREATE TYPE "task_status_enum" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled')
        `);
        
        await queryRunner.query(`
            CREATE TYPE "sync_task_type_enum" AS ENUM('initial_sync', 'incremental_sync', 'full_resync', 'webhook_sync')
        `);
        
        await queryRunner.query(`
            CREATE TYPE "chunk_task_type_enum" AS ENUM('code_chunk', 'document_chunk')
        `);
        
        await queryRunner.query(`
            CREATE TYPE "index_task_type_enum" AS ENUM('combined_index', 'scip_only', 'tree_sitter_only')
        `);
        
        await queryRunner.query(`
            CREATE TYPE "symbol_kind_enum" AS ENUM('class', 'interface', 'function', 'method', 'constructor', 'field', 'variable', 'constant', 'enum', 'enum_member', 'module', 'namespace', 'package', 'type', 'parameter', 'property')
        `);
        
        await queryRunner.query(`
            CREATE TYPE "file_status_enum" AS ENUM('active', 'deleted', 'ignored')
        `);
        
        await queryRunner.query(`
            CREATE TYPE "document_type_enum" AS ENUM('markdown', 'pdf', 'text', 'html', 'other')
        `);

        // Create projects table
        await queryRunner.query(`
            CREATE TABLE "projects" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "description" text,
                "status" "project_status_enum" NOT NULL DEFAULT 'active',
                "metadata" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_projects" PRIMARY KEY ("id")
            )
        `);

        // Create project_dependencies table
        await queryRunner.query(`
            CREATE TABLE "project_dependencies" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "dependency_type" "dependency_type_enum" NOT NULL,
                "version" character varying,
                "metadata" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "project_id" uuid NOT NULL,
                "depends_on_id" uuid NOT NULL,
                CONSTRAINT "PK_project_dependencies" PRIMARY KEY ("id")
            )
        `);

        // Create docs_buckets table
        await queryRunner.query(`
            CREATE TABLE "docs_buckets" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "description" text,
                "bucket_type" character varying NOT NULL,
                "configuration" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "project_id" uuid NOT NULL,
                CONSTRAINT "PK_docs_buckets" PRIMARY KEY ("id")
            )
        `);

        // Create codebases table
        await queryRunner.query(`
            CREATE TABLE "codebases" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "description" text,
                "gitlab_url" character varying NOT NULL,
                "gitlab_project_id" integer,
                "branch" character varying NOT NULL DEFAULT 'main',
                "sync_mode" "sync_mode_enum" NOT NULL DEFAULT 'manual',
                "storage_path" character varying,
                "last_sync_at" TIMESTAMP,
                "last_commit_hash" character varying,
                "webhook_secret" character varying,
                "metadata" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "project_id" uuid NOT NULL,
                CONSTRAINT "PK_codebases" PRIMARY KEY ("id")
            )
        `);

        // Create code_files table
        await queryRunner.query(`
            CREATE TABLE "code_files" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "path" character varying NOT NULL,
                "hash" character varying NOT NULL,
                "size" integer NOT NULL,
                "language" character varying,
                "status" "file_status_enum" NOT NULL DEFAULT 'active',
                "last_modified" TIMESTAMP,
                "line_count" integer DEFAULT 0,
                "metadata" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "codebase_id" uuid NOT NULL,
                CONSTRAINT "PK_code_files" PRIMARY KEY ("id")
            )
        `);

        // Create documents table
        await queryRunner.query(`
            CREATE TABLE "documents" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "title" character varying NOT NULL,
                "path" character varying NOT NULL,
                "type" "document_type_enum" NOT NULL,
                "hash" character varying NOT NULL,
                "size" integer NOT NULL,
                "status" "file_status_enum" NOT NULL DEFAULT 'active',
                "last_modified" TIMESTAMP,
                "metadata" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "codebase_id" uuid,
                "docs_bucket_id" uuid,
                CONSTRAINT "PK_documents" PRIMARY KEY ("id")
            )
        `);

        // Create sync_tasks table
        await queryRunner.query(`
            CREATE TABLE "sync_tasks" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "task_type" "sync_task_type_enum" NOT NULL,
                "sync_mode" "sync_mode_enum" NOT NULL,
                "status" "task_status_enum" NOT NULL DEFAULT 'pending',
                "priority" integer NOT NULL DEFAULT 0,
                "from_commit" character varying,
                "to_commit" character varying,
                "files_added" integer DEFAULT 0,
                "files_modified" integer DEFAULT 0,
                "files_deleted" integer DEFAULT 0,
                "error" text,
                "metadata" jsonb,
                "started_at" TIMESTAMP,
                "completed_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "codebase_id" uuid,
                "project_id" uuid,
                CONSTRAINT "PK_sync_tasks" PRIMARY KEY ("id")
            )
        `);

        // Create chunk_tasks table
        await queryRunner.query(`
            CREATE TABLE "chunk_tasks" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "task_type" "chunk_task_type_enum" NOT NULL,
                "status" "task_status_enum" NOT NULL DEFAULT 'pending',
                "total_files" integer NOT NULL DEFAULT 0,
                "processed_files" integer DEFAULT 0,
                "progress" integer DEFAULT 0,
                "error" text,
                "metadata" jsonb,
                "started_at" TIMESTAMP,
                "completed_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "sync_task_id" uuid NOT NULL,
                CONSTRAINT "PK_chunk_tasks" PRIMARY KEY ("id")
            )
        `);

        // Create index_tasks table
        await queryRunner.query(`
            CREATE TABLE "index_tasks" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "task_type" "index_task_type_enum" NOT NULL,
                "status" "task_status_enum" NOT NULL DEFAULT 'pending',
                "total_files" integer NOT NULL DEFAULT 0,
                "processed_files" integer DEFAULT 0,
                "progress" integer DEFAULT 0,
                "error" text,
                "metadata" jsonb,
                "started_at" TIMESTAMP,
                "completed_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "sync_task_id" uuid NOT NULL,
                CONSTRAINT "PK_index_tasks" PRIMARY KEY ("id")
            )
        `);

        // Create vector_chunks table
        await queryRunner.query(`
            CREATE TABLE "vector_chunks" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "content" text NOT NULL,
                "embedding" real[],
                "start_line" integer NOT NULL,
                "end_line" integer NOT NULL,
                "start_char" integer,
                "end_char" integer,
                "token_count" integer NOT NULL,
                "chunk_index" integer NOT NULL,
                "metadata" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "code_file_id" uuid,
                "document_id" uuid,
                CONSTRAINT "PK_vector_chunks" PRIMARY KEY ("id")
            )
        `);

        // Create code_symbols table
        await queryRunner.query(`
            CREATE TABLE "code_symbols" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "symbol_id" character varying NOT NULL,
                "name" character varying NOT NULL,
                "kind" "symbol_kind_enum" NOT NULL,
                "language" character varying NOT NULL,
                "start_line" integer NOT NULL,
                "start_column" integer NOT NULL,
                "end_line" integer NOT NULL,
                "end_column" integer NOT NULL,
                "signature" text,
                "documentation" text,
                "is_definition" boolean NOT NULL DEFAULT false,
                "badger_key" character varying,
                "metadata" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "code_file_id" uuid NOT NULL,
                CONSTRAINT "PK_code_symbols" PRIMARY KEY ("id")
            )
        `);

        // Add foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "project_dependencies" ADD CONSTRAINT "FK_project_dependencies_project_id" 
            FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "project_dependencies" ADD CONSTRAINT "FK_project_dependencies_depends_on_id" 
            FOREIGN KEY ("depends_on_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "docs_buckets" ADD CONSTRAINT "FK_docs_buckets_project_id" 
            FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "codebases" ADD CONSTRAINT "FK_codebases_project_id" 
            FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "code_files" ADD CONSTRAINT "FK_code_files_codebase_id" 
            FOREIGN KEY ("codebase_id") REFERENCES "codebases"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "documents" ADD CONSTRAINT "FK_documents_codebase_id" 
            FOREIGN KEY ("codebase_id") REFERENCES "codebases"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "documents" ADD CONSTRAINT "FK_documents_docs_bucket_id" 
            FOREIGN KEY ("docs_bucket_id") REFERENCES "docs_buckets"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "sync_tasks" ADD CONSTRAINT "FK_sync_tasks_codebase_id" 
            FOREIGN KEY ("codebase_id") REFERENCES "codebases"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "sync_tasks" ADD CONSTRAINT "FK_sync_tasks_project_id" 
            FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "chunk_tasks" ADD CONSTRAINT "FK_chunk_tasks_sync_task_id" 
            FOREIGN KEY ("sync_task_id") REFERENCES "sync_tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "index_tasks" ADD CONSTRAINT "FK_index_tasks_sync_task_id" 
            FOREIGN KEY ("sync_task_id") REFERENCES "sync_tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "vector_chunks" ADD CONSTRAINT "FK_vector_chunks_code_file_id" 
            FOREIGN KEY ("code_file_id") REFERENCES "code_files"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "vector_chunks" ADD CONSTRAINT "FK_vector_chunks_document_id" 
            FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "code_symbols" ADD CONSTRAINT "FK_code_symbols_code_file_id" 
            FOREIGN KEY ("code_file_id") REFERENCES "code_files"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        // Create indexes for better performance
        await queryRunner.query(`CREATE INDEX "IDX_projects_status" ON "projects" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_codebases_project_id" ON "codebases" ("project_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_codebases_gitlab_project_id" ON "codebases" ("gitlab_project_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_code_files_codebase_id" ON "code_files" ("codebase_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_code_files_hash" ON "code_files" ("hash")`);
        await queryRunner.query(`CREATE INDEX "IDX_code_files_language" ON "code_files" ("language")`);
        await queryRunner.query(`CREATE INDEX "IDX_documents_codebase_id" ON "documents" ("codebase_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_documents_docs_bucket_id" ON "documents" ("docs_bucket_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_sync_tasks_codebase_id" ON "sync_tasks" ("codebase_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_sync_tasks_status" ON "sync_tasks" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_vector_chunks_code_file_id" ON "vector_chunks" ("code_file_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_vector_chunks_document_id" ON "vector_chunks" ("document_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_code_symbols_code_file_id" ON "code_symbols" ("code_file_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_code_symbols_symbol_id" ON "code_symbols" ("symbol_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_code_symbols_name" ON "code_symbols" ("name")`);

        // Create unique constraints
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_project_dependencies" ON "project_dependencies" ("project_id", "depends_on_id", "dependency_type")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_code_files_path" ON "code_files" ("codebase_id", "path")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_documents_path" ON "documents" ("codebase_id", "path") WHERE "codebase_id" IS NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_documents_bucket_path" ON "documents" ("docs_bucket_id", "path") WHERE "docs_bucket_id" IS NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "UQ_documents_bucket_path"`);
        await queryRunner.query(`DROP INDEX "UQ_documents_path"`);
        await queryRunner.query(`DROP INDEX "UQ_code_files_path"`);
        await queryRunner.query(`DROP INDEX "UQ_project_dependencies"`);
        await queryRunner.query(`DROP INDEX "IDX_code_symbols_name"`);
        await queryRunner.query(`DROP INDEX "IDX_code_symbols_symbol_id"`);
        await queryRunner.query(`DROP INDEX "IDX_code_symbols_code_file_id"`);
        await queryRunner.query(`DROP INDEX "IDX_vector_chunks_document_id"`);
        await queryRunner.query(`DROP INDEX "IDX_vector_chunks_code_file_id"`);
        await queryRunner.query(`DROP INDEX "IDX_sync_tasks_status"`);
        await queryRunner.query(`DROP INDEX "IDX_sync_tasks_codebase_id"`);
        await queryRunner.query(`DROP INDEX "IDX_documents_docs_bucket_id"`);
        await queryRunner.query(`DROP INDEX "IDX_documents_codebase_id"`);
        await queryRunner.query(`DROP INDEX "IDX_code_files_language"`);
        await queryRunner.query(`DROP INDEX "IDX_code_files_hash"`);
        await queryRunner.query(`DROP INDEX "IDX_code_files_codebase_id"`);
        await queryRunner.query(`DROP INDEX "IDX_codebases_gitlab_project_id"`);
        await queryRunner.query(`DROP INDEX "IDX_codebases_project_id"`);
        await queryRunner.query(`DROP INDEX "IDX_projects_status"`);

        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "code_symbols" DROP CONSTRAINT "FK_code_symbols_code_file_id"`);
        await queryRunner.query(`ALTER TABLE "vector_chunks" DROP CONSTRAINT "FK_vector_chunks_document_id"`);
        await queryRunner.query(`ALTER TABLE "vector_chunks" DROP CONSTRAINT "FK_vector_chunks_code_file_id"`);
        await queryRunner.query(`ALTER TABLE "index_tasks" DROP CONSTRAINT "FK_index_tasks_sync_task_id"`);
        await queryRunner.query(`ALTER TABLE "chunk_tasks" DROP CONSTRAINT "FK_chunk_tasks_sync_task_id"`);
        await queryRunner.query(`ALTER TABLE "sync_tasks" DROP CONSTRAINT "FK_sync_tasks_project_id"`);
        await queryRunner.query(`ALTER TABLE "sync_tasks" DROP CONSTRAINT "FK_sync_tasks_codebase_id"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_documents_docs_bucket_id"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_documents_codebase_id"`);
        await queryRunner.query(`ALTER TABLE "code_files" DROP CONSTRAINT "FK_code_files_codebase_id"`);
        await queryRunner.query(`ALTER TABLE "codebases" DROP CONSTRAINT "FK_codebases_project_id"`);
        await queryRunner.query(`ALTER TABLE "docs_buckets" DROP CONSTRAINT "FK_docs_buckets_project_id"`);
        await queryRunner.query(`ALTER TABLE "project_dependencies" DROP CONSTRAINT "FK_project_dependencies_depends_on_id"`);
        await queryRunner.query(`ALTER TABLE "project_dependencies" DROP CONSTRAINT "FK_project_dependencies_project_id"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "code_symbols"`);
        await queryRunner.query(`DROP TABLE "vector_chunks"`);
        await queryRunner.query(`DROP TABLE "index_tasks"`);
        await queryRunner.query(`DROP TABLE "chunk_tasks"`);
        await queryRunner.query(`DROP TABLE "sync_tasks"`);
        await queryRunner.query(`DROP TABLE "documents"`);
        await queryRunner.query(`DROP TABLE "code_files"`);
        await queryRunner.query(`DROP TABLE "codebases"`);
        await queryRunner.query(`DROP TABLE "docs_buckets"`);
        await queryRunner.query(`DROP TABLE "project_dependencies"`);
        await queryRunner.query(`DROP TABLE "projects"`);

        // Drop enums
        await queryRunner.query(`DROP TYPE "document_type_enum"`);
        await queryRunner.query(`DROP TYPE "file_status_enum"`);
        await queryRunner.query(`DROP TYPE "symbol_kind_enum"`);
        await queryRunner.query(`DROP TYPE "index_task_type_enum"`);
        await queryRunner.query(`DROP TYPE "chunk_task_type_enum"`);
        await queryRunner.query(`DROP TYPE "sync_task_type_enum"`);
        await queryRunner.query(`DROP TYPE "task_status_enum"`);
        await queryRunner.query(`DROP TYPE "sync_mode_enum"`);
        await queryRunner.query(`DROP TYPE "dependency_type_enum"`);
        await queryRunner.query(`DROP TYPE "project_status_enum"`);
    }
}