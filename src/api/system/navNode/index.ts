import { http } from '@/http/http'

/**
 * 分端导航节点（服务端下发，移动端工作台消费）
 *
 * 对应后端 NavNodeTreeRespVO（GET /system/nav-node/tree?terminal=app）。
 * 服务端已按当前用户授权过滤（visible + permissions 命中 + 分组级联），
 * 故这里拿到的就是「该用户在本端能看到的导航树」，前端不再做权限白名单过滤。
 */
export interface NavNodeTree {
  /** 节点编号（用作稳定 key，替代旧 menu.json 的 key） */
  id: number
  /** 父节点编号 */
  parentId: number
  /** 节点类型：1=分组 2=子分组 3=导航项 */
  nodeType: number
  /** 展示名称 */
  name: string
  /** 叶子节点页面路径（须命中 pages.json） */
  route?: string
  /** 图标（wot-ui 图标名或图片路径） */
  icon?: string
  /** 图标颜色 */
  iconColor?: string
  /** 是否 tabbar 页 */
  isTabbar?: boolean
  /** 是否仅 PC（点击跳提示页） */
  onlyPc?: boolean
  /** 页面参数（如在线表单 code=xxx） */
  query?: string
  /** 同级排序 */
  sort?: number
  /** 子节点 */
  children?: NavNodeTree[]
}

/** 获取当前用户的分端导航树（缺省 app 端） */
export function getNavTree(terminal = 'app') {
  return http.get<NavNodeTree[]>('/system/nav-node/tree', { terminal })
}
