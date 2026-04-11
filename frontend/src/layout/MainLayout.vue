<template>
  <div class="shell">
    <AppHeader />
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue';
</script>

<style scoped>
.shell {
  min-height: 100vh;
}

.content {
  padding: 24px;
}
</style>
