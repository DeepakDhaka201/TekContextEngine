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
const storage_module_1 = __webpack_require__(20);
const worker_pool_module_1 = __webpack_require__(25);
const project_module_1 = __webpack_require__(27);
const sync_module_1 = __webpack_require__(66);
const indexing_module_1 = __webpack_require__(64);
const gitlab_module_1 = __webpack_require__(62);
const health_module_1 = __webpack_require__(67);
const websocket_module_1 = __webpack_require__(70);
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
            sync_module_1.SyncModule,
            indexing_module_1.IndexingModule,
            gitlab_module_1.GitlabModule,
            health_module_1.HealthModule,
            websocket_module_1.WebSocketModule,
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
                        entities_1.CodeSymbol,
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
                entities_1.CodeSymbol,
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
__exportStar(__webpack_require__(19), exports);
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
var _a, _b, _c, _d, _e, _f;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Codebase = exports.CodebaseStatus = void 0;
const typeorm_1 = __webpack_require__(13);
const project_entity_1 = __webpack_require__(12);
const document_entity_1 = __webpack_require__(15);
const enums_1 = __webpack_require__(17);
const index_pipeline_entity_1 = __webpack_require__(18);
const code_symbol_entity_1 = __webpack_require__(19);
var CodebaseStatus;
(function (CodebaseStatus) {
    CodebaseStatus["PENDING"] = "PENDING";
    CodebaseStatus["SYNCING"] = "SYNCING";
    CodebaseStatus["ACTIVE"] = "ACTIVE";
    CodebaseStatus["ERROR"] = "ERROR";
    CodebaseStatus["ARCHIVED"] = "ARCHIVED";
})(CodebaseStatus || (exports.CodebaseStatus = CodebaseStatus = {}));
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
        enum: CodebaseStatus,
        default: CodebaseStatus.PENDING,
    }),
    __metadata("design:type", String)
], Codebase.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Codebase.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", typeof (_d = typeof Date !== "undefined" && Date) === "function" ? _d : Object)
], Codebase.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", typeof (_e = typeof Date !== "undefined" && Date) === "function" ? _e : Object)
], Codebase.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.TekProject, (project) => project.codebases, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'project_id' }),
    __metadata("design:type", typeof (_f = typeof project_entity_1.TekProject !== "undefined" && project_entity_1.TekProject) === "function" ? _f : Object)
], Codebase.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => document_entity_1.Document, (document) => document.codebase),
    __metadata("design:type", Array)
], Codebase.prototype, "documents", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => index_pipeline_entity_1.IndexPipeline, (pipeline) => pipeline.codebase),
    __metadata("design:type", Array)
], Codebase.prototype, "indexPipelines", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => code_symbol_entity_1.CodeSymbol, (symbol) => symbol.codebase),
    __metadata("design:type", Array)
], Codebase.prototype, "symbols", void 0);
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
exports.DocumentType = exports.FileStatus = exports.SymbolKind = exports.SyncMode = exports.IndexMode = exports.ProjectStatus = void 0;
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
var SymbolKind;
(function (SymbolKind) {
    SymbolKind["CLASS"] = "class";
    SymbolKind["INTERFACE"] = "interface";
    SymbolKind["FUNCTION"] = "function";
    SymbolKind["METHOD"] = "method";
    SymbolKind["CONSTRUCTOR"] = "constructor";
    SymbolKind["FIELD"] = "field";
    SymbolKind["VARIABLE"] = "variable";
    SymbolKind["CONSTANT"] = "constant";
    SymbolKind["ENUM"] = "enum";
    SymbolKind["ENUM_MEMBER"] = "enum_member";
    SymbolKind["MODULE"] = "module";
    SymbolKind["NAMESPACE"] = "namespace";
    SymbolKind["PACKAGE"] = "package";
    SymbolKind["TYPE"] = "type";
    SymbolKind["PARAMETER"] = "parameter";
    SymbolKind["PROPERTY"] = "property";
})(SymbolKind || (exports.SymbolKind = SymbolKind = {}));
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CodeSymbol = void 0;
const typeorm_1 = __webpack_require__(13);
const codebase_entity_1 = __webpack_require__(14);
const enums_1 = __webpack_require__(17);
let CodeSymbol = class CodeSymbol {
};
exports.CodeSymbol = CodeSymbol;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CodeSymbol.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500 }),
    __metadata("design:type", String)
], CodeSymbol.prototype, "symbolId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], CodeSymbol.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: enums_1.SymbolKind,
    }),
    __metadata("design:type", typeof (_a = typeof enums_1.SymbolKind !== "undefined" && enums_1.SymbolKind) === "function" ? _a : Object)
], CodeSymbol.prototype, "kind", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], CodeSymbol.prototype, "language", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], CodeSymbol.prototype, "startLine", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], CodeSymbol.prototype, "startColumn", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], CodeSymbol.prototype, "endLine", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], CodeSymbol.prototype, "endColumn", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], CodeSymbol.prototype, "signature", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], CodeSymbol.prototype, "documentation", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], CodeSymbol.prototype, "isDefinition", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500 }),
    __metadata("design:type", String)
], CodeSymbol.prototype, "badgerKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], CodeSymbol.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", typeof (_b = typeof Date !== "undefined" && Date) === "function" ? _b : Object)
], CodeSymbol.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", typeof (_c = typeof Date !== "undefined" && Date) === "function" ? _c : Object)
], CodeSymbol.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 1000 }),
    __metadata("design:type", String)
], CodeSymbol.prototype, "filePath", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => codebase_entity_1.Codebase, (codebase) => codebase.symbols, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'codebase_id' }),
    __metadata("design:type", typeof (_d = typeof codebase_entity_1.Codebase !== "undefined" && codebase_entity_1.Codebase) === "function" ? _d : Object)
], CodeSymbol.prototype, "codebase", void 0);
exports.CodeSymbol = CodeSymbol = __decorate([
    (0, typeorm_1.Entity)('code_symbols'),
    (0, typeorm_1.Unique)(['codebase', 'symbolId']),
    (0, typeorm_1.Index)(['codebase', 'kind']),
    (0, typeorm_1.Index)(['name'])
], CodeSymbol);


/***/ }),
/* 20 */
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
const storage_service_1 = __webpack_require__(21);
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
/* 21 */
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
var StorageService_1;
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.StorageService = void 0;
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(4);
const fs = __webpack_require__(22);
const path = __webpack_require__(23);
const crypto = __webpack_require__(24);
let StorageService = StorageService_1 = class StorageService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(StorageService_1.name);
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
        this.initializeStorage();
    }
    async initializeStorage() {
        if (this.config.type === 'local') {
            try {
                await fs.mkdir(this.config.basePath, { recursive: true });
                await fs.mkdir(path.join(this.config.basePath, 'codebases'), { recursive: true });
                await fs.mkdir(path.join(this.config.basePath, 'temp'), { recursive: true });
                await fs.mkdir(path.join(this.config.basePath, 'cache'), { recursive: true });
                this.logger.log(`Local storage initialized at: ${this.config.basePath}`);
            }
            catch (error) {
                this.logger.error('Failed to initialize local storage:', error);
                throw error;
            }
        }
    }
    async storeFile(content, originalName, codebaseId, filePath) {
        if (content.length > this.config.maxFileSize) {
            throw new Error(`File size exceeds maximum allowed size: ${this.config.maxFileSize} bytes`);
        }
        const extension = path.extname(originalName).toLowerCase();
        if (this.config.allowedExtensions && !this.config.allowedExtensions.includes(extension)) {
            throw new Error(`File extension not allowed: ${extension}`);
        }
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        const storagePath = this.generateStoragePath(codebaseId, filePath);
        const fullPath = path.join(this.config.basePath, storagePath);
        try {
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.writeFile(fullPath, content);
            const storedFile = {
                id: crypto.randomUUID(),
                originalName,
                path: storagePath,
                size: content.length,
                hash,
                createdAt: new Date(),
            };
            this.logger.debug(`File stored: ${storagePath} (${content.length} bytes)`);
            return storedFile;
        }
        catch (error) {
            this.logger.error(`Failed to store file ${originalName}:`, error);
            throw error;
        }
    }
    async getFile(storagePath) {
        const fullPath = path.join(this.config.basePath, storagePath);
        try {
            const content = await fs.readFile(fullPath);
            this.logger.debug(`File retrieved: ${storagePath} (${content.length} bytes)`);
            return content;
        }
        catch (error) {
            this.logger.error(`Failed to retrieve file ${storagePath}:`, error);
            throw error;
        }
    }
    async fileExists(storagePath) {
        const fullPath = path.join(this.config.basePath, storagePath);
        try {
            await fs.access(fullPath);
            return true;
        }
        catch {
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
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _a : Object])
], StorageService);


/***/ }),
/* 22 */
/***/ ((module) => {

module.exports = require("fs/promises");

/***/ }),
/* 23 */
/***/ ((module) => {

module.exports = require("path");

/***/ }),
/* 24 */
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),
/* 25 */
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
const worker_pool_service_1 = __webpack_require__(26);
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
/* 26 */
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
var WorkerPoolService_1;
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WorkerPoolService = exports.WorkerPool = exports.Semaphore = void 0;
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(4);
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
    get available() {
        return this.permits;
    }
    get waiting() {
        return this.waitQueue.length;
    }
}
exports.Semaphore = Semaphore;
class WorkerPool {
    constructor(name, options) {
        this.name = name;
        this.options = options;
        this.workers = [];
        this.taskQueue = [];
        this.stats = {
            completedTasks: 0,
            failedTasks: 0,
        };
        this.isShuttingDown = false;
        this.logger = new common_1.Logger(`WorkerPool-${this.name}`);
        this.semaphore = new Semaphore(options.maxWorkers);
        this.initializeWorkers();
        this.startCleanupTimer();
    }
    async submit(task) {
        if (this.isShuttingDown) {
            throw new Error('Worker pool is shutting down');
        }
        if (this.options.queueSize && this.taskQueue.length >= this.options.queueSize) {
            throw new Error('Worker pool queue is full');
        }
        return new Promise((resolve, reject) => {
            const wrappedTask = {
                ...task,
                execute: async () => {
                    try {
                        const result = await this.executeWithTimeout(task);
                        this.stats.completedTasks++;
                        resolve(result);
                        return result;
                    }
                    catch (error) {
                        this.stats.failedTasks++;
                        reject(error);
                        throw error;
                    }
                },
            };
            this.taskQueue.push(wrappedTask);
            this.processQueue();
        });
    }
    async submitBatch(tasks) {
        const promises = tasks.map(task => this.submit(task));
        return Promise.all(promises);
    }
    async submitWithConcurrency(tasks, maxConcurrency) {
        const results = [];
        const semaphore = new Semaphore(maxConcurrency);
        const promises = tasks.map(async (task, index) => {
            await semaphore.acquire();
            try {
                const result = await this.submit(task);
                results[index] = result;
                return result;
            }
            finally {
                semaphore.release();
            }
        });
        await Promise.all(promises);
        return results;
    }
    getStats() {
        const activeWorkers = this.workers.filter(w => w.busy).length;
        const utilization = this.workers.length > 0 ? activeWorkers / this.workers.length : 0;
        return {
            activeWorkers,
            queuedTasks: this.taskQueue.length,
            completedTasks: this.stats.completedTasks,
            failedTasks: this.stats.failedTasks,
            totalWorkers: this.workers.length,
            utilization,
        };
    }
    resize(newSize) {
        if (newSize < 1) {
            throw new Error('Worker pool size must be at least 1');
        }
        const currentSize = this.options.maxWorkers;
        this.options.maxWorkers = newSize;
        this.semaphore = new Semaphore(newSize);
        if (newSize > currentSize) {
            for (let i = currentSize; i < newSize; i++) {
                this.workers.push(this.createWorker(i));
            }
        }
        else if (newSize < currentSize) {
            const workersToRemove = this.workers
                .filter(w => !w.busy)
                .slice(0, currentSize - newSize);
            this.workers = this.workers.filter(w => !workersToRemove.includes(w));
        }
        this.logger.log(`Worker pool resized from ${currentSize} to ${newSize} workers`);
    }
    async shutdown(timeout = 30000) {
        this.logger.log('Shutting down worker pool...');
        this.isShuttingDown = true;
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
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
        if (this.taskQueue.length === 0 || this.isShuttingDown) {
            return;
        }
        await this.semaphore.acquire();
        try {
            const task = this.taskQueue.shift();
            if (!task) {
                this.semaphore.release();
                return;
            }
            const worker = this.getAvailableWorker();
            if (!worker) {
                this.taskQueue.unshift(task);
                this.semaphore.release();
                return;
            }
            this.executeTask(worker, task);
        }
        catch (error) {
            this.semaphore.release();
            this.logger.error('Error processing queue:', error);
        }
    }
    async executeTask(worker, task) {
        worker.busy = true;
        worker.currentTask = task;
        worker.lastUsed = new Date();
        try {
            await task.execute();
        }
        catch (error) {
            this.logger.error(`Task ${task.id} failed:`, error);
        }
        finally {
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
    hasActiveTasks() {
        return this.workers.some(w => w.busy) || this.taskQueue.length > 0;
    }
    startCleanupTimer() {
        if (!this.options.idleTimeout)
            return;
        this.cleanupInterval = setInterval(() => {
            this.cleanupIdleWorkers();
        }, this.options.idleTimeout);
    }
    cleanupIdleWorkers() {
        if (!this.options.idleTimeout)
            return;
        const now = new Date();
        const idleThreshold = now.getTime() - this.options.idleTimeout;
        const idleWorkers = this.workers.filter(w => !w.busy && w.lastUsed.getTime() < idleThreshold);
        if (idleWorkers.length > 0 && this.workers.length > 1) {
            const toRemove = Math.min(idleWorkers.length, this.workers.length - 1);
            this.workers = this.workers.filter(w => !idleWorkers.slice(0, toRemove).includes(w));
            this.logger.debug(`Cleaned up ${toRemove} idle workers`);
        }
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.WorkerPool = WorkerPool;
let WorkerPoolService = WorkerPoolService_1 = class WorkerPoolService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(WorkerPoolService_1.name);
        this.pools = new Map();
    }
    createPool(name, options) {
        if (this.pools.has(name)) {
            throw new Error(`Worker pool '${name}' already exists`);
        }
        const pool = new WorkerPool(name, options);
        this.pools.set(name, pool);
        this.logger.log(`Created worker pool '${name}' with ${options.maxWorkers} workers`);
        return pool;
    }
    getPool(name) {
        return this.pools.get(name) || null;
    }
    async submitTask(poolName, task) {
        const pool = this.pools.get(poolName);
        if (!pool) {
            throw new Error(`Worker pool '${poolName}' not found`);
        }
        return pool.submit(task);
    }
    getAllStats() {
        const stats = {};
        for (const [name, pool] of this.pools) {
            stats[name] = pool.getStats();
        }
        return stats;
    }
    async destroyPool(name) {
        const pool = this.pools.get(name);
        if (pool) {
            await pool.shutdown();
            this.pools.delete(name);
            this.logger.log(`Destroyed worker pool '${name}'`);
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
exports.WorkerPoolService = WorkerPoolService = WorkerPoolService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _a : Object])
], WorkerPoolService);


/***/ }),
/* 27 */
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
const tekproject_service_1 = __webpack_require__(28);
const codebase_service_1 = __webpack_require__(33);
const document_service_1 = __webpack_require__(36);
const tekproject_controller_1 = __webpack_require__(37);
const codebase_controller_1 = __webpack_require__(46);
const document_controller_1 = __webpack_require__(60);
const gitlab_module_1 = __webpack_require__(62);
const indexing_module_1 = __webpack_require__(64);
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
            indexing_module_1.IndexingModule,
        ],
        controllers: [tekproject_controller_1.TekProjectController, codebase_controller_1.CodebaseController, document_controller_1.DocsBucketController, document_controller_1.DocumentController],
        providers: [tekproject_service_1.TekProjectService, codebase_service_1.CodebaseService, document_service_1.DocumentService],
        exports: [tekproject_service_1.TekProjectService, codebase_service_1.CodebaseService, document_service_1.DocumentService],
    })
], ProjectModule);


