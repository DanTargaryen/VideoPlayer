<template>
  <section class="page">
    <div class="card">
      <h1>登录</h1>
      <p>使用用户名/邮箱 + 密码登录。当前提供两类角色账号。</p>
      <el-form :model="form" label-position="top" @submit.prevent>
        <el-form-item label="账号">
          <el-input v-model="form.account" placeholder="用户名或邮箱" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password placeholder="密码" />
        </el-form-item>
        <el-button type="primary" :loading="loading" @click="handleLogin">登录</el-button>
      </el-form>
      <div class="accounts">
        <h3>演示账号</h3>
        <ul>
          <li><strong>管理员：</strong> demo_admin / admin123</li>
          <li><strong>用户：</strong> demo_user / user123</li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import { login } from '@/api/platform';
import { useAppStore } from '@/stores/app';

const router = useRouter();
const appStore = useAppStore();
const loading = ref(false);
const form = reactive({
  account: 'demo_user',
  password: 'user123',
});

async function handleLogin() {
  loading.value = true;
  try {
    const result = await login(form);
    appStore.setAuth(result);
    ElMessage.success(`已登录：${result.nickname}`);

    if (result.role === 'ADMIN') {
      router.push('/admin/dashboard');
      return;
    }

    if (result.role === 'USER') {
      router.push('/user/dashboard');
      return;
    }

    router.push('/');
  } catch (error) {
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

.accounts {
  margin-top: 20px;
  color: #cbd5e1;
}
</style>
