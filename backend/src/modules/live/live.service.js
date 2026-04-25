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
exports.LiveService = void 0;
var common_1 = require("@nestjs/common");
var LiveService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var LiveService = _classThis = /** @class */ (function () {
        function LiveService_1(prisma, videoService) {
            this.prisma = prisma;
            this.videoService = videoService;
            this.nextRoomId = 1;
            this.nextMessageId = 1;
            this.rooms = new Map();
        }
        LiveService_1.prototype.createRoom = function (user, payload) {
            var _a, _b;
            var roomId = this.nextRoomId++;
            var createdAt = new Date().toISOString();
            var streamKey = "room-".concat(roomId, "-").concat(Date.now());
            var rtmpBase = this.getSrsRtmpBase();
            var playBase = this.getSrsPlayBase();
            var room = {
                id: roomId,
                sessionId: roomId,
                title: payload.title,
                category: (_a = payload.category) !== null && _a !== void 0 ? _a : 'live',
                coverUrl: payload.coverUrl,
                sourceMode: (_b = payload.sourceMode) !== null && _b !== void 0 ? _b : 'camera',
                streamKey: streamKey,
                rtmpUrl: "".concat(rtmpBase, "/").concat(streamKey),
                playUrl: "".concat(playBase, "/").concat(streamKey, ".flv"),
                broadcasterId: user.id,
                broadcasterNickname: user.nickname,
                status: 'IDLE',
                createdAt: createdAt,
                replayUrl: undefined,
                replayAssetId: undefined,
                replayVideoId: undefined,
                latestFrame: undefined,
                latestFrameAt: undefined,
                viewers: new Map(),
                nextViewerId: 1,
                messages: [],
                roomFeedClients: new Set(),
                publisherSignalClients: new Set(),
                viewerSignalClients: new Map(),
            };
            this.addSystemMessage(room, "".concat(user.nickname, " \u521B\u5EFA\u4E86\u76F4\u64AD\u95F4"), false);
            this.rooms.set(roomId, room);
            return this.serializeRoom(room);
        };
        LiveService_1.prototype.listRooms = function (options) {
            var _this = this;
            var _a;
            var keyword = (_a = options === null || options === void 0 ? void 0 : options.keyword) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase();
            var limit = this.normalizeLimit(options === null || options === void 0 ? void 0 : options.limit);
            return Array.from(this.rooms.values())
                .filter(function (room) { return !(options === null || options === void 0 ? void 0 : options.status) || room.status === options.status; })
                .filter(function (room) { return !(options === null || options === void 0 ? void 0 : options.category) || room.category === options.category; })
                .filter(function (room) { return !(options === null || options === void 0 ? void 0 : options.broadcasterId) || room.broadcasterId === options.broadcasterId; })
                .filter(function (room) {
                if (!keyword) {
                    return true;
                }
                return "".concat(room.title, " ").concat(room.broadcasterNickname).toLowerCase().includes(keyword);
            })
                .sort(function (left, right) { return _this.compareRooms(left, right); })
                .slice(0, limit)
                .map(function (room) { return _this.serializeRoom(room); });
        };
        LiveService_1.prototype.getRoom = function (roomId) {
            return this.serializeRoom(this.requireRoom(roomId));
        };
        LiveService_1.prototype.startRoom = function (id, user) {
            var room = this.requireOwnedRoom(id, user.id);
            room.status = 'LIVING';
            room.startedAt = new Date().toISOString();
            room.endedAt = undefined;
            room.latestFrame = undefined;
            room.latestFrameAt = undefined;
            this.addSystemMessage(room, '直播已开始');
            this.emitSessionUpdate(room);
            return {
                roomId: room.id,
                sessionId: room.sessionId,
                status: room.status,
            };
        };
        LiveService_1.prototype.stopRoom = function (id, user) {
            var _this = this;
            var room = this.requireOwnedRoom(id, user.id);
            room.status = 'ENDED';
            room.endedAt = new Date().toISOString();
            room.viewers.forEach(function (viewer) {
                _this.emitViewerSignal(room, viewer.id, 'room-ended', {
                    roomId: room.id,
                    viewerId: viewer.id,
                    status: room.status,
                });
            });
            room.viewers.clear();
            this.addSystemMessage(room, '直播已结束');
            this.emitSessionUpdate(room);
            return {
                roomId: room.id,
                sessionId: room.sessionId,
                status: room.status,
            };
        };
        LiveService_1.prototype.createViewer = function (roomId) {
            var room = this.requireLiveRoom(roomId);
            var viewerId = room.nextViewerId++;
            var timestamp = new Date().toISOString();
            room.viewers.set(viewerId, {
                id: viewerId,
                offer: null,
                answer: null,
                createdAt: timestamp,
                updatedAt: timestamp,
            });
            this.emitSessionUpdate(room);
            return {
                roomId: room.id,
                viewerId: viewerId,
                status: room.status,
            };
        };
        LiveService_1.prototype.removeViewer = function (roomId, viewerId) {
            var room = this.requireRoom(roomId);
            if (!room.viewers.delete(viewerId)) {
                throw new common_1.NotFoundException('Viewer not found');
            }
            room.viewerSignalClients.delete(viewerId);
            this.emitSessionUpdate(room);
            return {
                roomId: roomId,
                viewerId: viewerId,
                removed: true,
            };
        };
        LiveService_1.prototype.submitViewerOffer = function (roomId, viewerId, offer) {
            var room = this.requireRoom(roomId);
            var viewer = this.requireViewerFromRoom(room, viewerId);
            viewer.offer = offer;
            viewer.answer = null;
            viewer.updatedAt = new Date().toISOString();
            this.emitPublisherSignal(room, 'viewer-offer', {
                viewerId: viewerId,
                offer: offer,
                updatedAt: viewer.updatedAt,
            });
            return {
                roomId: roomId,
                viewerId: viewerId,
                received: true,
            };
        };
        LiveService_1.prototype.getPendingViewers = function (roomId, user) {
            var room = this.requireOwnedRoom(roomId, user.id);
            return Array.from(room.viewers.values())
                .filter(function (viewer) { return viewer.offer && !viewer.answer; })
                .map(function (viewer) { return ({
                viewerId: viewer.id,
                offer: viewer.offer,
                updatedAt: viewer.updatedAt,
            }); });
        };
        LiveService_1.prototype.submitViewerAnswer = function (roomId, viewerId, user, answer) {
            var room = this.requireOwnedRoom(roomId, user.id);
            var viewer = this.requireViewerFromRoom(room, viewerId);
            viewer.answer = answer;
            viewer.updatedAt = new Date().toISOString();
            this.emitViewerSignal(room, viewerId, 'viewer-answer', {
                viewerId: viewerId,
                answer: answer,
                updatedAt: viewer.updatedAt,
            });
            return {
                roomId: roomId,
                viewerId: viewerId,
                delivered: true,
            };
        };
        LiveService_1.prototype.getViewerAnswer = function (roomId, viewerId) {
            var viewer = this.requireViewer(roomId, viewerId);
            return {
                ready: Boolean(viewer.answer),
                answer: viewer.answer,
                updatedAt: viewer.updatedAt,
            };
        };
        LiveService_1.prototype.publishToSrs = function (roomId, user, offer) {
            return __awaiter(this, void 0, void 0, function () {
                var room;
                return __generator(this, function (_a) {
                    room = this.requireOwnedRoom(roomId, user.id);
                    return [2 /*return*/, this.exchangeRtcSdp('publish', room, offer)];
                });
            });
        };
        LiveService_1.prototype.playFromSrs = function (roomId, offer) {
            return __awaiter(this, void 0, void 0, function () {
                var room;
                return __generator(this, function (_a) {
                    room = this.requireLiveRoom(roomId);
                    return [2 /*return*/, this.exchangeRtcSdp('play', room, offer)];
                });
            });
        };
        LiveService_1.prototype.getFrame = function (roomId) {
            var _a, _b;
            var room = this.requireRoom(roomId);
            return {
                image: (_a = room.latestFrame) !== null && _a !== void 0 ? _a : null,
                updatedAt: (_b = room.latestFrameAt) !== null && _b !== void 0 ? _b : null,
            };
        };
        LiveService_1.prototype.updateFrame = function (roomId, user, payload) {
            var room = this.requireOwnedRoom(roomId, user.id);
            if (room.status !== 'LIVING') {
                throw new common_1.ForbiddenException('Live room is not active');
            }
            room.latestFrame = payload.image;
            room.latestFrameAt = new Date().toISOString();
            this.emitRoomFeed(room, 'frame', this.getFrame(roomId));
            return this.getFrame(roomId);
        };
        LiveService_1.prototype.getSession = function (id) {
            var _a, _b, _c, _d;
            var room = this.requireRoom(id);
            return {
                id: room.sessionId,
                roomId: room.id,
                title: room.title,
                status: room.status,
                playUrl: room.playUrl,
                coverUrl: room.coverUrl,
                sourceMode: room.sourceMode,
                replayUrl: (_a = room.replayUrl) !== null && _a !== void 0 ? _a : null,
                replayVideoId: (_b = room.replayVideoId) !== null && _b !== void 0 ? _b : null,
                broadcaster: {
                    id: room.broadcasterId,
                    nickname: room.broadcasterNickname,
                },
                viewerCount: room.viewers.size,
                startedAt: (_c = room.startedAt) !== null && _c !== void 0 ? _c : null,
                endedAt: (_d = room.endedAt) !== null && _d !== void 0 ? _d : null,
            };
        };
        LiveService_1.prototype.saveReplay = function (roomId, user, payload) {
            return __awaiter(this, void 0, void 0, function () {
                var room, asset, videoId, video;
                var _a, _b, _c, _d, _e, _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0:
                            room = this.requireOwnedRoom(roomId, user.id);
                            return [4 /*yield*/, this.resolveAsset(payload.assetId, payload.uploadToken)];
                        case 1:
                            asset = _g.sent();
                            room.replayAssetId = asset.id;
                            room.replayUrl = asset.url;
                            videoId = null;
                            if (!(payload.saveMode === 'UPLOAD')) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.videoService.createVideo(user, {
                                    assetId: asset.id,
                                    uploadToken: asset.objectKey,
                                    title: ((_a = payload.title) === null || _a === void 0 ? void 0 : _a.trim()) || "".concat(room.title, " \u56DE\u653E"),
                                    description: ((_b = payload.description) === null || _b === void 0 ? void 0 : _b.trim()) || "\u76F4\u64AD\u56DE\u653E\uFF1A".concat(room.title),
                                    category: (_c = payload.category) !== null && _c !== void 0 ? _c : room.category,
                                    coverUrl: (_d = payload.coverUrl) !== null && _d !== void 0 ? _d : room.coverUrl,
                                    coverAssetId: payload.coverAssetId,
                                    coverUploadToken: payload.coverUploadToken,
                                })];
                        case 2:
                            video = _g.sent();
                            videoId = (_e = video === null || video === void 0 ? void 0 : video.id) !== null && _e !== void 0 ? _e : null;
                            room.replayVideoId = videoId !== null && videoId !== void 0 ? videoId : undefined;
                            _g.label = 3;
                        case 3:
                            this.addSystemMessage(room, payload.saveMode === 'UPLOAD' ? '直播回放已保存为视频稿件' : '直播回放已保存，可在房间内播放');
                            this.emitSessionUpdate(room);
                            return [2 /*return*/, {
                                    roomId: room.id,
                                    replayUrl: room.replayUrl,
                                    replayVideoId: (_f = room.replayVideoId) !== null && _f !== void 0 ? _f : null,
                                    saveMode: payload.saveMode,
                                }];
                    }
                });
            });
        };
        LiveService_1.prototype.listMessages = function (roomId) {
            var room = this.requireRoom(roomId);
            return room.messages.slice(-60);
        };
        LiveService_1.prototype.createMessage = function (roomId, user, payload) {
            var room = this.requireLiveRoom(roomId);
            var content = payload.content.trim();
            if (!content) {
                throw new common_1.BadRequestException('Message content is required');
            }
            var message = {
                id: this.nextMessageId++,
                roomId: roomId,
                kind: 'CHAT',
                content: content.slice(0, 200),
                createdAt: new Date().toISOString(),
                sender: {
                    id: user.id,
                    nickname: user.nickname,
                },
            };
            room.messages.push(message);
            room.messages = room.messages.slice(-100);
            this.emitRoomFeed(room, 'chat-message', message);
            return message;
        };
        LiveService_1.prototype.subscribeRoomFeed = function (roomId, response) {
            var room = this.requireRoom(roomId);
            this.registerSseClient(room.roomFeedClients, response, 'snapshot', {
                session: this.getSession(roomId),
                messages: this.listMessages(roomId),
            });
        };
        LiveService_1.prototype.subscribePublisherSignals = function (roomId, user, response) {
            var room = this.requireOwnedRoom(roomId, user.id);
            this.registerSseClient(room.publisherSignalClients, response, 'snapshot', {
                roomId: roomId,
                pendingViewers: this.getPendingViewers(roomId, user),
            });
        };
        LiveService_1.prototype.subscribeViewerSignals = function (roomId, viewerId, response) {
            var _a;
            var room = this.requireRoom(roomId);
            var viewer = this.requireViewerFromRoom(room, viewerId);
            var clients = (_a = room.viewerSignalClients.get(viewerId)) !== null && _a !== void 0 ? _a : new Set();
            room.viewerSignalClients.set(viewerId, clients);
            this.registerSseClient(clients, response, 'snapshot', {
                roomId: roomId,
                viewerId: viewerId,
                ready: Boolean(viewer.answer),
                answer: viewer.answer,
                updatedAt: viewer.updatedAt,
            });
        };
        LiveService_1.prototype.requireRoom = function (roomId) {
            var room = this.rooms.get(roomId);
            if (!room) {
                throw new common_1.NotFoundException('Live room not found');
            }
            return room;
        };
        LiveService_1.prototype.requireLiveRoom = function (roomId) {
            var room = this.requireRoom(roomId);
            if (room.status !== 'LIVING') {
                throw new common_1.ForbiddenException('Live room is not active');
            }
            return room;
        };
        LiveService_1.prototype.requireOwnedRoom = function (roomId, userId) {
            var room = this.requireRoom(roomId);
            if (room.broadcasterId !== userId) {
                throw new common_1.ForbiddenException('Only broadcaster can operate this room');
            }
            return room;
        };
        LiveService_1.prototype.requireViewer = function (roomId, viewerId) {
            return this.requireViewerFromRoom(this.requireRoom(roomId), viewerId);
        };
        LiveService_1.prototype.requireViewerFromRoom = function (room, viewerId) {
            var viewer = room.viewers.get(viewerId);
            if (!viewer) {
                throw new common_1.NotFoundException('Viewer not found');
            }
            return viewer;
        };
        LiveService_1.prototype.serializeRoom = function (room) {
            var _a, _b, _c, _d;
            return {
                id: room.id,
                sessionId: room.sessionId,
                title: room.title,
                category: room.category,
                coverUrl: room.coverUrl,
                sourceMode: room.sourceMode,
                streamKey: room.streamKey,
                rtmpUrl: room.rtmpUrl,
                playUrl: room.playUrl,
                status: room.status,
                viewerCount: room.viewers.size,
                createdAt: room.createdAt,
                startedAt: (_a = room.startedAt) !== null && _a !== void 0 ? _a : null,
                endedAt: (_b = room.endedAt) !== null && _b !== void 0 ? _b : null,
                replayUrl: (_c = room.replayUrl) !== null && _c !== void 0 ? _c : null,
                replayVideoId: (_d = room.replayVideoId) !== null && _d !== void 0 ? _d : null,
                broadcaster: {
                    id: room.broadcasterId,
                    nickname: room.broadcasterNickname,
                },
            };
        };
        LiveService_1.prototype.resolveAsset = function (assetId, uploadToken) {
            return __awaiter(this, void 0, void 0, function () {
                var asset, asset;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(assetId !== undefined)) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.prisma.videoAsset.findUnique({ where: { id: assetId } })];
                        case 1:
                            asset = _a.sent();
                            if (!asset) {
                                throw new common_1.NotFoundException('Recording asset not found');
                            }
                            return [2 /*return*/, asset];
                        case 2:
                            if (!uploadToken) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.prisma.videoAsset.findUnique({ where: { objectKey: uploadToken } })];
                        case 3:
                            asset = _a.sent();
                            if (!asset) {
                                throw new common_1.NotFoundException('Recording asset not found');
                            }
                            return [2 /*return*/, asset];
                        case 4: throw new common_1.BadRequestException('Recording asset is required');
                    }
                });
            });
        };
        LiveService_1.prototype.getSrsRtmpBase = function () {
            var _a;
            return ((_a = process.env.SRS_RTMP_BASE) !== null && _a !== void 0 ? _a : 'rtmp://127.0.0.1/live').replace(/\/$/, '');
        };
        LiveService_1.prototype.getSrsPlayBase = function () {
            var _a;
            return ((_a = process.env.SRS_PLAY_BASE) !== null && _a !== void 0 ? _a : 'http://127.0.0.1:8080/live').replace(/\/$/, '');
        };
        LiveService_1.prototype.getSrsWebRtcBase = function () {
            var _a;
            return ((_a = process.env.SRS_WEBRTC_BASE) !== null && _a !== void 0 ? _a : 'webrtc://127.0.0.1/live').replace(/\/$/, '');
        };
        LiveService_1.prototype.getSrsApiBase = function () {
            var _a;
            return ((_a = process.env.SRS_API_BASE) !== null && _a !== void 0 ? _a : 'http://127.0.0.1:1985').replace(/\/$/, '');
        };
        LiveService_1.prototype.exchangeRtcSdp = function (action, room, offer) {
            return __awaiter(this, void 0, void 0, function () {
                var api, streamurl, response, _a, payload;
                var _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            api = "".concat(this.getSrsApiBase(), "/rtc/v1/").concat(action, "/");
                            streamurl = "".concat(this.getSrsWebRtcBase(), "/").concat(room.streamKey);
                            _d.label = 1;
                        case 1:
                            _d.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, fetch(api, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        api: api,
                                        streamurl: streamurl,
                                        clientip: null,
                                        sdp: offer.sdp,
                                    }),
                                })];
                        case 2:
                            response = _d.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            _a = _d.sent();
                            throw new common_1.BadRequestException('SRS service is unavailable');
                        case 4:
                            if (!response.ok) {
                                throw new common_1.BadRequestException("SRS request failed with status ".concat(response.status));
                            }
                            return [4 /*yield*/, response.json()];
                        case 5:
                            payload = (_d.sent());
                            if (payload.code !== 0 || !payload.sdp) {
                                throw new common_1.BadRequestException('SRS SDP exchange failed');
                            }
                            return [2 /*return*/, {
                                    type: 'answer',
                                    sdp: payload.sdp,
                                    sessionId: (_b = payload.sessionid) !== null && _b !== void 0 ? _b : null,
                                    server: (_c = payload.server) !== null && _c !== void 0 ? _c : null,
                                }];
                    }
                });
            });
        };
        LiveService_1.prototype.normalizeLimit = function (limit) {
            if (!limit || !Number.isFinite(limit) || limit < 1) {
                return 20;
            }
            return Math.min(50, Math.floor(limit));
        };
        LiveService_1.prototype.compareRooms = function (left, right) {
            var statusPriority = {
                LIVING: 0,
                IDLE: 1,
                ENDED: 2,
            };
            var statusDiff = statusPriority[left.status] - statusPriority[right.status];
            if (statusDiff !== 0) {
                return statusDiff;
            }
            return this.getRoomTimestamp(right) - this.getRoomTimestamp(left);
        };
        LiveService_1.prototype.getRoomTimestamp = function (room) {
            var _a, _b, _c;
            var value = room.status === 'ENDED' ? (_b = (_a = room.endedAt) !== null && _a !== void 0 ? _a : room.startedAt) !== null && _b !== void 0 ? _b : room.createdAt : (_c = room.startedAt) !== null && _c !== void 0 ? _c : room.createdAt;
            return new Date(value).getTime();
        };
        LiveService_1.prototype.addSystemMessage = function (room, content, emit) {
            if (emit === void 0) { emit = true; }
            var message = {
                id: this.nextMessageId++,
                roomId: room.id,
                kind: 'SYSTEM',
                content: content,
                createdAt: new Date().toISOString(),
                sender: {
                    id: null,
                    nickname: '系统',
                },
            };
            room.messages.push(message);
            room.messages = room.messages.slice(-100);
            if (emit) {
                this.emitRoomFeed(room, 'system-message', message);
            }
        };
        LiveService_1.prototype.emitSessionUpdate = function (room) {
            this.emitRoomFeed(room, 'session', this.getSession(room.id));
        };
        LiveService_1.prototype.emitRoomFeed = function (room, event, data) {
            this.broadcast(room.roomFeedClients, event, data);
        };
        LiveService_1.prototype.emitPublisherSignal = function (room, event, data) {
            this.broadcast(room.publisherSignalClients, event, data);
        };
        LiveService_1.prototype.emitViewerSignal = function (room, viewerId, event, data) {
            var clients = room.viewerSignalClients.get(viewerId);
            if (!clients) {
                return;
            }
            this.broadcast(clients, event, data);
        };
        LiveService_1.prototype.registerSseClient = function (clients, response, initialEvent, initialData) {
            var _this = this;
            var _a;
            response.status(200);
            response.setHeader('Content-Type', 'text/event-stream');
            response.setHeader('Cache-Control', 'no-cache, no-transform');
            response.setHeader('Connection', 'keep-alive');
            response.setHeader('X-Accel-Buffering', 'no');
            (_a = response.flushHeaders) === null || _a === void 0 ? void 0 : _a.call(response);
            response.write('retry: 3000\n\n');
            var client = {
                response: response,
                heartbeat: setInterval(function () {
                    _this.writeEvent(response, 'ping', { timestamp: new Date().toISOString() });
                }, 15000),
            };
            clients.add(client);
            this.writeEvent(response, initialEvent, initialData);
            response.on('close', function () {
                clearInterval(client.heartbeat);
                clients.delete(client);
                response.end();
            });
        };
        LiveService_1.prototype.broadcast = function (clients, event, data) {
            var _this = this;
            Array.from(clients).forEach(function (client) {
                _this.writeEvent(client.response, event, data);
            });
        };
        LiveService_1.prototype.writeEvent = function (response, event, data) {
            response.write("event: ".concat(event, "\n"));
            response.write("data: ".concat(JSON.stringify(data), "\n\n"));
        };
        return LiveService_1;
    }());
    __setFunctionName(_classThis, "LiveService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LiveService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LiveService = _classThis;
}();
exports.LiveService = LiveService;
