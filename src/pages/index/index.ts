import type { NavNodeTree } from '@/api/system/navNode'
import { useToast } from '@wot-ui/ui/components/wd-toast'
import { ref } from 'vue'
import { ONLY_PC_PAGE } from '@/router/config'
import { useNavStore } from '@/store/nav'
import { useUserStore } from '@/store/user'
import { isTabBarPage } from '@/tabbar/config'
import { parseUrl, setTabParams } from '@/utils/url'

/**
 * 工作台菜单数据（服务端驱动）
 *
 * 数据来源为后端「分端导航树」（GET /system/nav-node/tree?terminal=app），
 * 登录后拉取一次并持久化到 nav store（见 store/nav.ts）。服务端已按当前用户授权过滤，
 * 前端不再做权限白名单判断，只负责把导航树映射为界面消费的三层结构。
 *
 * 菜单结构为三层：分组(group) ▸ 二级分组(subGroup) ▸ 菜单项(menu)，
 * 四种布局（小标题 / 折叠 / 纵向分类 / 横向分类）共用同一份数据，仅渲染外壳不同。
 */

/** 菜单项类型 */
export interface MenuItem {
  key: string // 菜单唯一标识（取导航节点 id）
  name: string // 菜单名称
  icon: string // 菜单图标（支持 @wot-ui/ui 图标名或图片路径）
  url?: string // 跳转路径
  iconColor?: string // 图标颜色（可选）
  permission?: string // 权限标识（保留字段，服务端已过滤，前端不再使用）
  permissions?: string[] // 权限标识列表（保留字段，服务端已过滤，前端不再使用）
  onlyPc?: boolean // 仅 PC 端可用（移动端点击跳转至提示页）
}

/** 二级分组类型 */
export interface MenuSubGroup {
  key: string // 二级分组唯一标识
  name: string // 二级分组名称（空字符串表示不展示小标题，直接平铺菜单）
  menus: MenuItem[] // 二级分组下的菜单列表
}

/** 菜单分组类型 */
export interface MenuGroup {
  key: string // 分组唯一标识
  name: string // 分组名称
  subGroups: MenuSubGroup[] // 二级分组列表
  menus: MenuItem[] // 分组下的全部菜单（由二级分组拍平得到，便于搜索/常用等场景）
}

/** 工作台菜单布局：section=小标题分组 / accordion=折叠 / sidebar=纵向分类 / tabs=横向分类 */
export type MenuLayout = 'section' | 'accordion' | 'sidebar' | 'tabs'

/** 分类布局（sidebar/tabs）中「我的常用」标签页的标识 */
export const FAVORITE_TAB_KEY = '__fav'

const LAYOUT_STORAGE_KEY = 'workbenchMenuLayout'

/** 当前菜单布局（全局共享 + 本地持久化） */
export const menuLayout = ref<MenuLayout>((uni.getStorageSync(LAYOUT_STORAGE_KEY) as MenuLayout) || 'sidebar')

/** 切换菜单布局 */
export function setMenuLayout(layout: MenuLayout) {
  menuLayout.value = layout
  uni.setStorageSync(LAYOUT_STORAGE_KEY, layout)
}

/** 导航节点类型：与后端 NavNodeTypeEnum 保持一致 */
const NAV_GROUP = 1 // 分组
const NAV_SUB_GROUP = 2 // 二级分组
const NAV_ITEM = 3 // 导航项（叶子）

/** 导航项 → 菜单项：拼接 route + query；onlyPc 落地为「仅 PC 提示页」 */
function toItem(node: NavNodeTree): MenuItem {
  const url = node.onlyPc
    ? ONLY_PC_PAGE
    : `${node.route || ''}${node.query ? `?${node.query}` : ''}`
  return {
    key: String(node.id),
    name: node.name,
    icon: node.icon || '',
    url: url || undefined,
    iconColor: node.iconColor || undefined,
    onlyPc: node.onlyPc || false,
  }
}