/***/ }),
/* 28 */
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
var TekProjectService_1;
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TekProjectService = void 0;
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const typeorm_2 = __webpack_require__(13);
const entities_1 = __webpack_require__(11);
const adapters_1 = __webpack_require__(29);
let TekProjectService = TekProjectService_1 = class TekProjectService {
    constructor(tekProjectRepository) {
        this.tekProjectRepository = tekProjectRepository;
        this.logger = new common_1.Logger(TekProjectService_1.name);
    }
    async create(createDto) {
        this.logger.log(`Creating TekProject: ${createDto.name}`);
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
exports.TekProjectService = TekProjectService = TekProjectService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.TekProject)),
    __metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object])
], TekProjectService);


/***/ }),
/* 29 */
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
__exportStar(__webpack_require__(30), exports);
__exportStar(__webpack_require__(31), exports);
__exportStar(__webpack_require__(32), exports);


/***/ }),
/* 30 */
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
/* 31 */
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
/* 32 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DocumentAdapter = void 0;
const entities_1 = __webpack_require__(11);
class DocumentAdapter {
    static createDefaultDocsBuckets(tekProject) {
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
            bucket.storagePath = `/data/docs/${tekProject.id}/${config.type}`;
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
    static fromCreateBucketData(data, tekProject) {
        const bucket = new entities_1.DocsBucket();
        bucket.project = tekProject;
        bucket.name = data.name;
        bucket.type = data.type;
        bucket.storagePath = `/data/docs/${tekProject.id}/${data.type}`;
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
            default:
                return entities_1.DocumentType.OTHER;
        }
    }
}
exports.DocumentAdapter = DocumentAdapter;


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
var CodebaseService_1;
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CodebaseService = void 0;
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const typeorm_2 = __webpack_require__(13);
const entities_1 = __webpack_require__(11);
const adapters_1 = __webpack_require__(29);
const gitlab_service_1 = __webpack_require__(34);
let CodebaseService = CodebaseService_1 = class CodebaseService {
    constructor(codebaseRepository, tekProjectRepository, gitlabService) {
        this.codebaseRepository = codebaseRepository;
        this.tekProjectRepository = tekProjectRepository;
        this.gitlabService = gitlabService;
        this.logger = new common_1.Logger(CodebaseService_1.name);
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
    async findByProjectId(projectId) {
        return await this.codebaseRepository.find({
            where: { project: { id: projectId } },
            order: { createdAt: 'DESC' },
        });
    }
    async findForIndexing(codebaseId) {
        this.logger.log(`Preparing codebase for indexing: ${codebaseId}`);
        const codebase = await this.codebaseRepository.findOne({
            where: { id: codebaseId },
            relations: ['project'],
        });
        if (!codebase) {
            throw new common_1.NotFoundException(`Codebase ${codebaseId} not found`);
        }
        return {
            tekProject: codebase.project,
            codebase
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
exports.CodebaseService = CodebaseService = CodebaseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Codebase)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.TekProject)),
    __metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object, typeof (_b = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _b : Object, typeof (_c = typeof gitlab_service_1.GitlabService !== "undefined" && gitlab_service_1.GitlabService) === "function" ? _c : Object])
], CodebaseService);


/***/ }),
/* 34 */
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
var GitlabService_1;
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GitlabService = void 0;
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(4);
const rest_1 = __webpack_require__(35);
let GitlabService = GitlabService_1 = class GitlabService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(GitlabService_1.name);
        const gitlabUrl = this.configService.get('GITLAB_URL', 'https://gitlab.com');
        const gitlabToken = this.configService.get('GITLAB_TOKEN');
        if (!gitlabToken) {
            throw new Error('GITLAB_TOKEN is required');
        }
        this.gitlab = new rest_1.Gitlab({
            host: gitlabUrl,
            token: gitlabToken,
        });
        this.logger.log(`GitLab service initialized with URL: ${gitlabUrl}`);
    }
    extractProjectIdFromUrl(gitlabUrl) {
        try {
            const url = new URL(gitlabUrl);
            let pathParts = url.pathname.split('/').filter(Boolean);
            if (pathParts.length > 0 && pathParts[pathParts.length - 1].endsWith('.git')) {
                pathParts[pathParts.length - 1] = pathParts[pathParts.length - 1].replace('.git', '');
            }
            const ignoredPrefixes = ['-', 'tree', 'blob', 'commits', 'merge_requests', 'issues'];
            const treeIndex = pathParts.findIndex(part => ignoredPrefixes.includes(part));
            if (treeIndex > 0) {
                pathParts = pathParts.slice(0, treeIndex);
            }
            if (pathParts.length < 2) {
                throw new Error('Invalid GitLab URL format - must contain at least namespace/project');
            }
            const projectPath = pathParts.join('/');
            return encodeURIComponent(projectPath);
        }
        catch (error) {
            this.logger.error(`Failed to extract project ID from URL: ${gitlabUrl}`, error);
            throw new common_1.BadRequestException(`Invalid GitLab URL format: ${gitlabUrl}`);
        }
    }
    async getRepository(projectId) {
        try {
            const project = await this.gitlab.Projects.show(projectId);
            return project;
        }
        catch (error) {
            this.logger.error(`Failed to get repository info for project ${projectId}:`, error);
            throw new common_1.BadRequestException(`Unable to access GitLab project: ${projectId}`);
        }
    }
    async listFiles(projectId, options = {}) {
        try {
            const files = await this.gitlab.Repositories.allRepositoryTrees(projectId, {
                ref: options.ref || 'main',
                path: options.path || '',
                recursive: options.recursive || false,
            });
            return files;
        }
        catch (error) {
            this.logger.error(`Failed to list files for project ${projectId}:`, error);
            throw new common_1.BadRequestException(`Unable to list files for project: ${projectId}`);
        }
    }
    async getFileContent(projectId, filePath, ref = 'main') {
        try {
            const file = await this.gitlab.RepositoryFiles.show(projectId, filePath, ref);
            return {
                id: file.file_path || filePath,
                name: file.file_name || filePath.split('/').pop() || '',
                path: file.file_path || filePath,
                size: file.size || 0,
                encoding: file.encoding || 'base64',
                content_sha256: file.content_sha256 || '',
                ref: file.ref || ref,
                blob_id: file.blob_id || '',
                commit_id: file.commit_id || '',
                last_commit_id: file.last_commit_id || '',
                content: file.content,
            };
        }
        catch (error) {
            this.logger.error(`Failed to get file content for ${filePath} in project ${projectId}:`, error);
            throw new common_1.BadRequestException(`Unable to get file content: ${filePath}`);
        }
    }
    async getCommits(projectId, options = {}) {
        try {
            const commits = await this.gitlab.Commits.all(projectId, options);
            return commits;
        }
        catch (error) {
            this.logger.error(`Failed to get commits for project ${projectId}:`, error);
            throw new common_1.BadRequestException(`Unable to get commits for project: ${projectId}`);
        }
    }
    async getBranches(projectId) {
        try {
            const branches = await this.gitlab.Branches.all(projectId);
            return branches;
        }
        catch (error) {
            this.logger.error(`Failed to get branches for project ${projectId}:`, error);
            throw new common_1.BadRequestException(`Unable to get branches for project: ${projectId}`);
        }
    }
    async testConnection() {
        try {
            await this.gitlab.Users.showCurrentUser();
            return true;
        }
        catch (error) {
            this.logger.error('GitLab connection test failed:', error);
            return false;
        }
    }
    async getCurrentUser() {
        try {
            return await this.gitlab.Users.showCurrentUser();
        }
        catch (error) {
            this.logger.error('Failed to get current user:', error);
            throw new common_1.BadRequestException('Unable to authenticate with GitLab');
        }
    }
    async getCommitDiff(projectId, fromCommit, toCommit) {
        try {
            const comparison = await this.gitlab.Repositories.compare(projectId, fromCommit, toCommit);
            return comparison;
        }
        catch (error) {
            this.logger.error(`Failed to get commit diff for project ${projectId}:`, error);
            throw new common_1.BadRequestException(`Unable to get commit comparison: ${fromCommit}...${toCommit}`);
        }
    }
    async createWebhook(projectId, webhookUrl, secretToken) {
        try {
            const webhook = await this.gitlab.ProjectHooks.add(projectId, webhookUrl, {
                pushEvents: true,
                mergeRequestsEvents: true,
                issuesEvents: false,
                confidentialIssuesEvents: false,
                tagPushEvents: true,
                noteEvents: false,
                jobEvents: false,
                pipelineEvents: false,
                wikiPageEvents: false,
                deploymentEvents: false,
                releasesEvents: false,
                subgroupEvents: false,
                enableSslVerification: true,
                token: secretToken,
            });
            this.logger.log(`Webhook created for project ${projectId}: ${webhook.id}`);
            return webhook;
        }
        catch (error) {
            this.logger.error(`Failed to create webhook for project ${projectId}:`, error);
            throw new common_1.BadRequestException(`Unable to create webhook for project: ${projectId}`);
        }
    }
    async listWebhooks(projectId) {
        try {
            const webhooks = await this.gitlab.ProjectHooks.all(projectId);
            return webhooks;
        }
        catch (error) {
            this.logger.error(`Failed to list webhooks for project ${projectId}:`, error);
            throw new common_1.BadRequestException(`Unable to list webhooks for project: ${projectId}`);
        }
    }
    async deleteWebhook(projectId, webhookId) {
        try {
            await this.gitlab.ProjectHooks.remove(projectId, webhookId);
            this.logger.log(`Webhook ${webhookId} deleted for project ${projectId}`);
        }
        catch (error) {
            this.logger.error(`Failed to delete webhook ${webhookId} for project ${projectId}:`, error);
            throw new common_1.BadRequestException(`Unable to delete webhook: ${webhookId}`);
        }
    }
    async getRepositoryArchive(projectId, options = {}) {
        const gitlabUrl = this.configService.get('GITLAB_URL', 'https://gitlab.com');
        const archiveUrl = `${gitlabUrl}/api/v4/projects/${encodeURIComponent(projectId.toString())}/repository/archive.${options.format || 'zip'}`;
        this.logger.log(`Repository archive URL generated for project ${projectId}: ${archiveUrl}`);
        return archiveUrl;
    }
    isValidGitlabUrl(url) {
        try {
            const parsedUrl = new URL(url);
            const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
            if (pathParts.length > 0 && pathParts[pathParts.length - 1].endsWith('.git')) {
                pathParts[pathParts.length - 1] = pathParts[pathParts.length - 1].replace('.git', '');
            }
            return pathParts.length >= 2;
        }
        catch {
            return false;
        }
    }
    async getProjectLanguages(projectId) {
        try {
            const languages = await this.gitlab.Projects.showLanguages(projectId);
            return languages;
        }
        catch (error) {
            this.logger.error(`Failed to get languages for project ${projectId}:`, error);
            throw new common_1.BadRequestException(`Unable to get project languages: ${projectId}`);
        }
    }
    async getFileRaw(projectId, filePath, ref = 'main') {
        try {
            const file = await this.gitlab.RepositoryFiles.showRaw(projectId, filePath, ref);
            return file;
        }
        catch (error) {
            this.logger.error(`Failed to get raw file for ${filePath} in project ${projectId}:`, error);
            throw new common_1.BadRequestException(`Unable to get raw file: ${filePath}`);
        }
    }
};
exports.GitlabService = GitlabService;
exports.GitlabService = GitlabService = GitlabService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _a : Object])
], GitlabService);


