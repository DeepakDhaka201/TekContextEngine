/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((module) => {

module.exports = require("@nestjs/core");

/***/ }),
/* 2 */
/***/ ((module) => {

module.exports = require("@nestjs/common");

/***/ }),
/* 3 */
/***/ ((module) => {

module.exports = require("@nestjs/swagger");

/***/ }),
/* 4 */
/***/ ((module) => {

module.exports = require("@nestjs/config");

/***/ }),
/* 5 */
/***/ ((module) => {

module.exports = require("nest-winston");

/***/ }),
/* 6 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AppModule = void 0;
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(4);
const schedule_1 = __webpack_require__(7);
const nest_winston_1 = __webpack_require__(5);
const winston = __webpack_require__(8);
const database_module_1 = __webpack_require__(9);
const storage_module_1 = __webpack_require__(19);
const worker_pool_module_1 = __webpack_require__(24);
const project_module_1 = __webpack_require__(26);
const indexing_module_1 = __webpack_require__(58);
const gitlab_module_1 = __webpack_require__(52);
const health_module_1 = __webpack_require__(78);
const all_exceptions_filter_1 = __webpack_require__(81);
const logging_interceptor_1 = __webpack_require__(82);
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env.local', '.env'],
                validationOptions: {
                    allowUnknown: true,
                    abortEarly: false,
                },
            }),
            nest_winston_1.WinstonModule.forRootAsync({
                useFactory: () => {
                    return {
                        transports: [
                            new winston.transports.Console({
                                format: winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.colorize({ all: true }), winston.format.printf(({ timestamp, level, message, context }) => {
                                    const contextStr = context ? `[${context}] ` : '';
                                    return `${timestamp} ${level}: ${contextStr}${message}`;
                                })),
                            }),
                            new winston.transports.File({
                                filename: 'logs/app.log',
                                format: winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.json()),
                            }),
                            new winston.transports.File({
                                filename: 'logs/error.log',
                                level: 'error',
                                format: winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.json()),
                            }),
                        ],
                    };
                },
                inject: [],
            }),
            database_module_1.DatabaseModule,
            storage_module_1.StorageModule,
            worker_pool_module_1.WorkerPoolModule,
            schedule_1.ScheduleModule.forRoot(),
            project_module_1.ProjectModule,
            indexing_module_1.IndexingModule,
            gitlab_module_1.GitlabModule,
            health_module_1.HealthModule,
        ],
        providers: [
            all_exceptions_filter_1.AllExceptionsFilter,
            logging_interceptor_1.LoggingInterceptor,
        ],
    })
], AppModule);


/***/ }),
/* 7 */
/***/ ((module) => {

module.exports = require("@nestjs/schedule");

/***/ }),
/* 8 */
/***/ ((module) => {

module.exports = require("winston");

/***/ }),
/* 9 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DatabaseModule = void 0;
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const config_1 = __webpack_require__(4);
const entities_1 = __webpack_require__(11);
const index_job_entity_1 = __webpack_require__(18);
let DatabaseModule = class DatabaseModule {
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    type: 'postgres',
                    host: configService.get('DB_HOST', 'localhost'),
                    port: configService.get('DB_PORT', 5432),
                    username: configService.get('DB_USERNAME', 'postgres'),
                    password: configService.get('DB_PASSWORD', 'postgres'),
                    database: configService.get('DB_DATABASE', 'tekaicontextengine'),
                    entities: [
                        entities_1.TekProject,
                        entities_1.DocsBucket,
                        entities_1.Codebase,
                        entities_1.Document,
                        index_job_entity_1.IndexJob,
                    ],
                    synchronize: configService.get('DB_SYNCHRONIZE', false),
                    logging: configService.get('DB_LOGGING', false),
                    ssl: configService.get('DB_SSL', false) ? {
                        rejectUnauthorized: false,
                    } : false,
                    extra: {
                        max: configService.get('DB_MAX_CONNECTIONS', 20),
                        connectionTimeoutMillis: configService.get('DB_CONNECTION_TIMEOUT', 60000),
                        idleTimeoutMillis: configService.get('DB_IDLE_TIMEOUT', 60000),
                    },
                }),
                inject: [config_1.ConfigService],
            }),
            typeorm_1.TypeOrmModule.forFeature([
                entities_1.TekProject,
                entities_1.DocsBucket,
                entities_1.Codebase,
                entities_1.Document,
                index_job_entity_1.IndexJob,
            ]),
        ],
        exports: [typeorm_1.TypeOrmModule],
    })
], DatabaseModule);


/***/ }),
/* 10 */
/***/ ((module) => {

module.exports = require("@nestjs/typeorm");

/***/ }),
/* 11 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(12), exports);
__exportStar(__webpack_require__(16), exports);
__exportStar(__webpack_require__(14), exports);
__exportStar(__webpack_require__(15), exports);
__exportStar(__webpack_require__(18), exports);
__exportStar(__webpack_require__(17), exports);


/***/ }),
/* 12 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TekProject = void 0;
const typeorm_1 = __webpack_require__(13);
const codebase_entity_1 = __webpack_require__(14);
const docs_bucket_entity_1 = __webpack_require__(16);
const enums_1 = __webpack_require__(17);
const index_job_entity_1 = __webpack_require__(18);
let TekProject = class TekProject {
};
exports.TekProject = TekProject;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TekProject.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], TekProject.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, unique: true }),
    __metadata("design:type", String)
], TekProject.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], TekProject.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: enums_1.ProjectStatus,
        default: enums_1.ProjectStatus.ACTIVE,
    }),
    __metadata("design:type", typeof (_a = typeof enums_1.ProjectStatus !== "undefined" && enums_1.ProjectStatus) === "function" ? _a : Object)
], TekProject.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", typeof (_b = typeof Record !== "undefined" && Record) === "function" ? _b : Object)
], TekProject.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", typeof (_c = typeof Date !== "undefined" && Date) === "function" ? _c : Object)
], TekProject.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", typeof (_d = typeof Date !== "undefined" && Date) === "function" ? _d : Object)
], TekProject.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => codebase_entity_1.Codebase, (codebase) => codebase.project),
    __metadata("design:type", Array)
], TekProject.prototype, "codebases", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => docs_bucket_entity_1.DocsBucket, (bucket) => bucket.project),
    __metadata("design:type", Array)
], TekProject.prototype, "docsBuckets", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => index_job_entity_1.IndexJob, (job) => job.project),
    __metadata("design:type", Array)
], TekProject.prototype, "indexJobs", void 0);
exports.TekProject = TekProject = __decorate([
    (0, typeorm_1.Entity)('tek_projects'),
    (0, typeorm_1.Index)(['status'])
], TekProject);


/***/ }),
/* 13 */
/***/ ((module) => {

module.exports = require("typeorm");

/***/ }),
/* 14 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b, _c, _d, _e, _f, _g;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Codebase = void 0;
const typeorm_1 = __webpack_require__(13);
const project_entity_1 = __webpack_require__(12);
const document_entity_1 = __webpack_require__(15);
const enums_1 = __webpack_require__(17);
const index_job_entity_1 = __webpack_require__(18);
let Codebase = class Codebase {
};
exports.Codebase = Codebase;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Codebase.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], Codebase.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500 }),
    __metadata("design:type", String)
], Codebase.prototype, "gitlabUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], Codebase.prototype, "gitlabProjectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, default: 'main' }),
    __metadata("design:type", String)
], Codebase.prototype, "branch", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500 }),
    __metadata("design:type", String)
], Codebase.prototype, "storagePath", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], Codebase.prototype, "language", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: enums_1.IndexMode,
        default: enums_1.IndexMode.MANUAL,
    }),
    __metadata("design:type", typeof (_a = typeof enums_1.IndexMode !== "undefined" && enums_1.IndexMode) === "function" ? _a : Object)
], Codebase.prototype, "syncMode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], Codebase.prototype, "webhookSecret", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 40, nullable: true }),
    __metadata("design:type", String)
], Codebase.prototype, "lastSyncCommit", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", typeof (_b = typeof Date !== "undefined" && Date) === "function" ? _b : Object)
], Codebase.prototype, "lastSyncAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", typeof (_c = typeof Date !== "undefined" && Date) === "function" ? _c : Object)
], Codebase.prototype, "lastSyncAttemptAt", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: enums_1.CodebaseStatus,
        default: enums_1.CodebaseStatus.PENDING,
    }),
    __metadata("design:type", typeof (_d = typeof enums_1.CodebaseStatus !== "undefined" && enums_1.CodebaseStatus) === "function" ? _d : Object)
], Codebase.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Codebase.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", typeof (_e = typeof Date !== "undefined" && Date) === "function" ? _e : Object)
], Codebase.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", typeof (_f = typeof Date !== "undefined" && Date) === "function" ? _f : Object)
], Codebase.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.TekProject, (project) => project.codebases, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'project_id' }),
    __metadata("design:type", typeof (_g = typeof project_entity_1.TekProject !== "undefined" && project_entity_1.TekProject) === "function" ? _g : Object)
], Codebase.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => document_entity_1.Document, (document) => document.codebase),
    __metadata("design:type", Array)
], Codebase.prototype, "documents", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => index_job_entity_1.IndexJob, (job) => job.codebase),
    __metadata("design:type", Array)
], Codebase.prototype, "indexJobs", void 0);
exports.Codebase = Codebase = __decorate([
    (0, typeorm_1.Entity)('codebases'),
    (0, typeorm_1.Unique)(['project', 'gitlabUrl']),
    (0, typeorm_1.Index)(['project', 'status'])
], Codebase);


/***/ }),
/* 15 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b, _c, _d, _e, _f;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Document = void 0;
const typeorm_1 = __webpack_require__(13);
const docs_bucket_entity_1 = __webpack_require__(16);
const codebase_entity_1 = __webpack_require__(14);
const enums_1 = __webpack_require__(17);
let Document = class Document {
};
exports.Document = Document;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Document.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 1000 }),
    __metadata("design:type", String)
], Document.prototype, "path", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500 }),
    __metadata("design:type", String)
], Document.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: enums_1.DocumentType,
    }),
    __metadata("design:type", typeof (_a = typeof enums_1.DocumentType !== "undefined" && enums_1.DocumentType) === "function" ? _a : Object)
], Document.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 64 }),
    __metadata("design:type", String)
], Document.prototype, "hash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], Document.prototype, "size", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: enums_1.FileStatus,
        default: enums_1.FileStatus.ACTIVE,
    }),
    __metadata("design:type", typeof (_b = typeof enums_1.FileStatus !== "undefined" && enums_1.FileStatus) === "function" ? _b : Object)
], Document.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Document.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", typeof (_c = typeof Date !== "undefined" && Date) === "function" ? _c : Object)
], Document.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", typeof (_d = typeof Date !== "undefined" && Date) === "function" ? _d : Object)
], Document.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => docs_bucket_entity_1.DocsBucket, (bucket) => bucket.documents, {
        nullable: true,
        onDelete: 'CASCADE'
    }),
    (0, typeorm_1.JoinColumn)({ name: 'bucket_id' }),
    __metadata("design:type", typeof (_e = typeof docs_bucket_entity_1.DocsBucket !== "undefined" && docs_bucket_entity_1.DocsBucket) === "function" ? _e : Object)
], Document.prototype, "bucket", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => codebase_entity_1.Codebase, (codebase) => codebase.documents, {
        nullable: true,
        onDelete: 'CASCADE'
    }),
    (0, typeorm_1.JoinColumn)({ name: 'codebase_id' }),
    __metadata("design:type", typeof (_f = typeof codebase_entity_1.Codebase !== "undefined" && codebase_entity_1.Codebase) === "function" ? _f : Object)
], Document.prototype, "codebase", void 0);
exports.Document = Document = __decorate([
    (0, typeorm_1.Entity)('documents'),
    (0, typeorm_1.Index)(['bucket', 'status']),
    (0, typeorm_1.Index)(['codebase', 'status']),
    (0, typeorm_1.Index)(['hash'])
], Document);


/***/ }),
/* 16 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DocsBucket = exports.BucketStatus = exports.DocsBucketType = void 0;
const typeorm_1 = __webpack_require__(13);
const project_entity_1 = __webpack_require__(12);
const document_entity_1 = __webpack_require__(15);
var DocsBucketType;
(function (DocsBucketType) {
    DocsBucketType["API_DOCS"] = "API_DOCS";
    DocsBucketType["USER_FLOWS"] = "USER_FLOWS";
    DocsBucketType["SECURITY_GUIDELINES"] = "SECURITY_GUIDELINES";
    DocsBucketType["ARCHITECTURE"] = "ARCHITECTURE";
    DocsBucketType["DEPLOYMENT"] = "DEPLOYMENT";
    DocsBucketType["OTHER"] = "OTHER";
})(DocsBucketType || (exports.DocsBucketType = DocsBucketType = {}));
var BucketStatus;
(function (BucketStatus) {
    BucketStatus["ACTIVE"] = "ACTIVE";
    BucketStatus["ARCHIVED"] = "ARCHIVED";
})(BucketStatus || (exports.BucketStatus = BucketStatus = {}));
let DocsBucket = class DocsBucket {
};
exports.DocsBucket = DocsBucket;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], DocsBucket.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], DocsBucket.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: DocsBucketType,
    }),
    __metadata("design:type", String)
], DocsBucket.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500 }),
    __metadata("design:type", String)
], DocsBucket.prototype, "storagePath", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: BucketStatus,
        default: BucketStatus.ACTIVE,
    }),
    __metadata("design:type", String)
], DocsBucket.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], DocsBucket.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", typeof (_a = typeof Date !== "undefined" && Date) === "function" ? _a : Object)
], DocsBucket.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", typeof (_b = typeof Date !== "undefined" && Date) === "function" ? _b : Object)
], DocsBucket.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.TekProject, (project) => project.docsBuckets, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'project_id' }),
    __metadata("design:type", typeof (_c = typeof project_entity_1.TekProject !== "undefined" && project_entity_1.TekProject) === "function" ? _c : Object)
], DocsBucket.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => document_entity_1.Document, (document) => document.bucket),
    __metadata("design:type", Array)
], DocsBucket.prototype, "documents", void 0);
exports.DocsBucket = DocsBucket = __decorate([
    (0, typeorm_1.Entity)('docs_buckets'),
    (0, typeorm_1.Unique)(['project', 'name']),
    (0, typeorm_1.Index)(['project', 'type'])
], DocsBucket);


/***/ }),
/* 17 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CodebaseStatus = exports.DocumentType = exports.FileStatus = exports.SyncMode = exports.IndexMode = exports.ProjectStatus = void 0;
var ProjectStatus;
(function (ProjectStatus) {
    ProjectStatus["ACTIVE"] = "active";
    ProjectStatus["ARCHIVED"] = "archived";
    ProjectStatus["DELETED"] = "deleted";
})(ProjectStatus || (exports.ProjectStatus = ProjectStatus = {}));
var IndexMode;
(function (IndexMode) {
    IndexMode["MANUAL"] = "manual";
    IndexMode["AUTO"] = "auto";
    IndexMode["WEBHOOK"] = "webhook";
})(IndexMode || (exports.IndexMode = IndexMode = {}));
exports.SyncMode = IndexMode;
var FileStatus;
(function (FileStatus) {
    FileStatus["ACTIVE"] = "active";
    FileStatus["DELETED"] = "deleted";
    FileStatus["IGNORED"] = "ignored";
})(FileStatus || (exports.FileStatus = FileStatus = {}));
var DocumentType;
(function (DocumentType) {
    DocumentType["MARKDOWN"] = "markdown";
    DocumentType["PDF"] = "pdf";
    DocumentType["TEXT"] = "text";
    DocumentType["HTML"] = "html";
    DocumentType["OTHER"] = "other";
})(DocumentType || (exports.DocumentType = DocumentType = {}));
var CodebaseStatus;
(function (CodebaseStatus) {
    CodebaseStatus["PENDING"] = "pending";
    CodebaseStatus["SYNCING"] = "syncing";
    CodebaseStatus["ACTIVE"] = "active";
    CodebaseStatus["ERROR"] = "error";
    CodebaseStatus["ARCHIVED"] = "archived";
})(CodebaseStatus || (exports.CodebaseStatus = CodebaseStatus = {}));


/***/ }),
/* 18 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b, _c, _d, _e, _f;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.IndexJob = exports.IndexJobTrigger = exports.IndexJobStatus = exports.IndexJobType = void 0;
const typeorm_1 = __webpack_require__(13);
const entities_1 = __webpack_require__(11);
var IndexJobType;
(function (IndexJobType) {
    IndexJobType["CODEBASE_FULL"] = "CODEBASE_FULL";
    IndexJobType["CODEBASE_INCR"] = "CODEBASE_INCR";
    IndexJobType["DOCS_BUCKET_FULL"] = "DOCS_BUCKET_FULL";
    IndexJobType["DOCS_BUCKET_INCR"] = "DOCS_BUCKET_INCR";
    IndexJobType["API_ANALYSIS"] = "API_ANALYSIS";
    IndexJobType["USERFLOW_ANALYSIS"] = "USERFLOW_ANALYSIS";
})(IndexJobType || (exports.IndexJobType = IndexJobType = {}));
var IndexJobStatus;
(function (IndexJobStatus) {
    IndexJobStatus["PENDING"] = "PENDING";
    IndexJobStatus["RUNNING"] = "RUNNING";
    IndexJobStatus["COMPLETED"] = "COMPLETED";
    IndexJobStatus["FAILED"] = "FAILED";
    IndexJobStatus["CANCELLED"] = "CANCELLED";
})(IndexJobStatus || (exports.IndexJobStatus = IndexJobStatus = {}));
var IndexJobTrigger;
(function (IndexJobTrigger) {
    IndexJobTrigger["MANUAL"] = "MANUAL";
    IndexJobTrigger["WEBHOOK"] = "WEBHOOK";
    IndexJobTrigger["SCHEDULED"] = "SCHEDULED";
})(IndexJobTrigger || (exports.IndexJobTrigger = IndexJobTrigger = {}));
let IndexJob = class IndexJob {
    isCompleted() {
        return this.status === IndexJobStatus.COMPLETED;
    }
    isFailed() {
        return this.status === IndexJobStatus.FAILED;
    }
    isRunning() {
        return this.status === IndexJobStatus.RUNNING;
    }
    canRetry() {
        const maxRetries = 3;
        return this.retryCount < maxRetries && this.isFailed();
    }
    getDuration() {
        if (this.startedAt && this.completedAt) {
            return this.completedAt.getTime() - this.startedAt.getTime();
        }
        return null;
    }
    getCurrentTaskProgress() {
        if (!this.metadata?.tasks || !this.currentTask) {
            return 0;
        }
        return this.metadata.tasks[this.currentTask]?.progress || 0;
    }
    getTasksForJobType() {
        switch (this.type) {
            case IndexJobType.CODEBASE_FULL:
            case IndexJobType.CODEBASE_INCR:
                return ['GIT_SYNC', 'CODE_PARSING', 'GRAPH_UPDATE', 'CLEANUP'];
            case IndexJobType.DOCS_BUCKET_FULL:
            case IndexJobType.DOCS_BUCKET_INCR:
                return ['DOC_SYNC', 'DOC_PROCESSING', 'GRAPH_UPDATE', 'CLEANUP'];
            case IndexJobType.API_ANALYSIS:
                return ['API_DISCOVERY', 'API_ANALYSIS', 'GRAPH_UPDATE', 'CLEANUP'];
            case IndexJobType.USERFLOW_ANALYSIS:
                return ['USERFLOW_DISCOVERY', 'USERFLOW_ANALYSIS', 'GRAPH_UPDATE', 'CLEANUP'];
            default:
                return [];
        }
    }
};
exports.IndexJob = IndexJob;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], IndexJob.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: IndexJobType,
    }),
    __metadata("design:type", String)
], IndexJob.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: IndexJobStatus,
        default: IndexJobStatus.PENDING,
    }),
    __metadata("design:type", String)
], IndexJob.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: IndexJobTrigger,
        default: IndexJobTrigger.MANUAL,
    }),
    __metadata("design:type", String)
], IndexJob.prototype, "trigger", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], IndexJob.prototype, "currentTask", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], IndexJob.prototype, "progress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], IndexJob.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], IndexJob.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], IndexJob.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], IndexJob.prototype, "error", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], IndexJob.prototype, "errorStack", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], IndexJob.prototype, "retryCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", typeof (_a = typeof Date !== "undefined" && Date) === "function" ? _a : Object)
], IndexJob.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", typeof (_b = typeof Date !== "undefined" && Date) === "function" ? _b : Object)
], IndexJob.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", typeof (_c = typeof Date !== "undefined" && Date) === "function" ? _c : Object)
], IndexJob.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", typeof (_d = typeof Date !== "undefined" && Date) === "function" ? _d : Object)
], IndexJob.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => entities_1.TekProject, (project) => project.indexJobs, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'project_id' }),
    __metadata("design:type", typeof (_e = typeof entities_1.TekProject !== "undefined" && entities_1.TekProject) === "function" ? _e : Object)
], IndexJob.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => entities_1.Codebase, (codebase) => codebase.indexJobs, {
        onDelete: 'CASCADE',
        nullable: true,
    }),
    (0, typeorm_1.JoinColumn)({ name: 'codebase_id' }),
    __metadata("design:type", typeof (_f = typeof entities_1.Codebase !== "undefined" && entities_1.Codebase) === "function" ? _f : Object)
], IndexJob.prototype, "codebase", void 0);
exports.IndexJob = IndexJob = __decorate([
    (0, typeorm_1.Entity)('index_jobs')
], IndexJob);


/***/ }),
/* 19 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.StorageModule = void 0;
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(4);
const storage_service_1 = __webpack_require__(20);
let StorageModule = class StorageModule {
};
exports.StorageModule = StorageModule;
exports.StorageModule = StorageModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [storage_service_1.StorageService],
        exports: [storage_service_1.StorageService],
    })
], StorageModule);


/***/ }),
/* 20 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.StorageService = void 0;
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(4);
const nest_winston_1 = __webpack_require__(5);
const fs = __webpack_require__(21);
const path = __webpack_require__(22);
const crypto = __webpack_require__(23);
let StorageService = class StorageService {
    constructor(configService, logger) {
        this.configService = configService;
        this.logger = logger;
        this.logger.debug('[STORAGE-SERVICE] Initializing storage service');
        this.config = {
            type: this.configService.get('STORAGE_TYPE', 'local'),
            basePath: this.configService.get('STORAGE_PATH', './storage'),
            maxFileSize: this.configService.get('MAX_FILE_SIZE_MB', 100) * 1024 * 1024,
            allowedExtensions: [
                '.ts', '.js', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.cpp', '.c',
                '.cs', '.php', '.rb', '.swift', '.kt', '.scala', '.sh', '.sql', '.html',
                '.css', '.scss', '.sass', '.less', '.json', '.xml', '.yaml', '.yml',
                '.md', '.txt', '.dockerfile', '.gitignore', '.env.example',
            ],
        };
        this.logger.log('[STORAGE-SERVICE] Storage configuration loaded', {
            type: this.config.type,
            basePath: this.config.basePath,
            maxFileSizeMB: Math.round(this.config.maxFileSize / (1024 * 1024)),
            allowedExtensionsCount: this.config.allowedExtensions?.length || 0
        });
        this.initializeStorage();
    }
    async initializeStorage() {
        this.logger.debug('[STORAGE-SERVICE] Starting storage initialization', {
            storageType: this.config.type
        });
        if (this.config.type === 'local') {
            this.logger.debug('[STORAGE-SERVICE] Initializing local storage directories');
            try {
                const directories = [
                    this.config.basePath,
                    path.join(this.config.basePath, 'codebases'),
                    path.join(this.config.basePath, 'temp'),
                    path.join(this.config.basePath, 'cache')
                ];
                for (const dir of directories) {
                    await fs.mkdir(dir, { recursive: true });
                    this.logger.debug('[STORAGE-SERVICE] Created directory', { directory: dir });
                }
                this.logger.log('[STORAGE-SERVICE] Local storage initialized successfully', {
                    basePath: this.config.basePath,
                    directoriesCreated: directories.length
                });
                this.logger.log(`Local storage initialized at: ${this.config.basePath}`);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.error('[STORAGE-SERVICE] Failed to initialize local storage', {
                    error: errorMessage,
                    basePath: this.config.basePath,
                    stack: error instanceof Error ? error.stack : undefined
                });
                this.logger.error('Failed to initialize local storage:', error);
                throw error;
            }
        }
        else {
            this.logger.debug('[STORAGE-SERVICE] Non-local storage type, skipping directory initialization', {
                storageType: this.config.type
            });
        }
    }
    async storeFile(content, originalName, codebaseId, filePath) {
        this.logger.debug('[STORAGE-SERVICE] Starting file storage operation', {
            originalName,
            codebaseId,
            filePath,
            contentSize: content.length,
            contentSizeMB: Math.round(content.length / (1024 * 1024) * 100) / 100
        });
        if (content.length > this.config.maxFileSize) {
            this.logger.error('[STORAGE-SERVICE] File size validation failed', {
                fileSize: content.length,
                maxFileSize: this.config.maxFileSize,
                fileSizeMB: Math.round(content.length / (1024 * 1024) * 100) / 100,
                maxFileSizeMB: Math.round(this.config.maxFileSize / (1024 * 1024))
            });
            throw new Error(`File size exceeds maximum allowed size: ${this.config.maxFileSize} bytes`);
        }
        const extension = path.extname(originalName).toLowerCase();
        if (this.config.allowedExtensions && !this.config.allowedExtensions.includes(extension)) {
            this.logger.error('[STORAGE-SERVICE] File extension validation failed', {
                extension,
                originalName,
                allowedExtensions: this.config.allowedExtensions
            });
            throw new Error(`File extension not allowed: ${extension}`);
        }
        this.logger.debug('[STORAGE-SERVICE] File validation passed', {
            extension,
            contentSize: content.length
        });
        this.logger.debug('[STORAGE-SERVICE] Calculating file hash');
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        this.logger.debug('[STORAGE-SERVICE] Generating storage path');
        const storagePath = this.generateStoragePath(codebaseId, filePath);
        const fullPath = path.join(this.config.basePath, storagePath);
        this.logger.debug('[STORAGE-SERVICE] Storage paths generated', {
            storagePath,
            fullPath,
            hash: hash.substring(0, 8)
        });
        try {
            const parentDir = path.dirname(fullPath);
            this.logger.debug('[STORAGE-SERVICE] Ensuring parent directory exists', {
                parentDir
            });
            await fs.mkdir(parentDir, { recursive: true });
            this.logger.debug('[STORAGE-SERVICE] Writing file to storage');
            const writeStartTime = Date.now();
            await fs.writeFile(fullPath, content);
            const writeDuration = Date.now() - writeStartTime;
            const storedFile = {
                id: crypto.randomUUID(),
                originalName,
                path: storagePath,
                size: content.length,
                hash,
                createdAt: new Date(),
            };
            this.logger.log('[STORAGE-SERVICE] File stored successfully', {
                storedFileId: storedFile.id,
                originalName: storedFile.originalName,
                storagePath: storedFile.path,
                fileSize: storedFile.size,
                fileSizeMB: Math.round(storedFile.size / (1024 * 1024) * 100) / 100,
                hash: storedFile.hash.substring(0, 8),
                writeDurationMs: writeDuration,
                codebaseId
            });
            this.logger.debug(`File stored: ${storagePath} (${content.length} bytes)`);
            return storedFile;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('[STORAGE-SERVICE] Failed to store file', {
                originalName,
                codebaseId,
                filePath,
                storagePath,
                fullPath,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
            this.logger.error(`Failed to store file ${originalName}:`, error);
            throw error;
        }
    }
    async getFile(storagePath) {
        this.logger.debug('[STORAGE-SERVICE] Retrieving file content', {
            storagePath
        });
        const fullPath = path.join(this.config.basePath, storagePath);
        try {
            const readStartTime = Date.now();
            const content = await fs.readFile(fullPath);
            const readDuration = Date.now() - readStartTime;
            this.logger.debug('[STORAGE-SERVICE] File retrieved successfully', {
                storagePath,
                contentSize: content.length,
                contentSizeMB: Math.round(content.length / (1024 * 1024) * 100) / 100,
                readDurationMs: readDuration
            });
            this.logger.debug(`File retrieved: ${storagePath} (${content.length} bytes)`);
            return content;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('[STORAGE-SERVICE] Failed to retrieve file', {
                storagePath,
                fullPath,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
            this.logger.error(`Failed to retrieve file ${storagePath}:`, error);
            throw error;
        }
    }
    async fileExists(storagePath) {
        this.logger.debug('[STORAGE-SERVICE] Checking if file exists', {
            storagePath
        });
        const fullPath = path.join(this.config.basePath, storagePath);
        try {
            await fs.access(fullPath);
            this.logger.debug('[STORAGE-SERVICE] File exists', {
                storagePath,
                exists: true
            });
            return true;
        }
        catch {
            this.logger.debug('[STORAGE-SERVICE] File does not exist', {
                storagePath,
                exists: false
            });
            return false;
        }
    }
    async deleteFile(storagePath) {
        const fullPath = path.join(this.config.basePath, storagePath);
        try {
            await fs.unlink(fullPath);
            this.logger.debug(`File deleted: ${storagePath}`);
        }
        catch (error) {
            this.logger.error(`Failed to delete file ${storagePath}:`, error);
            throw error;
        }
    }
    async deleteCodebaseFiles(codebaseId) {
        const codebasePath = path.join(this.config.basePath, 'codebases', codebaseId);
        try {
            await fs.rm(codebasePath, { recursive: true, force: true });
            this.logger.log(`Deleted all files for codebase: ${codebaseId}`);
        }
        catch (error) {
            this.logger.error(`Failed to delete codebase files ${codebaseId}:`, error);
            throw error;
        }
    }
    async getFileStats(storagePath) {
        const fullPath = path.join(this.config.basePath, storagePath);
        try {
            const stats = await fs.stat(fullPath);
            return {
                size: stats.size,
                mtime: stats.mtime,
            };
        }
        catch (error) {
            this.logger.error(`Failed to get file stats ${storagePath}:`, error);
            throw error;
        }
    }
    async storeTempFile(content, filename) {
        const tempPath = path.join('temp', `${Date.now()}-${filename}`);
        const fullPath = path.join(this.config.basePath, tempPath);
        try {
            await fs.writeFile(fullPath, content);
            this.logger.debug(`Temporary file stored: ${tempPath}`);
            return tempPath;
        }
        catch (error) {
            this.logger.error(`Failed to store temporary file ${filename}:`, error);
            throw error;
        }
    }
    async cleanupTempFiles(maxAgeHours = 24) {
        const tempDir = path.join(this.config.basePath, 'temp');
        const maxAge = Date.now() - (maxAgeHours * 60 * 60 * 1000);
        try {
            const files = await fs.readdir(tempDir);
            for (const file of files) {
                const filePath = path.join(tempDir, file);
                const stats = await fs.stat(filePath);
                if (stats.mtime.getTime() < maxAge) {
                    await fs.unlink(filePath);
                    this.logger.debug(`Cleaned up temporary file: ${file}`);
                }
            }
        }
        catch (error) {
            this.logger.error('Failed to cleanup temporary files:', error);
        }
    }
    async getStorageStats() {
        try {
            const codebasesDir = path.join(this.config.basePath, 'codebases');
            let totalSize = 0;
            let fileCount = 0;
            let codebaseCount = 0;
            const codebases = await fs.readdir(codebasesDir);
            codebaseCount = codebases.length;
            for (const codebase of codebases) {
                const codebasePath = path.join(codebasesDir, codebase);
                const stats = await this.getDirectoryStats(codebasePath);
                totalSize += stats.size;
                fileCount += stats.fileCount;
            }
            return { totalSize, fileCount, codebaseCount };
        }
        catch (error) {
            this.logger.error('Failed to get storage stats:', error);
            return { totalSize: 0, fileCount: 0, codebaseCount: 0 };
        }
    }
    generateStoragePath(codebaseId, filePath) {
        const sanitizedPath = filePath.replace(/[^a-zA-Z0-9\/\-_.]/g, '_');
        return path.join('codebases', codebaseId, sanitizedPath);
    }
    async getDirectoryStats(dirPath) {
        let totalSize = 0;
        let fileCount = 0;
        try {
            const items = await fs.readdir(dirPath);
            for (const item of items) {
                const itemPath = path.join(dirPath, item);
                const stats = await fs.stat(itemPath);
                if (stats.isDirectory()) {
                    const subStats = await this.getDirectoryStats(itemPath);
                    totalSize += subStats.size;
                    fileCount += subStats.fileCount;
                }
                else {
                    totalSize += stats.size;
                    fileCount++;
                }
            }
        }
        catch (error) {
        }
        return { size: totalSize, fileCount };
    }
    getConfig() {
        return { ...this.config };
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _a : Object, typeof (_b = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _b : Object])
], StorageService);


/***/ }),
/* 21 */
/***/ ((module) => {

module.exports = require("fs/promises");

/***/ }),
/* 22 */
/***/ ((module) => {

module.exports = require("path");

/***/ }),
/* 23 */
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),
/* 24 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WorkerPoolModule = void 0;
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(4);
const worker_pool_service_1 = __webpack_require__(25);
let WorkerPoolModule = class WorkerPoolModule {
};
exports.WorkerPoolModule = WorkerPoolModule;
exports.WorkerPoolModule = WorkerPoolModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [worker_pool_service_1.WorkerPoolService],
        exports: [worker_pool_service_1.WorkerPoolService],
    })
], WorkerPoolModule);


/***/ }),
/* 25 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WorkerPoolService = exports.WorkerPool = exports.Semaphore = void 0;
const common_1 = __webpack_require__(2);
const nest_winston_1 = __webpack_require__(5);
class Semaphore {
    constructor(permits) {
        this.waitQueue = [];
        this.permits = permits;
    }
    async acquire() {
        return new Promise((resolve) => {
            if (this.permits > 0) {
                this.permits--;
                resolve();
            }
            else {
                this.waitQueue.push(resolve);
            }
        });
    }
    release() {
        this.permits++;
        if (this.waitQueue.length > 0) {
            const next = this.waitQueue.shift();
            if (next) {
                this.permits--;
                next();
            }
        }
    }
}
exports.Semaphore = Semaphore;
class WorkerPool {
    constructor(name, options, logger) {
        this.name = name;
        this.options = options;
        this.logger = logger;
        this.workers = [];
        this.taskQueue = [];
        this.isShuttingDown = false;
        this.logger.debug(`[WORKER-POOL] [${this.name}] Initializing worker pool`, 'WorkerPool');
        this.logger.debug({
            maxWorkers: options.maxWorkers,
            taskTimeout: options.taskTimeout
        }, 'WorkerPool');
        this.semaphore = new Semaphore(options.maxWorkers);
        this.initializeWorkers();
        this.logger.log(`[WORKER-POOL] [${this.name}] Worker pool initialized successfully`, 'WorkerPool');
        this.logger.log({
            totalWorkers: this.workers.length,
            maxWorkers: options.maxWorkers
        }, 'WorkerPool');
    }
    async submit(task) {
        this.logger.debug(`[WORKER-POOL] [${this.name}] Submitting task to pool`, {
            taskId: task.id,
            timeout: task.timeout,
            currentQueueSize: this.taskQueue.length,
            activeWorkers: this.getActiveWorkerCount()
        });
        if (this.isShuttingDown) {
            this.logger.error(`[WORKER-POOL] [${this.name}] Cannot submit task - pool is shutting down`, {
                taskId: task.id
            });
            throw new Error('Worker pool is shutting down');
        }
        return new Promise((resolve, reject) => {
            const wrappedTask = {
                ...task,
                execute: async () => {
                    try {
                        this.logger.debug(`[WORKER-POOL] [${this.name}] Starting task execution`, 'WorkerPool');
                        this.logger.debug({
                            taskId: task.id
                        }, 'WorkerPool');
                        const result = await this.executeWithTimeout(task);
                        this.logger.debug(`[WORKER-POOL] [${this.name}] Task completed successfully`, 'WorkerPool');
                        this.logger.debug({
                            taskId: task.id
                        }, 'WorkerPool');
                        resolve(result);
                        return result;
                    }
                    catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        this.logger.error(`[WORKER-POOL] [${this.name}] Task failed`, {
                            taskId: task.id,
                            error: errorMessage,
                            stack: error instanceof Error ? error.stack : undefined
                        });
                        reject(error);
                        throw error;
                    }
                },
            };
            this.taskQueue.push(wrappedTask);
            this.logger.debug(`[WORKER-POOL] [${this.name}] Task added to queue`, {
                taskId: task.id,
                newQueueSize: this.taskQueue.length
            });
            this.processQueue();
        });
    }
    async shutdown(timeout = 30000) {
        this.logger.log('Shutting down worker pool...');
        this.isShuttingDown = true;
        const startTime = Date.now();
        while (this.hasActiveTasks() && Date.now() - startTime < timeout) {
            await this.sleep(100);
        }
        this.taskQueue.length = 0;
        this.workers.length = 0;
        this.logger.log('Worker pool shutdown complete');
    }
    async onModuleDestroy() {
        await this.shutdown();
    }
    initializeWorkers() {
        for (let i = 0; i < this.options.maxWorkers; i++) {
            this.workers.push(this.createWorker(i));
        }
    }
    createWorker(id) {
        return {
            id: `${this.name}-worker-${id}`,
            busy: false,
            lastUsed: new Date(),
        };
    }
    async processQueue() {
        this.logger.debug(`[WORKER-POOL] [${this.name}] Processing queue`, {
            queueLength: this.taskQueue.length,
            isShuttingDown: this.isShuttingDown,
            activeWorkers: this.getActiveWorkerCount(),
            availableWorkers: this.getAvailableWorkerCount()
        });
        if (this.taskQueue.length === 0 || this.isShuttingDown) {
            this.logger.debug(`[WORKER-POOL] [${this.name}] Queue processing skipped`, {
                reason: this.taskQueue.length === 0 ? 'empty queue' : 'shutting down'
            });
            return;
        }
        this.logger.debug(`[WORKER-POOL] [${this.name}] Acquiring worker from semaphore`);
        await this.semaphore.acquire();
        try {
            const task = this.taskQueue.shift();
            if (!task) {
                this.logger.debug(`[WORKER-POOL] [${this.name}] No task available after acquiring worker`);
                this.semaphore.release();
                return;
            }
            const worker = this.getAvailableWorker();
            if (!worker) {
                this.logger.warn(`[WORKER-POOL] [${this.name}] No available worker despite semaphore acquisition`, {
                    taskId: task.id,
                    totalWorkers: this.workers.length,
                    activeWorkers: this.getActiveWorkerCount()
                });
                this.taskQueue.unshift(task);
                this.semaphore.release();
                return;
            }
            this.logger.debug(`[WORKER-POOL] [${this.name}] Assigning task to worker`, {
                taskId: task.id,
                workerId: worker.id,
                queueLengthAfterShift: this.taskQueue.length
            });
            this.executeTask(worker, task);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[WORKER-POOL] [${this.name}] Error processing queue`, {
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
                queueLength: this.taskQueue.length
            });
            this.semaphore.release();
            this.logger.error('Error processing queue:', error);
        }
    }
    async executeTask(worker, task) {
        this.logger.debug(`[WORKER-POOL] [${this.name}] Starting task execution`, {
            taskId: task.id,
            workerId: worker.id,
            workerLastUsed: worker.lastUsed
        });
        worker.busy = true;
        worker.currentTask = task;
        worker.lastUsed = new Date();
        const taskStartTime = Date.now();
        try {
            await task.execute();
            const taskDuration = Date.now() - taskStartTime;
            this.logger.debug(`[WORKER-POOL] [${this.name}] Task executed successfully`, {
                taskId: task.id,
                workerId: worker.id,
                duration: taskDuration
            });
        }
        catch (error) {
            const taskDuration = Date.now() - taskStartTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[WORKER-POOL] [${this.name}] Task execution failed`, {
                taskId: task.id,
                workerId: worker.id,
                duration: taskDuration,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
            this.logger.error(`Task ${task.id} failed:`, error);
        }
        finally {
            this.logger.debug(`[WORKER-POOL] [${this.name}] Cleaning up after task execution`, {
                taskId: task.id,
                workerId: worker.id
            });
            worker.busy = false;
            worker.currentTask = undefined;
            this.semaphore.release();
            setImmediate(() => this.processQueue());
        }
    }
    async executeWithTimeout(task) {
        const timeout = task.timeout || this.options.taskTimeout;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Task ${task.id} timed out after ${timeout}ms`));
            }, timeout);
            task.execute()
                .then(result => {
                clearTimeout(timer);
                resolve(result);
            })
                .catch(error => {
                clearTimeout(timer);
                reject(error);
            });
        });
    }
    getAvailableWorker() {
        return this.workers.find(w => !w.busy) || null;
    }
    getActiveWorkerCount() {
        return this.workers.filter(w => w.busy).length;
    }
    getAvailableWorkerCount() {
        return this.workers.filter(w => !w.busy).length;
    }
    hasActiveTasks() {
        return this.workers.some(w => w.busy) || this.taskQueue.length > 0;
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.WorkerPool = WorkerPool;
let WorkerPoolService = class WorkerPoolService {
    constructor(logger) {
        this.logger = logger;
        this.pools = new Map();
        this.logger.debug('[WORKER-POOL-SERVICE] Initializing worker pool service', 'WorkerPoolService');
    }
    createPool(name, options) {
        this.logger.debug('[WORKER-POOL-SERVICE] Creating new worker pool', 'WorkerPoolService');
        this.logger.debug({
            poolName: name,
            maxWorkers: options.maxWorkers,
            taskTimeout: options.taskTimeout
        }, 'WorkerPoolService');
        if (this.pools.has(name)) {
            this.logger.error('[WORKER-POOL-SERVICE] Cannot create pool - name already exists', 'WorkerPoolService');
            this.logger.error({
                poolName: name,
                existingPools: Array.from(this.pools.keys())
            }, 'WorkerPoolService');
            throw new Error(`Worker pool '${name}' already exists`);
        }
        const pool = new WorkerPool(name, options, this.logger);
        this.pools.set(name, pool);
        this.logger.log('[WORKER-POOL-SERVICE] Worker pool created successfully', 'WorkerPoolService');
        this.logger.log({
            poolName: name,
            maxWorkers: options.maxWorkers,
            totalPools: this.pools.size
        }, 'WorkerPoolService');
        this.logger.log(`Created worker pool '${name}' with ${options.maxWorkers} workers`, 'WorkerPoolService');
        return pool;
    }
    async submitTask(poolName, task) {
        this.logger.debug('[WORKER-POOL-SERVICE] Submitting task to pool', 'WorkerPoolService');
        this.logger.debug({
            poolName,
            taskId: task.id,
            taskTimeout: task.timeout
        }, 'WorkerPoolService');
        const pool = this.pools.get(poolName);
        if (!pool) {
            this.logger.error('[WORKER-POOL-SERVICE] Cannot submit task - pool not found', 'WorkerPoolService');
            this.logger.error({
                poolName,
                taskId: task.id,
                availablePools: Array.from(this.pools.keys())
            }, 'WorkerPoolService');
            throw new Error(`Worker pool '${poolName}' not found`);
        }
        try {
            const result = await pool.submit(task);
            this.logger.debug('[WORKER-POOL-SERVICE] Task submitted successfully', 'WorkerPoolService');
            this.logger.debug({
                poolName,
                taskId: task.id
            }, 'WorkerPoolService');
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('[WORKER-POOL-SERVICE] Task submission failed', {
                poolName,
                taskId: task.id,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
            throw error;
        }
    }
    async onModuleDestroy() {
        this.logger.log('Shutting down all worker pools...');
        const shutdownPromises = Array.from(this.pools.values()).map(pool => pool.shutdown());
        await Promise.all(shutdownPromises);
        this.pools.clear();
        this.logger.log('All worker pools shut down');
    }
};
exports.WorkerPoolService = WorkerPoolService;
exports.WorkerPoolService = WorkerPoolService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _a : Object])
], WorkerPoolService);


/***/ }),
/* 26 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProjectModule = void 0;
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const config_1 = __webpack_require__(4);
const entities_1 = __webpack_require__(11);
const tekproject_service_1 = __webpack_require__(27);
const codebase_service_1 = __webpack_require__(32);
const document_service_1 = __webpack_require__(37);
const tekproject_controller_1 = __webpack_require__(38);
const codebase_controller_1 = __webpack_require__(49);
const document_controller_1 = __webpack_require__(50);
const gitlab_module_1 = __webpack_require__(52);
let ProjectModule = class ProjectModule {
};
exports.ProjectModule = ProjectModule;
exports.ProjectModule = ProjectModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            typeorm_1.TypeOrmModule.forFeature([
                entities_1.TekProject,
                entities_1.Codebase,
                entities_1.DocsBucket,
                entities_1.Document,
            ]),
            gitlab_module_1.GitlabModule,
        ],
        controllers: [tekproject_controller_1.TekProjectController, codebase_controller_1.CodebaseController, document_controller_1.DocsBucketController, document_controller_1.DocumentController],
        providers: [tekproject_service_1.TekProjectService, codebase_service_1.CodebaseService, document_service_1.DocumentService],
        exports: [tekproject_service_1.TekProjectService, codebase_service_1.CodebaseService, document_service_1.DocumentService],
    })
], ProjectModule);


/***/ }),
/* 27 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TekProjectService = void 0;
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const nest_winston_1 = __webpack_require__(5);
const typeorm_2 = __webpack_require__(13);
const entities_1 = __webpack_require__(11);
const adapters_1 = __webpack_require__(28);
let TekProjectService = class TekProjectService {
    constructor(tekProjectRepository, logger) {
        this.tekProjectRepository = tekProjectRepository;
        this.logger = logger;
    }
    async create(createDto) {
        this.logger.log(`Creating TekProject: ${createDto.name}`, 'TekProjectService');
        try {
            const tekProject = adapters_1.TekProjectAdapter.fromCreateDto(createDto);
            const savedProject = await this.tekProjectRepository.save(tekProject);
            this.logger.log(`TekProject created successfully: ${savedProject.id}`);
            return savedProject;
        }
        catch (error) {
            this.logger.error(`Failed to create TekProject: ${createDto.name}`, error);
            throw error;
        }
    }
    async findById(id) {
        const tekProject = await this.tekProjectRepository.findOne({
            where: { id },
            relations: ['codebases', 'docsBuckets'],
        });
        if (!tekProject) {
            throw new common_1.NotFoundException(`TekProject ${id} not found`);
        }
        return tekProject;
    }
    async findAll(options = {}) {
        const { page = 1, perPage = 20, sort = 'createdAt', orderBy = 'desc' } = options;
        const [tekProjects, total] = await this.tekProjectRepository.findAndCount({
            relations: ['codebases', 'docsBuckets'],
            order: { [sort]: orderBy.toUpperCase() },
            skip: (page - 1) * perPage,
            take: perPage,
        });
        return {
            data: tekProjects,
            total,
            page,
            perPage,
            totalPages: Math.ceil(total / perPage),
            hasNext: page * perPage < total,
            hasPrevious: page > 1,
        };
    }
    async update(id, updateDto) {
        const existingProject = await this.findById(id);
        const updatedProject = adapters_1.TekProjectAdapter.fromUpdateDto(existingProject, updateDto);
        return await this.tekProjectRepository.save(updatedProject);
    }
    async delete(id) {
        const tekProject = await this.tekProjectRepository.findOne({
            where: { id },
            relations: ['codebases', 'docsBuckets']
        });
        if (!tekProject) {
            throw new common_1.NotFoundException(`TekProject ${id} not found`);
        }
        tekProject.status = entities_1.ProjectStatus.DELETED;
        tekProject.updatedAt = new Date();
        if (tekProject.codebases) {
            tekProject.codebases.forEach(codebase => {
                codebase.status = 'ARCHIVED';
                codebase.updatedAt = new Date();
            });
        }
        if (tekProject.docsBuckets) {
            tekProject.docsBuckets.forEach(bucket => {
                bucket.status = 'ARCHIVED';
                bucket.updatedAt = new Date();
            });
        }
        await this.tekProjectRepository.save(tekProject);
        this.logger.log(`TekProject deleted with cascading: ${id}`);
    }
};
exports.TekProjectService = TekProjectService;
exports.TekProjectService = TekProjectService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.TekProject)),
    __param(1, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object, typeof (_b = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _b : Object])
], TekProjectService);


/***/ }),
/* 28 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(29), exports);
__exportStar(__webpack_require__(30), exports);
__exportStar(__webpack_require__(31), exports);


/***/ }),
/* 29 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TekProjectAdapter = void 0;
const entities_1 = __webpack_require__(11);
class TekProjectAdapter {
    static fromCreateDto(dto) {
        const tekProject = new entities_1.TekProject();
        tekProject.name = dto.name;
        tekProject.slug = dto.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        tekProject.description = dto.description || '';
        tekProject.status = entities_1.ProjectStatus.ACTIVE;
        tekProject.metadata = {
            techStack: dto.techStack || [],
            createdBy: 'system',
        };
        return tekProject;
    }
    static fromUpdateDto(existingProject, dto) {
        const updatedProject = { ...existingProject };
        if (dto.name !== undefined) {
            updatedProject.name = dto.name;
            updatedProject.slug = dto.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        }
        if (dto.description !== undefined) {
            updatedProject.description = dto.description;
        }
        if (dto.status !== undefined) {
            updatedProject.status = dto.status;
        }
        if (dto.techStack !== undefined) {
            updatedProject.metadata = {
                ...updatedProject.metadata,
                techStack: dto.techStack,
            };
        }
        updatedProject.updatedAt = new Date();
        return updatedProject;
    }
}
exports.TekProjectAdapter = TekProjectAdapter;


/***/ }),
/* 30 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CodebaseAdapter = void 0;
const entities_1 = __webpack_require__(11);
class CodebaseAdapter {
    static fromCreateDto(dto, tekProject, gitlabRepo) {
        const codebase = new entities_1.Codebase();
        codebase.project = tekProject;
        codebase.name = dto.name;
        codebase.gitlabUrl = dto.gitlabUrl;
        codebase.gitlabProjectId = gitlabRepo.id;
        codebase.branch = dto.branch || gitlabRepo.default_branch || 'main';
        codebase.language = dto.language || 'unknown';
        codebase.storagePath = '';
        codebase.syncMode = this.mapIndexMode(dto.indexMode) || entities_1.IndexMode.MANUAL;
        codebase.metadata = {
            gitConfig: {},
            indexConfig: {
                includePaths: [],
                excludePaths: ['node_modules', '.git', 'dist', 'build'],
                maxFileSize: 1024 * 1024,
            },
            statistics: {
                totalFiles: 0,
                totalLines: 0,
                languages: {},
            },
            gitlabRepo: {
                id: gitlabRepo.id,
                name: gitlabRepo.name,
                defaultBranch: gitlabRepo.default_branch,
                visibility: gitlabRepo.visibility,
                lastActivity: gitlabRepo.last_activity_at,
            },
        };
        return codebase;
    }
    static mapIndexMode(indexMode) {
        switch (indexMode) {
            case 'manual':
                return entities_1.IndexMode.MANUAL;
            case 'auto':
                return entities_1.IndexMode.AUTO;
            case 'webhook':
                return entities_1.IndexMode.WEBHOOK;
            default:
                return undefined;
        }
    }
}
exports.CodebaseAdapter = CodebaseAdapter;


/***/ }),
/* 31 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DocumentAdapter = void 0;
const entities_1 = __webpack_require__(11);
class DocumentAdapter {
    static createDefaultDocsBuckets(tekProject, storagePath = './storage') {
        const bucketConfigs = [
            {
                name: 'API Documentation',
                type: entities_1.DocsBucketType.API_DOCS,
            },
            {
                name: 'User Flows',
                type: entities_1.DocsBucketType.USER_FLOWS,
            },
            {
                name: 'Security Guidelines',
                type: entities_1.DocsBucketType.SECURITY_GUIDELINES,
            },
        ];
        return bucketConfigs.map(config => {
            const bucket = new entities_1.DocsBucket();
            bucket.project = tekProject;
            bucket.name = config.name;
            bucket.type = config.type;
            bucket.storagePath = `${storagePath}/docs/${tekProject.id}/${config.type}`;
            bucket.metadata = {
                createdBy: 'system',
                defaultBucket: true,
                processingConfig: {
                    chunkSize: 2000,
                    chunkOverlap: 400,
                    fileExtensions: ['.md', '.txt', '.pdf', '.docx'],
                },
            };
            return bucket;
        });
    }
    static fromCreateBucketData(data, tekProject, storagePath = './storage') {
        const bucket = new entities_1.DocsBucket();
        bucket.project = tekProject;
        bucket.name = data.name;
        bucket.type = data.type;
        bucket.storagePath = `${storagePath}/docs/${tekProject.id}/${data.type}`;
        bucket.metadata = {
            description: data.description,
            createdBy: 'user',
            processingConfig: {
                chunkSize: 2000,
                chunkOverlap: 400,
                fileExtensions: ['.md', '.txt', '.pdf', '.docx'],
            },
        };
        return bucket;
    }
    static fromUpdateBucketData(existingBucket, data) {
        const updatedBucket = { ...existingBucket };
        if (data.name) {
            updatedBucket.name = data.name;
        }
        if (data.status) {
            updatedBucket.status = data.status;
        }
        if (data.description) {
            updatedBucket.metadata = {
                ...updatedBucket.metadata,
                description: data.description,
            };
        }
        updatedBucket.updatedAt = new Date();
        return updatedBucket;
    }
    static fromUploadData(file, uploadData, bucket, filePath, fileHash) {
        const document = new entities_1.Document();
        document.bucket = bucket;
        document.title = uploadData.title;
        document.type = this.mapDocumentType(uploadData.type);
        document.path = filePath;
        document.size = file.size;
        document.hash = fileHash;
        document.metadata = {
            description: uploadData.description,
            tags: uploadData.tags || [],
            uploadedBy: 'user',
            originalFileName: file.originalname,
            mimeType: file.mimetype,
            processed: false,
        };
        return document;
    }
    static mapDocumentType(type) {
        switch (type.toLowerCase()) {
            case 'markdown':
                return entities_1.DocumentType.MARKDOWN;
            case 'pdf':
                return entities_1.DocumentType.PDF;
            case 'html':
                return entities_1.DocumentType.HTML;
            case 'text':
                return entities_1.DocumentType.TEXT;
            case 'documentation':
            case 'specification':
            case 'guide':
                return entities_1.DocumentType.OTHER;
            default:
                return entities_1.DocumentType.OTHER;
        }
    }
}
exports.DocumentAdapter = DocumentAdapter;


/***/ }),
/* 32 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CodebaseService = void 0;
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const nest_winston_1 = __webpack_require__(5);
const typeorm_2 = __webpack_require__(13);
const entities_1 = __webpack_require__(11);
const adapters_1 = __webpack_require__(28);
const gitlab_service_1 = __webpack_require__(33);
let CodebaseService = class CodebaseService {
    constructor(codebaseRepository, tekProjectRepository, gitlabService, logger) {
        this.codebaseRepository = codebaseRepository;
        this.tekProjectRepository = tekProjectRepository;
        this.gitlabService = gitlabService;
        this.logger = logger;
    }
    async create(createDto) {
        this.logger.log(`Creating codebase: ${createDto.name} for project: ${createDto.projectId}`);
        try {
            const tekProject = await this.findTekProjectById(createDto.projectId);
            const gitlabProjectId = this.gitlabService.extractProjectIdFromUrl(createDto.gitlabUrl);
            const gitlabRepo = await this.gitlabService.getRepository(gitlabProjectId);
            if (!gitlabRepo) {
                throw new common_1.BadRequestException('GitLab project not found or not accessible');
            }
            const codebase = adapters_1.CodebaseAdapter.fromCreateDto(createDto, tekProject, gitlabRepo);
            const savedCodebase = await this.codebaseRepository.save(codebase);
            this.logger.log(`Codebase created successfully: ${savedCodebase.id}`);
            return savedCodebase;
        }
        catch (error) {
            this.logger.error(`Failed to create codebase: ${createDto.name}`, error);
            throw error;
        }
    }
    async findById(id) {
        const codebase = await this.codebaseRepository.findOne({
            where: { id },
            relations: ['project'],
        });
        if (!codebase) {
            throw new common_1.NotFoundException(`Codebase ${id} not found`);
        }
        return codebase;
    }
    async findByProjectId(projectId, options = {}) {
        const { page = 1, perPage = 20, sort = 'createdAt', orderBy = 'desc' } = options;
        const [codebases, total] = await this.codebaseRepository.findAndCount({
            where: { project: { id: projectId } },
            relations: ['project'],
            order: { [sort]: orderBy.toUpperCase() },
            skip: (page - 1) * perPage,
            take: perPage,
        });
        return {
            data: codebases,
            total,
            page,
            perPage,
            totalPages: Math.ceil(total / perPage),
            hasNext: page * perPage < total,
            hasPrevious: page > 1,
        };
    }
    async findTekProjectById(id) {
        const tekProject = await this.tekProjectRepository.findOne({
            where: { id },
        });
        if (!tekProject) {
            throw new common_1.NotFoundException(`TekProject ${id} not found`);
        }
        return tekProject;
    }
};
exports.CodebaseService = CodebaseService;
exports.CodebaseService = CodebaseService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Codebase)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.TekProject)),
    __param(3, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object, typeof (_b = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _b : Object, typeof (_c = typeof gitlab_service_1.GitlabService !== "undefined" && gitlab_service_1.GitlabService) === "function" ? _c : Object, typeof (_d = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _d : Object])
], CodebaseService);


/***/ }),
/* 33 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GitlabService = void 0;
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(4);
const nest_winston_1 = __webpack_require__(5);
const rest_1 = __webpack_require__(34);
const config_2 = __webpack_require__(35);
let GitlabService = class GitlabService {
    constructor(configService, logger) {
        this.logger = logger;
        this.logger.debug('[GITLAB-SERVICE] Initializing GitLab service', 'GitlabService');
        this.gitConfig = config_2.GitConfiguration.getInstance(configService);
        const gitlabConfig = this.gitConfig.getGitLabConfig();
        this.logger.debug('[GITLAB-SERVICE] GitLab configuration loaded', 'GitlabService');
        this.logger.debug({
            url: gitlabConfig.url,
            hasToken: !!gitlabConfig.token,
            tokenLength: gitlabConfig.token?.length || 0
        }, 'GitlabService');
        if (!gitlabConfig.token) {
            this.logger.error('[GITLAB-SERVICE] GitLab token is missing from configuration', 'GitlabService');
            throw new Error('GITLAB_TOKEN is required');
        }
        this.gitlab = new rest_1.Gitlab({
            host: gitlabConfig.url,
            token: gitlabConfig.token,
        });
        this.logger.log('[GITLAB-SERVICE] GitLab service initialized successfully', {
            url: gitlabConfig.url
        });
        this.logger.log(`GitLab service initialized with URL: ${gitlabConfig.url}`);
    }
    extractProjectIdFromUrl(gitlabUrl) {
        this.logger.debug('[GITLAB-SERVICE] Extracting project ID from GitLab URL', {
            gitlabUrl
        });
        try {
            const url = new URL(gitlabUrl);
            let pathParts = url.pathname.split('/').filter(Boolean);
            this.logger.debug('[GITLAB-SERVICE] URL parsed successfully', {
                host: url.host,
                pathname: url.pathname,
                pathParts,
                pathPartsCount: pathParts.length
            });
            if (pathParts.length > 0 && pathParts[pathParts.length - 1].endsWith('.git')) {
                const originalLastPart = pathParts[pathParts.length - 1];
                pathParts[pathParts.length - 1] = pathParts[pathParts.length - 1].replace('.git', '');
                this.logger.debug('[GITLAB-SERVICE] Removed .git suffix', {
                    originalLastPart,
                    newLastPart: pathParts[pathParts.length - 1]
                });
            }
            const ignoredPrefixes = ['-', 'tree', 'blob', 'commits', 'merge_requests', 'issues'];
            const treeIndex = pathParts.findIndex(part => ignoredPrefixes.includes(part));
            this.logger.debug('[GITLAB-SERVICE] Checking for ignored prefixes', {
                ignoredPrefixes,
                treeIndex,
                foundIgnoredPrefix: treeIndex >= 0 ? pathParts[treeIndex] : null
            });
            if (treeIndex > 0) {
                const originalPathParts = [...pathParts];
                pathParts = pathParts.slice(0, treeIndex);
                this.logger.debug('[GITLAB-SERVICE] Trimmed path parts after ignored prefix', {
                    originalPathParts,
                    trimmedPathParts: pathParts,
                    removedParts: originalPathParts.slice(treeIndex)
                });
            }
            if (pathParts.length < 2) {
                this.logger.error('[GITLAB-SERVICE] Invalid GitLab URL format - insufficient path parts', {
                    pathParts,
                    pathPartsCount: pathParts.length,
                    gitlabUrl
                });
                throw new Error('Invalid GitLab URL format - must contain at least namespace/project');
            }
            const projectPath = pathParts.join('/');
            this.logger.debug('[GITLAB-SERVICE] Project ID extracted successfully', {
                projectPath,
                pathParts,
                gitlabUrl
            });
            return projectPath;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('[GITLAB-SERVICE] Failed to extract project ID from URL', {
                gitlabUrl,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
            this.logger.error(`Failed to extract project ID from URL: ${gitlabUrl}`, error);
            throw new common_1.BadRequestException(`Invalid GitLab URL format: ${gitlabUrl}`);
        }
    }
    async getRepository(projectId) {
        this.logger.debug('[GITLAB-SERVICE] Getting repository information', {
            projectId
        });
        try {
            const requestStartTime = Date.now();
            const project = await this.gitlab.Projects.show(projectId);
            const requestDuration = Date.now() - requestStartTime;
            this.logger.debug('[GITLAB-SERVICE] Repository information retrieved successfully', {
                projectId,
                projectName: project.name,
                projectPath: project.path_with_namespace,
                defaultBranch: project.default_branch,
                visibility: project.visibility,
                requestDurationMs: requestDuration
            });
            return project;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('[GITLAB-SERVICE] Failed to get repository information', {
                projectId,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
            this.logger.error(`Failed to get repository info for project ${projectId}:`, error);
            throw new common_1.BadRequestException(`Unable to access GitLab project: ${projectId}`);
        }
    }
};
exports.GitlabService = GitlabService;
exports.GitlabService = GitlabService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _a : Object, typeof (_b = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _b : Object])
], GitlabService);


/***/ }),
/* 34 */
/***/ ((module) => {

module.exports = require("@gitbeaker/rest");

/***/ }),
/* 35 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(36), exports);


/***/ }),
/* 36 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createGitConfiguration = exports.GitConfiguration = void 0;
class GitConfiguration {
    constructor(configService) {
        this.configService = configService;
    }
    static getInstance(configService) {
        if (!GitConfiguration.instance) {
            GitConfiguration.instance = new GitConfiguration(configService);
        }
        return GitConfiguration.instance;
    }
    getDefaultGitConfig() {
        return {
            username: this.configService.get('GIT_DEFAULT_USERNAME'),
            accessToken: this.configService.get('GIT_DEFAULT_ACCESS_TOKEN'),
            sshKey: this.configService.get('GIT_DEFAULT_SSH_KEY'),
        };
    }
    getGitLabConfig() {
        return {
            url: this.configService.get('GITLAB_URL', 'https://gitlab.com'),
            token: this.configService.get('GITLAB_TOKEN', ''),
            apiVersion: this.configService.get('GITLAB_API_VERSION', 'v4'),
            timeout: this.configService.get('GITLAB_TIMEOUT', 30000),
            retries: this.configService.get('GITLAB_RETRIES', 3),
            retryDelay: this.configService.get('GITLAB_RETRY_DELAY', 1000),
        };
    }
    getTimeouts() {
        return {
            cloneTimeout: this.configService.get('GIT_CLONE_TIMEOUT', 600000),
            pullTimeout: this.configService.get('GIT_PULL_TIMEOUT', 300000),
            commandTimeout: this.configService.get('GIT_COMMAND_TIMEOUT', 60000),
        };
    }
    getOptions() {
        return {
            defaultBranch: this.configService.get('GIT_DEFAULT_BRANCH', 'main'),
            maxDepth: this.configService.get('GIT_MAX_DEPTH'),
            enableSparseCheckout: this.configService.get('GIT_ENABLE_SPARSE_CHECKOUT', false),
            ignoredPatterns: this.getIgnoredPatterns(),
            ignoredDirectories: this.getIgnoredDirectories(),
        };
    }
    mergeWithDefaults(codebaseGitConfig) {
        const defaults = this.getDefaultGitConfig();
        return {
            username: codebaseGitConfig?.username || defaults.username,
            accessToken: codebaseGitConfig?.accessToken || defaults.accessToken,
            sshKey: codebaseGitConfig?.sshKey || defaults.sshKey,
        };
    }
    getIgnoredPatterns() {
        const defaultPatterns = [
            'node_modules',
            '.git',
            'dist/',
            'build/',
            '.DS_Store',
            '.env',
            '*.log'
        ];
        const customPatterns = this.configService.get('GIT_IGNORED_PATTERNS', '');
        const additionalPatterns = customPatterns ? customPatterns.split(',').map(p => p.trim()) : [];
        return [...defaultPatterns, ...additionalPatterns];
    }
    getIgnoredDirectories() {
        const defaultDirectories = [
            '.git',
            'node_modules',
            'dist',
            'build',
            '.next',
            'coverage',
            '.cache'
        ];
        const customDirectories = this.configService.get('GIT_IGNORED_DIRECTORIES', '');
        const additionalDirectories = customDirectories ? customDirectories.split(',').map(d => d.trim()) : [];
        return [...defaultDirectories, ...additionalDirectories];
    }
    validateGitConfig(gitConfig) {
        return !!(gitConfig.accessToken || gitConfig.sshKey || gitConfig.username);
    }
    shouldProcessFile(filePath) {
        const patterns = this.getIgnoredPatterns();
        const regexPatterns = patterns.map(pattern => new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.')));
        return !regexPatterns.some(pattern => pattern.test(filePath));
    }
    shouldIgnoreDirectory(dirName) {
        const ignoredDirs = this.getIgnoredDirectories();
        return ignoredDirs.includes(dirName);
    }
}
exports.GitConfiguration = GitConfiguration;
const createGitConfiguration = (configService) => {
    return GitConfiguration.getInstance(configService);
};
exports.createGitConfiguration = createGitConfiguration;


/***/ }),
/* 37 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DocumentService = void 0;
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const config_1 = __webpack_require__(4);
const nest_winston_1 = __webpack_require__(5);
const typeorm_2 = __webpack_require__(13);
const entities_1 = __webpack_require__(11);
const adapters_1 = __webpack_require__(28);
const fs = __webpack_require__(21);
const path = __webpack_require__(22);
const crypto = __webpack_require__(23);
let DocumentService = class DocumentService {
    constructor(docsBucketRepository, documentRepository, tekProjectRepository, configService, logger) {
        this.docsBucketRepository = docsBucketRepository;
        this.documentRepository = documentRepository;
        this.tekProjectRepository = tekProjectRepository;
        this.configService = configService;
        this.logger = logger;
        this.storagePath = this.configService.get('STORAGE_PATH', './storage');
    }
    async createDefaultBuckets(tekProject) {
        this.logger.debug('[DOCUMENT-SERVICE] Creating default docs buckets for project', {
            projectId: tekProject.id,
            projectName: tekProject.name,
            storagePath: this.storagePath
        });
        const buckets = adapters_1.DocumentAdapter.createDefaultDocsBuckets(tekProject, this.storagePath);
        this.logger.debug('[DOCUMENT-SERVICE] Default buckets created by adapter', {
            projectId: tekProject.id,
            bucketCount: buckets.length,
            bucketNames: buckets.map(b => b.name)
        });
        const savedBuckets = await this.docsBucketRepository.save(buckets);
        this.logger.log('[DOCUMENT-SERVICE] Default docs buckets created successfully', {
            projectId: tekProject.id,
            projectName: tekProject.name,
            bucketCount: savedBuckets.length,
            bucketIds: savedBuckets.map(b => b.id)
        });
        return savedBuckets;
    }
    async createBucket(createData) {
        this.logger.log('[DOCUMENT-SERVICE] Creating custom docs bucket', {
            bucketName: createData.name,
            projectId: createData.projectId,
            description: createData.description
        });
        this.logger.log(`Creating docs bucket: ${createData.name} for project: ${createData.projectId}`);
        this.logger.debug('[DOCUMENT-SERVICE] Finding project for bucket creation');
        const tekProject = await this.findTekProjectById(createData.projectId);
        this.logger.debug('[DOCUMENT-SERVICE] Creating bucket entity from adapter');
        const bucket = adapters_1.DocumentAdapter.fromCreateBucketData(createData, tekProject, this.storagePath);
        this.logger.debug('[DOCUMENT-SERVICE] Saving bucket to database', {
            bucketName: bucket.name,
            bucketStoragePath: bucket.storagePath,
            projectId: bucket.project.id
        });
        const savedBucket = await this.docsBucketRepository.save(bucket);
        this.logger.log('[DOCUMENT-SERVICE] Custom docs bucket created successfully', {
            bucketId: savedBucket.id,
            bucketName: savedBucket.name,
            projectId: savedBucket.project.id
        });
        return savedBucket;
    }
    async findBucketsByProjectId(projectId) {
        this.logger.debug('[DOCUMENT-SERVICE] Finding docs buckets for project', {
            projectId
        });
        const buckets = await this.docsBucketRepository.find({
            where: { project: { id: projectId }, status: entities_1.BucketStatus.ACTIVE },
            order: { createdAt: 'ASC' },
        });
        this.logger.debug('[DOCUMENT-SERVICE] Found docs buckets for project', {
            projectId,
            bucketCount: buckets.length,
            bucketIds: buckets.map(b => b.id)
        });
        return buckets;
    }
    async findBucketById(id) {
        this.logger.debug('[DOCUMENT-SERVICE] Finding docs bucket by ID', {
            bucketId: id
        });
        const bucket = await this.docsBucketRepository.findOne({
            where: { id },
            relations: ['project', 'documents'],
        });
        if (!bucket) {
            this.logger.error('[DOCUMENT-SERVICE] Docs bucket not found', {
                bucketId: id
            });
            throw new common_1.NotFoundException(`Docs bucket ${id} not found`);
        }
        this.logger.debug('[DOCUMENT-SERVICE] Docs bucket found successfully', {
            bucketId: bucket.id,
            bucketName: bucket.name,
            projectId: bucket.project.id,
            documentCount: bucket.documents?.length || 0
        });
        return bucket;
    }
    async updateBucket(id, updateData) {
        this.logger.log('[DOCUMENT-SERVICE] Updating docs bucket', {
            bucketId: id,
            updateFields: Object.keys(updateData)
        });
        const existingBucket = await this.findBucketById(id);
        this.logger.debug('[DOCUMENT-SERVICE] Creating updated bucket entity from adapter');
        const updatedBucket = adapters_1.DocumentAdapter.fromUpdateBucketData(existingBucket, updateData);
        const savedBucket = await this.docsBucketRepository.save(updatedBucket);
        this.logger.log('[DOCUMENT-SERVICE] Docs bucket updated successfully', {
            bucketId: savedBucket.id,
            bucketName: savedBucket.name
        });
        return savedBucket;
    }
    async deleteBucket(id) {
        this.logger.log('[DOCUMENT-SERVICE] Deleting (archiving) docs bucket', {
            bucketId: id
        });
        const bucket = await this.findBucketById(id);
        this.logger.debug('[DOCUMENT-SERVICE] Updating bucket status to archived', {
            bucketId: bucket.id,
            bucketName: bucket.name,
            previousStatus: bucket.status
        });
        bucket.status = entities_1.BucketStatus.ARCHIVED;
        bucket.updatedAt = new Date();
        await this.docsBucketRepository.save(bucket);
        this.logger.log('[DOCUMENT-SERVICE] Docs bucket archived successfully', {
            bucketId: id,
            bucketName: bucket.name
        });
        this.logger.log(`Docs bucket archived: ${id}`);
    }
    async uploadDocument(file, uploadData) {
        this.logger.log(`Uploading document: ${uploadData.title} to bucket: ${uploadData.bucketId}`);
        const bucket = await this.findBucketById(uploadData.bucketId);
        const fileName = `${Date.now()}-${file.originalname}`;
        const filePath = path.join(bucket.storagePath, fileName);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.buffer);
        const fileHash = this.generateFileHash(file.buffer);
        const document = adapters_1.DocumentAdapter.fromUploadData(file, uploadData, bucket, filePath, fileHash);
        return await this.documentRepository.save(document);
    }
    async findDocumentsByBucketId(bucketId, options) {
        const { page = 1, perPage = 20, sort = 'createdAt', orderBy = 'desc' } = options;
        const [documents, total] = await this.documentRepository.findAndCount({
            where: { bucket: { id: bucketId } },
            relations: ['bucket'],
            order: { [sort]: orderBy.toUpperCase() },
            skip: (page - 1) * perPage,
            take: perPage,
        });
        return {
            data: documents,
            total,
            page,
            perPage,
            totalPages: Math.ceil(total / perPage),
            hasNext: page * perPage < total,
            hasPrevious: page > 1,
        };
    }
    async findDocumentById(id) {
        const document = await this.documentRepository.findOne({
            where: { id },
            relations: ['bucket', 'bucket.project'],
        });
        if (!document) {
            throw new common_1.NotFoundException(`Document ${id} not found`);
        }
        return document;
    }
    async deleteDocument(id) {
        const document = await this.findDocumentById(id);
        try {
            await fs.unlink(document.path);
        }
        catch (error) {
            this.logger.warn(`Failed to delete file: ${document.path}`, error);
        }
        await this.documentRepository.remove(document);
        this.logger.log(`Document deleted: ${id}`);
    }
    async findTekProjectById(id) {
        const tekProject = await this.tekProjectRepository.findOne({
            where: { id },
        });
        if (!tekProject) {
            throw new common_1.NotFoundException(`TekProject ${id} not found`);
        }
        return tekProject;
    }
    generateFileHash(buffer) {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }
};
exports.DocumentService = DocumentService;
exports.DocumentService = DocumentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.DocsBucket)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.Document)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.TekProject)),
    __param(4, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object, typeof (_b = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _b : Object, typeof (_c = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _c : Object, typeof (_d = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _d : Object, typeof (_e = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _e : Object])
], DocumentService);


/***/ }),
/* 38 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TekProjectController = void 0;
const common_1 = __webpack_require__(2);
const nest_winston_1 = __webpack_require__(5);
const tekproject_service_1 = __webpack_require__(27);
const document_service_1 = __webpack_require__(37);
const dto_1 = __webpack_require__(39);
const pagination_dto_1 = __webpack_require__(47);
let TekProjectController = class TekProjectController {
    constructor(tekProjectService, documentService, logger) {
        this.tekProjectService = tekProjectService;
        this.documentService = documentService;
        this.logger = logger;
    }
    async createTekProject(createDto) {
        const requestId = Math.random().toString(36).substring(2, 8);
        this.logger.log(`[${requestId}] [CREATE-TEKPROJECT] Starting TekProject creation request`, {
            name: createDto.name,
            description: createDto.description
        });
        this.logger.log(`Creating TekProject: ${createDto.name}`);
        try {
            this.logger.debug(`[${requestId}] [CREATE-TEKPROJECT] Calling TekProject service`);
            const tekProject = await this.tekProjectService.create(createDto);
            this.logger.debug(`[${requestId}] [CREATE-TEKPROJECT] TekProject created, creating default docs buckets`, {
                tekProjectId: tekProject.id,
                tekProjectName: tekProject.name
            });
            await this.documentService.createDefaultBuckets(tekProject);
            this.logger.log(`[${requestId}] [CREATE-TEKPROJECT] TekProject creation completed successfully`, {
                tekProjectId: tekProject.id,
                tekProjectName: tekProject.name,
                slug: tekProject.slug
            });
            return {
                success: true,
                data: tekProject,
                message: 'TekProject created successfully',
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[${requestId}] [CREATE-TEKPROJECT] TekProject creation failed`, {
                name: createDto.name,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
            throw error;
        }
    }
    async listTekProjects(paginationDto) {
        const requestId = Math.random().toString(36).substring(2, 8);
        this.logger.log(`[${requestId}] [LIST-TEKPROJECTS] Starting TekProjects list request`, {
            page: paginationDto.page,
            limit: paginationDto.limit,
            sortBy: paginationDto.sortBy,
            sortOrder: paginationDto.sortOrder
        });
        const options = {
            page: paginationDto.page || 1,
            perPage: paginationDto.limit || 20,
            sort: paginationDto.sortBy || 'createdAt',
            orderBy: paginationDto.sortOrder || 'desc',
        };
        try {
            const result = await this.tekProjectService.findAll(options);
            this.logger.log(`[${requestId}] [LIST-TEKPROJECTS] TekProjects list completed successfully`, {
                totalResults: result.total,
                page: result.page,
                perPage: result.perPage,
                totalPages: result.totalPages
            });
            return {
                success: true,
                data: result,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[${requestId}] [LIST-TEKPROJECTS] TekProjects list failed`, {
                page: paginationDto.page,
                limit: paginationDto.limit,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
            throw error;
        }
    }
    async getTekProject(id) {
        const tekProject = await this.tekProjectService.findById(id);
        return {
            success: true,
            data: tekProject,
        };
    }
    async updateTekProject(id, updateDto) {
        const tekProject = await this.tekProjectService.update(id, updateDto);
        return {
            success: true,
            data: tekProject,
            message: 'TekProject updated successfully',
        };
    }
    async deleteTekProject(id) {
        await this.tekProjectService.delete(id);
        this.logger.log(`TekProject deleted: ${id}`);
    }
};
exports.TekProjectController = TekProjectController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_d = typeof dto_1.CreateTekProjectDto !== "undefined" && dto_1.CreateTekProjectDto) === "function" ? _d : Object]),
    __metadata("design:returntype", typeof (_e = typeof Promise !== "undefined" && Promise) === "function" ? _e : Object)
], TekProjectController.prototype, "createTekProject", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_f = typeof pagination_dto_1.PaginationDto !== "undefined" && pagination_dto_1.PaginationDto) === "function" ? _f : Object]),
    __metadata("design:returntype", typeof (_g = typeof Promise !== "undefined" && Promise) === "function" ? _g : Object)
], TekProjectController.prototype, "listTekProjects", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", typeof (_h = typeof Promise !== "undefined" && Promise) === "function" ? _h : Object)
], TekProjectController.prototype, "getTekProject", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, typeof (_j = typeof dto_1.UpdateTekProjectDto !== "undefined" && dto_1.UpdateTekProjectDto) === "function" ? _j : Object]),
    __metadata("design:returntype", typeof (_k = typeof Promise !== "undefined" && Promise) === "function" ? _k : Object)
], TekProjectController.prototype, "updateTekProject", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", typeof (_l = typeof Promise !== "undefined" && Promise) === "function" ? _l : Object)
], TekProjectController.prototype, "deleteTekProject", null);
exports.TekProjectController = TekProjectController = __decorate([
    (0, common_1.Controller)('tekprojects'),
    __param(2, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof tekproject_service_1.TekProjectService !== "undefined" && tekproject_service_1.TekProjectService) === "function" ? _a : Object, typeof (_b = typeof document_service_1.DocumentService !== "undefined" && document_service_1.DocumentService) === "function" ? _b : Object, typeof (_c = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _c : Object])
], TekProjectController);


/***/ }),
/* 39 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(40), exports);
__exportStar(__webpack_require__(42), exports);
__exportStar(__webpack_require__(43), exports);
__exportStar(__webpack_require__(44), exports);
__exportStar(__webpack_require__(45), exports);
__exportStar(__webpack_require__(46), exports);


/***/ }),
/* 40 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CreateTekProjectDto = void 0;
const class_validator_1 = __webpack_require__(41);
class CreateTekProjectDto {
}
exports.CreateTekProjectDto = CreateTekProjectDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTekProjectDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTekProjectDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateTekProjectDto.prototype, "techStack", void 0);


/***/ }),
/* 41 */
/***/ ((module) => {

module.exports = require("class-validator");

/***/ }),
/* 42 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UpdateTekProjectDto = void 0;
const class_validator_1 = __webpack_require__(41);
const entities_1 = __webpack_require__(11);
class UpdateTekProjectDto {
}
exports.UpdateTekProjectDto = UpdateTekProjectDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTekProjectDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTekProjectDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(entities_1.ProjectStatus),
    __metadata("design:type", typeof (_a = typeof entities_1.ProjectStatus !== "undefined" && entities_1.ProjectStatus) === "function" ? _a : Object)
], UpdateTekProjectDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateTekProjectDto.prototype, "techStack", void 0);


/***/ }),
/* 43 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CreateCodebaseDto = void 0;
const class_validator_1 = __webpack_require__(41);
class CreateCodebaseDto {
}
exports.CreateCodebaseDto = CreateCodebaseDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateCodebaseDto.prototype, "projectId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCodebaseDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCodebaseDto.prototype, "gitlabUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCodebaseDto.prototype, "branch", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['manual', 'auto', 'webhook']),
    __metadata("design:type", String)
], CreateCodebaseDto.prototype, "indexMode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCodebaseDto.prototype, "language", void 0);


/***/ }),
/* 44 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CreateDocsBucketDto = void 0;
const class_validator_1 = __webpack_require__(41);
class CreateDocsBucketDto {
}
exports.CreateDocsBucketDto = CreateDocsBucketDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateDocsBucketDto.prototype, "projectId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDocsBucketDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['API_DOCS', 'USER_FLOWS', 'SECURITY_GUIDELINES', 'ARCHITECTURE', 'DEPLOYMENT', 'OTHER']),
    __metadata("design:type", String)
], CreateDocsBucketDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDocsBucketDto.prototype, "description", void 0);


/***/ }),
/* 45 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UpdateDocsBucketDto = void 0;
const class_validator_1 = __webpack_require__(41);
class UpdateDocsBucketDto {
}
exports.UpdateDocsBucketDto = UpdateDocsBucketDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateDocsBucketDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateDocsBucketDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['ACTIVE', 'ARCHIVED']),
    __metadata("design:type", String)
], UpdateDocsBucketDto.prototype, "status", void 0);


/***/ }),
/* 46 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UploadDocumentDto = void 0;
const class_validator_1 = __webpack_require__(41);
class UploadDocumentDto {
}
exports.UploadDocumentDto = UploadDocumentDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UploadDocumentDto.prototype, "bucketId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UploadDocumentDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UploadDocumentDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['markdown', 'pdf', 'text', 'html', 'documentation', 'specification', 'guide', 'other']),
    __metadata("design:type", String)
], UploadDocumentDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UploadDocumentDto.prototype, "tags", void 0);


/***/ }),
/* 47 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PaginationDto = void 0;
const class_validator_1 = __webpack_require__(41);
const class_transformer_1 = __webpack_require__(48);
const swagger_1 = __webpack_require__(3);
class PaginationDto {
    constructor() {
        this.page = 1;
        this.limit = 20;
        this.sortOrder = 'desc';
    }
    get skip() {
        return (this.page - 1) * this.limit;
    }
}
exports.PaginationDto = PaginationDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Page number (1-based)',
        minimum: 1,
        default: 1,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], PaginationDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Number of items per page',
        minimum: 1,
        maximum: 100,
        default: 20,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], PaginationDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Field to sort by',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaginationDto.prototype, "sortBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Sort order',
        enum: ['asc', 'desc'],
        default: 'desc',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['asc', 'desc']),
    __metadata("design:type", String)
], PaginationDto.prototype, "sortOrder", void 0);


/***/ }),
/* 48 */
/***/ ((module) => {

module.exports = require("class-transformer");

/***/ }),
/* 49 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d, _e, _f, _g;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CodebaseController = void 0;
const common_1 = __webpack_require__(2);
const nest_winston_1 = __webpack_require__(5);
const codebase_service_1 = __webpack_require__(32);
const dto_1 = __webpack_require__(39);
const pagination_dto_1 = __webpack_require__(47);
let CodebaseController = class CodebaseController {
    constructor(codebaseService, logger) {
        this.codebaseService = codebaseService;
        this.logger = logger;
    }
    async createCodebase(createDto) {
        const requestId = Math.random().toString(36).substring(2, 8);
        this.logger.log(`[${requestId}] [CREATE-CODEBASE] Starting codebase creation request`, {
            name: createDto.name,
            projectId: createDto.projectId,
            gitlabUrl: createDto.gitlabUrl,
            branch: createDto.branch
        });
        this.logger.log(`Creating codebase: ${createDto.name} for TekProject: ${createDto.projectId}`);
        try {
            this.logger.debug(`[${requestId}] [CREATE-CODEBASE] Calling codebase service`);
            const codebase = await this.codebaseService.create(createDto);
            this.logger.log(`[${requestId}] [CREATE-CODEBASE] Codebase creation completed successfully`, {
                codebaseId: codebase.id,
                codebaseName: codebase.name,
                projectId: codebase.project.id,
                gitlabUrl: codebase.gitlabUrl,
                branch: codebase.branch,
                status: codebase.status
            });
            return {
                success: true,
                data: codebase,
                message: 'Codebase created successfully',
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[${requestId}] [CREATE-CODEBASE] Codebase creation failed`, {
                name: createDto.name,
                projectId: createDto.projectId,
                gitlabUrl: createDto.gitlabUrl,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
            throw error;
        }
    }
    async listCodebases(projectId, paginationDto) {
        const requestId = Math.random().toString(36).substring(2, 8);
        this.logger.log(`[${requestId}] [LIST-CODEBASES] Starting codebases list request`, {
            projectId,
            page: paginationDto.page,
            limit: paginationDto.limit,
            sortBy: paginationDto.sortBy,
            sortOrder: paginationDto.sortOrder
        });
        if (!projectId) {
            this.logger.error(`[${requestId}] [LIST-CODEBASES] Missing required projectId parameter`);
            throw new Error('projectId query parameter is required');
        }
        const options = {
            page: paginationDto.page || 1,
            perPage: paginationDto.limit || 20,
            sort: paginationDto.sortBy || 'createdAt',
            orderBy: paginationDto.sortOrder || 'desc',
        };
        try {
            const result = await this.codebaseService.findByProjectId(projectId, options);
            this.logger.log(`[${requestId}] [LIST-CODEBASES] Codebases list completed successfully`, {
                projectId,
                totalResults: result.total,
                page: result.page,
                perPage: result.perPage,
                totalPages: result.totalPages
            });
            return {
                success: true,
                data: result,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[${requestId}] [LIST-CODEBASES] Codebases list failed`, {
                projectId,
                page: paginationDto.page,
                limit: paginationDto.limit,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
            throw error;
        }
    }
    async getCodebase(id) {
        const codebase = await this.codebaseService.findById(id);
        return {
            success: true,
            data: codebase,
        };
    }
};
exports.CodebaseController = CodebaseController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_c = typeof dto_1.CreateCodebaseDto !== "undefined" && dto_1.CreateCodebaseDto) === "function" ? _c : Object]),
    __metadata("design:returntype", typeof (_d = typeof Promise !== "undefined" && Promise) === "function" ? _d : Object)
], CodebaseController.prototype, "createCodebase", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('projectId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, typeof (_e = typeof pagination_dto_1.PaginationDto !== "undefined" && pagination_dto_1.PaginationDto) === "function" ? _e : Object]),
    __metadata("design:returntype", typeof (_f = typeof Promise !== "undefined" && Promise) === "function" ? _f : Object)
], CodebaseController.prototype, "listCodebases", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", typeof (_g = typeof Promise !== "undefined" && Promise) === "function" ? _g : Object)
], CodebaseController.prototype, "getCodebase", null);
exports.CodebaseController = CodebaseController = __decorate([
    (0, common_1.Controller)('codebases'),
    __param(1, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof codebase_service_1.CodebaseService !== "undefined" && codebase_service_1.CodebaseService) === "function" ? _a : Object, typeof (_b = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _b : Object])
], CodebaseController);


/***/ }),
/* 50 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DocumentController = exports.DocsBucketController = void 0;
const common_1 = __webpack_require__(2);
const nest_winston_1 = __webpack_require__(5);
const platform_express_1 = __webpack_require__(51);
const document_service_1 = __webpack_require__(37);
const pagination_dto_1 = __webpack_require__(47);
const dto_1 = __webpack_require__(39);
let DocsBucketController = class DocsBucketController {
    constructor(documentService, logger) {
        this.documentService = documentService;
        this.logger = logger;
    }
    async createDocsBucket(createDto) {
        this.logger.log(`Creating docs bucket: ${createDto.name} for project: ${createDto.projectId}`);
        const bucket = await this.documentService.createBucket(createDto);
        return {
            success: true,
            data: bucket,
            message: 'Docs bucket created successfully',
        };
    }
    async listDocsBuckets(projectId) {
        if (!projectId) {
            throw new Error('projectId query parameter is required');
        }
        const buckets = await this.documentService.findBucketsByProjectId(projectId);
        return {
            success: true,
            data: buckets,
        };
    }
    async getDocsBucket(id) {
        const bucket = await this.documentService.findBucketById(id);
        return {
            success: true,
            data: bucket,
        };
    }
    async updateDocsBucket(id, updateDto) {
        const bucket = await this.documentService.updateBucket(id, updateDto);
        return {
            success: true,
            data: bucket,
            message: 'Docs bucket updated successfully',
        };
    }
    async deleteDocsBucket(id) {
        await this.documentService.deleteBucket(id);
        this.logger.log(`Docs bucket deleted: ${id}`);
    }
};
exports.DocsBucketController = DocsBucketController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_c = typeof dto_1.CreateDocsBucketDto !== "undefined" && dto_1.CreateDocsBucketDto) === "function" ? _c : Object]),
    __metadata("design:returntype", typeof (_d = typeof Promise !== "undefined" && Promise) === "function" ? _d : Object)
], DocsBucketController.prototype, "createDocsBucket", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", typeof (_e = typeof Promise !== "undefined" && Promise) === "function" ? _e : Object)
], DocsBucketController.prototype, "listDocsBuckets", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", typeof (_f = typeof Promise !== "undefined" && Promise) === "function" ? _f : Object)
], DocsBucketController.prototype, "getDocsBucket", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, typeof (_g = typeof dto_1.UpdateDocsBucketDto !== "undefined" && dto_1.UpdateDocsBucketDto) === "function" ? _g : Object]),
    __metadata("design:returntype", typeof (_h = typeof Promise !== "undefined" && Promise) === "function" ? _h : Object)
], DocsBucketController.prototype, "updateDocsBucket", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", typeof (_j = typeof Promise !== "undefined" && Promise) === "function" ? _j : Object)
], DocsBucketController.prototype, "deleteDocsBucket", null);
exports.DocsBucketController = DocsBucketController = __decorate([
    (0, common_1.Controller)('docsbuckets'),
    __param(1, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof document_service_1.DocumentService !== "undefined" && document_service_1.DocumentService) === "function" ? _a : Object, typeof (_b = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _b : Object])
], DocsBucketController);
let DocumentController = class DocumentController {
    constructor(documentService, logger) {
        this.documentService = documentService;
        this.logger = logger;
    }
    async uploadDocument(file, uploadDto) {
        const requestId = Math.random().toString(36).substring(2, 8);
        this.logger.log(`[${requestId}] [UPLOAD-DOCUMENT] Starting document upload request`, {
            title: uploadDto.title,
            bucketId: uploadDto.bucketId,
            fileName: file?.originalname,
            fileSize: file?.size,
            mimeType: file?.mimetype
        });
        this.logger.log(`Uploading document: ${uploadDto.title} to bucket: ${uploadDto.bucketId}`);
        try {
            this.logger.debug(`[${requestId}] [UPLOAD-DOCUMENT] Validating file upload`, {
                hasFile: !!file,
                fileName: file?.originalname,
                fileSize: file?.size,
                fileSizeMB: file?.size ? Math.round(file.size / (1024 * 1024) * 100) / 100 : 0
            });
            this.logger.debug(`[${requestId}] [UPLOAD-DOCUMENT] Calling document service`);
            const document = await this.documentService.uploadDocument(file, uploadDto);
            this.logger.log(`[${requestId}] [UPLOAD-DOCUMENT] Document upload completed successfully`, {
                documentId: document.id,
                documentTitle: document.title,
                bucketId: document.bucket.id,
                filePath: document.path,
                fileSize: document.size,
                status: document.status
            });
            return {
                success: true,
                data: document,
                message: 'Document uploaded successfully',
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[${requestId}] [UPLOAD-DOCUMENT] Document upload failed`, {
                title: uploadDto.title,
                bucketId: uploadDto.bucketId,
                fileName: file?.originalname,
                fileSize: file?.size,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
            throw error;
        }
    }
    async listDocuments(bucketId, paginationDto) {
        const requestId = Math.random().toString(36).substring(2, 8);
        this.logger.log(`[${requestId}] [LIST-DOCUMENTS] Starting documents list request`, {
            bucketId,
            page: paginationDto.page,
            limit: paginationDto.limit,
            sortBy: paginationDto.sortBy,
            sortOrder: paginationDto.sortOrder
        });
        if (!bucketId) {
            this.logger.error(`[${requestId}] [LIST-DOCUMENTS] Missing required bucketId parameter`);
            throw new common_1.BadRequestException('bucketId query parameter is required');
        }
        const options = {
            page: paginationDto.page || 1,
            perPage: paginationDto.limit || 20,
            sort: paginationDto.sortBy || 'createdAt',
            orderBy: paginationDto.sortOrder || 'desc',
        };
        try {
            const result = await this.documentService.findDocumentsByBucketId(bucketId, options);
            this.logger.log(`[${requestId}] [LIST-DOCUMENTS] Documents list completed successfully`, {
                bucketId,
                totalResults: result.total,
                page: result.page,
                perPage: result.perPage,
                totalPages: result.totalPages
            });
            return {
                success: true,
                data: result,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[${requestId}] [LIST-DOCUMENTS] Documents list failed`, {
                bucketId,
                page: paginationDto.page,
                limit: paginationDto.limit,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
            throw error;
        }
    }
    async getDocument(id) {
        const document = await this.documentService.findDocumentById(id);
        return {
            success: true,
            data: document,
        };
    }
    async deleteDocument(id) {
        await this.documentService.deleteDocument(id);
        this.logger.log(`Document deleted: ${id}`);
    }
};
exports.DocumentController = DocumentController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, typeof (_m = typeof dto_1.UploadDocumentDto !== "undefined" && dto_1.UploadDocumentDto) === "function" ? _m : Object]),
    __metadata("design:returntype", typeof (_o = typeof Promise !== "undefined" && Promise) === "function" ? _o : Object)
], DocumentController.prototype, "uploadDocument", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('bucketId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, typeof (_p = typeof pagination_dto_1.PaginationDto !== "undefined" && pagination_dto_1.PaginationDto) === "function" ? _p : Object]),
    __metadata("design:returntype", typeof (_q = typeof Promise !== "undefined" && Promise) === "function" ? _q : Object)
], DocumentController.prototype, "listDocuments", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", typeof (_r = typeof Promise !== "undefined" && Promise) === "function" ? _r : Object)
], DocumentController.prototype, "getDocument", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", typeof (_s = typeof Promise !== "undefined" && Promise) === "function" ? _s : Object)
], DocumentController.prototype, "deleteDocument", null);
exports.DocumentController = DocumentController = __decorate([
    (0, common_1.Controller)('documents'),
    __param(1, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_k = typeof document_service_1.DocumentService !== "undefined" && document_service_1.DocumentService) === "function" ? _k : Object, typeof (_l = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _l : Object])
], DocumentController);


/***/ }),
/* 51 */
/***/ ((module) => {

module.exports = require("@nestjs/platform-express");

/***/ }),
/* 52 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GitlabModule = void 0;
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(4);
const typeorm_1 = __webpack_require__(10);
const gitlab_service_1 = __webpack_require__(33);
const git_client_service_1 = __webpack_require__(53);
const entities_1 = __webpack_require__(11);
let GitlabModule = class GitlabModule {
};
exports.GitlabModule = GitlabModule;
exports.GitlabModule = GitlabModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            typeorm_1.TypeOrmModule.forFeature([entities_1.Codebase]),
        ],
        providers: [
            gitlab_service_1.GitlabService,
            git_client_service_1.GitClientService,
        ],
        exports: [
            gitlab_service_1.GitlabService,
            git_client_service_1.GitClientService,
        ],
    })
], GitlabModule);


/***/ }),
/* 53 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GitClientService = exports.DiffOptions = exports.CloneOptions = exports.GitFileChange = exports.GitCommit = void 0;
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(4);
const nest_winston_1 = __webpack_require__(5);
const child_process_1 = __webpack_require__(54);
const git_config_1 = __webpack_require__(36);
const fs = __webpack_require__(21);
const path = __webpack_require__(22);
const crypto = __webpack_require__(23);
const dto_1 = __webpack_require__(55);
Object.defineProperty(exports, "GitCommit", ({ enumerable: true, get: function () { return dto_1.GitCommit; } }));
Object.defineProperty(exports, "GitFileChange", ({ enumerable: true, get: function () { return dto_1.GitFileChange; } }));
Object.defineProperty(exports, "CloneOptions", ({ enumerable: true, get: function () { return dto_1.CloneOptions; } }));
Object.defineProperty(exports, "DiffOptions", ({ enumerable: true, get: function () { return dto_1.DiffOptions; } }));
let GitClientService = class GitClientService {
    constructor(configService, logger) {
        this.logger = logger;
        this.gitConfiguration = git_config_1.GitConfiguration.getInstance(configService);
        this.timeouts = this.gitConfiguration.getTimeouts();
    }
    async cloneRepository(gitlabUrl, localPath, options = {}) {
        this.logger.log('[GIT-CLIENT] Starting repository clone operation', {
            gitlabUrl,
            localPath,
            options: {
                depth: options.depth,
                branch: options.branch,
                hasSparseCheckout: !!(options.sparseCheckout?.length),
                sparseCheckoutCount: options.sparseCheckout?.length || 0,
                hasGitConfig: !!options.gitConfig
            }
        });
        this.logger.log(`Cloning repository ${gitlabUrl} to ${localPath}`);
        const parentDir = path.dirname(localPath);
        this.logger.debug('[GIT-CLIENT] Creating parent directory if needed', {
            parentDir,
            localPath
        });
        await fs.mkdir(parentDir, { recursive: true });
        this.logger.debug('[GIT-CLIENT] Parent directory ensured');
        const args = ['clone'];
        if (options.depth) {
            args.push('--depth', options.depth.toString());
            this.logger.debug('[GIT-CLIENT] Added depth option to clone command', {
                depth: options.depth
            });
        }
        if (options.branch) {
            args.push('--branch', options.branch);
            this.logger.debug('[GIT-CLIENT] Added branch option to clone command', {
                branch: options.branch
            });
        }
        this.logger.debug('[GIT-CLIENT] Adding authentication to URL');
        const authenticatedUrl = this.addAuthentication(gitlabUrl, options);
        args.push(authenticatedUrl, localPath);
        this.logger.debug('[GIT-CLIENT] Git clone command prepared', {
            argsCount: args.length,
            timeout: this.timeouts.cloneTimeout,
            hasAuthentication: authenticatedUrl !== gitlabUrl
        });
        const cloneStartTime = Date.now();
        await this.executeGitCommand(args, {
            timeout: this.timeouts.cloneTimeout
        });
        const cloneDuration = Date.now() - cloneStartTime;
        this.logger.debug('[GIT-CLIENT] Git clone command completed', {
            durationMs: cloneDuration,
            durationSec: Math.round(cloneDuration / 1000)
        });
        if (options.sparseCheckout && options.sparseCheckout.length > 0) {
            this.logger.debug('[GIT-CLIENT] Setting up sparse checkout', {
                sparseCheckoutPaths: options.sparseCheckout
            });
            await this.setupSparseCheckout(localPath, options.sparseCheckout);
            this.logger.debug('[GIT-CLIENT] Sparse checkout configured successfully');
        }
        this.logger.debug('[GIT-CLIENT] Getting initial commit hash');
        const initialCommit = await this.getCurrentCommit(localPath);
        this.logger.log('[GIT-CLIENT] Repository clone completed successfully', {
            gitlabUrl,
            localPath,
            initialCommit: initialCommit.substring(0, 8),
            fullCommit: initialCommit,
            cloneDurationMs: cloneDuration,
            hasSparseCheckout: !!(options.sparseCheckout?.length)
        });
        this.logger.log(`Successfully cloned repository to ${localPath}, commit: ${initialCommit}`);
        return initialCommit;
    }
    async pullRepository(localPath, options = {}) {
        this.logger.log('[GIT-CLIENT] Starting repository pull operation', {
            localPath,
            branch: options.branch,
            hasGitConfig: !!options.gitConfig
        });
        this.logger.log(`Pulling updates for repository at ${localPath}`);
        this.logger.debug('[GIT-CLIENT] Getting current commit before pull');
        const beforeCommit = await this.getCurrentCommit(localPath);
        this.logger.debug('[GIT-CLIENT] Current commit before pull', {
            beforeCommit: beforeCommit.substring(0, 8),
            fullCommit: beforeCommit
        });
        const args = ['pull', 'origin'];
        if (options.branch) {
            args.push(options.branch);
            this.logger.debug('[GIT-CLIENT] Added branch to pull command', {
                branch: options.branch
            });
        }
        this.logger.debug('[GIT-CLIENT] Git pull command prepared', {
            args,
            timeout: this.timeouts.pullTimeout,
            workingDirectory: localPath
        });
        const pullStartTime = Date.now();
        await this.executeGitCommand(args, {
            cwd: localPath,
            timeout: this.timeouts.pullTimeout
        });
        const pullDuration = Date.now() - pullStartTime;
        this.logger.debug('[GIT-CLIENT] Git pull command completed', {
            durationMs: pullDuration,
            durationSec: Math.round(pullDuration / 1000)
        });
        this.logger.debug('[GIT-CLIENT] Getting current commit after pull');
        const afterCommit = await this.getCurrentCommit(localPath);
        const hasChanges = beforeCommit !== afterCommit;
        this.logger.debug('[GIT-CLIENT] Pull operation analysis', {
            beforeCommit: beforeCommit.substring(0, 8),
            afterCommit: afterCommit.substring(0, 8),
            hasChanges,
            pullDurationMs: pullDuration
        });
        if (hasChanges) {
            this.logger.log('[GIT-CLIENT] Repository updated with new changes', {
                fromCommit: beforeCommit.substring(0, 8),
                toCommit: afterCommit.substring(0, 8),
                pullDurationMs: pullDuration
            });
            this.logger.log(`Repository updated from ${beforeCommit} to ${afterCommit}`);
        }
        else {
            this.logger.log('[GIT-CLIENT] Repository already up to date', {
                currentCommit: afterCommit.substring(0, 8),
                pullDurationMs: pullDuration
            });
            this.logger.log(`Repository already up to date at ${afterCommit}`);
        }
        return afterCommit;
    }
    async getCurrentCommit(localPath) {
        const result = await this.executeGitCommand(['rev-parse', 'HEAD'], {
            cwd: localPath,
        });
        return result.stdout.trim();
    }
    async getCommitInfo(localPath, commitHash) {
        const commit = commitHash || 'HEAD';
        const formatArgs = ['show', '--format=%H|%an|%ae|%ai|%s', '--name-status', commit];
        const result = await this.executeGitCommand(formatArgs, { cwd: localPath });
        const lines = result.stdout.split('\n').filter(line => line.trim());
        const [commitLine, ...fileLines] = lines;
        const [hash, author, email, dateStr, message] = commitLine.split('|');
        const date = new Date(dateStr);
        const files = [];
        for (const line of fileLines) {
            if (line.includes('\t')) {
                const [operation, ...pathParts] = line.split('\t');
                const filePath = pathParts.join('\t');
                const fileChange = {
                    path: filePath,
                    operation: operation,
                };
                if (operation.startsWith('R') && pathParts.length > 1) {
                    fileChange.oldPath = pathParts[0];
                    fileChange.path = pathParts[1];
                    fileChange.operation = 'R';
                }
                files.push(fileChange);
            }
        }
        return { hash, author, email, date, message, files };
    }
    async getDiff(localPath, options = {}) {
        const args = ['diff'];
        if (options.nameOnly) {
            args.push('--name-status');
        }
        if (options.fromCommit) {
            args.push(`${options.fromCommit}..HEAD`);
        }
        const result = await this.executeGitCommand(args, { cwd: localPath });
        if (!options.nameOnly) {
            return [{
                    path: 'diff.patch',
                    operation: 'M',
                }];
        }
        const files = [];
        const lines = result.stdout.split('\n').filter(line => line.trim());
        for (const line of lines) {
            if (line.includes('\t')) {
                const [operation, ...pathParts] = line.split('\t');
                const filePath = pathParts.join('\t');
                files.push({
                    path: filePath,
                    operation: operation,
                });
            }
        }
        return files;
    }
    async getCommitHistory(localPath, fromCommit, limit) {
        const args = ['log', '--format=%H|%an|%ae|%ai|%s', '--name-status'];
        if (limit) {
            args.push(`-${limit}`);
        }
        if (fromCommit) {
            args.push(`${fromCommit}..HEAD`);
        }
        const result = await this.executeGitCommand(args, { cwd: localPath });
        const commits = [];
        const lines = result.stdout.split('\n');
        let currentCommit = null;
        for (const line of lines) {
            if (!line.trim()) {
                if (currentCommit) {
                    commits.push(currentCommit);
                    currentCommit = null;
                }
                continue;
            }
            if (line.includes('|')) {
                const [hash, author, email, dateStr, message] = line.split('|');
                currentCommit = {
                    hash,
                    author,
                    email,
                    date: new Date(dateStr),
                    message,
                    files: [],
                };
            }
            else if (line.includes('\t') && currentCommit) {
                const [operation, ...pathParts] = line.split('\t');
                const filePath = pathParts.join('\t');
                currentCommit.files.push({
                    path: filePath,
                    operation: operation,
                });
            }
        }
        if (currentCommit) {
            commits.push(currentCommit);
        }
        return commits;
    }
    async getFileContent(localPath, filePath, commitHash) {
        const ref = commitHash ? `${commitHash}:${filePath}` : filePath;
        try {
            if (commitHash) {
                const result = await this.executeGitCommand(['show', ref], { cwd: localPath });
                return result.stdout;
            }
            else {
                const fullPath = path.join(localPath, filePath);
                return await fs.readFile(fullPath, 'utf-8');
            }
        }
        catch (error) {
            this.logger.error(`Failed to get content for ${filePath} at ${commitHash || 'HEAD'}:`, error);
            throw error;
        }
    }
    async isValidRepository(localPath) {
        try {
            await this.executeGitCommand(['status'], { cwd: localPath });
            return true;
        }
        catch {
            return false;
        }
    }
    async getRemoteUrl(localPath) {
        const result = await this.executeGitCommand(['remote', 'get-url', 'origin'], {
            cwd: localPath,
        });
        return result.stdout.trim();
    }
    async calculateFileHash(filePath) {
        try {
            const content = await fs.readFile(filePath);
            return crypto.createHash('sha256').update(content).digest('hex');
        }
        catch (error) {
            this.logger.error(`Failed to calculate hash for ${filePath}:`, error);
            throw error;
        }
    }
    async listFiles(localPath, patterns) {
        const args = ['ls-files'];
        if (patterns) {
            args.push(...patterns);
        }
        const result = await this.executeGitCommand(args, { cwd: localPath });
        return result.stdout
            .split('\n')
            .filter(line => line.trim())
            .map(line => line.trim());
    }
    async archiveRepository(localPath, outputPath, commitHash) {
        const args = ['archive'];
        if (commitHash) {
            args.push(commitHash);
        }
        else {
            args.push('HEAD');
        }
        args.push('--format=zip', `--output=${outputPath}`);
        await this.executeGitCommand(args, { cwd: localPath });
        this.logger.log(`Repository archived to ${outputPath}`);
    }
    async deleteRepository(localPath) {
        try {
            await fs.rm(localPath, { recursive: true, force: true });
            this.logger.log(`Deleted repository at ${localPath}`);
        }
        catch (error) {
            this.logger.error(`Failed to delete repository at ${localPath}:`, error);
            throw error;
        }
    }
    addAuthentication(gitlabUrl, options) {
        const gitConfig = this.gitConfiguration.mergeWithDefaults(options.gitConfig);
        if (gitConfig.accessToken) {
            return gitlabUrl.replace('https://', `https://oauth2:${gitConfig.accessToken}@`);
        }
        if (gitConfig.username && gitConfig.accessToken) {
            return gitlabUrl.replace('https://', `https://${gitConfig.username}:${gitConfig.accessToken}@`);
        }
        return gitlabUrl;
    }
    async setupSparseCheckout(localPath, patterns) {
        await this.executeGitCommand(['config', 'core.sparseCheckout', 'true'], {
            cwd: localPath,
        });
        const sparseCheckoutPath = path.join(localPath, '.git', 'info', 'sparse-checkout');
        await fs.writeFile(sparseCheckoutPath, patterns.join('\n') + '\n');
        await this.executeGitCommand(['read-tree', '-m', '-u', 'HEAD'], {
            cwd: localPath,
        });
    }
    async executeGitCommand(args, options = {}) {
        const commandId = Math.random().toString(36).substring(2, 8);
        const { timeout = this.timeouts.commandTimeout, ...spawnOptions } = options;
        const sanitizedArgs = args.map(arg => {
            if (arg.includes('@') && (arg.includes('http') || arg.includes('git'))) {
                return arg.replace(/:\/\/[^@]+@/, '://***:***@');
            }
            return arg;
        });
        this.logger.debug(`[GIT-CLIENT] [${commandId}] Executing git command`, {
            command: `git ${sanitizedArgs.join(' ')}`,
            timeout,
            workingDirectory: spawnOptions.cwd || process.cwd(),
            argsCount: args.length
        });
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const process = (0, child_process_1.spawn)('git', args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                ...spawnOptions,
            });
            let stdout = '';
            let stderr = '';
            let stdoutLines = 0;
            let stderrLines = 0;
            process.stdout?.on('data', (data) => {
                const chunk = data.toString();
                stdout += chunk;
                stdoutLines += (chunk.match(/\n/g) || []).length;
            });
            process.stderr?.on('data', (data) => {
                const chunk = data.toString();
                stderr += chunk;
                stderrLines += (chunk.match(/\n/g) || []).length;
            });
            const timeoutId = setTimeout(() => {
                const duration = Date.now() - startTime;
                this.logger.error(`[GIT-CLIENT] [${commandId}] Git command timed out`, {
                    command: `git ${sanitizedArgs.join(' ')}`,
                    timeout,
                    actualDuration: duration,
                    stdoutLines,
                    stderrLines,
                    workingDirectory: spawnOptions.cwd
                });
                process.kill('SIGTERM');
                reject(new Error(`Git command timed out after ${timeout}ms: git ${args.join(' ')}`));
            }, timeout);
            process.on('close', (code) => {
                clearTimeout(timeoutId);
                const duration = Date.now() - startTime;
                if (code === 0) {
                    this.logger.debug(`[GIT-CLIENT] [${commandId}] Git command completed successfully`, {
                        command: `git ${sanitizedArgs.join(' ')}`,
                        exitCode: code,
                        duration,
                        stdoutLines,
                        stderrLines,
                        stdoutLength: stdout.length,
                        stderrLength: stderr.length
                    });
                    resolve({ stdout, stderr });
                }
                else {
                    const error = new Error(`Git command failed with code ${code}: ${stderr || stdout}`);
                    this.logger.error(`[GIT-CLIENT] [${commandId}] Git command failed`, {
                        command: `git ${sanitizedArgs.join(' ')}`,
                        exitCode: code,
                        duration,
                        stdoutLines,
                        stderrLines,
                        stdoutLength: stdout.length,
                        stderrLength: stderr.length,
                        stderr: stderr.substring(0, 500) + (stderr.length > 500 ? '...' : ''),
                        stdout: stdout.substring(0, 200) + (stdout.length > 200 ? '...' : ''),
                        workingDirectory: spawnOptions.cwd
                    });
                    this.logger.error(`Git command failed: git ${args.join(' ')}`, error);
                    reject(error);
                }
            });
            process.on('error', (error) => {
                clearTimeout(timeoutId);
                const duration = Date.now() - startTime;
                this.logger.error(`[GIT-CLIENT] [${commandId}] Git command process error`, {
                    command: `git ${sanitizedArgs.join(' ')}`,
                    error: error.message,
                    duration,
                    workingDirectory: spawnOptions.cwd,
                    stack: error.stack
                });
                this.logger.error(`Git command error: git ${args.join(' ')}`, error);
                reject(error);
            });
        });
    }
};
exports.GitClientService = GitClientService;
exports.GitClientService = GitClientService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _a : Object, typeof (_b = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _b : Object])
], GitClientService);


/***/ }),
/* 54 */
/***/ ((module) => {

module.exports = require("child_process");

/***/ }),
/* 55 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DiffOptions = exports.CloneOptions = exports.GitFileChange = exports.GitCommit = void 0;
var git_commit_dto_1 = __webpack_require__(56);
Object.defineProperty(exports, "GitCommit", ({ enumerable: true, get: function () { return git_commit_dto_1.GitCommit; } }));
Object.defineProperty(exports, "GitFileChange", ({ enumerable: true, get: function () { return git_commit_dto_1.GitFileChange; } }));
var git_options_dto_1 = __webpack_require__(57);
Object.defineProperty(exports, "CloneOptions", ({ enumerable: true, get: function () { return git_options_dto_1.CloneOptions; } }));
Object.defineProperty(exports, "DiffOptions", ({ enumerable: true, get: function () { return git_options_dto_1.DiffOptions; } }));


/***/ }),
/* 56 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));


/***/ }),
/* 57 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));


/***/ }),
/* 58 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.IndexingModule = void 0;
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const entities_1 = __webpack_require__(11);
const index_job_entity_1 = __webpack_require__(18);
const job_orchestrator_service_1 = __webpack_require__(59);
const job_worker_service_1 = __webpack_require__(76);
const task_config_service_1 = __webpack_require__(62);
const docker_parser_service_1 = __webpack_require__(64);
const parser_output_transformer_service_1 = __webpack_require__(65);
const neo4j_service_1 = __webpack_require__(73);
const graph_service_1 = __webpack_require__(72);
const git_sync_task_1 = __webpack_require__(60);
const code_parsing_task_1 = __webpack_require__(63);
const graph_update_task_1 = __webpack_require__(71);
const cleanup_task_1 = __webpack_require__(75);
const indexing_controller_1 = __webpack_require__(77);
const gitlab_module_1 = __webpack_require__(52);
let IndexingModule = class IndexingModule {
};
exports.IndexingModule = IndexingModule;
exports.IndexingModule = IndexingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                entities_1.TekProject,
                entities_1.Codebase,
                index_job_entity_1.IndexJob,
            ]),
            (0, common_1.forwardRef)(() => gitlab_module_1.GitlabModule),
        ],
        controllers: [indexing_controller_1.IndexingController],
        providers: [
            job_orchestrator_service_1.JobOrchestratorService,
            job_worker_service_1.JobWorkerService,
            task_config_service_1.TaskConfigService,
            docker_parser_service_1.DockerParserService,
            parser_output_transformer_service_1.ParserOutputTransformerService,
            neo4j_service_1.Neo4jService,
            graph_service_1.GraphService,
            git_sync_task_1.GitSyncTask,
            code_parsing_task_1.CodeParsingTask,
            graph_update_task_1.GraphUpdateTask,
            cleanup_task_1.CleanupTask,
        ],
        exports: [
            job_orchestrator_service_1.JobOrchestratorService,
            job_worker_service_1.JobWorkerService,
            task_config_service_1.TaskConfigService,
        ],
    })
], IndexingModule);


/***/ }),
/* 59 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.JobOrchestratorService = void 0;
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const nest_winston_1 = __webpack_require__(5);
const typeorm_2 = __webpack_require__(13);
const config_1 = __webpack_require__(4);
const entities_1 = __webpack_require__(11);
const index_job_entity_1 = __webpack_require__(18);
const git_sync_task_1 = __webpack_require__(60);
const code_parsing_task_1 = __webpack_require__(63);
const graph_update_task_1 = __webpack_require__(71);
const cleanup_task_1 = __webpack_require__(75);
const task_config_service_1 = __webpack_require__(62);
const job_worker_service_1 = __webpack_require__(76);
const fs = __webpack_require__(21);
const path = __webpack_require__(22);
const os = __webpack_require__(70);
let JobOrchestratorService = class JobOrchestratorService {
    constructor(jobRepository, projectRepository, codebaseRepository, configService, taskConfigService, jobWorkerService, gitSyncTask, codeParsingTask, graphUpdateTask, cleanupTask, logger) {
        this.jobRepository = jobRepository;
        this.projectRepository = projectRepository;
        this.codebaseRepository = codebaseRepository;
        this.configService = configService;
        this.taskConfigService = taskConfigService;
        this.jobWorkerService = jobWorkerService;
        this.gitSyncTask = gitSyncTask;
        this.codeParsingTask = codeParsingTask;
        this.graphUpdateTask = graphUpdateTask;
        this.cleanupTask = cleanupTask;
        this.logger = logger;
        this.runningJobs = new Map();
    }
    async createJob(request) {
        this.logger.log(`[JOB-ORCHESTRATOR] Creating job: ${request.type} for project ${request.projectId}`);
        const project = await this.projectRepository.findOne({
            where: { id: request.projectId },
        });
        if (!project) {
            throw new Error(`Project ${request.projectId} not found`);
        }
        let codebase;
        if (request.codebaseId) {
            codebase = await this.codebaseRepository.findOne({
                where: { id: request.codebaseId },
                relations: ['project'],
            });
            if (!codebase) {
                throw new Error(`Codebase ${request.codebaseId} not found`);
            }
            if (codebase.project.id !== request.projectId) {
                throw new Error(`Codebase ${request.codebaseId} does not belong to project ${request.projectId}`);
            }
        }
        const job = new index_job_entity_1.IndexJob();
        job.type = request.type;
        job.status = index_job_entity_1.IndexJobStatus.PENDING;
        job.priority = request.priority || 0;
        job.description = request.description;
        job.metadata = this.createInitialMetadata(request);
        job.project = project;
        job.codebase = codebase;
        const savedJob = await this.jobRepository.save(job);
        const executionPromise = this.jobWorkerService.submitJob(savedJob.id, savedJob.type, () => this.executeJob(savedJob.id));
        this.runningJobs.set(savedJob.id, executionPromise);
        executionPromise
            .then(result => {
            this.logger.log(`[JOB-ORCHESTRATOR] Job ${savedJob.id} completed with status: ${result.status}`);
        })
            .catch(error => {
            this.logger.error(`[JOB-ORCHESTRATOR] Job ${savedJob.id} execution failed:`, error);
        })
            .finally(() => {
            this.runningJobs.delete(savedJob.id);
        });
        return savedJob;
    }
    async executeJob(jobId) {
        const startTime = Date.now();
        let tasksExecuted = 0;
        let tasksSucceeded = 0;
        let tasksFailed = 0;
        let finalError;
        try {
            const job = await this.jobRepository.findOne({
                where: { id: jobId },
                relations: ['project', 'codebase'],
            });
            if (!job) {
                throw new Error(`Job ${jobId} not found`);
            }
            this.logger.log(`Starting job execution: ${jobId}`);
            await this.updateJobStatus(job, index_job_entity_1.IndexJobStatus.RUNNING);
            const context = await this.createJobContext(job);
            const tasks = this.getTaskInstancesForJobType(job.type);
            for (let taskIndex = 0; taskIndex < tasks.length; taskIndex++) {
                const task = tasks[taskIndex];
                const taskNumber = taskIndex + 1;
                if (!task.shouldExecute(context)) {
                    this.logger.debug(`Skipping task: ${task.name} (conditions not met)`);
                    continue;
                }
                tasksExecuted++;
                this.logger.log(`Executing task ${taskNumber}/${tasks.length}: ${task.name}`);
                try {
                    job.currentTask = task.name;
                    job.progress = Math.round((tasksExecuted / tasks.length) * 100);
                    await this.jobRepository.save(job);
                    const result = await task.execute(context);
                    if (result.success) {
                        tasksSucceeded++;
                        this.logger.log(`Task completed successfully: ${task.name}`);
                    }
                    else {
                        tasksFailed++;
                        finalError = result.error;
                        this.logger.error(`Task failed: ${task.name}`, { error: result.error });
                        break;
                    }
                }
                catch (error) {
                    tasksFailed++;
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    finalError = errorMessage;
                    this.logger.error(`Task execution error: ${task.name}`, { error: errorMessage });
                    break;
                }
                finally {
                    try {
                        await task.cleanup(context);
                    }
                    catch (cleanupError) {
                        this.logger.warn(`Task cleanup failed: ${task.name}`, { error: cleanupError });
                    }
                }
            }
            const finalStatus = tasksFailed > 0 ? index_job_entity_1.IndexJobStatus.FAILED : index_job_entity_1.IndexJobStatus.COMPLETED;
            job.progress = finalStatus === index_job_entity_1.IndexJobStatus.COMPLETED ? 100 : job.progress;
            await this.updateJobStatus(job, finalStatus, finalError);
            await this.cleanupJobContext(context);
            const duration = Date.now() - startTime;
            this.logger.log(`Job ${jobId} execution completed`, {
                status: finalStatus,
                duration,
                tasksExecuted,
                tasksSucceeded,
                tasksFailed,
            });
            return {
                jobId,
                status: finalStatus,
                duration,
                tasksExecuted,
                tasksSucceeded,
                tasksFailed,
                finalError,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const duration = Date.now() - startTime;
            this.logger.error(`Job ${jobId} execution failed:`, error);
            try {
                const job = await this.jobRepository.findOne({ where: { id: jobId } });
                if (job) {
                    await this.updateJobStatus(job, index_job_entity_1.IndexJobStatus.FAILED, errorMessage);
                }
            }
            catch (updateError) {
                this.logger.error(`Failed to update job status:`, updateError);
            }
            return {
                jobId,
                status: index_job_entity_1.IndexJobStatus.FAILED,
                duration,
                tasksExecuted,
                tasksSucceeded,
                tasksFailed: tasksExecuted - tasksSucceeded,
                finalError: errorMessage,
            };
        }
    }
    async getJobStatus(jobId) {
        const job = await this.jobRepository.findOne({
            where: { id: jobId },
            relations: ['project', 'codebase'],
        });
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }
        return job;
    }
    async cancelJob(jobId) {
        const job = await this.jobRepository.findOne({
            where: { id: jobId },
        });
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }
        if (job.status === index_job_entity_1.IndexJobStatus.COMPLETED || job.status === index_job_entity_1.IndexJobStatus.FAILED) {
            throw new Error(`Cannot cancel job in status: ${job.status}`);
        }
        const cancelledFromQueue = await this.jobWorkerService.cancelQueuedJob(jobId);
        await this.updateJobStatus(job, index_job_entity_1.IndexJobStatus.CANCELLED);
        this.runningJobs.delete(jobId);
        this.logger.log(`Job ${jobId} cancelled ${cancelledFromQueue ? '(removed from queue)' : '(marked as cancelled)'}`);
    }
    async createJobContext(job) {
        const workingDirectory = path.join(os.tmpdir(), 'tekaicontextengine', 'jobs', job.id);
        const tempDirectory = path.join(workingDirectory, 'temp');
        await fs.mkdir(workingDirectory, { recursive: true });
        await fs.mkdir(tempDirectory, { recursive: true });
        const storageRoot = this.configService.get('STORAGE_ROOT', './storage');
        const codebaseStoragePath = job.codebase?.storagePath ||
            path.join(storageRoot, 'codebases', job.codebase?.id || 'unknown');
        await fs.mkdir(codebaseStoragePath, { recursive: true });
        const logger = {
            info: (message, meta) => this.logger.log(`[${job.id}] ${message}`, meta),
            warn: (message, meta) => this.logger.warn(`[${job.id}] ${message}`, meta),
            error: (message, meta) => this.logger.error(`[${job.id}] ${message}`, meta),
            debug: (message, meta) => this.logger.debug(`[${job.id}] ${message}`, meta),
        };
        const context = {
            job,
            project: job.project,
            codebase: job.codebase,
            workingDirectory,
            tempDirectory,
            codebaseStoragePath,
            data: {},
            metrics: {
                startTime: new Date(),
                taskTimes: {},
                totalFilesProcessed: 0,
                totalSymbolsExtracted: 0,
                errors: [],
                warnings: [],
            },
            logger,
        };
        return context;
    }
    async cleanupJobContext(context) {
        context.logger.debug('Job context cleanup completed');
    }
    getTaskInstancesForJobType(jobType) {
        switch (jobType) {
            case index_job_entity_1.IndexJobType.CODEBASE_FULL:
            case index_job_entity_1.IndexJobType.CODEBASE_INCR:
                return [
                    this.gitSyncTask,
                    this.codeParsingTask,
                    this.graphUpdateTask,
                    this.cleanupTask,
                ];
            case index_job_entity_1.IndexJobType.DOCS_BUCKET_FULL:
            case index_job_entity_1.IndexJobType.DOCS_BUCKET_INCR:
                return [this.cleanupTask];
            case index_job_entity_1.IndexJobType.API_ANALYSIS:
            case index_job_entity_1.IndexJobType.USERFLOW_ANALYSIS:
                return [this.cleanupTask];
            default:
                return [];
        }
    }
    async updateJobStatus(job, status, error) {
        job.status = status;
        job.updatedAt = new Date();
        if (status === index_job_entity_1.IndexJobStatus.RUNNING) {
            job.startedAt = new Date();
        }
        else if (status === index_job_entity_1.IndexJobStatus.COMPLETED || status === index_job_entity_1.IndexJobStatus.FAILED) {
            job.completedAt = new Date();
        }
        if (error) {
            job.error = error;
        }
        await this.jobRepository.save(job);
    }
    createInitialMetadata(request) {
        const metadata = {
            filesProcessed: 0,
            symbolsExtracted: 0,
            duration: 0,
            tasks: {},
            metrics: {
                languages: {},
                fileTypes: {},
                errors: [],
                warnings: [],
            },
        };
        if (request?.type === index_job_entity_1.IndexJobType.CODEBASE_INCR) {
            if (request.baseCommit) {
                metadata.baseCommit = request.baseCommit;
            }
        }
        return metadata;
    }
    getActiveJobs() {
        return Array.from(this.runningJobs.keys());
    }
    isJobActive(jobId) {
        return this.runningJobs.has(jobId);
    }
};
exports.JobOrchestratorService = JobOrchestratorService;
exports.JobOrchestratorService = JobOrchestratorService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(index_job_entity_1.IndexJob)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.TekProject)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.Codebase)),
    __param(10, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object, typeof (_b = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _b : Object, typeof (_c = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _c : Object, typeof (_d = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _d : Object, typeof (_e = typeof task_config_service_1.TaskConfigService !== "undefined" && task_config_service_1.TaskConfigService) === "function" ? _e : Object, typeof (_f = typeof job_worker_service_1.JobWorkerService !== "undefined" && job_worker_service_1.JobWorkerService) === "function" ? _f : Object, typeof (_g = typeof git_sync_task_1.GitSyncTask !== "undefined" && git_sync_task_1.GitSyncTask) === "function" ? _g : Object, typeof (_h = typeof code_parsing_task_1.CodeParsingTask !== "undefined" && code_parsing_task_1.CodeParsingTask) === "function" ? _h : Object, typeof (_j = typeof graph_update_task_1.GraphUpdateTask !== "undefined" && graph_update_task_1.GraphUpdateTask) === "function" ? _j : Object, typeof (_k = typeof cleanup_task_1.CleanupTask !== "undefined" && cleanup_task_1.CleanupTask) === "function" ? _k : Object, typeof (_l = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _l : Object])
], JobOrchestratorService);


/***/ }),
/* 60 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GitSyncTask = void 0;
const common_1 = __webpack_require__(2);
const nest_winston_1 = __webpack_require__(5);
const base_task_interface_1 = __webpack_require__(61);
const index_job_entity_1 = __webpack_require__(18);
const git_client_service_1 = __webpack_require__(53);
const task_config_service_1 = __webpack_require__(62);
let GitSyncTask = class GitSyncTask extends base_task_interface_1.BaseTask {
    constructor(gitClient, taskConfigService, logger) {
        super();
        this.gitClient = gitClient;
        this.taskConfigService = taskConfigService;
        this.logger = logger;
        this.name = 'GIT_SYNC';
        this.description = 'Synchronize Git repository and prepare workspace';
        this.requiredTasks = [];
        this.optionalTasks = [];
    }
    getConfig(context) {
        const baseConfig = this.taskConfigService.getGitSyncConfig(context.job.type);
        if (context.job.type === index_job_entity_1.IndexJobType.CODEBASE_INCR) {
            const jobMetadata = context.job.metadata;
            return {
                ...baseConfig,
                baseCommit: jobMetadata?.baseCommit || baseConfig.baseCommit,
            };
        }
        return baseConfig;
    }
    shouldExecute(context) {
        const { job, codebase } = context;
        const jobId = job.id;
        const shouldRun = !!codebase?.gitlabUrl;
        this.logger.debug(`[${jobId}] [GIT-SYNC] Checking if task should execute`, {
            codebaseId: codebase?.id,
            codebaseName: codebase?.name,
            hasGitlabUrl: !!codebase?.gitlabUrl,
            shouldExecute: shouldRun
        });
        return shouldRun;
    }
    async validate(context) {
        const { job, codebase, workingDirectory } = context;
        const jobId = job.id;
        this.logger.debug(`[${jobId}] [GIT-SYNC] Validating task prerequisites`);
        if (!codebase) {
            this.logger.error(`[${jobId}] [GIT-SYNC] Validation failed: No codebase provided`);
            throw new Error('Codebase is required for Git sync');
        }
        if (!codebase.gitlabUrl) {
            this.logger.error(`[${jobId}] [GIT-SYNC] Validation failed: No GitLab URL`, {
                codebaseId: codebase.id,
                codebaseName: codebase.name
            });
            throw new Error('GitLab URL is required for Git sync');
        }
        if (!workingDirectory) {
            this.logger.error(`[${jobId}] [GIT-SYNC] Validation failed: No working directory`);
            throw new Error('Working directory is required for Git sync');
        }
        this.logger.debug(`[${jobId}] [GIT-SYNC] Task validation completed successfully`, {
            codebaseId: codebase.id,
            codebaseName: codebase.name,
            gitlabUrl: codebase.gitlabUrl,
            branch: codebase.branch,
            workingDirectory
        });
    }
    async executeTask(context) {
        const { job, codebase, codebaseStoragePath } = context;
        const jobId = job.id;
        const config = this.getConfig(context);
        context.logger.info(`[${jobId}] [GIT-SYNC] Starting Git sync task`, {
            jobType: job.type,
            codebaseId: codebase.id,
            codebaseName: codebase.name,
            gitlabUrl: codebase.gitlabUrl,
            branch: codebase.branch,
            storagePath: codebaseStoragePath
        });
        try {
            const isValidRepo = await this.gitClient.isValidRepository(codebaseStoragePath);
            const isIncremental = job.type === index_job_entity_1.IndexJobType.CODEBASE_INCR && isValidRepo;
            context.logger.info(`[${jobId}] [GIT-SYNC] Sync mode determined`, {
                mode: isIncremental ? 'incremental' : 'full',
                existingRepoValid: isValidRepo,
                jobType: job.type
            });
            let commitHash;
            let filesChanged = [];
            let filesAdded = [];
            let filesDeleted = [];
            if (isIncremental) {
                context.logger.info(`[${jobId}] [GIT-SYNC] Starting incremental Git sync`);
                if (!isValidRepo) {
                    context.logger.warn(`[${jobId}] [GIT-SYNC] Repository doesn't exist, falling back to full clone`);
                    commitHash = await this.gitClient.cloneRepository(codebase.gitlabUrl, codebaseStoragePath, {
                        branch: codebase.branch,
                        depth: config.shallow ? 1 : undefined,
                    });
                    filesAdded = await this.gitClient.listFiles(codebaseStoragePath);
                }
                else {
                    commitHash = await this.gitClient.pullRepository(codebaseStoragePath, {
                        branch: codebase.branch,
                    });
                    const baseCommit = config.baseCommit;
                    if (baseCommit) {
                        context.logger.info(`[${jobId}] [GIT-SYNC] Analyzing changes from ${baseCommit.substring(0, 8)} to HEAD`);
                        const changes = await this.gitClient.getDiff(codebaseStoragePath, {
                            fromCommit: baseCommit,
                            nameOnly: true
                        });
                        for (const change of changes) {
                            switch (change.operation) {
                                case 'A':
                                    filesAdded.push(change.path);
                                    break;
                                case 'M':
                                    filesChanged.push(change.path);
                                    break;
                                case 'D':
                                    filesDeleted.push(change.path);
                                    break;
                            }
                        }
                    }
                    else {
                        context.logger.warn(`[${jobId}] [GIT-SYNC] No baseCommit provided for incremental sync`);
                    }
                }
            }
            else {
                context.logger.info(`[${jobId}] [GIT-SYNC] Starting full Git clone`);
                if (isValidRepo) {
                    await this.gitClient.deleteRepository(codebaseStoragePath);
                }
                commitHash = await this.gitClient.cloneRepository(codebase.gitlabUrl, codebaseStoragePath, {
                    branch: codebase.branch,
                    depth: config.shallow ? 1 : undefined,
                });
                filesAdded = await this.gitClient.listFiles(codebaseStoragePath);
            }
            context.data.GIT_SYNC = {
                clonePath: codebaseStoragePath,
                commitHash,
                filesChanged,
                filesAdded,
                filesDeleted,
            };
            const totalFiles = filesAdded.length + filesChanged.length;
            context.logger.info(`[${jobId}] [GIT-SYNC] Git sync completed successfully`, {
                mode: isIncremental ? 'incremental' : 'full',
                commitHash: commitHash.substring(0, 8),
                totalFiles,
                filesAdded: filesAdded.length,
                filesChanged: filesChanged.length,
                filesDeleted: filesDeleted.length
            });
            return {
                success: true,
                duration: 0,
                data: context.data.GIT_SYNC,
                metrics: {
                    filesProcessed: totalFiles,
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[${jobId}] [GIT-SYNC] Task failed with error`, {
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
            });
            return {
                success: false,
                duration: 0,
                error: errorMessage,
            };
        }
    }
    async cleanup(context) {
        const { job } = context;
        const jobId = job.id;
        this.logger.debug(`[${jobId}] [GIT-SYNC] Starting task cleanup`);
        this.logger.debug(`[${jobId}] [GIT-SYNC] Task cleanup completed`);
    }
    getEstimatedDuration(context) {
        const { job } = context;
        const isIncremental = job.type === index_job_entity_1.IndexJobType.CODEBASE_INCR;
        const baseTime = 120000;
        return isIncremental ? baseTime * 0.3 : baseTime;
    }
};
exports.GitSyncTask = GitSyncTask;
exports.GitSyncTask = GitSyncTask = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof git_client_service_1.GitClientService !== "undefined" && git_client_service_1.GitClientService) === "function" ? _a : Object, typeof (_b = typeof task_config_service_1.TaskConfigService !== "undefined" && task_config_service_1.TaskConfigService) === "function" ? _b : Object, typeof (_c = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _c : Object])
], GitSyncTask);


/***/ }),
/* 61 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BaseTask = exports.TaskStatus = void 0;
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["PENDING"] = "PENDING";
    TaskStatus["RUNNING"] = "RUNNING";
    TaskStatus["COMPLETED"] = "COMPLETED";
    TaskStatus["FAILED"] = "FAILED";
    TaskStatus["SKIPPED"] = "SKIPPED";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
class BaseTask {
    constructor() {
        this.status = TaskStatus.PENDING;
    }
    shouldExecute(_context) {
        return true;
    }
    async validate(context) {
        for (const requiredTask of this.requiredTasks) {
            if (!context.data[requiredTask]) {
                throw new Error(`Required task '${requiredTask}' not completed before ${this.name}`);
            }
        }
    }
    async execute(context) {
        this.status = TaskStatus.RUNNING;
        this.startTime = new Date();
        try {
            context.logger.info(`Starting task: ${this.name}`);
            context.metrics.taskTimes[this.name] = { start: this.startTime };
            await this.validate(context);
            const result = await this.executeTask(context);
            this.endTime = new Date();
            this.status = result.success ? TaskStatus.COMPLETED : TaskStatus.FAILED;
            const duration = this.endTime.getTime() - this.startTime.getTime();
            context.metrics.taskTimes[this.name].end = this.endTime;
            context.metrics.taskTimes[this.name].duration = duration;
            if (result.success) {
                context.logger.info(`Task completed: ${this.name}`, { duration });
            }
            else {
                context.logger.error(`Task failed: ${this.name}`, { error: result.error, duration });
                context.metrics.errors.push({
                    task: this.name,
                    error: result.error || 'Unknown error',
                    timestamp: new Date(),
                });
            }
            return {
                ...result,
                duration,
            };
        }
        catch (error) {
            this.endTime = new Date();
            this.status = TaskStatus.FAILED;
            const duration = this.endTime.getTime() - this.startTime.getTime();
            context.metrics.taskTimes[this.name].end = this.endTime;
            context.metrics.taskTimes[this.name].duration = duration;
            context.logger.error(`Task error: ${this.name}`, { error: error.message, duration });
            context.metrics.errors.push({
                task: this.name,
                error: error.message,
                timestamp: new Date(),
            });
            return {
                success: false,
                duration,
                error: error.message,
            };
        }
    }
    async cleanup(context) {
        context.logger.debug(`Cleanup completed for task: ${this.name}`);
    }
    getEstimatedDuration(_context) {
        return 30000;
    }
    getStatus() {
        return this.status;
    }
    getDuration() {
        if (this.startTime && this.endTime) {
            return this.endTime.getTime() - this.startTime.getTime();
        }
        return null;
    }
}
exports.BaseTask = BaseTask;


/***/ }),
/* 62 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TaskConfigService = void 0;
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(4);
const index_job_entity_1 = __webpack_require__(18);
let TaskConfigService = class TaskConfigService {
    constructor(configService) {
        this.configService = configService;
    }
    getTaskConfig(taskName, jobType, customConfig) {
        const baseConfig = this.getBaseTaskConfig(taskName, jobType);
        if (customConfig) {
            return this.deepMerge(baseConfig, customConfig);
        }
        return baseConfig;
    }
    getGitSyncConfig(jobType, customConfig) {
        const baseConfig = {
            enabled: true,
            timeout: this.configService.get('GIT_SYNC_TIMEOUT', 300000),
            retries: this.configService.get('GIT_SYNC_RETRIES', 3),
            baseCommit: undefined,
            targetCommit: undefined,
            incrementalMode: jobType === index_job_entity_1.IndexJobType.CODEBASE_INCR,
            includeDeleted: this.configService.get('GIT_SYNC_INCLUDE_DELETED', true),
            maxFileSize: this.configService.get('GIT_SYNC_MAX_FILE_SIZE', 50 * 1024 * 1024),
            excludePatterns: this.configService.get('GIT_SYNC_EXCLUDE_PATTERNS', [
                'node_modules/**',
                '.git/**',
                'dist/**',
                'build/**',
                '*.log',
                '*.tmp',
                '.idea/**',
                '.vscode/**',
                '__pycache__/**',
                '*.pyc',
                'target/**',
            ]),
            shallow: false,
        };
        return customConfig ? this.deepMerge(baseConfig, customConfig) : baseConfig;
    }
    getCodeParsingConfig(_jobType, customConfig) {
        const baseConfig = {
            enabled: true,
            timeout: this.configService.get('CODE_PARSING_TIMEOUT', 600000),
            retries: this.configService.get('CODE_PARSING_RETRIES', 2),
            languages: {
                java: {
                    enabled: this.configService.get('PARSING_JAVA_ENABLED', true),
                    dockerImage: this.configService.get('DOCKER_IMAGE_JAVA', 'tekai/java-parser:latest'),
                    options: this.configService.get('PARSING_JAVA_JVM_OPTIONS', ['-Xmx1g', '-XX:+UseG1GC']),
                },
                typescript: {
                    enabled: this.configService.get('PARSING_TS_ENABLED', true),
                    dockerImage: this.configService.get('DOCKER_IMAGE_TS', 'tekai/ts-parser:latest'),
                    options: this.configService.get('PARSING_TS_NODE_OPTIONS', ['--max-old-space-size=2048']),
                },
            },
            outputFormat: this.configService.get('PARSING_OUTPUT_FORMAT', 'json'),
            maxFileSize: this.configService.get('PARSING_MAX_FILE_SIZE', 10 * 1024 * 1024),
        };
        return customConfig ? this.deepMerge(baseConfig, customConfig) : baseConfig;
    }
    getGraphUpdateConfig(_jobType, customConfig) {
        const baseConfig = {
            enabled: true,
            timeout: this.configService.get('GRAPH_UPDATE_TIMEOUT', 900000),
            retries: this.configService.get('GRAPH_UPDATE_RETRIES', 2),
            url: this.configService.get('NEO4J_URL', 'bolt://localhost:7687'),
            username: this.configService.get('NEO4J_USERNAME', 'neo4j'),
            password: this.configService.get('NEO4J_PASSWORD', 'password'),
            database: this.configService.get('NEO4J_DATABASE', 'neo4j'),
            batchSize: this.configService.get('NEO4J_BATCH_SIZE', 100),
            enableVectorIndex: this.configService.get('NEO4J_VECTOR_INDEX', true),
            vectorDimensions: this.configService.get('NEO4J_VECTOR_DIMENSIONS', 768),
            indexingMode: this.configService.get('NEO4J_INDEXING_MODE', 'sync'),
        };
        return customConfig ? this.deepMerge(baseConfig, customConfig) : baseConfig;
    }
    getDocProcessingConfig(_jobType, customConfig) {
        const baseConfig = {
            enabled: true,
            timeout: this.configService.get('DOC_PROCESSING_TIMEOUT', 600000),
            retries: this.configService.get('DOC_PROCESSING_RETRIES', 2),
            supportedFormats: this.configService.get('DOC_SUPPORTED_FORMATS', [
                '.md', '.txt', '.pdf', '.doc', '.docx', '.html', '.rst'
            ]),
            extractText: this.configService.get('DOC_EXTRACT_TEXT', true),
            extractMetadata: this.configService.get('DOC_EXTRACT_METADATA', true),
            chunkSize: this.configService.get('DOC_CHUNK_SIZE', 1000),
        };
        return customConfig ? this.deepMerge(baseConfig, customConfig) : baseConfig;
    }
    getAnalysisConfig(jobType, customConfig) {
        const analysisType = jobType === index_job_entity_1.IndexJobType.API_ANALYSIS ? 'api' : 'userflow';
        const baseConfig = {
            enabled: true,
            timeout: this.configService.get('ANALYSIS_TIMEOUT', 1800000),
            retries: this.configService.get('ANALYSIS_RETRIES', 1),
            analysisType: analysisType,
            depth: this.configService.get('ANALYSIS_DEPTH', 3),
            includeExternal: this.configService.get('ANALYSIS_INCLUDE_EXTERNAL', false),
        };
        return customConfig ? this.deepMerge(baseConfig, customConfig) : baseConfig;
    }
    getBaseTaskConfig(taskName, _jobType) {
        const envPrefix = `${taskName.toUpperCase()}_`;
        return {
            enabled: this.configService.get(`${envPrefix}ENABLED`, true),
            timeout: this.configService.get(`${envPrefix}TIMEOUT`, 300000),
            retries: this.configService.get(`${envPrefix}RETRIES`, 2),
        };
    }
    validateTaskConfig(taskName, config) {
        const errors = [];
        if (config.timeout && config.timeout <= 0) {
            errors.push(`${taskName}: timeout must be positive`);
        }
        if (config.retries && config.retries < 0) {
            errors.push(`${taskName}: retries cannot be negative`);
        }
        if (taskName === 'GIT_SYNC') {
            const gitConfig = config;
            if (gitConfig.maxFileSize <= 0) {
                errors.push('GIT_SYNC: maxFileSize must be positive');
            }
        }
        if (taskName === 'GRAPH_UPDATE') {
            const graphConfig = config;
            try {
                new URL(graphConfig.url);
            }
            catch {
                errors.push('GRAPH_UPDATE: url must be a valid URL');
            }
            if (!graphConfig.username || !graphConfig.password) {
                errors.push('GRAPH_UPDATE: username and password are required');
            }
        }
        return errors;
    }
    deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            }
            else {
                result[key] = source[key];
            }
        }
        return result;
    }
};
exports.TaskConfigService = TaskConfigService;
exports.TaskConfigService = TaskConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _a : Object])
], TaskConfigService);


/***/ }),
/* 63 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CodeParsingTask = void 0;
const common_1 = __webpack_require__(2);
const nest_winston_1 = __webpack_require__(5);
const base_task_interface_1 = __webpack_require__(61);
const task_config_service_1 = __webpack_require__(62);
const docker_parser_service_1 = __webpack_require__(64);
const parser_output_transformer_service_1 = __webpack_require__(65);
const fs = __webpack_require__(21);
const path = __webpack_require__(22);
const os = __webpack_require__(70);
let CodeParsingTask = class CodeParsingTask extends base_task_interface_1.BaseTask {
    constructor(taskConfigService, dockerParserService, parserTransformerService, logger) {
        super();
        this.taskConfigService = taskConfigService;
        this.dockerParserService = dockerParserService;
        this.parserTransformerService = parserTransformerService;
        this.logger = logger;
        this.name = 'CODE_PARSING';
        this.description = 'Parse source code and extract symbols';
        this.requiredTasks = ['GIT_SYNC'];
        this.optionalTasks = [];
    }
    getConfig(context) {
        return this.taskConfigService.getCodeParsingConfig(context.job.type);
    }
    shouldExecute(context) {
        const { job, data } = context;
        const jobId = job.id;
        const hasFilesToProcess = !!(data.GIT_SYNC?.filesAdded?.length || data.GIT_SYNC?.filesChanged?.length);
        this.logger.debug(`[${jobId}] [CODE-PARSING] Checking if task should execute`, {
            hasGitSyncData: !!data.GIT_SYNC,
            filesAdded: data.GIT_SYNC?.filesAdded?.length || 0,
            filesChanged: data.GIT_SYNC?.filesChanged?.length || 0,
            shouldExecute: hasFilesToProcess
        });
        return hasFilesToProcess;
    }
    async validate(context) {
        const { job, data } = context;
        const jobId = job.id;
        this.logger.debug(`[${jobId}] [CODE-PARSING] Validating task prerequisites`);
        if (!data.GIT_SYNC) {
            throw new Error('Git sync data is required for code parsing');
        }
        if (!data.GIT_SYNC.clonePath) {
            throw new Error('Clone path is required for code parsing');
        }
        try {
            await fs.access(data.GIT_SYNC.clonePath);
        }
        catch (error) {
            throw new Error(`Clone path does not exist: ${data.GIT_SYNC.clonePath}`);
        }
        this.logger.debug(`[${jobId}] [CODE-PARSING] Task validation completed successfully`);
    }
    async executeTask(context) {
        const { job, data } = context;
        const jobId = job.id;
        const config = this.getConfig(context);
        const gitSyncData = data.GIT_SYNC;
        context.logger.info(`[${jobId}] [CODE-PARSING] Starting code parsing task`);
        try {
            const filesToProcess = [
                ...(gitSyncData.filesAdded || []),
                ...(gitSyncData.filesChanged || [])
            ];
            let totalSymbolsExtracted = 0;
            let totalFilesProcessed = 0;
            const languageStats = {};
            const parsingResults = [];
            const filesByLanguage = this.groupFilesByLanguage(filesToProcess);
            for (const [language, files] of Object.entries(filesByLanguage)) {
                if (!config.languages[language]?.enabled) {
                    context.logger.debug(`[${jobId}] [CODE-PARSING] Skipping disabled language: ${language}`);
                    continue;
                }
                context.logger.info(`[${jobId}] [CODE-PARSING] Processing ${files.length} ${language} files`);
                try {
                    const languageResult = await this.parseLanguageFiles(language, files, gitSyncData.clonePath, config, context);
                    totalSymbolsExtracted += languageResult.symbolsExtracted;
                    totalFilesProcessed += languageResult.filesProcessed;
                    languageStats[language] = languageResult.filesProcessed;
                    parsingResults.push(languageResult.results);
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    context.logger.error(`[${jobId}] [CODE-PARSING] Failed to parse ${language} files`, {
                        error: errorMessage,
                        fileCount: files.length
                    });
                }
            }
            context.data.CODE_PARSING = {
                symbolsExtracted: totalSymbolsExtracted,
                filesProcessed: totalFilesProcessed,
                parsingResults,
                languages: languageStats,
            };
            context.logger.info(`[${jobId}] [CODE-PARSING] Code parsing completed successfully`, {
                totalFilesProcessed,
                totalSymbolsExtracted,
                languagesProcessed: Object.keys(languageStats).length
            });
            return {
                success: true,
                duration: 0,
                data: context.data.CODE_PARSING,
                metrics: {
                    filesProcessed: totalFilesProcessed,
                    symbolsExtracted: totalSymbolsExtracted,
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[${jobId}] [CODE-PARSING] Task failed with error`, {
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
            });
            return {
                success: false,
                duration: 0,
                error: errorMessage,
            };
        }
    }
    groupFilesByLanguage(files) {
        const filesByLanguage = {};
        for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            let language = 'unknown';
            switch (ext) {
                case '.java':
                    language = 'java';
                    break;
                case '.ts':
                case '.tsx':
                case '.js':
                case '.jsx':
                    language = 'typescript';
                    break;
                case '.py':
                    language = 'python';
                    break;
                case '.go':
                    language = 'go';
                    break;
                case '.rs':
                    language = 'rust';
                    break;
                default:
                    continue;
            }
            if (!filesByLanguage[language]) {
                filesByLanguage[language] = [];
            }
            filesByLanguage[language].push(file);
        }
        return filesByLanguage;
    }
    async parseLanguageFiles(language, files, basePath, config, context) {
        const jobId = context.job.id;
        const languageConfig = config.languages[language];
        context.logger.info(`[${jobId}] [CODE-PARSING] Starting Docker-based parsing for ${language}`, {
            fileCount: files.length,
            dockerImage: languageConfig.dockerImage,
            options: languageConfig.options
        });
        try {
            const imageAvailable = await this.dockerParserService.ensureDockerImage(languageConfig.dockerImage);
            if (!imageAvailable) {
                throw new Error(`Docker image not available: ${languageConfig.dockerImage}`);
            }
            const outputPath = path.join(os.tmpdir(), `parser-output-${jobId}-${language}-${Date.now()}.json`);
            const parserResult = await this.dockerParserService.executeParser({
                dockerImage: languageConfig.dockerImage,
                sourcePath: basePath,
                outputPath,
                options: languageConfig.options,
                timeout: config.timeout
            });
            if (!parserResult.success) {
                throw new Error(`Parser execution failed: ${parserResult.error}`);
            }
            const standardizedOutput = this.parserTransformerService.transformParserOutput(parserResult.output, language);
            context.logger.info(`[${jobId}] [CODE-PARSING] Successfully parsed ${language} files`, {
                filesProcessed: standardizedOutput.metadata.totalFiles,
                symbolsExtracted: standardizedOutput.metadata.totalSymbols,
                duration: parserResult.duration
            });
            return {
                symbolsExtracted: standardizedOutput.metadata.totalSymbols,
                filesProcessed: standardizedOutput.metadata.totalFiles,
                results: standardizedOutput,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            context.logger.error(`[${jobId}] [CODE-PARSING] Failed to parse ${language} files`, {
                error: errorMessage,
                fileCount: files.length
            });
            throw error;
        }
    }
    async cleanup(context) {
        const { job } = context;
        const jobId = job.id;
        this.logger.debug(`[${jobId}] [CODE-PARSING] Starting task cleanup`);
        this.logger.debug(`[${jobId}] [CODE-PARSING] Task cleanup completed`);
    }
    getEstimatedDuration(context) {
        const gitSyncData = context.data.GIT_SYNC;
        const fileCount = (gitSyncData?.filesAdded?.length || 0) + (gitSyncData?.filesChanged?.length || 0);
        const baseTime = 60000;
        const timePerFile = 1000;
        return baseTime + (fileCount * timePerFile);
    }
};
exports.CodeParsingTask = CodeParsingTask;
exports.CodeParsingTask = CodeParsingTask = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof task_config_service_1.TaskConfigService !== "undefined" && task_config_service_1.TaskConfigService) === "function" ? _a : Object, typeof (_b = typeof docker_parser_service_1.DockerParserService !== "undefined" && docker_parser_service_1.DockerParserService) === "function" ? _b : Object, typeof (_c = typeof parser_output_transformer_service_1.ParserOutputTransformerService !== "undefined" && parser_output_transformer_service_1.ParserOutputTransformerService) === "function" ? _c : Object, typeof (_d = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _d : Object])
], CodeParsingTask);


/***/ }),
/* 64 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DockerParserService = void 0;
const common_1 = __webpack_require__(2);
const nest_winston_1 = __webpack_require__(5);
const child_process_1 = __webpack_require__(54);
const fs = __webpack_require__(21);
const path = __webpack_require__(22);
let DockerParserService = class DockerParserService {
    constructor(logger) {
        this.logger = logger;
    }
    async executeParser(options) {
        const startTime = Date.now();
        const { dockerImage, sourcePath, outputPath, options: dockerOptions = [], timeout = 600000 } = options;
        const containerName = `java-parser-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        this.logger.debug(`[DOCKER-PARSER] Starting parser execution`, {
            dockerImage,
            sourcePath,
            outputPath,
            options: dockerOptions
        });
        try {
            const outputDir = path.dirname(outputPath);
            await fs.mkdir(outputDir, { recursive: true });
            try {
                await fs.chmod(outputDir, 0o777);
                this.logger.debug(`[DOCKER-PARSER] Set permissions 777 on output directory: ${outputDir}`);
            }
            catch (chmodError) {
                this.logger.warn(`[DOCKER-PARSER] Could not set permissions on output directory: ${chmodError}`);
            }
            const tempOutputFile = path.join(outputDir, `temp-${Date.now()}.json`);
            try {
                await fs.writeFile(tempOutputFile, '{}');
                await fs.chmod(tempOutputFile, 0o666);
                await fs.unlink(tempOutputFile);
                this.logger.debug(`[DOCKER-PARSER] Verified write permissions in output directory`);
            }
            catch (permError) {
                this.logger.warn(`[DOCKER-PARSER] Could not verify write permissions: ${permError}`);
            }
            const absoluteSourcePath = path.resolve(sourcePath);
            const absoluteOutputDir = path.resolve(outputDir);
            this.logger.debug(`[DOCKER-PARSER] Resolved paths for Docker volumes`, {
                sourcePath,
                absoluteSourcePath,
                outputDir,
                absoluteOutputDir
            });
            const containerOutputPath = `/tmp/parser-output.json`;
            const dockerArgs = [
                'run',
                '--name', containerName,
                '-v', `${absoluteSourcePath}:/workspace:ro`,
            ];
            if (dockerOptions && dockerOptions.length > 0) {
                const javaOpts = dockerOptions.join(' ');
                dockerArgs.push('-e', `JAVA_OPTS=${javaOpts}`);
                this.logger.debug(`[DOCKER-PARSER] Setting JAVA_OPTS environment variable`, {
                    javaOpts
                });
            }
            dockerArgs.push(dockerImage);
            const codebaseName = path.basename(sourcePath) || 'codebase';
            dockerArgs.push(codebaseName, '/workspace', containerOutputPath);
            this.logger.debug(`[DOCKER-PARSER] Executing Docker command`, {
                command: 'docker',
                args: dockerArgs
            });
            const result = await this.executeDockerCommand(dockerArgs, timeout);
            if (!result.success) {
                return {
                    success: false,
                    error: result.error,
                    duration: Date.now() - startTime
                };
            }
            this.logger.debug(`[DOCKER-PARSER] Copying output file from container`, {
                containerName,
                containerOutputPath,
                outputPath
            });
            const copyResult = await this.copyFileFromContainer(containerName, containerOutputPath, outputPath);
            if (!copyResult.success) {
                return {
                    success: false,
                    error: `Failed to copy output file from container: ${copyResult.error}`,
                    duration: Date.now() - startTime
                };
            }
            const output = await this.readParserOutput(outputPath);
            this.logger.log(`[DOCKER-PARSER] Parser execution completed successfully`, {
                dockerImage,
                duration: Date.now() - startTime,
                outputSize: JSON.stringify(output).length
            });
            return {
                success: true,
                output,
                duration: Date.now() - startTime
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[DOCKER-PARSER] Parser execution failed`, {
                dockerImage,
                error: errorMessage,
                duration: Date.now() - startTime
            });
            return {
                success: false,
                error: errorMessage,
                duration: Date.now() - startTime
            };
        }
        finally {
            try {
                await this.removeContainer(containerName);
            }
            catch (cleanupError) {
                this.logger.warn(`[DOCKER-PARSER] Failed to clean up container ${containerName}`, {
                    error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
                });
            }
        }
    }
    executeDockerCommand(args, timeout) {
        return new Promise((resolve) => {
            const process = (0, child_process_1.spawn)('docker', args, {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            let stdout = '';
            let stderr = '';
            let isResolved = false;
            const timeoutId = setTimeout(() => {
                if (!isResolved) {
                    isResolved = true;
                    process.kill('SIGKILL');
                    resolve({
                        success: false,
                        error: `Docker execution timed out after ${timeout}ms`,
                        stdout,
                        stderr
                    });
                }
            }, timeout);
            process.stdout?.on('data', (data) => {
                stdout += data.toString();
            });
            process.stderr?.on('data', (data) => {
                stderr += data.toString();
            });
            process.on('close', (code) => {
                if (!isResolved) {
                    isResolved = true;
                    clearTimeout(timeoutId);
                    if (code === 0) {
                        resolve({
                            success: true,
                            stdout,
                            stderr
                        });
                    }
                    else {
                        resolve({
                            success: false,
                            error: `Docker process exited with code ${code}. stderr: ${stderr}`,
                            stdout,
                            stderr
                        });
                    }
                }
            });
            process.on('error', (error) => {
                if (!isResolved) {
                    isResolved = true;
                    clearTimeout(timeoutId);
                    resolve({
                        success: false,
                        error: `Failed to start Docker process: ${error.message}`,
                        stdout,
                        stderr
                    });
                }
            });
        });
    }
    async readParserOutput(outputPath) {
        try {
            await fs.access(outputPath);
            const content = await fs.readFile(outputPath, 'utf-8');
            const parsed = JSON.parse(content);
            this.logger.log(`[DOCKER-PARSER] Raw parser output structure:`, {
                topLevelKeys: Object.keys(parsed),
                hasFiles: !!parsed.files,
                filesIsArray: Array.isArray(parsed.files),
                filesCount: parsed.files?.length || 0,
                sampleFile: parsed.files?.[0] ? {
                    path: parsed.files[0].path,
                    topLevelKeys: Object.keys(parsed.files[0]),
                    hasClasses: !!parsed.files[0].classes,
                    classesCount: parsed.files[0].classes?.length || 0,
                    hasSymbols: !!parsed.files[0].symbols,
                    symbolsCount: parsed.files[0].symbols?.length || 0
                } : 'No files'
            });
            await fs.unlink(outputPath).catch(() => {
            });
            return parsed;
        }
        catch (error) {
            throw new Error(`Failed to read parser output from ${outputPath}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async checkDockerAvailability() {
        try {
            const result = await this.executeDockerCommand(['--version'], 5000);
            return result.success;
        }
        catch {
            return false;
        }
    }
    async ensureDockerImage(imageName) {
        try {
            this.logger.debug(`[DOCKER-PARSER] Checking Docker image availability: ${imageName}`);
            const inspectResult = await this.executeDockerCommand(['image', 'inspect', imageName], 10000);
            this.logger.debug(`[DOCKER-PARSER] Image inspect result for ${imageName}:`, {
                success: inspectResult.success,
                error: inspectResult.error
            });
            if (inspectResult.success) {
                this.logger.log(`[DOCKER-PARSER] Docker image found locally: ${imageName}`);
                return true;
            }
            this.logger.debug(`[DOCKER-PARSER] Trying fallback method to check local images`);
            const imagesResult = await this.executeDockerCommand(['images', '--format', 'table {{.Repository}}:{{.Tag}}'], 10000);
            if (imagesResult.success) {
                const isLocallyAvailable = await this.checkImageInLocalList(imageName);
                if (isLocallyAvailable) {
                    this.logger.log(`[DOCKER-PARSER] Docker image found locally via fallback method: ${imageName}`);
                    return true;
                }
            }
            this.logger.log(`[DOCKER-PARSER] Image not found locally, attempting to pull: ${imageName}`);
            const pullResult = await this.executeDockerCommand(['pull', imageName], 300000);
            if (pullResult.success) {
                this.logger.log(`[DOCKER-PARSER] Successfully pulled Docker image: ${imageName}`);
                return true;
            }
            else {
                this.logger.error(`[DOCKER-PARSER] Failed to pull Docker image: ${imageName}`, {
                    error: pullResult.error
                });
                this.logger.debug(`[DOCKER-PARSER] Attempting final fallback check for: ${imageName}`);
                const finalCheck = await this.testImageUsability(imageName);
                if (finalCheck) {
                    this.logger.log(`[DOCKER-PARSER] Image is usable despite previous failures: ${imageName}`);
                    return true;
                }
                return false;
            }
        }
        catch (error) {
            this.logger.error(`[DOCKER-PARSER] Error checking/pulling Docker image: ${imageName}`, {
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }
    async checkImageInLocalList(imageName) {
        try {
            const result = await this.executeDockerCommand(['images', '--format', '{{.Repository}}:{{.Tag}}'], 10000);
            if (!result.success || !result.stdout) {
                this.logger.debug(`[DOCKER-PARSER] Failed to get local images list`, {
                    success: result.success,
                    error: result.error
                });
                return false;
            }
            const imageLines = result.stdout.trim().split('\n');
            const isFound = imageLines.some(line => line.trim() === imageName);
            this.logger.debug(`[DOCKER-PARSER] Local images check for ${imageName}:`, {
                found: isFound,
                totalImages: imageLines.length,
                searchedImage: imageName
            });
            return isFound;
        }
        catch (error) {
            this.logger.debug(`[DOCKER-PARSER] Error checking local image list:`, {
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }
    async testImageUsability(imageName) {
        try {
            this.logger.debug(`[DOCKER-PARSER] Testing image usability: ${imageName}`);
            const testResult = await this.executeDockerCommand([
                'run', '--rm', '--entrypoint', 'echo', imageName, 'test'
            ], 30000);
            if (testResult.success) {
                this.logger.debug(`[DOCKER-PARSER] Image usability test passed: ${imageName}`);
                return true;
            }
            else {
                this.logger.debug(`[DOCKER-PARSER] Image usability test failed: ${imageName}`, {
                    error: testResult.error
                });
                return false;
            }
        }
        catch (error) {
            this.logger.debug(`[DOCKER-PARSER] Error testing image usability:`, {
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }
    async copyFileFromContainer(containerName, containerPath, hostPath) {
        return new Promise((resolve) => {
            const process = (0, child_process_1.spawn)('docker', ['cp', `${containerName}:${containerPath}`, hostPath], {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            let stderr = '';
            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            process.on('close', (code) => {
                if (code === 0) {
                    resolve({ success: true });
                }
                else {
                    resolve({
                        success: false,
                        error: `Docker cp failed with exit code ${code}. stderr: ${stderr}`
                    });
                }
            });
            process.on('error', (error) => {
                resolve({
                    success: false,
                    error: `Failed to execute docker cp: ${error.message}`
                });
            });
        });
    }
    async removeContainer(containerName) {
        return new Promise((resolve, reject) => {
            const process = (0, child_process_1.spawn)('docker', ['rm', '-f', containerName], {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            process.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error(`Failed to remove container ${containerName}, exit code: ${code}`));
                }
            });
            process.on('error', (error) => {
                reject(new Error(`Failed to execute docker rm: ${error.message}`));
            });
        });
    }
};
exports.DockerParserService = DockerParserService;
exports.DockerParserService = DockerParserService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _a : Object])
], DockerParserService);


/***/ }),
/* 65 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ParserOutputTransformerService = void 0;
const common_1 = __webpack_require__(2);
const nest_winston_1 = __webpack_require__(5);
const dto_1 = __webpack_require__(66);
let ParserOutputTransformerService = class ParserOutputTransformerService {
    constructor(logger) {
        this.logger = logger;
    }
    transformParserOutput(rawOutput, language) {
        this.logger.debug(`[PARSER-TRANSFORMER] Transforming ${language} parser output`);
        switch (language.toLowerCase()) {
            case 'java':
                return this.transformJavaOutput(rawOutput);
            case 'typescript':
                return this.transformTypeScriptOutput(rawOutput);
            default:
                throw new Error(`Unsupported language for transformation: ${language}`);
        }
    }
    transformJavaOutput(rawOutput) {
        this.logger.log(`[PARSER-TRANSFORMER] Raw Java output structure:`, {
            hasFiles: !!rawOutput.files,
            filesIsArray: Array.isArray(rawOutput.files),
            filesCount: rawOutput.files?.length || 0,
            hasClasses: !!rawOutput.classes,
            classesCount: rawOutput.classes?.length || 0,
            hasMethods: !!rawOutput.methods,
            methodsCount: rawOutput.methods?.length || 0,
            hasInterfaces: !!rawOutput.interfaces,
            interfacesCount: rawOutput.interfaces?.length || 0,
            hasFields: !!rawOutput.fields,
            fieldsCount: rawOutput.fields?.length || 0,
            hasEnums: !!rawOutput.enums,
            enumsCount: rawOutput.enums?.length || 0,
            hasRelationships: !!rawOutput.relationships,
            relationshipsCount: rawOutput.relationships?.length || 0,
            topLevelKeys: Object.keys(rawOutput)
        });
        const fileMap = new Map();
        if (rawOutput.files && Array.isArray(rawOutput.files)) {
            for (const file of rawOutput.files) {
                fileMap.set(file.path, {
                    path: file.path,
                    fileName: file.fileName,
                    packageName: file.packageName || '',
                    language: dto_1.Language.JAVA,
                    symbols: [],
                    imports: [],
                    exports: [],
                    relationships: []
                });
            }
        }
        if (rawOutput.classes && Array.isArray(rawOutput.classes)) {
            for (const cls of rawOutput.classes) {
                const file = fileMap.get(cls.filePath);
                if (file) {
                    file.symbols.push({
                        name: cls.name,
                        type: 'class',
                        visibility: cls.visibility?.toLowerCase(),
                        isStatic: cls.isStatic,
                        isAbstract: cls.isAbstract,
                        annotations: cls.decorators?.map((d) => d.name) || [],
                        line: cls.startLine
                    });
                }
            }
        }
        if (rawOutput.methods && Array.isArray(rawOutput.methods)) {
            for (const method of rawOutput.methods) {
                const file = fileMap.get(method.filePath);
                if (file) {
                    file.symbols.push({
                        name: method.name,
                        type: 'method',
                        visibility: method.visibility?.toLowerCase(),
                        isStatic: method.isStatic,
                        isAbstract: method.isAbstract,
                        returnType: method.returnType,
                        parameters: method.parameters?.map((p) => ({
                            name: p.name,
                            type: p.type
                        })) || [],
                        annotations: method.decorators?.map((d) => d.name) || [],
                        line: method.startLine
                    });
                }
            }
        }
        if (rawOutput.interfaces && Array.isArray(rawOutput.interfaces)) {
            for (const iface of rawOutput.interfaces) {
                const file = fileMap.get(iface.filePath);
                if (file) {
                    file.symbols.push({
                        name: iface.name,
                        type: 'interface',
                        visibility: iface.visibility?.toLowerCase() || 'public',
                        annotations: iface.decorators?.map((d) => d.name) || [],
                        line: iface.startLine
                    });
                }
            }
        }
        if (rawOutput.fields && Array.isArray(rawOutput.fields)) {
            for (const field of rawOutput.fields) {
                this.logger.debug(`[PARSER-TRANSFORMER] Skipping field ${field.name} - no filePath available`);
            }
        }
        if (rawOutput.enums && Array.isArray(rawOutput.enums)) {
            for (const enumNode of rawOutput.enums) {
                const file = fileMap.get(enumNode.filePath);
                if (file) {
                    file.symbols.push({
                        name: enumNode.name,
                        type: 'enum',
                        visibility: enumNode.visibility?.toLowerCase() || 'public',
                        annotations: enumNode.decorators?.map((d) => d.name) || [],
                        line: enumNode.startLine
                    });
                }
            }
        }
        if (rawOutput.relationships && Array.isArray(rawOutput.relationships)) {
            for (const rel of rawOutput.relationships) {
                if (rel.sourceFilePath) {
                    const file = fileMap.get(rel.sourceFilePath);
                    if (file) {
                        file.relationships.push({
                            type: rel.type,
                            source: rel.source,
                            target: rel.target,
                            line: rel.line
                        });
                    }
                }
            }
        }
        const files = Array.from(fileMap.values());
        return {
            metadata: {
                language: dto_1.Language.JAVA,
                totalFiles: files.length,
                totalSymbols: files.reduce((sum, file) => sum + file.symbols.length, 0),
                parsingDuration: rawOutput.metadata?.parsingDurationMs || 0,
                framework: rawOutput.metadata?.framework,
                detectedFrameworks: rawOutput.metadata?.detectedFrameworks,
                codebaseName: rawOutput.codebaseName
            },
            files
        };
    }
    transformTypeScriptOutput(rawOutput) {
        this.logger.log(`[PARSER-TRANSFORMER] Raw TypeScript output structure:`, {
            hasFiles: !!rawOutput.files,
            filesIsArray: Array.isArray(rawOutput.files),
            filesCount: rawOutput.files?.length || 0,
            hasClasses: !!rawOutput.classes,
            classesCount: rawOutput.classes?.length || 0,
            hasMethods: !!rawOutput.methods,
            methodsCount: rawOutput.methods?.length || 0,
            hasInterfaces: !!rawOutput.interfaces,
            interfacesCount: rawOutput.interfaces?.length || 0,
            hasFields: !!rawOutput.fields,
            fieldsCount: rawOutput.fields?.length || 0,
            hasEnums: !!rawOutput.enums,
            enumsCount: rawOutput.enums?.length || 0,
            hasRelationships: !!rawOutput.relationships,
            relationshipsCount: rawOutput.relationships?.length || 0,
            topLevelKeys: Object.keys(rawOutput)
        });
        const fileMap = new Map();
        if (rawOutput.files && Array.isArray(rawOutput.files)) {
            for (const file of rawOutput.files) {
                let detectedLanguage = dto_1.Language.TYPESCRIPT;
                if (file.fileExtension) {
                    switch (file.fileExtension.toLowerCase()) {
                        case '.java':
                        case 'java':
                            detectedLanguage = dto_1.Language.JAVA;
                            break;
                        case '.ts':
                        case '.tsx':
                        case 'ts':
                        case 'tsx':
                            detectedLanguage = dto_1.Language.TYPESCRIPT;
                            break;
                        case '.js':
                        case '.jsx':
                        case 'js':
                        case 'jsx':
                            detectedLanguage = dto_1.Language.JAVASCRIPT;
                            break;
                        default:
                            if (rawOutput.metadata?.detectedFrameworks?.includes('java')) {
                                detectedLanguage = dto_1.Language.JAVA;
                            }
                            break;
                    }
                }
                fileMap.set(file.path, {
                    path: file.path,
                    fileName: file.fileName,
                    packageName: file.packageName || '',
                    language: detectedLanguage,
                    symbols: [],
                    imports: [],
                    exports: [],
                    relationships: []
                });
            }
        }
        if (rawOutput.classes && Array.isArray(rawOutput.classes)) {
            for (const cls of rawOutput.classes) {
                const file = fileMap.get(cls.filePath);
                if (file) {
                    file.symbols.push({
                        name: cls.name,
                        type: 'class',
                        visibility: cls.visibility?.toLowerCase() || 'public',
                        isStatic: cls.isStatic,
                        isAbstract: cls.isAbstract,
                        annotations: cls.decorators?.map((d) => d.name) || [],
                        line: cls.startLine
                    });
                }
            }
        }
        if (rawOutput.methods && Array.isArray(rawOutput.methods)) {
            for (const method of rawOutput.methods) {
                const file = fileMap.get(method.filePath);
                if (file) {
                    file.symbols.push({
                        name: method.name,
                        type: 'method',
                        visibility: method.visibility?.toLowerCase() || 'public',
                        isStatic: method.isStatic,
                        isAbstract: method.isAbstract,
                        returnType: method.returnType,
                        parameters: method.parameters?.map((p) => ({
                            name: p.name,
                            type: p.type
                        })) || [],
                        annotations: method.decorators?.map((d) => d.name) || [],
                        line: method.startLine
                    });
                }
            }
        }
        if (rawOutput.interfaces && Array.isArray(rawOutput.interfaces)) {
            for (const iface of rawOutput.interfaces) {
                const file = fileMap.get(iface.filePath);
                if (file) {
                    file.symbols.push({
                        name: iface.name,
                        type: 'interface',
                        visibility: dto_1.Visibility.PUBLIC,
                        annotations: iface.decorators?.map((d) => d.name) || [],
                        line: iface.startLine
                    });
                }
            }
        }
        if (rawOutput.fields && Array.isArray(rawOutput.fields)) {
            for (const field of rawOutput.fields) {
                const file = fileMap.get(field.filePath);
                if (file) {
                    file.symbols.push({
                        name: field.name,
                        type: 'field',
                        visibility: field.visibility?.toLowerCase() || 'public',
                        isStatic: field.isStatic,
                        returnType: field.type,
                        annotations: field.decorators?.map((d) => d.name) || [],
                        line: field.startLine
                    });
                }
            }
        }
        if (rawOutput.enums && Array.isArray(rawOutput.enums)) {
            for (const enumNode of rawOutput.enums) {
                const file = fileMap.get(enumNode.filePath);
                if (file) {
                    file.symbols.push({
                        name: enumNode.name,
                        type: 'enum',
                        visibility: enumNode.visibility?.toLowerCase() || 'public',
                        annotations: enumNode.decorators?.map((d) => d.name) || [],
                        line: enumNode.startLine
                    });
                }
            }
        }
        if (rawOutput.relationships && Array.isArray(rawOutput.relationships)) {
            for (const rel of rawOutput.relationships) {
                if (rel.sourceId && rel.targetId) {
                    let sourceFile = null;
                    for (const [filePath, file] of fileMap.entries()) {
                        const hasSourceEntity = file.symbols.some(symbol => {
                            const symbolId = this.generateSymbolIdFromSpoonId(rel.sourceId, symbol);
                            return symbolId === rel.sourceId || rel.sourceId.includes(symbol.name);
                        });
                        if (hasSourceEntity) {
                            sourceFile = file;
                            break;
                        }
                    }
                    if (sourceFile) {
                        sourceFile.relationships.push({
                            type: rel.type.toLowerCase(),
                            source: rel.sourceId,
                            target: rel.targetId,
                            properties: rel.properties
                        });
                    }
                }
            }
        }
        const files = Array.from(fileMap.values());
        const languageCounts = new Map();
        files.forEach(file => {
            const count = languageCounts.get(file.language) || 0;
            languageCounts.set(file.language, count + 1);
        });
        let primaryLanguage = dto_1.Language.TYPESCRIPT;
        let maxCount = 0;
        for (const [lang, count] of languageCounts.entries()) {
            if (count > maxCount) {
                maxCount = count;
                primaryLanguage = lang;
            }
        }
        return {
            metadata: {
                language: primaryLanguage,
                totalFiles: files.length,
                totalSymbols: files.reduce((sum, file) => sum + file.symbols.length, 0),
                parsingDuration: rawOutput.metadata?.parsingDurationMs || 0,
                framework: rawOutput.metadata?.framework,
                detectedFrameworks: rawOutput.metadata?.detectedFrameworks,
                codebaseName: rawOutput.codebaseName
            },
            files
        };
    }
    generateSymbolIdFromSpoonId(spoonId, symbol) {
        const parts = spoonId.split(':');
        if (parts.length >= 3) {
            const codebaseName = parts[0];
            const entityType = parts[1];
            const fullyQualifiedName = parts.slice(2).join(':');
            if (fullyQualifiedName.endsWith(symbol.name)) {
                return spoonId;
            }
        }
        return '';
    }
};
exports.ParserOutputTransformerService = ParserOutputTransformerService;
exports.ParserOutputTransformerService = ParserOutputTransformerService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _a : Object])
], ParserOutputTransformerService);


/***/ }),
/* 66 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Language = exports.HttpMethod = exports.Visibility = exports.RelationshipType = exports.NodeType = void 0;
__exportStar(__webpack_require__(67), exports);
__exportStar(__webpack_require__(68), exports);
__exportStar(__webpack_require__(69), exports);
var graph_nodes_dto_1 = __webpack_require__(67);
Object.defineProperty(exports, "NodeType", ({ enumerable: true, get: function () { return graph_nodes_dto_1.NodeType; } }));
Object.defineProperty(exports, "RelationshipType", ({ enumerable: true, get: function () { return graph_nodes_dto_1.RelationshipType; } }));
Object.defineProperty(exports, "Visibility", ({ enumerable: true, get: function () { return graph_nodes_dto_1.Visibility; } }));
Object.defineProperty(exports, "HttpMethod", ({ enumerable: true, get: function () { return graph_nodes_dto_1.HttpMethod; } }));
Object.defineProperty(exports, "Language", ({ enumerable: true, get: function () { return graph_nodes_dto_1.Language; } }));


/***/ }),
/* 67 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Language = exports.HttpMethod = exports.Visibility = exports.RelationshipType = exports.NodeType = void 0;
var NodeType;
(function (NodeType) {
    NodeType["PROJECT"] = "Project";
    NodeType["CODEBASE"] = "Codebase";
    NodeType["COMMIT"] = "Commit";
    NodeType["AUTHOR"] = "Author";
    NodeType["FILE"] = "File";
    NodeType["CLASS"] = "Class";
    NodeType["INTERFACE"] = "Interface";
    NodeType["METHOD"] = "Method";
    NodeType["ANNOTATION"] = "Annotation";
    NodeType["API_ENDPOINT"] = "APIEndpoint";
    NodeType["TEST_CASE"] = "TestCase";
    NodeType["DEPENDENCY"] = "Dependency";
    NodeType["DOCUMENT"] = "Document";
    NodeType["CHUNK"] = "Chunk";
    NodeType["KAFKA_TOPIC"] = "KafkaTopic";
    NodeType["USER_FLOW"] = "UserFlow";
})(NodeType || (exports.NodeType = NodeType = {}));
var RelationshipType;
(function (RelationshipType) {
    RelationshipType["HAS_CODEBASE"] = "HAS_CODEBASE";
    RelationshipType["CONTAINS_FILE"] = "CONTAINS_FILE";
    RelationshipType["AUTHORED"] = "AUTHORED";
    RelationshipType["MODIFIED_IN"] = "MODIFIED_IN";
    RelationshipType["DEFINES_CLASS"] = "DEFINES_CLASS";
    RelationshipType["DEFINES_METHOD"] = "DEFINES_METHOD";
    RelationshipType["HAS_METHOD"] = "HAS_METHOD";
    RelationshipType["CALLS"] = "CALLS";
    RelationshipType["IMPLEMENTS"] = "IMPLEMENTS";
    RelationshipType["EXTENDS"] = "EXTENDS";
    RelationshipType["USES_TYPE"] = "USES_TYPE";
    RelationshipType["ANNOTATED_WITH"] = "ANNOTATED_WITH";
    RelationshipType["IMPLEMENTS_ENDPOINT"] = "IMPLEMENTS_ENDPOINT";
    RelationshipType["TESTS"] = "TESTS";
    RelationshipType["DEPENDS_ON"] = "DEPENDS_ON";
    RelationshipType["DESCRIBED_IN"] = "DESCRIBED_IN";
    RelationshipType["HAS_CHUNK"] = "HAS_CHUNK";
    RelationshipType["DOCUMENTS"] = "DOCUMENTS";
    RelationshipType["PUBLISHES_TO"] = "PUBLISHES_TO";
    RelationshipType["SUBSCRIBES_TO"] = "SUBSCRIBES_TO";
})(RelationshipType || (exports.RelationshipType = RelationshipType = {}));
var Visibility;
(function (Visibility) {
    Visibility["PUBLIC"] = "public";
    Visibility["PRIVATE"] = "private";
    Visibility["PROTECTED"] = "protected";
    Visibility["INTERNAL"] = "internal";
    Visibility["PACKAGE"] = "package";
})(Visibility || (exports.Visibility = Visibility = {}));
var HttpMethod;
(function (HttpMethod) {
    HttpMethod["GET"] = "GET";
    HttpMethod["POST"] = "POST";
    HttpMethod["PUT"] = "PUT";
    HttpMethod["DELETE"] = "DELETE";
    HttpMethod["PATCH"] = "PATCH";
    HttpMethod["HEAD"] = "HEAD";
    HttpMethod["OPTIONS"] = "OPTIONS";
})(HttpMethod || (exports.HttpMethod = HttpMethod = {}));
var Language;
(function (Language) {
    Language["JAVA"] = "java";
    Language["TYPESCRIPT"] = "typescript";
    Language["JAVASCRIPT"] = "javascript";
    Language["PYTHON"] = "python";
    Language["CSHARP"] = "csharp";
    Language["GO"] = "go";
    Language["RUST"] = "rust";
    Language["KOTLIN"] = "kotlin";
    Language["SCALA"] = "scala";
})(Language || (exports.Language = Language = {}));


/***/ }),
/* 68 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RELATIONSHIP_SCHEMA = void 0;
const graph_nodes_dto_1 = __webpack_require__(67);
exports.RELATIONSHIP_SCHEMA = {
    [graph_nodes_dto_1.RelationshipType.HAS_CODEBASE]: {
        startNodeTypes: [graph_nodes_dto_1.NodeType.PROJECT],
        endNodeTypes: [graph_nodes_dto_1.NodeType.CODEBASE],
        description: 'A project contains codebases'
    },
    [graph_nodes_dto_1.RelationshipType.CONTAINS_FILE]: {
        startNodeTypes: [graph_nodes_dto_1.NodeType.CODEBASE],
        endNodeTypes: [graph_nodes_dto_1.NodeType.FILE],
        description: 'A codebase contains files'
    },
    [graph_nodes_dto_1.RelationshipType.AUTHORED]: {
        startNodeTypes: [graph_nodes_dto_1.NodeType.AUTHOR],
        endNodeTypes: [graph_nodes_dto_1.NodeType.COMMIT],
        description: 'An author wrote a commit'
    },
    [graph_nodes_dto_1.RelationshipType.MODIFIED_IN]: {
        startNodeTypes: [graph_nodes_dto_1.NodeType.FILE],
        endNodeTypes: [graph_nodes_dto_1.NodeType.COMMIT],
        description: 'A file was modified in a commit'
    },
    [graph_nodes_dto_1.RelationshipType.DEFINES_CLASS]: {
        startNodeTypes: [graph_nodes_dto_1.NodeType.FILE],
        endNodeTypes: [graph_nodes_dto_1.NodeType.CLASS],
        description: 'A file defines a class'
    },
    [graph_nodes_dto_1.RelationshipType.DEFINES_METHOD]: {
        startNodeTypes: [graph_nodes_dto_1.NodeType.FILE],
        endNodeTypes: [graph_nodes_dto_1.NodeType.METHOD],
        description: 'A file defines a standalone function'
    },
    [graph_nodes_dto_1.RelationshipType.HAS_METHOD]: {
        startNodeTypes: [graph_nodes_dto_1.NodeType.CLASS],
        endNodeTypes: [graph_nodes_dto_1.NodeType.METHOD],
        description: 'A class has methods'
    },
    [graph_nodes_dto_1.RelationshipType.CALLS]: {
        startNodeTypes: [graph_nodes_dto_1.NodeType.METHOD],
        endNodeTypes: [graph_nodes_dto_1.NodeType.METHOD],
        description: 'The directed call graph between methods'
    },
    [graph_nodes_dto_1.RelationshipType.IMPLEMENTS]: {
        startNodeTypes: [graph_nodes_dto_1.NodeType.CLASS],
        endNodeTypes: [graph_nodes_dto_1.NodeType.INTERFACE],
        description: 'A class implements an interface'
    },
    [graph_nodes_dto_1.RelationshipType.EXTENDS]: {
        startNodeTypes: [graph_nodes_dto_1.NodeType.CLASS],
        endNodeTypes: [graph_nodes_dto_1.NodeType.CLASS],
        description: 'A class extends another class'
    },
    [graph_nodes_dto_1.RelationshipType.USES_TYPE]: {
        startNodeTypes: [graph_nodes_dto_1.NodeType.METHOD],
        endNodeTypes: [graph_nodes_dto_1.NodeType.CLASS, graph_nodes_dto_1.NodeType.INTERFACE],
        description: 'A method uses a class/interface as a type'
    },
    [graph_nodes_dto_1.RelationshipType.ANNOTATED_WITH]: {
        startNodeTypes: [graph_nodes_dto_1.NodeType.CLASS, graph_nodes_dto_1.NodeType.METHOD],
        endNodeTypes: [graph_nodes_dto_1.NodeType.ANNOTATION],
        description: 'Code is decorated with an annotation'
    },
    [graph_nodes_dto_1.RelationshipType.IMPLEMENTS_ENDPOINT]: {
        startNodeTypes: [graph_nodes_dto_1.NodeType.METHOD],
        endNodeTypes: [graph_nodes_dto_1.NodeType.API_ENDPOINT],
        description: 'A method provides the logic for an API endpoint'
    },
    [graph_nodes_dto_1.RelationshipType.TESTS]: {
        startNodeTypes: [graph_nodes_dto_1.NodeType.TEST_CASE],
        endNodeTypes: [graph_nodes_dto_1.NodeType.CLASS, graph_nodes_dto_1.NodeType.METHOD],
        description: 'A test case covers a specific piece of code'
    },
    [graph_nodes_dto_1.RelationshipType.DEPENDS_ON]: {
        startNodeTypes: [graph_nodes_dto_1.NodeType.CODEBASE],
        endNodeTypes: [graph_nodes_dto_1.NodeType.DEPENDENCY],
        description: 'A codebase depends on an external library'
    },
    [graph_nodes_dto_1.RelationshipType.DESCRIBED_IN]: {
        startNodeTypes: [graph_nodes_dto_1.NodeType.CLASS, graph_nodes_dto_1.NodeType.METHOD, graph_nodes_dto_1.NodeType.API_ENDPOINT],
        endNodeTypes: [graph_nodes_dto_1.NodeType.CHUNK],
        description: 'Code is described by a documentation chunk'
    },
    [graph_nodes_dto_1.RelationshipType.HAS_CHUNK]: {
        startNodeTypes: [graph_nodes_dto_1.NodeType.DOCUMENT],
        endNodeTypes: [graph_nodes_dto_1.NodeType.CHUNK],
        description: 'A document is broken down into chunks'
    },
    [graph_nodes_dto_1.RelationshipType.DOCUMENTS]: {
        startNodeTypes: [graph_nodes_dto_1.NodeType.DOCUMENT],
        endNodeTypes: [graph_nodes_dto_1.NodeType.USER_FLOW],
        description: 'A document describes a high-level user flow'
    },
    [graph_nodes_dto_1.RelationshipType.PUBLISHES_TO]: {
        startNodeTypes: [graph_nodes_dto_1.NodeType.METHOD],
        endNodeTypes: [graph_nodes_dto_1.NodeType.KAFKA_TOPIC],
        description: 'A method publishes messages to a topic'
    },
    [graph_nodes_dto_1.RelationshipType.SUBSCRIBES_TO]: {
        startNodeTypes: [graph_nodes_dto_1.NodeType.METHOD],
        endNodeTypes: [graph_nodes_dto_1.NodeType.KAFKA_TOPIC],
        description: 'A method consumes messages from a topic'
    }
};


/***/ }),
/* 69 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GraphValidationError = void 0;
exports.validateNode = validateNode;
exports.validateRelationship = validateRelationship;
exports.validateRelationshipCompatibility = validateRelationshipCompatibility;
exports.createProjectNode = createProjectNode;
exports.createCodebaseNode = createCodebaseNode;
exports.createFileNode = createFileNode;
exports.createClassNode = createClassNode;
exports.createMethodNode = createMethodNode;
exports.generateNodeId = generateNodeId;
exports.parseNodeId = parseNodeId;
const graph_nodes_dto_1 = __webpack_require__(67);
const graph_relationships_dto_1 = __webpack_require__(68);
class GraphValidationError extends Error {
    constructor(message, nodeId, relationshipType) {
        super(message);
        this.nodeId = nodeId;
        this.relationshipType = relationshipType;
        this.name = 'GraphValidationError';
    }
}
exports.GraphValidationError = GraphValidationError;
function validateNode(node) {
    if (!node.id) {
        throw new GraphValidationError('Node ID is required');
    }
    if (!node.nodeType) {
        throw new GraphValidationError('Node type is required', node.id);
    }
    if (!Object.values(graph_nodes_dto_1.NodeType).includes(node.nodeType)) {
        throw new GraphValidationError(`Invalid node type: ${node.nodeType}`, node.id);
    }
    switch (node.nodeType) {
        case graph_nodes_dto_1.NodeType.PROJECT:
            validateProjectNode(node);
            break;
        case graph_nodes_dto_1.NodeType.CODEBASE:
            validateCodebaseNode(node);
            break;
        case graph_nodes_dto_1.NodeType.FILE:
            validateFileNode(node);
            break;
        case graph_nodes_dto_1.NodeType.CLASS:
            validateClassNode(node);
            break;
        case graph_nodes_dto_1.NodeType.INTERFACE:
            validateInterfaceNode(node);
            break;
        case graph_nodes_dto_1.NodeType.METHOD:
            validateMethodNode(node);
            break;
    }
}
function validateRelationship(relationship) {
    if (!relationship.type) {
        throw new GraphValidationError('Relationship type is required');
    }
    if (!relationship.startNodeId) {
        throw new GraphValidationError('Start node ID is required', undefined, relationship.type);
    }
    if (!relationship.endNodeId) {
        throw new GraphValidationError('End node ID is required', undefined, relationship.type);
    }
    if (!Object.values(graph_nodes_dto_1.RelationshipType).includes(relationship.type)) {
        throw new GraphValidationError(`Invalid relationship type: ${relationship.type}`);
    }
}
function validateRelationshipCompatibility(relationship, startNode, endNode) {
    const schema = graph_relationships_dto_1.RELATIONSHIP_SCHEMA[relationship.type];
    if (!schema.startNodeTypes.includes(startNode.nodeType)) {
        throw new GraphValidationError(`Invalid start node type ${startNode.nodeType} for relationship ${relationship.type}. Expected: ${schema.startNodeTypes.join(', ')}`, startNode.id, relationship.type);
    }
    if (!schema.endNodeTypes.includes(endNode.nodeType)) {
        throw new GraphValidationError(`Invalid end node type ${endNode.nodeType} for relationship ${relationship.type}. Expected: ${schema.endNodeTypes.join(', ')}`, endNode.id, relationship.type);
    }
}
function validateProjectNode(node) {
    if (!node.name) {
        throw new GraphValidationError('Project name is required', node.id);
    }
    if (!node.projectId) {
        throw new GraphValidationError('Project ID is required', node.id);
    }
}
function validateCodebaseNode(node) {
    if (!node.name) {
        throw new GraphValidationError('Codebase name is required', node.id);
    }
    if (!node.gitUrl) {
        throw new GraphValidationError('Git URL is required', node.id);
    }
    if (!node.language) {
        throw new GraphValidationError('Language is required', node.id);
    }
    if (!Object.values(graph_nodes_dto_1.Language).includes(node.language)) {
        throw new GraphValidationError(`Invalid language: ${node.language}`, node.id);
    }
}
function validateFileNode(node) {
    if (!node.path) {
        throw new GraphValidationError('File path is required', node.id);
    }
    if (!node.fileName) {
        throw new GraphValidationError('File name is required', node.id);
    }
    if (!node.checksum) {
        throw new GraphValidationError('File checksum is required', node.id);
    }
    if (typeof node.lineCount !== 'number' || node.lineCount < 0) {
        throw new GraphValidationError('Valid line count is required', node.id);
    }
}
function validateClassNode(node) {
    if (!node.name) {
        throw new GraphValidationError('Class name is required', node.id);
    }
    if (!node.fullyQualifiedName) {
        throw new GraphValidationError('Fully qualified name is required', node.id);
    }
    if (node.visibility && !Object.values(graph_nodes_dto_1.Visibility).includes(node.visibility)) {
        throw new GraphValidationError(`Invalid visibility: ${node.visibility}`, node.id);
    }
}
function validateInterfaceNode(node) {
    if (!node.name) {
        throw new GraphValidationError('Interface name is required', node.id);
    }
    if (!node.fullyQualifiedName) {
        throw new GraphValidationError('Fully qualified name is required', node.id);
    }
    if (node.visibility && !Object.values(graph_nodes_dto_1.Visibility).includes(node.visibility)) {
        throw new GraphValidationError(`Invalid visibility: ${node.visibility}`, node.id);
    }
}
function validateMethodNode(node) {
    if (!node.name) {
        throw new GraphValidationError('Method name is required', node.id);
    }
    if (!node.signature) {
        throw new GraphValidationError('Method signature is required', node.id);
    }
    if (node.visibility && !Object.values(graph_nodes_dto_1.Visibility).includes(node.visibility)) {
        throw new GraphValidationError(`Invalid visibility: ${node.visibility}`, node.id);
    }
    if (node.cyclomaticComplexity !== undefined && node.cyclomaticComplexity < 0) {
        throw new GraphValidationError('Cyclomatic complexity must be non-negative', node.id);
    }
}
function createProjectNode(projectId, name, description) {
    const node = {
        id: `project:${projectId}`,
        nodeType: graph_nodes_dto_1.NodeType.PROJECT,
        projectId,
        name,
        description,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    validateNode(node);
    return node;
}
function createCodebaseNode(codebaseId, name, gitUrl, language, framework, lastIndexedCommit) {
    const node = {
        id: `codebase:${codebaseId}`,
        nodeType: graph_nodes_dto_1.NodeType.CODEBASE,
        name,
        gitUrl,
        language,
        framework,
        lastIndexedCommit,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    validateNode(node);
    return node;
}
function createFileNode(path, fileName, checksum, lineCount, packageName) {
    const node = {
        id: `file:${checksum}:${path}`,
        nodeType: graph_nodes_dto_1.NodeType.FILE,
        path,
        fileName,
        checksum,
        lineCount,
        packageName,
        extension: fileName.split('.').pop(),
        isTestFile: isTestFile(path),
        createdAt: new Date(),
        updatedAt: new Date()
    };
    validateNode(node);
    return node;
}
function createClassNode(fullyQualifiedName, name, filePath, comment, visibility) {
    const node = {
        id: `class:${fullyQualifiedName}`,
        nodeType: graph_nodes_dto_1.NodeType.CLASS,
        name,
        fullyQualifiedName,
        comment,
        visibility,
        filePath,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    validateNode(node);
    return node;
}
function createMethodNode(signature, name, returnType, filePath, visibility) {
    const node = {
        id: `method:${signature}`,
        nodeType: graph_nodes_dto_1.NodeType.METHOD,
        name,
        signature,
        returnType,
        visibility,
        filePath,
        parameters: [],
        createdAt: new Date(),
        updatedAt: new Date()
    };
    validateNode(node);
    return node;
}
function isTestFile(filePath) {
    const testPatterns = [
        /\.test\.(ts|tsx|js|jsx|java)$/,
        /\.spec\.(ts|tsx|js|jsx|java)$/,
        /__tests__\//,
        /\/test\//,
        /\/tests\//,
        /Test\.java$/,
        /Tests\.java$/
    ];
    return testPatterns.some(pattern => pattern.test(filePath));
}
function generateNodeId(nodeType, identifier) {
    return `${nodeType.toLowerCase()}:${identifier}`;
}
function parseNodeId(nodeId) {
    const [nodeType, ...identifierParts] = nodeId.split(':');
    return {
        nodeType,
        identifier: identifierParts.join(':')
    };
}


/***/ }),
/* 70 */
/***/ ((module) => {

module.exports = require("os");

/***/ }),
/* 71 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GraphUpdateTask = void 0;
const common_1 = __webpack_require__(2);
const nest_winston_1 = __webpack_require__(5);
const base_task_interface_1 = __webpack_require__(61);
const task_config_service_1 = __webpack_require__(62);
const graph_service_1 = __webpack_require__(72);
let GraphUpdateTask = class GraphUpdateTask extends base_task_interface_1.BaseTask {
    constructor(taskConfigService, graphService, logger) {
        super();
        this.taskConfigService = taskConfigService;
        this.graphService = graphService;
        this.logger = logger;
        this.name = 'GRAPH_UPDATE';
        this.description = 'Update Neo4j graph database with extracted symbols';
        this.requiredTasks = ['CODE_PARSING'];
        this.optionalTasks = [];
    }
    getConfig(context) {
        return this.taskConfigService.getGraphUpdateConfig(context.job.type);
    }
    shouldExecute(context) {
        const { job, data } = context;
        const jobId = job.id;
        const hasParsingData = !!(data.CODE_PARSING?.parsingResults?.length);
        this.logger.debug(`[${jobId}] [GRAPH-UPDATE] Checking if task should execute`, {
            hasCodeParsingData: !!data.CODE_PARSING,
            parsingResultsCount: data.CODE_PARSING?.parsingResults?.length || 0,
            shouldExecute: hasParsingData
        });
        return hasParsingData;
    }
    async validate(context) {
        const { job, data } = context;
        const jobId = job.id;
        this.logger.debug(`[${jobId}] [GRAPH-UPDATE] Validating task prerequisites`);
        if (!data.CODE_PARSING) {
            throw new Error('Code parsing data is required for graph update');
        }
        if (!data.CODE_PARSING.parsingResults || data.CODE_PARSING.parsingResults.length === 0) {
            throw new Error('No parsing results available for graph update');
        }
        this.logger.debug(`[${jobId}] [GRAPH-UPDATE] Task validation completed successfully`);
    }
    async executeTask(context) {
        const { job, data } = context;
        const jobId = job.id;
        const config = this.getConfig(context);
        const codeParsingData = data.CODE_PARSING;
        context.logger.info(`[${jobId}] [GRAPH-UPDATE] Starting graph update task`);
        try {
            await this.graphService.initializeGraph(config);
            const parsingResults = codeParsingData.parsingResults;
            const allFiles = [];
            for (const parserOutput of parsingResults) {
                allFiles.push(...parserOutput.files);
            }
            context.logger.info(`[${jobId}] [GRAPH-UPDATE] Total files from parser: ${allFiles.length}`);
            context.logger.info(`[${jobId}] [GRAPH-UPDATE] Parser results structure:`, {
                parsingResultsCount: parsingResults.length,
                firstResultStructure: parsingResults[0] ? {
                    hasMetadata: !!parsingResults[0].metadata,
                    hasFiles: !!parsingResults[0].files,
                    filesCount: parsingResults[0].files?.length || 0,
                    metadataSymbols: parsingResults[0].metadata?.totalSymbols || 0
                } : 'No results'
            });
            context.logger.info(`[${jobId}] [GRAPH-UPDATE] Sample file structure:`, allFiles[0] ? {
                path: allFiles[0].path,
                symbolsCount: allFiles[0].symbols?.length || 0,
                hasSymbols: !!allFiles[0].symbols,
                symbolsArray: allFiles[0].symbols,
                fileStructure: Object.keys(allFiles[0])
            } : 'No files');
            const filesWithSymbols = allFiles.filter(file => file.symbols && file.symbols.length > 0);
            context.logger.info(`[${jobId}] [GRAPH-UPDATE] Processing ${filesWithSymbols.length} files with symbols in batches of ${config.batchSize}`);
            if (!context.codebase) {
                throw new Error('Codebase not found in job context');
            }
            const codebaseId = context.codebase.id;
            const result = await this.graphService.updateCodebaseGraph(codebaseId, filesWithSymbols, config);
            context.data.GRAPH_UPDATE = result;
            context.logger.info(`[${jobId}] [GRAPH-UPDATE] Graph update completed successfully`, {
                ...result,
                filesProcessed: filesWithSymbols.length
            });
            return {
                success: true,
                duration: 0,
                data: context.data.GRAPH_UPDATE,
                metrics: {
                    itemsCreated: result.nodesCreated,
                    itemsUpdated: result.relationshipsCreated,
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[${jobId}] [GRAPH-UPDATE] Task failed with error`, {
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
            });
            return {
                success: false,
                duration: 0,
                error: errorMessage,
            };
        }
    }
    async cleanup(context) {
        const { job } = context;
        const jobId = job.id;
        this.logger.debug(`[${jobId}] [GRAPH-UPDATE] Starting task cleanup`);
        this.logger.debug(`[${jobId}] [GRAPH-UPDATE] Task cleanup completed`);
    }
    getEstimatedDuration(context) {
        const codeParsingData = context.data.CODE_PARSING;
        const resultCount = codeParsingData?.parsingResults?.length || 0;
        const baseTime = 30000;
        const timePerResult = 500;
        return baseTime + (resultCount * timePerResult);
    }
};
exports.GraphUpdateTask = GraphUpdateTask;
exports.GraphUpdateTask = GraphUpdateTask = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof task_config_service_1.TaskConfigService !== "undefined" && task_config_service_1.TaskConfigService) === "function" ? _a : Object, typeof (_b = typeof graph_service_1.GraphService !== "undefined" && graph_service_1.GraphService) === "function" ? _b : Object, typeof (_c = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _c : Object])
], GraphUpdateTask);


/***/ }),
/* 72 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GraphService = void 0;
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const typeorm_2 = __webpack_require__(13);
const nest_winston_1 = __webpack_require__(5);
const entities_1 = __webpack_require__(11);
const neo4j_service_1 = __webpack_require__(73);
const crypto_1 = __webpack_require__(23);
let GraphService = class GraphService {
    constructor(neo4jService, projectRepository, codebaseRepository, logger) {
        this.neo4jService = neo4jService;
        this.projectRepository = projectRepository;
        this.codebaseRepository = codebaseRepository;
        this.logger = logger;
    }
    async initializeGraph(config) {
        await this.neo4jService.connect(config);
        await this.neo4jService.createConstraintsAndIndexes();
        this.logger.log(`[GRAPH-SERVICE] Graph database initialized`);
    }
    async updateCodebaseGraph(codebaseId, files, config) {
        await this.neo4jService.connect(config);
        const codebase = await this.codebaseRepository.findOne({
            where: { id: codebaseId },
            relations: ['project']
        });
        if (!codebase || !codebase.project) {
            throw new Error(`Codebase ${codebaseId} or its project not found`);
        }
        this.logger.debug(`[GRAPH-SERVICE] Updating graph for codebase: ${codebase.name}`);
        await this.neo4jService.createOrUpdateProject(codebase.project.id, codebase.project.name);
        await this.neo4jService.createOrUpdateCodebase(codebase.project.id, codebase.id, codebase.name, codebase.gitlabUrl, codebase.language, undefined, codebase.lastSyncCommit);
        const batchSize = config.batchSize;
        let totalResult = {
            nodesCreated: 0,
            nodesUpdated: 0,
            relationshipsCreated: 0,
            relationshipsUpdated: 0
        };
        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            const batchResult = await this.processBatch(codebaseId, batch);
            totalResult.nodesCreated += batchResult.nodesCreated;
            totalResult.nodesUpdated += batchResult.nodesUpdated;
            totalResult.relationshipsCreated += batchResult.relationshipsCreated;
            totalResult.relationshipsUpdated += batchResult.relationshipsUpdated;
            this.logger.debug(`[GRAPH-SERVICE] Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(files.length / batchSize)}`);
        }
        this.logger.log(`[GRAPH-SERVICE] Graph update completed`, {
            codebaseId,
            filesProcessed: files.length,
            ...totalResult
        });
        return totalResult;
    }
    async processBatch(codebaseId, files) {
        const queries = [];
        for (const file of files) {
            const fileChecksum = this.calculateFileChecksum(file);
            queries.push({
                query: `
          MATCH (c:Codebase {id: $codebaseId})
          MERGE (f:File {path: $filePath})
          SET f.fileName = $fileName,
              f.packageName = $packageName,
              f.language = $language,
              f.checksum = $checksum,
              f.updatedAt = datetime()
          MERGE (c)-[:CONTAINS_FILE]->(f)
        `,
                parameters: {
                    codebaseId,
                    filePath: file.path,
                    fileName: file.fileName,
                    packageName: file.packageName,
                    language: file.language,
                    checksum: fileChecksum
                }
            });
            for (const symbol of file.symbols) {
                const symbolQueries = this.createSymbolQueries(file.path, symbol);
                queries.push(...symbolQueries);
            }
            for (const relationship of file.relationships) {
                const sourceName = this.extractEntityNameFromSpoonId(relationship.source);
                const targetName = this.extractEntityNameFromSpoonId(relationship.target);
                if (sourceName && targetName) {
                    queries.push({
                        query: `
              MATCH (source), (target)
              WHERE (source:Class OR source:Method OR source:Interface OR source:Variable)
                AND (source.name = $sourceName OR source.fullyQualifiedName = $sourceFullName)
                AND (target:Class OR target:Method OR target:Interface OR target:Variable)
                AND (target.name = $targetName OR target.fullyQualifiedName = $targetFullName)
              MERGE (source)-[:${relationship.type.toUpperCase()}]->(target)
            `,
                        parameters: {
                            sourceName,
                            targetName,
                            sourceFullName: this.extractFullyQualifiedNameFromSpoonId(relationship.source),
                            targetFullName: this.extractFullyQualifiedNameFromSpoonId(relationship.target)
                        }
                    });
                }
            }
        }
        return await this.neo4jService.executeBatch(queries);
    }
    createSymbolQueries(filePath, symbol) {
        const queries = [];
        const symbolId = this.generateSymbolId(filePath, symbol);
        switch (symbol.type) {
            case 'class':
                queries.push({
                    query: `
            MATCH (f:File {path: $filePath})
            MERGE (c:Class {id: $symbolId})
            SET c.name = $name,
                c.fullyQualifiedName = $fullyQualifiedName,
                c.visibility = $visibility,
                c.isStatic = $isStatic,
                c.isAbstract = $isAbstract,
                c.line = $line,
                c.updatedAt = datetime()
            MERGE (f)-[:DEFINES_CLASS]->(c)
          `,
                    parameters: {
                        filePath,
                        symbolId,
                        name: symbol.name,
                        fullyQualifiedName: this.getFullyQualifiedName(filePath, symbol),
                        visibility: symbol.visibility,
                        isStatic: symbol.isStatic,
                        isAbstract: symbol.isAbstract,
                        line: symbol.line
                    }
                });
                break;
            case 'interface':
                queries.push({
                    query: `
            MATCH (f:File {path: $filePath})
            MERGE (i:Interface {id: $symbolId})
            SET i.name = $name,
                i.fullyQualifiedName = $fullyQualifiedName,
                i.line = $line,
                i.updatedAt = datetime()
            MERGE (f)-[:DEFINES_INTERFACE]->(i)
          `,
                    parameters: {
                        filePath,
                        symbolId,
                        name: symbol.name,
                        fullyQualifiedName: this.getFullyQualifiedName(filePath, symbol),
                        line: symbol.line
                    }
                });
                break;
            case 'method':
            case 'function':
                const signature = this.buildMethodSignature(symbol);
                queries.push({
                    query: `
            MATCH (f:File {path: $filePath})
            MERGE (m:Method {id: $symbolId})
            SET m.name = $name,
                m.signature = $signature,
                m.returnType = $returnType,
                m.visibility = $visibility,
                m.isStatic = $isStatic,
                m.isAbstract = $isAbstract,
                m.line = $line,
                m.updatedAt = datetime()
            MERGE (f)-[:DEFINES_METHOD]->(m)
          `,
                    parameters: {
                        filePath,
                        symbolId,
                        name: symbol.name,
                        signature,
                        returnType: symbol.returnType,
                        visibility: symbol.visibility,
                        isStatic: symbol.isStatic,
                        isAbstract: symbol.isAbstract,
                        line: symbol.line
                    }
                });
                break;
            case 'field':
            case 'property':
            case 'variable':
                queries.push({
                    query: `
            MATCH (f:File {path: $filePath})
            MERGE (v:Variable {id: $symbolId})
            SET v.name = $name,
                v.type = $type,
                v.visibility = $visibility,
                v.isStatic = $isStatic,
                v.line = $line,
                v.updatedAt = datetime()
            MERGE (f)-[:DEFINES_VARIABLE]->(v)
          `,
                    parameters: {
                        filePath,
                        symbolId,
                        name: symbol.name,
                        type: symbol.returnType || 'unknown',
                        visibility: symbol.visibility,
                        isStatic: symbol.isStatic,
                        line: symbol.line
                    }
                });
                break;
        }
        return queries;
    }
    generateSymbolId(filePath, symbol) {
        const content = `${filePath}:${symbol.type}:${symbol.name}:${symbol.line || 0}`;
        return (0, crypto_1.createHash)('sha256').update(content).digest('hex').substring(0, 16);
    }
    getFullyQualifiedName(filePath, symbol) {
        const pathParts = filePath.split('/');
        const fileName = pathParts[pathParts.length - 1].replace(/\.(java|ts|js)$/, '');
        return `${fileName}.${symbol.name}`;
    }
    buildMethodSignature(symbol) {
        const params = symbol.parameters?.map(p => `${p.name}: ${p.type}`).join(', ') || '';
        return `${symbol.name}(${params})${symbol.returnType ? `: ${symbol.returnType}` : ''}`;
    }
    calculateFileChecksum(file) {
        const content = JSON.stringify({
            path: file.path,
            symbols: file.symbols.length,
            relationships: file.relationships.length
        });
        return (0, crypto_1.createHash)('md5').update(content).digest('hex');
    }
    async handleDeletedFiles(codebaseId, deletedFilePaths) {
        if (deletedFilePaths.length === 0) {
            return { nodesCreated: 0, nodesUpdated: 0, relationshipsCreated: 0, relationshipsUpdated: 0 };
        }
        this.logger.debug(`[GRAPH-SERVICE] Handling ${deletedFilePaths.length} deleted files for codebase: ${codebaseId}`);
        return await this.neo4jService.deleteFilesFromCodebase(codebaseId, deletedFilePaths);
    }
    extractEntityNameFromSpoonId(spoonId) {
        if (!spoonId)
            return null;
        const parts = spoonId.split(':');
        if (parts.length >= 3) {
            const fullyQualifiedName = parts.slice(2).join(':');
            const nameParts = fullyQualifiedName.split('.');
            return nameParts[nameParts.length - 1];
        }
        return null;
    }
    extractFullyQualifiedNameFromSpoonId(spoonId) {
        if (!spoonId)
            return null;
        const parts = spoonId.split(':');
        if (parts.length >= 3) {
            return parts.slice(2).join(':');
        }
        return null;
    }
};
exports.GraphService = GraphService;
exports.GraphService = GraphService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.TekProject)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.Codebase)),
    __param(3, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof neo4j_service_1.Neo4jService !== "undefined" && neo4j_service_1.Neo4jService) === "function" ? _a : Object, typeof (_b = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _b : Object, typeof (_c = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _c : Object, typeof (_d = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _d : Object])
], GraphService);


/***/ }),
/* 73 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Neo4jService = void 0;
const common_1 = __webpack_require__(2);
const nest_winston_1 = __webpack_require__(5);
const neo4j_driver_1 = __webpack_require__(74);
let Neo4jService = class Neo4jService {
    constructor(logger) {
        this.logger = logger;
        this.driver = null;
        this.isConnected = false;
        this.database = 'neo4j';
    }
    async connect(config) {
        if (this.isConnected && this.driver) {
            return;
        }
        try {
            this.logger.debug(`[NEO4J] Connecting to Neo4j at ${config.url}`);
            this.database = config.database;
            this.driver = (0, neo4j_driver_1.driver)(config.url, neo4j_driver_1.auth.basic(config.username, config.password), {
                maxConnectionLifetime: 30 * 60 * 1000,
                maxConnectionPoolSize: 50,
                connectionAcquisitionTimeout: 60000,
            });
            const session = this.driver.session({ database: this.database });
            await session.run('RETURN 1');
            await session.close();
            this.isConnected = true;
            this.logger.log(`[NEO4J] Successfully connected to Neo4j database: ${config.database}`);
        }
        catch (error) {
            this.logger.error(`[NEO4J] Failed to connect to Neo4j`, {
                error: error instanceof Error ? error.message : String(error),
                url: config.url,
                database: config.database
            });
            throw error;
        }
    }
    async disconnect() {
        if (this.driver) {
            await this.driver.close();
            this.driver = null;
            this.isConnected = false;
            this.logger.debug(`[NEO4J] Disconnected from Neo4j`);
        }
    }
    getSession() {
        if (!this.driver || !this.isConnected) {
            throw new Error('Neo4j driver not connected. Call connect() first.');
        }
        return this.driver.session({ database: this.database });
    }
    async createOrUpdateProject(projectId, projectName) {
        const session = this.getSession();
        try {
            await session.run(`
        MERGE (p:Project {projectId: $projectId})
        SET p.name = $projectName,
            p.updatedAt = datetime()
        `, { projectId, projectName });
            this.logger.debug(`[NEO4J] Created/updated project node: ${projectId}`);
        }
        finally {
            await session.close();
        }
    }
    async createOrUpdateCodebase(projectId, codebaseId, codebaseName, gitUrl, language, framework, lastIndexedCommit) {
        const session = this.getSession();
        try {
            const query = `
        MATCH (p:Project {projectId: $projectId})
        MERGE (c:Codebase {id: $codebaseId})
        SET c.name = $codebaseName,
            c.gitUrl = $gitUrl,
            c.language = $language,
            c.lastIndexedCommit = $lastIndexedCommit,
            c.updatedAt = datetime()
        ${framework ? ', c.framework = $framework' : ''}
        MERGE (p)-[:HAS_CODEBASE]->(c)
      `;
            const parameters = {
                projectId,
                codebaseId,
                codebaseName,
                gitUrl,
                language,
                lastIndexedCommit
            };
            if (framework) {
                parameters.framework = framework;
            }
            await session.run(query, parameters);
            this.logger.debug(`[NEO4J] Created/updated codebase node: ${codebaseId}`);
        }
        finally {
            await session.close();
        }
    }
    async deleteFilesFromCodebase(codebaseId, filePaths) {
        if (filePaths.length === 0) {
            return { nodesCreated: 0, nodesUpdated: 0, relationshipsCreated: 0, relationshipsUpdated: 0 };
        }
        const session = this.getSession();
        try {
            const result = await session.run(`
        MATCH (c:Codebase {id: $codebaseId})-[:CONTAINS_FILE]->(f:File)
        WHERE f.path IN $filePaths
        
        // Delete all symbols and their relationships
        OPTIONAL MATCH (f)-[:DEFINES_CLASS|DEFINES_METHOD]->(symbol)
        OPTIONAL MATCH (symbol)-[r]-()
        
        WITH f, symbol, r, 
             count(DISTINCT symbol) as symbolsToDelete,
             count(DISTINCT r) as relationshipsToDelete
        
        DETACH DELETE symbol, f
        
        RETURN symbolsToDelete, relationshipsToDelete
        `, { codebaseId, filePaths });
            const record = result.records[0];
            const symbolsDeleted = record?.get('symbolsToDelete')?.toNumber() || 0;
            const relationshipsDeleted = record?.get('relationshipsToDelete')?.toNumber() || 0;
            this.logger.debug(`[NEO4J] Deleted ${filePaths.length} files with ${symbolsDeleted} symbols and ${relationshipsDeleted} relationships`);
            return {
                nodesCreated: 0,
                nodesUpdated: 0,
                relationshipsCreated: 0,
                relationshipsUpdated: 0,
                nodesDeleted: filePaths.length + symbolsDeleted,
                relationshipsDeleted
            };
        }
        finally {
            await session.close();
        }
    }
    async createConstraintsAndIndexes() {
        const session = this.getSession();
        try {
            const constraints = [
                'CREATE CONSTRAINT project_id_unique IF NOT EXISTS FOR (p:Project) REQUIRE p.projectId IS UNIQUE',
                'CREATE CONSTRAINT codebase_id_unique IF NOT EXISTS FOR (c:Codebase) REQUIRE c.id IS UNIQUE',
                'CREATE CONSTRAINT class_id_unique IF NOT EXISTS FOR (cl:Class) REQUIRE cl.id IS UNIQUE',
                'CREATE CONSTRAINT method_id_unique IF NOT EXISTS FOR (m:Method) REQUIRE m.id IS UNIQUE',
                'CREATE CONSTRAINT interface_id_unique IF NOT EXISTS FOR (i:Interface) REQUIRE i.id IS UNIQUE',
                'CREATE CONSTRAINT api_endpoint_id_unique IF NOT EXISTS FOR (a:APIEndpoint) REQUIRE a.id IS UNIQUE',
            ];
            for (const constraint of constraints) {
                try {
                    await session.run(constraint);
                }
                catch (error) {
                    this.logger.debug(`[NEO4J] Constraint creation result: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
            const indexes = [
                'CREATE INDEX file_path_index IF NOT EXISTS FOR (f:File) ON (f.path)',
                'CREATE INDEX class_name_index IF NOT EXISTS FOR (c:Class) ON (c.name)',
                'CREATE INDEX method_name_index IF NOT EXISTS FOR (m:Method) ON (m.name)',
                'CREATE INDEX class_fqn_index IF NOT EXISTS FOR (c:Class) ON (c.fullyQualifiedName)',
            ];
            for (const index of indexes) {
                try {
                    await session.run(index);
                }
                catch (error) {
                    this.logger.debug(`[NEO4J] Index creation result: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
            this.logger.log(`[NEO4J] Created constraints and indexes`);
        }
        finally {
            await session.close();
        }
    }
    async executeBatch(queries) {
        const session = this.getSession();
        const tx = session.beginTransaction();
        let nodesCreated = 0;
        let nodesUpdated = 0;
        let relationshipsCreated = 0;
        let relationshipsUpdated = 0;
        try {
            for (const { query, parameters } of queries) {
                const result = await tx.run(query, parameters);
                const summary = result.summary;
                if (summary && summary.counters) {
                    nodesCreated += summary.counters.updates().nodesCreated || 0;
                    nodesUpdated += summary.counters.updates().propertiesSet || 0;
                    relationshipsCreated += summary.counters.updates().relationshipsCreated || 0;
                }
            }
            await tx.commit();
            return {
                nodesCreated,
                nodesUpdated,
                relationshipsCreated,
                relationshipsUpdated
            };
        }
        catch (error) {
            await tx.rollback();
            throw error;
        }
        finally {
            await session.close();
        }
    }
    async createOrUpdateFile(codebaseId, filePath, fileName, checksum, lineCount) {
        const session = this.getSession();
        try {
            await session.run(`
        MATCH (c:Codebase {id: $codebaseId})
        MERGE (f:File {path: $filePath})
        SET f.fileName = $fileName,
            f.checksum = $checksum,
            f.lineCount = $lineCount,
            f.updatedAt = datetime()
        MERGE (c)-[:CONTAINS_FILE]->(f)
        `, { codebaseId, filePath, fileName, checksum, lineCount });
        }
        finally {
            await session.close();
        }
    }
    async createOrUpdateClass(fileId, classId, className, fullyQualifiedName, comment, visibility, isAbstract, isStatic) {
        const session = this.getSession();
        try {
            await session.run(`
        MATCH (f:File {path: $fileId})
        MERGE (c:Class {id: $classId})
        SET c.name = $className,
            c.fullyQualifiedName = $fullyQualifiedName,
            c.comment = $comment,
            c.visibility = $visibility,
            c.isAbstract = $isAbstract,
            c.isStatic = $isStatic,
            c.updatedAt = datetime()
        MERGE (f)-[:DEFINES_CLASS]->(c)
        `, {
                fileId,
                classId,
                className,
                fullyQualifiedName,
                comment,
                visibility,
                isAbstract,
                isStatic
            });
        }
        finally {
            await session.close();
        }
    }
    async createOrUpdateMethod(parentId, parentType, methodId, methodName, signature, returnType, comment, body, visibility, cyclomaticComplexity) {
        const session = this.getSession();
        try {
            const relationshipType = parentType === 'File' ? 'DEFINES_METHOD' : 'HAS_METHOD';
            await session.run(`
        MATCH (parent:${parentType} {${parentType === 'File' ? 'path' : 'id'}: $parentId})
        MERGE (m:Method {id: $methodId})
        SET m.name = $methodName,
            m.signature = $signature,
            m.returnType = $returnType,
            m.comment = $comment,
            m.body = $body,
            m.visibility = $visibility,
            m.cyclomaticComplexity = $cyclomaticComplexity,
            m.updatedAt = datetime()
        MERGE (parent)-[:${relationshipType}]->(m)
        `, {
                parentId,
                methodId,
                methodName,
                signature,
                returnType,
                comment,
                body,
                visibility,
                cyclomaticComplexity
            });
        }
        finally {
            await session.close();
        }
    }
    async onModuleDestroy() {
        await this.disconnect();
    }
};
exports.Neo4jService = Neo4jService;
exports.Neo4jService = Neo4jService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _a : Object])
], Neo4jService);


/***/ }),
/* 74 */
/***/ ((module) => {

module.exports = require("neo4j-driver");

/***/ }),
/* 75 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CleanupTask = void 0;
const common_1 = __webpack_require__(2);
const nest_winston_1 = __webpack_require__(5);
const base_task_interface_1 = __webpack_require__(61);
const fs = __webpack_require__(21);
const path = __webpack_require__(22);
let CleanupTask = class CleanupTask extends base_task_interface_1.BaseTask {
    constructor(logger) {
        super();
        this.logger = logger;
        this.name = 'CLEANUP';
        this.description = 'Clean up temporary files and resources';
        this.requiredTasks = [];
        this.optionalTasks = ['GIT_SYNC', 'CODE_PARSING', 'GRAPH_UPDATE'];
    }
    getConfig(_context) {
        return {
            enabled: true,
            timeout: 60000,
            retries: 1,
        };
    }
    shouldExecute(_context) {
        return true;
    }
    async validate(_context) {
    }
    async executeTask(context) {
        const { job, tempDirectory, workingDirectory } = context;
        const jobId = job.id;
        context.logger.info(`[${jobId}] [CLEANUP] Starting cleanup task`);
        try {
            let tempFilesRemoved = 0;
            let diskSpaceFreed = 0;
            if (tempDirectory) {
                try {
                    const tempStats = await this.getDirectorySize(tempDirectory);
                    await fs.rm(tempDirectory, { recursive: true, force: true });
                    tempFilesRemoved += tempStats.fileCount;
                    diskSpaceFreed += tempStats.totalSize;
                    context.logger.debug(`[${jobId}] [CLEANUP] Removed temporary directory`, {
                        path: tempDirectory,
                        filesRemoved: tempStats.fileCount,
                        sizeFreed: tempStats.totalSize
                    });
                }
                catch (error) {
                    context.logger.warn(`[${jobId}] [CLEANUP] Failed to remove temp directory`, {
                        path: tempDirectory,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            }
            if (workingDirectory && workingDirectory !== context.codebaseStoragePath) {
                try {
                    const workingStats = await this.getDirectorySize(workingDirectory);
                    await fs.rm(workingDirectory, { recursive: true, force: true });
                    tempFilesRemoved += workingStats.fileCount;
                    diskSpaceFreed += workingStats.totalSize;
                    context.logger.debug(`[${jobId}] [CLEANUP] Removed working directory`, {
                        path: workingDirectory,
                        filesRemoved: workingStats.fileCount,
                        sizeFreed: workingStats.totalSize
                    });
                }
                catch (error) {
                    context.logger.warn(`[${jobId}] [CLEANUP] Failed to remove working directory`, {
                        path: workingDirectory,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            }
            context.data.CLEANUP = {
                tempFilesRemoved,
                diskSpaceFreed,
            };
            context.logger.info(`[${jobId}] [CLEANUP] Cleanup completed successfully`, {
                tempFilesRemoved,
                diskSpaceFreed: this.formatBytes(diskSpaceFreed)
            });
            return {
                success: true,
                duration: 0,
                data: context.data.CLEANUP,
                metrics: {
                    filesProcessed: tempFilesRemoved,
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[${jobId}] [CLEANUP] Task failed with error`, {
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
            });
            return {
                success: false,
                duration: 0,
                error: errorMessage,
            };
        }
    }
    async getDirectorySize(dirPath) {
        let fileCount = 0;
        let totalSize = 0;
        try {
            const items = await fs.readdir(dirPath, { withFileTypes: true });
            for (const item of items) {
                const itemPath = path.join(dirPath, item.name);
                if (item.isDirectory()) {
                    const subDirStats = await this.getDirectorySize(itemPath);
                    fileCount += subDirStats.fileCount;
                    totalSize += subDirStats.totalSize;
                }
                else {
                    const stats = await fs.stat(itemPath);
                    fileCount++;
                    totalSize += stats.size;
                }
            }
        }
        catch (error) {
            this.logger.debug(`Failed to get directory size: ${dirPath}`, {
                error: error instanceof Error ? error.message : String(error)
            });
        }
        return { fileCount, totalSize };
    }
    formatBytes(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    async cleanup(context) {
        const { job } = context;
        const jobId = job.id;
        this.logger.debug(`[${jobId}] [CLEANUP] Starting task cleanup (cleanup of cleanup)`);
        this.logger.debug(`[${jobId}] [CLEANUP] Task cleanup completed`);
    }
    getEstimatedDuration(_context) {
        return 30000;
    }
};
exports.CleanupTask = CleanupTask;
exports.CleanupTask = CleanupTask = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _a : Object])
], CleanupTask);


/***/ }),
/* 76 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.JobWorkerService = void 0;
const common_1 = __webpack_require__(2);
const nest_winston_1 = __webpack_require__(5);
const worker_pool_service_1 = __webpack_require__(25);
const config_1 = __webpack_require__(4);
let JobWorkerService = class JobWorkerService {
    constructor(workerPoolService, configService, logger) {
        this.workerPoolService = workerPoolService;
        this.configService = configService;
        this.logger = logger;
        this.JOB_POOL_NAME = 'job-execution';
        this.logger.debug('[JOB-WORKER] Initializing job worker service', 'JobWorkerService');
    }
    async onModuleInit() {
        this.logger.log('[JOB-WORKER] Module initializing - setting up job worker pool', 'JobWorkerService');
        this.initializeJobPool();
        this.logger.log('[JOB-WORKER] Module initialization completed', 'JobWorkerService');
    }
    async submitJob(jobId, jobType, executeFn) {
        const timeout = this.getJobTimeout(jobType);
        this.logger.debug('[JOB-WORKER] Preparing job task for worker pool', {
            jobId,
            jobType,
            timeout,
            poolName: this.JOB_POOL_NAME
        });
        const task = {
            id: `job-${jobId}`,
            jobId,
            type: jobType,
            timeout,
            execute: executeFn,
        };
        this.logger.log('[JOB-WORKER] Submitting job to worker pool', {
            jobId,
            jobType,
            taskId: task.id,
            timeout: task.timeout
        });
        this.logger.log(`Submitting job ${jobId} to worker pool`);
        try {
            const submissionStartTime = Date.now();
            const result = await this.workerPoolService.submitTask(this.JOB_POOL_NAME, task);
            const submissionDuration = Date.now() - submissionStartTime;
            this.logger.log('[JOB-WORKER] Job completed successfully in worker pool', {
                jobId,
                jobType,
                status: result.status,
                duration: result.duration,
                submissionDuration,
                tasksExecuted: result.tasksExecuted,
                tasksSucceeded: result.tasksSucceeded,
                tasksFailed: result.tasksFailed
            });
            this.logger.log(`Job ${jobId} completed in worker pool`);
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('[JOB-WORKER] Job failed in worker pool', {
                jobId,
                jobType,
                taskId: task.id,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
            this.logger.error(`Job ${jobId} failed in worker pool:`, error);
            throw error;
        }
    }
    initializeJobPool() {
        const maxWorkers = this.configService.get('JOB_MAX_WORKERS', 4);
        const taskTimeout = this.configService.get('JOB_TASK_TIMEOUT', 1800000);
        this.logger.debug('[JOB-WORKER] Initializing job worker pool with configuration', {
            poolName: this.JOB_POOL_NAME,
            maxWorkers,
            taskTimeout,
            taskTimeoutMin: Math.round(taskTimeout / 60000)
        });
        this.workerPoolService.createPool(this.JOB_POOL_NAME, {
            maxWorkers,
            taskTimeout,
        });
        this.logger.log('[JOB-WORKER] Job worker pool initialized successfully', {
            poolName: this.JOB_POOL_NAME,
            maxWorkers,
            configuration: {
                taskTimeoutMin: Math.round(taskTimeout / 60000)
            }
        });
        this.logger.log(`Initialized job worker pool with ${maxWorkers} workers`);
    }
    getJobTimeout(jobType) {
        const baseTimeout = this.configService.get('JOB_TASK_TIMEOUT', 1800000);
        switch (jobType.toUpperCase()) {
            case 'CODEBASE_FULL':
                return baseTimeout * 3;
            case 'CODEBASE_INCR':
                return baseTimeout * 0.5;
            case 'DOCS_BUCKET_FULL':
            case 'DOCS_BUCKET_INCR':
                return baseTimeout * 0.3;
            case 'API_ANALYSIS':
            case 'USERFLOW_ANALYSIS':
                return baseTimeout * 2;
            default:
                return baseTimeout;
        }
    }
    getQueuePosition(_jobId) {
        return null;
    }
    async cancelQueuedJob(jobId) {
        this.logger.warn(`Job cancellation not yet implemented for ${jobId}`);
        return false;
    }
};
exports.JobWorkerService = JobWorkerService;
exports.JobWorkerService = JobWorkerService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof worker_pool_service_1.WorkerPoolService !== "undefined" && worker_pool_service_1.WorkerPoolService) === "function" ? _a : Object, typeof (_b = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _b : Object, typeof (_c = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _c : Object])
], JobWorkerService);


/***/ }),
/* 77 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.IndexingController = exports.CreateJobDto = void 0;
const common_1 = __webpack_require__(2);
const nest_winston_1 = __webpack_require__(5);
const swagger_1 = __webpack_require__(3);
const job_orchestrator_service_1 = __webpack_require__(59);
const index_job_entity_1 = __webpack_require__(18);
const typeorm_1 = __webpack_require__(10);
const typeorm_2 = __webpack_require__(13);
const entities_1 = __webpack_require__(11);
class CreateJobDto {
}
exports.CreateJobDto = CreateJobDto;
let IndexingController = class IndexingController {
    constructor(jobOrchestrator, codebaseRepository, logger) {
        this.jobOrchestrator = jobOrchestrator;
        this.codebaseRepository = codebaseRepository;
        this.logger = logger;
    }
    async createJob(dto) {
        this.logger.debug(`[CREATE-JOB] Full request details`, {
            projectId: dto.projectId,
            codebaseId: dto.codebaseId,
            type: dto.type,
            description: dto.description,
            baseCommit: dto.baseCommit,
            priority: dto.priority
        });
        try {
            const request = {
                projectId: dto.projectId,
                codebaseId: dto.codebaseId,
                type: dto.type,
                description: dto.description,
                baseCommit: dto.baseCommit,
                priority: dto.priority,
            };
            this.logger.debug(`[CREATE-JOB] Calling job orchestrator with request`);
            const job = await this.jobOrchestrator.createJob(request);
            this.logger.log(`[CREATE-JOB] Job created successfully`, {
                jobId: job.id,
                type: job.type,
                status: job.status,
                createdAt: job.createdAt
            });
            return {
                success: true,
                data: {
                    id: job.id,
                    type: job.type,
                    status: job.status,
                    createdAt: job.createdAt,
                },
                message: 'Index job created and started successfully',
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[CREATE-JOB] Failed to create job`, {
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
                projectId: dto.projectId,
                codebaseId: dto.codebaseId,
                type: dto.type
            });
            if (errorMessage.includes('not found')) {
                throw new common_1.NotFoundException(errorMessage);
            }
            throw new common_1.BadRequestException(errorMessage);
        }
    }
    async getJobStatus(jobId) {
        this.logger.debug(`[GET-JOB-STATUS] Retrieving job status`, {
            jobId
        });
        try {
            const job = await this.jobOrchestrator.getJobStatus(jobId);
            this.logger.debug(`[GET-JOB-STATUS] Job status retrieved successfully`, {
                jobId: job.id,
                type: job.type,
                status: job.status,
                progress: job.progress || 0,
                currentTask: job.currentTask,
                hasError: !!job.error,
                startedAt: job.startedAt,
                completedAt: job.completedAt,
                tasksCount: Object.keys(job.metadata?.tasks || {}).length
            });
            return {
                success: true,
                data: {
                    id: job.id,
                    type: job.type,
                    status: job.status,
                    progress: job.progress || 0,
                    currentTask: job.currentTask,
                    error: job.error,
                    startedAt: job.startedAt,
                    completedAt: job.completedAt,
                    tasks: job.metadata?.tasks || {},
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[GET-JOB-STATUS] Failed to retrieve job status`, {
                jobId,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
            if (errorMessage.includes('not found')) {
                throw new common_1.NotFoundException(errorMessage);
            }
            throw new common_1.BadRequestException(errorMessage);
        }
    }
    async cancelJob(jobId) {
        this.logger.log(`[CANCEL-JOB] Cancelling job`, {
            jobId
        });
        try {
            await this.jobOrchestrator.cancelJob(jobId);
            this.logger.log(`[CANCEL-JOB] Job cancelled successfully`, {
                jobId
            });
            return {
                success: true,
                message: 'Job cancelled successfully',
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[CANCEL-JOB] Failed to cancel job`, {
                jobId,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
            if (errorMessage.includes('not found')) {
                throw new common_1.NotFoundException(errorMessage);
            }
            throw new common_1.BadRequestException(errorMessage);
        }
    }
    async startFullIndexing(codebaseId, description) {
        this.logger.log(`[FULL-INDEX] Starting full indexing for codebase: ${codebaseId}`);
        try {
            const codebase = await this.codebaseRepository.findOne({
                where: { id: codebaseId },
                relations: ['project'],
            });
            if (!codebase) {
                throw new common_1.NotFoundException(`Codebase ${codebaseId} not found`);
            }
            const request = {
                projectId: codebase.project.id,
                codebaseId,
                type: index_job_entity_1.IndexJobType.CODEBASE_FULL,
                description: description || 'Full codebase indexing',
            };
            const job = await this.jobOrchestrator.createJob(request);
            return {
                success: true,
                data: {
                    jobId: job.id,
                    status: job.status,
                    codebaseId: codebase.id,
                    codebaseName: codebase.name,
                    projectId: codebase.project.id,
                },
                message: 'Full indexing started successfully',
            };
        }
        catch (error) {
            this.logger.error(`[FULL-INDEX] Error starting full indexing for codebase ${codebaseId}:`, error);
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Failed to start full indexing: ${error.message}`);
        }
    }
    async startIncrementalUpdate(codebaseId, fromCommit) {
        this.logger.log(`[INCREMENTAL-UPDATE] Starting incremental update for codebase`, {
            codebaseId,
            fromCommit
        });
        try {
            const codebase = await this.codebaseRepository.findOne({
                where: { id: codebaseId },
                relations: ['project'],
            });
            if (!codebase) {
                throw new common_1.NotFoundException(`Codebase ${codebaseId} not found`);
            }
            const request = {
                projectId: codebase.project.id,
                codebaseId,
                type: index_job_entity_1.IndexJobType.CODEBASE_INCR,
                baseCommit: fromCommit,
                description: 'Incremental codebase update',
            };
            const job = await this.jobOrchestrator.createJob(request);
            this.logger.log(`[INCREMENTAL-UPDATE] Incremental update job created successfully`, {
                jobId: job.id,
                status: job.status,
                codebaseId
            });
            return {
                success: true,
                data: {
                    jobId: job.id,
                    status: job.status,
                    codebaseId: codebase.id,
                    codebaseName: codebase.name,
                    projectId: codebase.project.id,
                },
                message: 'Incremental update started successfully',
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[INCREMENTAL-UPDATE] Failed to start incremental update`, {
                codebaseId,
                fromCommit,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
            throw new common_1.BadRequestException(`Failed to start incremental update: ${errorMessage}`);
        }
    }
    async startApiAnalysis(projectId, description) {
        this.logger.log(`[API-ANALYSIS] Starting API analysis for project: ${projectId}`);
        try {
            const request = {
                projectId,
                type: index_job_entity_1.IndexJobType.API_ANALYSIS,
                description: description || 'Project API analysis',
            };
            const job = await this.jobOrchestrator.createJob(request);
            return {
                success: true,
                data: {
                    jobId: job.id,
                    status: job.status,
                    projectId,
                },
                message: 'API analysis started successfully',
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[API-ANALYSIS] Failed to start API analysis`, { projectId, error: errorMessage });
            throw new common_1.BadRequestException(`Failed to start API analysis: ${errorMessage}`);
        }
    }
    async startUserflowAnalysis(projectId, description) {
        this.logger.log(`[USERFLOW-ANALYSIS] Starting user flow analysis for project: ${projectId}`);
        try {
            const request = {
                projectId,
                type: index_job_entity_1.IndexJobType.USERFLOW_ANALYSIS,
                description: description || 'Project user flow analysis',
            };
            const job = await this.jobOrchestrator.createJob(request);
            return {
                success: true,
                data: {
                    jobId: job.id,
                    status: job.status,
                    projectId,
                },
                message: 'User flow analysis started successfully',
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[USERFLOW-ANALYSIS] Failed to start user flow analysis`, { projectId, error: errorMessage });
            throw new common_1.BadRequestException(`Failed to start user flow analysis: ${errorMessage}`);
        }
    }
    async startDocsFullIndex(projectId, description) {
        this.logger.log(`[DOCS-FULL-INDEX] Starting full documentation indexing for project: ${projectId}`);
        try {
            const request = {
                projectId,
                type: index_job_entity_1.IndexJobType.DOCS_BUCKET_FULL,
                description: description || 'Full documentation indexing',
            };
            const job = await this.jobOrchestrator.createJob(request);
            return {
                success: true,
                data: {
                    jobId: job.id,
                    status: job.status,
                    projectId,
                },
                message: 'Full documentation indexing started successfully',
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[DOCS-FULL-INDEX] Failed to start full documentation indexing`, { projectId, error: errorMessage });
            throw new common_1.BadRequestException(`Failed to start full documentation indexing: ${errorMessage}`);
        }
    }
    async startDocsIncrementalIndex(projectId, description) {
        this.logger.log(`[DOCS-INCR-INDEX] Starting incremental documentation indexing for project: ${projectId}`);
        try {
            const request = {
                projectId,
                type: index_job_entity_1.IndexJobType.DOCS_BUCKET_INCR,
                description: description || 'Incremental documentation indexing',
            };
            const job = await this.jobOrchestrator.createJob(request);
            return {
                success: true,
                data: {
                    jobId: job.id,
                    status: job.status,
                    projectId,
                },
                message: 'Incremental documentation indexing started successfully',
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[DOCS-INCR-INDEX] Failed to start incremental documentation indexing`, { projectId, error: errorMessage });
            throw new common_1.BadRequestException(`Failed to start incremental documentation indexing: ${errorMessage}`);
        }
    }
    async listJobs(status, type, limit) {
        return {
            success: true,
            data: [],
            message: 'Job listing not yet implemented',
        };
    }
};
exports.IndexingController = IndexingController;
__decorate([
    (0, common_1.Post)('jobs'),
    (0, swagger_1.ApiOperation)({ summary: 'Create and start a new indexing job' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Job created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid request' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Project or codebase not found' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateJobDto]),
    __metadata("design:returntype", Promise)
], IndexingController.prototype, "createJob", null);
__decorate([
    (0, common_1.Get)('jobs/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get job status and progress' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Job ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Job status retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Job not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IndexingController.prototype, "getJobStatus", null);
__decorate([
    (0, common_1.Delete)('jobs/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel a running job' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Job ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Job cancelled successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Job not found' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Job cannot be cancelled' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IndexingController.prototype, "cancelJob", null);
__decorate([
    (0, common_1.Post)('codebases/:id/full-index'),
    (0, swagger_1.ApiOperation)({ summary: 'Start full codebase indexing' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Codebase ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Full indexing started' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('description')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], IndexingController.prototype, "startFullIndexing", null);
__decorate([
    (0, common_1.Post)('codebases/:id/incremental-update'),
    (0, swagger_1.ApiOperation)({ summary: 'Start incremental codebase update' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Codebase ID' }),
    (0, swagger_1.ApiQuery)({ name: 'fromCommit', required: true, description: 'Starting commit hash to compare from' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Incremental update started' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('fromCommit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], IndexingController.prototype, "startIncrementalUpdate", null);
__decorate([
    (0, common_1.Post)('projects/:id/api-analysis'),
    (0, swagger_1.ApiOperation)({ summary: 'Start API analysis for project' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Project ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'API analysis started' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('description')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], IndexingController.prototype, "startApiAnalysis", null);
__decorate([
    (0, common_1.Post)('projects/:id/userflow-analysis'),
    (0, swagger_1.ApiOperation)({ summary: 'Start user flow analysis for project' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Project ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'User flow analysis started' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('description')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], IndexingController.prototype, "startUserflowAnalysis", null);
__decorate([
    (0, common_1.Post)('projects/:id/docs-full-index'),
    (0, swagger_1.ApiOperation)({ summary: 'Start full documentation indexing for project' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Project ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Full documentation indexing started' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('description')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], IndexingController.prototype, "startDocsFullIndex", null);
__decorate([
    (0, common_1.Post)('projects/:id/docs-incremental-index'),
    (0, swagger_1.ApiOperation)({ summary: 'Start incremental documentation indexing for project' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Project ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Incremental documentation indexing started' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('description')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], IndexingController.prototype, "startDocsIncrementalIndex", null);
__decorate([
    (0, common_1.Get)('jobs'),
    (0, swagger_1.ApiOperation)({ summary: 'List all jobs for monitoring' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Jobs retrieved successfully' }),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number]),
    __metadata("design:returntype", Promise)
], IndexingController.prototype, "listJobs", null);
exports.IndexingController = IndexingController = __decorate([
    (0, swagger_1.ApiTags)('Indexing'),
    (0, common_1.Controller)('indexing'),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.Codebase)),
    __param(2, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof job_orchestrator_service_1.JobOrchestratorService !== "undefined" && job_orchestrator_service_1.JobOrchestratorService) === "function" ? _a : Object, typeof (_b = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _b : Object, typeof (_c = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _c : Object])
], IndexingController);


/***/ }),
/* 78 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.HealthModule = void 0;
const common_1 = __webpack_require__(2);
const terminus_1 = __webpack_require__(79);
const health_controller_1 = __webpack_require__(80);
let HealthModule = class HealthModule {
};
exports.HealthModule = HealthModule;
exports.HealthModule = HealthModule = __decorate([
    (0, common_1.Module)({
        imports: [terminus_1.TerminusModule],
        controllers: [health_controller_1.HealthController],
    })
], HealthModule);


/***/ }),
/* 79 */
/***/ ((module) => {

module.exports = require("@nestjs/terminus");

/***/ }),
/* 80 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.HealthController = void 0;
const common_1 = __webpack_require__(2);
const nest_winston_1 = __webpack_require__(5);
const terminus_1 = __webpack_require__(79);
let HealthController = class HealthController {
    constructor(health, db, memory, logger) {
        this.health = health;
        this.db = db;
        this.memory = memory;
        this.logger = logger;
    }
    async check() {
        const requestId = Math.random().toString(36).substring(2, 8);
        this.logger.debug(`[${requestId}] [HEALTH-CHECK] Starting comprehensive health check`);
        try {
            const healthCheckStartTime = Date.now();
            const result = await this.health.check([
                () => this.db.pingCheck('database'),
                () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
            ]);
            const healthCheckDuration = Date.now() - healthCheckStartTime;
            this.logger.debug(`[${requestId}] [HEALTH-CHECK] Health check completed successfully`, {
                status: result.status,
                duration: healthCheckDuration,
                checks: Object.keys(result.details || {}),
                allHealthy: result.status === 'ok'
            });
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[${requestId}] [HEALTH-CHECK] Health check failed`, {
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
            throw error;
        }
    }
    simpleCheck() {
        const requestId = Math.random().toString(36).substring(2, 8);
        this.logger.debug(`[${requestId}] [SIMPLE-HEALTH-CHECK] Performing simple health check`);
        const response = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'TekAI Context Engine',
            version: '2.0.0'
        };
        this.logger.debug(`[${requestId}] [SIMPLE-HEALTH-CHECK] Simple health check completed`, {
            status: response.status,
            service: response.service,
            version: response.version
        });
        return response;
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    (0, terminus_1.HealthCheck)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "check", null);
__decorate([
    (0, common_1.Get)('simple'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "simpleCheck", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)('health'),
    __param(3, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof terminus_1.HealthCheckService !== "undefined" && terminus_1.HealthCheckService) === "function" ? _a : Object, typeof (_b = typeof terminus_1.TypeOrmHealthIndicator !== "undefined" && terminus_1.TypeOrmHealthIndicator) === "function" ? _b : Object, typeof (_c = typeof terminus_1.MemoryHealthIndicator !== "undefined" && terminus_1.MemoryHealthIndicator) === "function" ? _c : Object, typeof (_d = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _d : Object])
], HealthController);


/***/ }),
/* 81 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AllExceptionsFilter = void 0;
const common_1 = __webpack_require__(2);
const nest_winston_1 = __webpack_require__(5);
let AllExceptionsFilter = class AllExceptionsFilter {
    constructor(logger) {
        this.logger = logger;
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const requestId = Math.random().toString(36).substring(2, 8);
        const httpStatus = exception instanceof common_1.HttpException
            ? exception.getStatus()
            : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = exception instanceof Error ? exception.message : String(exception);
        const errorStack = exception instanceof Error ? exception.stack : undefined;
        let errorResponse = errorMessage;
        if (exception instanceof common_1.HttpException) {
            errorResponse = exception.getResponse();
        }
        this.logger.error(`[${requestId}] [EXCEPTION-FILTER] Unhandled exception caught`, {
            requestId,
            method: request.method,
            url: request.url,
            statusCode: httpStatus,
            error: errorMessage,
            stack: errorStack,
            userAgent: request.headers['user-agent'],
            clientIp: request.ip || request.connection.remoteAddress,
            timestamp: new Date().toISOString(),
            requestHeaders: this.sanitizeHeaders(request.headers),
            requestBody: this.sanitizeBody(request.body),
            query: request.query,
            params: request.params,
            exceptionType: exception?.constructor?.name || 'Unknown',
            isHttpException: exception instanceof common_1.HttpException
        });
        const errorResponseBody = {
            success: false,
            statusCode: httpStatus,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message: this.getErrorMessage(errorResponse),
            error: httpStatus >= 500 ? 'Internal Server Error' : this.getErrorType(errorResponse),
            requestId,
        };
        if (process.env.NODE_ENV === 'development') {
            errorResponseBody['details'] = errorResponse;
            if (errorStack) {
                errorResponseBody['stack'] = errorStack;
            }
        }
        this.logger.debug(`[${requestId}] [EXCEPTION-FILTER] Sending error response`, {
            requestId,
            statusCode: httpStatus,
            responseBody: errorResponseBody,
            isDevelopment: process.env.NODE_ENV === 'development'
        });
        response.status(httpStatus).json(errorResponseBody);
    }
    getErrorMessage(errorResponse) {
        if (typeof errorResponse === 'string') {
            return errorResponse;
        }
        if (typeof errorResponse === 'object') {
            if (errorResponse.message) {
                return Array.isArray(errorResponse.message)
                    ? errorResponse.message.join(', ')
                    : errorResponse.message;
            }
            if (errorResponse.error) {
                return errorResponse.error;
            }
        }
        return 'An error occurred';
    }
    getErrorType(errorResponse) {
        if (typeof errorResponse === 'object' && errorResponse.error) {
            return errorResponse.error;
        }
        return 'Bad Request';
    }
    sanitizeHeaders(headers) {
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
        const sanitized = { ...headers };
        for (const header of sensitiveHeaders) {
            if (sanitized[header]) {
                sanitized[header] = '***REDACTED***';
            }
        }
        return sanitized;
    }
    sanitizeBody(body) {
        if (!body || typeof body !== 'object') {
            return body;
        }
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
        const sanitized = { ...body };
        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '***REDACTED***';
            }
        }
        return sanitized;
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = __decorate([
    (0, common_1.Catch)(),
    __param(0, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _a : Object])
], AllExceptionsFilter);


/***/ }),
/* 82 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LoggingInterceptor = void 0;
const common_1 = __webpack_require__(2);
const nest_winston_1 = __webpack_require__(5);
const operators_1 = __webpack_require__(83);
let LoggingInterceptor = class LoggingInterceptor {
    constructor(logger) {
        this.logger = logger;
    }
    intercept(context, next) {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest();
        const response = ctx.getResponse();
        const requestId = Math.random().toString(36).substring(2, 8);
        const startTime = Date.now();
        const { method, url, headers, body, query, params } = request;
        const userAgent = headers['user-agent'] || 'unknown';
        const clientIp = request.ip || request.connection.remoteAddress || 'unknown';
        this.logger.log(`[${requestId}] [REQUEST] Incoming ${method} ${url}`, {
            requestId,
            method,
            url,
            userAgent,
            clientIp,
            contentType: headers['content-type'],
            contentLength: headers['content-length'],
            hasBody: !!body && Object.keys(body).length > 0,
            queryParams: Object.keys(query || {}).length,
            pathParams: Object.keys(params || {}).length,
            timestamp: new Date().toISOString()
        });
        this.logger.debug(`[${requestId}] [REQUEST-DETAILS] Request details`, {
            requestId,
            headers: this.sanitizeHeaders(headers),
            query,
            params,
            bodyKeys: body ? Object.keys(body) : [],
            bodySize: body ? JSON.stringify(body).length : 0
        });
        return next.handle().pipe((0, operators_1.tap)((data) => {
            const duration = Date.now() - startTime;
            const statusCode = response.statusCode;
            this.logger.log(`[${requestId}] [RESPONSE] ${method} ${url} - ${statusCode}`, {
                requestId,
                method,
                url,
                statusCode,
                duration,
                responseSize: data ? JSON.stringify(data).length : 0,
                success: statusCode >= 200 && statusCode < 300,
                timestamp: new Date().toISOString()
            });
            this.logger.debug(`[${requestId}] [RESPONSE-DETAILS] Response details`, {
                requestId,
                statusCode,
                duration,
                responseHeaders: this.sanitizeHeaders(response.getHeaders()),
                responseDataKeys: data && typeof data === 'object' ? Object.keys(data) : [],
                responseType: typeof data
            });
        }), (0, operators_1.catchError)((error) => {
            const duration = Date.now() - startTime;
            const statusCode = response.statusCode || 500;
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[${requestId}] [ERROR] ${method} ${url} - ${statusCode}`, {
                requestId,
                method,
                url,
                statusCode,
                duration,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
                timestamp: new Date().toISOString()
            });
            throw error;
        }));
    }
    sanitizeHeaders(headers) {
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
        const sanitized = { ...headers };
        for (const header of sensitiveHeaders) {
            if (sanitized[header]) {
                sanitized[header] = '***REDACTED***';
            }
        }
        return sanitized;
    }
};
exports.LoggingInterceptor = LoggingInterceptor;
exports.LoggingInterceptor = LoggingInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _a : Object])
], LoggingInterceptor);


/***/ }),
/* 83 */
/***/ ((module) => {

module.exports = require("rxjs/operators");

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
const core_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const swagger_1 = __webpack_require__(3);
const config_1 = __webpack_require__(4);
const nest_winston_1 = __webpack_require__(5);
const app_module_1 = __webpack_require__(6);
const logging_interceptor_1 = __webpack_require__(82);
const all_exceptions_filter_1 = __webpack_require__(81);
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const winstonLogger = app.get(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER);
    app.useLogger(winstonLogger);
    winstonLogger.log('Starting TekAI Context Engine application bootstrap', 'Bootstrap');
    const configService = app.get(config_1.ConfigService);
    const port = configService.get('PORT', 3000);
    const nodeEnv = configService.get('NODE_ENV', 'development');
    winstonLogger.log('Configuration loaded', 'Bootstrap');
    winstonLogger.log({
        port: port.toString(),
        nodeEnv,
        hasWinstonLogger: true
    }, 'Bootstrap');
    app.useGlobalFilters(app.get(all_exceptions_filter_1.AllExceptionsFilter));
    winstonLogger.log('Global exception filter registered', 'Bootstrap');
    app.useGlobalInterceptors(app.get(logging_interceptor_1.LoggingInterceptor));
    winstonLogger.log('Global logging interceptor registered', 'Bootstrap');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    winstonLogger.log('Global validation pipe registered', 'Bootstrap');
    const corsOrigins = nodeEnv === 'development' ? true : process.env.ALLOWED_ORIGINS?.split(',');
    app.enableCors({
        origin: corsOrigins,
        credentials: true,
    });
    winstonLogger.log('CORS configuration applied', 'Bootstrap');
    winstonLogger.log({
        nodeEnv,
        corsOrigins: nodeEnv === 'development' ? 'development (all origins)' : corsOrigins
    }, 'Bootstrap');
    app.setGlobalPrefix('api/v1');
    winstonLogger.log('Global API prefix set to: api/v1', 'Bootstrap');
    if (nodeEnv === 'development') {
        winstonLogger.log('Setting up Swagger documentation for development environment', 'Bootstrap');
        const config = new swagger_1.DocumentBuilder()
            .setTitle('TekAI Context Engine API')
            .setDescription('Production-ready Context Engine for LLM with project-based structure')
            .setVersion('2.0.0')
            .addBearerAuth()
            .addTag('projects', 'Project management operations')
            .addTag('codebases', 'Codebase management operations')
            .addTag('sync', 'Synchronization operations')
            .addTag('files', 'File operations')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, config);
        swagger_1.SwaggerModule.setup('api/docs', app, document);
        winstonLogger.log('Swagger documentation setup completed at: /api/docs', 'Bootstrap');
    }
    await app.listen(port);
    winstonLogger.log('TekAI Context Engine started successfully', 'Bootstrap');
    winstonLogger.log({
        port: port.toString(),
        nodeEnv,
        url: `http://localhost:${port}`,
        apiPrefix: 'api/v1',
        docsUrl: nodeEnv === 'development' ? `http://localhost:${port}/api/docs` : 'disabled',
        timestamp: new Date().toISOString()
    }, 'Bootstrap');
    console.log(`🚀 TekAI Context Engine is running on: http://localhost:${port}`);
    if (nodeEnv === 'development') {
        console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
    }
}
bootstrap().catch((error) => {
    console.error('❌ Error starting the application:', error);
    process.exit(1);
});

})();

/******/ })()
;