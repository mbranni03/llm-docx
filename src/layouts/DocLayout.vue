<template>
  <div class="flex h-screen w-screen overflow-hidden bg-[#F9FBFD]">
    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col h-full relative">
      <div class="flex-1 overflow-hidden">
        <router-view />
      </div>
    </div>

    <!-- AI Chat Panel (Overlay/Drawer style) -->
    <AIChatPanel />
  </div>
</template>

<script setup>
import AIChatPanel from '../components/sidebar/AIChatPanel.vue'
</script>
