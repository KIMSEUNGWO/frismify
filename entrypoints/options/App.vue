<template>
  <MenuView />
  <main>
    <RouterView />
  </main>
</template>

<script setup lang="ts">
import MenuView from "@/entrypoints/options/components/MenuView.vue";
</script>

<style>
main {
  padding-left: 260px;
  min-height: 100vh;
  box-sizing: border-box;
  transition: padding-left 0.3s ease-in-out;
}

/* Sidebar가 fold될 때 */
body.sidebar-folded main {
  padding-left: 70px;
}
</style>
