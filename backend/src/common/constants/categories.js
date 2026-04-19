"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VIDEO_CATEGORY_CODES = exports.CATEGORY_DEFINITIONS = exports.CATEGORY_CODE_TO_ID = void 0;
exports.resolveCategoryId = resolveCategoryId;
exports.resolveCategoryCode = resolveCategoryCode;
exports.CATEGORY_CODE_TO_ID = {
    entertainment: 1,
    study: 2,
    game: 3,
    tech: 4,
    live: 5,
};
exports.CATEGORY_DEFINITIONS = [
    { code: 'recommend', label: '推荐', id: null },
    { code: 'entertainment', label: '娱乐', id: exports.CATEGORY_CODE_TO_ID.entertainment },
    { code: 'study', label: '学习', id: exports.CATEGORY_CODE_TO_ID.study },
    { code: 'game', label: '游戏', id: exports.CATEGORY_CODE_TO_ID.game },
    { code: 'tech', label: '科技', id: exports.CATEGORY_CODE_TO_ID.tech },
    { code: 'live', label: '直播', id: exports.CATEGORY_CODE_TO_ID.live },
];
exports.VIDEO_CATEGORY_CODES = ['entertainment', 'study', 'game', 'tech'];
function resolveCategoryId(categoryCode) {
    if (!categoryCode || categoryCode === 'recommend') {
        return undefined;
    }
    return exports.CATEGORY_CODE_TO_ID[categoryCode];
}
function resolveCategoryCode(categoryCode) {
    if (!categoryCode || categoryCode === 'recommend') {
        return undefined;
    }
    var matched = exports.CATEGORY_DEFINITIONS.find(function (item) { return item.code === categoryCode; });
    return matched === null || matched === void 0 ? void 0 : matched.code;
}
