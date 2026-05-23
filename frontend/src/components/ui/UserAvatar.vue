<template>
  <span class="avatar" :class="[`avatar-${size}`, { online }]">
    <img v-if="src" :src="src" :alt="alt || name || '用户头像'" />
    <span v-else>{{ initial }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    src?: string | null;
    name?: string | null;
    alt?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    online?: boolean;
  }>(),
  {
    size: 'md',
    online: false,
  },
);

const initial = computed(() => (props.name?.trim() ? props.name.trim().slice(0, 1) : 'G'));
</script>

<style scoped>
.avatar {
  position: relative;
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  overflow: visible;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--gl-primary-soft), var(--gl-surface));
  color: var(--gl-primary);
  font-weight: 800;
  box-shadow: inset 0 0 0 1px rgba(47, 79, 143, 0.14);
}

.avatar-sm {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  font-size: 13px;
}

.avatar-md {
  width: 42px;
  height: 42px;
  font-size: 16px;
}

.avatar-lg {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  font-size: 22px;
}

.avatar-xl {
  width: 88px;
  height: 88px;
  border-radius: 22px;
  font-size: 30px;
}

img {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
}

.avatar.online::after {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 11px;
  height: 11px;
  border: 2px solid var(--gl-surface);
  border-radius: 50%;
  background: var(--gl-success);
  content: "";
}
</style>
