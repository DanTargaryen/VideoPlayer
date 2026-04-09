import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
export const useAppStore = defineStore('app', () => {
    const siteName = ref('观澜视频平台');
    const token = ref(localStorage.getItem('vp_token') ?? '');
    const userId = ref(Number(localStorage.getItem('vp_user_id') ?? 0));
    const role = ref(localStorage.getItem('vp_role') || 'guest');
    const nickname = ref(localStorage.getItem('vp_nickname') ?? '游客');
    const adminAccessGranted = ref(localStorage.getItem('vp_admin_access') === 'true');
    const isLoggedIn = computed(() => Boolean(token.value));
    const isAdmin = computed(() => role.value === 'admin');
    function normalizeRole(input) {
        if (input === 'ADMIN')
            return 'admin';
        return 'user';
    }
    function grantAdminAccess() {
        adminAccessGranted.value = true;
        localStorage.setItem('vp_admin_access', 'true');
    }
    function revokeAdminAccess() {
        adminAccessGranted.value = false;
        localStorage.removeItem('vp_admin_access');
    }
    function setAuth(payload) {
        token.value = payload.token;
        userId.value = payload.userId;
        role.value = normalizeRole(payload.role);
        nickname.value = payload.nickname;
        localStorage.setItem('vp_token', payload.token);
        localStorage.setItem('vp_user_id', String(payload.userId));
        localStorage.setItem('vp_role', role.value);
        localStorage.setItem('vp_nickname', payload.nickname);
    }
    function logout() {
        token.value = '';
        userId.value = 0;
        role.value = 'guest';
        nickname.value = '游客';
        revokeAdminAccess();
        localStorage.removeItem('vp_token');
        localStorage.removeItem('vp_user_id');
        localStorage.removeItem('vp_role');
        localStorage.removeItem('vp_nickname');
    }
    return {
        siteName,
        token,
        userId,
        role,
        nickname,
        adminAccessGranted,
        isLoggedIn,
        isAdmin,
        setAuth,
        logout,
        grantAdminAccess,
        revokeAdminAccess,
    };
});