/***/ }),
/* 35 */
/***/ ((module) => {

module.exports = require("@gitbeaker/rest");

/***/ }),
/* 36 */
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
var DocumentService_1;
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DocumentService = void 0;
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const typeorm_2 = __webpack_require__(13);
const entities_1 = __webpack_require__(11);
const adapters_1 = __webpack_require__(29);
const fs = __webpack_require__(22);
const path = __webpack_require__(23);
const crypto = __webpack_require__(24);
let DocumentService = DocumentService_1 = class DocumentService {
    constructor(docsBucketRepository, documentRepository, tekProjectRepository) {
        this.docsBucketRepository = docsBucketRepository;
        this.documentRepository = documentRepository;
        this.tekProjectRepository = tekProjectRepository;
        this.logger = new common_1.Logger(DocumentService_1.name);
    }
    async createDefaultBuckets(tekProject) {
        const buckets = adapters_1.DocumentAdapter.createDefaultDocsBuckets(tekProject);
        return await this.docsBucketRepository.save(buckets);
    }
    async createBucket(createData) {
        this.logger.log(`Creating docs bucket: ${createData.name} for project: ${createData.projectId}`);
        const tekProject = await this.findTekProjectById(createData.projectId);
        const bucket = adapters_1.DocumentAdapter.fromCreateBucketData(createData, tekProject);
        return await this.docsBucketRepository.save(bucket);
    }
    async findBucketsByProjectId(projectId) {
        return await this.docsBucketRepository.find({
            where: { project: { id: projectId }, status: entities_1.BucketStatus.ACTIVE },
            order: { createdAt: 'ASC' },
        });
    }
    async findBucketById(id) {
        const bucket = await this.docsBucketRepository.findOne({
            where: { id },
            relations: ['project', 'documents'],
        });
        if (!bucket) {
            throw new common_1.NotFoundException(`Docs bucket ${id} not found`);
        }
        return bucket;
    }
    async updateBucket(id, updateData) {
        const existingBucket = await this.findBucketById(id);
        const updatedBucket = adapters_1.DocumentAdapter.fromUpdateBucketData(existingBucket, updateData);
        return await this.docsBucketRepository.save(updatedBucket);
    }
    async deleteBucket(id) {
        const bucket = await this.findBucketById(id);
        bucket.status = entities_1.BucketStatus.ARCHIVED;
        bucket.updatedAt = new Date();
        await this.docsBucketRepository.save(bucket);
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
exports.DocumentService = DocumentService = DocumentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.DocsBucket)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.Document)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.TekProject)),
    __metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object, typeof (_b = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _b : Object, typeof (_c = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _c : Object])
], DocumentService);


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
var TekProjectController_1;
var _a, _b, _c, _d, _e, _f, _g, _h, _j;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TekProjectController = void 0;
const common_1 = __webpack_require__(2);
const tekproject_service_1 = __webpack_require__(28);
const document_service_1 = __webpack_require__(36);
const dto_1 = __webpack_require__(38);
let TekProjectController = TekProjectController_1 = class TekProjectController {
    constructor(tekProjectService, documentService) {
        this.tekProjectService = tekProjectService;
        this.documentService = documentService;
        this.logger = new common_1.Logger(TekProjectController_1.name);
    }
    async createTekProject(createDto) {
        this.logger.log(`Creating TekProject: ${createDto.name}`);
        const tekProject = await this.tekProjectService.create(createDto);
        await this.documentService.createDefaultBuckets(tekProject);
        return {
            success: true,
            data: tekProject,
            message: 'TekProject created successfully',
        };
    }
    async listTekProjects(page, perPage, sort, orderBy) {
        const options = {
            page: page || 1,
            perPage: perPage || 20,
            sort: sort || 'createdAt',
            orderBy: orderBy || 'desc',
        };
        const result = await this.tekProjectService.findAll(options);
        return {
            success: true,
            data: result,
        };
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
    __metadata("design:paramtypes", [typeof (_c = typeof dto_1.CreateTekProjectDto !== "undefined" && dto_1.CreateTekProjectDto) === "function" ? _c : Object]),
    __metadata("design:returntype", typeof (_d = typeof Promise !== "undefined" && Promise) === "function" ? _d : Object)
], TekProjectController.prototype, "createTekProject", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('perPage')),
    __param(2, (0, common_1.Query)('sort')),
    __param(3, (0, common_1.Query)('orderBy')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", typeof (_e = typeof Promise !== "undefined" && Promise) === "function" ? _e : Object)
], TekProjectController.prototype, "listTekProjects", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", typeof (_f = typeof Promise !== "undefined" && Promise) === "function" ? _f : Object)
], TekProjectController.prototype, "getTekProject", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, typeof (_g = typeof dto_1.UpdateTekProjectDto !== "undefined" && dto_1.UpdateTekProjectDto) === "function" ? _g : Object]),
    __metadata("design:returntype", typeof (_h = typeof Promise !== "undefined" && Promise) === "function" ? _h : Object)
], TekProjectController.prototype, "updateTekProject", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", typeof (_j = typeof Promise !== "undefined" && Promise) === "function" ? _j : Object)
], TekProjectController.prototype, "deleteTekProject", null);
exports.TekProjectController = TekProjectController = TekProjectController_1 = __decorate([
    (0, common_1.Controller)('tekprojects'),
    __metadata("design:paramtypes", [typeof (_a = typeof tekproject_service_1.TekProjectService !== "undefined" && tekproject_service_1.TekProjectService) === "function" ? _a : Object, typeof (_b = typeof document_service_1.DocumentService !== "undefined" && document_service_1.DocumentService) === "function" ? _b : Object])
], TekProjectController);


/***/ }),
/* 38 */
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
__exportStar(__webpack_require__(39), exports);
__exportStar(__webpack_require__(41), exports);
__exportStar(__webpack_require__(42), exports);
__exportStar(__webpack_require__(43), exports);
__exportStar(__webpack_require__(44), exports);
__exportStar(__webpack_require__(45), exports);


