<template>
  <article class="user-result-card">
    <UserAvatar :name="item.nickname" size="md" />
    <div class="copy">
      <h3>{{ item.nickname }}</h3>
      <p>用户 ID：{{ item.id }}</p>
    </div>
    <RouterLink :to="`/users/${item.id}`" class="link">查看主页</RouterLink>
  </article>
</template>

<script setup lang="ts">
import UserAvatar from '@/components/ui/UserAvatar.vue';

defineProps<{
  item: { id: number; nickname: string };
}>();
</script>

<style scoped>
.user-result-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 18px;
  border: 1px solid var(--gl-border);
  border-radius: var(--gl-radius-card);
  background: var(--gl-surface);
  box-shadow: var(--gl-shadow-card);
}

.copy {
  min-width: 0;
}

h3 {
  margin: 0;
  color: var(--gl-text-primary);
  font-size: 15px;
  line-height: 22px;
}

p {
  margin: 3px 0 0;
  color: var(--gl-text-muted);
  font-size: 12px;
}

.link {
  grid-column: 1 / -1;
  color: var(--gl-primary);
  font-size: 13px;
  font-weight: 700;
}
</style>
