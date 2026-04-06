<template>
  <section class="page">
    <div class="layout">
      <div class="player">直播播放器占位</div>
      <aside class="panel">
        <h2>直播互动面板</h2>
        <ul>
          <li>聊天消息</li>
          <li>直播弹幕</li>
          <li>礼物币送礼</li>
          <li>录播回看入口</li>
        </ul>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts"></script>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

.player,
.panel {
  min-height: 420px;
  padding: 20px;
  border-radius: 16px;
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.18);
}
</style>
