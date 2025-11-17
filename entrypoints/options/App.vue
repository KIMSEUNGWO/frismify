<template>
  <MenuView />
  <main>
    <RouterView />
  </main>
</template>

<script setup lang="ts">
import MenuView from "@/entrypoints/options/components/MenuView.vue";
</script>

<style scoped>
main {
  padding-left: 260px;
  width: 100vw;
}
</style>
