<template>
  <section class="page">
    <div class="card" data-tour="login-card">
      <div class="intro">
        <span class="eyebrow">Account</span>
        <h1>{{ adminMode ? '管理员登录' : '用户登录' }}</h1>
        <p v-if="!adminMode">使用用户名或邮箱登录。当前默认自动填充普通测试账号，登录后进入推荐页面。</p>
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
        <RouterLink to="/register" class="register-link">注册</RouterLink>
        <span class="separator">|</span>
        <a href="javascript:void(0)" @click="openForgotDialog" class="forgot-btn">忘记密码</a>
      </div>
    </div>

    <el-dialog v-model="forgotDialogVisible" title="忘记密码" width="420px" destroy-on-close>
      <el-form :model="forgotForm" label-position="top" @submit.prevent>
        <el-form-item label="用户名">
          <el-input v-model="forgotForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="forgotForm.email" placeholder="请输入绑定的邮箱" maxlength="128" />
        </el-form-item>
        <el-form-item label="图形验证码">
          <div class="captcha-row">
            <el-input v-model="forgotForm.captchaCode" placeholder="请输入图形验证码" maxlength="6" />
            <img :src="captchaDataUrl" alt="图形验证码" class="captcha-img" @click="refreshCaptcha" />
          </div>
        </el-form-item>
        <el-form-item label="邮箱验证码">
          <div class="code-row">
            <el-input v-model="forgotForm.emailCode" placeholder="请输入邮箱验证码" maxlength="6" />
            <el-button
              :disabled="codeCountdown > 0 || sendingEmailCode"
              @click="sendResetEmail"
            >
              {{ sendingEmailCode ? '发送中...' : (codeCountdown > 0 ? `${codeCountdown}s后重发` : '获取验证码') }}
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="forgotForm.newPassword" type="password" show-password placeholder="请输入新密码（至少6位）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="forgotDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="resettingPassword" @click="handleResetPassword">确认重置</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';

import { fetchCaptcha, login, resetPassword, sendResetEmailCode } from '@/api/platform';
import { useAppStore } from '@/stores/app';

const ADMIN_SECRET = '123456';

const router = useRouter();
const route = useRoute();
const appStore = useAppStore();
const loading = ref(false);
const form = reactive({
  account: 'live_user_1',
  password: 'Live123456!',
  adminSecret: ADMIN_SECRET,
});

const adminMode = computed(() => appStore.adminAccessGranted);

const forgotDialogVisible = ref(false);
const forgotForm = reactive({
  username: '',
  email: '',
  captchaId: '',
  captchaCode: '',
  emailCode: '',
  newPassword: '',
});
const captchaDataUrl = ref('');
const codeCountdown = ref(0);
const sendingEmailCode = ref(false);
const resettingPassword = ref(false);
let codeTimer: number | null = null;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getErrorMessage(error: unknown, fallback: string) {
  const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  if (typeof responseMessage === 'string' && responseMessage) {
    return responseMessage;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

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

    const redirectTo = (route.query.redirect as string) || '/';

    if (result.role === 'ADMIN') {
      router.push(redirectTo === '/' ? '/admin/dashboard' : redirectTo);
      return;
    }

    router.push(redirectTo);
  } catch {
    ElMessage.error(adminMode.value ? '登录失败，请检查管理密钥' : '登录失败，请检查账号和密码');
  } finally {
    loading.value = false;
  }
}

async function refreshCaptcha() {
  const result = await fetchCaptcha();
  captchaDataUrl.value = result.dataUrl;
  forgotForm.captchaId = result.id;
  forgotForm.captchaCode = '';
}

async function sendResetEmail() {
  const email = forgotForm.email.trim();
  const username = forgotForm.username.trim();
  const captchaCode = forgotForm.captchaCode.trim();

  if (!username) {
    ElMessage.warning('请输入用户名');
    return;
  }
  if (!emailPattern.test(email)) {
    ElMessage.warning('请输入正确的邮箱');
    return;
  }
  if (!captchaCode) {
    ElMessage.warning('请输入图形验证码');
    return;
  }

  sendingEmailCode.value = true;
  try {
    await sendResetEmailCode(username, email, forgotForm.captchaId, captchaCode);
    ElMessage.success('验证码已发送');
    startCodeCountdown();
  } catch (e: unknown) {
    const msg = getErrorMessage(e, '发送失败');
    if (msg.includes('图形验证码不正确')) {
      ElMessage.error('图形验证码不正确');
    } else if (msg.includes('邮箱不正确')) {
      ElMessage.error('邮箱不正确');
    } else {
      ElMessage.error('发送失败');
    }
    await refreshCaptcha();
  } finally {
    sendingEmailCode.value = false;
  }
}

function startCodeCountdown() {
  codeCountdown.value = 60;
  if (codeTimer) {
    clearInterval(codeTimer);
  }
  codeTimer = window.setInterval(() => {
    if (codeCountdown.value > 0) {
      codeCountdown.value--;
    } else {
      if (codeTimer) {
        clearInterval(codeTimer);
        codeTimer = null;
      }
    }
  }, 1000);
}

async function handleResetPassword() {
  const email = forgotForm.email.trim();
  const username = forgotForm.username.trim();
  const emailCode = forgotForm.emailCode.trim();
  const newPassword = forgotForm.newPassword.trim();

  if (!username || !email || !emailCode || !newPassword) {
    ElMessage.warning('请填写所有字段');
    return;
  }
  if (!emailPattern.test(email)) {
    ElMessage.warning('请输入正确的邮箱');
    return;
  }
  if (newPassword.length < 6) {
    ElMessage.warning('密码至少6位');
    return;
  }

  resettingPassword.value = true;
  try {
    await resetPassword(username, email, emailCode, newPassword);
    ElMessage.success('密码重置成功，请使用新密码登录');
    forgotDialogVisible.value = false;
    if (codeTimer) {
      clearInterval(codeTimer);
      codeTimer = null;
    }
  } catch (e: unknown) {
    const msg = getErrorMessage(e, '重置失败');
    ElMessage.error(msg);
  } finally {
    resettingPassword.value = false;
  }
}

function openForgotDialog() {
  forgotDialogVisible.value = true;
  forgotForm.username = form.account.includes('@') ? '' : form.account;
  forgotForm.email = form.account.includes('@') ? form.account : '';
  forgotForm.captchaId = '';
  forgotForm.captchaCode = '';
  forgotForm.emailCode = '';
  forgotForm.newPassword = '';
  void refreshCaptcha();
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.register-link {
  font-size: 13px;
  color: #2563eb;
  text-decoration: none;
}

.register-link:hover {
  text-decoration: underline;
}

.separator {
  margin: 0;
  color: #d1d5db;
  font-size: 13px;
}

.forgot-btn {
  font-size: 13px;
  color: #2563eb;
  text-decoration: none;
  cursor: pointer;
}

.forgot-btn:hover {
  text-decoration: underline;
}

.captcha-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.captcha-row .el-input {
  flex: 1;
}

.captcha-img {
  width: 120px;
  height: 40px;
  cursor: pointer;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  flex-shrink: 0;
}

.code-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.code-row .el-input {
  flex: 1;
}
</style>