/***/ }),
/* 39 */
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
const class_validator_1 = __webpack_require__(40);
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
/* 40 */
/***/ ((module) => {

module.exports = require("class-validator");

/***/ }),
/* 41 */
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
const class_validator_1 = __webpack_require__(40);
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CreateCodebaseDto = void 0;
const class_validator_1 = __webpack_require__(40);
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
exports.CreateDocsBucketDto = void 0;
const class_validator_1 = __webpack_require__(40);
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
exports.UpdateDocsBucketDto = void 0;
const class_validator_1 = __webpack_require__(40);
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
exports.UploadDocumentDto = void 0;
const class_validator_1 = __webpack_require__(40);
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
    (0, class_validator_1.IsIn)(['markdown', 'pdf', 'text', 'html', 'other']),
    __metadata("design:type", String)
], UploadDocumentDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UploadDocumentDto.prototype, "tags", void 0);


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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CodebaseController_1;
var _a, _b, _c, _d, _e, _f, _g, _h;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CodebaseController = void 0;
const common_1 = __webpack_require__(2);
const codebase_service_1 = __webpack_require__(33);
const pipeline_orchestrator_service_1 = __webpack_require__(47);
const index_pipeline_entity_1 = __webpack_require__(18);
const dto_1 = __webpack_require__(38);
let CodebaseController = CodebaseController_1 = class CodebaseController {
    constructor(codebaseService, pipelineOrchestrator) {
        this.codebaseService = codebaseService;
        this.pipelineOrchestrator = pipelineOrchestrator;
        this.logger = new common_1.Logger(CodebaseController_1.name);
    }
    async createCodebase(createDto) {
        this.logger.log(`Creating codebase: ${createDto.name} for TekProject: ${createDto.projectId}`);
        const codebase = await this.codebaseService.create(createDto);
        return {
            success: true,
            data: codebase,
            message: 'Codebase created successfully',
        };
    }
    async listCodebases(projectId) {
        if (!projectId) {
            throw new Error('projectId query parameter is required');
        }
        const codebases = await this.codebaseService.findByProjectId(projectId);
        return {
            success: true,
            data: codebases,
        };
    }
    async getCodebase(id) {
        const codebase = await this.codebaseService.findById(id);
        return {
            success: true,
            data: codebase,
        };
    }
    async startIndexingJob(codebaseId, options = {}) {
        this.logger.log(`Starting indexing job for codebase: ${codebaseId}`);
        const { codebase } = await this.codebaseService.findForIndexing(codebaseId);
        const job = await this.pipelineOrchestrator.createPipeline({
            projectId: codebase.project.id,
            codebaseId: codebase.id,
            type: this.mapPipelineType(options.type) || index_pipeline_entity_1.IndexPipelineType.INCREMENTAL,
            baseCommit: options.baseCommit,
            targetCommit: options.targetCommit,
            priority: 1,
            customConfiguration: options.customConfiguration,
        });
        return {
            success: true,
            data: {
                jobId: job.id,
                type: job.type,
                status: job.status,
            },
            message: 'Indexing job started successfully',
        };
    }
    async getCodebaseIndexStatus(codebaseId) {
        const codebase = await this.codebaseService.findById(codebaseId);
        const { activePipelines, recentPipelines, summary } = await this.pipelineOrchestrator.getPipelinesForCodebase(codebaseId);
        const indexStatus = {
            codebase: {
                id: codebase.id,
                name: codebase.name,
                status: codebase.status,
                lastIndexAt: codebase.lastSyncAt,
                lastIndexCommit: codebase.lastSyncCommit,
            },
            activeJobs: activePipelines.map(pipeline => ({
                id: pipeline.id,
                type: pipeline.type,
                status: pipeline.status,
                progress: pipeline.progress,
                currentStep: pipeline.currentStep,
                startedAt: pipeline.startedAt,
                description: pipeline.description,
            })),
            recentJobs: recentPipelines.map(pipeline => ({
                id: pipeline.id,
                type: pipeline.type,
                status: pipeline.status,
                progress: pipeline.progress,
                startedAt: pipeline.startedAt,
                completedAt: pipeline.completedAt,
                duration: pipeline.completedAt && pipeline.startedAt
                    ? pipeline.completedAt.getTime() - pipeline.startedAt.getTime()
                    : null,
                description: pipeline.description,
                error: pipeline.error,
            })),
            summary: {
                activeJobCount: summary.activeCount,
                recentJobCount: summary.recentCount,
                hasRunningJob: summary.hasRunning,
            },
        };
        return {
            success: true,
            data: indexStatus,
        };
    }
    mapPipelineType(pipelineType) {
        switch (pipelineType) {
            case 'full':
                return index_pipeline_entity_1.IndexPipelineType.FULL;
            case 'incremental':
                return index_pipeline_entity_1.IndexPipelineType.INCREMENTAL;
            default:
                return undefined;
        }
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", typeof (_e = typeof Promise !== "undefined" && Promise) === "function" ? _e : Object)
], CodebaseController.prototype, "listCodebases", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", typeof (_f = typeof Promise !== "undefined" && Promise) === "function" ? _f : Object)
], CodebaseController.prototype, "getCodebase", null);
__decorate([
    (0, common_1.Post)(':id/index'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", typeof (_g = typeof Promise !== "undefined" && Promise) === "function" ? _g : Object)
], CodebaseController.prototype, "startIndexingJob", null);
__decorate([
    (0, common_1.Get)(':id/index/status'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", typeof (_h = typeof Promise !== "undefined" && Promise) === "function" ? _h : Object)
], CodebaseController.prototype, "getCodebaseIndexStatus", null);
exports.CodebaseController = CodebaseController = CodebaseController_1 = __decorate([
    (0, common_1.Controller)('codebases'),
    __metadata("design:paramtypes", [typeof (_a = typeof codebase_service_1.CodebaseService !== "undefined" && codebase_service_1.CodebaseService) === "function" ? _a : Object, typeof (_b = typeof pipeline_orchestrator_service_1.PipelineOrchestratorService !== "undefined" && pipeline_orchestrator_service_1.PipelineOrchestratorService) === "function" ? _b : Object])
], CodebaseController);


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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PipelineOrchestratorService_1;
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PipelineOrchestratorService = void 0;
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const typeorm_2 = __webpack_require__(13);
const config_1 = __webpack_require__(4);
const entities_1 = __webpack_require__(11);
const index_pipeline_entity_1 = __webpack_require__(18);
const git_sync_task_1 = __webpack_require__(48);
const code_parsing_task_1 = __webpack_require__(53);
const graph_update_task_1 = __webpack_require__(55);
const cleanup_task_1 = __webpack_require__(56);
const pipeline_config_service_1 = __webpack_require__(57);
const pipeline_worker_service_1 = __webpack_require__(58);
const fs = __webpack_require__(22);
const path = __webpack_require__(23);
const os = __webpack_require__(59);
let PipelineOrchestratorService = PipelineOrchestratorService_1 = class PipelineOrchestratorService {
    constructor(pipelineRepository, projectRepository, codebaseRepository, configService, pipelineConfigService, pipelineWorkerService, gitSyncTask, codeParsingTask, graphUpdateTask, cleanupTask) {
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
        this.logger = new common_1.Logger(PipelineOrchestratorService_1.name);
        this.runningPipelines = new Map();
    }
    async createPipeline(request) {
        this.logger.log(`Creating pipeline: ${request.type} for project ${request.projectId}`);
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
        const configuration = this.pipelineConfigService.getDefaultConfiguration(request.type, request.customConfiguration);
        const pipeline = new index_pipeline_entity_1.IndexPipeline();
        pipeline.type = request.type;
        pipeline.status = index_pipeline_entity_1.IndexPipelineStatus.PENDING;
        pipeline.priority = request.priority || 0;
        pipeline.description = request.description;
        pipeline.configuration = configuration;
        pipeline.metadata = this.createInitialMetadata();
        pipeline.project = project;
        pipeline.codebase = codebase;
        const savedPipeline = await this.pipelineRepository.save(pipeline);
        const executionPromise = this.pipelineWorkerService.submitPipeline(savedPipeline.id, savedPipeline.type, () => this.executePipeline(savedPipeline.id));
        this.runningPipelines.set(savedPipeline.id, executionPromise);
        executionPromise
            .then(result => {
            this.logger.log(`Pipeline ${savedPipeline.id} completed with status: ${result.status}`);
        })
            .catch(error => {
            this.logger.error(`Pipeline ${savedPipeline.id} execution failed:`, error);
        })
            .finally(() => {
            this.runningPipelines.delete(savedPipeline.id);
        });
        return savedPipeline;
    }
    async executePipeline(pipelineId) {
        const startTime = Date.now();
        let tasksExecuted = 0;
        let tasksSucceeded = 0;
        let tasksFailed = 0;
        let finalError;
        try {
            const pipeline = await this.pipelineRepository.findOne({
                where: { id: pipelineId },
                relations: ['project', 'codebase'],
            });
            if (!pipeline) {
                throw new Error(`Pipeline ${pipelineId} not found`);
            }
            this.logger.log(`Starting pipeline execution: ${pipelineId}`);
            await this.updatePipelineStatus(pipeline, index_pipeline_entity_1.IndexPipelineStatus.RUNNING);
            const context = await this.createPipelineContext(pipeline);
            const tasks = this.getTaskInstances();
            for (const task of tasks) {
                if (!task.shouldExecute(context)) {
                    context.logger.info(`Skipping task: ${task.name} (conditions not met)`);
                    continue;
                }
                tasksExecuted++;
                context.logger.info(`Executing task: ${task.name}`);
                try {
                    pipeline.currentStep = task.name;
                    pipeline.progress = Math.round((tasksExecuted / tasks.length) * 100);
                    await this.pipelineRepository.save(pipeline);
                    const result = await task.execute(context);
                    if (result.success) {
                        tasksSucceeded++;
                        context.logger.info(`Task completed successfully: ${task.name}`, {
                            duration: result.duration,
                            metrics: result.metrics,
                        });
                    }
                    else {
                        tasksFailed++;
                        finalError = result.error;
                        context.logger.error(`Task failed: ${task.name}`, { error: result.error });
                        break;
                    }
                }
                catch (error) {
                    tasksFailed++;
                    finalError = error.message;
                    context.logger.error(`Task execution error: ${task.name}`, { error: error.message });
                    break;
                }
                finally {
                    try {
                        await task.cleanup(context);
                    }
                    catch (cleanupError) {
                        context.logger.warn(`Task cleanup failed: ${task.name}`, { error: cleanupError.message });
                    }
                }
            }
            const finalStatus = tasksFailed > 0 ? index_pipeline_entity_1.IndexPipelineStatus.FAILED : index_pipeline_entity_1.IndexPipelineStatus.COMPLETED;
            pipeline.progress = finalStatus === index_pipeline_entity_1.IndexPipelineStatus.COMPLETED ? 100 : pipeline.progress;
            await this.updatePipelineStatus(pipeline, finalStatus, finalError);
            await this.cleanupPipelineContext(context);
            const duration = Date.now() - startTime;
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
            this.logger.error(`Pipeline ${pipelineId} execution failed:`, error);
            try {
                const pipeline = await this.pipelineRepository.findOne({ where: { id: pipelineId } });
                if (pipeline) {
                    await this.updatePipelineStatus(pipeline, index_pipeline_entity_1.IndexPipelineStatus.FAILED, error.message);
                }
            }
            catch (updateError) {
                this.logger.error(`Failed to update pipeline status:`, updateError);
            }
            const duration = Date.now() - startTime;
            return {
                pipelineId,
                status: index_pipeline_entity_1.IndexPipelineStatus.FAILED,
                duration,
                tasksExecuted,
                tasksSucceeded,
                tasksFailed: tasksExecuted - tasksSucceeded,
                finalError: error.message,
            };
        }
    }
    async getPipelineStatus(pipelineId) {
        const pipeline = await this.pipelineRepository.findOne({
            where: { id: pipelineId },
            relations: ['project', 'codebase'],
        });
        if (!pipeline) {
            throw new Error(`Pipeline ${pipelineId} not found`);
        }
        return pipeline;
    }
    async cancelPipeline(pipelineId) {
        const pipeline = await this.pipelineRepository.findOne({
            where: { id: pipelineId },
        });
        if (!pipeline) {
            throw new Error(`Pipeline ${pipelineId} not found`);
        }
        if (pipeline.status === index_pipeline_entity_1.IndexPipelineStatus.COMPLETED || pipeline.status === index_pipeline_entity_1.IndexPipelineStatus.FAILED) {
            throw new Error(`Cannot cancel pipeline in status: ${pipeline.status}`);
        }
        const cancelledFromQueue = await this.pipelineWorkerService.cancelQueuedPipeline(pipelineId);
        await this.updatePipelineStatus(pipeline, index_pipeline_entity_1.IndexPipelineStatus.CANCELLED);
        this.runningPipelines.delete(pipelineId);
        this.logger.log(`Pipeline ${pipelineId} cancelled ${cancelledFromQueue ? '(removed from queue)' : '(marked as cancelled)'}`);
    }
    async createPipelineContext(pipeline) {
        const workingDirectory = path.join(os.tmpdir(), 'tekaicontextengine', 'pipelines', pipeline.id);
        const tempDirectory = path.join(workingDirectory, 'temp');
        await fs.mkdir(workingDirectory, { recursive: true });
        await fs.mkdir(tempDirectory, { recursive: true });
        const codebaseStoragePath = pipeline.codebase?.storagePath ||
            path.join(this.configService.get('STORAGE_ROOT', './storage'), 'codebases', pipeline.codebase?.id || 'unknown');
        await fs.mkdir(codebaseStoragePath, { recursive: true });
        const logger = {
            info: (message, meta) => this.logger.log(`[${pipeline.id}] ${message}`, meta),
            warn: (message, meta) => this.logger.warn(`[${pipeline.id}] ${message}`, meta),
            error: (message, meta) => this.logger.error(`[${pipeline.id}] ${message}`, meta),
            debug: (message, meta) => this.logger.debug(`[${pipeline.id}] ${message}`, meta),
        };
        return {
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
    }
    async cleanupPipelineContext(context) {
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
    getWorkerPoolStats() {
        return this.pipelineWorkerService.getPoolStats();
    }
    resizeWorkerPool(newSize) {
        this.pipelineWorkerService.resizePool(newSize);
        this.logger.log(`Worker pool resized to ${newSize} workers`);
    }
    getActivePipelines() {
        return this.pipelineWorkerService.getActivePipelines();
    }
    isPipelineActive(pipelineId) {
        return this.runningPipelines.has(pipelineId) || this.pipelineWorkerService.isPipelineActive(pipelineId);
    }
    async getSystemStatus() {
        const poolStats = this.getWorkerPoolStats();
        const activePipelines = Array.from(this.runningPipelines.keys());
        return {
            workerPool: poolStats,
            runningPipelines: activePipelines.length,
            activePipelineIds: activePipelines,
            systemHealth: {
                queueBacklog: poolStats?.queuedTasks || 0,
                utilization: poolStats?.utilization || 0,
                isHealthy: (poolStats?.utilization || 0) < 0.9,
            },
        };
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
exports.PipelineOrchestratorService = PipelineOrchestratorService = PipelineOrchestratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(index_pipeline_entity_1.IndexPipeline)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.TekProject)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.Codebase)),
    __metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object, typeof (_b = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _b : Object, typeof (_c = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _c : Object, typeof (_d = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _d : Object, typeof (_e = typeof pipeline_config_service_1.PipelineConfigService !== "undefined" && pipeline_config_service_1.PipelineConfigService) === "function" ? _e : Object, typeof (_f = typeof pipeline_worker_service_1.PipelineWorkerService !== "undefined" && pipeline_worker_service_1.PipelineWorkerService) === "function" ? _f : Object, typeof (_g = typeof git_sync_task_1.GitSyncTask !== "undefined" && git_sync_task_1.GitSyncTask) === "function" ? _g : Object, typeof (_h = typeof code_parsing_task_1.CodeParsingTask !== "undefined" && code_parsing_task_1.CodeParsingTask) === "function" ? _h : Object, typeof (_j = typeof graph_update_task_1.GraphUpdateTask !== "undefined" && graph_update_task_1.GraphUpdateTask) === "function" ? _j : Object, typeof (_k = typeof cleanup_task_1.CleanupTask !== "undefined" && cleanup_task_1.CleanupTask) === "function" ? _k : Object])
], PipelineOrchestratorService);


/***/ }),
/* 48 */
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
exports.GitSyncTask = void 0;
const common_1 = __webpack_require__(2);
const base_task_interface_1 = __webpack_require__(49);
const index_pipeline_entity_1 = __webpack_require__(18);
const git_client_service_1 = __webpack_require__(50);
let GitSyncTask = class GitSyncTask extends base_task_interface_1.BaseTask {
    constructor(gitClient) {
        super();
        this.gitClient = gitClient;
        this.name = 'git_sync';
        this.description = 'Synchronize Git repository and prepare workspace';
        this.requiredSteps = [];
        this.optionalSteps = [];
    }
    shouldExecute(context) {
        return !!context.codebase?.gitlabUrl;
    }
    async validate(context) {
        if (!context.codebase) {
            throw new Error('Codebase is required for Git sync');
        }
        if (!context.codebase.gitlabUrl) {
            throw new Error('GitLab URL is required for Git sync');
        }
        if (!context.workingDirectory) {
            throw new Error('Working directory is required for Git sync');
        }
    }
    async executeTask(context) {
        const { pipeline, codebase, codebaseStoragePath, config } = context;
        const isIncremental = pipeline.type === index_pipeline_entity_1.IndexPipelineType.INCREMENTAL &&
            await this.gitClient.isValidRepository(codebaseStoragePath);
        try {
            let commitHash;
            let filesChanged = [];
            let filesAdded = [];
            let filesDeleted = [];
            if (isIncremental) {
                context.logger.info('Starting incremental Git sync', {
                    path: codebaseStoragePath,
                    branch: codebase.branch
                });
                const beforeCommit = await this.gitClient.getCurrentCommit(codebaseStoragePath);
                commitHash = await this.gitClient.pullRepository(codebaseStoragePath, {
                    branch: codebase.branch,
                    gitConfig: codebase.metadata?.gitConfig
                });
                const changes = await this.gitClient.getDiff(codebaseStoragePath, {
                    fromCommit: beforeCommit,
                    nameOnly: true
                });
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
            }
            else {
                context.logger.info('Starting full Git clone', {
                    url: codebase.gitlabUrl,
                    branch: codebase.branch,
                    destination: codebaseStoragePath
                });
                if (await this.gitClient.isValidRepository(codebaseStoragePath)) {
                    await this.gitClient.deleteRepository(codebaseStoragePath);
                }
                commitHash = await this.gitClient.cloneRepository(codebase.gitlabUrl, codebaseStoragePath, {
                    branch: codebase.branch,
                    depth: config.gitSync.shallow ? 1 : undefined,
                    gitConfig: codebase.metadata?.gitConfig
                });
                filesAdded = await this.gitClient.listFiles(codebaseStoragePath);
            }
            const totalFiles = filesAdded.length + filesChanged.length;
            context.logger.info('Git sync completed', {
                mode: isIncremental ? 'incremental' : 'full',
                commitHash,
                filesAdded: filesAdded.length,
                filesChanged: filesChanged.length,
                filesDeleted: filesDeleted.length,
                totalFiles,
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
            context.logger.error('Git sync failed', { error: error.message });
            return {
                success: false,
                duration: 0,
                error: `Git sync failed: ${error.message}`,
            };
        }
    }
    async cleanup(context) {
        context.logger.debug('Git sync cleanup completed');
    }
    getEstimatedDuration(context) {
        const baseTime = 30000;
        const isIncremental = context.pipeline.type === index_pipeline_entity_1.IndexPipelineType.INCREMENTAL;
        return isIncremental ? baseTime * 0.3 : baseTime;
    }
};
exports.GitSyncTask = GitSyncTask;
exports.GitSyncTask = GitSyncTask = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof git_client_service_1.GitClientService !== "undefined" && git_client_service_1.GitClientService) === "function" ? _a : Object])
], GitSyncTask);


