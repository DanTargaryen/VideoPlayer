<template>
  <section class="page">
    <div class="card">
      <h1>{{ adminMode ? '管理员登录' : '用户登录' }}</h1>
      <p v-if="!adminMode">使用用户名/邮箱 + 密码登录用户系统。</p>
      <p v-else>已通过管理密钥验证，请输入管理员账号密码。</p>

      <el-form :model="form" label-position="top" @submit.prevent>
        <el-form-item label="账号">
          <el-input v-model="form.account" placeholder="用户名或邮箱" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password placeholder="密码" />
        </el-form-item>
        <div class="actions">
          <el-button type="primary" :loading="loading" @click="handleLogin">登录</el-button>
          <el-button v-if="adminMode" @click="exitAdminMode">退出管理入口</el-button>
        </div>
      </el-form>

      <div class="accounts">
        <h3>演示账号</h3>
        <ul v-if="!adminMode">
          <li><strong>用户：</strong> demo_user / user123</li>
        </ul>
        <ul v-else>
          <li><strong>管理员：</strong> demo_admin / admin123</li>
        </ul>
      </div>

      <div class="admin-entry" v-if="!adminMode">
        <el-button text @click="enterAdminMode">管理入口</el-button>
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
  } catch {
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
  } catch {
    ElMessage.error('登录失败，请检查账号密码');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.page {
  display: grid;
  place-items: center;
  min-height: 60vh;
}

.card {
  width: min(480px, 100%);
  padding: 28px;
  border-radius: 16px;
  background: rgba(30, 41, 59, 0.92);
}

.actions {
  display: flex;
  gap: 12px;
}

.accounts {
  margin-top: 20px;
  color: #cbd5e1;
}

.admin-entry {
  margin-top: 16px;
}
</style>
