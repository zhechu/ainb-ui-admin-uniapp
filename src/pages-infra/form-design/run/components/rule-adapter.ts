import type { DictTreeData } from '@/hooks/useDict'
import type { FormCreateRule } from '@/pages-bpm/utils/form-create'
import type { RuntimeColumn } from './list-conf'
import { fetchDataInterfaceOptions } from '@/api/infra/form-design'
import { getDictTreeData, getDictTreeOptions } from '@/hooks/useDict'
import { formatCellText } from './list-conf'

/**
 * 在线表单控件在移动端渲染器上的适配层
 *
 * ## 为什么要有这一层
 *
 * 移动端复用的是 BPM 流程表单那套 wot-ui 版 form-create 渲染器
 * （`src/pages-bpm/components/form-create/packages/`）。那份代码是流程表单与在线表单共用的，
 * 改它等于拿在线表单的需求去回归流程表单 —— 所以 web 端表单设计器多出来的控件，
 * 差异全部收在这个文件里，`packages/` 一行不动。
 *
 * ## 做了哪四件事
 *
 * 1. **改名**：设计器里的 `elTreeSelect` 不在渲染器的 treeSelect 类型组里
 *    （`FORM_CREATE_TYPE_GROUPS.treeSelect` 只认 treeSelect/TreeSelect/treeSelectMultiple/tree/Tree），
 *    原样丢进去会落到「暂不支持」分支。`fcEditor` 同理，渲染器的 richText 组只认 Editor/editor。
 * 2. **解析字典数据源**：`props.dictSource` 是 web 端「选项来源＝数据字典」的声明，
 *    全移动端没有任何代码读它（`grep dictSource` 零命中），不解析的话下拉框是空的。
 *    字典是树时按控件形态给树或给缩进列表，见 `applyDictSource`。
 * 3. **解析远程数据源**：`RemotePicker` 在移动端没有对应组件，这里按它的数据源类型
 *    预取选项后降级成普通下拉。
 * 4. **兜底不支持的控件**：编辑态整条剔除，只读态降级成纯文本。
 *
 * ## 剔除为什么不会丢数据
 *
 * 服务端 `update` 的 SET 子句只按本次提交的列拼（`FormDesignRuntimeServiceImpl`），
 * 没提交的列保持原值。所以编辑态少一个控件，等于「这一列这次不改」，不是「改成空」。
 * 而 `SystemValue`（系统值）与 `BillNumberInput`（单据编号）本来就是服务端填的：
 * 前者被 `SystemValueGuard.strip` 从提交数据里剥掉，后者由 `BillTemplateFormFiller.fill` 生成 ——
 * 前端提不提交都不影响结果。
 */

/** 适配模式：编辑态剔除不支持的控件，只读态降级成纯文本 */
export type AdaptMode = 'edit' | 'readonly'

/** 适配结果 */
export interface AdaptedForm {
  /** 适配后的规则树，直接交给渲染器 */
  rules: FormCreateRule[]
  /** 被降级成纯文本展示的字段名，只读态才有值 */
  textFields: string[]
}

/**
 * 移动端渲染器没有实现的控件
 *
 * 逐个核过 `FORM_CREATE_TYPE_GROUPS` 与 `fieldRenderer.vue` 的显式分支后才列进来 ——
 * 渲染器认得的控件绝不该出现在这里，否则就是把能用的功能改没了。
 *
 * - `OrgPicker` 值契约是 `{type,id}` / `[{type,id}]`（五类主体合一），
 *   映射到 UserSelect/DeptSelect 会把 `{type:'user',id:1}` 写成 `1`，读回来对不上，属于毁数据
 * - `RelationForm` 需要「按目标表单弱查询 + 带出字段」的一整套交互，`reference-options` 端点有，组件没有
 * - `Formula` 由服务端 `FormulaRecalculator` 重算，前端不参与
 * - `CodeImage` / `Link` 是纯展示控件，`storage=none`，本来就不带数据
 * - `timeRange` 既不在 calendar 组也不在 timePicker 组
 */
