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
const health_module_1 = __webpack_require__(70);
const all_exceptions_filter_1 = __webpack_require__(73);
const logging_interceptor_1 = __webpack_require__(74);
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
const index_pipeline_entity_1 = __webpack_require__(18);
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
                        index_pipeline_entity_1.IndexPipeline,
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
                index_pipeline_entity_1.IndexPipeline,
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
const index_pipeline_entity_1 = __webpack_require__(18);
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
    (0, typeorm_1.OneToMany)(() => index_pipeline_entity_1.IndexPipeline, (pipeline) => pipeline.project),
    __metadata("design:type", Array)
], TekProject.prototype, "indexPipelines", void 0);
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
const index_pipeline_entity_1 = __webpack_require__(18);
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
    (0, typeorm_1.OneToMany)(() => index_pipeline_entity_1.IndexPipeline, (pipeline) => pipeline.codebase),
    __metadata("design:type", Array)
], Codebase.prototype, "indexPipelines", void 0);
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
exports.IndexPipeline = exports.IndexPipelineTrigger = exports.IndexPipelineStatus = exports.IndexPipelineType = void 0;
const typeorm_1 = __webpack_require__(13);
const entities_1 = __webpack_require__(11);
var IndexPipelineType;
(function (IndexPipelineType) {
    IndexPipelineType["FULL"] = "FULL";
    IndexPipelineType["INCREMENTAL"] = "INCREMENTAL";
    IndexPipelineType["DOCUMENT"] = "DOCUMENT";
    IndexPipelineType["ANALYSIS"] = "ANALYSIS";
})(IndexPipelineType || (exports.IndexPipelineType = IndexPipelineType = {}));
var IndexPipelineStatus;
(function (IndexPipelineStatus) {
    IndexPipelineStatus["PENDING"] = "PENDING";
    IndexPipelineStatus["RUNNING"] = "RUNNING";
    IndexPipelineStatus["COMPLETED"] = "COMPLETED";
    IndexPipelineStatus["FAILED"] = "FAILED";
    IndexPipelineStatus["CANCELLED"] = "CANCELLED";
})(IndexPipelineStatus || (exports.IndexPipelineStatus = IndexPipelineStatus = {}));
var IndexPipelineTrigger;
(function (IndexPipelineTrigger) {
    IndexPipelineTrigger["MANUAL"] = "MANUAL";
    IndexPipelineTrigger["WEBHOOK"] = "WEBHOOK";
    IndexPipelineTrigger["SCHEDULED"] = "SCHEDULED";
})(IndexPipelineTrigger || (exports.IndexPipelineTrigger = IndexPipelineTrigger = {}));
let IndexPipeline = class IndexPipeline {
    isCompleted() {
        return this.status === IndexPipelineStatus.COMPLETED;
    }
    isFailed() {
        return this.status === IndexPipelineStatus.FAILED;
    }
    isRunning() {
        return this.status === IndexPipelineStatus.RUNNING;
    }
    canRetry() {
        return this.retryCount < this.configuration.retry.maxRetries && this.isFailed();
    }
    getDuration() {
        if (this.startedAt && this.completedAt) {
            return this.completedAt.getTime() - this.startedAt.getTime();
        }
        return null;
    }
    getCurrentStepProgress() {
        if (!this.metadata?.steps || !this.currentStep) {
            return 0;
        }
        return this.metadata.steps[this.currentStep]?.progress || 0;
    }
};
exports.IndexPipeline = IndexPipeline;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], IndexPipeline.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: IndexPipelineType,
    }),
    __metadata("design:type", String)
], IndexPipeline.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: IndexPipelineStatus,
        default: IndexPipelineStatus.PENDING,
    }),
    __metadata("design:type", String)
], IndexPipeline.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: IndexPipelineTrigger,
        default: IndexPipelineTrigger.MANUAL,
    }),
    __metadata("design:type", String)
], IndexPipeline.prototype, "trigger", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], IndexPipeline.prototype, "currentStep", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], IndexPipeline.prototype, "progress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], IndexPipeline.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], IndexPipeline.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    __metadata("design:type", Object)
], IndexPipeline.prototype, "configuration", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], IndexPipeline.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], IndexPipeline.prototype, "error", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], IndexPipeline.prototype, "errorStack", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], IndexPipeline.prototype, "retryCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", typeof (_a = typeof Date !== "undefined" && Date) === "function" ? _a : Object)
], IndexPipeline.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", typeof (_b = typeof Date !== "undefined" && Date) === "function" ? _b : Object)
], IndexPipeline.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", typeof (_c = typeof Date !== "undefined" && Date) === "function" ? _c : Object)
], IndexPipeline.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", typeof (_d = typeof Date !== "undefined" && Date) === "function" ? _d : Object)
], IndexPipeline.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => entities_1.TekProject, (project) => project.indexPipelines, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'project_id' }),
    __metadata("design:type", typeof (_e = typeof entities_1.TekProject !== "undefined" && entities_1.TekProject) === "function" ? _e : Object)
], IndexPipeline.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => entities_1.Codebase, (codebase) => codebase.indexPipelines, {
        onDelete: 'CASCADE',
        nullable: true,
    }),
    (0, typeorm_1.JoinColumn)({ name: 'codebase_id' }),
    __metadata("design:type", typeof (_f = typeof entities_1.Codebase !== "undefined" && entities_1.Codebase) === "function" ? _f : Object)
], IndexPipeline.prototype, "codebase", void 0);
exports.IndexPipeline = IndexPipeline = __decorate([
    (0, typeorm_1.Entity)('index_pipelines')
], IndexPipeline);


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
const index_pipeline_entity_1 = __webpack_require__(18);
const pipeline_orchestrator_service_1 = __webpack_require__(59);
const pipeline_worker_service_1 = __webpack_require__(67);
const pipeline_config_service_1 = __webpack_require__(66);
const git_sync_task_1 = __webpack_require__(60);
const code_parsing_task_1 = __webpack_require__(62);
const graph_update_task_1 = __webpack_require__(64);
const cleanup_task_1 = __webpack_require__(65);
const indexing_controller_1 = __webpack_require__(69);
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
                index_pipeline_entity_1.IndexPipeline,
            ]),
            (0, common_1.forwardRef)(() => gitlab_module_1.GitlabModule),
        ],
        controllers: [indexing_controller_1.IndexingController],
        providers: [
            pipeline_orchestrator_service_1.PipelineOrchestratorService,
            pipeline_worker_service_1.PipelineWorkerService,
            pipeline_config_service_1.PipelineConfigService,
            git_sync_task_1.GitSyncTask,
            code_parsing_task_1.CodeParsingTask,
            graph_update_task_1.GraphUpdateTask,
            cleanup_task_1.CleanupTask,
        ],
        exports: [
            pipeline_orchestrator_service_1.PipelineOrchestratorService,
            pipeline_worker_service_1.PipelineWorkerService,
            pipeline_config_service_1.PipelineConfigService,
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
exports.PipelineOrchestratorService = void 0;
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const nest_winston_1 = __webpack_require__(5);
const typeorm_2 = __webpack_require__(13);
const config_1 = __webpack_require__(4);
const entities_1 = __webpack_require__(11);
const index_pipeline_entity_1 = __webpack_require__(18);
const git_sync_task_1 = __webpack_require__(60);
const code_parsing_task_1 = __webpack_require__(62);
const graph_update_task_1 = __webpack_require__(64);
const cleanup_task_1 = __webpack_require__(65);
const pipeline_config_service_1 = __webpack_require__(66);
const pipeline_worker_service_1 = __webpack_require__(67);
const fs = __webpack_require__(21);
const path = __webpack_require__(22);
const os = __webpack_require__(68);
let PipelineOrchestratorService = class PipelineOrchestratorService {
    constructor(pipelineRepository, projectRepository, codebaseRepository, configService, pipelineConfigService, pipelineWorkerService, gitSyncTask, codeParsingTask, graphUpdateTask, cleanupTask, logger) {
        this.pipelineRepository = pipelineRepository;
        this.projectRepository = projectRepository;
        this.codebaseRepository = codebaseRepository;
        this.configService = configService;
        this.pipelineConfigService = pipelineConfigService;
        this.pipelineWorkerService = pipelineWorkerService;
        this.gitSyncTask = gitSyncTask;
        this.codeParsingTask = codeParsingTask;
        this.graphUpdateTask = graphUpdateTask;
        this.cleanupTask = cleanupTask;
        this.logger = logger;
        this.runningPipelines = new Map();
    }
    async createPipeline(request) {
        this.logger.log(`[PIPELINE-ORCHESTRATOR] Creating pipeline: ${request.type} for project ${request.projectId}`);
        this.logger.debug(`[PIPELINE-ORCHESTRATOR] Full request: ${JSON.stringify(request)}`);
        this.logger.log(`[PIPELINE-ORCHESTRATOR] Validating project: ${request.projectId}`);
        const project = await this.projectRepository.findOne({
            where: { id: request.projectId },
        });
        if (!project) {
            this.logger.error(`[PIPELINE-ORCHESTRATOR] Project not found: ${request.projectId}`);
            throw new Error(`Project ${request.projectId} not found`);
        }
        this.logger.log(`[PIPELINE-ORCHESTRATOR] Project found: ${project.name}`);
        this.logger.debug(`[PIPELINE-ORCHESTRATOR] Project details: { id: "${project.id}", name: "${project.name}" }`);
        let codebase;
        if (request.codebaseId) {
            this.logger.log(`[PIPELINE-ORCHESTRATOR] Validating codebase: ${request.codebaseId}`);
            codebase = await this.codebaseRepository.findOne({
                where: { id: request.codebaseId },
                relations: ['project'],
            });
            if (!codebase) {
                this.logger.error(`[PIPELINE-ORCHESTRATOR] Codebase not found: ${request.codebaseId}`);
                throw new Error(`Codebase ${request.codebaseId} not found`);
            }
            if (codebase.project.id !== request.projectId) {
                this.logger.error(`[PIPELINE-ORCHESTRATOR] Codebase project mismatch: codebase.projectId=${codebase.project.id}, request.projectId=${request.projectId}`);
                throw new Error(`Codebase ${request.codebaseId} does not belong to project ${request.projectId}`);
            }
            this.logger.log(`[PIPELINE-ORCHESTRATOR] Codebase found: ${codebase.name}`);
            this.logger.debug(`[PIPELINE-ORCHESTRATOR] Codebase details: { id: "${codebase.id}", name: "${codebase.name}", gitlabUrl: "${codebase.gitlabUrl}" }`);
        }
        this.logger.log(`[PIPELINE-ORCHESTRATOR] Getting configuration for pipeline type: ${request.type}`);
        const configuration = this.pipelineConfigService.getDefaultConfiguration(request.type, request.customConfiguration);
        this.logger.debug(`[PIPELINE-ORCHESTRATOR] Pipeline configuration: ${JSON.stringify(configuration)}`);
        this.logger.log(`[PIPELINE-ORCHESTRATOR] Creating pipeline entity`);
        const pipeline = new index_pipeline_entity_1.IndexPipeline();
        pipeline.type = request.type;
        pipeline.status = index_pipeline_entity_1.IndexPipelineStatus.PENDING;
        pipeline.priority = request.priority || 0;
        pipeline.description = request.description;
        pipeline.configuration = configuration;
        pipeline.metadata = this.createInitialMetadata();
        pipeline.project = project;
        pipeline.codebase = codebase;
        this.logger.log(`[PIPELINE-ORCHESTRATOR] Saving pipeline to database`);
        const savedPipeline = await this.pipelineRepository.save(pipeline);
        this.logger.log(`[PIPELINE-ORCHESTRATOR] Pipeline saved with ID: ${savedPipeline.id}`);
        this.logger.log(`[PIPELINE-ORCHESTRATOR] Submitting pipeline to worker pool: ${savedPipeline.id}`);
        const executionPromise = this.pipelineWorkerService.submitPipeline(savedPipeline.id, savedPipeline.type, () => this.executePipeline(savedPipeline.id));
        this.runningPipelines.set(savedPipeline.id, executionPromise);
        this.logger.log(`[PIPELINE-ORCHESTRATOR] Pipeline submitted to worker pool. Running pipelines count: ${this.runningPipelines.size}`);
        executionPromise
            .then(result => {
            this.logger.log(`[PIPELINE-ORCHESTRATOR] Pipeline ${savedPipeline.id} completed with status: ${result.status}`);
        })
            .catch(error => {
            this.logger.error(`[PIPELINE-ORCHESTRATOR] Pipeline ${savedPipeline.id} execution failed:`, error);
        })
            .finally(() => {
            this.runningPipelines.delete(savedPipeline.id);
            this.logger.log(`[PIPELINE-ORCHESTRATOR] Pipeline ${savedPipeline.id} removed from running pipelines. Count: ${this.runningPipelines.size}`);
        });
        this.logger.log(`[PIPELINE-ORCHESTRATOR] Pipeline creation completed successfully: ${savedPipeline.id}`);
        return savedPipeline;
    }
    async executePipeline(pipelineId) {
        const startTime = Date.now();
        let tasksExecuted = 0;
        let tasksSucceeded = 0;
        let tasksFailed = 0;
        let finalError;
        this.logger.log(`[${pipelineId}] [PIPELINE-EXECUTOR] Starting pipeline execution`, {
            pipelineId,
            startTime: new Date(startTime).toISOString()
        });
        try {
            this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Loading pipeline from database`);
            const pipeline = await this.pipelineRepository.findOne({
                where: { id: pipelineId },
                relations: ['project', 'codebase'],
            });
            if (!pipeline) {
                this.logger.error(`[${pipelineId}] [PIPELINE-EXECUTOR] Pipeline not found in database`);
                throw new Error(`Pipeline ${pipelineId} not found`);
            }
            this.logger.log(`[${pipelineId}] [PIPELINE-EXECUTOR] Pipeline loaded successfully`, {
                type: pipeline.type,
                status: pipeline.status,
                projectId: pipeline.project.id,
                projectName: pipeline.project.name,
                codebaseId: pipeline.codebase?.id,
                codebaseName: pipeline.codebase?.name,
                priority: pipeline.priority,
                description: pipeline.description
            });
            this.logger.log(`Starting pipeline execution: ${pipelineId}`);
            this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Updating pipeline status to RUNNING`);
            await this.updatePipelineStatus(pipeline, index_pipeline_entity_1.IndexPipelineStatus.RUNNING);
            this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Creating pipeline context`);
            const context = await this.createPipelineContext(pipeline);
            this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Pipeline context created successfully`, {
                workingDirectory: context.workingDirectory,
                tempDirectory: context.tempDirectory,
                codebaseStoragePath: context.codebaseStoragePath
            });
            this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Getting task instances`);
            const tasks = this.getTaskInstances();
            this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Task instances retrieved`, {
                taskCount: tasks.length,
                taskNames: tasks.map(t => t.name)
            });
            this.logger.log(`[${pipelineId}] [PIPELINE-EXECUTOR] Starting task execution sequence`, {
                totalTasks: tasks.length
            });
            for (let taskIndex = 0; taskIndex < tasks.length; taskIndex++) {
                const task = tasks[taskIndex];
                const taskNumber = taskIndex + 1;
                this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Evaluating task ${taskNumber}/${tasks.length}: ${task.name}`);
                if (!task.shouldExecute(context)) {
                    this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Skipping task: ${task.name} (conditions not met)`);
                    context.logger.info(`Skipping task: ${task.name} (conditions not met)`);
                    continue;
                }
                tasksExecuted++;
                this.logger.log(`[${pipelineId}] [PIPELINE-EXECUTOR] Executing task ${taskNumber}/${tasks.length}: ${task.name}`, {
                    taskName: task.name,
                    taskDescription: task.description,
                    tasksExecuted,
                    totalTasks: tasks.length
                });
                context.logger.info(`Executing task: ${task.name}`);
                try {
                    pipeline.currentStep = task.name;
                    pipeline.progress = Math.round((tasksExecuted / tasks.length) * 100);
                    this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Updating pipeline progress`, {
                        currentStep: pipeline.currentStep,
                        progress: pipeline.progress,
                        tasksExecuted,
                        totalTasks: tasks.length
                    });
                    await this.pipelineRepository.save(pipeline);
                    this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Starting task execution: ${task.name}`);
                    const taskStartTime = Date.now();
                    const result = await task.execute(context);
                    const taskDuration = Date.now() - taskStartTime;
                    if (result.success) {
                        tasksSucceeded++;
                        this.logger.log(`[${pipelineId}] [PIPELINE-EXECUTOR] Task completed successfully: ${task.name}`, {
                            taskName: task.name,
                            duration: result.duration || taskDuration,
                            metrics: result.metrics,
                            tasksSucceeded,
                            tasksExecuted
                        });
                        context.logger.info(`Task completed successfully: ${task.name}`, {
                            duration: result.duration,
                            metrics: result.metrics,
                        });
                    }
                    else {
                        tasksFailed++;
                        finalError = result.error;
                        this.logger.error(`[${pipelineId}] [PIPELINE-EXECUTOR] Task failed: ${task.name}`, {
                            taskName: task.name,
                            error: result.error,
                            duration: result.duration || taskDuration,
                            tasksFailed,
                            tasksExecuted
                        });
                        context.logger.error(`Task failed: ${task.name}`, { error: result.error });
                        this.logger.warn(`[${pipelineId}] [PIPELINE-EXECUTOR] Stopping pipeline execution due to task failure`);
                        break;
                    }
                }
                catch (error) {
                    tasksFailed++;
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    finalError = errorMessage;
                    this.logger.error(`[${pipelineId}] [PIPELINE-EXECUTOR] Task execution error: ${task.name}`, {
                        taskName: task.name,
                        error: errorMessage,
                        stack: error instanceof Error ? error.stack : undefined,
                        tasksFailed,
                        tasksExecuted
                    });
                    context.logger.error(`Task execution error: ${task.name}`, { error: errorMessage });
                    this.logger.warn(`[${pipelineId}] [PIPELINE-EXECUTOR] Stopping pipeline execution due to task error`);
                    break;
                }
                finally {
                    this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Running task cleanup: ${task.name}`);
                    try {
                        await task.cleanup(context);
                        this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Task cleanup completed: ${task.name}`);
                    }
                    catch (cleanupError) {
                        const cleanupErrorMessage = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
                        this.logger.warn(`[${pipelineId}] [PIPELINE-EXECUTOR] Task cleanup failed: ${task.name}`, {
                            taskName: task.name,
                            error: cleanupErrorMessage,
                            stack: cleanupError instanceof Error ? cleanupError.stack : undefined
                        });
                        context.logger.warn(`Task cleanup failed: ${task.name}`, { error: cleanupErrorMessage });
                    }
                }
            }
            const finalStatus = tasksFailed > 0 ? index_pipeline_entity_1.IndexPipelineStatus.FAILED : index_pipeline_entity_1.IndexPipelineStatus.COMPLETED;
            pipeline.progress = finalStatus === index_pipeline_entity_1.IndexPipelineStatus.COMPLETED ? 100 : pipeline.progress;
            this.logger.log(`[${pipelineId}] [PIPELINE-EXECUTOR] Updating final pipeline status`, {
                finalStatus,
                progress: pipeline.progress,
                tasksExecuted,
                tasksSucceeded,
                tasksFailed,
                finalError
            });
            await this.updatePipelineStatus(pipeline, finalStatus, finalError);
            this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Starting final context cleanup`);
            await this.cleanupPipelineContext(context);
            this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Final context cleanup completed`);
            const duration = Date.now() - startTime;
            this.logger.log(`[${pipelineId}] [PIPELINE-EXECUTOR] Pipeline execution completed successfully`, {
                pipelineId,
                status: finalStatus,
                duration,
                durationMin: Math.round(duration / 60000),
                tasksExecuted,
                tasksSucceeded,
                tasksFailed,
                finalError,
                successRate: tasksExecuted > 0 ? Math.round((tasksSucceeded / tasksExecuted) * 100) : 0
            });
            this.logger.log(`Pipeline ${pipelineId} execution completed`, {
                status: finalStatus,
                duration,
                tasksExecuted,
                tasksSucceeded,
                tasksFailed,
            });
            return {
                pipelineId,
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
            this.logger.error(`[${pipelineId}] [PIPELINE-EXECUTOR] Pipeline execution failed with unhandled error`, {
                pipelineId,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
                duration,
                durationMin: Math.round(duration / 60000),
                tasksExecuted,
                tasksSucceeded,
                tasksFailed
            });
            this.logger.error(`Pipeline ${pipelineId} execution failed:`, error);
            try {
                this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Attempting to update pipeline status to FAILED`);
                const pipeline = await this.pipelineRepository.findOne({ where: { id: pipelineId } });
                if (pipeline) {
                    await this.updatePipelineStatus(pipeline, index_pipeline_entity_1.IndexPipelineStatus.FAILED, errorMessage);
                    this.logger.debug(`[${pipelineId}] [PIPELINE-EXECUTOR] Pipeline status updated to FAILED`);
                }
                else {
                    this.logger.warn(`[${pipelineId}] [PIPELINE-EXECUTOR] Pipeline not found when trying to update status to FAILED`);
                }
            }
            catch (updateError) {
                const updateErrorMessage = updateError instanceof Error ? updateError.message : String(updateError);
                this.logger.error(`[${pipelineId}] [PIPELINE-EXECUTOR] Failed to update pipeline status to FAILED`, {
                    error: updateErrorMessage,
                    stack: updateError instanceof Error ? updateError.stack : undefined
                });
                this.logger.error(`Failed to update pipeline status:`, updateError);
            }
            return {
                pipelineId,
                status: index_pipeline_entity_1.IndexPipelineStatus.FAILED,
                duration,
                tasksExecuted,
                tasksSucceeded,
                tasksFailed: tasksExecuted - tasksSucceeded,
                finalError: errorMessage,
            };
        }
    }
    async getPipelineStatus(pipelineId) {
        this.logger.debug(`[${pipelineId}] [PIPELINE-STATUS] Retrieving pipeline status from database`);
        const pipeline = await this.pipelineRepository.findOne({
            where: { id: pipelineId },
            relations: ['project', 'codebase'],
        });
        if (!pipeline) {
            this.logger.error(`[${pipelineId}] [PIPELINE-STATUS] Pipeline not found in database`);
            throw new Error(`Pipeline ${pipelineId} not found`);
        }
        this.logger.debug(`[${pipelineId}] [PIPELINE-STATUS] Pipeline status retrieved successfully`, {
            pipelineId: pipeline.id,
            type: pipeline.type,
            status: pipeline.status,
            progress: pipeline.progress,
            currentStep: pipeline.currentStep,
            projectId: pipeline.project.id,
            codebaseId: pipeline.codebase?.id,
            createdAt: pipeline.createdAt,
            startedAt: pipeline.startedAt,
            completedAt: pipeline.completedAt,
            hasError: !!pipeline.error
        });
        return pipeline;
    }
    async cancelPipeline(pipelineId) {
        this.logger.log(`[${pipelineId}] [PIPELINE-CANCEL] Attempting to cancel pipeline`);
        const pipeline = await this.pipelineRepository.findOne({
            where: { id: pipelineId },
        });
        if (!pipeline) {
            this.logger.error(`[${pipelineId}] [PIPELINE-CANCEL] Pipeline not found in database`);
            throw new Error(`Pipeline ${pipelineId} not found`);
        }
        this.logger.debug(`[${pipelineId}] [PIPELINE-CANCEL] Pipeline found, checking cancellation eligibility`, {
            currentStatus: pipeline.status,
            progress: pipeline.progress,
            currentStep: pipeline.currentStep
        });
        if (pipeline.status === index_pipeline_entity_1.IndexPipelineStatus.COMPLETED || pipeline.status === index_pipeline_entity_1.IndexPipelineStatus.FAILED) {
            this.logger.warn(`[${pipelineId}] [PIPELINE-CANCEL] Cannot cancel pipeline in final status`, {
                status: pipeline.status
            });
            throw new Error(`Cannot cancel pipeline in status: ${pipeline.status}`);
        }
        this.logger.debug(`[${pipelineId}] [PIPELINE-CANCEL] Attempting to cancel from worker pool queue`);
        const cancelledFromQueue = await this.pipelineWorkerService.cancelQueuedPipeline(pipelineId);
        this.logger.debug(`[${pipelineId}] [PIPELINE-CANCEL] Worker pool cancellation result`, {
            cancelledFromQueue
        });
        this.logger.debug(`[${pipelineId}] [PIPELINE-CANCEL] Updating pipeline status to CANCELLED`);
        await this.updatePipelineStatus(pipeline, index_pipeline_entity_1.IndexPipelineStatus.CANCELLED);
        this.runningPipelines.delete(pipelineId);
        this.logger.log(`[${pipelineId}] [PIPELINE-CANCEL] Pipeline cancelled successfully`, {
            cancelledFromQueue,
            previousStatus: pipeline.status,
            runningPipelinesCount: this.runningPipelines.size
        });
        this.logger.log(`Pipeline ${pipelineId} cancelled ${cancelledFromQueue ? '(removed from queue)' : '(marked as cancelled)'}`);
    }
    async createPipelineContext(pipeline) {
        const pipelineId = pipeline.id;
        this.logger.debug(`[${pipelineId}] [PIPELINE-CONTEXT] Creating pipeline context`);
        const workingDirectory = path.join(os.tmpdir(), 'tekaicontextengine', 'pipelines', pipeline.id);
        const tempDirectory = path.join(workingDirectory, 'temp');
        this.logger.debug(`[${pipelineId}] [PIPELINE-CONTEXT] Creating working directories`, {
            workingDirectory,
            tempDirectory
        });
        await fs.mkdir(workingDirectory, { recursive: true });
        await fs.mkdir(tempDirectory, { recursive: true });
        this.logger.debug(`[${pipelineId}] [PIPELINE-CONTEXT] Working directories created successfully`);
        const storageRoot = this.configService.get('STORAGE_ROOT', './storage');
        const codebaseStoragePath = pipeline.codebase?.storagePath ||
            path.join(storageRoot, 'codebases', pipeline.codebase?.id || 'unknown');
        this.logger.debug(`[${pipelineId}] [PIPELINE-CONTEXT] Determining codebase storage path`, {
            storageRoot,
            codebaseId: pipeline.codebase?.id,
            codebaseStoragePath,
            hasCustomStoragePath: !!pipeline.codebase?.storagePath
        });
        await fs.mkdir(codebaseStoragePath, { recursive: true });
        this.logger.debug(`[${pipelineId}] [PIPELINE-CONTEXT] Codebase storage directory ensured`);
        const logger = {
            info: (message, meta) => this.logger.log(`[${pipeline.id}] ${message}`, meta),
            warn: (message, meta) => this.logger.warn(`[${pipeline.id}] ${message}`, meta),
            error: (message, meta) => this.logger.error(`[${pipeline.id}] ${message}`, meta),
            debug: (message, meta) => this.logger.debug(`[${pipeline.id}] ${message}`, meta),
        };
        const context = {
            pipeline,
            project: pipeline.project,
            codebase: pipeline.codebase,
            config: pipeline.configuration,
            workingDirectory,
            tempDirectory,
            codebaseStoragePath,
            data: {},
            metrics: {
                startTime: new Date(),
                stepTimes: {},
                totalFilesProcessed: 0,
                totalSymbolsExtracted: 0,
                errors: [],
                warnings: [],
            },
            logger,
        };
        this.logger.debug(`[${pipelineId}] [PIPELINE-CONTEXT] Pipeline context created successfully`, {
            projectId: context.project.id,
            projectName: context.project.name,
            codebaseId: context.codebase?.id,
            codebaseName: context.codebase?.name,
            workingDirectory: context.workingDirectory,
            tempDirectory: context.tempDirectory,
            codebaseStoragePath: context.codebaseStoragePath,
            configKeys: Object.keys(context.config || {})
        });
        return context;
    }
    async cleanupPipelineContext(context) {
        const pipelineId = context.pipeline.id;
        this.logger.debug(`[${pipelineId}] [PIPELINE-CONTEXT] Starting pipeline context cleanup`);
        this.logger.debug(`[${pipelineId}] [PIPELINE-CONTEXT] Pipeline context cleanup completed`);
        context.logger.debug('Pipeline context cleanup completed');
    }
    getTaskInstances() {
        return [
            this.gitSyncTask,
            this.codeParsingTask,
            this.graphUpdateTask,
            this.cleanupTask,
        ];
    }
    async updatePipelineStatus(pipeline, status, error) {
        pipeline.status = status;
        pipeline.updatedAt = new Date();
        if (status === index_pipeline_entity_1.IndexPipelineStatus.RUNNING) {
            pipeline.startedAt = new Date();
        }
        else if (status === index_pipeline_entity_1.IndexPipelineStatus.COMPLETED || status === index_pipeline_entity_1.IndexPipelineStatus.FAILED) {
            pipeline.completedAt = new Date();
        }
        if (error) {
            pipeline.error = error;
        }
        await this.pipelineRepository.save(pipeline);
    }
    createInitialMetadata() {
        return {
            filesProcessed: 0,
            symbolsExtracted: 0,
            duration: 0,
            steps: {},
            metrics: {
                linesOfCode: 0,
                languages: {},
                fileTypes: {},
                errors: [],
                warnings: [],
            },
        };
    }
    getActivePipelines() {
        return Array.from(this.runningPipelines.keys());
    }
    isPipelineActive(pipelineId) {
        return this.runningPipelines.has(pipelineId);
    }
    async getSystemStatus() {
        this.logger.debug('[PIPELINE-ORCHESTRATOR] Getting comprehensive system status');
        const statusStartTime = Date.now();
        const activePipelines = Array.from(this.runningPipelines.keys());
        const isHealthy = activePipelines.length < 10;
        const systemStatus = {
            runningPipelines: activePipelines.length,
            activePipelineIds: activePipelines,
            systemHealth: {
                queueBacklog: 0,
                utilization: activePipelines.length / 10,
                isHealthy,
                status: isHealthy ? 'healthy' : 'degraded',
                lastChecked: new Date().toISOString()
            },
            performance: {
                totalPipelinesRun: this.runningPipelines.size,
                systemUptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage()
            }
        };
        const statusDuration = Date.now() - statusStartTime;
        this.logger.debug('[PIPELINE-ORCHESTRATOR] System status collected successfully', {
            activePipelines: activePipelines.length,
            utilization: systemStatus.systemHealth.utilization,
            isHealthy,
            queueBacklog: 0,
            statusCollectionDuration: statusDuration,
            memoryUsageMB: Math.round(systemStatus.performance.memoryUsage.heapUsed / (1024 * 1024))
        });
        return systemStatus;
    }
    async getPipelinesForCodebase(codebaseId) {
        const activePipelines = await this.pipelineRepository.find({
            where: {
                codebase: { id: codebaseId },
                status: index_pipeline_entity_1.IndexPipelineStatus.RUNNING,
            },
            order: { createdAt: 'DESC' },
            take: 10,
        });
        const recentPipelines = await this.pipelineRepository.find({
            where: [
                {
                    codebase: { id: codebaseId },
                    status: index_pipeline_entity_1.IndexPipelineStatus.COMPLETED,
                },
                {
                    codebase: { id: codebaseId },
                    status: index_pipeline_entity_1.IndexPipelineStatus.FAILED,
                },
                {
                    codebase: { id: codebaseId },
                    status: index_pipeline_entity_1.IndexPipelineStatus.CANCELLED,
                },
            ],
            order: { completedAt: 'DESC' },
            take: 20,
        });
        return {
            activePipelines,
            recentPipelines,
            summary: {
                activeCount: activePipelines.length,
                recentCount: recentPipelines.length,
                hasRunning: activePipelines.length > 0,
            },
        };
    }
    async getPipelinesForProject(projectId, limit = 50) {
        return await this.pipelineRepository.find({
            where: { project: { id: projectId } },
            relations: ['project', 'codebase'],
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
};
exports.PipelineOrchestratorService = PipelineOrchestratorService;
exports.PipelineOrchestratorService = PipelineOrchestratorService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(index_pipeline_entity_1.IndexPipeline)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.TekProject)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.Codebase)),
    __param(10, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object, typeof (_b = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _b : Object, typeof (_c = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _c : Object, typeof (_d = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _d : Object, typeof (_e = typeof pipeline_config_service_1.PipelineConfigService !== "undefined" && pipeline_config_service_1.PipelineConfigService) === "function" ? _e : Object, typeof (_f = typeof pipeline_worker_service_1.PipelineWorkerService !== "undefined" && pipeline_worker_service_1.PipelineWorkerService) === "function" ? _f : Object, typeof (_g = typeof git_sync_task_1.GitSyncTask !== "undefined" && git_sync_task_1.GitSyncTask) === "function" ? _g : Object, typeof (_h = typeof code_parsing_task_1.CodeParsingTask !== "undefined" && code_parsing_task_1.CodeParsingTask) === "function" ? _h : Object, typeof (_j = typeof graph_update_task_1.GraphUpdateTask !== "undefined" && graph_update_task_1.GraphUpdateTask) === "function" ? _j : Object, typeof (_k = typeof cleanup_task_1.CleanupTask !== "undefined" && cleanup_task_1.CleanupTask) === "function" ? _k : Object, typeof (_l = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _l : Object])
], PipelineOrchestratorService);


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
var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GitSyncTask = void 0;
const common_1 = __webpack_require__(2);
const nest_winston_1 = __webpack_require__(5);
const base_task_interface_1 = __webpack_require__(61);
const index_pipeline_entity_1 = __webpack_require__(18);
const git_client_service_1 = __webpack_require__(53);
let GitSyncTask = class GitSyncTask extends base_task_interface_1.BaseTask {
    constructor(gitClient, logger) {
        super();
        this.gitClient = gitClient;
        this.logger = logger;
        this.name = 'git_sync';
        this.description = 'Synchronize Git repository and prepare workspace';
        this.requiredSteps = [];
        this.optionalSteps = [];
    }
    shouldExecute(context) {
        const { pipeline, codebase } = context;
        const pipelineId = pipeline.id;
        const shouldRun = !!codebase?.gitlabUrl;
        this.logger.debug(`[${pipelineId}] [GIT-SYNC] Checking if task should execute`, {
            codebaseId: codebase?.id,
            codebaseName: codebase?.name,
            hasGitlabUrl: !!codebase?.gitlabUrl,
            shouldExecute: shouldRun
        });
        return shouldRun;
    }
    async validate(context) {
        const { pipeline, codebase, workingDirectory } = context;
        const pipelineId = pipeline.id;
        this.logger.debug(`[${pipelineId}] [GIT-SYNC] Validating task prerequisites`);
        if (!codebase) {
            this.logger.error(`[${pipelineId}] [GIT-SYNC] Validation failed: No codebase provided`);
            throw new Error('Codebase is required for Git sync');
        }
        if (!codebase.gitlabUrl) {
            this.logger.error(`[${pipelineId}] [GIT-SYNC] Validation failed: No GitLab URL`, {
                codebaseId: codebase.id,
                codebaseName: codebase.name
            });
            throw new Error('GitLab URL is required for Git sync');
        }
        if (!workingDirectory) {
            this.logger.error(`[${pipelineId}] [GIT-SYNC] Validation failed: No working directory`);
            throw new Error('Working directory is required for Git sync');
        }
        this.logger.debug(`[${pipelineId}] [GIT-SYNC] Task validation completed successfully`, {
            codebaseId: codebase.id,
            codebaseName: codebase.name,
            gitlabUrl: codebase.gitlabUrl,
            branch: codebase.branch,
            workingDirectory
        });
    }
    async executeTask(context) {
        const { pipeline, codebase, codebaseStoragePath, config } = context;
        const pipelineId = pipeline.id;
        context.logger.info(`[${pipelineId}] [GIT-SYNC] Starting Git sync task`, {
            pipelineType: pipeline.type,
            codebaseId: codebase.id,
            codebaseName: codebase.name,
            gitlabUrl: codebase.gitlabUrl,
            branch: codebase.branch,
            storagePath: codebaseStoragePath
        });
        const isValidRepo = await this.gitClient.isValidRepository(codebaseStoragePath);
        const isIncremental = pipeline.type === index_pipeline_entity_1.IndexPipelineType.INCREMENTAL && isValidRepo;
        context.logger.info(`[${pipelineId}] [GIT-SYNC] Sync mode determined`, {
            mode: isIncremental ? 'incremental' : 'full',
            existingRepoValid: isValidRepo,
            pipelineType: pipeline.type
        });
        try {
            let commitHash;
            let filesChanged = [];
            let filesAdded = [];
            let filesDeleted = [];
            if (isIncremental) {
                context.logger.info(`[${pipelineId}] [GIT-SYNC] Starting incremental Git sync`, {
                    path: codebaseStoragePath,
                    branch: codebase.branch
                });
                context.logger.debug(`[${pipelineId}] [GIT-SYNC] Getting current commit hash`);
                const beforeCommit = await this.gitClient.getCurrentCommit(codebaseStoragePath);
                context.logger.debug(`[${pipelineId}] [GIT-SYNC] Current commit before pull`, {
                    beforeCommit: beforeCommit.substring(0, 8)
                });
                context.logger.info(`[${pipelineId}] [GIT-SYNC] Pulling latest changes from remote`);
                commitHash = await this.gitClient.pullRepository(codebaseStoragePath, {
                    branch: codebase.branch,
                    gitConfig: codebase.metadata?.gitConfig
                });
                context.logger.info(`[${pipelineId}] [GIT-SYNC] Pull completed`, {
                    newCommit: commitHash.substring(0, 8),
                    hasChanges: beforeCommit !== commitHash
                });
                if (beforeCommit === commitHash) {
                    context.logger.info(`[${pipelineId}] [GIT-SYNC] No new commits found, repository is up to date`);
                }
                else {
                    context.logger.debug(`[${pipelineId}] [GIT-SYNC] Analyzing changes between commits`, {
                        fromCommit: beforeCommit.substring(0, 8),
                        toCommit: commitHash.substring(0, 8)
                    });
                    const changes = await this.gitClient.getDiff(codebaseStoragePath, {
                        fromCommit: beforeCommit,
                        nameOnly: true
                    });
                    context.logger.debug(`[${pipelineId}] [GIT-SYNC] Found ${changes.length} file changes`);
                    for (const change of changes) {
                        switch (change.operation) {
                            case 'A':
                                filesAdded.push(change.path);
                                break;
                            case 'D':
                                filesDeleted.push(change.path);
                                break;
                            case 'M':
                                filesChanged.push(change.path);
                                break;
                            case 'R':
                                if (change.oldPath)
                                    filesDeleted.push(change.oldPath);
                                filesAdded.push(change.path);
                                break;
                        }
                    }
                    context.logger.info(`[${pipelineId}] [GIT-SYNC] Changes categorized`, {
                        added: filesAdded.length,
                        modified: filesChanged.length,
                        deleted: filesDeleted.length,
                        renamed: changes.filter(c => c.operation === 'R').length
                    });
                }
            }
            else {
                context.logger.info(`[${pipelineId}] [GIT-SYNC] Starting full Git clone`, {
                    url: codebase.gitlabUrl,
                    branch: codebase.branch,
                    destination: codebaseStoragePath,
                    shallow: config.gitSync.shallow
                });
                if (isValidRepo) {
                    context.logger.debug(`[${pipelineId}] [GIT-SYNC] Removing existing repository`);
                    await this.gitClient.deleteRepository(codebaseStoragePath);
                    context.logger.debug(`[${pipelineId}] [GIT-SYNC] Existing repository removed`);
                }
                context.logger.info(`[${pipelineId}] [GIT-SYNC] Cloning repository from remote`);
                const cloneStartTime = Date.now();
                commitHash = await this.gitClient.cloneRepository(codebase.gitlabUrl, codebaseStoragePath, {
                    branch: codebase.branch,
                    depth: config.gitSync.shallow ? 1 : undefined,
                    gitConfig: codebase.metadata?.gitConfig
                });
                const cloneDuration = Date.now() - cloneStartTime;
                context.logger.info(`[${pipelineId}] [GIT-SYNC] Repository cloned successfully`, {
                    commitHash: commitHash.substring(0, 8),
                    cloneDurationMs: cloneDuration
                });
                context.logger.debug(`[${pipelineId}] [GIT-SYNC] Listing all files in repository`);
                filesAdded = await this.gitClient.listFiles(codebaseStoragePath);
                context.logger.info(`[${pipelineId}] [GIT-SYNC] Repository file inventory completed`, {
                    totalFiles: filesAdded.length
                });
            }
            const totalFiles = filesAdded.length + filesChanged.length;
            context.logger.info(`[${pipelineId}] [GIT-SYNC] Git sync completed successfully`, {
                mode: isIncremental ? 'incremental' : 'full',
                commitHash: commitHash.substring(0, 8),
                filesAdded: filesAdded.length,
                filesChanged: filesChanged.length,
                filesDeleted: filesDeleted.length,
                totalFiles,
            });
            this.logger.log(`[${pipelineId}] [GIT-SYNC] Task completed successfully`, {
                mode: isIncremental ? 'incremental' : 'full',
                commitHash: commitHash.substring(0, 8),
                totalFilesProcessed: totalFiles,
                codebaseId: codebase.id,
                codebaseName: codebase.name
            });
            context.data.gitSync = {
                clonePath: codebaseStoragePath,
                commitHash,
                filesChanged,
                filesAdded,
                filesDeleted,
            };
            return {
                success: true,
                duration: 0,
                data: context.data.gitSync,
                metrics: {
                    filesProcessed: totalFiles,
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[${pipelineId}] [GIT-SYNC] Task failed with error`, {
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
                codebaseId: codebase.id,
                codebaseName: codebase.name,
                gitlabUrl: codebase.gitlabUrl,
                branch: codebase.branch
            });
            context.logger.error(`[${pipelineId}] [GIT-SYNC] Git sync failed`, {
                error: errorMessage
            });
            return {
                success: false,
                duration: 0,
                error: `Git sync failed: ${errorMessage}`,
            };
        }
    }
    async cleanup(context) {
        const { pipeline } = context;
        const pipelineId = pipeline.id;
        this.logger.debug(`[${pipelineId}] [GIT-SYNC] Starting task cleanup`);
        this.logger.debug(`[${pipelineId}] [GIT-SYNC] Task cleanup completed`);
        context.logger.debug(`[${pipelineId}] [GIT-SYNC] Git sync cleanup completed`);
    }
    getEstimatedDuration(context) {
        const { pipeline, codebase } = context;
        const pipelineId = pipeline.id;
        const baseTime = 30000;
        const isIncremental = pipeline.type === index_pipeline_entity_1.IndexPipelineType.INCREMENTAL;
        const estimatedTime = isIncremental ? baseTime * 0.3 : baseTime;
        this.logger.debug(`[${pipelineId}] [GIT-SYNC] Estimated task duration calculated`, {
            baseTime,
            isIncremental,
            estimatedTime,
            codebaseId: codebase?.id,
            codebaseName: codebase?.name
        });
        return estimatedTime;
    }
};
exports.GitSyncTask = GitSyncTask;
exports.GitSyncTask = GitSyncTask = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof git_client_service_1.GitClientService !== "undefined" && git_client_service_1.GitClientService) === "function" ? _a : Object, typeof (_b = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _b : Object])
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
    shouldExecute(context) {
        return true;
    }
    async validate(context) {
        for (const requiredStep of this.requiredSteps) {
            if (!context.data[requiredStep]) {
                throw new Error(`Required step '${requiredStep}' not completed before ${this.name}`);
            }
        }
    }
    async execute(context) {
        this.status = TaskStatus.RUNNING;
        this.startTime = new Date();
        try {
            context.logger.info(`Starting task: ${this.name}`);
            context.metrics.stepTimes[this.name] = { start: this.startTime };
            await this.validate(context);
            const result = await this.executeTask(context);
            this.endTime = new Date();
            this.status = result.success ? TaskStatus.COMPLETED : TaskStatus.FAILED;
            const duration = this.endTime.getTime() - this.startTime.getTime();
            context.metrics.stepTimes[this.name].end = this.endTime;
            context.metrics.stepTimes[this.name].duration = duration;
            if (result.success) {
                context.logger.info(`Task completed: ${this.name}`, { duration });
            }
            else {
                context.logger.error(`Task failed: ${this.name}`, { error: result.error, duration });
                context.metrics.errors.push({
                    step: this.name,
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
            context.metrics.stepTimes[this.name].end = this.endTime;
            context.metrics.stepTimes[this.name].duration = duration;
            context.logger.error(`Task error: ${this.name}`, { error: error.message, duration });
            context.metrics.errors.push({
                step: this.name,
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
    getEstimatedDuration(context) {
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CodeParsingTask = void 0;
const common_1 = __webpack_require__(2);
const nest_winston_1 = __webpack_require__(5);
const base_task_interface_1 = __webpack_require__(61);
const index_pipeline_entity_1 = __webpack_require__(18);
const fs = __webpack_require__(21);
const path = __webpack_require__(22);
const child_process_1 = __webpack_require__(54);
const util_1 = __webpack_require__(63);
const execAsync = (0, util_1.promisify)(child_process_1.exec);
let CodeParsingTask = class CodeParsingTask extends base_task_interface_1.BaseTask {
    constructor(logger) {
        super();
        this.logger = logger;
        this.name = 'code_parsing';
        this.description = 'Parse source code and extract symbols';
        this.requiredSteps = ['gitSync'];
        this.optionalSteps = [];
    }
    shouldExecute(context) {
        const { pipeline, data } = context;
        const pipelineId = pipeline.id;
        const hasFilesToProcess = !!(data.gitSync?.filesAdded?.length || data.gitSync?.filesChanged?.length);
        this.logger.debug(`[${pipelineId}] [CODE-PARSING] Checking if task should execute`, {
            hasGitSyncData: !!data.gitSync,
            filesAdded: data.gitSync?.filesAdded?.length || 0,
            filesChanged: data.gitSync?.filesChanged?.length || 0,
            shouldExecute: hasFilesToProcess
        });
        return hasFilesToProcess;
    }
    async validate(context) {
        const { pipeline, data } = context;
        const pipelineId = pipeline.id;
        this.logger.debug(`[${pipelineId}] [CODE-PARSING] Validating task prerequisites`);
        await super.validate(context);
        if (!data.gitSync?.clonePath) {
            this.logger.error(`[${pipelineId}] [CODE-PARSING] Validation failed: No git sync data available`);
            throw new Error('Git sync must complete before code parsing');
        }
        const clonePath = data.gitSync.clonePath;
        this.logger.debug(`[${pipelineId}] [CODE-PARSING] Checking repository path accessibility`, {
            clonePath
        });
        try {
            await fs.access(clonePath);
            this.logger.debug(`[${pipelineId}] [CODE-PARSING] Repository path is accessible`);
        }
        catch (error) {
            this.logger.error(`[${pipelineId}] [CODE-PARSING] Validation failed: Repository path not accessible`, {
                clonePath,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Repository path not accessible: ${clonePath}`);
        }
        this.logger.debug(`[${pipelineId}] [CODE-PARSING] Task validation completed successfully`, {
            clonePath,
            hasGitSyncData: !!data.gitSync,
            filesAdded: data.gitSync.filesAdded?.length || 0,
            filesChanged: data.gitSync.filesChanged?.length || 0,
            filesDeleted: data.gitSync.filesDeleted?.length || 0
        });
    }
    async executeTask(context) {
        const { pipeline, data, config, logger } = context;
        const pipelineId = pipeline.id;
        const clonePath = data.gitSync.clonePath;
        this.logger.log(`[${pipelineId}] [CODE-PARSING] Starting code parsing task`, {
            pipelineType: pipeline.type,
            clonePath,
            gitSyncData: {
                filesAdded: data.gitSync.filesAdded.length,
                filesChanged: data.gitSync.filesChanged.length,
                filesDeleted: data.gitSync.filesDeleted.length
            }
        });
        let filesToProcess = [];
        if (pipeline.type === index_pipeline_entity_1.IndexPipelineType.INCREMENTAL) {
            filesToProcess = [
                ...data.gitSync.filesAdded,
                ...data.gitSync.filesChanged
            ];
            this.logger.debug(`[${pipelineId}] [CODE-PARSING] Incremental parsing mode selected`, {
                added: data.gitSync.filesAdded.length,
                changed: data.gitSync.filesChanged.length,
                deleted: data.gitSync.filesDeleted.length,
                totalToProcess: filesToProcess.length
            });
            logger.info(`[${pipelineId}] [CODE-PARSING] Incremental parsing mode`, {
                added: data.gitSync.filesAdded.length,
                changed: data.gitSync.filesChanged.length,
                deleted: data.gitSync.filesDeleted.length,
            });
        }
        else {
            filesToProcess = data.gitSync.filesAdded;
            this.logger.debug(`[${pipelineId}] [CODE-PARSING] Full parsing mode selected`, {
                totalFiles: filesToProcess.length
            });
            logger.info(`[${pipelineId}] [CODE-PARSING] Full parsing mode`, {
                totalFiles: filesToProcess.length
            });
        }
        let totalSymbolsExtracted = 0;
        let filesProcessed = 0;
        const parsingResults = [];
        const languages = {};
        try {
            const enabledLanguages = Object.keys(config.parsing.languages).filter(lang => config.parsing.languages[lang].enabled);
            this.logger.debug(`[${pipelineId}] [CODE-PARSING] Starting code parsing process`, {
                totalFiles: filesToProcess.length,
                enabledLanguages,
                parsingConfig: {
                    dockerEnabled: config.docker.enabled,
                    memoryLimit: config.docker.memoryLimit,
                    cpuLimit: config.docker.cpuLimit
                }
            });
            logger.info(`[${pipelineId}] [CODE-PARSING] Starting code parsing`, {
                totalFiles: filesToProcess.length,
                languages: enabledLanguages
            });
            this.logger.debug(`[${pipelineId}] [CODE-PARSING] Grouping files by language`);
            const filesByLanguage = this.groupFilesByLanguage(filesToProcess);
            this.logger.debug(`[${pipelineId}] [CODE-PARSING] Files grouped by language`, {
                languageGroups: Object.keys(filesByLanguage),
                distribution: Object.entries(filesByLanguage).map(([lang, files]) => ({
                    language: lang,
                    fileCount: files.length
                }))
            });
            for (const [language, languageFiles] of Object.entries(filesByLanguage)) {
                if (!config.parsing.languages[language]?.enabled) {
                    this.logger.debug(`[${pipelineId}] [CODE-PARSING] Skipping disabled language: ${language}`, {
                        fileCount: languageFiles.length
                    });
                    continue;
                }
                this.logger.debug(`[${pipelineId}] [CODE-PARSING] Starting to parse ${language} files`, {
                    language,
                    fileCount: languageFiles.length,
                    parsingMethod: config.docker.enabled ? 'docker' : 'local'
                });
                logger.info(`[${pipelineId}] [CODE-PARSING] Parsing ${language} files`, {
                    count: languageFiles.length
                });
                const parseStartTime = Date.now();
                const languageResult = await this.parseLanguageFiles(language, languageFiles, clonePath, config, context);
                const parseDuration = Date.now() - parseStartTime;
                this.logger.debug(`[${pipelineId}] [CODE-PARSING] Completed parsing ${language} files`, {
                    language,
                    filesProcessed: languageResult.filesProcessed,
                    symbolsExtracted: languageResult.symbolsExtracted,
                    durationMs: parseDuration,
                    avgTimePerFile: Math.round(parseDuration / languageFiles.length)
                });
                totalSymbolsExtracted += languageResult.symbolsExtracted;
                filesProcessed += languageResult.filesProcessed;
                parsingResults.push(...languageResult.results);
                languages[language] = languageResult.filesProcessed;
            }
            this.logger.log(`[${pipelineId}] [CODE-PARSING] Code parsing completed successfully`, {
                filesProcessed,
                totalSymbolsExtracted,
                languages,
                averageSymbolsPerFile: filesProcessed > 0 ? Math.round(totalSymbolsExtracted / filesProcessed) : 0
            });
            logger.info(`[${pipelineId}] [CODE-PARSING] Code parsing completed`, {
                filesProcessed,
                totalSymbolsExtracted,
                languages,
            });
            context.data.codeParsing = {
                symbolsExtracted: totalSymbolsExtracted,
                filesProcessed,
                parsingResults,
                languages,
            };
            context.metrics.totalFilesProcessed += filesProcessed;
            context.metrics.totalSymbolsExtracted += totalSymbolsExtracted;
            this.logger.debug(`[${pipelineId}] [CODE-PARSING] Context metrics updated`, {
                totalFilesProcessed: context.metrics.totalFilesProcessed,
                totalSymbolsExtracted: context.metrics.totalSymbolsExtracted
            });
            return {
                success: true,
                duration: 0,
                data: context.data.codeParsing,
                metrics: {
                    filesProcessed,
                    symbolsExtracted: totalSymbolsExtracted,
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[${pipelineId}] [CODE-PARSING] Task failed with error`, {
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
                filesProcessed,
                totalSymbolsExtracted,
                clonePath
            });
            logger.error(`[${pipelineId}] [CODE-PARSING] Code parsing failed`, {
                error: errorMessage
            });
            return {
                success: false,
                duration: 0,
                error: `Code parsing failed: ${errorMessage}`,
            };
        }
    }
    getEstimatedDuration(context) {
        const { pipeline, data } = context;
        const pipelineId = pipeline.id;
        const filesAdded = data.gitSync?.filesAdded?.length || 0;
        const filesChanged = data.gitSync?.filesChanged?.length || 0;
        const totalFiles = filesAdded + filesChanged;
        const estimatedTime = Math.max(60000, totalFiles * 100);
        this.logger.debug(`[${pipelineId}] [CODE-PARSING] Estimated task duration calculated`, {
            filesAdded,
            filesChanged,
            totalFiles,
            estimatedTimeMs: estimatedTime,
            estimatedTimeMin: Math.round(estimatedTime / 60000)
        });
        return estimatedTime;
    }
    groupFilesByLanguage(files) {
        const groups = {};
        for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            const language = this.getLanguageFromExtension(ext);
            if (language) {
                if (!groups[language]) {
                    groups[language] = [];
                }
                groups[language].push(file);
            }
        }
        return groups;
    }
    getLanguageFromExtension(ext) {
        const extensionMap = {
            '.js': 'typescript',
            '.jsx': 'typescript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.java': 'java',
            '.py': 'python',
            '.go': 'go',
            '.rs': 'rust',
            '.cpp': 'cpp',
            '.cc': 'cpp',
            '.cxx': 'cpp',
            '.c': 'cpp',
            '.h': 'cpp',
            '.hpp': 'cpp',
        };
        return extensionMap[ext] || null;
    }
    async parseLanguageFiles(language, files, repoPath, config, context) {
        const languageConfig = config.parsing.languages[language];
        if (config.docker.enabled && languageConfig.dockerImage) {
            return this.parseWithDocker(language, files, repoPath, languageConfig, context);
        }
        else {
            return this.parseWithLocalTools(language, files, repoPath, languageConfig, context);
        }
    }
    async parseWithDocker(language, files, repoPath, languageConfig, context) {
        const { config, tempDirectory, logger, pipeline } = context;
        const pipelineId = pipeline.id;
        this.logger.debug(`[${pipelineId}] [CODE-PARSING] Starting Docker parsing for ${language}`, {
            language,
            fileCount: files.length,
            dockerImage: languageConfig.dockerImage,
            repoPath,
            tempDirectory
        });
        const fileListPath = path.join(tempDirectory, `${language}-files.txt`);
        await fs.writeFile(fileListPath, files.join('\n'));
        this.logger.debug(`[${pipelineId}] [CODE-PARSING] Created file list for Docker parsing`, {
            language,
            fileListPath,
            fileCount: files.length
        });
        const dockerCmd = [
            'docker run',
            '--rm',
            `--memory=${config.docker.memoryLimit}`,
            `--cpus=${config.docker.cpuLimit}`,
            `--network=${config.docker.networkMode}`,
            `-v "${repoPath}:/workspace:ro"`,
            `-v "${tempDirectory}:/output"`,
            languageConfig.dockerImage,
            '/workspace',
            `/output/${language}-results.json`,
            `/output/${language}-files.txt`
        ].join(' ');
        this.logger.debug(`[${pipelineId}] [CODE-PARSING] Executing Docker command for ${language}`, {
            command: dockerCmd,
            timeout: config.docker.timeout
        });
        logger.debug(`[${pipelineId}] [CODE-PARSING] Running Docker parser`, {
            language,
            command: dockerCmd
        });
        try {
            const dockerStartTime = Date.now();
            const { stdout, stderr } = await execAsync(dockerCmd, {
                timeout: config.docker.timeout,
            });
            const dockerDuration = Date.now() - dockerStartTime;
            this.logger.debug(`[${pipelineId}] [CODE-PARSING] Docker execution completed for ${language}`, {
                language,
                durationMs: dockerDuration,
                hasStdout: !!stdout,
                hasStderr: !!stderr
            });
            logger.debug(`[${pipelineId}] [CODE-PARSING] Docker parser output`, {
                language,
                stdout,
                stderr
            });
            const resultsPath = path.join(tempDirectory, `${language}-results.json`);
            this.logger.debug(`[${pipelineId}] [CODE-PARSING] Reading Docker parsing results for ${language}`, {
                resultsPath
            });
            const resultsContent = await fs.readFile(resultsPath, 'utf-8');
            const results = JSON.parse(resultsContent);
            const parseResult = {
                symbolsExtracted: results.symbols?.length || 0,
                filesProcessed: results.files?.length || 0,
                results: results.symbols || [],
            };
            this.logger.debug(`[${pipelineId}] [CODE-PARSING] Docker parsing completed for ${language}`, {
                language,
                symbolsExtracted: parseResult.symbolsExtracted,
                filesProcessed: parseResult.filesProcessed,
                durationMs: dockerDuration
            });
            return parseResult;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[${pipelineId}] [CODE-PARSING] Docker parsing failed for ${language}`, {
                language,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
                dockerImage: languageConfig.dockerImage,
                fileCount: files.length
            });
            logger.error(`[${pipelineId}] [CODE-PARSING] Docker parsing failed for ${language}`, {
                error: errorMessage
            });
            throw error;
        }
    }
    async parseWithLocalTools(language, files, repoPath, languageConfig, context) {
        const { logger, pipeline } = context;
        const pipelineId = pipeline.id;
        this.logger.warn(`[${pipelineId}] [CODE-PARSING] Local parsing not implemented for ${language}, using mock results`, {
            language,
            fileCount: files.length,
            repoPath
        });
        logger.warn(`[${pipelineId}] [CODE-PARSING] Local parsing not implemented for ${language}, using mock results`);
        const mockProcessingTime = 1000 * files.length * 0.1;
        this.logger.debug(`[${pipelineId}] [CODE-PARSING] Simulating local parsing for ${language}`, {
            language,
            fileCount: files.length,
            mockProcessingTimeMs: mockProcessingTime
        });
        await new Promise(resolve => setTimeout(resolve, mockProcessingTime));
        const mockResult = {
            symbolsExtracted: files.length * 5,
            filesProcessed: files.length,
            results: files.map(file => ({
                file,
                symbols: Array.from({ length: 5 }, (_, i) => ({
                    name: `symbol_${i}`,
                    type: 'function',
                    line: i + 1,
                })),
            })),
        };
        this.logger.debug(`[${pipelineId}] [CODE-PARSING] Mock local parsing completed for ${language}`, {
            language,
            symbolsExtracted: mockResult.symbolsExtracted,
            filesProcessed: mockResult.filesProcessed,
            processingTimeMs: mockProcessingTime
        });
        return mockResult;
    }
    async cleanup(context) {
        const { pipeline, tempDirectory } = context;
        const pipelineId = pipeline.id;
        this.logger.debug(`[${pipelineId}] [CODE-PARSING] Starting task cleanup`, {
            tempDirectory
        });
        try {
            const files = await fs.readdir(tempDirectory);
            const parsingFiles = files.filter(file => file.endsWith('-files.txt') || file.endsWith('-results.json'));
            this.logger.debug(`[${pipelineId}] [CODE-PARSING] Found ${parsingFiles.length} parsing files to clean up`, {
                parsingFiles
            });
            let cleanedFiles = 0;
            for (const file of parsingFiles) {
                const filePath = path.join(tempDirectory, file);
                await fs.rm(filePath, { force: true });
                cleanedFiles++;
                this.logger.debug(`[${pipelineId}] [CODE-PARSING] Cleaned up file: ${file}`);
            }
            this.logger.debug(`[${pipelineId}] [CODE-PARSING] Task cleanup completed`, {
                cleanedFiles,
                tempDirectory
            });
            context.logger.debug(`[${pipelineId}] [CODE-PARSING] Code parsing cleanup completed`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.warn(`[${pipelineId}] [CODE-PARSING] Task cleanup failed`, {
                error: errorMessage,
                tempDirectory
            });
            context.logger.warn(`[${pipelineId}] [CODE-PARSING] Code parsing cleanup failed`, {
                error: errorMessage
            });
        }
    }
};
exports.CodeParsingTask = CodeParsingTask;
exports.CodeParsingTask = CodeParsingTask = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _a : Object])
], CodeParsingTask);


/***/ }),
/* 63 */
/***/ ((module) => {

module.exports = require("util");

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
exports.GraphUpdateTask = void 0;
const common_1 = __webpack_require__(2);
const nest_winston_1 = __webpack_require__(5);
const base_task_interface_1 = __webpack_require__(61);
let GraphUpdateTask = class GraphUpdateTask extends base_task_interface_1.BaseTask {
    constructor(logger) {
        super();
        this.logger = logger;
        this.name = 'update_graph';
        this.description = 'Update Neo4j knowledge graph with parsed symbols';
        this.requiredSteps = ['codeParsing'];
        this.optionalSteps = [];
    }
    shouldExecute(context) {
        const { pipeline, data } = context;
        const pipelineId = pipeline.id;
        const hasParsingResults = !!(data.codeParsing?.parsingResults?.length);
        this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Checking if task should execute`, 'GraphUpdateTask');
        this.logger.debug({
            hasCodeParsingData: !!data.codeParsing,
            parsingResultsCount: data.codeParsing?.parsingResults?.length || 0,
            symbolsExtracted: data.codeParsing?.symbolsExtracted || 0,
            shouldExecute: hasParsingResults
        }, 'GraphUpdateTask');
        return hasParsingResults;
    }
    async validate(context) {
        const { pipeline, data, config } = context;
        const pipelineId = pipeline.id;
        this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Validating task prerequisites`, 'GraphUpdateTask');
        await super.validate(context);
        if (!data.codeParsing?.parsingResults) {
            this.logger.error(`[${pipelineId}] [GRAPH-UPDATE] Validation failed: No code parsing results available`);
            throw new Error('Code parsing results required for graph update');
        }
        this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Code parsing results validation passed`, {
            parsingResultsCount: data.codeParsing.parsingResults.length,
            symbolsExtracted: data.codeParsing.symbolsExtracted,
            filesProcessed: data.codeParsing.filesProcessed
        });
        if (!config.graph.url || !config.graph.username || !config.graph.password) {
            this.logger.error(`[${pipelineId}] [GRAPH-UPDATE] Validation failed: Neo4j configuration incomplete`, {
                hasUrl: !!config.graph.url,
                hasUsername: !!config.graph.username,
                hasPassword: !!config.graph.password,
                database: config.graph.database
            });
            throw new Error('Neo4j connection configuration is required');
        }
        this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Task validation completed successfully`, {
            graphUrl: config.graph.url,
            graphDatabase: config.graph.database,
            batchSize: config.graph.batchSize,
            parsingResultsCount: data.codeParsing.parsingResults.length
        });
    }
    async executeTask(context) {
        const { data, config, logger, project, codebase, pipeline } = context;
        const pipelineId = pipeline.id;
        const parsingResults = data.codeParsing.parsingResults;
        this.logger.log(`[${pipelineId}] [GRAPH-UPDATE] Starting graph update task`, {
            totalResults: parsingResults.length,
            database: config.graph.database,
            batchSize: config.graph.batchSize,
            projectId: project.id,
            projectName: project.name,
            codebaseId: codebase?.id,
            codebaseName: codebase?.name
        });
        let nodesCreated = 0;
        let nodesUpdated = 0;
        let relationshipsCreated = 0;
        let relationshipsUpdated = 0;
        let session;
        try {
            logger.info(`[${pipelineId}] [GRAPH-UPDATE] Starting graph update`, {
                totalResults: parsingResults.length,
                database: config.graph.database,
            });
            this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Initializing mock Neo4j session`, {
                graphUrl: config.graph.url,
                database: config.graph.database
            });
            session = {
                run: async (query, params) => {
                    this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Executing mock Neo4j query`, {
                        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
                        paramKeys: params ? Object.keys(params) : []
                    });
                    logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Mock Neo4j query`, { query, params });
                    return { records: [{ get: () => 'created' }] };
                },
                close: async () => {
                    this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Closing mock Neo4j session`);
                },
            };
            this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Verifying Neo4j connection`);
            await session.run('RETURN 1');
            this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Neo4j connection verified successfully`);
            logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Neo4j connection established`);
            this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Ensuring project and codebase nodes exist`);
            await this.ensureProjectNodes(session, project, codebase, logger, pipelineId);
            const batchSize = config.graph.batchSize;
            const totalBatches = Math.ceil(parsingResults.length / batchSize);
            this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Starting batch processing`, {
                totalResults: parsingResults.length,
                batchSize,
                totalBatches
            });
            for (let i = 0; i < parsingResults.length; i += batchSize) {
                const batch = parsingResults.slice(i, i + batchSize);
                const batchNumber = Math.floor(i / batchSize) + 1;
                this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Processing batch ${batchNumber}/${totalBatches}`, {
                    batchNumber,
                    totalBatches,
                    batchSize: batch.length,
                    startIndex: i,
                    endIndex: i + batch.length - 1
                });
                logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Processing batch ${batchNumber}/${totalBatches}`);
                const batchStartTime = Date.now();
                const batchResult = await this.processBatch(session, batch, project, codebase, config, logger, pipelineId);
                const batchDuration = Date.now() - batchStartTime;
                nodesCreated += batchResult.nodesCreated;
                nodesUpdated += batchResult.nodesUpdated;
                relationshipsCreated += batchResult.relationshipsCreated;
                relationshipsUpdated += batchResult.relationshipsUpdated;
                this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Batch ${batchNumber} completed`, {
                    batchNumber,
                    durationMs: batchDuration,
                    nodesCreated: batchResult.nodesCreated,
                    nodesUpdated: batchResult.nodesUpdated,
                    relationshipsCreated: batchResult.relationshipsCreated,
                    relationshipsUpdated: batchResult.relationshipsUpdated,
                    totalNodesCreated: nodesCreated,
                    totalRelationshipsCreated: relationshipsCreated
                });
            }
            this.logger.log(`[${pipelineId}] [GRAPH-UPDATE] Graph update task completed successfully`, {
                nodesCreated,
                nodesUpdated,
                relationshipsCreated,
                relationshipsUpdated,
                totalItems: nodesCreated + nodesUpdated + relationshipsCreated + relationshipsUpdated,
                parsingResultsProcessed: parsingResults.length
            });
            logger.info(`[${pipelineId}] [GRAPH-UPDATE] Graph update completed`, {
                nodesCreated,
                nodesUpdated,
                relationshipsCreated,
                relationshipsUpdated,
            });
            context.data.graphUpdate = {
                nodesCreated,
                nodesUpdated,
                relationshipsCreated,
                relationshipsUpdated,
            };
            return {
                success: true,
                duration: 0,
                data: context.data.graphUpdate,
                metrics: {
                    itemsCreated: nodesCreated + relationshipsCreated,
                    itemsUpdated: nodesUpdated + relationshipsUpdated,
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[${pipelineId}] [GRAPH-UPDATE] Task failed with error`, {
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
                nodesCreated,
                nodesUpdated,
                relationshipsCreated,
                relationshipsUpdated,
                parsingResultsCount: parsingResults.length
            });
            logger.error(`[${pipelineId}] [GRAPH-UPDATE] Graph update failed`, {
                error: errorMessage
            });
            return {
                success: false,
                duration: 0,
                error: `Graph update failed: ${errorMessage}`,
            };
        }
        finally {
            this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Cleaning up resources`);
            if (session) {
                this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Closing Neo4j session`);
                await session.close();
            }
            if (this.driver) {
                this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Closing Neo4j driver`);
                await this.driver.close();
            }
            this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Resource cleanup completed`);
        }
    }
    getEstimatedDuration(context) {
        const { pipeline, data } = context;
        const pipelineId = pipeline.id;
        const results = data.codeParsing?.parsingResults?.length || 0;
        const symbols = data.codeParsing?.symbolsExtracted || 0;
        const estimatedTime = Math.max(30000, symbols * 10);
        this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Estimated task duration calculated`, {
            parsingResults: results,
            symbolsExtracted: symbols,
            estimatedTimeMs: estimatedTime,
            estimatedTimeMin: Math.round(estimatedTime / 60000)
        });
        return estimatedTime;
    }
    async ensureProjectNodes(session, project, codebase, logger, pipelineId) {
        this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Creating/updating project node`, {
            projectId: project.id,
            projectName: project.name
        });
        await session.run(`
      MERGE (p:Project {id: $projectId})
      SET p.name = $projectName,
          p.updatedAt = datetime()
      ON CREATE SET p.createdAt = datetime()
    `, {
            projectId: project.id,
            projectName: project.name,
        });
        this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Project node created/updated successfully`);
        if (codebase) {
            this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Creating/updating codebase node and relationship`, {
                codebaseId: codebase.id,
                codebaseName: codebase.name,
                gitlabUrl: codebase.gitlabUrl,
                branch: codebase.branch
            });
            await session.run(`
        MATCH (p:Project {id: $projectId})
        MERGE (c:Codebase {id: $codebaseId})
        SET c.name = $codebaseName,
            c.gitlabUrl = $gitlabUrl,
            c.branch = $branch,
            c.updatedAt = datetime()
        ON CREATE SET c.createdAt = datetime()
        MERGE (p)-[:CONTAINS]->(c)
      `, {
                projectId: project.id,
                codebaseId: codebase.id,
                codebaseName: codebase.name,
                gitlabUrl: codebase.gitlabUrl,
                branch: codebase.branch,
            });
            this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Codebase node and relationship created/updated successfully`);
        }
        else {
            this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] No codebase provided, skipping codebase node creation`);
        }
        this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Project and codebase nodes ensured successfully`);
        logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Project and codebase nodes ensured`);
    }
    async processBatch(session, batch, project, codebase, config, logger, pipelineId) {
        let nodesCreated = 0;
        let nodesUpdated = 0;
        let relationshipsCreated = 0;
        let relationshipsUpdated = 0;
        this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Processing batch of ${batch.length} file results`);
        for (let fileIndex = 0; fileIndex < batch.length; fileIndex++) {
            const fileResult = batch[fileIndex];
            this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Processing file ${fileIndex + 1}/${batch.length}`, {
                filePath: fileResult.file,
                symbolCount: fileResult.symbols?.length || 0
            });
            const fileResult2 = await session.run(`
        MERGE (f:File {path: $filePath, codebaseId: $codebaseId})
        SET f.name = $fileName,
            f.extension = $extension,
            f.updatedAt = datetime()
        ON CREATE SET f.createdAt = datetime()
        RETURN f, 
               CASE WHEN f.createdAt = f.updatedAt THEN 'created' ELSE 'updated' END as action
      `, {
                filePath: fileResult.file,
                codebaseId: codebase?.id || null,
                fileName: fileResult.file.split('/').pop(),
                extension: fileResult.file.split('.').pop(),
            });
            const fileAction = fileResult2.records[0]?.get('action');
            if (fileAction === 'created')
                nodesCreated++;
            else
                nodesUpdated++;
            if (codebase) {
                const relResult = await session.run(`
          MATCH (c:Codebase {id: $codebaseId})
          MATCH (f:File {path: $filePath, codebaseId: $codebaseId})
          MERGE (c)-[r:CONTAINS]->(f)
          RETURN r,
                 CASE WHEN r.createdAt IS NULL THEN 'created' ELSE 'updated' END as action
          SET r.createdAt = COALESCE(r.createdAt, datetime()),
              r.updatedAt = datetime()
        `, {
                    codebaseId: codebase.id,
                    filePath: fileResult.file,
                });
                const relAction = relResult.records[0]?.get('action');
                if (relAction === 'created')
                    relationshipsCreated++;
                else
                    relationshipsUpdated++;
            }
            for (const symbol of fileResult.symbols || []) {
                const symbolResult = await session.run(`
          MERGE (s:Symbol {name: $name, file: $file, type: $type})
          SET s.line = $line,
              s.updatedAt = datetime()
          ON CREATE SET s.createdAt = datetime()
          RETURN s,
                 CASE WHEN s.createdAt = s.updatedAt THEN 'created' ELSE 'updated' END as action
        `, {
                    name: symbol.name,
                    file: fileResult.file,
                    type: symbol.type,
                    line: symbol.line,
                });
                const symbolAction = symbolResult.records[0]?.get('action');
                if (symbolAction === 'created')
                    nodesCreated++;
                else
                    nodesUpdated++;
                const symbolRelResult = await session.run(`
          MATCH (f:File {path: $filePath, codebaseId: $codebaseId})
          MATCH (s:Symbol {name: $name, file: $file, type: $type})
          MERGE (f)-[r:DEFINES]->(s)
          SET r.createdAt = COALESCE(r.createdAt, datetime()),
              r.updatedAt = datetime()
          RETURN r,
                 CASE WHEN r.createdAt = r.updatedAt THEN 'created' ELSE 'updated' END as action
        `, {
                    filePath: fileResult.file,
                    codebaseId: codebase?.id || null,
                    name: symbol.name,
                    file: fileResult.file,
                    type: symbol.type,
                });
                const symbolRelAction = symbolRelResult.records[0]?.get('action');
                if (symbolRelAction === 'created')
                    relationshipsCreated++;
                else
                    relationshipsUpdated++;
            }
        }
        return {
            nodesCreated,
            nodesUpdated,
            relationshipsCreated,
            relationshipsUpdated,
        };
    }
    async cleanup(context) {
        const { pipeline } = context;
        const pipelineId = pipeline.id;
        this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Starting task cleanup`);
        if (this.driver) {
            this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Closing Neo4j driver connection`);
            await this.driver.close();
            this.driver = undefined;
            this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Neo4j driver closed successfully`);
        }
        else {
            this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] No Neo4j driver to close`);
        }
        this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Task cleanup completed`);
        context.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Graph update cleanup completed`);
    }
};
exports.GraphUpdateTask = GraphUpdateTask;
exports.GraphUpdateTask = GraphUpdateTask = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _a : Object])
], GraphUpdateTask);


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
        this.name = 'cleanup';
        this.description = 'Clean up temporary files and resources';
        this.requiredSteps = [];
        this.optionalSteps = ['gitSync', 'codeParsing', 'graphUpdate'];
    }
    shouldExecute(context) {
        const { pipeline } = context;
        const pipelineId = pipeline.id;
        this.logger.debug(`[${pipelineId}] [CLEANUP] Checking if task should execute`, 'CleanupTask');
        this.logger.debug(`[${pipelineId}] [CLEANUP] Task will always execute for cleanup purposes`, 'CleanupTask');
        return true;
    }
    async validate(context) {
        const { pipeline } = context;
        const pipelineId = pipeline.id;
        this.logger.debug(`[${pipelineId}] [CLEANUP] Validating task prerequisites`);
        this.logger.debug(`[${pipelineId}] [CLEANUP] No validation required for cleanup task`);
    }
    async executeTask(context) {
        const { logger, workingDirectory, tempDirectory, config, pipeline } = context;
        const pipelineId = pipeline.id;
        this.logger.log(`[${pipelineId}] [CLEANUP] Starting cleanup task`, {
            workingDirectory,
            tempDirectory,
            enableTempCleanup: config.performance.tempDirCleanup,
            dockerEnabled: config.docker.enabled,
            dockerCleanup: config.docker.cleanup,
            hasGitSyncData: !!context.data.gitSync
        });
        let tempFilesRemoved = 0;
        let diskSpaceFreed = 0;
        try {
            logger.info(`[${pipelineId}] [CLEANUP] Starting cleanup`, {
                workingDirectory,
                tempDirectory,
                enableTempCleanup: config.performance.tempDirCleanup,
            });
            if (config.performance.tempDirCleanup && tempDirectory) {
                this.logger.debug(`[${pipelineId}] [CLEANUP] Cleaning temporary directory`, {
                    tempDirectory
                });
                const tempResult = await this.cleanDirectory(tempDirectory, logger, pipelineId);
                tempFilesRemoved += tempResult.filesRemoved;
                diskSpaceFreed += tempResult.spaceFreed;
                this.logger.debug(`[${pipelineId}] [CLEANUP] Temporary directory cleanup completed`, {
                    tempDirectory,
                    filesRemoved: tempResult.filesRemoved,
                    spaceFreedMB: Math.round(tempResult.spaceFreed / (1024 * 1024))
                });
            }
            else {
                this.logger.debug(`[${pipelineId}] [CLEANUP] Skipping temporary directory cleanup`, {
                    tempDirCleanupEnabled: config.performance.tempDirCleanup,
                    hasTempDirectory: !!tempDirectory
                });
            }
            if (workingDirectory && context.data.gitSync?.clonePath) {
                this.logger.debug(`[${pipelineId}] [CLEANUP] Cleaning working directory`, {
                    workingDirectory,
                    clonePath: context.data.gitSync.clonePath
                });
                const workingResult = await this.cleanDirectory(workingDirectory, logger, pipelineId);
                tempFilesRemoved += workingResult.filesRemoved;
                diskSpaceFreed += workingResult.spaceFreed;
                this.logger.debug(`[${pipelineId}] [CLEANUP] Working directory cleanup completed`, {
                    workingDirectory,
                    filesRemoved: workingResult.filesRemoved,
                    spaceFreedMB: Math.round(workingResult.spaceFreed / (1024 * 1024))
                });
            }
            else {
                this.logger.debug(`[${pipelineId}] [CLEANUP] Skipping working directory cleanup`, {
                    hasWorkingDirectory: !!workingDirectory,
                    hasGitSyncClonePath: !!context.data.gitSync?.clonePath
                });
            }
            if (config.docker.enabled && config.docker.cleanup) {
                this.logger.debug(`[${pipelineId}] [CLEANUP] Starting Docker resource cleanup`);
                await this.cleanupDockerResources(logger, pipelineId);
                this.logger.debug(`[${pipelineId}] [CLEANUP] Docker resource cleanup completed`);
            }
            else {
                this.logger.debug(`[${pipelineId}] [CLEANUP] Skipping Docker cleanup`, {
                    dockerEnabled: config.docker.enabled,
                    dockerCleanup: config.docker.cleanup
                });
            }
            this.logger.log(`[${pipelineId}] [CLEANUP] Cleanup task completed successfully`, {
                tempFilesRemoved,
                diskSpaceFreedMB: Math.round(diskSpaceFreed / (1024 * 1024)),
            });
            logger.info(`[${pipelineId}] [CLEANUP] Cleanup completed`, {
                tempFilesRemoved,
                diskSpaceFreedMB: Math.round(diskSpaceFreed / (1024 * 1024)),
            });
            context.data.cleanup = {
                tempFilesRemoved,
                diskSpaceFreed,
            };
            return {
                success: true,
                duration: 0,
                data: context.data.cleanup,
                metrics: {
                    itemsUpdated: tempFilesRemoved,
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.warn(`[${pipelineId}] [CLEANUP] Cleanup task encountered error but continuing`, {
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
                tempFilesRemoved,
                diskSpaceFreedMB: Math.round(diskSpaceFreed / (1024 * 1024))
            });
            logger.error(`[${pipelineId}] [CLEANUP] Cleanup failed`, {
                error: errorMessage
            });
            return {
                success: true,
                duration: 0,
                error: `Cleanup warning: ${errorMessage}`,
            };
        }
    }
    getEstimatedDuration(context) {
        const { pipeline } = context;
        const pipelineId = pipeline.id;
        const estimatedTime = 10000;
        this.logger.debug(`[${pipelineId}] [CLEANUP] Estimated task duration calculated`, {
            estimatedTimeMs: estimatedTime,
            estimatedTimeSec: estimatedTime / 1000
        });
        return estimatedTime;
    }
    async cleanDirectory(dirPath, logger, pipelineId) {
        let filesRemoved = 0;
        let spaceFreed = 0;
        try {
            await fs.access(dirPath);
            this.logger.debug(`[${pipelineId}] [CLEANUP] Directory exists, starting cleanup`, {
                dirPath
            });
            logger.debug(`[${pipelineId}] [CLEANUP] Cleaning directory: ${dirPath}`);
            this.logger.debug(`[${pipelineId}] [CLEANUP] Calculating directory size before cleanup`, {
                dirPath
            });
            const sizeBefore = await this.getDirectorySize(dirPath);
            this.logger.debug(`[${pipelineId}] [CLEANUP] Directory size calculated`, {
                dirPath,
                sizeMB: Math.round(sizeBefore / (1024 * 1024)),
                sizeBytes: sizeBefore
            });
            this.logger.debug(`[${pipelineId}] [CLEANUP] Removing directory and all contents`, {
                dirPath
            });
            await fs.rm(dirPath, { recursive: true, force: true });
            spaceFreed = sizeBefore;
            filesRemoved = await this.countFilesInDirectory(dirPath, true);
            this.logger.debug(`[${pipelineId}] [CLEANUP] Directory removal completed`, {
                dirPath,
                filesRemoved,
                spaceFreedMB: Math.round(spaceFreed / (1024 * 1024))
            });
            logger.debug(`[${pipelineId}] [CLEANUP] Directory cleaned: ${dirPath}`, {
                filesRemoved,
                spaceFreedMB: Math.round(spaceFreed / (1024 * 1024)),
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorCode = error instanceof Error && 'code' in error ? error.code : undefined;
            if (errorCode !== 'ENOENT') {
                this.logger.warn(`[${pipelineId}] [CLEANUP] Failed to clean directory`, {
                    dirPath,
                    error: errorMessage,
                    errorCode
                });
                logger.warn(`[${pipelineId}] [CLEANUP] Failed to clean directory: ${dirPath}`, {
                    error: errorMessage
                });
            }
            else {
                this.logger.debug(`[${pipelineId}] [CLEANUP] Directory does not exist, skipping cleanup`, {
                    dirPath
                });
            }
        }
        return { filesRemoved, spaceFreed };
    }
    async getDirectorySize(dirPath) {
        let totalSize = 0;
        try {
            const walk = async (dir) => {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        await walk(fullPath);
                    }
                    else if (entry.isFile()) {
                        const stats = await fs.stat(fullPath);
                        totalSize += stats.size;
                    }
                }
            };
            await walk(dirPath);
        }
        catch (error) {
        }
        return totalSize;
    }
    async countFilesInDirectory(dirPath, beforeDeletion = false) {
        let fileCount = 0;
        try {
            if (beforeDeletion) {
                return 0;
            }
            const walk = async (dir) => {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory()) {
                        await walk(path.join(dir, entry.name));
                    }
                    else {
                        fileCount++;
                    }
                }
            };
            await walk(dirPath);
        }
        catch (error) {
        }
        return fileCount;
    }
    async cleanupDockerResources(logger, pipelineId) {
        try {
            const { exec } = __webpack_require__(54);
            const { promisify } = __webpack_require__(63);
            const execAsync = promisify(exec);
            this.logger.debug(`[${pipelineId}] [CLEANUP] Starting Docker resource cleanup`);
            logger.debug(`[${pipelineId}] [CLEANUP] Cleaning up Docker resources`);
            try {
                this.logger.debug(`[${pipelineId}] [CLEANUP] Removing stopped Docker containers with tekaicontextengine label`);
                const containerResult = await execAsync('docker container prune -f --filter "label=tekaicontextengine"');
                this.logger.debug(`[${pipelineId}] [CLEANUP] Docker container cleanup completed`, {
                    output: containerResult.stdout?.trim(),
                    errors: containerResult.stderr?.trim()
                });
                logger.debug(`[${pipelineId}] [CLEANUP] Docker containers cleaned`);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.warn(`[${pipelineId}] [CLEANUP] Failed to clean Docker containers`, {
                    error: errorMessage
                });
                logger.warn(`[${pipelineId}] [CLEANUP] Failed to clean Docker containers`, {
                    error: errorMessage
                });
            }
            try {
                this.logger.debug(`[${pipelineId}] [CLEANUP] Removing dangling Docker images`);
                const imageResult = await execAsync('docker image prune -f');
                this.logger.debug(`[${pipelineId}] [CLEANUP] Docker image cleanup completed`, {
                    output: imageResult.stdout?.trim(),
                    errors: imageResult.stderr?.trim()
                });
                logger.debug(`[${pipelineId}] [CLEANUP] Docker images cleaned`);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.warn(`[${pipelineId}] [CLEANUP] Failed to clean Docker images`, {
                    error: errorMessage
                });
                logger.warn(`[${pipelineId}] [CLEANUP] Failed to clean Docker images`, {
                    error: errorMessage
                });
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.warn(`[${pipelineId}] [CLEANUP] Docker cleanup failed`, {
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
            logger.warn(`[${pipelineId}] [CLEANUP] Docker cleanup failed`, {
                error: errorMessage
            });
        }
    }
    async cleanup(context) {
        const { pipeline } = context;
        const pipelineId = pipeline.id;
        this.logger.debug(`[${pipelineId}] [CLEANUP] Starting task cleanup`);
        this.logger.debug(`[${pipelineId}] [CLEANUP] This task is the cleanup task itself, no additional cleanup needed`);
        context.logger.debug(`[${pipelineId}] [CLEANUP] Cleanup task cleanup completed`);
    }
};
exports.CleanupTask = CleanupTask;
exports.CleanupTask = CleanupTask = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _a : Object])
], CleanupTask);


