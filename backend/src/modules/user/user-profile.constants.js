"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USER_PROFILE_WATCH_WEIGHTS = exports.USER_PROFILE_WATCH_THRESHOLDS = exports.USER_PROFILE_ACTIVITY_THRESHOLDS = exports.USER_PROFILE_BEHAVIOR_WEIGHTS = void 0;
exports.USER_PROFILE_BEHAVIOR_WEIGHTS = {
    category: {
        like: 3,
        favorite: 5,
        comment: 4,
        danmaku: 3,
        createdVideo: 4,
    },
    creator: {
        like: 2,
        favorite: 4,
        comment: 3,
        danmaku: 3,
        follow: 6,
    },
    activity: {
        like: 1,
        favorite: 2,
        comment: 2,
        danmaku: 2,
        follow: 3,
        createdVideo: 3,
    },
    tendency: {
        viewerLike: 1,
        viewerFavorite: 2,
        viewerComment: 2,
        viewerDanmaku: 2,
        viewerFollow: 3,
        creatorVideo: 5,
    },
};
exports.USER_PROFILE_ACTIVITY_THRESHOLDS = {
    high: 24,
    medium: 10,
};
exports.USER_PROFILE_WATCH_THRESHOLDS = {
    warmRatio: 0.3,
    deepRatio: 0.6,
    completeRatio: 0.9,
    coldStartWatchSeconds: 15,
    coldStartWatchRatio: 0.2,
};
exports.USER_PROFILE_WATCH_WEIGHTS = {
    category: {
        play: 0.5,
        warmRatio: 0.5,
        deepRatio: 1,
        completeRatio: 1.5,
        durationSecondsDivisor: 600,
        durationMaxBonus: 1,
        completed: 1.2,
        maxPlayContribution: 2,
        maxCompletedContribution: 2,
    },
    creator: {
        play: 0.4,
        warmRatio: 0.4,
        deepRatio: 0.8,
        completeRatio: 1.2,
        durationSecondsDivisor: 900,
        durationMaxBonus: 0.8,
        completed: 1,
        maxPlayContribution: 2,
        maxCompletedContribution: 2,
    },
    activity: {
        play: 1,
        warmWatch: 1,
        deepWatch: 2,
        complete: 3,
        maxPlayContribution: 3,
    },
    tendency: {
        play: 1,
        deepWatch: 2,
        complete: 3,
        maxPlayContribution: 2,
    },
};