const UNSUPPORTED_TYPES = new Set([
  'BillNumberInput',
  'CodeImage',
  'Formula',
  'Link',
  'OrgPicker',
  'RelationForm',
  'SystemValue',
  'timeRange',
])

/** 设计器类型 → 渲染器认得的类型 */
const TYPE_REWRITES: Record<string, string> = {
  fcEditor: 'Editor',
}

/** 字典数据源要写到规则的哪个位置，与 web 端 `OPTION_SOURCE_TARGETS` 一一对应 */
type DictTarget = 'propsData' | 'propsOptions' | 'ruleOptions'

/** 树形候选项，值类型按 `dictSource.valueType` 换算过 */
interface TreeOption {
  label: string
  value: any
  children?: TreeOption[]
}

function dictTargetOf(type?: string): DictTarget | undefined {
  switch (type) {
    case 'cascader':
    case 'ElCascader':
    case 'elCascader':
      return 'propsOptions'
    case 'Tree':
    case 'tree':
    case 'TreeSelect':
    case 'treeSelect':
    case 'treeSelectMultiple':
    case 'elTreeSelect':
      return 'propsData'
    case 'checkbox':
    case 'radio':
    case 'select':
    case 'selectMultiple':
      return 'ruleOptions'
    default:
      return undefined
  }
}

/**
 * 适配一棵规则树
 *
 * 不改传入的对象：BPM 那边传进来的规则可能还被别处引用，
 * 原地改会污染调用方。逐节点浅拷贝 + 重建 children，函数引用原样保留。
 */
export async function adaptFormRules(rules: FormCreateRule[], mode: AdaptMode): Promise<AdaptedForm> {
  const textFields: string[] = []
  const adapted = await adaptChildren(rules, mode, textFields)
  return { rules: adapted, textFields }
}

async function adaptChildren(
  rules: FormCreateRule[] | undefined,
  mode: AdaptMode,
  textFields: string[],
): Promise<FormCreateRule[]> {
  if (!Array.isArray(rules)) {
    return []
  }
  const result: FormCreateRule[] = []
  for (const rule of rules) {
    const adapted = await adaptRule(rule, mode, textFields)
    result.push(...adapted)
  }
  return result
}

/** 适配单条规则，返回 0/1 条（编辑态剔除不支持的控件时返回 0 条） */
async function adaptRule(
  rule: FormCreateRule | undefined,
  mode: AdaptMode,
  textFields: string[],
): Promise<FormCreateRule[]> {
  if (!rule || typeof rule !== 'object') {
    return []
  }

  const type = TYPE_REWRITES[rule.type] || rule.type
  const children = await adaptChildren(getChildRules(rule), mode, textFields)

  if (UNSUPPORTED_TYPES.has(rule.type)) {
    // 只读态降级成 span：渲染器有 `rule.type === 'span'` 的纯文本分支，
    // 比落到「暂不支持「xxx」」更能看 —— 详情页要的是值，不是一句道歉
    if (mode === 'readonly') {
      if (rule.field) {
        textFields.push(rule.field)
      }
      const span: FormCreateRule = { ...rule, props: { ...(rule.props || {}) }, type: 'span' }
      if (Array.isArray(rule.children)) {
        span.children = children
      }
      return [span]
    }
    // 编辑态剔除本体但保留子节点：不支持的控件不该把它包着的东西一起带走
    return children
  }

  const next: FormCreateRule = { ...rule, props: { ...(rule.props || {}) }, type }
  // 只在原规则本来就用 children 挂子节点时才回写。
  // 布局容器的子节点也可能挂在 props.rule / props.rows 上，那份由渲染器的 parser 自己读；
  // 这里另塞一个 children 会让同一批子节点被读两次
  if (Array.isArray(rule.children)) {
    next.children = children
  }

  // 树形选择：设计器给的是 elTreeSelect，渲染器的 treeSelect 组不认这个名字
  if (next.type === 'elTreeSelect') {
    next.type = isMultipleRule(next) ? 'treeSelectMultiple' : 'TreeSelect'
  }

  // 远程选择器：移动端没有对应组件，预取选项后降级成普通下拉
  if (next.type === 'RemotePicker') {
    await toSelectWithRemoteOptions(next)
  }

  applyDictSource(next)
  return [next]
}

