import type { DictItem } from '@/store/dict'
import { useDictStore } from '@/store/dict'

type ColorType = 'error' | 'info' | 'primary' | 'success' | 'warning'

export interface DictDataType {
  dictType?: string
  label: string
  value: boolean | number | string
  colorType?: string
  cssClass?: string
}

export interface NumberDictDataType extends DictDataType {
  value: number
}

export interface StringDictDataType extends DictDataType {
  value: string
}

/**
 * 获取字典标签
 *
 * @param dictType 字典类型
 * @param value 字典值
 * @returns 字典标签
 */
export function getDictLabel(dictType: string, value: any): string {
  const dictStore = useDictStore()
  const dictObj = dictStore.getDictData(dictType, value)
  return dictObj ? dictObj.label : ''
}

/**
 * 获取字典对象
 *
 * @param dictType 字典类型
 * @param value 字典值
 * @returns 字典对象
 */
export function getDictObj(dictType: string, value: any): DictItem | null {
  const dictStore = useDictStore()
  const dictObj = dictStore.getDictData(dictType, value)
  return dictObj || null
}

export function getIntDictOptions(dictType: string): NumberDictDataType[] {
  // 获得通用的 DictDataType 列表
  const dictOptions: DictDataType[] = getDictOptions(dictType)
  // 转换成 number 类型的 NumberDictDataType 类型
  // why 需要特殊转换：避免 IDEA 在 v-for="dict in getIntDictOptions(...)" 时，el-option 的 key 会告警
  const dictOption: NumberDictDataType[] = []
  dictOptions.forEach((dict: DictDataType) => {
    dictOption.push({
      ...dict,
      value: Number.parseInt(`${dict.value}`),
    })
  })
  return dictOption
}

export function getStrDictOptions(dictType: string) {
  // 获得通用的 DictDataType 列表
  const dictOptions: DictDataType[] = getDictOptions(dictType)
  // 转换成 string 类型的 StringDictDataType 类型
  // why 需要特殊转换：避免 IDEA 在 v-for="dict in getStrDictOptions(...)" 时，el-option 的 key 会告警
  const dictOption: StringDictDataType[] = []
  dictOptions.forEach((dict: DictDataType) => {
    dictOption.push({
      ...dict,
      value: `${dict.value}`,
    })
  })
  return dictOption
}

export function getBoolDictOptions(dictType: string) {
  const dictOption: DictDataType[] = []
  const dictOptions: DictDataType[] = getDictOptions(dictType)
  dictOptions.forEach((dict: DictDataType) => {
    dictOption.push({
      ...dict,
      value: `${dict.value}` === 'true',
    })
  })
  return dictOption
}

/**
 * 获取字典数组，用于 picker、radio 等
 *
 * @param dictType 字典类型
 * @param valueType 字典值类型，默认 string 类型
 * @returns 字典数组
 */
export function getDictOptions(
  dictType: string,
  valueType: 'boolean' | 'number' | 'string' = 'string',
): DictDataType[] {
  const dictStore = useDictStore()
  const dictOpts = dictStore.getDictOptions(dictType)
  const dictOptions: DictDataType[] = []

  if (dictOpts.length > 0) {
    let dictValue: boolean | number | string = ''
    dictOpts.forEach((dict) => {
      switch (valueType) {
        case 'boolean': {
          dictValue = `${dict.value}` === 'true'
          break
        }
        case 'number': {
          dictValue = Number.parseInt(`${dict.value}`)
          break
        }
        case 'string': {
          dictValue = `${dict.value}`
          break
        }
      }
      dictOptions.push({
        value: dictValue,
        label: dict.label,
        colorType: dict.colorType as ColorType,
        cssClass: dict.cssClass,
      })
    })
  }

  return dictOptions
}