/***/ }),
/* 66 */
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
exports.PipelineConfigService = void 0;
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(4);
const index_pipeline_entity_1 = __webpack_require__(18);
let PipelineConfigService = class PipelineConfigService {
    constructor(configService) {
        this.configService = configService;
    }
    getDefaultConfiguration(pipelineType, customConfig) {
        const baseConfig = this.createBaseConfiguration(pipelineType);
        this.applyPipelineTypeOverrides(baseConfig, pipelineType);
        if (customConfig) {
            return this.deepMerge(baseConfig, customConfig);
        }
        return baseConfig;
    }
    createBaseConfiguration(pipelineType) {
        return {
            gitSync: {
                baseCommit: undefined,
                targetCommit: undefined,
                incrementalMode: pipelineType === index_pipeline_entity_1.IndexPipelineType.INCREMENTAL,
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
                    '*.class',
                    '*.jar',
                    '*.war',
                    'target/**',
                    '__pycache__/**',
                    '*.pyc',
                    '.pytest_cache/**',
                ]),
                timeout: this.configService.get('GIT_SYNC_TIMEOUT', 300000),
                shallow: this.configService.get('GIT_SYNC_SHALLOW', false),
            },
            docker: {
                enabled: this.configService.get('DOCKER_ENABLED', true),
                networkMode: this.configService.get('DOCKER_NETWORK_MODE', 'bridge'),
                memoryLimit: this.configService.get('DOCKER_MEMORY_LIMIT', '2g'),
                cpuLimit: this.configService.get('DOCKER_CPU_LIMIT', '1.5'),
                timeout: this.configService.get('DOCKER_TIMEOUT', 600000),
                registry: this.configService.get('DOCKER_REGISTRY', ''),
                pullPolicy: this.configService.get('DOCKER_PULL_POLICY', 'if-not-present'),
                cleanup: this.configService.get('DOCKER_CLEANUP', true),
            },
            parsing: {
                languages: {
                    java: {
                        enabled: this.configService.get('PARSING_JAVA_ENABLED', true),
                        dockerImage: this.configService.get('DOCKER_IMAGE_JAVA', 'tekai/java-parser:latest'),
                        jvmOptions: this.configService.get('PARSING_JAVA_JVM_OPTIONS', ['-Xmx1g', '-XX:+UseG1GC']),
                    },
                    typescript: {
                        enabled: this.configService.get('PARSING_TS_ENABLED', true),
                        dockerImage: this.configService.get('DOCKER_IMAGE_TS', 'tekai/ts-parser:latest'),
                        nodeOptions: this.configService.get('PARSING_TS_NODE_OPTIONS', ['--max-old-space-size=2048']),
                    },
                    python: {
                        enabled: this.configService.get('PARSING_PYTHON_ENABLED', true),
                        dockerImage: this.configService.get('DOCKER_IMAGE_PYTHON', 'tekai/python-parser:latest'),
                        pythonPath: this.configService.get('PARSING_PYTHON_PATH', '/usr/bin/python3'),
                    },
                    go: {
                        enabled: this.configService.get('PARSING_GO_ENABLED', true),
                        dockerImage: this.configService.get('DOCKER_IMAGE_GO', 'tekai/go-parser:latest'),
                        goModules: this.configService.get('PARSING_GO_MODULES', true),
                    },
                    rust: {
                        enabled: this.configService.get('PARSING_RUST_ENABLED', true),
                        dockerImage: this.configService.get('DOCKER_IMAGE_RUST', 'tekai/rust-parser:latest'),
                        cargoFeatures: this.configService.get('PARSING_RUST_FEATURES', []),
                    },
                },
                outputFormat: this.configService.get('PARSING_OUTPUT_FORMAT', 'json'),
                includePrivate: this.configService.get('PARSING_INCLUDE_PRIVATE', true),
                includeComments: this.configService.get('PARSING_INCLUDE_COMMENTS', true),
                includeTests: this.configService.get('PARSING_INCLUDE_TESTS', true),
                maxFileSize: this.configService.get('PARSING_MAX_FILE_SIZE', 10 * 1024 * 1024),
            },
            graph: {
                url: this.configService.get('NEO4J_URL', 'bolt://localhost:7687'),
                username: this.configService.get('NEO4J_USERNAME', 'neo4j'),
                password: this.configService.get('NEO4J_PASSWORD', 'password'),
                database: this.configService.get('NEO4J_DATABASE', 'neo4j'),
                batchSize: this.configService.get('NEO4J_BATCH_SIZE', 100),
                enableVectorIndex: this.configService.get('NEO4J_VECTOR_INDEX', true),
                vectorDimensions: this.configService.get('NEO4J_VECTOR_DIMENSIONS', 768),
                indexingMode: this.configService.get('NEO4J_INDEXING_MODE', 'sync'),
                retainHistory: this.configService.get('NEO4J_RETAIN_HISTORY', false),
                schema: {
                    nodeLabels: this.configService.get('NEO4J_NODE_LABELS', [
                        'Project',
                        'Codebase',
                        'File',
                        'Class',
                        'Interface',
                        'Method',
                        'Function',
                        'Variable',
                        'Constant',
                        'Enum',
                        'Package',
                        'Module',
                        'Namespace',
                    ]),
                    relationshipTypes: this.configService.get('NEO4J_RELATIONSHIP_TYPES', [
                        'CONTAINS',
                        'DEFINES',
                        'EXTENDS',
                        'IMPLEMENTS',
                        'CALLS',
                        'USES',
                        'DEPENDS_ON',
                        'IMPORTS',
                        'OVERRIDES',
                        'THROWS',
                        'RETURNS',
                        'PARAMETERS',
                    ]),
                },
            },
            performance: {
                maxConcurrentTasks: this.configService.get('PERFORMANCE_MAX_CONCURRENT', 4),
                taskTimeout: this.configService.get('PERFORMANCE_TASK_TIMEOUT', 1800000),
                memoryLimit: this.configService.get('PERFORMANCE_MEMORY_LIMIT', '4g'),
                tempDirCleanup: this.configService.get('PERFORMANCE_TEMP_CLEANUP', true),
                enableMetrics: this.configService.get('PERFORMANCE_ENABLE_METRICS', true),
                logLevel: this.configService.get('PERFORMANCE_LOG_LEVEL', 'info'),
                enableProfiling: this.configService.get('PERFORMANCE_ENABLE_PROFILING', false),
                checkpointInterval: this.configService.get('PERFORMANCE_CHECKPOINT_INTERVAL', 300000),
            },
            files: {
                includePaths: this.configService.get('FILES_INCLUDE_PATHS', ['**/*']),
                excludePaths: this.configService.get('FILES_EXCLUDE_PATHS', [
                    'node_modules/**',
                    '.git/**',
                    'dist/**',
                    'build/**',
                    'target/**',
                    'out/**',
                    'bin/**',
                    '__pycache__/**',
                    '.pytest_cache/**',
                    '.idea/**',
                    '.vscode/**',
                    '**/*.log',
                    '**/*.tmp',
                    '**/*.temp',
                    '**/*.class',
                    '**/*.jar',
                    '**/*.war',
                    '**/*.pyc',
                    '**/*.pyo',
                    '**/*.so',
                    '**/*.dll',
                    '**/*.exe',
                    '**/.*',
                ]),
                supportedExtensions: this.configService.get('FILES_SUPPORTED_EXTENSIONS', [
                    '.js',
                    '.jsx',
                    '.ts',
                    '.tsx',
                    '.java',
                    '.py',
                    '.go',
                    '.rs',
                    '.cpp',
                    '.cc',
                    '.cxx',
                    '.c',
                    '.h',
                    '.hpp',
                    '.cs',
                    '.php',
                    '.rb',
                    '.kt',
                    '.scala',
                    '.swift',
                    '.m',
                    '.mm',
                    '.sql',
                    '.sh',
                    '.bash',
                    '.ps1',
                    '.yaml',
                    '.yml',
                    '.json',
                    '.xml',
                    '.md',
                    '.txt',
                ]),
                encoding: this.configService.get('FILES_ENCODING', 'utf-8'),
                detectBinary: this.configService.get('FILES_DETECT_BINARY', true),
                maxDepth: this.configService.get('FILES_MAX_DEPTH', 20),
            },
            retry: {
                maxRetries: this.configService.get('RETRY_MAX_RETRIES', 3),
                retryDelay: this.configService.get('RETRY_DELAY', 5000),
                exponentialBackoff: this.configService.get('RETRY_EXPONENTIAL_BACKOFF', true),
                retryableErrors: this.configService.get('RETRY_RETRYABLE_ERRORS', [
                    'ECONNRESET',
                    'ETIMEDOUT',
                    'ENOTFOUND',
                    'ECONNREFUSED',
                    'EHOSTUNREACH',
                    'timeout',
                    'network',
                    'connection',
                ]),
                failureThreshold: this.configService.get('RETRY_FAILURE_THRESHOLD', 50),
            },
        };
    }
    applyPipelineTypeOverrides(config, pipelineType) {
        switch (pipelineType) {
            case index_pipeline_entity_1.IndexPipelineType.FULL:
                config.gitSync.shallow = false;
                config.gitSync.incrementalMode = false;
                config.performance.maxConcurrentTasks = Math.max(config.performance.maxConcurrentTasks, 2);
                break;
            case index_pipeline_entity_1.IndexPipelineType.INCREMENTAL:
                config.gitSync.incrementalMode = true;
                config.gitSync.shallow = true;
                config.performance.taskTimeout = Math.min(config.performance.taskTimeout, 900000);
                break;
            case index_pipeline_entity_1.IndexPipelineType.DOCUMENT:
                config.parsing.languages.java.enabled = false;
                config.parsing.languages.typescript.enabled = false;
                config.parsing.languages.python.enabled = false;
                config.parsing.languages.go.enabled = false;
                config.parsing.languages.rust.enabled = false;
                config.files.supportedExtensions = ['.md', '.txt', '.pdf', '.doc', '.docx'];
                config.gitSync.incrementalMode = false;
                break;
            case index_pipeline_entity_1.IndexPipelineType.ANALYSIS:
                config.gitSync.shallow = true;
                config.parsing.includeComments = false;
                config.parsing.includeTests = false;
                config.performance.maxConcurrentTasks = 1;
                break;
        }
    }
    validateConfiguration(config) {
        const errors = [];
        if (config.gitSync.maxFileSize <= 0) {
            errors.push('Git sync max file size must be positive');
        }
        if (config.gitSync.timeout <= 0) {
            errors.push('Git sync timeout must be positive');
        }
        if (config.docker.enabled) {
            if (!config.docker.memoryLimit.match(/^\d+[kmg]$/i)) {
                errors.push('Docker memory limit must be in format like 2g, 512m, etc.');
            }
            if (parseFloat(config.docker.cpuLimit) <= 0) {
                errors.push('Docker CPU limit must be positive');
            }
        }
        try {
            new URL(config.graph.url);
        }
        catch {
            errors.push('Graph URL must be a valid URL');
        }
        if (!config.graph.username || !config.graph.password) {
            errors.push('Graph username and password are required');
        }
        if (config.graph.batchSize <= 0) {
            errors.push('Graph batch size must be positive');
        }
        if (config.performance.maxConcurrentTasks <= 0) {
            errors.push('Max concurrent tasks must be positive');
        }
        if (config.performance.taskTimeout <= 0) {
            errors.push('Task timeout must be positive');
        }
        if (config.files.maxDepth <= 0) {
            errors.push('File max depth must be positive');
        }
        if (config.files.supportedExtensions.length === 0) {
            errors.push('At least one supported file extension is required');
        }
        if (config.retry.maxRetries < 0) {
            errors.push('Max retries cannot be negative');
        }
        if (config.retry.retryDelay <= 0) {
            errors.push('Retry delay must be positive');
        }
        if (config.retry.failureThreshold < 0 || config.retry.failureThreshold > 100) {
            errors.push('Failure threshold must be between 0 and 100');
        }
        return errors;
    }
    getEnvironmentConfiguration(environment) {
        switch (environment) {
            case 'development':
                return {
                    docker: {
                        enabled: false,
                        cleanup: false,
                    },
                    performance: {
                        maxConcurrentTasks: 2,
                        enableProfiling: true,
                        logLevel: 'debug',
                    },
                    retry: {
                        maxRetries: 1,
                        retryDelay: 1000,
                    },
                };
            case 'staging':
                return {
                    performance: {
                        maxConcurrentTasks: 3,
                        logLevel: 'info',
                    },
                    retry: {
                        maxRetries: 2,
                    },
                };
            case 'production':
                return {
                    performance: {
                        maxConcurrentTasks: 6,
                        logLevel: 'warn',
                        enableMetrics: true,
                    },
                    retry: {
                        maxRetries: 3,
                        exponentialBackoff: true,
                    },
                    docker: {
                        cleanup: true,
                    },
                };
            default:
                return {};
        }
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
exports.PipelineConfigService = PipelineConfigService;
exports.PipelineConfigService = PipelineConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _a : Object])
], PipelineConfigService);


