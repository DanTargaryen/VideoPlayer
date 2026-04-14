<template>
  <section class="page">
    <div class="card">
      <div class="intro">
        <span class="eyebrow">Account</span>
        <h1>{{ adminMode ? '管理员登录' : '用户登录' }}</h1>
        <p v-if="!adminMode">使用用户名或邮箱登录。当前默认自动填充普通测试账号，可直接进入直播广场和弹幕联调。</p>
        <p v-else>管理入口改为仅需密钥登录，密钥已自动填充，可直接进入后台。</p>
      </div>

      <el-form :model="form" label-position="top" @submit.prevent>
        <el-form-item v-if="!adminMode" label="账号">
          <el-input v-model="form.account" placeholder="用户名或邮箱" />
        </el-form-item>
        <el-form-item v-if="!adminMode" label="密码">
          <el-input v-model="form.password" type="password" show-password placeholder="密码" />
        </el-form-item>
        <el-form-item v-else label="管理密钥">
          <el-input v-model="form.adminSecret" type="password" show-password placeholder="管理员密钥" />
        </el-form-item>
        <div class="actions">
          <el-button type="primary" :loading="loading" @click="handleLogin">登录</el-button>
          <el-button v-if="adminMode" @click="exitAdminMode">退出管理员模式</el-button>
        </div>
      </el-form>

      <div class="accounts">
        <h3>演示账号</h3>
        <ul v-if="!adminMode">
          <li><strong>普通用户 1：</strong> live_user_1 / Live123456!</li>
          <li><strong>默认自动填充：</strong> live_user_1 / Live123456!</li>
        </ul>
        <ul v-else>
          <li><strong>管理员密钥：</strong> 123456</li>
          <li><strong>默认自动填充：</strong> 123456</li>
        </ul>
      </div>

      <div class="admin-entry" v-if="!adminMode">
        <el-button text @click="enterAdminMode">管理员入口</el-button>
      </div>

      <div class="register-link-wrap" v-if="!adminMode">
        <RouterLink to="/register" class="register-link">还没有账号？免费注册</RouterLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import { login } from '@/api/platform';
import { useAppStore } from '@/stores/app';

const ADMIN_SECRET = '123456';

const router = useRouter();
const appStore = useAppStore();
const loading = ref(false);
const form = reactive({
  account: 'live_user_1',
  password: 'Live123456!',
  adminSecret: ADMIN_SECRET,
});

const adminMode = computed(() => appStore.adminAccessGranted);

function enterAdminMode() {
  appStore.grantAdminAccess();
  form.adminSecret = ADMIN_SECRET;
  ElMessage.success('已切换到管理员密钥登录');
}

function exitAdminMode() {
  appStore.revokeAdminAccess();
  form.account = 'live_user_1';
  form.password = 'Live123456!';
  form.adminSecret = ADMIN_SECRET;
}

async function handleLogin() {
  loading.value = true;
  try {
    const result = await login(
      adminMode.value
        ? {
            adminSecret: form.adminSecret.trim(),
          }
        : {
            account: form.account,
            password: form.password,
          },
    );

    if (adminMode.value && result.role !== 'ADMIN') {
      ElMessage.error('当前管理密钥未登录到管理员账号');
      return;
    }

    appStore.setAuth(result);
    ElMessage.success(`已登录：${result.nickname}`);

    if (result.role === 'ADMIN') {
      router.push('/admin/dashboard');
      return;
    }

    router.push('/live');
  } catch {
    ElMessage.error(adminMode.value ? '登录失败，请检查管理密钥' : '登录失败，请检查账号和密码');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.page {
  display: grid;
  place-items: center;
  min-height: 68vh;
}

.card {
  width: min(540px, 100%);
  padding: 32px;
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 248, 252, 0.96));
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
}

.intro {
  margin-bottom: 18px;
}

.eyebrow {
  display: inline-block;
  margin-bottom: 10px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.intro h1 {
  margin: 0 0 10px;
  color: #111827;
}

.intro p {
  margin: 0;
  color: #4b5563;
  line-height: 1.7;
}

.actions {
  display: flex;
  gap: 12px;
}

.accounts {
  margin-top: 24px;
  padding: 18px 20px;
  border-radius: 20px;
  background: rgba(15, 23, 42, 0.04);
  color: #374151;
}

.accounts h3 {
  margin: 0 0 12px;
  color: #111827;
}

.accounts ul {
  margin: 0;
  padding-left: 18px;
  line-height: 1.9;
}

.admin-entry {
  margin-top: 12px;
}

.register-link-wrap {
  margin-top: 8px;
}

.register-link {
  font-size: 13px;
  color: #2563eb;
  text-decoration: none;
}

.register-link:hover {
  text-decoration: underline;
}
</style>
