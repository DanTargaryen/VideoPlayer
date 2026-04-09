/// <reference types="../../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { login } from '@/api/platform';
import { useAppStore } from '@/stores/app';
const ADMIN_SECRET = 'Administer';
const router = useRouter();
const appStore = useAppStore();
const loading = ref(false);
const form = reactive({
    account: 'demo_user',
    password: 'user123',
});
const adminMode = computed(() => appStore.adminAccessGranted);
async function enterAdminMode() {
    try {
        const result = await ElMessageBox.prompt('请输入管理密钥', '管理入口', {
            confirmButtonText: '确认',
            cancelButtonText: '取消',
            inputType: 'password',
        });
        if (result.value !== ADMIN_SECRET) {
            ElMessage.error('管理密钥错误');
            return;
        }
        appStore.grantAdminAccess();
        form.account = 'demo_admin';
        form.password = 'admin123';
        ElMessage.success('管理入口已开启');
    }
    catch {
        return;
    }
}
function exitAdminMode() {
    appStore.revokeAdminAccess();
    form.account = 'demo_user';
    form.password = 'user123';
}
async function handleLogin() {
    loading.value = true;
    try {
        const result = await login({
            ...form,
            ...(adminMode.value ? { adminSecret: ADMIN_SECRET } : {}),
        });
        if (result.role === 'ADMIN' && !adminMode.value) {
            ElMessage.error('请先通过管理入口验证密钥');
            loading.value = false;
            return;
        }
        if (result.role === 'USER' && adminMode.value) {
            ElMessage.error('当前处于管理员登录模式，请退出后再登录用户账号');
            loading.value = false;
            return;
        }
        appStore.setAuth(result);
        ElMessage.success(`已登录：${result.nickname}`);
        if (result.role === 'ADMIN') {
            router.push('/admin/dashboard');
            return;
        }
        router.push('/user/dashboard');
    }
    catch {
        ElMessage.error('登录失败，请检查账号密码');
    }
    finally {
        loading.value = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
(__VLS_ctx.adminMode ? '管理员登录' : '用户登录');
if (!__VLS_ctx.adminMode) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
const __VLS_0 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onSubmit': {} },
    model: (__VLS_ctx.form),
    labelPosition: "top",
}));
const __VLS_2 = __VLS_1({
    ...{ 'onSubmit': {} },
    model: (__VLS_ctx.form),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onSubmit: () => { }
};
__VLS_3.slots.default;
const __VLS_8 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    label: "账号",
}));
const __VLS_10 = __VLS_9({
    label: "账号",
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_11.slots.default;
const __VLS_12 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    modelValue: (__VLS_ctx.form.account),
    placeholder: "用户名或邮箱",
}));
const __VLS_14 = __VLS_13({
    modelValue: (__VLS_ctx.form.account),
    placeholder: "用户名或邮箱",
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
var __VLS_11;
const __VLS_16 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    label: "密码",
}));
const __VLS_18 = __VLS_17({
    label: "密码",
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
const __VLS_20 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    modelValue: (__VLS_ctx.form.password),
    type: "password",
    showPassword: true,
    placeholder: "密码",
}));
const __VLS_22 = __VLS_21({
    modelValue: (__VLS_ctx.form.password),
    type: "password",
    showPassword: true,
    placeholder: "密码",
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
var __VLS_19;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "actions" },
});
const __VLS_24 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.loading),
}));
const __VLS_26 = __VLS_25({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.loading),
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
let __VLS_28;
let __VLS_29;
let __VLS_30;
const __VLS_31 = {
    onClick: (__VLS_ctx.handleLogin)
};
__VLS_27.slots.default;
var __VLS_27;
if (__VLS_ctx.adminMode) {
    const __VLS_32 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        ...{ 'onClick': {} },
    }));
    const __VLS_34 = __VLS_33({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    let __VLS_36;
    let __VLS_37;
    let __VLS_38;
    const __VLS_39 = {
        onClick: (__VLS_ctx.exitAdminMode)
    };
    __VLS_35.slots.default;
    var __VLS_35;
}
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "accounts" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
if (!__VLS_ctx.adminMode) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
}
if (!__VLS_ctx.adminMode) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "admin-entry" },
    });
    const __VLS_40 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        ...{ 'onClick': {} },
        text: true,
    }));
    const __VLS_42 = __VLS_41({
        ...{ 'onClick': {} },
        text: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    let __VLS_44;
    let __VLS_45;
    let __VLS_46;
    const __VLS_47 = {
        onClick: (__VLS_ctx.enterAdminMode)
    };
    __VLS_43.slots.default;
    var __VLS_43;
}
/** @type {__VLS_StyleScopedClasses['page']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['accounts']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-entry']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loading: loading,
            form: form,
            adminMode: adminMode,
            enterAdminMode: enterAdminMode,
            exitAdminMode: exitAdminMode,
            handleLogin: handleLogin,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
