<template>
  <section class="page">
    <div class="card">
      <div class="intro">
        <span class="eyebrow">Account</span>
        <h1>注册账号</h1>
        <p>创建您的账号，开始探索精彩视频内容。</p>
      </div>

      <el-form :model="form" label-position="top" autocomplete="off" @submit.prevent>
        <el-form-item label="用户名">
          <el-input v-model="form.username" placeholder="请输入用户名" autocomplete="off" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="至少6位"
            autocomplete="new-password"
          />
        </el-form-item>
        <el-form-item label="昵称（可选）">
          <el-input v-model="form.nickname" placeholder="不填则默认使用用户名" autocomplete="off" />
        </el-form-item>
        <div class="actions">
          <el-button type="primary" :loading="loading" @click="handleRegister">注册</el-button>
        </div>
      </el-form>

      <div class="login-link-wrap">
        <RouterLink to="/login" class="login-link">已有账号？去登录</RouterLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import { register, login } from '@/api/platform';
import { useAppStore } from '@/stores/app';

const router = useRouter();
const appStore = useAppStore();
const loading = ref(false);
const form = reactive({
  username: '',
  password: '',
  nickname: '',
});

async function handleRegister() {
  if (!form.username || !form.password) {
    ElMessage.warning('请填写用户名和密码');
    return;
  }
  if (form.password.length < 6) {
    ElMessage.warning('密码至少需要6位');
    return;
  }

  loading.value = true;
  try {
    await register({
      username: form.username,
      password: form.password,
      nickname: form.nickname || undefined,
    });

    // Auto-login after successful registration
    const result = await login({ account: form.username, password: form.password });
    appStore.setAuth(result);
    ElMessage.success(`注册成功，欢迎 ${result.nickname}`);
    router.push('/live');
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '';
    if (msg.includes('already') || msg.includes('exists')) {
      ElMessage.error('用户名已被使用');
    } else {
      ElMessage.error('注册失败，请稍后重试');
    }
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

.login-link-wrap {
  margin-top: 16px;
}

.login-link {
  font-size: 13px;
  color: #2563eb;
  text-decoration: none;
}

.login-link:hover {
  text-decoration: underline;
}
</style>