/** 二级分组节点 → MenuSubGroup（仅收集其下的叶子导航项） */
function toSubGroup(node: NavNodeTree): MenuSubGroup {
  const menus = (node.children || [])
    .filter(child => child.nodeType === NAV_ITEM)
    .map(toItem)
  return { key: String(node.id), name: node.name || '', menus }
}

/**
 * 分组节点 → MenuGroup
 *
 * 兼容两种子结构：二级分组（SUB_GROUP）与直接挂在分组下的导航项（ITEM）。
 * 直接子导航项统一收进一个「无标题二级分组」，保证各布局都能正常平铺渲染。
 */
function toGroup(node: NavNodeTree): MenuGroup {
  const children = node.children || []
  const subGroups: MenuSubGroup[] = []
  const directItems: MenuItem[] = []
  for (const child of children) {
    if (child.nodeType === NAV_SUB_GROUP) {
      subGroups.push(toSubGroup(child))
    } else if (child.nodeType === NAV_ITEM) {
      directItems.push(toItem(child))
    }
  }
  if (directItems.length > 0) {
    subGroups.push({ key: `${node.id}__direct`, name: '', menus: directItems })
  }
  return {
    key: String(node.id),
    name: node.name,
    subGroups,
    menus: subGroups.flatMap(sub => sub.menus),
  }
}

/**
 * 获取所有菜单分组数据
 *
 * 直接读取 nav store 中的导航树（服务端已按授权过滤、级联隐藏空分组、并按 sort 排序），
 * 这里仅做「导航树 → 三层菜单结构」的映射。响应式：store 更新后依赖它的 computed 会自动刷新。
 */
export function getMenuGroups(): MenuGroup[] {
  const navStore = useNavStore()
  return (navStore.navTree || [])
    .filter(node => node.nodeType === NAV_GROUP)
    .map(toGroup)
    .filter(group => group.menus.length > 0)
}

/** 获取所有菜单项（扁平化） */
export function getAllMenuItems(): MenuItem[] {
  return getMenuGroups().flatMap(group => group.menus)
}

/** 根据 key 获取菜单项 */
export function getMenuItemByKey(key: string): MenuItem | undefined {
  return getAllMenuItems().find(item => item.key === key)
}

/** 可搜索菜单项（带分组上下文，便于搜索结果展示「所属模块」） */
export interface SearchableMenuItem extends MenuItem {
  groupName: string // 所属分组名
  subName: string // 所属二级分组名
}

/** 获取所有可搜索菜单（带分组上下文） */
export function getSearchableMenus(): SearchableMenuItem[] {
  const result: SearchableMenuItem[] = []
  for (const group of getMenuGroups()) {
    for (const sub of group.subGroups) {
      for (const menu of sub.menus) {
        result.push({ ...menu, groupName: group.name, subName: sub.name })
      }
    }
  }
  return result
}

/**
 * 菜单跳转逻辑（菜单网格、搜索页共用）
 *
 * 处理：开发中提示、最近使用记录、tabBar 页 switchTab、普通页 navigateTo、失败兜底。
 */
export function useMenuNavigate() {
  const toast = useToast()
  const userStore = useUserStore()

  function navigateToMenu(menu: MenuItem) {
    if (!menu.url) {
      toast.show('功能开发中')
      return
    }

    // 跳转成功后才记录最近使用（仅真实可跳转的菜单，排除「仅 PC」提示页），避免失败跳转污染
    const recordRecent = () => {
      if (!menu.onlyPc) {
        userStore.addRecentMenu(menu.key)
      }
    }

    const { path, query } = parseUrl(menu.url)

    if (isTabBarPage(path)) {
      // switchTab 不接受 query 参数，改用 globalData 传递
      if (Object.keys(query).length > 0) {
        setTabParams(query)
      }
      uni.switchTab({
        url: path,
        success: recordRecent,
        fail: () => {
          toast.show('页面不存在')
        },
      })
    } else {
      uni.navigateTo({
        url: menu.url,
        success: recordRecent,
        fail: () => {
          toast.show('页面不存在')
        },
      })
    }
  }

  return { navigateToMenu }
}
