<template>
  <view class="yd-card">
    <view class="yd-card-title">
      <text>我的常用</text>
      <view class="p-10rpx -m-10rpx" @click="handleGotoFavoriteSettings">
        <wd-icon name="settings" size="32rpx" color="var(--brand-text-muted)" />
      </view>
    </view>
    <MenuGrid v-if="menus.length > 0" :menus="menus" />
    <view
      v-else
      class="flex items-center border-1rpx border-[var(--brand-border)] rounded-12rpx border-dashed px-24rpx py-16rpx"
      @click="handleGotoFavoriteSettings"
    >
      <wd-icon name="plus" size="32rpx" color="var(--brand-text-muted)" />
      <text class="pl-10rpx text-28rpx text-[var(--brand-text-muted)]">添加我常用的</text>
    </view>
  </view>
</template>

<script lang="ts" setup>
import type { MenuItem } from '../index'
import MenuGrid from './menu-grid.vue'

defineOptions({
  name: 'MenuFavorite',
})

defineProps<{
  menus: MenuItem[] // 常用菜单列表
}>()

/** 跳转到常用服务设置页面 */
function handleGotoFavoriteSettings() {
  uni.navigateTo({
    url: '/pages/index/settings/index',
  })
}
</script>
