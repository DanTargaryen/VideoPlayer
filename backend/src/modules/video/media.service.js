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
exports.MediaService = void 0;
var common_1 = require("@nestjs/common");
var node_child_process_1 = require("node:child_process");
var promises_1 = require("node:fs/promises");
var node_os_1 = require("node:os");
var path = require("node:path");
var node_util_1 = require("node:util");
var execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
var FFMPEG_BIN = process.env.FFMPEG_PATH || 'ffmpeg';
var FFPROBE_BIN = process.env.FFPROBE_PATH || 'ffprobe';
var MediaService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var MediaService = _classThis = /** @class */ (function () {
        function MediaService_1(prisma, minioService) {
            this.prisma = prisma;
            this.minioService = minioService;
            this.logger = new common_1.Logger(MediaService.name);
            this.ffmpegAvailable = null;
        }
        MediaService_1.prototype.checkFfmpegAvailable = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (this.ffmpegAvailable !== null) {
                                return [2 /*return*/, this.ffmpegAvailable];
                            }
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, execFileAsync(FFPROBE_BIN, ['-version'])];
                        case 2:
                            _b.sent();
                            this.ffmpegAvailable = true;
                            this.logger.log("FFmpeg found: ".concat(FFMPEG_BIN, ", FFprobe found: ").concat(FFPROBE_BIN));
                            return [3 /*break*/, 4];
                        case 3:
                            _a = _b.sent();
                            this.ffmpegAvailable = false;
                            this.logger.warn("FFmpeg/FFprobe not found (ffmpeg=".concat(FFMPEG_BIN, ", ffprobe=").concat(FFPROBE_BIN, "). ") +
                                'Video processing (duration probe, cover generation, transcoding) will be skipped. ' +
                                'Please install FFmpeg and ensure it is in PATH, or set FFMPEG_PATH / FFPROBE_PATH in .env.');
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/, this.ffmpegAvailable];
                    }
                });
            });
        };
        MediaService_1.prototype.processVideo = function (videoId, originalAssetId, existingCoverAssetId) {
            return __awaiter(this, void 0, void 0, function () {
                var originalAsset, workDir, inputPath, coverPath, transcodedPath, durationSeconds, videoUpdate, coverObjectKey, uploadedCover, transcodedObjectKey, uploadedTranscoded, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.videoAsset.findUnique({ where: { id: originalAssetId } })];
                        case 1:
                            originalAsset = _a.sent();
                            if (!originalAsset) {
                                this.logger.warn("Original asset ".concat(originalAssetId, " not found"));
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, this.checkFfmpegAvailable()];
                        case 2:
                            if (!(_a.sent())) {
                                this.logger.warn("Media processing skipped for video ".concat(videoId, ": FFmpeg not available"));
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, (0, promises_1.mkdtemp)(path.join((0, node_os_1.tmpdir)(), 'videoplayer-media-'))];
                        case 3:
                            workDir = _a.sent();
                            inputPath = path.join(workDir, 'input');
                            coverPath = path.join(workDir, 'cover.jpg');
                            transcodedPath = path.join(workDir, 'transcoded.mp4');
                            _a.label = 4;
                        case 4:
                            _a.trys.push([4, 15, 16, 18]);
                            return [4 /*yield*/, this.minioService.downloadObjectToFile(originalAsset.objectKey, inputPath)];
                        case 5:
                            _a.sent();
                            return [4 /*yield*/, this.probeDuration(inputPath)];
                        case 6:
                            durationSeconds = _a.sent();
                            videoUpdate = {};
                            if (durationSeconds > 0) {
                                videoUpdate.durationSeconds = durationSeconds;
                            }
                            if (!!existingCoverAssetId) return [3 /*break*/, 10];
                            return [4 /*yield*/, this.generateCover(inputPath, coverPath)];
                        case 7:
                            _a.sent();
                            coverObjectKey = this.buildDerivedObjectKey(originalAsset.objectKey, 'covers', 'jpg');
                            return [4 /*yield*/, this.minioService.uploadFileFromPath({
                                    objectKey: coverObjectKey,
                                    filePath: coverPath,
                                    mimeType: 'image/jpeg',
                                    originalName: 'cover.jpg',
                                })];
                        case 8:
                            uploadedCover = _a.sent();
                            return [4 /*yield*/, this.prisma.videoAsset.create({
                                    data: {
                                        videoId: videoId,
                                        assetType: 'COVER',
                                        objectKey: uploadedCover.objectKey,
                                        bucket: uploadedCover.bucket,
                                        mimeType: 'image/jpeg',
                                        originalName: 'cover.jpg',
                                        fileSize: uploadedCover.size,
                                        url: uploadedCover.url,
                                    },
                                })];
                        case 9:
                            _a.sent();
                            videoUpdate.coverUrl = uploadedCover.url;
                            _a.label = 10;
                        case 10: return [4 /*yield*/, this.transcodeVideo(inputPath, transcodedPath)];
                        case 11:
                            _a.sent();
                            transcodedObjectKey = this.buildDerivedObjectKey(originalAsset.objectKey, 'transcoded', 'mp4');
                            return [4 /*yield*/, this.minioService.uploadFileFromPath({
                                    objectKey: transcodedObjectKey,
                                    filePath: transcodedPath,
                                    mimeType: 'video/mp4',
                                    originalName: 'transcoded.mp4',
                                })];
                        case 12:
                            uploadedTranscoded = _a.sent();
                            return [4 /*yield*/, this.prisma.videoAsset.create({
                                    data: {
                                        videoId: videoId,
                                        assetType: 'TRANSCODED',
                                        objectKey: uploadedTranscoded.objectKey,
                                        bucket: uploadedTranscoded.bucket,
                                        mimeType: 'video/mp4',
                                        originalName: 'transcoded.mp4',
                                        fileSize: uploadedTranscoded.size,
                                        url: uploadedTranscoded.url,
                                    },
                                })];
                        case 13:
                            _a.sent();
                            videoUpdate.playUrl = uploadedTranscoded.url;
                            return [4 /*yield*/, this.prisma.video.update({
                                    where: { id: videoId },
                                    data: videoUpdate,
                                })];
                        case 14:
                            _a.sent();
                            return [3 /*break*/, 18];
                        case 15:
                            error_1 = _a.sent();
                            this.logger.warn("Media processing skipped for video ".concat(videoId, ": ").concat(String(error_1)));
                            return [3 /*break*/, 18];
                        case 16: return [4 /*yield*/, (0, promises_1.rm)(workDir, { recursive: true, force: true })];
                        case 17:
                            _a.sent();
                            return [7 /*endfinally*/];
                        case 18: return [2 /*return*/];
                    }
                });
            });
        };
        MediaService_1.prototype.probeDuration = function (inputPath) {
            return __awaiter(this, void 0, void 0, function () {
                var stdout, duration;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, execFileAsync(FFPROBE_BIN, [
                                '-v',
                                'error',
                                '-show_entries',
                                'format=duration',
                                '-of',
                                'default=noprint_wrappers=1:nokey=1',
                                inputPath,
                            ])];
                        case 1:
                            stdout = (_a.sent()).stdout;
                            duration = Number.parseFloat(stdout.trim());
                            return [2 /*return*/, Number.isFinite(duration) ? Math.round(duration) : 0];
                    }
                });
            });
        };
        MediaService_1.prototype.generateCover = function (inputPath, coverPath) {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 4]);
                            return [4 /*yield*/, execFileAsync(FFMPEG_BIN, ['-y', '-i', inputPath, '-ss', '00:00:01', '-vframes', '1', coverPath])];
                        case 1:
                            _b.sent();
                            return [3 /*break*/, 4];
                        case 2:
                            _a = _b.sent();
                            return [4 /*yield*/, execFileAsync(FFMPEG_BIN, ['-y', '-i', inputPath, '-vframes', '1', coverPath])];
                        case 3:
                            _b.sent();
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        MediaService_1.prototype.transcodeVideo = function (inputPath, outputPath) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, execFileAsync(FFMPEG_BIN, [
                                '-y',
                                '-i',
                                inputPath,
                                '-c:v',
                                'libx264',
                                '-preset',
                                'veryfast',
                                '-crf',
                                '28',
                                '-c:a',
                                'aac',
                                '-movflags',
                                '+faststart',
                                outputPath,
                            ])];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        MediaService_1.prototype.buildDerivedObjectKey = function (originalKey, folder, extension) {
            var fileName = path.basename(originalKey).replace(/\.[^.]+$/, ".".concat(extension));
            return originalKey.replace('/original/', "/".concat(folder, "/")).replace(path.basename(originalKey), fileName);
        };
        return MediaService_1;
    }());
    __setFunctionName(_classThis, "MediaService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        MediaService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return MediaService = _classThis;
}();
exports.MediaService = MediaService;
