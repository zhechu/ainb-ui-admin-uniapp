<template>
  <view v-if="menus.length > 0" class="yd-card">
    <view class="yd-card-title">
      最近使用
    </view>
    <MenuGrid :menus="menus" />
  </view>
</template>

<script lang="ts" setup>
import type { MenuItem } from '../index'
import MenuGrid from './menu-grid.vue'

defineOptions({
  name: 'MenuRecent',
})

defineProps<{
  menus: MenuItem[] // 最近使用菜单列表
}>()
</script>
