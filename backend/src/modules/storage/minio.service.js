"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MinioService = exports.LOCAL_STORAGE_ROOT = void 0;
exports.getStorageMode = getStorageMode;
var common_1 = require("@nestjs/common");
var Minio = require("minio");
var path = require("path");
var fs = require("fs");
exports.LOCAL_STORAGE_ROOT = path.join(process.cwd(), 'storage');
function getStorageMode() {
    return (process.env.STORAGE_BACKEND || 'minio');
}
var MinioService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var MinioService = _classThis = /** @class */ (function () {
        function MinioService_1(configService) {
            this.configService = configService;
            this.minioClient = null;
            this.storageMode = getStorageMode();
        }
        MinioService_1.prototype.onModuleInit = function () {
            if (this.storageMode === 'minio') {
                this.initializeMinio();
            }
            else {
                this.initializeLocalStorage();
            }
        };
        MinioService_1.prototype.initializeMinio = function () {
            var endPoint = this.configService.get('MINIO_ENDPOINT') || '127.0.0.1';
            var port = Number(this.configService.get('MINIO_PORT') || 9000);
            var useSSL = this.configService.get('MINIO_USE_SSL') === 'true';
            var accessKey = this.configService.get('MINIO_ROOT_USER') || 'minioadmin';
            var secretKey = this.configService.get('MINIO_ROOT_PASSWORD') || 'minioadmin';
            this.minioClient = new Minio.Client({
                endPoint: endPoint,
                port: port,
                useSSL: useSSL,
                accessKey: accessKey,
                secretKey: secretKey,
            });
            this.ensureBucketExists();
        };
        MinioService_1.prototype.initializeLocalStorage = function () {
            if (!fs.existsSync(exports.LOCAL_STORAGE_ROOT)) {
                fs.mkdirSync(exports.LOCAL_STORAGE_ROOT, { recursive: true });
            }
        };
        MinioService_1.prototype.ensureBucketExists = function () {
            return __awaiter(this, void 0, void 0, function () {
                var bucketName, exists;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this.minioClient)
                                return [2 /*return*/];
                            bucketName = this.configService.get('MINIO_BUCKET') || 'video-player';
                            return [4 /*yield*/, this.minioClient.bucketExists(bucketName)];
                        case 1:
                            exists = _a.sent();
                            if (!!exists) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.minioClient.makeBucket(bucketName, 'us-east-1')];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, this.minioClient.setBucketPolicy(bucketName, JSON.stringify({
                                    Version: '2012-10-17',
                                    Statement: [
                                        {
                                            Action: ['s3:GetObject'],
                                            Effect: 'Allow',
                                            Principal: { AWS: ['*'] },
                                            Resource: ["arn:aws:s3:::".concat(bucketName, "/*")],
                                        },
                                    ],
                                }))];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        MinioService_1.prototype.uploadFile = function (bucketName, objectName, filePath, contentType) {
            return __awaiter(this, void 0, void 0, function () {
                var publicBaseUrl, destPath, destDir;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(this.storageMode === 'minio' && this.minioClient)) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.minioClient.fPutObject(bucketName, objectName, filePath, {
                                    'Content-Type': contentType,
                                })];
                        case 1:
                            _a.sent();
                            publicBaseUrl = this.configService.get('MINIO_PUBLIC_BASE_URL') || 'http://127.0.0.1:9000';
                            return [2 /*return*/, "".concat(publicBaseUrl, "/").concat(bucketName, "/").concat(objectName)];
                        case 2:
                            destPath = path.join(exports.LOCAL_STORAGE_ROOT, objectName);
                            destDir = path.dirname(destPath);
                            if (!fs.existsSync(destDir)) {
                                fs.mkdirSync(destDir, { recursive: true });
                            }
                            fs.copyFileSync(filePath, destPath);
                            return [2 /*return*/, "/storage/".concat(objectName)];
                    }
                });
            });
        };
        MinioService_1.prototype.uploadObject = function (params) {
            return __awaiter(this, void 0, void 0, function () {
                var bucketName, publicBaseUrl, url, destPath, destDir, url;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            bucketName = this.configService.get('MINIO_BUCKET') || 'video-player';
                            if (!(this.storageMode === 'minio' && this.minioClient)) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.minioClient.putObject(bucketName, params.objectKey, params.buffer, params.size, {
                                    'Content-Type': params.mimeType,
                                })];
                        case 1:
                            _a.sent();
                            publicBaseUrl = this.configService.get('MINIO_PUBLIC_BASE_URL') || 'http://127.0.0.1:9000';
                            url = "".concat(publicBaseUrl, "/").concat(bucketName, "/").concat(params.objectKey);
                            return [2 /*return*/, {
                                    objectKey: params.objectKey,
                                    bucket: bucketName,
                                    url: url,
                                }];
                        case 2:
                            destPath = path.join(exports.LOCAL_STORAGE_ROOT, params.objectKey);
                            destDir = path.dirname(destPath);
                            if (!fs.existsSync(destDir)) {
                                fs.mkdirSync(destDir, { recursive: true });
                            }
                            fs.writeFileSync(destPath, params.buffer);
                            url = "/storage/".concat(params.objectKey);
                            return [2 /*return*/, {
                                    objectKey: params.objectKey,
                                    bucket: bucketName,
                                    url: url,
                                }];
                    }
                });
            });
        };
        MinioService_1.prototype.downloadObjectToFile = function (objectKey, filePath) {
            return __awaiter(this, void 0, void 0, function () {
                var bucketName, srcPath, destDir;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            bucketName = this.configService.get('MINIO_BUCKET') || 'video-player';
                            if (!(this.storageMode === 'minio' && this.minioClient)) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.minioClient.fGetObject(bucketName, objectKey, filePath)];
                        case 1:
                            _a.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            srcPath = path.join(exports.LOCAL_STORAGE_ROOT, objectKey);
                            destDir = path.dirname(filePath);
                            if (!fs.existsSync(destDir)) {
                                fs.mkdirSync(destDir, { recursive: true });
                            }
                            fs.copyFileSync(srcPath, filePath);
                            _a.label = 3;
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        MinioService_1.prototype.uploadFileFromPath = function (params) {
            return __awaiter(this, void 0, void 0, function () {
                var bucketName, fileSize, publicBaseUrl, url, destPath, destDir, url;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            bucketName = this.configService.get('MINIO_BUCKET') || 'video-player';
                            fileSize = fs.statSync(params.filePath).size;
                            if (!(this.storageMode === 'minio' && this.minioClient)) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.minioClient.fPutObject(bucketName, params.objectKey, params.filePath, {
                                    'Content-Type': params.mimeType,
                                })];
                        case 1:
                            _a.sent();
                            publicBaseUrl = this.configService.get('MINIO_PUBLIC_BASE_URL') || 'http://127.0.0.1:9000';
                            url = "".concat(publicBaseUrl, "/").concat(bucketName, "/").concat(params.objectKey);
                            return [2 /*return*/, {
                                    objectKey: params.objectKey,
                                    bucket: bucketName,
                                    url: url,
                                    size: fileSize,
                                }];
                        case 2:
                            destPath = path.join(exports.LOCAL_STORAGE_ROOT, params.objectKey);
                            destDir = path.dirname(destPath);
                            if (!fs.existsSync(destDir)) {
                                fs.mkdirSync(destDir, { recursive: true });
                            }
                            fs.copyFileSync(params.filePath, destPath);
                            url = "/storage/".concat(params.objectKey);
                            return [2 /*return*/, {
                                    objectKey: params.objectKey,
                                    bucket: bucketName,
                                    url: url,
                                    size: fileSize,
                                }];
                    }
                });
            });
        };
        MinioService_1.prototype.deleteFile = function (bucketName, objectName) {
            return __awaiter(this, void 0, void 0, function () {
                var filePath;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(this.storageMode === 'minio' && this.minioClient)) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.minioClient.removeObject(bucketName, objectName)];
                        case 1:
                            _a.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            filePath = path.join(exports.LOCAL_STORAGE_ROOT, objectName);
                            if (fs.existsSync(filePath)) {
                                fs.unlinkSync(filePath);
                            }
                            _a.label = 3;
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        MinioService_1.prototype.getStorageMode = function () {
            return this.storageMode;
        };
        return MinioService_1;
    }());
    __setFunctionName(_classThis, "MinioService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        MinioService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return MinioService = _classThis;
}();
exports.MinioService = MinioService;