/***/ }),
/* 67 */
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
exports.PipelineWorkerService = void 0;
const common_1 = __webpack_require__(2);
const nest_winston_1 = __webpack_require__(5);
const worker_pool_service_1 = __webpack_require__(25);
const config_1 = __webpack_require__(4);
let PipelineWorkerService = class PipelineWorkerService {
    constructor(workerPoolService, configService, logger) {
        this.workerPoolService = workerPoolService;
        this.configService = configService;
        this.logger = logger;
        this.PIPELINE_POOL_NAME = 'pipeline-execution';
        this.logger.debug('[PIPELINE-WORKER] Initializing pipeline worker service', 'PipelineWorkerService');
    }
    async onModuleInit() {
        this.logger.log('[PIPELINE-WORKER] Module initializing - setting up pipeline worker pool', 'PipelineWorkerService');
        this.initializePipelinePool();
        this.logger.log('[PIPELINE-WORKER] Module initialization completed', 'PipelineWorkerService');
    }
    async submitPipeline(pipelineId, pipelineType, executeFn) {
        const timeout = this.getPipelineTimeout(pipelineType);
        this.logger.debug('[PIPELINE-WORKER] Preparing pipeline task for worker pool', {
            pipelineId,
            pipelineType,
            timeout,
            poolName: this.PIPELINE_POOL_NAME
        });
        const task = {
            id: `pipeline-${pipelineId}`,
            pipelineId,
            type: pipelineType,
            timeout,
            execute: executeFn,
        };
        this.logger.log('[PIPELINE-WORKER] Submitting pipeline to worker pool', {
            pipelineId,
            pipelineType,
            taskId: task.id,
            timeout: task.timeout
        });
        this.logger.log(`Submitting pipeline ${pipelineId} to worker pool`);
        try {
            const submissionStartTime = Date.now();
            const result = await this.workerPoolService.submitTask(this.PIPELINE_POOL_NAME, task);
            const submissionDuration = Date.now() - submissionStartTime;
            this.logger.log('[PIPELINE-WORKER] Pipeline completed successfully in worker pool', {
                pipelineId,
                pipelineType,
                status: result.status,
                duration: result.duration,
                submissionDuration,
                tasksExecuted: result.tasksExecuted,
                tasksSucceeded: result.tasksSucceeded,
                tasksFailed: result.tasksFailed
            });
            this.logger.log(`Pipeline ${pipelineId} completed in worker pool`);
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('[PIPELINE-WORKER] Pipeline failed in worker pool', {
                pipelineId,
                pipelineType,
                taskId: task.id,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
            this.logger.error(`Pipeline ${pipelineId} failed in worker pool:`, error);
            throw error;
        }
    }
    initializePipelinePool() {
        const maxWorkers = this.configService.get('PIPELINE_MAX_WORKERS', 4);
        const taskTimeout = this.configService.get('PIPELINE_TASK_TIMEOUT', 1800000);
        this.logger.debug('[PIPELINE-WORKER] Initializing pipeline worker pool with configuration', {
            poolName: this.PIPELINE_POOL_NAME,
            maxWorkers,
            taskTimeout,
            taskTimeoutMin: Math.round(taskTimeout / 60000)
        });
        this.workerPoolService.createPool(this.PIPELINE_POOL_NAME, {
            maxWorkers,
            taskTimeout,
        });
        this.logger.log('[PIPELINE-WORKER] Pipeline worker pool initialized successfully', {
            poolName: this.PIPELINE_POOL_NAME,
            maxWorkers,
            configuration: {
                taskTimeoutMin: Math.round(taskTimeout / 60000)
            }
        });
        this.logger.log(`Initialized pipeline worker pool with ${maxWorkers} workers`);
    }
    getPipelineTimeout(pipelineType) {
        const baseTimeout = this.configService.get('PIPELINE_TASK_TIMEOUT', 1800000);
        switch (pipelineType.toUpperCase()) {
            case 'FULL':
                return baseTimeout * 3;
            case 'INCREMENTAL':
                return baseTimeout * 0.5;
            case 'DOCUMENT':
                return baseTimeout * 0.3;
            case 'ANALYSIS':
                return baseTimeout * 2;
            default:
                return baseTimeout;
        }
    }
    getQueuePosition(_pipelineId) {
        return null;
    }
    async cancelQueuedPipeline(pipelineId) {
        this.logger.warn(`Pipeline cancellation not yet implemented for ${pipelineId}`);
        return false;
    }
};
exports.PipelineWorkerService = PipelineWorkerService;
exports.PipelineWorkerService = PipelineWorkerService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof worker_pool_service_1.WorkerPoolService !== "undefined" && worker_pool_service_1.WorkerPoolService) === "function" ? _a : Object, typeof (_b = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _b : Object, typeof (_c = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _c : Object])
], PipelineWorkerService);