/***/ }),
/* 49 */
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
var GitClientService_1;
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GitClientService = void 0;
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(4);
const child_process_1 = __webpack_require__(51);
const git_config_1 = __webpack_require__(52);
const fs = __webpack_require__(22);
const path = __webpack_require__(23);
const crypto = __webpack_require__(24);
let GitClientService = GitClientService_1 = class GitClientService {
    constructor(configService) {
        this.logger = new common_1.Logger(GitClientService_1.name);
        this.gitConfiguration = git_config_1.GitConfiguration.getInstance(configService);
        this.timeouts = this.gitConfiguration.getTimeouts();
    }
    async cloneRepository(gitlabUrl, localPath, options = {}) {
        this.logger.log(`Cloning repository ${gitlabUrl} to ${localPath}`);
        await fs.mkdir(path.dirname(localPath), { recursive: true });
        const args = ['clone'];
        if (options.depth) {
            args.push('--depth', options.depth.toString());
        }
        if (options.branch) {
            args.push('--branch', options.branch);
        }
        const authenticatedUrl = this.addAuthentication(gitlabUrl, options);
        args.push(authenticatedUrl, localPath);
        await this.executeGitCommand(args, {
            timeout: this.timeouts.cloneTimeout
        });
        if (options.sparseCheckout && options.sparseCheckout.length > 0) {
            await this.setupSparseCheckout(localPath, options.sparseCheckout);
        }
        const initialCommit = await this.getCurrentCommit(localPath);
        this.logger.log(`Successfully cloned repository to ${localPath}, commit: ${initialCommit}`);
        return initialCommit;
    }
    async pullRepository(localPath, options = {}) {
        this.logger.log(`Pulling updates for repository at ${localPath}`);
        const beforeCommit = await this.getCurrentCommit(localPath);
        const args = ['pull', 'origin'];
        if (options.branch) {
            args.push(options.branch);
        }
        await this.executeGitCommand(args, {
            cwd: localPath,
            timeout: this.timeouts.pullTimeout
        });
        const afterCommit = await this.getCurrentCommit(localPath);
        if (beforeCommit !== afterCommit) {
            this.logger.log(`Repository updated from ${beforeCommit} to ${afterCommit}`);
        }
        else {
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
        return new Promise((resolve, reject) => {
            const { timeout = this.timeouts.commandTimeout, ...spawnOptions } = options;
            const process = (0, child_process_1.spawn)('git', args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                ...spawnOptions,
            });
            let stdout = '';
            let stderr = '';
            process.stdout?.on('data', (data) => {
                stdout += data.toString();
            });
            process.stderr?.on('data', (data) => {
                stderr += data.toString();
            });
            const timeoutId = setTimeout(() => {
                process.kill('SIGTERM');
                reject(new Error(`Git command timed out after ${timeout}ms: git ${args.join(' ')}`));
            }, timeout);
            process.on('close', (code) => {
                clearTimeout(timeoutId);
                if (code === 0) {
                    resolve({ stdout, stderr });
                }
                else {
                    const error = new Error(`Git command failed with code ${code}: ${stderr || stdout}`);
                    this.logger.error(`Git command failed: git ${args.join(' ')}`, error);
                    reject(error);
                }
            });
            process.on('error', (error) => {
                clearTimeout(timeoutId);
                this.logger.error(`Git command error: git ${args.join(' ')}`, error);
                reject(error);
            });
        });
    }
};
exports.GitClientService = GitClientService;
exports.GitClientService = GitClientService = GitClientService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _a : Object])
], GitClientService);


/***/ }),
/* 51 */
/***/ ((module) => {

module.exports = require("child_process");

/***/ }),
/* 52 */
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
/* 53 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CodeParsingTask = void 0;
const common_1 = __webpack_require__(2);
const base_task_interface_1 = __webpack_require__(49);
const index_pipeline_entity_1 = __webpack_require__(18);
const fs = __webpack_require__(22);
const path = __webpack_require__(23);
const child_process_1 = __webpack_require__(51);
const util_1 = __webpack_require__(54);
const execAsync = (0, util_1.promisify)(child_process_1.exec);
let CodeParsingTask = class CodeParsingTask extends base_task_interface_1.BaseTask {
    constructor() {
        super(...arguments);
        this.name = 'code_parsing';
        this.description = 'Parse source code and extract symbols';
        this.requiredSteps = ['gitSync'];
        this.optionalSteps = [];
    }
    shouldExecute(context) {
        return !!(context.data.gitSync?.filesChanged?.length);
    }
    async validate(context) {
        await super.validate(context);
        if (!context.data.gitSync?.clonePath) {
            throw new Error('Git sync must complete before code parsing');
        }
        const clonePath = context.data.gitSync.clonePath;
        try {
            await fs.access(clonePath);
        }
        catch (error) {
            throw new Error(`Repository path not accessible: ${clonePath}`);
        }
    }
    async executeTask(context) {
        const { pipeline, data, config, logger } = context;
        const clonePath = data.gitSync.clonePath;
        let filesToProcess = [];
        if (pipeline.type === index_pipeline_entity_1.IndexPipelineType.INCREMENTAL) {
            filesToProcess = [
                ...data.gitSync.filesAdded,
                ...data.gitSync.filesChanged
            ];
            logger.info('Incremental parsing mode', {
                added: data.gitSync.filesAdded.length,
                changed: data.gitSync.filesChanged.length,
                deleted: data.gitSync.filesDeleted.length,
            });
        }
        else {
            filesToProcess = data.gitSync.filesAdded;
            logger.info('Full parsing mode', {
                totalFiles: filesToProcess.length
            });
        }
        let totalSymbolsExtracted = 0;
        let filesProcessed = 0;
        const parsingResults = [];
        const languages = {};
        try {
            logger.info('Starting code parsing', {
                totalFiles: filesToProcess.length,
                languages: Object.keys(config.parsing.languages).filter(lang => config.parsing.languages[lang].enabled)
            });
            const filesByLanguage = this.groupFilesByLanguage(filesToProcess);
            for (const [language, languageFiles] of Object.entries(filesByLanguage)) {
                if (!config.parsing.languages[language]?.enabled) {
                    continue;
                }
                logger.info(`Parsing ${language} files`, { count: languageFiles.length });
                const languageResult = await this.parseLanguageFiles(language, languageFiles, clonePath, config, context);
                totalSymbolsExtracted += languageResult.symbolsExtracted;
                filesProcessed += languageResult.filesProcessed;
                parsingResults.push(...languageResult.results);
                languages[language] = languageResult.filesProcessed;
            }
            logger.info('Code parsing completed', {
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
            logger.error('Code parsing failed', { error: error.message });
            return {
                success: false,
                duration: 0,
                error: `Code parsing failed: ${error.message}`,
            };
        }
    }
    getEstimatedDuration(context) {
        const files = context.data.gitSync?.filesChanged?.length || 0;
        return Math.max(60000, files * 100);
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
        const { config, tempDirectory, logger } = context;
        const fileListPath = path.join(tempDirectory, `${language}-files.txt`);
        await fs.writeFile(fileListPath, files.join('\n'));
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
        logger.debug('Running Docker parser', { command: dockerCmd });
        try {
            const { stdout, stderr } = await execAsync(dockerCmd, {
                timeout: config.docker.timeout,
            });
            logger.debug('Docker parser output', { stdout, stderr });
            const resultsPath = path.join(tempDirectory, `${language}-results.json`);
            const resultsContent = await fs.readFile(resultsPath, 'utf-8');
            const results = JSON.parse(resultsContent);
            return {
                symbolsExtracted: results.symbols?.length || 0,
                filesProcessed: results.files?.length || 0,
                results: results.symbols || [],
            };
        }
        catch (error) {
            logger.error(`Docker parsing failed for ${language}`, { error: error.message });
            throw error;
        }
    }
    async parseWithLocalTools(language, files, repoPath, languageConfig, context) {
        const { logger } = context;
        logger.warn(`Local parsing not implemented for ${language}, using mock results`);
        await new Promise(resolve => setTimeout(resolve, 1000 * files.length * 0.1));
        return {
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
    }
    async cleanup(context) {
        const { tempDirectory } = context;
        try {
            const files = await fs.readdir(tempDirectory);
            const parsingFiles = files.filter(file => file.endsWith('-files.txt') || file.endsWith('-results.json'));
            for (const file of parsingFiles) {
                await fs.rm(path.join(tempDirectory, file), { force: true });
            }
            context.logger.debug('Code parsing cleanup completed');
        }
        catch (error) {
            context.logger.warn('Code parsing cleanup failed', { error: error.message });
        }
    }
};
exports.CodeParsingTask = CodeParsingTask;
exports.CodeParsingTask = CodeParsingTask = __decorate([
    (0, common_1.Injectable)()
], CodeParsingTask);


/***/ }),
/* 54 */
/***/ ((module) => {

module.exports = require("util");

/***/ }),
/* 55 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GraphUpdateTask = void 0;
const common_1 = __webpack_require__(2);
const base_task_interface_1 = __webpack_require__(49);
let GraphUpdateTask = class GraphUpdateTask extends base_task_interface_1.BaseTask {
    constructor() {
        super(...arguments);
        this.name = 'update_graph';
        this.description = 'Update Neo4j knowledge graph with parsed symbols';
        this.requiredSteps = ['codeParsing'];
        this.optionalSteps = [];
    }
    shouldExecute(context) {
        return !!(context.data.codeParsing?.parsingResults?.length);
    }
    async validate(context) {
        await super.validate(context);
        if (!context.data.codeParsing?.parsingResults) {
            throw new Error('Code parsing results required for graph update');
        }
        const { config } = context;
        if (!config.graph.url || !config.graph.username || !config.graph.password) {
            throw new Error('Neo4j connection configuration is required');
        }
    }
    async executeTask(context) {
        const { data, config, logger, project, codebase } = context;
        const parsingResults = data.codeParsing.parsingResults;
        let nodesCreated = 0;
        let nodesUpdated = 0;
        let relationshipsCreated = 0;
        let relationshipsUpdated = 0;
        let session;
        try {
            logger.info('Starting graph update', {
                totalResults: parsingResults.length,
                database: config.graph.database,
            });
            session = {
                run: async (query, params) => {
                    logger.debug('Mock Neo4j query', { query, params });
                    return { records: [{ get: () => 'created' }] };
                },
                close: async () => { },
            };
            await session.run('RETURN 1');
            logger.debug('Neo4j connection established');
            await this.ensureProjectNodes(session, project, codebase, logger);
            const batchSize = config.graph.batchSize;
            for (let i = 0; i < parsingResults.length; i += batchSize) {
                const batch = parsingResults.slice(i, i + batchSize);
                logger.debug(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(parsingResults.length / batchSize)}`);
                const batchResult = await this.processBatch(session, batch, project, codebase, config, logger);
                nodesCreated += batchResult.nodesCreated;
                nodesUpdated += batchResult.nodesUpdated;
                relationshipsCreated += batchResult.relationshipsCreated;
                relationshipsUpdated += batchResult.relationshipsUpdated;
            }
            logger.info('Graph update completed', {
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
            logger.error('Graph update failed', { error: error.message });
            return {
                success: false,
                duration: 0,
                error: `Graph update failed: ${error.message}`,
            };
        }
        finally {
            if (session) {
                await session.close();
            }
            if (this.driver) {
                await this.driver.close();
            }
        }
    }
    getEstimatedDuration(context) {
        const results = context.data.codeParsing?.parsingResults?.length || 0;
        const symbols = context.data.codeParsing?.symbolsExtracted || 0;
        return Math.max(30000, symbols * 10);
    }
    async ensureProjectNodes(session, project, codebase, logger) {
        await session.run(`
      MERGE (p:Project {id: $projectId})
      SET p.name = $projectName,
          p.updatedAt = datetime()
      ON CREATE SET p.createdAt = datetime()
    `, {
            projectId: project.id,
            projectName: project.name,
        });
        if (codebase) {
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
        }
        logger.debug('Project and codebase nodes ensured');
    }
    async processBatch(session, batch, project, codebase, config, logger) {
        let nodesCreated = 0;
        let nodesUpdated = 0;
        let relationshipsCreated = 0;
        let relationshipsUpdated = 0;
        for (const fileResult of batch) {
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
        if (this.driver) {
            await this.driver.close();
            this.driver = undefined;
        }
        context.logger.debug('Graph update cleanup completed');
    }
};
exports.GraphUpdateTask = GraphUpdateTask;
exports.GraphUpdateTask = GraphUpdateTask = __decorate([
    (0, common_1.Injectable)()
], GraphUpdateTask);


/***/ }),
/* 56 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CleanupTask = void 0;
const common_1 = __webpack_require__(2);
const base_task_interface_1 = __webpack_require__(49);
const fs = __webpack_require__(22);
const path = __webpack_require__(23);
let CleanupTask = class CleanupTask extends base_task_interface_1.BaseTask {
    constructor() {
        super(...arguments);
        this.name = 'cleanup';
        this.description = 'Clean up temporary files and resources';
        this.requiredSteps = [];
        this.optionalSteps = ['gitSync', 'codeParsing', 'graphUpdate'];
    }
    shouldExecute(context) {
        return true;
    }
    async validate(context) {
    }
    async executeTask(context) {
        const { logger, workingDirectory, tempDirectory, config } = context;
        let tempFilesRemoved = 0;
        let diskSpaceFreed = 0;
        try {
            logger.info('Starting cleanup', {
                workingDirectory,
                tempDirectory,
                enableTempCleanup: config.performance.tempDirCleanup,
            });
            if (config.performance.tempDirCleanup && tempDirectory) {
                const tempResult = await this.cleanDirectory(tempDirectory, logger);
                tempFilesRemoved += tempResult.filesRemoved;
                diskSpaceFreed += tempResult.spaceFreed;
            }
            if (workingDirectory && context.data.gitSync?.clonePath) {
                const workingResult = await this.cleanDirectory(workingDirectory, logger);
                tempFilesRemoved += workingResult.filesRemoved;
                diskSpaceFreed += workingResult.spaceFreed;
            }
            if (config.docker.enabled && config.docker.cleanup) {
                await this.cleanupDockerResources(logger);
            }
            logger.info('Cleanup completed', {
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
            logger.error('Cleanup failed', { error: error.message });
            return {
                success: true,
                duration: 0,
                error: `Cleanup warning: ${error.message}`,
            };
        }
    }
    getEstimatedDuration(context) {
        return 10000;
    }
    async cleanDirectory(dirPath, logger) {
        let filesRemoved = 0;
        let spaceFreed = 0;
        try {
            await fs.access(dirPath);
            logger.debug(`Cleaning directory: ${dirPath}`);
            const sizeBefore = await this.getDirectorySize(dirPath);
            await fs.rm(dirPath, { recursive: true, force: true });
            spaceFreed = sizeBefore;
            filesRemoved = await this.countFilesInDirectory(dirPath, true);
            logger.debug(`Directory cleaned: ${dirPath}`, {
                filesRemoved,
                spaceFreedMB: Math.round(spaceFreed / (1024 * 1024)),
            });
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                logger.warn(`Failed to clean directory: ${dirPath}`, { error: error.message });
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
    async cleanupDockerResources(logger) {
        try {
            const { exec } = __webpack_require__(51);
            const { promisify } = __webpack_require__(54);
            const execAsync = promisify(exec);
            logger.debug('Cleaning up Docker resources');
            try {
                await execAsync('docker container prune -f --filter "label=tekaicontextengine"');
                logger.debug('Docker containers cleaned');
            }
            catch (error) {
                logger.warn('Failed to clean Docker containers', { error: error.message });
            }
            try {
                await execAsync('docker image prune -f');
                logger.debug('Docker images cleaned');
            }
            catch (error) {
                logger.warn('Failed to clean Docker images', { error: error.message });
            }
        }
        catch (error) {
            logger.warn('Docker cleanup failed', { error: error.message });
        }
    }
    async cleanup(context) {
        context.logger.debug('Cleanup task cleanup completed');
    }
};
exports.CleanupTask = CleanupTask;
exports.CleanupTask = CleanupTask = __decorate([
    (0, common_1.Injectable)()
], CleanupTask);


/***/ }),
/* 57 */
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
/* 58 */
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
var PipelineWorkerService_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PipelineWorkerService = void 0;
const common_1 = __webpack_require__(2);
const worker_pool_service_1 = __webpack_require__(26);
const config_1 = __webpack_require__(4);
let PipelineWorkerService = PipelineWorkerService_1 = class PipelineWorkerService {
    constructor(workerPoolService, configService) {
        this.workerPoolService = workerPoolService;
        this.configService = configService;
        this.logger = new common_1.Logger(PipelineWorkerService_1.name);
        this.PIPELINE_POOL_NAME = 'pipeline-execution';
    }
    async onModuleInit() {
        this.initializePipelinePool();
    }
    async submitPipeline(pipelineId, pipelineType, executeFn) {
        const task = {
            id: `pipeline-${pipelineId}`,
            pipelineId,
            type: pipelineType,
            priority: this.getPipelinePriority(pipelineType),
            timeout: this.getPipelineTimeout(pipelineType),
            execute: executeFn,
        };
        this.logger.log(`Submitting pipeline ${pipelineId} to worker pool`);
        try {
            const result = await this.workerPoolService.submitTask(this.PIPELINE_POOL_NAME, task);
            this.logger.log(`Pipeline ${pipelineId} completed in worker pool`);
            return result;
        }
        catch (error) {
            this.logger.error(`Pipeline ${pipelineId} failed in worker pool:`, error);
            throw error;
        }
    }
    getPoolStats() {
        const pool = this.workerPoolService.getPool(this.PIPELINE_POOL_NAME);
        return pool ? pool.getStats() : null;
    }
    resizePool(newSize) {
        const pool = this.workerPoolService.getPool(this.PIPELINE_POOL_NAME);
        if (pool) {
            pool.resize(newSize);
            this.logger.log(`Resized pipeline worker pool to ${newSize} workers`);
        }
    }
    initializePipelinePool() {
        const maxWorkers = this.configService.get('PIPELINE_MAX_WORKERS', 4);
        const taskTimeout = this.configService.get('PIPELINE_TASK_TIMEOUT', 1800000);
        const retryAttempts = this.configService.get('PIPELINE_RETRY_ATTEMPTS', 1);
        const queueSize = this.configService.get('PIPELINE_QUEUE_SIZE', 100);
        const idleTimeout = this.configService.get('PIPELINE_IDLE_TIMEOUT', 300000);
        this.workerPoolService.createPool(this.PIPELINE_POOL_NAME, {
            maxWorkers,
            taskTimeout,
            retryAttempts,
            queueSize,
            idleTimeout,
        });
        this.logger.log(`Initialized pipeline worker pool with ${maxWorkers} workers`);
    }
    getPipelinePriority(pipelineType) {
        switch (pipelineType.toUpperCase()) {
            case 'WEBHOOK':
                return 10;
            case 'INCREMENTAL':
                return 8;
            case 'FULL':
                return 5;
            case 'DOCUMENT':
                return 6;
            case 'ANALYSIS':
                return 3;
            default:
                return 5;
        }
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
    getActivePipelines() {
        const pool = this.workerPoolService.getPool(this.PIPELINE_POOL_NAME);
        if (!pool)
            return [];
        const stats = pool.getStats();
        return Array.from({ length: stats.activeWorkers }, (_, i) => `active-pipeline-${i}`);
    }
    isPipelineActive(_pipelineId) {
        const pool = this.workerPoolService.getPool(this.PIPELINE_POOL_NAME);
        return pool ? pool.getStats().activeWorkers > 0 : false;
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
exports.PipelineWorkerService = PipelineWorkerService = PipelineWorkerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof worker_pool_service_1.WorkerPoolService !== "undefined" && worker_pool_service_1.WorkerPoolService) === "function" ? _a : Object, typeof (_b = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _b : Object])
], PipelineWorkerService);


