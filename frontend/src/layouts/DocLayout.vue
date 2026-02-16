<template>
  <div class="flex h-screen w-screen overflow-hidden bg-[#F9FBFD]">
    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col h-full relative">
      <div class="flex-1 overflow-hidden">
        <router-view />
      </div>
    </div>
  </div>

  <!-- AI Chat Panel — outside flex flow entirely -->
  <AIChatPanel />
</template>

<script setup>
import AIChatPanel from '../components/sidebar/AIChatPanel.vue'
</script>