/** 规则里可能挂着子节点的几个位置，与渲染器 `getRuleChildren` 的口径保持一致 */
function getChildRules(rule: FormCreateRule): FormCreateRule[] {
  const source = rule.children
    || rule.props?.children
    || rule.props?.rule
    || rule.props?.rows
    || rule.props?.columns
  if (!source) {
    return []
  }
  return Array.isArray(source) ? source.filter(item => item && typeof item === 'object') : []
}

function isMultipleRule(rule: FormCreateRule): boolean {
  return rule.type === 'treeSelectMultiple'
    || rule.type === 'selectMultiple'
    || !!rule.props?.multiple
    || rule.props?.mode === 'multiple'
    || !!rule.props?.showCheckbox
}

/**
 * 解析 `props.dictSource`
 *
 * 字典本身可以是树（区域：华东 ▸ 上海/江苏/浙江），候选项给什么形态要看控件吃什么：
 * 树选择、级联吃得下 `children`，就给原样的树，展开就能看层级；
 * 下拉、单选、多选只有一列，给树等于把层级压扁 —— 那种场合用缩进画出来，
 * 否则父节点和子节点并排着一模一样，填的人只会以为配错了。
 * 平铺字典两条路的结果完全一致。
 *
 * ⚠️ 仍未实现的是 web 端那两个开关：`rootValue`（只取某个子树）与
 * `flatMode`（path/indent/leaf 三种摊平方式）。这里固定用 indent，
 * 且总是给全部字典项 —— 配了这两项的表单在移动端会比 web 端多几个候选项。
 */
function applyDictSource(rule: FormCreateRule) {
  const source = rule.props?.dictSource
  if (!source?.dictType) {
    return
  }
  const target = dictTargetOf(rule.type)
  if (!target) {
    return
  }
  const valueType = source.valueType
  if (target === 'ruleOptions') {
    rule.options = getDictTreeOptions(source.dictType).map(item => ({
      label: item.label,
      value: convertDictValue(item.value, valueType),
    }))
    return
  }
  const data = toTreeData(getDictTreeData(source.dictType), valueType)
  if (target === 'propsOptions') {
    rule.props = { ...rule.props, options: data }
    return
  }
  rule.props = { ...rule.props, data }
}

/** 递归换算树上每一层的值类型 */
function toTreeData(nodes: DictTreeData[], valueType?: string): TreeOption[] {
  return nodes.map((node) => {
    const data: TreeOption = { label: node.label, value: convertDictValue(node.value, valueType) }
    if (node.children && node.children.length > 0) {
      data.children = toTreeData(node.children, valueType)
    }
    return data
  })
}

/** 字典值类型 → 表单里的值类型，与 `getDictOptions` 的 valueType 参数同一套换算 */
function convertDictValue(value: string, valueType?: string): boolean | number | string {
  if (valueType === 'int') {
    return Number.parseInt(value)
  }
  if (valueType === 'bool') {
    return value === 'true'
  }
  return value
}

/**
 * 把 RemotePicker 降级成普通下拉
 *
 * 三种数据源分别处理。接口类型是**进页面时取一次**：移动端渲染器的接口选择器
 * （`fc-api-select`）只认 `props.url` 且不会剥服务端那层 `{code,msg,data}` 包装，
 * 而改它要动 `packages/`。取一次 + 本地筛选是移动端的合理形态，
 * 代价是「上级变了下级候选跟着变」这类联动在移动端不生效。
 */