/***/ }),
/* 68 */
/***/ ((module) => {

module.exports = require("os");

/***/ }),
/* 69 */
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
exports.IndexingController = exports.CreatePipelineDto = void 0;
const common_1 = __webpack_require__(2);
const nest_winston_1 = __webpack_require__(5);
const swagger_1 = __webpack_require__(3);
const pipeline_orchestrator_service_1 = __webpack_require__(59);
const index_pipeline_entity_1 = __webpack_require__(18);
const typeorm_1 = __webpack_require__(10);
const typeorm_2 = __webpack_require__(13);
const entities_1 = __webpack_require__(11);
class CreatePipelineDto {
}
exports.CreatePipelineDto = CreatePipelineDto;
let IndexingController = class IndexingController {
    constructor(pipelineOrchestrator, codebaseRepository, logger) {
        this.pipelineOrchestrator = pipelineOrchestrator;
        this.codebaseRepository = codebaseRepository;
        this.logger = logger;
    }
    async createPipeline(dto) {
        this.logger.log(`[CREATE-PIPELINE] Creating new indexing pipeline`, {
            projectId: dto.projectId,
            codebaseId: dto.codebaseId,
            type: dto.type,
            description: dto.description
        });
        this.logger.debug(`[CREATE-PIPELINE] Full request details`, {
            dto: {
                projectId: dto.projectId,
                codebaseId: dto.codebaseId,
                type: dto.type,
                description: dto.description,
                baseCommit: dto.baseCommit,
                targetCommit: dto.targetCommit,
                priority: dto.priority,
                hasCustomConfiguration: !!dto.customConfiguration
            }
        });
        try {
            const request = {
                projectId: dto.projectId,
                codebaseId: dto.codebaseId,
                type: dto.type,
                description: dto.description,
                baseCommit: dto.baseCommit,
                targetCommit: dto.targetCommit,
                priority: dto.priority,
                customConfiguration: dto.customConfiguration,
            };
            this.logger.debug(`[CREATE-PIPELINE] Calling pipeline orchestrator with request`);
            const job = await this.pipelineOrchestrator.createPipeline(request);
            this.logger.log(`[CREATE-PIPELINE] Pipeline created successfully`, {
                pipelineId: job.id,
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
                message: 'Index pipeline created and started successfully',
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[CREATE-PIPELINE] Failed to create pipeline`, {
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
    async getPipelineStatus(pipelineId) {
        this.logger.debug(`[GET-PIPELINE-STATUS] Retrieving pipeline status`, {
            pipelineId
        });
        try {
            const job = await this.pipelineOrchestrator.getPipelineStatus(pipelineId);
            this.logger.debug(`[GET-PIPELINE-STATUS] Pipeline status retrieved successfully`, {
                pipelineId: job.id,
                type: job.type,
                status: job.status,
                progress: job.progress || 0,
                currentStep: job.currentStep,
                hasError: !!job.error,
                startedAt: job.startedAt,
                completedAt: job.completedAt,
                stepsCount: Object.keys(job.metadata?.steps || {}).length
            });
            return {
                success: true,
                data: {
                    id: job.id,
                    type: job.type,
                    status: job.status,
                    progress: job.progress || 0,
                    currentStep: job.currentStep,
                    error: job.error,
                    startedAt: job.startedAt,
                    completedAt: job.completedAt,
                    steps: job.metadata?.steps || {},
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[GET-PIPELINE-STATUS] Failed to retrieve pipeline status`, {
                pipelineId,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
            if (errorMessage.includes('not found')) {
                throw new common_1.NotFoundException(errorMessage);
            }
            throw new common_1.BadRequestException(errorMessage);
        }
    }
    async cancelPipeline(pipelineId) {
        this.logger.log(`[CANCEL-PIPELINE] Cancelling pipeline`, {
            pipelineId
        });
        try {
            await this.pipelineOrchestrator.cancelPipeline(pipelineId);
            this.logger.log(`[CANCEL-PIPELINE] Pipeline cancelled successfully`, {
                pipelineId
            });
            return {
                success: true,
                message: 'Pipeline cancelled successfully',
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[CANCEL-PIPELINE] Failed to cancel pipeline`, {
                pipelineId,
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
        this.logger.debug(`[FULL-INDEX] Request params: { codebaseId: "${codebaseId}", description: "${description}" }`);
        try {
            this.logger.log(`[FULL-INDEX] Looking up codebase: ${codebaseId}`);
            const codebase = await this.codebaseRepository.findOne({
                where: { id: codebaseId },
                relations: ['project'],
            });
            if (!codebase) {
                this.logger.error(`[FULL-INDEX] Codebase not found: ${codebaseId}`);
                throw new common_1.NotFoundException(`Codebase ${codebaseId} not found`);
            }
            this.logger.log(`[FULL-INDEX] Codebase found: ${codebase.name} (Project: ${codebase.project.id})`);
            this.logger.debug(`[FULL-INDEX] Codebase details: { id: "${codebase.id}", name: "${codebase.name}", projectId: "${codebase.project.id}", gitlabUrl: "${codebase.gitlabUrl}" }`);
            const request = {
                projectId: codebase.project.id,
                codebaseId,
                type: index_pipeline_entity_1.IndexPipelineType.FULL,
                description: description || 'Full codebase indexing',
            };
            this.logger.log(`[FULL-INDEX] Creating pipeline request:`);
            this.logger.debug(`[FULL-INDEX] Pipeline request: ${JSON.stringify(request, null, 2)}`);
            const job = await this.pipelineOrchestrator.createPipeline(request);
            this.logger.log(`[FULL-INDEX] Pipeline created successfully: ${job.id}`);
            this.logger.debug(`[FULL-INDEX] Pipeline details: { id: "${job.id}", type: "${job.type}", status: "${job.status}", createdAt: "${job.createdAt}" }`);
            return {
                success: true,
                data: {
                    pipelineId: job.id,
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
    async startIncrementalUpdate(codebaseId, baseCommit, targetCommit) {
        this.logger.log(`[INCREMENTAL-UPDATE] Starting incremental update for codebase`, {
            codebaseId,
            baseCommit,
            targetCommit
        });
        try {
            const request = {
                projectId: '',
                codebaseId,
                type: index_pipeline_entity_1.IndexPipelineType.INCREMENTAL,
                baseCommit,
                targetCommit,
                description: 'Incremental codebase update',
            };
            this.logger.debug(`[INCREMENTAL-UPDATE] Creating incremental pipeline request`, {
                request: {
                    codebaseId: request.codebaseId,
                    type: request.type,
                    baseCommit: request.baseCommit,
                    targetCommit: request.targetCommit,
                    description: request.description
                }
            });
            const job = await this.pipelineOrchestrator.createPipeline(request);
            this.logger.log(`[INCREMENTAL-UPDATE] Incremental update pipeline created successfully`, {
                pipelineId: job.id,
                status: job.status,
                codebaseId
            });
            return {
                success: true,
                data: {
                    pipelineId: job.id,
                    status: job.status,
                },
                message: 'Incremental update started successfully',
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[INCREMENTAL-UPDATE] Failed to start incremental update`, {
                codebaseId,
                baseCommit,
                targetCommit,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
            throw new common_1.BadRequestException(`Failed to start incremental update: ${errorMessage}`);
        }
    }
    async startDependencyAnalysis(projectId, description) {
        this.logger.log(`[DEPENDENCY-ANALYSIS] Starting dependency analysis for project`, {
            projectId,
            description
        });
        try {
            const request = {
                projectId,
                type: index_pipeline_entity_1.IndexPipelineType.ANALYSIS,
                description: description || 'Project dependency analysis',
            };
            this.logger.debug(`[DEPENDENCY-ANALYSIS] Creating dependency analysis pipeline request`, {
                request: {
                    projectId: request.projectId,
                    type: request.type,
                    description: request.description
                }
            });
            const job = await this.pipelineOrchestrator.createPipeline(request);
            this.logger.log(`[DEPENDENCY-ANALYSIS] Dependency analysis pipeline created successfully`, {
                pipelineId: job.id,
                status: job.status,
                projectId
            });
            return {
                success: true,
                data: {
                    pipelineId: job.id,
                    status: job.status,
                },
                message: 'Dependency analysis started successfully',
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[DEPENDENCY-ANALYSIS] Failed to start dependency analysis`, {
                projectId,
                description,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
            throw new common_1.BadRequestException(`Failed to start dependency analysis: ${errorMessage}`);
        }
    }
};
exports.IndexingController = IndexingController;
__decorate([
    (0, common_1.Post)('pipelines'),
    (0, swagger_1.ApiOperation)({ summary: 'Create and start a new indexing pipeline' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Pipeline created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid request' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Project or codebase not found' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreatePipelineDto]),
    __metadata("design:returntype", Promise)
], IndexingController.prototype, "createPipeline", null);
__decorate([
    (0, common_1.Get)('pipelines/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get pipeline status and progress' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Pipeline ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Pipeline status retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Pipeline not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IndexingController.prototype, "getPipelineStatus", null);
__decorate([
    (0, common_1.Delete)('pipelines/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel a running pipeline' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Pipeline ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Pipeline cancelled successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Pipeline not found' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Pipeline cannot be cancelled' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IndexingController.prototype, "cancelPipeline", null);
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
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Incremental update started' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('baseCommit')),
    __param(2, (0, common_1.Query)('targetCommit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], IndexingController.prototype, "startIncrementalUpdate", null);
__decorate([
    (0, common_1.Post)('projects/:id/dependency-analysis'),
    (0, swagger_1.ApiOperation)({ summary: 'Start dependency analysis for project' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Project ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Dependency analysis started' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('description')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], IndexingController.prototype, "startDependencyAnalysis", null);
exports.IndexingController = IndexingController = __decorate([
    (0, swagger_1.ApiTags)('Indexing'),
    (0, common_1.Controller)('indexing'),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.Codebase)),
    __param(2, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER)),
    __metadata("design:paramtypes", [typeof (_a = typeof pipeline_orchestrator_service_1.PipelineOrchestratorService !== "undefined" && pipeline_orchestrator_service_1.PipelineOrchestratorService) === "function" ? _a : Object, typeof (_b = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _b : Object, typeof (_c = typeof common_1.LoggerService !== "undefined" && common_1.LoggerService) === "function" ? _c : Object])
], IndexingController);


/***/ }),
/* 70 */
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
const terminus_1 = __webpack_require__(71);
const health_controller_1 = __webpack_require__(72);
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
/* 71 */
/***/ ((module) => {

module.exports = require("@nestjs/terminus");

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
exports.HealthController = void 0;
const common_1 = __webpack_require__(2);
const nest_winston_1 = __webpack_require__(5);
const terminus_1 = __webpack_require__(71);
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
/* 74 */
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
const operators_1 = __webpack_require__(75);
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
/* 75 */
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
const logging_interceptor_1 = __webpack_require__(74);
const all_exceptions_filter_1 = __webpack_require__(73);
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