/***/ }),
/* 59 */
/***/ ((module) => {

module.exports = require("os");

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
var DocsBucketController_1, DocumentController_1;
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DocumentController = exports.DocsBucketController = void 0;
const common_1 = __webpack_require__(2);
const platform_express_1 = __webpack_require__(61);
const document_service_1 = __webpack_require__(36);
const dto_1 = __webpack_require__(38);
let DocsBucketController = DocsBucketController_1 = class DocsBucketController {
    constructor(documentService) {
        this.documentService = documentService;
        this.logger = new common_1.Logger(DocsBucketController_1.name);
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
    __metadata("design:paramtypes", [typeof (_b = typeof dto_1.CreateDocsBucketDto !== "undefined" && dto_1.CreateDocsBucketDto) === "function" ? _b : Object]),
    __metadata("design:returntype", typeof (_c = typeof Promise !== "undefined" && Promise) === "function" ? _c : Object)
], DocsBucketController.prototype, "createDocsBucket", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", typeof (_d = typeof Promise !== "undefined" && Promise) === "function" ? _d : Object)
], DocsBucketController.prototype, "listDocsBuckets", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", typeof (_e = typeof Promise !== "undefined" && Promise) === "function" ? _e : Object)
], DocsBucketController.prototype, "getDocsBucket", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, typeof (_f = typeof dto_1.UpdateDocsBucketDto !== "undefined" && dto_1.UpdateDocsBucketDto) === "function" ? _f : Object]),
    __metadata("design:returntype", typeof (_g = typeof Promise !== "undefined" && Promise) === "function" ? _g : Object)
], DocsBucketController.prototype, "updateDocsBucket", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", typeof (_h = typeof Promise !== "undefined" && Promise) === "function" ? _h : Object)
], DocsBucketController.prototype, "deleteDocsBucket", null);
exports.DocsBucketController = DocsBucketController = DocsBucketController_1 = __decorate([
    (0, common_1.Controller)('docsbuckets'),
    __metadata("design:paramtypes", [typeof (_a = typeof document_service_1.DocumentService !== "undefined" && document_service_1.DocumentService) === "function" ? _a : Object])
], DocsBucketController);
let DocumentController = DocumentController_1 = class DocumentController {
    constructor(documentService) {
        this.documentService = documentService;
        this.logger = new common_1.Logger(DocumentController_1.name);
    }
    async uploadDocument(file, uploadDto) {
        this.logger.log(`Uploading document: ${uploadDto.title} to bucket: ${uploadDto.bucketId}`);
        const document = await this.documentService.uploadDocument(file, uploadDto);
        return {
            success: true,
            data: document,
            message: 'Document uploaded successfully',
        };
    }
    async listDocuments(bucketId, page, perPage) {
        if (!bucketId) {
            throw new Error('bucketId query parameter is required');
        }
        const options = {
            page: page || 1,
            perPage: perPage || 20,
        };
        const result = await this.documentService.findDocumentsByBucketId(bucketId, options);
        return {
            success: true,
            data: result,
        };
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
    __metadata("design:paramtypes", [Object, typeof (_k = typeof dto_1.UploadDocumentDto !== "undefined" && dto_1.UploadDocumentDto) === "function" ? _k : Object]),
    __metadata("design:returntype", typeof (_l = typeof Promise !== "undefined" && Promise) === "function" ? _l : Object)
], DocumentController.prototype, "uploadDocument", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('bucketId')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('perPage')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", typeof (_m = typeof Promise !== "undefined" && Promise) === "function" ? _m : Object)
], DocumentController.prototype, "listDocuments", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", typeof (_o = typeof Promise !== "undefined" && Promise) === "function" ? _o : Object)
], DocumentController.prototype, "getDocument", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", typeof (_p = typeof Promise !== "undefined" && Promise) === "function" ? _p : Object)
], DocumentController.prototype, "deleteDocument", null);
exports.DocumentController = DocumentController = DocumentController_1 = __decorate([
    (0, common_1.Controller)('documents'),
    __metadata("design:paramtypes", [typeof (_j = typeof document_service_1.DocumentService !== "undefined" && document_service_1.DocumentService) === "function" ? _j : Object])
], DocumentController);