async function toSelectWithRemoteOptions(rule: FormCreateRule) {
  const sourceType = rule.props?.sourceType || 'interface'
  const labelField = rule.props?.labelField || 'label'
  const valueField = rule.props?.valueField || 'value'
  let options: Array<{ label: string, value: any }> = []

  if (sourceType === 'static') {
    options = toOptions(rule.props?.staticOptions, labelField, valueField)
  } else if (sourceType === 'dict') {
    options = getDictTreeOptions(String(rule.props?.dictType || '')).map(item => ({
      label: item.label,
      value: item.value,
    }))
  } else if (rule.props?.interfaceCode) {
    try {
      const rows = unwrapRows(await fetchDataInterfaceOptions(String(rule.props.interfaceCode)))
      options = toOptions(rows, labelField, valueField)
    } catch (error) {
      // 数据源配错不该让整张表单打不开：下拉点开是空的，用户一眼能看出问题
      console.warn('[form-design] 远程选择器取数失败', rule.props?.interfaceCode, error)
    }
  }

  rule.type = 'select'
  rule.options = options
}

function toOptions(rows: any, labelField: string, valueField: string) {
  if (!Array.isArray(rows)) {
    return []
  }
  return rows
    .map((row: Record<string, any>) => ({
      label: String(row?.[labelField] ?? row?.label ?? row?.[valueField] ?? ''),
      value: row?.[valueField] ?? row?.value,
    }))
    .filter(item => item.value !== undefined && item.value !== null && item.value !== '')
}

/**
 * 剥掉数据接口返回的多层包装
 *
 * SQL / 静态 JSON 类型的数据接口，服务端会先包一层 `{code,msg,data}`，
 * Controller 的 success() 再包一层，而 http 拦截器只剥得掉外面那层 ——
 * 不剥的话拿到手是个对象而不是数组，下拉永远是空的且没有任何报错。
 * 与 web 端 `unwrapRows` 同一套逻辑。
 */
function unwrapRows(payload: any): any[] {
  let current = payload
  for (let depth = 0; depth < 3; depth++) {
    if (Array.isArray(current)) {
      return current
    }
    if (!current || typeof current !== 'object') {
      return []
    }
    if (Array.isArray(current.list)) {
      return current.list
    }
    if (Array.isArray(current.records)) {
      return current.records
    }
    if ('data' in current) {
      current = current.data
      continue
    }
    return []
  }
  return []
}

/**
 * 把降级字段的值转成能读出来的文本
 *
 * 渲染器的 span 分支对数组会 `join('，')`，但对象会印出 `[object Object]` ——
 * OrgPicker 存的正是 `{type,id}` 这种对象。这里复用列表那套格式化，
 * 两端不会各说一套。
 */
export function toTextValues(fields: string[], values: Record<string, any>): Record<string, any> {
  if (!fields.length) {
    return values
  }
  const result = { ...values }
  fields.forEach((field) => {
    if (field in result) {
      result[field] = formatCellText(result[field])
    }
  })
  return result
}

/**
 * 没配列表列时，从表单规则兜底出一份
 *
 * 「纯表单」类型（formType=1）没有 list_conf，而 App 端的入口统一指向列表页 ——
 * 没有列就没有卡片标题，一张卡片什么都不显示比不显示更像坏了。
 * 这里按规则树里「有 field 且有 title」的顺序取前几项，够卡片显示即可，
 * 格式化一律走默认（原始值），因为纯表单本来就没有列格式化配置。
 */
export function deriveColumns(rules: FormCreateRule[], limit = 4): RuntimeColumn[] {
  const columns: RuntimeColumn[] = []
  const walk = (list: FormCreateRule[]) => {
    list.forEach((rule) => {
      if (columns.length >= limit) {
        return
      }
      if (rule.field && rule.title && !UNSUPPORTED_TYPES.has(rule.type)) {
        columns.push({ field: String(rule.field), label: String(rule.title) })
      }
      const children = getChildRules(rule)
      if (children.length > 0) {
        walk(children)
      }
    })
  }
  walk(Array.isArray(rules) ? rules : [])
  return columns
}
