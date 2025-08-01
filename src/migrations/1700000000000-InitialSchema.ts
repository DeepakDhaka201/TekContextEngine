import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
    name = 'InitialSchema1700000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create UUID extension
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // Create enums for current entities
        await queryRunner.query(`
            CREATE TYPE "tek_projects_status_enum" AS ENUM('active', 'archived', 'deleted')
        `);

        await queryRunner.query(`
            CREATE TYPE "codebases_syncmode_enum" AS ENUM('manual', 'auto', 'webhook')
        `);

        await queryRunner.query(`
            CREATE TYPE "codebases_status_enum" AS ENUM('pending', 'syncing', 'active', 'error', 'archived')
        `);

        await queryRunner.query(`
            CREATE TYPE "docs_buckets_type_enum" AS ENUM('API_DOCS', 'USER_FLOWS', 'SECURITY_GUIDELINES', 'ARCHITECTURE', 'DEPLOYMENT', 'OTHER')
        `);

        await queryRunner.query(`
            CREATE TYPE "docs_buckets_status_enum" AS ENUM('ACTIVE', 'ARCHIVED')
        `);

        await queryRunner.query(`
            CREATE TYPE "documents_type_enum" AS ENUM('markdown', 'pdf', 'text', 'html', 'other')
        `);

        await queryRunner.query(`
            CREATE TYPE "documents_status_enum" AS ENUM('active', 'deleted', 'ignored')
        `);

        await queryRunner.query(`
            CREATE TYPE "index_pipelines_type_enum" AS ENUM('FULL', 'INCREMENTAL', 'DOCUMENT', 'ANALYSIS')
        `);

        await queryRunner.query(`
            CREATE TYPE "index_pipelines_status_enum" AS ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')
        `);

        await queryRunner.query(`
            CREATE TYPE "index_pipelines_trigger_enum" AS ENUM('MANUAL', 'WEBHOOK', 'SCHEDULED')
        `);

        // Create tek_projects table
        await queryRunner.query(`
            CREATE TABLE "tek_projects" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(255) NOT NULL,
                "slug" character varying(255) NOT NULL,
                "description" text,
                "status" "tek_projects_status_enum" NOT NULL DEFAULT 'active',
                "metadata" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_tek_projects" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_tek_projects_slug" UNIQUE ("slug")
            )
        `);

        // Create docs_buckets table
        await queryRunner.query(`
            CREATE TABLE "docs_buckets" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(255) NOT NULL,
                "type" "docs_buckets_type_enum" NOT NULL,
                "storage_path" character varying(500) NOT NULL,
                "status" "docs_buckets_status_enum" NOT NULL DEFAULT 'ACTIVE',
                "metadata" jsonb,
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
                "name" character varying(255) NOT NULL,
                "gitlab_url" character varying(500) NOT NULL,
                "gitlab_project_id" integer,
                "branch" character varying(100) NOT NULL DEFAULT 'main',
                "storage_path" character varying(500) NOT NULL,
                "language" character varying(50),
                "sync_mode" "codebases_syncmode_enum" NOT NULL DEFAULT 'manual',
                "webhook_secret" character varying(255),
                "last_sync_commit" character varying(40),
                "last_sync_at" TIMESTAMP,
                "last_sync_attempt_at" TIMESTAMP,
                "status" "codebases_status_enum" NOT NULL DEFAULT 'pending',
                "metadata" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "project_id" uuid NOT NULL,
                CONSTRAINT "PK_codebases" PRIMARY KEY ("id")
            )
        `);

        // Create documents table
        await queryRunner.query(`
            CREATE TABLE "documents" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "path" character varying(1000) NOT NULL,
                "title" character varying(500) NOT NULL,
                "type" "documents_type_enum" NOT NULL,
                "hash" character varying(64) NOT NULL,
                "size" integer NOT NULL,
                "status" "documents_status_enum" NOT NULL DEFAULT 'active',
                "metadata" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "bucket_id" uuid,
                "codebase_id" uuid,
                CONSTRAINT "PK_documents" PRIMARY KEY ("id")
            )
        `);

        // Create index_pipelines table
        await queryRunner.query(`
            CREATE TABLE "index_pipelines" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "type" "index_pipelines_type_enum" NOT NULL,
                "status" "index_pipelines_status_enum" NOT NULL DEFAULT 'PENDING',
                "trigger" "index_pipelines_trigger_enum" NOT NULL,
                "config" jsonb NOT NULL,
                "progress" jsonb,
                "result" jsonb,
                "error_message" text,
                "started_at" TIMESTAMP,
                "completed_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "project_id" uuid,
                "codebase_id" uuid,
                CONSTRAINT "PK_index_pipelines" PRIMARY KEY ("id")
            )
        `);

        // Add foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "docs_buckets" ADD CONSTRAINT "FK_docs_buckets_project_id"
            FOREIGN KEY ("project_id") REFERENCES "tek_projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "codebases" ADD CONSTRAINT "FK_codebases_project_id"
            FOREIGN KEY ("project_id") REFERENCES "tek_projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "documents" ADD CONSTRAINT "FK_documents_bucket_id"
            FOREIGN KEY ("bucket_id") REFERENCES "docs_buckets"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "documents" ADD CONSTRAINT "FK_documents_codebase_id"
            FOREIGN KEY ("codebase_id") REFERENCES "codebases"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "index_pipelines" ADD CONSTRAINT "FK_index_pipelines_project_id"
            FOREIGN KEY ("project_id") REFERENCES "tek_projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "index_pipelines" ADD CONSTRAINT "FK_index_pipelines_codebase_id"
            FOREIGN KEY ("codebase_id") REFERENCES "codebases"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        // Create indexes for better performance
        await queryRunner.query(`CREATE INDEX "IDX_tek_projects_status" ON "tek_projects" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_docs_buckets_project_type" ON "docs_buckets" ("project_id", "type")`);
        await queryRunner.query(`CREATE INDEX "IDX_codebases_project_status" ON "codebases" ("project_id", "status")`);
        await queryRunner.query(`CREATE INDEX "IDX_documents_bucket_status" ON "documents" ("bucket_id", "status")`);
        await queryRunner.query(`CREATE INDEX "IDX_documents_codebase_status" ON "documents" ("codebase_id", "status")`);
        await queryRunner.query(`CREATE INDEX "IDX_documents_hash" ON "documents" ("hash")`);

        // Create unique constraints
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_docs_buckets_project_name" ON "docs_buckets" ("project_id", "name")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_codebases_project_gitlab_url" ON "codebases" ("project_id", "gitlab_url")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "UQ_codebases_project_gitlab_url"`);
        await queryRunner.query(`DROP INDEX "UQ_docs_buckets_project_name"`);
        await queryRunner.query(`DROP INDEX "IDX_documents_hash"`);
        await queryRunner.query(`DROP INDEX "IDX_documents_codebase_status"`);
        await queryRunner.query(`DROP INDEX "IDX_documents_bucket_status"`);
        await queryRunner.query(`DROP INDEX "IDX_codebases_project_status"`);
        await queryRunner.query(`DROP INDEX "IDX_docs_buckets_project_type"`);
        await queryRunner.query(`DROP INDEX "IDX_tek_projects_status"`);

        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "index_pipelines" DROP CONSTRAINT "FK_index_pipelines_codebase_id"`);
        await queryRunner.query(`ALTER TABLE "index_pipelines" DROP CONSTRAINT "FK_index_pipelines_project_id"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_documents_codebase_id"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_documents_bucket_id"`);
        await queryRunner.query(`ALTER TABLE "codebases" DROP CONSTRAINT "FK_codebases_project_id"`);
        await queryRunner.query(`ALTER TABLE "docs_buckets" DROP CONSTRAINT "FK_docs_buckets_project_id"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "index_pipelines"`);
        await queryRunner.query(`DROP TABLE "documents"`);
        await queryRunner.query(`DROP TABLE "codebases"`);
        await queryRunner.query(`DROP TABLE "docs_buckets"`);
        await queryRunner.query(`DROP TABLE "tek_projects"`);

        // Drop enums
        await queryRunner.query(`DROP TYPE "index_pipelines_trigger_enum"`);
        await queryRunner.query(`DROP TYPE "index_pipelines_status_enum"`);
        await queryRunner.query(`DROP TYPE "index_pipelines_type_enum"`);
        await queryRunner.query(`DROP TYPE "documents_status_enum"`);
        await queryRunner.query(`DROP TYPE "documents_type_enum"`);
        await queryRunner.query(`DROP TYPE "docs_buckets_status_enum"`);
        await queryRunner.query(`DROP TYPE "docs_buckets_type_enum"`);
        await queryRunner.query(`DROP TYPE "codebases_status_enum"`);
        await queryRunner.query(`DROP TYPE "codebases_syncmode_enum"`);
        await queryRunner.query(`DROP TYPE "tek_projects_status_enum"`);
    }
}