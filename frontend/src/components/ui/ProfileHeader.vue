<template>
  <section class="profile-header">
    <div class="identity">
      <UserAvatar :src="avatarUrl" :name="name" size="xl" />
      <div class="copy">
        <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
        <h1>{{ name }}</h1>
        <p class="bio">{{ bio || '这个用户还没有填写简介。' }}</p>
      </div>
    </div>
    <div class="side">
      <div v-if="stats?.length" class="stats">
        <div v-for="item in stats" :key="item.label" class="stat">
          <strong>{{ item.value }}</strong>
          <span>{{ item.label }}</span>
        </div>
      </div>
      <div v-if="$slots.actions" class="actions">
        <slot name="actions" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import UserAvatar from '@/components/ui/UserAvatar.vue';

defineProps<{
  name: string;
  bio?: string | null;
  avatarUrl?: string | null;
  eyebrow?: string;
  stats?: Array<{ label: string; value: string | number }>;
}>();
</script>

<style scoped>
.profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 24px;
  border: 1px solid var(--gl-border);
  border-radius: 24px;
  background: var(--gl-surface);
  box-shadow: var(--gl-shadow-card);
}

.identity {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 18px;
}

.copy {
  min-width: 0;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--gl-accent);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

h1 {
  margin: 0;
  color: var(--gl-text-primary);
  font-size: 28px;
  line-height: 36px;
  font-weight: 800;
}

.bio {
  max-width: 62ch;
  margin: 6px 0 0;
  color: var(--gl-text-secondary);
  font-size: 14px;
  line-height: 22px;
}

.side {
  display: grid;
  justify-items: end;
  gap: 14px;
}

.stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.stat {
  min-width: 74px;
  padding: 10px 12px;
  border-radius: 14px;
  background: var(--gl-surface-soft);
}

.stat strong {
  display: block;
  color: var(--gl-text-primary);
  font-size: 20px;
  line-height: 24px;
  font-variant-numeric: tabular-nums;
}

.stat span {
  display: block;
  margin-top: 2px;
  color: var(--gl-text-muted);
  font-size: 12px;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

@media (max-width: 760px) {
  .profile-header,
  .identity {
    align-items: flex-start;
    flex-direction: column;
  }

  .side,
  .stats,
  .actions {
    width: 100%;
    justify-items: start;
    justify-content: flex-start;
  }
}
</style>