// ==================== 树形字典 ====================
//
// 字典本身可以是树（区域：华东 ▸ 上海/江苏/浙江），靠 parentId 挂。
// 移动端能不能保住层级，看控件吃什么：表单渲染器有树选择和级联，直接给原样的树；
// 列表的筛选弹窗只有一列 picker，摊平之后父节点和子节点长得一样、还并排着，
// 配的人只会以为自己配错了，所以那种场合要用缩进把层级画出来。
// 还有第三件事与形态无关：按父节点筛的时候只匹配它自己的值，
// 挂在子节点上的数据一条都出不来 —— 筛选时必须把子树算进去。

interface DictTreeNode {
  item: DictItem
  children: DictTreeNode[]
}

/**
 * 按 parentId 把一类字典建成树
 *
 * parentId 为 0、缺失、或指向一个不存在的节点，都当根 ——
 * 老缓存里没有 parentId 时会得到一棵全是根的树，那是如实的退化，不是崩。
 */
function buildDictTree(dictType: string): DictTreeNode[] {
  const items = useDictStore().getDictOptions(dictType)
  const nodeById = new Map<number, DictTreeNode>()
  items.forEach((item) => {
    if (item.id !== undefined) {
      nodeById.set(item.id, { children: [], item })
    }
  })
  const roots: DictTreeNode[] = []
  items.forEach((item) => {
    const node = item.id === undefined ? undefined : nodeById.get(item.id)
    if (!node) {
      roots.push({ children: [], item })
      return
    }
    const parent = item.parentId ? nodeById.get(item.parentId) : undefined
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

/** 摊平后的字典候选项 */
export interface DictTreeOption {
  label: string
  value: string
}

/**
 * 树形字典 → 带缩进的一列候选项
 *
 * 缩进是「只有一列」的选择器里唯一能表达层级的手段。
 * 控件本身能展开层级的，用 `getDictTreeData`，别拿缩进凑。
 * 平铺字典会得到一列没有缩进的根节点，与 `getDictOptions` 的结果等价。
 */
export function getDictTreeOptions(dictType: string): DictTreeOption[] {
  const options: DictTreeOption[] = []
  const walk = (nodes: DictTreeNode[], depth: number) => {
    nodes.forEach((node) => {
      options.push({ label: `${'　'.repeat(depth)}${node.item.label}`, value: node.item.value })
      walk(node.children, depth + 1)
    })
  }
  walk(buildDictTree(dictType), 0)
  return options
}

/**
 * 字典值 → 自身 + 全部后代
 *
 * 与 web 端左侧树的 `collectTreeValues` 同一口径。字典里找不到这个值时
 * 原样返回它一个，让调用方按等值筛 —— 查不出东西也比悄悄丢掉条件好。
 */
export function collectDictSubtreeValues(dictType: string, value: any): string[] {
  const target = String(value)
  const values: string[] = []
  const walk = (nodes: DictTreeNode[], inside: boolean) => {
    nodes.forEach((node) => {
      const hit = inside || node.item.value === target
      if (hit) {
        values.push(node.item.value)
      }
      walk(node.children, hit)
    })
  }
  walk(buildDictTree(dictType), false)
  return values.length > 0 ? values : [target]
}

/** 带层级的字典候选项，交给树选择、级联这类吃得下 children 的控件 */
export interface DictTreeData {
  label: string
  value: string
  children?: DictTreeData[]
}

/**
 * 树形字典 → 保留层级的候选项
 *
 * 与 `getDictTreeOptions` 的区别只在形态：那个是摊平加缩进，给一列的下拉用；
 * 这个是原样的树，给能展开的控件用。平铺字典两者等价（都没有层级可表达）。
 */
export function getDictTreeData(dictType: string): DictTreeData[] {
  const mapNodes = (nodes: DictTreeNode[]): DictTreeData[] => nodes.map((node) => {
    const data: DictTreeData = { label: node.item.label, value: node.item.value }
    if (node.children.length > 0) {
      data.children = mapNodes(node.children)
    }
    return data
  })
  return mapNodes(buildDictTree(dictType))
}
