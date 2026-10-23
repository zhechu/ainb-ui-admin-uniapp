import type { NavNodeTree } from '@/api/system/navNode'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getNavTree } from '@/api/system/navNode'

/**
 * 分端导航树 store（服务端驱动的工作台菜单）
 *
 * 登录后拉取一次当前用户在「app 端」可见的导航树，持久化到本地；
 * 工作台各布局、搜索页、编辑工作台均从这里派生菜单数据（见 pages/index/index.ts）。
 * 服务端已按授权过滤，前端不再做权限白名单判断。
 */
export const useNavStore = defineStore(
  'nav',
  () => {
    /** 导航树（顶层为分组节点） */
    const navTree = ref<NavNodeTree[]>([])
    /** 是否已成功加载过一次（用于避免重复请求） */
    const loaded = ref(false)
    /** 是否正在加载（用于并发去重） */
    const loading = ref(false)

    /**
     * 加载导航树
     *
     * @param force 为 true 时忽略 loaded 标记强制刷新（登录成功后调用）；
     *              为 false 时若已加载过则直接跳过（工作台 onShow 的兜底重试）。
     *
     * 失败时保留已有（持久化的）导航树，不清空、不抛出——避免网络抖动导致工作台空白或登录中断。
     */
    const loadNavTree = async (force = false) => {
      if (loading.value) {
        return
      }
      if (loaded.value && !force) {
        return
      }
      loading.value = true
      try {
        const tree = await getNavTree('app')
        navTree.value = tree || []
        loaded.value = true
      } catch (error) {
        console.error('加载导航树失败:', error)
      } finally {
        loading.value = false
      }
    }

    /** 清空导航树（退出登录时调用） */
    const clearNav = () => {
      navTree.value = []
      loaded.value = false
      loading.value = false
    }

    return {
      navTree,
      loaded,
      loading,
      loadNavTree,
      clearNav,
    }
  },
  {
    persist: true,
  },
)
