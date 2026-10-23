<template>
  <!-- 根据布局开关渲染对应外壳，四种布局共用同一份菜单数据 -->
  <MenuLayoutSection
    v-if="currentLayout === 'section'"
    :groups="menuGroups"
    :favorites="favoriteMenuItems"
    :recents="recentMenuItems"
  />
  <MenuLayoutAccordion
    v-else-if="currentLayout === 'accordion'"
    :groups="menuGroups"
    :favorites="favoriteMenuItems"
    :recents="recentMenuItems"
  />
  <MenuLayoutTabs
    v-else-if="currentLayout === 'tabs'"
    :groups="menuGroups"
    :favorites="favoriteMenuItems"
    :recents="recentMenuItems"
  />
  <MenuLayoutSidebar
    v-else
    :groups="menuGroups"
    :favorites="favoriteMenuItems"
    :recents="recentMenuItems"
  />
</template>

<script lang="ts" setup>
import type { MenuGroup, MenuItem, MenuLayout } from '../index'
import { useNavStore } from '@/store/nav'
import { useUserStore } from '@/store/user'
import { getMenuGroups, getMenuItemByKey, menuLayout } from '../index'
import MenuLayoutAccordion from './menu-layout-accordion.vue'
import MenuLayoutSection from './menu-layout-section.vue'
import MenuLayoutSidebar from './menu-layout-sidebar.vue'
import MenuLayoutTabs from './menu-layout-tabs.vue'

defineOptions({
  name: 'MenuSection',
})

const userStore = useUserStore()
const navStore = useNavStore()

/** 菜单分组列表（响应式派生自 nav store，服务端下发后自动刷新） */
const menuGroups = computed<MenuGroup[]>(() => getMenuGroups())

/** 当前布局（响应式跟随全局开关，从设置页返回即时生效） */
const currentLayout = computed<MenuLayout>(() => menuLayout.value)

/** 常用服务菜单（从 store 中计算得出） */
const favoriteMenuItems = computed<MenuItem[]>(() => {
  const keys = userStore.favoriteMenus
  if (!keys || keys.length === 0) {
    return []
  }
  return keys.map(key => getMenuItemByKey(key)).filter(Boolean) as MenuItem[]
})

/** 最近使用菜单（从 store 中计算得出，按点击时间倒序） */
const recentMenuItems = computed<MenuItem[]>(() => {
  const keys = userStore.recentMenus
  if (!keys || keys.length === 0) {
    return []
  }
  return keys.map(key => getMenuItemByKey(key)).filter(Boolean) as MenuItem[]
})

/**
 * 兜底加载导航树
 *
 * 正常情况下登录成功时已拉取并持久化；此处仅在尚未加载成功（如登录时网络失败）时重试，
 * 已加载则为无副作用的空操作，不会在每次回到工作台时重复请求。
 */
onShow(() => {
  void navStore.loadNavTree()
})
</script>
