/// <reference types="../../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import VideoMediaCard from '@/components/VideoMediaCard.vue';
import LiveRoomCard from '@/components/live/LiveRoomCard.vue';
import { categoryOptions, normalizeCategoryCode } from '@/constants/categories';
import { searchAll } from '@/api/platform';
const route = useRoute();
const router = useRouter();
const keyword = ref('');
const activeTab = ref('video');
const sortBy = ref('latest');
const category = ref('recommend');
const result = reactive({
    keyword: '',
    tab: 'video',
    sortBy: 'latest',
    categoryCode: 'recommend',
    page: 1,
    pageSize: 20,
    video: [],
    live: [],
    user: [],
});
const categorySegmentOptions = computed(() => categoryOptions.map((item) => ({
    label: item.label,
    value: item.code,
})));
function normalizeTab(value) {
    if (value === 'user' || value === 'live') {
        return value;
    }
    return 'video';
}
function buildQuery() {
    return {
        ...(keyword.value.trim() ? { keyword: keyword.value.trim() } : {}),
        tab: activeTab.value,
        ...(category.value !== 'recommend' ? { category: category.value } : {}),
        ...(sortBy.value !== 'latest' ? { sortBy: sortBy.value } : {}),
    };
}
async function loadSearch() {
    try {
        const data = await searchAll({
            keyword: keyword.value.trim(),
            tab: activeTab.value,
            sortBy: sortBy.value,
            category: category.value,
        });
        Object.assign(result, data);
    }
    catch {
        ElMessage.error('搜索失败，请稍后重试');
    }
}
function submitSearch() {
    router.replace({
        path: '/search',
        query: buildQuery(),
    });
}
function handleTabChange(value) {
    activeTab.value = normalizeTab(value);
    submitSearch();
}
watch(() => route.query, (query) => {
    keyword.value = String(query.keyword ?? '');
    activeTab.value = normalizeTab(query.tab);
    category.value = normalizeCategoryCode(typeof query.category === 'string' ? query.category : undefined);
    sortBy.value = query.sortBy === 'hot' ? 'hot' : 'latest';
    void loadSearch();
}, { immediate: true });
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['user-card']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "search-hero" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "search-box" },
});
const __VLS_0 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.keyword),
    placeholder: "搜索视频标题、简介或用户昵称",
}));
const __VLS_2 = __VLS_1({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.keyword),
    placeholder: "搜索视频标题、简介或用户昵称",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onKeyup: (__VLS_ctx.submitSearch)
};
var __VLS_3;
const __VLS_8 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_10 = __VLS_9({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_12;
let __VLS_13;
let __VLS_14;
const __VLS_15 = {
    onClick: (__VLS_ctx.submitSearch)
};
__VLS_11.slots.default;
var __VLS_11;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "filters" },
});
const __VLS_16 = {}.ElSegmented;
/** @type {[typeof __VLS_components.ElSegmented, typeof __VLS_components.elSegmented, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.category),
    options: (__VLS_ctx.categorySegmentOptions),
}));
const __VLS_18 = __VLS_17({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.category),
    options: (__VLS_ctx.categorySegmentOptions),
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
let __VLS_20;
let __VLS_21;
let __VLS_22;
const __VLS_23 = {
    onChange: (__VLS_ctx.submitSearch)
};
var __VLS_19;
const __VLS_24 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.sortBy),
    ...{ class: "sort-select" },
}));
const __VLS_26 = __VLS_25({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.sortBy),
    ...{ class: "sort-select" },
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
let __VLS_28;
let __VLS_29;
let __VLS_30;
const __VLS_31 = {
    onChange: (__VLS_ctx.submitSearch)
};
__VLS_27.slots.default;
const __VLS_32 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    label: "最新优先",
    value: "latest",
}));
const __VLS_34 = __VLS_33({
    label: "最新优先",
    value: "latest",
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
const __VLS_36 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    label: "热度优先",
    value: "hot",
}));
const __VLS_38 = __VLS_37({
    label: "热度优先",
    value: "hot",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
var __VLS_27;
const __VLS_40 = {}.ElTabs;
/** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    ...{ 'onTabChange': {} },
    modelValue: (__VLS_ctx.activeTab),
    ...{ class: "tabs" },
}));
const __VLS_42 = __VLS_41({
    ...{ 'onTabChange': {} },
    modelValue: (__VLS_ctx.activeTab),
    ...{ class: "tabs" },
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
let __VLS_44;
let __VLS_45;
let __VLS_46;
const __VLS_47 = {
    onTabChange: (__VLS_ctx.handleTabChange)
};
__VLS_43.slots.default;
const __VLS_48 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    label: (`视频 (${__VLS_ctx.result.video.length})`),
    name: "video",
}));
const __VLS_50 = __VLS_49({
    label: (`视频 (${__VLS_ctx.result.video.length})`),
    name: "video",
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
const __VLS_52 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    label: (`用户 (${__VLS_ctx.result.user.length})`),
    name: "user",
}));
const __VLS_54 = __VLS_53({
    label: (`用户 (${__VLS_ctx.result.user.length})`),
    name: "user",
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
const __VLS_56 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    label: (`直播 (${__VLS_ctx.result.live.length})`),
    name: "live",
}));
const __VLS_58 = __VLS_57({
    label: (`直播 (${__VLS_ctx.result.live.length})`),
    name: "live",
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
var __VLS_43;
if (__VLS_ctx.activeTab === 'video') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "cards" },
    });
    for (const [card] of __VLS_getVForSourceType((__VLS_ctx.result.video))) {
        /** @type {[typeof VideoMediaCard, ]} */ ;
        // @ts-ignore
        const __VLS_60 = __VLS_asFunctionalComponent(VideoMediaCard, new VideoMediaCard({
            key: (card.id),
            item: (card),
        }));
        const __VLS_61 = __VLS_60({
            key: (card.id),
            item: (card),
        }, ...__VLS_functionalComponentArgsRest(__VLS_60));
    }
    if (__VLS_ctx.result.video.length === 0) {
        const __VLS_63 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_64 = __VLS_asFunctionalComponent(__VLS_63, new __VLS_63({
            description: "当前条件下没有找到相关视频",
        }));
        const __VLS_65 = __VLS_64({
            description: "当前条件下没有找到相关视频",
        }, ...__VLS_functionalComponentArgsRest(__VLS_64));
    }
}
else if (__VLS_ctx.activeTab === 'user') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "user-grid" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.result.user))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (item.id),
            ...{ class: "user-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (item.nickname);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (item.id);
        const __VLS_67 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({
            to: (`/users/${item.id}`),
            ...{ class: "primary-link" },
        }));
        const __VLS_69 = __VLS_68({
            to: (`/users/${item.id}`),
            ...{ class: "primary-link" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_68));
        __VLS_70.slots.default;
        var __VLS_70;
    }
    if (__VLS_ctx.result.user.length === 0) {
        const __VLS_71 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_72 = __VLS_asFunctionalComponent(__VLS_71, new __VLS_71({
            description: "当前条件下没有找到相关用户",
        }));
        const __VLS_73 = __VLS_72({
            description: "当前条件下没有找到相关用户",
        }, ...__VLS_functionalComponentArgsRest(__VLS_72));
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "cards" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.result.live))) {
        /** @type {[typeof LiveRoomCard, ]} */ ;
        // @ts-ignore
        const __VLS_75 = __VLS_asFunctionalComponent(LiveRoomCard, new LiveRoomCard({
            key: (item.id),
            item: (item),
        }));
        const __VLS_76 = __VLS_75({
            key: (item.id),
            item: (item),
        }, ...__VLS_functionalComponentArgsRest(__VLS_75));
    }
    if (__VLS_ctx.result.live.length === 0) {
        const __VLS_78 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_79 = __VLS_asFunctionalComponent(__VLS_78, new __VLS_78({
            description: "当前条件下没有找到相关直播",
        }));
        const __VLS_80 = __VLS_79({
            description: "当前条件下没有找到相关直播",
        }, ...__VLS_functionalComponentArgsRest(__VLS_79));
    }
}
/** @type {__VLS_StyleScopedClasses['page']} */ ;
/** @type {__VLS_StyleScopedClasses['search-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['search-box']} */ ;
/** @type {__VLS_StyleScopedClasses['filters']} */ ;
/** @type {__VLS_StyleScopedClasses['sort-select']} */ ;
/** @type {__VLS_StyleScopedClasses['tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['cards']} */ ;
/** @type {__VLS_StyleScopedClasses['user-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['user-card']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-link']} */ ;
/** @type {__VLS_StyleScopedClasses['cards']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            VideoMediaCard: VideoMediaCard,
            LiveRoomCard: LiveRoomCard,
            keyword: keyword,
            activeTab: activeTab,
            sortBy: sortBy,
            category: category,
            result: result,
            categorySegmentOptions: categorySegmentOptions,
            submitSearch: submitSearch,
            handleTabChange: handleTabChange,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
