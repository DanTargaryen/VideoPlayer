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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
var common_1 = require("@nestjs/common");
var config_1 = require("@nestjs/config");
var prisma_module_1 = require("./modules/prisma/prisma.module");
var storage_module_1 = require("./modules/storage/storage.module");
var health_module_1 = require("./modules/health/health.module");
var auth_module_1 = require("./modules/auth/auth.module");
var user_module_1 = require("./modules/user/user.module");
var video_module_1 = require("./modules/video/video.module");
var search_module_1 = require("./modules/search/search.module");
var live_module_1 = require("./modules/live/live.module");
var creator_module_1 = require("./modules/creator/creator.module");
var comment_module_1 = require("./modules/comment/comment.module");
var follow_module_1 = require("./modules/follow/follow.module");
var notification_module_1 = require("./modules/notification/notification.module");
var report_module_1 = require("./modules/report/report.module");
var admin_module_1 = require("./modules/admin/admin.module");
var gift_module_1 = require("./modules/gift/gift.module");
var agent_module_1 = require("./modules/agent/agent.module");
var ai_module_1 = require("./modules/ai/ai.module");
var AppModule = function () {
    var _classDecorators = [(0, common_1.Module)({
            imports: [
                config_1.ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: ['backend/.env', '.env'],
                }),
                prisma_module_1.PrismaModule,
                storage_module_1.StorageModule,
                health_module_1.HealthModule,
                auth_module_1.AuthModule,
                user_module_1.UserModule,
                video_module_1.VideoModule,
                search_module_1.SearchModule,
                live_module_1.LiveModule,
                comment_module_1.CommentModule,
                follow_module_1.FollowModule,
                notification_module_1.NotificationModule,
                report_module_1.ReportModule,
                creator_module_1.CreatorModule,
                admin_module_1.AdminModule,
                gift_module_1.GiftModule,
                agent_module_1.AgentModule,
                ai_module_1.AiModule,
            ],
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AppModule = _classThis = /** @class */ (function () {
        function AppModule_1() {
        }
        return AppModule_1;
    }());
    __setFunctionName(_classThis, "AppModule");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AppModule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AppModule = _classThis;
}();
exports.AppModule = AppModule;
