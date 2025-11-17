<template>
  <div class="tier-tag" v-if="tier === 'PRO'">
    <span :style="{ fontSize: size + 'px' }">{{ tier.toUpperCase() }}</span>
  </div>
</template>
<script setup lang="ts">

const props = defineProps({
  tier: {
    type: String,
    default: 'FREE',
  },
  size: {
    type: Number,
    default: 10,
  }
})

const tier = ref('FREE');

let tag =  props.tier.toUpperCase();
if (tag !== 'FREE' && tag !== 'PRO') {
  tag = 'FREE';
}
tier.value = tag;
</script>


<style scoped>
.tier-tag {
  padding: 2px 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--orange);
  background-color: var(--orange-opacity);
}
.tier-tag span {
  font-weight: 600;
  color: var(--orange);
}
</style>