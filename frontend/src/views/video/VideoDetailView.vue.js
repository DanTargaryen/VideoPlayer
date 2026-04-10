/// <reference types="../../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { createComment, createDanmaku, favoriteVideo, fetchComments, fetchDanmakus, fetchRelatedVideos, fetchVideoDetail, followUser, likeVideo, reportContent, unfavoriteVideo, unfollowUser, unlikeVideo, } from '@/api/platform';
import { useAppStore } from '@/stores/app';
const route = useRoute();
const appStore = useAppStore();
const loading = ref(false);
const video = ref(null);
const recommendations = ref([]);
const comments = ref([]);
const danmakus = ref([]);
const commentForm = ref('');
const replyForm = ref('');
const replyTargetId = ref(null);
const danmakuForm = reactive({
    content: '',
    timeOffsetMs: 1000,
});
const canFollow = computed(() => appStore.isLoggedIn && video.value && video.value.creator.id !== appStore.userId);
function formatTime(value) {
    return new Date(value).toLocaleString('zh-CN');
}
async function loadDetail() {
    loading.value = true;
    try {
        video.value = await fetchVideoDetail(Number(route.params.id));
    }
    catch {
        ElMessage.error('加载视频详情失败');
    }
    finally {
        loading.value = false;
    }
}
async function loadRecommendations() {
    try {
        recommendations.value = await fetchRelatedVideos(Number(route.params.id));
    }
    catch {
        ElMessage.error('加载相关推荐失败');
    }
}
async function loadComments() {
    try {
        const result = await fetchComments(Number(route.params.id));
        comments.value = result.items;
    }
    catch {
        ElMessage.error('加载评论失败');
    }
}
async function loadDanmakus() {
    try {
        danmakus.value = await fetchDanmakus(Number(route.params.id));
    }
    catch {
        ElMessage.error('加载弹幕失败');
    }
}
async function submitRootComment() {
    if (!commentForm.value.trim()) {
        ElMessage.warning('请输入评论内容');
        return;
    }
    try {
        await createComment(Number(route.params.id), { content: commentForm.value.trim() });
        commentForm.value = '';
        ElMessage.success('评论成功');
        await Promise.all([loadComments(), loadDetail()]);
    }
    catch {
        ElMessage.error('评论失败，请确认已登录');
    }
}
function toggleReplyBox(commentId) {
    replyTargetId.value = replyTargetId.value === commentId ? null : commentId;
    replyForm.value = '';
}
async function submitReply(parentId, rootId) {
    if (!replyForm.value.trim()) {
        ElMessage.warning('请输入回复内容');
        return;
    }
    try {
        await createComment(Number(route.params.id), {
            content: replyForm.value.trim(),
            parentId,
            rootId,
        });
        replyForm.value = '';
        replyTargetId.value = null;
        ElMessage.success('回复成功');
        await Promise.all([loadComments(), loadDetail()]);
    }
    catch {
        ElMessage.error('回复失败，请确认已登录');
    }
}
async function toggleFollow() {
    if (!video.value) {
        return;
    }
    try {
        if (video.value.isFollowingCreator) {
            await unfollowUser(video.value.creator.id);
            ElMessage.success('已取消关注');
        }
        else {
            await followUser(video.value.creator.id);
            ElMessage.success('关注成功');
        }
        await loadDetail();
    }
    catch {
        ElMessage.error('操作失败，请确认已登录');
    }
}
async function toggleLikeAction() {
    if (!video.value) {
        return;
    }
    try {
        const result = video.value.isLiked
            ? await unlikeVideo(video.value.id)
            : await likeVideo(video.value.id);
        ElMessage.success(result.liked ? '点赞成功' : '已取消点赞');
        await loadDetail();
    }
    catch {
        ElMessage.error('操作失败，请确认已登录');
    }
}
async function toggleFavoriteAction() {
    if (!video.value) {
        return;
    }
    try {
        const result = video.value.isFavorited
            ? await unfavoriteVideo(video.value.id)
            : await favoriteVideo(video.value.id);
        ElMessage.success(result.favorited ? '收藏成功' : '已取消收藏');
        await loadDetail();
    }
    catch {
        ElMessage.error('操作失败，请确认已登录');
    }
}
async function reportComment(commentId) {
    try {
        await reportContent({
            targetType: 'COMMENT',
            targetId: commentId,
            reason: '评论内容存在风险或不当信息',
        });
        ElMessage.success('评论举报已提交');
    }
    catch {
        ElMessage.error('评论举报失败，请确认已登录');
    }
}
async function reportDanmaku(danmakuId) {
    try {
        await reportContent({
            targetType: 'VIDEO_DANMAKU',
            targetId: danmakuId,
            reason: '弹幕内容存在风险或不当信息',
        });
        ElMessage.success('弹幕举报已提交');
    }
    catch {
        ElMessage.error('弹幕举报失败，请确认已登录');
    }
}
async function submitDanmaku() {
    if (!danmakuForm.content.trim()) {
        ElMessage.warning('请输入弹幕内容');
        return;
    }
    try {
        await createDanmaku(Number(route.params.id), {
            content: danmakuForm.content.trim(),
            timeOffsetMs: danmakuForm.timeOffsetMs,
        });
        danmakuForm.content = '';
        ElMessage.success('弹幕发送成功');
        await loadDanmakus();
    }
    catch {
        ElMessage.error('弹幕发送失败，请确认已登录');
    }
}
watch(() => route.params.id, async () => {
    await Promise.all([loadDetail(), loadRecommendations(), loadComments(), loadDanmakus()]);
}, { immediate: true });
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['meta']} */ ;
/** @type {__VLS_StyleScopedClasses['comments']} */ ;
/** @type {__VLS_StyleScopedClasses['comment-card']} */ ;
/** @type {__VLS_StyleScopedClasses['danmaku-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['recommend-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['reply-card']} */ ;
/** @type {__VLS_StyleScopedClasses['link-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['recommend-card']} */ ;
/** @type {__VLS_StyleScopedClasses['recommend-meta']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "page" },
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
if (__VLS_ctx.video) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "top-layout" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "main-column" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "player" },
    });
    if (__VLS_ctx.video?.playUrl) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
            ...{ class: "video" },
            controls: true,
            src: (__VLS_ctx.video.playUrl),
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "meta" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "title-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
    (__VLS_ctx.video.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.video.description);
    if (__VLS_ctx.canFollow) {
        const __VLS_0 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            ...{ 'onClick': {} },
            type: (__VLS_ctx.video.isFollowingCreator ? 'default' : 'primary'),
        }));
        const __VLS_2 = __VLS_1({
            ...{ 'onClick': {} },
            type: (__VLS_ctx.video.isFollowingCreator ? 'default' : 'primary'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        let __VLS_4;
        let __VLS_5;
        let __VLS_6;
        const __VLS_7 = {
            onClick: (__VLS_ctx.toggleFollow)
        };
        __VLS_3.slots.default;
        (__VLS_ctx.video.isFollowingCreator ? '取消关注' : '关注用户');
        var __VLS_3;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "action-row" },
    });
    const __VLS_8 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        ...{ 'onClick': {} },
        type: (__VLS_ctx.video.isLiked ? 'primary' : 'default'),
    }));
    const __VLS_10 = __VLS_9({
        ...{ 'onClick': {} },
        type: (__VLS_ctx.video.isLiked ? 'primary' : 'default'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    let __VLS_12;
    let __VLS_13;
    let __VLS_14;
    const __VLS_15 = {
        onClick: (__VLS_ctx.toggleLikeAction)
    };
    __VLS_11.slots.default;
    (__VLS_ctx.video.isLiked ? '取消点赞' : '点赞');
    (__VLS_ctx.video.likeCount);
    var __VLS_11;
    const __VLS_16 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        ...{ 'onClick': {} },
        type: (__VLS_ctx.video.isFavorited ? 'warning' : 'default'),
    }));
    const __VLS_18 = __VLS_17({
        ...{ 'onClick': {} },
        type: (__VLS_ctx.video.isFavorited ? 'warning' : 'default'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    let __VLS_20;
    let __VLS_21;
    let __VLS_22;
    const __VLS_23 = {
        onClick: (__VLS_ctx.toggleFavoriteAction)
    };
    __VLS_19.slots.default;
    (__VLS_ctx.video.isFavorited ? '取消收藏' : '收藏');
    (__VLS_ctx.video.favoriteCount);
    var __VLS_19;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chips" },
    });
    const __VLS_24 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        to: (`/users/${__VLS_ctx.video.creator.id}`),
        ...{ class: "chip-link" },
    }));
    const __VLS_26 = __VLS_25({
        to: (`/users/${__VLS_ctx.video.creator.id}`),
        ...{ class: "chip-link" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    __VLS_27.slots.default;
    (__VLS_ctx.video.creator.nickname);
    var __VLS_27;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.video.creator.followerCount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.video.commentCount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: "side-column" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "recommend-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    const __VLS_28 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
        ...{ 'onClick': {} },
        type: "primary",
        text: true,
    }));
    const __VLS_30 = __VLS_29({
        ...{ 'onClick': {} },
        type: "primary",
        text: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
    let __VLS_32;
    let __VLS_33;
    let __VLS_34;
    const __VLS_35 = {
        onClick: (__VLS_ctx.loadRecommendations)
    };
    __VLS_31.slots.default;
    var __VLS_31;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "recommend-list" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.recommendations))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (item.id),
            ...{ class: "recommend-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
            src: (item.coverUrl),
            alt: (item.title),
            ...{ class: "recommend-cover" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "recommend-meta" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (item.title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.creator?.nickname ?? '推荐视频');
        const __VLS_36 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
            to: (`/video/${item.id}`),
            ...{ class: "secondary-link" },
        }));
        const __VLS_38 = __VLS_37({
            to: (`/video/${item.id}`),
            ...{ class: "secondary-link" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_37));
        __VLS_39.slots.default;
        var __VLS_39;
    }
    if (__VLS_ctx.recommendations.length === 0) {
        const __VLS_40 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
            description: "暂无相关推荐",
        }));
        const __VLS_42 = __VLS_41({
            description: "暂无相关推荐",
        }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    }
}
if (__VLS_ctx.video) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "danmaku-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "comments-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    const __VLS_44 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
        ...{ 'onClick': {} },
        type: "primary",
        plain: true,
    }));
    const __VLS_46 = __VLS_45({
        ...{ 'onClick': {} },
        type: "primary",
        plain: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    let __VLS_48;
    let __VLS_49;
    let __VLS_50;
    const __VLS_51 = {
        onClick: (__VLS_ctx.loadDanmakus)
    };
    __VLS_47.slots.default;
    var __VLS_47;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "danmaku-form" },
    });
    const __VLS_52 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
        modelValue: (__VLS_ctx.danmakuForm.content),
        placeholder: "输入弹幕内容",
    }));
    const __VLS_54 = __VLS_53({
        modelValue: (__VLS_ctx.danmakuForm.content),
        placeholder: "输入弹幕内容",
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    const __VLS_56 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        modelValue: (__VLS_ctx.danmakuForm.timeOffsetMs),
        min: (0),
        step: (1000),
    }));
    const __VLS_58 = __VLS_57({
        modelValue: (__VLS_ctx.danmakuForm.timeOffsetMs),
        min: (0),
        step: (1000),
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    const __VLS_60 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_62 = __VLS_61({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    let __VLS_64;
    let __VLS_65;
    let __VLS_66;
    const __VLS_67 = {
        onClick: (__VLS_ctx.submitDanmaku)
    };
    __VLS_63.slots.default;
    var __VLS_63;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "danmaku-list" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.danmakus))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (item.id),
            ...{ class: "reply-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (item.user.nickname);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (item.content);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "comment-meta" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.timeOffsetMs);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.video))
                        return;
                    __VLS_ctx.reportDanmaku(item.id);
                } },
            ...{ class: "link-btn danger" },
        });
    }
}
if (__VLS_ctx.video) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "comments" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "comments-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    const __VLS_68 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
        ...{ 'onClick': {} },
        type: "primary",
        plain: true,
    }));
    const __VLS_70 = __VLS_69({
        ...{ 'onClick': {} },
        type: "primary",
        plain: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_69));
    let __VLS_72;
    let __VLS_73;
    let __VLS_74;
    const __VLS_75 = {
        onClick: (__VLS_ctx.loadComments)
    };
    __VLS_71.slots.default;
    var __VLS_71;
    const __VLS_76 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
        modelValue: (__VLS_ctx.commentForm),
        type: "textarea",
        rows: (3),
        placeholder: "输入评论内容",
    }));
    const __VLS_78 = __VLS_77({
        modelValue: (__VLS_ctx.commentForm),
        type: "textarea",
        rows: (3),
        placeholder: "输入评论内容",
    }, ...__VLS_functionalComponentArgsRest(__VLS_77));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "comment-actions" },
    });
    const __VLS_80 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_82 = __VLS_81({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    let __VLS_84;
    let __VLS_85;
    let __VLS_86;
    const __VLS_87 = {
        onClick: (__VLS_ctx.submitRootComment)
    };
    __VLS_83.slots.default;
    var __VLS_83;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "comment-list" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.comments))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (item.id),
            ...{ class: "comment-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "comment-main" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (item.user.nickname);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (item.content);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "comment-meta" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.formatTime(item.createdAt));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.video))
                        return;
                    __VLS_ctx.toggleReplyBox(item.id);
                } },
            ...{ class: "link-btn" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.video))
                        return;
                    __VLS_ctx.reportComment(item.id);
                } },
            ...{ class: "link-btn danger" },
        });
        if (__VLS_ctx.replyTargetId === item.id) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "reply-box" },
            });
            const __VLS_88 = {}.ElInput;
            /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
            // @ts-ignore
            const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
                modelValue: (__VLS_ctx.replyForm),
                type: "textarea",
                rows: (2),
                placeholder: "输入回复内容",
            }));
            const __VLS_90 = __VLS_89({
                modelValue: (__VLS_ctx.replyForm),
                type: "textarea",
                rows: (2),
                placeholder: "输入回复内容",
            }, ...__VLS_functionalComponentArgsRest(__VLS_89));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "comment-actions" },
            });
            const __VLS_92 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
                ...{ 'onClick': {} },
                type: "primary",
                size: "small",
            }));
            const __VLS_94 = __VLS_93({
                ...{ 'onClick': {} },
                type: "primary",
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_93));
            let __VLS_96;
            let __VLS_97;
            let __VLS_98;
            const __VLS_99 = {
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.video))
                        return;
                    if (!(__VLS_ctx.replyTargetId === item.id))
                        return;
                    __VLS_ctx.submitReply(item.id, item.id);
                }
            };
            __VLS_95.slots.default;
            var __VLS_95;
        }
        if (item.replies.length > 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "reply-list" },
            });
            for (const [reply] of __VLS_getVForSourceType((item.replies))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
                    key: (reply.id),
                    ...{ class: "reply-card" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                (reply.user.nickname);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
                (reply.content);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "comment-meta" },
                });
                (__VLS_ctx.formatTime(reply.createdAt));
            }
        }
    }
}
/** @type {__VLS_StyleScopedClasses['page']} */ ;
/** @type {__VLS_StyleScopedClasses['top-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['main-column']} */ ;
/** @type {__VLS_StyleScopedClasses['player']} */ ;
/** @type {__VLS_StyleScopedClasses['video']} */ ;
/** @type {__VLS_StyleScopedClasses['meta']} */ ;
/** @type {__VLS_StyleScopedClasses['title-row']} */ ;
/** @type {__VLS_StyleScopedClasses['action-row']} */ ;
/** @type {__VLS_StyleScopedClasses['chips']} */ ;
/** @type {__VLS_StyleScopedClasses['chip-link']} */ ;
/** @type {__VLS_StyleScopedClasses['side-column']} */ ;
/** @type {__VLS_StyleScopedClasses['recommend-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-head']} */ ;
/** @type {__VLS_StyleScopedClasses['recommend-list']} */ ;
/** @type {__VLS_StyleScopedClasses['recommend-card']} */ ;
/** @type {__VLS_StyleScopedClasses['recommend-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['recommend-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-link']} */ ;
/** @type {__VLS_StyleScopedClasses['danmaku-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['comments-head']} */ ;
/** @type {__VLS_StyleScopedClasses['danmaku-form']} */ ;
/** @type {__VLS_StyleScopedClasses['danmaku-list']} */ ;
/** @type {__VLS_StyleScopedClasses['reply-card']} */ ;
/** @type {__VLS_StyleScopedClasses['comment-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['link-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['comments']} */ ;
/** @type {__VLS_StyleScopedClasses['comments-head']} */ ;
/** @type {__VLS_StyleScopedClasses['comment-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['comment-list']} */ ;
/** @type {__VLS_StyleScopedClasses['comment-card']} */ ;
/** @type {__VLS_StyleScopedClasses['comment-main']} */ ;
/** @type {__VLS_StyleScopedClasses['comment-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['link-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['link-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['reply-box']} */ ;
/** @type {__VLS_StyleScopedClasses['comment-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['reply-list']} */ ;
/** @type {__VLS_StyleScopedClasses['reply-card']} */ ;
/** @type {__VLS_StyleScopedClasses['comment-meta']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loading: loading,
            video: video,
            recommendations: recommendations,
            comments: comments,
            danmakus: danmakus,
            commentForm: commentForm,
            replyForm: replyForm,
            replyTargetId: replyTargetId,
            danmakuForm: danmakuForm,
            canFollow: canFollow,
            formatTime: formatTime,
            loadRecommendations: loadRecommendations,
            loadComments: loadComments,
            loadDanmakus: loadDanmakus,
            submitRootComment: submitRootComment,
            toggleReplyBox: toggleReplyBox,
            submitReply: submitReply,
            toggleFollow: toggleFollow,
            toggleLikeAction: toggleLikeAction,
            toggleFavoriteAction: toggleFavoriteAction,
            reportComment: reportComment,
            reportDanmaku: reportDanmaku,
            submitDanmaku: submitDanmaku,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
