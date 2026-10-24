<template>
  <view class="min-h-0 flex flex-1 overflow-hidden bg-white">
    <!-- 左侧模块栏 -->
    <scroll-view class="w-172rpx flex-shrink-0 bg-[var(--brand-fill)]" scroll-y>
      <view
        class="yd-touch relative flex-col py-26rpx text-center text-24rpx leading-tight"
        :class="active === FAVORITE_TAB_KEY ? 'bg-white text-primary font-500' : 'text-[var(--brand-text-secondary)]'"
        @click="active = FAVORITE_TAB_KEY"
      >
        <view v-if="active === FAVORITE_TAB_KEY" class="absolute bottom-16rpx left-0 top-16rpx w-6rpx rounded-r-4rpx bg-primary" />
        我的常用
      </view>
      <view
        v-for="group in groups"
        :key="group.key"
        class="yd-touch relative flex-col px-6rpx py-26rpx text-center text-24rpx leading-tight"
        :class="isActiveGroup(group) ? 'bg-white text-primary font-500' : 'text-[var(--brand-text-secondary)]'"
        @click="active = group.key"
      >
        <view v-if="isActiveGroup(group)" class="absolute bottom-16rpx left-0 top-16rpx w-6rpx rounded-r-4rpx bg-primary" />
        {{ group.name }}
      </view>
    </scroll-view>

    <!-- 右侧内容区 -->
    <scroll-view class="min-w-0 flex-1 bg-white" scroll-y scroll-with-animation :scroll-into-view="topAnchor">
      <view id="pane-top" />
      <!-- 我的常用 + 最近使用 -->
      <template v-if="active === FAVORITE_TAB_KEY">
        <MenuFavorite :menus="favorites" />
        <MenuRecent :menus="recents" />
      </template>
      <!-- 模块二级分组 -->
      <template v-else-if="activeGroup">
        <view class="yd-card-title px-24rpx pb-4rpx pt-24rpx">
          {{ activeGroup.name }}
        </view>
        <template v-for="sub in activeGroup.subGroups" :key="sub.key">
          <view v-if="sub.name" class="mb-8rpx mt-16rpx flex items-center px-24rpx">
            <view class="mr-12rpx h-22rpx w-6rpx rounded-4rpx bg-primary" />
            <text class="text-24rpx text-[var(--brand-text-secondary)]">{{ sub.name }}</text>
          </view>
          <MenuGrid :menus="sub.menus" :column="3" />
        </template>
      </template>

      <!-- 底部安全区域 -->
      <view class="h-40rpx" />
    </scroll-view>
  </view>
</template>

<script lang="ts" setup>
import type { MenuGroup, MenuItem } from '../index'
import { FAVORITE_TAB_KEY } from '../index'
import MenuFavorite from './menu-favorite.vue'
import MenuGrid from './menu-grid.vue'
import MenuRecent from './menu-recent.vue'

defineOptions({
  name: 'MenuLayoutSidebar',
})

const props = defineProps<{
  groups: MenuGroup[] // 菜单分组列表
  favorites: MenuItem[] // 常用菜单列表
  recents: MenuItem[] // 最近使用菜单列表
}>()

// 有常用/最近时默认进入快捷区，否则首个分组
const hasQuickMenus = props.favorites.length > 0 || props.recents.length > 0
const active = ref<string>(hasQuickMenus ? FAVORITE_TAB_KEY : '')

const topAnchor = ref('') // 切换模块时右侧内容区回到顶部的锚点
watch(() => active.value, () => {
  topAnchor.value = ''
  nextTick(() => {
    topAnchor.value = 'pane-top'
  })
})

/** 当前选中的分组（active 为空时回退到首个分组） */
const activeGroup = computed<MenuGroup | null>(() => {
  if (active.value === FAVORITE_TAB_KEY) {
    return null
  }
  return props.groups.find(group => group.key === active.value) || props.groups[0] || null
})

/** 判断分组是否选中（兼容 active 为空时的首个分组高亮） */
function isActiveGroup(group: MenuGroup): boolean {
  if (active.value === FAVORITE_TAB_KEY) {
    return false
  }
  if (active.value === '') {
    return props.groups[0]?.key === group.key
  }
  return active.value === group.key
}
</script>
