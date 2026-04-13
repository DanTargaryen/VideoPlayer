<template>
  <section class="page">
    <div class="card">
      <div class="intro">
        <span class="eyebrow">Account</span>
        <h1>{{ adminMode ? '管理员登录' : '用户登录' }}</h1>
        <p v-if="!adminMode">使用用户名或邮箱登录。为了测试直播广场和弹幕，我已经内置了两个普通测试账号。</p>
        <p v-else>请输入管理员账号和管理员密钥。</p>
      </div>

      <el-form :model="form" label-position="top" @submit.prevent>
        <el-form-item label="账号">
          <el-input v-model="form.account" placeholder="用户名或邮箱" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password placeholder="密码" />
        </el-form-item>
        <div class="actions">
          <el-button type="primary" :loading="loading" @click="handleLogin">登录</el-button>
          <el-button v-if="adminMode" @click="exitAdminMode">退出管理员模式</el-button>
        </div>
      </el-form>

      <div class="accounts">
        <h3>演示账号</h3>
        <ul v-if="!adminMode">
          <li><strong>普通用户 1：</strong> live_user_1 / live123456</li>
          <li><strong>普通用户 2：</strong> live_user_2 / live123456</li>
          <li><strong>默认用户：</strong> demo_user / user123</li>
        </ul>
        <ul v-else>
          <li><strong>管理员：</strong> demo_admin / admin123</li>
          <li><strong>管理员密钥：</strong> Administer</li>
        </ul>
      </div>

      <div class="admin-entry" v-if="!adminMode">
        <el-button text @click="enterAdminMode">管理员入口</el-button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
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
  account: 'live_user_1',
  password: 'live123456',
});

const adminMode = computed(() => appStore.adminAccessGranted);

async function enterAdminMode() {
  try {
    const result = await ElMessageBox.prompt('请输入管理员密钥', '管理员入口', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      inputType: 'password',
    });

    if (result.value !== ADMIN_SECRET) {
      ElMessage.error('管理员密钥错误');
      return;
    }

    appStore.grantAdminAccess();
    form.account = 'demo_admin';
    form.password = 'admin123';
    ElMessage.success('管理员模式已开启');
  } catch {
    return;
  }
}

function exitAdminMode() {
  appStore.revokeAdminAccess();
  form.account = 'live_user_1';
  form.password = 'live123456';
}

async function handleLogin() {
  loading.value = true;
  try {
    const result = await login({
      ...form,
      ...(adminMode.value ? { adminSecret: ADMIN_SECRET } : {}),
    });

    if (result.role === 'ADMIN' && !adminMode.value) {
      ElMessage.error('请先通过管理员入口验证密钥');
      loading.value = false;
      return;
    }

    if (result.role === 'USER' && adminMode.value) {
      ElMessage.error('当前处于管理员登录模式，请退出后再登录普通用户');
      loading.value = false;
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
    ElMessage.error('登录失败，请检查账号和密码');
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
</style>