/***/ }),
/* 61 */
/***/ ((module) => {

module.exports = require("@nestjs/platform-express");

/***/ }),
/* 62 */
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
const gitlab_service_1 = __webpack_require__(34);
const git_client_service_1 = __webpack_require__(50);
const gitlab_webhook_service_1 = __webpack_require__(63);
const entities_1 = __webpack_require__(11);
const indexing_module_1 = __webpack_require__(64);
let GitlabModule = class GitlabModule {
};
exports.GitlabModule = GitlabModule;
exports.GitlabModule = GitlabModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            typeorm_1.TypeOrmModule.forFeature([entities_1.Codebase]),
            indexing_module_1.IndexingModule,
        ],
        providers: [
            gitlab_service_1.GitlabService,
            git_client_service_1.GitClientService,
            gitlab_webhook_service_1.GitLabWebhookService,
        ],
        exports: [
            gitlab_service_1.GitlabService,
            git_client_service_1.GitClientService,
            gitlab_webhook_service_1.GitLabWebhookService,
        ],
    })
], GitlabModule);


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
var GitLabWebhookService_1;
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GitLabWebhookService = void 0;
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const typeorm_2 = __webpack_require__(13);
const config_1 = __webpack_require__(4);
const entities_1 = __webpack_require__(11);
const pipeline_orchestrator_service_1 = __webpack_require__(47);
const index_pipeline_entity_1 = __webpack_require__(18);
const crypto = __webpack_require__(24);
let GitLabWebhookService = GitLabWebhookService_1 = class GitLabWebhookService {
    constructor(codebaseRepository, pipelineOrchestrator, configService) {
        this.codebaseRepository = codebaseRepository;
        this.pipelineOrchestrator = pipelineOrchestrator;
        this.configService = configService;
        this.logger = new common_1.Logger(GitLabWebhookService_1.name);
    }
    async processWebhook(payload, signature, codebaseId) {
        this.logger.log(`Processing GitLab webhook: ${payload.object_kind} for project ${payload.project_id}`);
        try {
            const codebases = await this.findMatchingCodebases(payload, codebaseId);
            if (codebases.length === 0) {
                return {
                    processed: false,
                    reason: 'No matching codebases found for webhook',
                };
            }
            const results = [];
            for (const codebase of codebases) {
                if (codebase.webhookSecret && signature) {
                    const isValid = await this.verifyWebhookSignature(JSON.stringify(payload), signature, codebase.webhookSecret);
                    if (!isValid) {
                        this.logger.warn(`Invalid webhook signature for codebase ${codebase.id}`);
                        results.push({
                            processed: false,
                            reason: 'Invalid webhook signature',
                        });
                        continue;
                    }
                }
                if (codebase.syncMode !== entities_1.SyncMode.WEBHOOK && codebase.syncMode !== entities_1.SyncMode.AUTO) {
                    this.logger.log(`Codebase ${codebase.id} not configured for webhook sync`);
                    results.push({
                        processed: false,
                        reason: 'Codebase not configured for webhook sync',
                    });
                    continue;
                }
                const result = await this.processWebhookEvent(payload, codebase);
                results.push(result);
            }
            const successfulResult = results.find(r => r.processed);
            return successfulResult || results[results.length - 1];
        }
        catch (error) {
            this.logger.error('Failed to process GitLab webhook:', error);
            return {
                processed: false,
                error: error.message,
            };
        }
    }
    async processWebhookEvent(payload, codebase) {
        switch (payload.object_kind) {
            case 'push':
                return this.processPushEvent(payload, codebase);
            case 'merge_request':
                return this.processMergeRequestEvent(payload, codebase);
            case 'tag_push':
                return this.processTagPushEvent(payload, codebase);
            default:
                this.logger.log(`Unsupported webhook event type: ${payload.object_kind}`);
                return {
                    processed: false,
                    reason: `Unsupported webhook event type: ${payload.object_kind}`,
                };
        }
    }
    async processPushEvent(payload, codebase) {
        const branchName = payload.ref.replace('refs/heads/', '');
        if (branchName !== codebase.branch) {
            this.logger.log(`Push to non-tracked branch ${branchName}, ignoring`);
            return {
                processed: false,
                reason: `Push to non-tracked branch: ${branchName}`,
            };
        }
        if (payload.after === '0000000000000000000000000000000000000000') {
            this.logger.log('Branch deletion detected, ignoring');
            return {
                processed: false,
                reason: 'Branch deletion event',
            };
        }
        if (payload.total_commits_count === 0) {
            this.logger.log('No commits in push event, ignoring');
            return {
                processed: false,
                reason: 'No commits in push event',
            };
        }
        const pipeline = await this.pipelineOrchestrator.createPipeline({
            projectId: codebase.project.id,
            codebaseId: codebase.id,
            type: index_pipeline_entity_1.IndexPipelineType.INCREMENTAL,
            baseCommit: payload.before !== '0000000000000000000000000000000000000000' ? payload.before : undefined,
            targetCommit: payload.after,
            priority: 2,
            description: `Webhook push: ${payload.commits.length} commits`,
        });
        this.logger.log(`Created webhook pipeline ${pipeline.id} for codebase ${codebase.id}`);
        return {
            processed: true,
            pipelineId: pipeline.id,
        };
    }
    async processMergeRequestEvent(payload, codebase) {
        if (payload.object_attributes?.state !== 'merged') {
            return {
                processed: false,
                reason: 'Merge request not merged',
            };
        }
        const targetBranch = payload.object_attributes?.target_branch;
        if (targetBranch !== codebase.branch) {
            return {
                processed: false,
                reason: `Merge request target branch ${targetBranch} does not match tracked branch`,
            };
        }
        const pipeline = await this.pipelineOrchestrator.createPipeline({
            projectId: codebase.project.id,
            codebaseId: codebase.id,
            type: index_pipeline_entity_1.IndexPipelineType.INCREMENTAL,
            priority: 2,
            description: `Merge request webhook`,
        });
        this.logger.log(`Created merge request pipeline ${pipeline.id} for codebase ${codebase.id}`);
        return {
            processed: true,
            pipelineId: pipeline.id,
        };
    }
    async processTagPushEvent(payload, codebase) {
        if (payload.after === '0000000000000000000000000000000000000000') {
            return {
                processed: false,
                reason: 'Tag deletion event',
            };
        }
        const tagName = payload.ref.replace('refs/tags/', '');
        const versionTagPattern = /^v?\d+\.\d+\.\d+/;
        if (!versionTagPattern.test(tagName)) {
            return {
                processed: false,
                reason: `Tag ${tagName} does not match version pattern`,
            };
        }
        const pipeline = await this.pipelineOrchestrator.createPipeline({
            projectId: codebase.project.id,
            codebaseId: codebase.id,
            type: index_pipeline_entity_1.IndexPipelineType.FULL,
            priority: 1,
            description: `Tag webhook: ${tagName}`,
        });
        this.logger.log(`Created tag pipeline ${pipeline.id} for codebase ${codebase.id} (tag: ${tagName})`);
        return {
            processed: true,
            pipelineId: pipeline.id,
        };
    }
    async findMatchingCodebases(payload, codebaseId) {
        if (codebaseId) {
            const codebase = await this.codebaseRepository.findOne({
                where: { id: codebaseId },
            });
            return codebase ? [codebase] : [];
        }
        const codebases = await this.codebaseRepository.find({
            where: [
                { gitlabProjectId: payload.project_id },
                { gitlabUrl: payload.project.web_url },
                { gitlabUrl: payload.project.http_url },
                { gitlabUrl: payload.project.git_http_url },
                { gitlabUrl: payload.project.git_ssh_url },
            ],
        });
        return codebases;
    }
    async verifyWebhookSignature(payload, signature, secret) {
        try {
            if (signature.startsWith('sha256=')) {
                const expectedSignature = crypto
                    .createHmac('sha256', secret)
                    .update(payload)
                    .digest('hex');
                const receivedSignature = signature.replace('sha256=', '');
                return crypto.timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(receivedSignature, 'hex'));
            }
            else {
                return signature === secret;
            }
        }
        catch (error) {
            this.logger.error('Failed to verify webhook signature:', error);
            return false;
        }
    }
    generateWebhookSecret() {
        return crypto.randomBytes(32).toString('hex');
    }
    getWebhookUrl(codebaseId) {
        const baseUrl = this.configService.get('APP_BASE_URL', 'http://localhost:3000');
        return `${baseUrl}/api/v1/gitlab/webhook/${codebaseId}`;
    }
    getWebhookConfig(codebaseId, secret) {
        return {
            url: this.getWebhookUrl(codebaseId),
            push_events: true,
            issues_events: false,
            merge_requests_events: true,
            tag_push_events: true,
            note_events: false,
            job_events: false,
            pipeline_events: false,
            wiki_page_events: false,
            deployment_events: false,
            releases_events: false,
            subgroup_events: false,
            enable_ssl_verification: true,
            token: secret,
            push_events_branch_filter: '',
        };
    }
    async testWebhook(codebaseId) {
        try {
            const codebase = await this.codebaseRepository.findOne({
                where: { id: codebaseId },
            });
            if (!codebase) {
                throw new Error(`Codebase ${codebaseId} not found`);
            }
            const testPayload = {
                object_kind: 'push',
                event_name: 'push',
                before: '0000000000000000000000000000000000000000',
                after: 'test123456789',
                ref: `refs/heads/${codebase.branch}`,
                project_id: codebase.gitlabProjectId || 0,
                total_commits_count: 0,
                project: {
                    id: codebase.gitlabProjectId || 0,
                    name: codebase.name,
                    web_url: codebase.gitlabUrl,
                    git_http_url: codebase.gitlabUrl,
                },
                commits: [],
            };
            const result = await this.processWebhook(testPayload);
            this.logger.log(`Webhook test for codebase ${codebaseId}: ${result.processed ? 'SUCCESS' : 'FAILED'}`);
            return result.processed;
        }
        catch (error) {
            this.logger.error(`Webhook test failed for codebase ${codebaseId}:`, error);
            return false;
        }
    }
};
exports.GitLabWebhookService = GitLabWebhookService;
exports.GitLabWebhookService = GitLabWebhookService = GitLabWebhookService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Codebase)),
    __metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object, typeof (_b = typeof pipeline_orchestrator_service_1.PipelineOrchestratorService !== "undefined" && pipeline_orchestrator_service_1.PipelineOrchestratorService) === "function" ? _b : Object, typeof (_c = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _c : Object])
], GitLabWebhookService);


/***/ }),
/* 64 */
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
const pipeline_orchestrator_service_1 = __webpack_require__(47);
const pipeline_worker_service_1 = __webpack_require__(58);
const pipeline_config_service_1 = __webpack_require__(57);
const git_sync_task_1 = __webpack_require__(48);
const code_parsing_task_1 = __webpack_require__(53);
const graph_update_task_1 = __webpack_require__(55);
const cleanup_task_1 = __webpack_require__(56);
const indexing_controller_1 = __webpack_require__(65);
const worker_pool_service_1 = __webpack_require__(26);
const gitlab_module_1 = __webpack_require__(62);
let IndexingModule = class IndexingModule {
};
exports.IndexingModule = IndexingModule;
exports.IndexingModule = IndexingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                entities_1.TekProject,
                entities_1.Codebase,
                entities_1.CodeSymbol,
                index_pipeline_entity_1.IndexPipeline,
            ]),
            gitlab_module_1.GitlabModule,
        ],
        controllers: [indexing_controller_1.IndexingController],
        providers: [
            pipeline_orchestrator_service_1.PipelineOrchestratorService,
            pipeline_worker_service_1.PipelineWorkerService,
            pipeline_config_service_1.PipelineConfigService,
            worker_pool_service_1.WorkerPoolService,
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
exports.IndexingController = exports.CreatePipelineDto = void 0;
const common_1 = __webpack_require__(2);
const swagger_1 = __webpack_require__(3);
const pipeline_orchestrator_service_1 = __webpack_require__(47);
const index_pipeline_entity_1 = __webpack_require__(18);
class CreatePipelineDto {
}
exports.CreatePipelineDto = CreatePipelineDto;
let IndexingController = class IndexingController {
    constructor(pipelineOrchestrator) {
        this.pipelineOrchestrator = pipelineOrchestrator;
    }
    async createPipeline(dto) {
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
            const job = await this.pipelineOrchestrator.createPipeline(request);
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
            if (error.message.includes('not found')) {
                throw new common_1.NotFoundException(error.message);
            }
            throw new common_1.BadRequestException(error.message);
        }
    }
    async getPipelineStatus(pipelineId) {
        try {
            const job = await this.pipelineOrchestrator.getPipelineStatus(pipelineId);
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
            if (error.message.includes('not found')) {
                throw new common_1.NotFoundException(error.message);
            }
            throw new common_1.BadRequestException(error.message);
        }
    }
    async cancelPipeline(pipelineId) {
        try {
            await this.pipelineOrchestrator.cancelPipeline(pipelineId);
            return {
                success: true,
                message: 'Pipeline cancelled successfully',
            };
        }
        catch (error) {
            if (error.message.includes('not found')) {
                throw new common_1.NotFoundException(error.message);
            }
            throw new common_1.BadRequestException(error.message);
        }
    }
    async startFullIndexing(codebaseId, description) {
        const request = {
            projectId: '',
            codebaseId,
            type: index_pipeline_entity_1.IndexPipelineType.FULL,
            description: description || 'Full codebase indexing',
        };
        const job = await this.pipelineOrchestrator.createPipeline(request);
        return {
            success: true,
            data: {
                pipelineId: job.id,
                status: job.status,
            },
            message: 'Full indexing started successfully',
        };
    }
    async startIncrementalUpdate(codebaseId, baseCommit, targetCommit) {
        const request = {
            projectId: '',
            codebaseId,
            type: index_pipeline_entity_1.IndexPipelineType.INCREMENTAL,
            baseCommit,
            targetCommit,
            description: 'Incremental codebase update',
        };
        const job = await this.pipelineOrchestrator.createPipeline(request);
        return {
            success: true,
            data: {
                pipelineId: job.id,
                status: job.status,
            },
            message: 'Incremental update started successfully',
        };
    }
    async startDependencyAnalysis(projectId, description) {
        const request = {
            projectId,
            type: index_pipeline_entity_1.IndexPipelineType.ANALYSIS,
            description: description || 'Project dependency analysis',
        };
        const job = await this.pipelineOrchestrator.createPipeline(request);
        return {
            success: true,
            data: {
                pipelineId: job.id,
                status: job.status,
            },
            message: 'Dependency analysis started successfully',
        };
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
    __metadata("design:paramtypes", [typeof (_a = typeof pipeline_orchestrator_service_1.PipelineOrchestratorService !== "undefined" && pipeline_orchestrator_service_1.PipelineOrchestratorService) === "function" ? _a : Object])
], IndexingController);


