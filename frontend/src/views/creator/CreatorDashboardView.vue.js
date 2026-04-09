/// <reference types="../../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { createVideo, fetchCreatorDashboard, fetchCreatorVideos, fetchVideoReviews, submitReview, updateVideoDraft, uploadVideo, } from '@/api/platform';
const creating = ref(false);
const savingDraft = ref(false);
const dashboard = ref({
    nickname: '',
    role: 'USER',
    totalVideos: 0,
    pendingReviews: 0,
    publishedVideos: 0,
    rejectedVideos: 0,
    followerCount: 0,
    totalLikes: 0,
    totalFavorites: 0,
    totalComments: 0,
    recentRejectedVideos: [],
});
const videos = ref([]);
const reviewHistory = ref([]);
const selectedVideoFile = ref(null);
const selectedCoverFile = ref(null);
const editDialogVisible = ref(false);
const reviewDialogVisible = ref(false);
const editingVideoId = ref(null);
const form = reactive({
    title: '新的演示投稿',
    description: '这是通过用户中心上传真实文件后创建并提交审核的演示稿件。',
    categoryId: 1,
    coverUrl: '',
});
const editForm = reactive({
    title: '',
    description: '',
    categoryId: 1,
    coverUrl: '',
});
const statCards = computed(() => [
    { label: '总稿件数', value: dashboard.value.totalVideos },
    { label: '待审核', value: dashboard.value.pendingReviews },
    { label: '已发布', value: dashboard.value.publishedVideos },
    { label: '粉丝数', value: dashboard.value.followerCount },
    { label: '累计点赞', value: dashboard.value.totalLikes },
    { label: '累计评论', value: dashboard.value.totalComments },
]);
function formatTime(value) {
    if (!value) {
        return '暂无';
    }
    return new Date(value).toLocaleString('zh-CN');
}
function handleVideoFileChange(event) {
    const input = event.target;
    selectedVideoFile.value = input.files?.[0] ?? null;
}
function handleCoverFileChange(event) {
    const input = event.target;
    selectedCoverFile.value = input.files?.[0] ?? null;
}
async function refreshAll() {
    const [dashboardData, videoList] = await Promise.all([fetchCreatorDashboard(), fetchCreatorVideos()]);
    dashboard.value = dashboardData;
    videos.value = videoList;
}
async function handleCreateDraft() {
    if (!selectedVideoFile.value) {
        ElMessage.warning('请先选择视频文件');
        return;
    }
    creating.value = true;
    try {
        const upload = await uploadVideo(selectedVideoFile.value, 'ORIGINAL');
        let coverUploadToken;
        let coverAssetId;
        if (selectedCoverFile.value) {
            const coverUpload = await uploadVideo(selectedCoverFile.value, 'COVER');
            coverAssetId = coverUpload.assetId;
            coverUploadToken = coverUpload.uploadToken;
        }
        await createVideo({
            assetId: upload.assetId,
            uploadToken: upload.uploadToken,
            title: form.title,
            description: form.description,
            categoryId: form.categoryId,
            coverUrl: form.coverUrl || undefined,
            coverAssetId,
            coverUploadToken,
        });
        selectedVideoFile.value = null;
        selectedCoverFile.value = null;
        ElMessage.success('稿件创建成功');
        await refreshAll();
    }
    catch {
        ElMessage.error('创建稿件失败，请确认 MinIO 服务已启动且已使用用户账号登录');
    }
    finally {
        creating.value = false;
    }
}
function openEditDialog(video) {
    editingVideoId.value = video.id;
    editForm.title = video.title;
    editForm.description = video.description;
    editForm.categoryId = video.categoryId;
    editForm.coverUrl = video.coverUrl;
    editDialogVisible.value = true;
}
async function handleSaveDraft() {
    if (!editingVideoId.value) {
        return;
    }
    savingDraft.value = true;
    try {
        await updateVideoDraft(editingVideoId.value, { ...editForm });
        ElMessage.success('稿件已更新');
        editDialogVisible.value = false;
        await refreshAll();
    }
    catch {
        ElMessage.error('保存稿件失败');
    }
    finally {
        savingDraft.value = false;
    }
}
async function openReviewDialog(video) {
    try {
        reviewHistory.value = await fetchVideoReviews(video.id);
        reviewDialogVisible.value = true;
    }
    catch {
        ElMessage.error('加载审核记录失败');
    }
}
async function handleSubmitReview(videoId) {
    try {
        await submitReview(videoId);
        ElMessage.success('已提交审核');
        await refreshAll();
    }
    catch {
        ElMessage.error('提交审核失败');
    }
}
onMounted(async () => {
    try {
        await refreshAll();
    }
    catch {
        ElMessage.warning('请先登录用户账号查看此页面');
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['video-card']} */ ;
/** @type {__VLS_StyleScopedClasses['warning-card']} */ ;
/** @type {__VLS_StyleScopedClasses['history-card']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hero" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
const __VLS_0 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onClick: (__VLS_ctx.refreshAll)
};
__VLS_3.slots.default;
var __VLS_3;
const __VLS_8 = {}.ElAlert;
/** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    title: "请先用用户账号登录，再选择本地视频文件与封面上传并创建稿件。随后切换管理员账号到审核后台处理。",
    type: "warning",
    closable: (false),
}));
const __VLS_10 = __VLS_9({
    title: "请先用用户账号登录，再选择本地视频文件与封面上传并创建稿件。随后切换管理员账号到审核后台处理。",
    type: "warning",
    closable: (false),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "stats-grid" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.statCards))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "stat-card" },
        key: (item.label),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (item.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (item.value);
}
if (__VLS_ctx.dashboard.recentRejectedVideos.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "subtle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "warning-list" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.dashboard.recentRejectedVideos))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (item.id),
            ...{ class: "warning-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (item.title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (item.rejectReason || '暂无详细驳回原因');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "subtle" },
        });
        (__VLS_ctx.formatTime(item.updatedAt));
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panels" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
const __VLS_12 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    model: (__VLS_ctx.form),
    labelPosition: "top",
}));
const __VLS_14 = __VLS_13({
    model: (__VLS_ctx.form),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
__VLS_15.slots.default;
const __VLS_16 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    label: "标题",
}));
const __VLS_18 = __VLS_17({
    label: "标题",
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
const __VLS_20 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    modelValue: (__VLS_ctx.form.title),
}));
const __VLS_22 = __VLS_21({
    modelValue: (__VLS_ctx.form.title),
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
var __VLS_19;
const __VLS_24 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    label: "简介",
}));
const __VLS_26 = __VLS_25({
    label: "简介",
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
__VLS_27.slots.default;
const __VLS_28 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    modelValue: (__VLS_ctx.form.description),
    type: "textarea",
}));
const __VLS_30 = __VLS_29({
    modelValue: (__VLS_ctx.form.description),
    type: "textarea",
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
var __VLS_27;
const __VLS_32 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    label: "分区 ID",
}));
const __VLS_34 = __VLS_33({
    label: "分区 ID",
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_35.slots.default;
const __VLS_36 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    modelValue: (__VLS_ctx.form.categoryId),
    min: (1),
    max: (5),
}));
const __VLS_38 = __VLS_37({
    modelValue: (__VLS_ctx.form.categoryId),
    min: (1),
    max: (5),
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
var __VLS_35;
const __VLS_40 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    label: "封面地址（可选）",
}));
const __VLS_42 = __VLS_41({
    label: "封面地址（可选）",
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
__VLS_43.slots.default;
const __VLS_44 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    modelValue: (__VLS_ctx.form.coverUrl),
}));
const __VLS_46 = __VLS_45({
    modelValue: (__VLS_ctx.form.coverUrl),
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
var __VLS_43;
const __VLS_48 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    label: "视频文件",
}));
const __VLS_50 = __VLS_49({
    label: "视频文件",
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
__VLS_51.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onChange: (__VLS_ctx.handleVideoFileChange) },
    type: "file",
    accept: "video/*",
});
if (__VLS_ctx.selectedVideoFile) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "hint" },
    });
    (__VLS_ctx.selectedVideoFile.name);
}
var __VLS_51;
const __VLS_52 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    label: "封面图片（可选）",
}));
const __VLS_54 = __VLS_53({
    label: "封面图片（可选）",
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
__VLS_55.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onChange: (__VLS_ctx.handleCoverFileChange) },
    type: "file",
    accept: "image/*",
});
if (__VLS_ctx.selectedCoverFile) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "hint" },
    });
    (__VLS_ctx.selectedCoverFile.name);
}
var __VLS_55;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-actions" },
});
const __VLS_56 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    ...{ 'onClick': {} },
    loading: (__VLS_ctx.creating),
}));
const __VLS_58 = __VLS_57({
    ...{ 'onClick': {} },
    loading: (__VLS_ctx.creating),
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
let __VLS_60;
let __VLS_61;
let __VLS_62;
const __VLS_63 = {
    onClick: (__VLS_ctx.handleCreateDraft)
};
__VLS_59.slots.default;
var __VLS_59;
var __VLS_15;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "video-list" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.videos))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        key: (item.id),
        ...{ class: "video-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (item.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (item.description);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "status" },
    });
    (item.status);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "reason" },
    });
    (item.durationSeconds ?? 0);
    if (item.rejectReason) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "reason" },
        });
        (item.rejectReason);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "actions-block" },
    });
    const __VLS_64 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        ...{ 'onClick': {} },
        plain: true,
    }));
    const __VLS_66 = __VLS_65({
        ...{ 'onClick': {} },
        plain: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
    let __VLS_68;
    let __VLS_69;
    let __VLS_70;
    const __VLS_71 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openReviewDialog(item);
        }
    };
    __VLS_67.slots.default;
    var __VLS_67;
    const __VLS_72 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        ...{ 'onClick': {} },
        plain: true,
        disabled: (item.status !== 'DRAFT' && item.status !== 'REJECTED'),
    }));
    const __VLS_74 = __VLS_73({
        ...{ 'onClick': {} },
        plain: true,
        disabled: (item.status !== 'DRAFT' && item.status !== 'REJECTED'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    let __VLS_76;
    let __VLS_77;
    let __VLS_78;
    const __VLS_79 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openEditDialog(item);
        }
    };
    __VLS_75.slots.default;
    var __VLS_75;
    const __VLS_80 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
        ...{ 'onClick': {} },
        type: "primary",
        plain: true,
        disabled: (item.status !== 'DRAFT' && item.status !== 'REJECTED'),
    }));
    const __VLS_82 = __VLS_81({
        ...{ 'onClick': {} },
        type: "primary",
        plain: true,
        disabled: (item.status !== 'DRAFT' && item.status !== 'REJECTED'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    let __VLS_84;
    let __VLS_85;
    let __VLS_86;
    const __VLS_87 = {
        onClick: (...[$event]) => {
            __VLS_ctx.handleSubmitReview(Number(item.id));
        }
    };
    __VLS_83.slots.default;
    var __VLS_83;
}
const __VLS_88 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    modelValue: (__VLS_ctx.editDialogVisible),
    title: "编辑稿件",
    width: "560px",
}));
const __VLS_90 = __VLS_89({
    modelValue: (__VLS_ctx.editDialogVisible),
    title: "编辑稿件",
    width: "560px",
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
__VLS_91.slots.default;
const __VLS_92 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
    model: (__VLS_ctx.editForm),
    labelPosition: "top",
}));
const __VLS_94 = __VLS_93({
    model: (__VLS_ctx.editForm),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
__VLS_95.slots.default;
const __VLS_96 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
    label: "标题",
}));
const __VLS_98 = __VLS_97({
    label: "标题",
}, ...__VLS_functionalComponentArgsRest(__VLS_97));
__VLS_99.slots.default;
const __VLS_100 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
    modelValue: (__VLS_ctx.editForm.title),
}));
const __VLS_102 = __VLS_101({
    modelValue: (__VLS_ctx.editForm.title),
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
var __VLS_99;
const __VLS_104 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
    label: "简介",
}));
const __VLS_106 = __VLS_105({
    label: "简介",
}, ...__VLS_functionalComponentArgsRest(__VLS_105));
__VLS_107.slots.default;
const __VLS_108 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
    modelValue: (__VLS_ctx.editForm.description),
    type: "textarea",
}));
const __VLS_110 = __VLS_109({
    modelValue: (__VLS_ctx.editForm.description),
    type: "textarea",
}, ...__VLS_functionalComponentArgsRest(__VLS_109));
var __VLS_107;
const __VLS_112 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
    label: "分区 ID",
}));
const __VLS_114 = __VLS_113({
    label: "分区 ID",
}, ...__VLS_functionalComponentArgsRest(__VLS_113));
__VLS_115.slots.default;
const __VLS_116 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
    modelValue: (__VLS_ctx.editForm.categoryId),
    min: (1),
    max: (5),
}));
const __VLS_118 = __VLS_117({
    modelValue: (__VLS_ctx.editForm.categoryId),
    min: (1),
    max: (5),
}, ...__VLS_functionalComponentArgsRest(__VLS_117));
var __VLS_115;
const __VLS_120 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
    label: "封面地址",
}));
const __VLS_122 = __VLS_121({
    label: "封面地址",
}, ...__VLS_functionalComponentArgsRest(__VLS_121));
__VLS_123.slots.default;
const __VLS_124 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
    modelValue: (__VLS_ctx.editForm.coverUrl),
}));
const __VLS_126 = __VLS_125({
    modelValue: (__VLS_ctx.editForm.coverUrl),
}, ...__VLS_functionalComponentArgsRest(__VLS_125));
var __VLS_123;
var __VLS_95;
{
    const { footer: __VLS_thisSlot } = __VLS_91.slots;
    const __VLS_128 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
        ...{ 'onClick': {} },
    }));
    const __VLS_130 = __VLS_129({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_129));
    let __VLS_132;
    let __VLS_133;
    let __VLS_134;
    const __VLS_135 = {
        onClick: (...[$event]) => {
            __VLS_ctx.editDialogVisible = false;
        }
    };
    __VLS_131.slots.default;
    var __VLS_131;
    const __VLS_136 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.savingDraft),
    }));
    const __VLS_138 = __VLS_137({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.savingDraft),
    }, ...__VLS_functionalComponentArgsRest(__VLS_137));
    let __VLS_140;
    let __VLS_141;
    let __VLS_142;
    const __VLS_143 = {
        onClick: (__VLS_ctx.handleSaveDraft)
    };
    __VLS_139.slots.default;
    var __VLS_139;
}
var __VLS_91;
const __VLS_144 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
    modelValue: (__VLS_ctx.reviewDialogVisible),
    title: "审核记录",
    width: "620px",
}));
const __VLS_146 = __VLS_145({
    modelValue: (__VLS_ctx.reviewDialogVisible),
    title: "审核记录",
    width: "620px",
}, ...__VLS_functionalComponentArgsRest(__VLS_145));
__VLS_147.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "history-list" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.reviewHistory))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        key: (item.id),
        ...{ class: "history-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (item.status);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (item.reason || '暂无审核意见');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "subtle" },
    });
    (__VLS_ctx.formatTime(item.createdAt));
    if (item.reviewedAt) {
        (__VLS_ctx.formatTime(item.reviewedAt));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "subtle" },
    });
    (item.reviewer?.nickname || '待处理');
}
if (__VLS_ctx.reviewHistory.length === 0) {
    const __VLS_148 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
        description: "当前稿件还没有审核记录",
    }));
    const __VLS_150 = __VLS_149({
        description: "当前稿件还没有审核记录",
    }, ...__VLS_functionalComponentArgsRest(__VLS_149));
}
var __VLS_147;
/** @type {__VLS_StyleScopedClasses['page']} */ ;
/** @type {__VLS_StyleScopedClasses['hero']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-head']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle']} */ ;
/** @type {__VLS_StyleScopedClasses['warning-list']} */ ;
/** @type {__VLS_StyleScopedClasses['warning-card']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle']} */ ;
/** @type {__VLS_StyleScopedClasses['panels']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['video-list']} */ ;
/** @type {__VLS_StyleScopedClasses['video-card']} */ ;
/** @type {__VLS_StyleScopedClasses['status']} */ ;
/** @type {__VLS_StyleScopedClasses['reason']} */ ;
/** @type {__VLS_StyleScopedClasses['reason']} */ ;
/** @type {__VLS_StyleScopedClasses['actions-block']} */ ;
/** @type {__VLS_StyleScopedClasses['history-list']} */ ;
/** @type {__VLS_StyleScopedClasses['history-card']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            creating: creating,
            savingDraft: savingDraft,
            dashboard: dashboard,
            videos: videos,
            reviewHistory: reviewHistory,
            selectedVideoFile: selectedVideoFile,
            selectedCoverFile: selectedCoverFile,
            editDialogVisible: editDialogVisible,
            reviewDialogVisible: reviewDialogVisible,
            form: form,
            editForm: editForm,
            statCards: statCards,
            formatTime: formatTime,
            handleVideoFileChange: handleVideoFileChange,
            handleCoverFileChange: handleCoverFileChange,
            refreshAll: refreshAll,
            handleCreateDraft: handleCreateDraft,
            openEditDialog: openEditDialog,
            handleSaveDraft: handleSaveDraft,
            openReviewDialog: openReviewDialog,
            handleSubmitReview: handleSubmitReview,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
