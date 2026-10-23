import type { AuthPermissionInfo, IUserInfoRes } from '@/api/types/login'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  // getUserInfo,
  getAuthPermissionInfo,
} from '@/api/login'

// 默认头像
export const DEFAULT_AVATAR = '/static/images/default-avatar.png'

// 初始化状态
const userInfoState: IUserInfoRes = {
  userId: -1,
  username: '',
  nickname: '',
  avatar: DEFAULT_AVATAR,
}

/**
 * 归一化头像地址。
 * 后端可能下发 Web 公共目录的相对路径（如 /imgs/xxx.png）：移动端（H5）会把它解析到 SPA 首页（返回 html）导致裂图，
 * 拼后端 origin 也无效（该资源并不由后端提供）。故仅信任绝对 URL 与移动端本地 /static/ 资源，其余回退默认头像。
 */
function normalizeAvatar(avatar?: string): string {
  if (!avatar) {
    return DEFAULT_AVATAR
  }
  if (/^https?:\/\//i.test(avatar) || avatar.startsWith('/static/')) {
    return avatar
  }
  return DEFAULT_AVATAR
}

const MAX_RECENT_MENUS = 12 // 最近使用菜单最多保留数量

export const useUserStore = defineStore(
  'user',
  () => {
    // 定义用户信息
    const userInfo = ref<IUserInfoRes>({ ...userInfoState })
    const tenantId = ref<number | null>(null) // 租户编号
    const visitTenantId = ref<number | null>(null) // 当前访问的租户编号
    const roles = ref<string[]>([]) // 角色标识列表
    const permissions = ref<string[]>([]) // 权限标识列表
    const favoriteMenus = ref<string[]>([]) // 常用菜单 key 列表
    const recentMenus = ref<string[]>([]) // 最近使用菜单 key 列表（按点击时间倒序）

    /** 设置用户信息 */
    const setUserInfo = (val: AuthPermissionInfo) => {
      val.user.avatar = normalizeAvatar(val.user.avatar)
      userInfo.value = val.user
      roles.value = val.roles
      permissions.value = val.permissions
    }

    const setUserAvatar = (avatar: string) => {
      userInfo.value.avatar = normalizeAvatar(avatar)
    }

    /** 删除用户信息 */
    const clearUserInfo = () => {
      userInfo.value = { ...userInfoState }
      visitTenantId.value = null
      roles.value = []
      permissions.value = []
      uni.removeStorageSync('user')
    }

    /** 设置租户编号 */
    const setTenantId = (id: number) => {
      tenantId.value = id
    }

    /** 设置当前访问的租户编号 */
    const setVisitTenantId = (id: number | null) => {
      visitTenantId.value = id
    }

    /** 设置常用菜单 */
    const setFavoriteMenus = (keys: string[]) => {
      favoriteMenus.value = keys
    }

    /** 记录一次最近使用（去重后置顶，最多保留 MAX_RECENT_MENUS 个） */
    const addRecentMenu = (key: string) => {
      const list = recentMenus.value.filter(k => k !== key)
      list.unshift(key)
      recentMenus.value = list.slice(0, MAX_RECENT_MENUS)
    }

    /** 获取用户信息 */
    const fetchUserInfo = async () => {
      const res = await getAuthPermissionInfo()
      // 兼容：后端返回的用户 id 字段为 id
      res.user.userId = res.user.id
      setUserInfo(res)
      return res
    }

    return {
      userInfo,
      tenantId,
      visitTenantId,
      roles,
      permissions,
      favoriteMenus,
      recentMenus,
      clearUserInfo,
      fetchUserInfo,
      setUserInfo,
      setUserAvatar,
      setTenantId,
      setVisitTenantId,
      setFavoriteMenus,
      addRecentMenu,
    }
  },
  {
    persist: true,
  },
)