/***/ }),
/* 66 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SyncModule = void 0;
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(4);
const indexing_module_1 = __webpack_require__(64);
let SyncModule = class SyncModule {
};
exports.SyncModule = SyncModule;
exports.SyncModule = SyncModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            indexing_module_1.IndexingModule,
        ],
        exports: [
            indexing_module_1.IndexingModule,
        ],
    })
], SyncModule);


/***/ }),
/* 67 */
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
const terminus_1 = __webpack_require__(68);
const health_controller_1 = __webpack_require__(69);
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
/* 68 */
/***/ ((module) => {

module.exports = require("@nestjs/terminus");

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
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.HealthController = void 0;
const common_1 = __webpack_require__(2);
const terminus_1 = __webpack_require__(68);
let HealthController = class HealthController {
    constructor(health, db, memory) {
        this.health = health;
        this.db = db;
        this.memory = memory;
    }
    check() {
        return this.health.check([
            () => this.db.pingCheck('database'),
            () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
        ]);
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    (0, terminus_1.HealthCheck)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "check", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)('health'),
    __metadata("design:paramtypes", [typeof (_a = typeof terminus_1.HealthCheckService !== "undefined" && terminus_1.HealthCheckService) === "function" ? _a : Object, typeof (_b = typeof terminus_1.TypeOrmHealthIndicator !== "undefined" && terminus_1.TypeOrmHealthIndicator) === "function" ? _b : Object, typeof (_c = typeof terminus_1.MemoryHealthIndicator !== "undefined" && terminus_1.MemoryHealthIndicator) === "function" ? _c : Object])
], HealthController);


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
exports.WebSocketModule = void 0;
const common_1 = __webpack_require__(2);
const sync_gateway_1 = __webpack_require__(71);
const websocket_service_1 = __webpack_require__(74);
let WebSocketModule = class WebSocketModule {
};
exports.WebSocketModule = WebSocketModule;
exports.WebSocketModule = WebSocketModule = __decorate([
    (0, common_1.Module)({
        providers: [sync_gateway_1.SyncGateway, websocket_service_1.WebSocketService],
        exports: [websocket_service_1.WebSocketService],
    })
], WebSocketModule);


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
var SyncGateway_1;
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SyncGateway = void 0;
const websockets_1 = __webpack_require__(72);
const common_1 = __webpack_require__(2);
const socket_io_1 = __webpack_require__(73);
const websocket_service_1 = __webpack_require__(74);
let SyncGateway = SyncGateway_1 = class SyncGateway {
    constructor(webSocketService) {
        this.webSocketService = webSocketService;
        this.logger = new common_1.Logger(SyncGateway_1.name);
    }
    afterInit(server) {
        this.webSocketService.setServer(server);
        this.logger.log('WebSocket Gateway initialized');
    }
    handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
        client.emit('connected', {
            message: 'Connected to TekAI Context Engine sync service',
            clientId: client.id,
            timestamp: new Date(),
        });
        client.join('sync:global');
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }
    handleJoinProject(data, client) {
        const roomName = `project:${data.projectId}`;
        client.join(roomName);
        this.logger.debug(`Client ${client.id} joined project room: ${roomName}`);
        client.emit('joined:project', {
            projectId: data.projectId,
            roomName,
            timestamp: new Date(),
        });
    }
    handleLeaveProject(data, client) {
        const roomName = `project:${data.projectId}`;
        client.leave(roomName);
        this.logger.debug(`Client ${client.id} left project room: ${roomName}`);
        client.emit('left:project', {
            projectId: data.projectId,
            roomName,
            timestamp: new Date(),
        });
    }
    handleJoinCodebase(data, client) {
        const roomName = `codebase:${data.codebaseId}`;
        client.join(roomName);
        this.logger.debug(`Client ${client.id} joined codebase room: ${roomName}`);
        client.emit('joined:codebase', {
            codebaseId: data.codebaseId,
            roomName,
            timestamp: new Date(),
        });
    }
    handleLeaveCodebase(data, client) {
        const roomName = `codebase:${data.codebaseId}`;
        client.leave(roomName);
        this.logger.debug(`Client ${client.id} left codebase room: ${roomName}`);
        client.emit('left:codebase', {
            codebaseId: data.codebaseId,
            roomName,
            timestamp: new Date(),
        });
    }
    handleJoinUser(data, client) {
        const roomName = `user:${data.userId}`;
        client.join(roomName);
        this.logger.debug(`Client ${client.id} joined user room: ${roomName}`);
        client.emit('joined:user', {
            userId: data.userId,
            roomName,
            timestamp: new Date(),
        });
    }
    handleJoinSystem(client) {
        client.join('system:status');
        this.logger.debug(`Client ${client.id} joined system status room`);
        client.emit('joined:system', {
            roomName: 'system:status',
            timestamp: new Date(),
        });
    }
    handleGetStats(client) {
        const stats = this.webSocketService.getServerStats();
        client.emit('stats', {
            ...stats,
            timestamp: new Date(),
        });
    }
    handlePing(client) {
        client.emit('pong', {
            timestamp: new Date(),
        });
    }
    handleSubscribeNotifications(data, client) {
        const rooms = [];
        if (data.userId) {
            const userRoom = `user:${data.userId}`;
            client.join(userRoom);
            rooms.push(userRoom);
        }
        if (data.projectId) {
            const projectRoom = `project:${data.projectId}`;
            client.join(projectRoom);
            rooms.push(projectRoom);
        }
        if (data.codebaseId) {
            const codebaseRoom = `codebase:${data.codebaseId}`;
            client.join(codebaseRoom);
            rooms.push(codebaseRoom);
        }
        this.logger.debug(`Client ${client.id} subscribed to notifications: ${rooms.join(', ')}`);
        client.emit('subscribed:notifications', {
            rooms,
            timestamp: new Date(),
        });
    }
    handleUnsubscribeNotifications(data, client) {
        const rooms = [];
        if (data.userId) {
            const userRoom = `user:${data.userId}`;
            client.leave(userRoom);
            rooms.push(userRoom);
        }
        if (data.projectId) {
            const projectRoom = `project:${data.projectId}`;
            client.leave(projectRoom);
            rooms.push(projectRoom);
        }
        if (data.codebaseId) {
            const codebaseRoom = `codebase:${data.codebaseId}`;
            client.leave(codebaseRoom);
            rooms.push(codebaseRoom);
        }
        this.logger.debug(`Client ${client.id} unsubscribed from notifications: ${rooms.join(', ')}`);
        client.emit('unsubscribed:notifications', {
            rooms,
            timestamp: new Date(),
        });
    }
};
exports.SyncGateway = SyncGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", typeof (_b = typeof socket_io_1.Server !== "undefined" && socket_io_1.Server) === "function" ? _b : Object)
], SyncGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join:project'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, typeof (_c = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _c : Object]),
    __metadata("design:returntype", void 0)
], SyncGateway.prototype, "handleJoinProject", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave:project'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, typeof (_d = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _d : Object]),
    __metadata("design:returntype", void 0)
], SyncGateway.prototype, "handleLeaveProject", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('join:codebase'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, typeof (_e = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _e : Object]),
    __metadata("design:returntype", void 0)
], SyncGateway.prototype, "handleJoinCodebase", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave:codebase'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, typeof (_f = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _f : Object]),
    __metadata("design:returntype", void 0)
], SyncGateway.prototype, "handleLeaveCodebase", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('join:user'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, typeof (_g = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _g : Object]),
    __metadata("design:returntype", void 0)
], SyncGateway.prototype, "handleJoinUser", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('join:system'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_h = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _h : Object]),
    __metadata("design:returntype", void 0)
], SyncGateway.prototype, "handleJoinSystem", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('get:stats'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_j = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _j : Object]),
    __metadata("design:returntype", void 0)
], SyncGateway.prototype, "handleGetStats", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('ping'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_k = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _k : Object]),
    __metadata("design:returntype", void 0)
], SyncGateway.prototype, "handlePing", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe:notifications'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, typeof (_l = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _l : Object]),
    __metadata("design:returntype", void 0)
], SyncGateway.prototype, "handleSubscribeNotifications", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('unsubscribe:notifications'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, typeof (_m = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _m : Object]),
    __metadata("design:returntype", void 0)
], SyncGateway.prototype, "handleUnsubscribeNotifications", null);
exports.SyncGateway = SyncGateway = SyncGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: process.env.NODE_ENV === 'development' ? true : process.env.ALLOWED_ORIGINS?.split(','),
            credentials: true,
        },
        namespace: '/sync',
    }),
    __metadata("design:paramtypes", [typeof (_a = typeof websocket_service_1.WebSocketService !== "undefined" && websocket_service_1.WebSocketService) === "function" ? _a : Object])
], SyncGateway);


/***/ }),
/* 72 */
/***/ ((module) => {

module.exports = require("@nestjs/websockets");

/***/ }),
/* 73 */
/***/ ((module) => {

module.exports = require("socket.io");

/***/ }),
/* 74 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var WebSocketService_1;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WebSocketService = void 0;
const common_1 = __webpack_require__(2);
let WebSocketService = WebSocketService_1 = class WebSocketService {
    constructor() {
        this.logger = new common_1.Logger(WebSocketService_1.name);
    }
    setServer(server) {
        this.server = server;
        this.logger.log('WebSocket server initialized');
    }
    emitSyncStatusUpdate(update) {
        if (!this.server) {
            this.logger.warn('WebSocket server not initialized');
            return;
        }
        try {
            this.server.to(`codebase:${update.codebaseId}`).emit('sync:status', update);
            if (update.projectId) {
                this.server.to(`project:${update.projectId}`).emit('sync:status', update);
            }
            this.server.to('sync:global').emit('sync:status', update);
            this.logger.debug(`Sync status update emitted for job: ${update.syncJobId}`);
        }
        catch (error) {
            this.logger.error('Failed to emit sync status update:', error);
        }
    }
    emitNotification(notification) {
        if (!this.server) {
            this.logger.warn('WebSocket server not initialized');
            return;
        }
        try {
            if (notification.userId) {
                this.server.to(`user:${notification.userId}`).emit('notification', notification);
            }
            else if (notification.projectId) {
                this.server.to(`project:${notification.projectId}`).emit('notification', notification);
            }
            else if (notification.codebaseId) {
                this.server.to(`codebase:${notification.codebaseId}`).emit('notification', notification);
            }
            else {
                this.server.emit('notification', notification);
            }
            this.logger.debug(`Notification emitted: ${notification.type} - ${notification.title}`);
        }
        catch (error) {
            this.logger.error('Failed to emit notification:', error);
        }
    }
    emitSystemStatus(status) {
        if (!this.server) {
            return;
        }
        try {
            this.server.to('system:status').emit('system:status', status);
            this.logger.debug('System status update emitted');
        }
        catch (error) {
            this.logger.error('Failed to emit system status:', error);
        }
    }
    getConnectedClientsCount() {
        if (!this.server) {
            return 0;
        }
        return this.server.sockets.sockets.size;
    }
    getRoomInfo(roomName) {
        if (!this.server) {
            return { clientCount: 0, clients: [] };
        }
        const room = this.server.sockets.adapter.rooms.get(roomName);
        if (!room) {
            return { clientCount: 0, clients: [] };
        }
        return {
            clientCount: room.size,
            clients: Array.from(room),
        };
    }
    disconnectClient(clientId, reason) {
        if (!this.server) {
            return;
        }
        const socket = this.server.sockets.sockets.get(clientId);
        if (socket) {
            socket.disconnect(true);
            this.logger.log(`Client ${clientId} disconnected: ${reason || 'No reason provided'}`);
        }
    }
    sendToClient(clientId, event, data) {
        if (!this.server) {
            return;
        }
        const socket = this.server.sockets.sockets.get(clientId);
        if (socket) {
            socket.emit(event, data);
            this.logger.debug(`Message sent to client ${clientId}: ${event}`);
        }
    }
    getServerStats() {
        if (!this.server) {
            return {
                connectedClients: 0,
                rooms: [],
                uptime: 0,
            };
        }
        const rooms = Array.from(this.server.sockets.adapter.rooms.entries())
            .filter(([name]) => !name.startsWith('user:'))
            .map(([name, room]) => ({
            name,
            clientCount: room.size,
        }));
        return {
            connectedClients: this.server.sockets.sockets.size,
            rooms,
            uptime: process.uptime(),
        };
    }
};
exports.WebSocketService = WebSocketService;
exports.WebSocketService = WebSocketService = WebSocketService_1 = __decorate([
    (0, common_1.Injectable)()
], WebSocketService);


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
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    const port = configService.get('PORT', 3000);
    const nodeEnv = configService.get('NODE_ENV', 'development');
    app.useLogger(app.get(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER));
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    app.enableCors({
        origin: nodeEnv === 'development' ? true : process.env.ALLOWED_ORIGINS?.split(','),
        credentials: true,
    });
    app.setGlobalPrefix('api/v1');
    if (nodeEnv === 'development') {
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
    }
    await app.listen(port);
    console.log(`🚀 TekAI Context Engine is running on: http://localhost:${port}`);
    console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}
bootstrap().catch((error) => {
    console.error('❌ Error starting the application:', error);
    process.exit(1);
});

})();

/******/ })()
;