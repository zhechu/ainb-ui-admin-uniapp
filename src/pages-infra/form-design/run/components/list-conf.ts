import type { FormRuntimeCondition } from '@/api/infra/form-design'
import { collectDictSubtreeValues, getDictLabel, getDictTreeOptions } from '@/hooks/useDict'
import { formatDate } from '@/utils/date'

/**
 * 列表配置的移动端解析层
 *
 * 事实来源是 web 端 `src/components/FormWidgets/listCell.ts` 与 `searchWidget.ts`：
 * 格式化类型、空值占位、布尔文案、查询控件与操作符都由那份契约决定，后端导出也读同一份。
 * 这里只做「同样的规则、移动端的形态」，不另立一套语义 ——
 * 两端各写一份的结果必然是「列表显示正常、导出是另一套」。
 *
 * ⚠️ 差异只有一处并且是刻意的：字典查不到标签时这里回落到原始值，
 * web 端显示空字符串。移动端一行只有一个值，空白看起来像数据丢了，
 * 印出编码至少还能对照字典管理排查。
 *
 * ## 一条铁律：配了的东西不许静默丢
 *
 * list_conf 是设计者在 web 端一项项配出来的，移动端解析不了某一项时，
 * 「不显示」和「显示错」在用户眼里都是 BUG，而且都查不出原因 ——
 * 他会去改配置、重新发布，而不是怀疑 App 端少写了一段解析。
 * 所以这里对每一项配置只有两种处置：
 *
 * 1. **按同样的语义渲染成移动端形态**（列 → 卡片键值行、查询项 → 搜索弹窗、
 *    左侧树 → 搜索弹窗里的一个下拉、操作列按钮 → 卡片底部按钮 + 悬浮新增）；
 * 2. **明确写进下面这份「移动端没有对应形态」的清单**，不装作解析过了。
 *
 * 移动端没有对应形态的（都是桌面态动作或表格专属能力，不是解析漏了）：
 * `showSummary`/`summaryColumns`（合计行）、`showIndexColumn`（序号列）、
 * `exportMaxRows`（导出）、`formViewMode`（弹窗/抽屉/整页，移动端固定整页）、
 * `complexHeaders`（多级表头）、`inlineEdit`（行内编辑，移动端走整页表单）、
 * `columnSetting`（使用者本地列偏好）、`rowGroup`（行分组）、
 * `treeConfig`（树形列表，移动端平铺显示全部行）、
 * 操作列按钮里的 `import`/`export`/`print`/`printList`/`batchDelete`/`batchPrint`/`changeLog`。
 */

/** 列格式化配置，字段与 web 契约同名 */
export interface CellFormatter {
  type?: string
  dictType?: string
  precision?: number
  thousands?: boolean
  /** PERCENT 专用：库里存的是已经乘过 100 的数 */
  alreadyScaled?: boolean
  tagTypes?: Record<string, string>
  linkText?: string
}

/** 列表列配置 */
export interface RuntimeColumn {
  field: string
  label: string
  align?: string
  width?: number
  formatter?: CellFormatter
}

/** 查询控件类型，与 web `SearchWidgetType` 一致 */
export type SearchWidgetType
  = 'DATE'
    | 'DATE_RANGE'
    | 'NUMBER'
    | 'NUMBER_RANGE'
    | 'SELECT'
    | 'SWITCH'
    | 'TEXT'

/** 下拉候选项 */
export interface SearchOption {
  label: string
  value: any
}

/** 查询项配置 */
export interface RuntimeSearchItem {
  field: string
  label: string
  widget: SearchWidgetType
  operator?: string
  dictType?: string
  /**
   * 候选项由运行时异步取来，与 dictType 二选一
   *
   * 左侧树的「表单字段」数据源走这里：节点值是该列的实际去重值，
   * 字典里没有，只能进页面时问一次服务端。
   */
  columns?: SearchOption[]
  /**
   * 字典是树形的，选中父节点要连子树一起筛
   *
   * 只有左侧树的字典数据源会是 true。普通查询项即使在树形字典上也按等值筛 ——
   * 那是 web 端查询区的既有口径，不能顺手改掉。
   */
  treeDict?: boolean
}

/** 一个按钮的配置。只留移动端用得到的两个键，与 web `listButton.ts` 的 ListButton 同形 */
export interface RuntimeOperationButton {
  key: string
  label: string
}

/** 操作列配置 */
export interface RuntimeOperationColumn {
  show: boolean
  label: string
  /** 归一后「要显示」的按钮，顺序即配置里的顺序 */
  buttons: RuntimeOperationButton[]
}

/**
 * 左侧树查询区配置，与 web `StepListDesign.vue` 的 leftTree 同形
 *
 * 移动端没有「列表左边挂一棵树」的位置，这一项渲染成搜索弹窗里的一个下拉 ——
 * 一样是按某个字段筛，只是从常驻变成点开。配置本身一个字都不丢。
 */
export interface RuntimeLeftTree {
  dataSource: 'DICT' | 'FIELD'
  dictType?: string
  field: string
  title: string
}

/**
 * 标签页筛选配置，与 web `tabConfig` 同形
 *
 * 一个标签等价于一个常驻的等值条件，比每次点开搜索弹窗选一遍快。
 * 「全部」由运行时自己加在最前面，不存在配置里（与 web 一致）。
 */
export interface RuntimeTabConfig {
  field: string
  tabs: Array<{ label: string, value: string }>
}

/** 解析后的列表配置 */
export interface ParsedListConf {
  columns: RuntimeColumn[]
  searchItems: RuntimeSearchItem[]
  operation: RuntimeOperationColumn
  pageSize: number
  sortField?: string
  sortOrder?: string
  leftTree?: RuntimeLeftTree
  tabs?: RuntimeTabConfig
}

/** 空值占位，取自后端契约 cell-format-contracts.json 的 emptyCell */
export const EMPTY_CELL = '-'

/** 数字格式化的默认小数位，同样取自契约 */
const DEFAULT_PRECISION = 2

/** 布尔的显示文案与判真值，取自契约的 booleanText */
const BOOLEAN_TRUE_TEXT = '是'
const BOOLEAN_FALSE_TEXT = '否'
const BOOLEAN_TRUE_VALUES: any[] = [true, 1, '1']

/** 渲染分支：只有这四类不是纯文本 */
export type CellRenderKind = 'FILE' | 'IMAGE' | 'LINK' | 'TAG' | 'TEXT'

/** 默认分页大小，与 web 端一致 */
const DEFAULT_PAGE_SIZE = 10

export function cellRenderKind(formatter?: CellFormatter): CellRenderKind {
  switch (formatter?.type) {
    case 'FILE':
      return 'FILE'
    case 'IMAGE':
      return 'IMAGE'
    case 'LINK':
      return 'LINK'
    case 'TAG':
      return 'TAG'
    default:
      return 'TEXT'
  }
}

export function isEmptyCellValue(value: any): boolean {
  return value === null || value === undefined || value === ''
}

/** 值算不算「真」，判据与后端 CellFormatContractRegistry#isTruthy 同源 */
export function isTruthyCellValue(value: any): boolean {
  return BOOLEAN_TRUE_VALUES.includes(value)
}

/** 文本类格式化。TAG 也走这里取文案 —— 标签上印的就是字典翻译后的文字 */
export function formatCellText(value: any, formatter?: CellFormatter): string {
  if (isEmptyCellValue(value)) {
    return EMPTY_CELL
  }
  const type = formatter?.type
  if (!type || type === 'NONE') {
    return stringifyCellValue(value)
  }
  switch (type) {
    case 'DICT':
    case 'TAG': {
      if (!formatter?.dictType) {
        return stringifyCellValue(value)
      }
      return getDictLabel(formatter.dictType, value) || stringifyCellValue(value)
    }
    case 'DATE':
      return formatDate(value, 'YYYY-MM-DD')
    case 'DATETIME':
      return formatDate(value, 'YYYY-MM-DD HH:mm:ss')
    case 'NUMBER':
      return formatNumber(value, formatter)
    case 'PERCENT': {
      const num = Number(value)
      if (Number.isNaN(num)) {
        return stringifyCellValue(value)
      }
      const scaled = formatter.alreadyScaled ? num : num * 100
      return `${scaled.toFixed(formatter.precision ?? DEFAULT_PRECISION)}%`
    }
    case 'BOOLEAN':
      return isTruthyCellValue(value) ? BOOLEAN_TRUE_TEXT : BOOLEAN_FALSE_TEXT
    default:
      return stringifyCellValue(value)
  }
}

/** 对象/数组值不直接 String() —— 那会印出 [object Object] */
function stringifyCellValue(value: any): string {
  if (Array.isArray(value)) {
    return value.map(item => stringifyCellValue(item)).join('，')
  }
  if (value && typeof value === 'object') {
    return summarizeObjectValue(value)
  }
  return String(value)
}

/** 从对象里挑一个能认出来的显示字段，挑不到才退回 JSON */
function summarizeObjectValue(value: Record<string, any>): string {
  const key = ['label', 'name', 'title', 'text', 'value', 'id'].find(
    item => !isEmptyCellValue(value[item]),
  )
  if (key) {
    return stringifyCellValue(value[key])
  }
  try {
    return JSON.stringify(value)
  } catch {
    return EMPTY_CELL
  }
}

/** 数字格式化。千分位与小数位共用一套，避免「显示 1,234.57 但合计是 1234.5」 */
function formatNumber(value: any, formatter?: CellFormatter): string {
  const num = Number(value)
  if (Number.isNaN(num)) {
    return stringifyCellValue(value)
  }
  const precision = formatter?.precision ?? DEFAULT_PRECISION
  const fixed = num.toFixed(precision)
  if (!formatter?.thousands) {
    return fixed
  }
  return Number(fixed).toLocaleString(undefined, {
    maximumFractionDigits: precision,
    minimumFractionDigits: precision,
  })
}

/** wd-tag 可用的类型 */
const TAG_TYPES = ['default', 'primary', 'success', 'warning', 'danger'] as const

/**
 * 标签颜色
 *
 * 优先用配置里的映射；没配时按值算一个稳定的颜色 ——
 * 关键是同一个值每次都得到同一个颜色，否则翻页时同一个状态变色，看起来像数据变了。
 */
export function tagTypeOf(value: any, formatter?: CellFormatter): string {
  const mapped = formatter?.tagTypes?.[String(value)]
  if (mapped && (TAG_TYPES as readonly string[]).includes(mapped)) {
    return mapped
  }
  const key = String(value)
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash + key.charCodeAt(i)) % TAG_TYPES.length
  }
  return TAG_TYPES[hash]
}

/**
 * 把上传类字段的值解析成 URL 清单
 *
 * 要兼容三种形态：对象数组 `[{name,url}]`、JSON 字符串、裸 URL（逗号分隔）。
 * 解析不出来时返回空数组而不是抛异常 —— 一列坏数据不该让整张列表白屏。
 */
export function parseCellUrls(value: any): string[] {
  if (isEmptyCellValue(value)) {
    return []
  }
  let raw = value
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        raw = JSON.parse(trimmed)
      } catch {
        return []
      }
    } else {
      return trimmed
        .split(',')
        .map(url => url.trim())
        .filter(Boolean)
    }
  }
  const list = Array.isArray(raw) ? raw : [raw]
  return list
    .map((item) => {
      if (typeof item === 'string') {
        return item
      }
      return item && typeof item === 'object' && typeof item.url === 'string' ? item.url : ''
    })
    .filter(Boolean)
}

/** 一个单元格算好的展示结果 */
export interface CellView {
  label: string
  text: string
  kind: CellRenderKind
  dictType?: string
  tagType?: string
  urls: string[]
  /** 原始值。LINK 要拿它当地址，TAG/DICT 要拿它查字典 */
  raw: any
}

/** 算出一个单元格的展示结果 */
export function describeCell(row: Record<string, any>, column: RuntimeColumn): CellView {
  const raw = row?.[column.field]
  const kind = cellRenderKind(column.formatter)
  return {
    dictType: column.formatter?.dictType,
    kind,
    label: column.label || column.field,
    raw,
    tagType: kind === 'TAG' ? tagTypeOf(raw, column.formatter) : undefined,
    text: formatCellText(raw, column.formatter),
    urls: kind === 'IMAGE' || kind === 'FILE' ? parseCellUrls(raw) : [],
  }
}

/** 卡片的展示结构：标题 + 若干键值行 + 右上角状态标签 */
export interface CardView {
  title: CellView
  rows: CellView[]
  badge?: CellView
}

/**
 * 把一行数据折成移动端卡片
 *
 * 表格在窄屏上放不下多列，硬塞只会横向滚动。这里降级成「标题 + 键值行 + 右上状态」，
 * 状态标签优先从第 2 列起找 —— 第 1 列当标题时再给它挂个标签，两者会打架。
 *
 * ⚠️ 配了几列就显示几列，一律不截断。
 * 以前这里写着 `slice(0, 3)`，多出来的列直接消失：设计者在 web 端配了 6 列，
 * App 上只看得到 4 个字段，而且没有任何提示 —— 他会以为发布丢了配置，反复重发。
 * 卡片长一点是可以滚的，字段少了是查不出来的。
 * 想少显示几列，那是设计器里取消勾选的事，不是移动端替他决定的事。
 *
 * 右上标签那一列**同样**出现在键值行里，这是故意的：标签上只有值没有字段名，
 * 少了那一行就等于「这个字段没显示」。重复一个值，比少一个字段好查得多。
 */
export function buildCardView(row: Record<string, any>, columns: RuntimeColumn[]): CardView {
  const [first, ...rest] = columns
  const titleColumn = first || { field: '', label: '' }
  const badgeColumn = rest.find(column => column.formatter?.type === 'TAG' || column.formatter?.type === 'DICT')
  return {
    badge: badgeColumn ? describeCell(row, badgeColumn) : undefined,
    rows: rest.map(column => describeCell(row, column)),
    title: describeCell(row, titleColumn),
  }
}

/** 移动端有对应交互的按钮及其出厂文案。其余的见文件头「移动端没有对应形态」清单 */
const MOBILE_BUTTON_LABELS: Record<string, string> = {
  create: '新增',
  delete: '删除',
  detail: '详情',
  edit: '编辑',
}

/** 完全没配过按钮时的出厂组合，取 web `BUILTIN_BUTTONS` 里 defaultShow 为真且移动端有交互的那几个 */
const DEFAULT_BUTTON_KEYS = ['create', 'edit', 'detail', 'delete']

/**
 * 归一按钮清单
 *
 * 与 web `listButton.ts` 的 `normalizeButtons` 吃同一种存量数据，两种形态都要认：
 * - 旧的字符串数组 `['edit','detail','delete']`：出现在数组里就是显示
 * - 新的对象清单 `[{key,label,icon,show}]`：只有 `show === false` 才是关掉，文案用配的
 *
 * ⚠️ 这里以前是把存下来的东西原样抄进 `buttons`，而调用方用的是
 * `buttons.includes('edit')` 这种字符串口径 —— 对象清单里每一项都是对象，
 * 永远命中不了。结果是「凡是在设计器里配过操作列的表单，移动端一个编辑/删除按钮都没有」，
 * 而 web 端一切正常，看配置也看不出问题。
 */
function normalizeOperationButtons(stored: any): RuntimeOperationButton[] {
  if (!Array.isArray(stored) || stored.length === 0) {
    return DEFAULT_BUTTON_KEYS.map(key => ({ key, label: MOBILE_BUTTON_LABELS[key] }))
  }
  const result: RuntimeOperationButton[] = []
  const seen = new Set<string>()
  for (const item of stored) {
    const key = typeof item === 'string' ? item : item?.key
    // 认不出的 key 跳过：移动端没有对应的交互，留下来也渲染不出东西
    if (typeof key !== 'string' || !(key in MOBILE_BUTTON_LABELS) || seen.has(key)) {
      continue
    }
    if (typeof item !== 'string' && item?.show === false) {
      continue
    }
    seen.add(key)
    result.push({
      key,
      // 文案被清空时回落到出厂文案，而不是渲染一个没有字的按钮
      label: typeof item === 'object' && item?.label ? String(item.label) : MOBILE_BUTTON_LABELS[key],
    })
  }
  return result
}

/**
 * 工具栏按钮（新增）
 *
 * 不受操作列开关影响 —— 与 web 一致：`operationColumn.show` 管的是表格行末那一列，
 * 而「新增」在工具栏上，关掉操作列不该把新增入口一起带走。
 */
export function toolbarButton(
  operation: RuntimeOperationColumn,
  key: string,
): RuntimeOperationButton | undefined {
  return operation.buttons.find(button => button.key === key)
}

/** 行内按钮（编辑 / 删除）：操作列整个关掉时一个都不显示 */
export function rowButton(
  operation: RuntimeOperationColumn,
  key: string,
): RuntimeOperationButton | undefined {
  return operation.show ? toolbarButton(operation, key) : undefined
}

/** 解析左侧树配置。没启用、没选字段、字典源没选字典，都当没配（与 web `isLeftTreeValid` 同一道闸） */
function parseLeftTree(stored: any): RuntimeLeftTree | undefined {
  if (!stored || stored.enabled !== true || !stored.field) {
    return undefined
  }
  const dataSource = stored.dataSource === 'FIELD' ? 'FIELD' : 'DICT'
  if (dataSource === 'DICT' && !stored.dictType) {
    return undefined
  }
  return {
    dataSource,
    dictType: dataSource === 'DICT' ? String(stored.dictType) : undefined,
    field: String(stored.field),
    title: stored.title ? String(stored.title) : '',
  }
}

/**
 * 解析标签页筛选配置
 *
 * 只留标签与值都填了的项：缺一个的标签点下去要么筛不出东西（值为空 → EQ ''），
 * 要么显示成一个空白标签，两种都像是配错了却查不出原因。
 */
function parseTabConfig(stored: any): RuntimeTabConfig | undefined {
  if (!stored || stored.enabled !== true || !stored.field || !Array.isArray(stored.tabs)) {
    return undefined
  }
  const tabs = stored.tabs
    .filter((tab: any) => tab && tab.label && tab.value !== undefined && tab.value !== null && tab.value !== '')
    .map((tab: any) => ({ label: String(tab.label), value: String(tab.value) }))
  return tabs.length > 0 ? { field: String(stored.field), tabs } : undefined
}

/**
 * 左侧树 → 搜索弹窗里的一个下拉
 *
 * 移动端没有「列表左边挂一棵常驻的树」的位置，折成搜索弹窗里的一个下拉：
 * 一样是按那个字段筛，配置一个字都不丢。层级也不是扔掉就算了 ——
 * 字典源用缩进把树画在一列里（`getDictTreeOptions`），选中父节点时按
 * 「自身 + 全部后代」发 IN 条件（见 buildConditions 的 treeDict 分支），
 * 与 web 端点树节点的结果一致。
 *
 * 「表单字段」数据源的候选项要问服务端（`options` 由调用方异步取来），
 * 取不到时 `columns` 为空，搜索弹窗会退回文本框，至少还能手输一个值查。
 */
export function leftTreeToSearchItem(
  leftTree: RuntimeLeftTree,
  options?: SearchOption[],
): RuntimeSearchItem {
  if (leftTree.dataSource === 'FIELD') {
    return {
      columns: options,
      field: leftTree.field,
      label: leftTree.title || '筛选',
      operator: 'EQ',
      widget: 'SELECT',
    }
  }
  return {
    columns: leftTree.dictType ? getDictTreeOptions(leftTree.dictType) : undefined,
    dictType: leftTree.dictType,
    field: leftTree.field,
    label: leftTree.title || '筛选',
    operator: 'EQ',
    treeDict: true,
    widget: 'SELECT',
  }
}

/** 解析 list_conf。解析失败时降级为空配置而不是让整页崩掉 */
export function parseListConf(listConf?: string): ParsedListConf {
  // ⚠️ 操作列在降级时是「放开」而不是「关掉」：
  // 没配 list_conf（纯表单类型）不等于配了「隐藏操作」，
  // 关掉的后果是移动端连编辑入口都没有，而 web 端一切正常 —— 这种两端不一致最难查
  const fallback: ParsedListConf = {
    columns: [],
    operation: { buttons: normalizeOperationButtons(undefined), label: '操作', show: true },
    pageSize: DEFAULT_PAGE_SIZE,
    searchItems: [],
  }
  if (!listConf) {
    return fallback
  }
  try {
    const conf = JSON.parse(listConf)
    if (!conf || typeof conf !== 'object') {
      return fallback
    }
    const columns = Array.isArray(conf.columns) ? conf.columns : []
    const storedOperation = conf.operationColumn || {}
    const defaultSort = conf.defaultSort || {}
    return {
      columns: columns
        .filter((column: any) => column && column.field)
        .map((column: any) => ({
          align: column.align,
          field: String(column.field),
          formatter: column.formatter,
          label: column.label || String(column.field),
          width: column.width,
        })),
      leftTree: parseLeftTree(conf.leftTree),
      operation: {
        buttons: normalizeOperationButtons(storedOperation.buttons),
        label: storedOperation.label || '操作',
        show: storedOperation.show !== false,
      },
      pageSize: Number(conf.pagination?.pageSize) > 0
        ? Number(conf.pagination.pageSize)
        : DEFAULT_PAGE_SIZE,
      searchItems: (Array.isArray(conf.searchItems) ? conf.searchItems : [])
        .filter((item: any) => item && item.field)
        .map((item: any) => ({
          dictType: item.dictType || undefined,
          field: String(item.field),
          label: item.label || String(item.field),
          operator: item.operator || defaultOperatorOf(item.widget),
          widget: normalizeWidget(item.widget),
        })),
      sortField: defaultSort.field || undefined,
      sortOrder: defaultSort.order || undefined,
      tabs: parseTabConfig(conf.tabConfig),
    }
  } catch (error) {
    console.warn('[form-design] list_conf 解析失败，降级为空列表配置', error)
    return fallback
  }
}

/** 认不出的 widget 一律回落文本框 —— 文本框对任何列都能查出点东西 */
function normalizeWidget(widget?: string): SearchWidgetType {
  const known: SearchWidgetType[] = ['DATE', 'DATE_RANGE', 'NUMBER', 'NUMBER_RANGE', 'SELECT', 'SWITCH', 'TEXT']
  return known.includes(widget as SearchWidgetType) ? (widget as SearchWidgetType) : 'TEXT'
}

/** 每种控件的默认操作符，取 web `coerceOperator` 的清单首项 */
function defaultOperatorOf(widget?: string): string {
  switch (widget) {
    case 'DATE':
      return 'EQ'
    case 'DATE_RANGE':
    case 'NUMBER_RANGE':
      return 'BETWEEN'
    case 'NUMBER':
      return 'EQ'
    case 'SELECT':
      return 'EQ'
    case 'SWITCH':
      return 'EQ'
    default:
      return 'LIKE'
  }
}

/** 不需要填值的操作符 */
export function isValuelessOperator(operator?: string): boolean {
  return operator === 'IS_NULL' || operator === 'IS_NOT_NULL'
}

/** 区间型控件：值是一个二元数组 */
export function isRangeWidget(widget?: SearchWidgetType): boolean {
  return widget === 'DATE_RANGE' || widget === 'NUMBER_RANGE'
}

/** 查询项的当前值。区间型是二元数组，其余是标量 */
export type SearchValues = Record<string, any>

function isBlankSearchValue(value: any): boolean {
  if (value === undefined || value === null || value === '') {
    return true
  }
  return Array.isArray(value) && value.length === 0
}

/**
 * 把查询框的值转成结构化查询条件
 *
 * 日期一律转成 `YYYY-MM-DD` 字符串再送出去 —— web 端 el-date-picker 配的就是这个
 * value-format，后端 BETWEEN 两端必须收到同一种形态，否则同一份配置在两端查出不同的结果。
 */
export function buildConditions(items: RuntimeSearchItem[], values: SearchValues): FormRuntimeCondition[] {
  const conditions: FormRuntimeCondition[] = []
  items.forEach((item) => {
    if (isValuelessOperator(item.operator)) {
      conditions.push({ field: item.field, operator: item.operator })
      return
    }
    const value = values[item.field]

    if (item.widget === 'DATE_RANGE') {
      if (!Array.isArray(value) || value.length !== 2) {
        return
      }
      const start = formatDate(value[0], 'YYYY-MM-DD')
      const end = formatDate(value[1], 'YYYY-MM-DD')
      if (!start && !end) {
        return
      }
      conditions.push({ field: item.field, operator: 'BETWEEN', value: start, value2: end })
      return
    }

    if (item.widget === 'DATE') {
      if (isBlankSearchValue(value)) {
        return
      }
      conditions.push({
        field: item.field,
        operator: item.operator || 'EQ',
        value: formatDate(value, 'YYYY-MM-DD'),
      })
      return
    }

    if (item.operator === 'BETWEEN') {
      if (!Array.isArray(value) || (isBlankSearchValue(value[0]) && isBlankSearchValue(value[1]))) {
        return
      }
      conditions.push({
        field: item.field,
        operator: 'BETWEEN',
        value: coerceSearchValue(item, value[0]),
        value2: coerceSearchValue(item, value[1]),
      })
      return
    }

    if (isBlankSearchValue(value)) {
      return
    }

    // 树形字典（左侧树的字典数据源）：选中父节点时要连整棵子树一起匹配，与 web 端同一口径。
    // 只按父节点自身的值筛，挂在子节点上的数据一条都不会出现 ——
    // 「点了华东，结果一个人都没有」，而华东下面明明有三个省。
    if (item.treeDict && item.dictType) {
      const subtree = collectDictSubtreeValues(item.dictType, value)
      conditions.push(
        subtree.length === 1
          ? { field: item.field, operator: 'EQ', value: subtree[0] }
          : { field: item.field, operator: 'IN', value: subtree },
      )
      return
    }

    conditions.push({
      field: item.field,
      operator: item.operator || 'LIKE',
      value: coerceSearchValue(item, value),
    })
  })
  return conditions
}

/**
 * 数字类查询项转成 number 再送出去
 *
 * 移动端输入框拿到的是字符串，web 端 el-input-number 给的是数字。
 * 同一份配置两端必须送出同一种类型，否则数值列上的比较由数据库怎么隐式转换说了算。
 */
function coerceSearchValue(item: RuntimeSearchItem, value: any): any {
  if (item.widget !== 'NUMBER' && item.widget !== 'NUMBER_RANGE') {
    return value
  }
  if (isBlankSearchValue(value)) {
    return undefined
  }
  const num = Number(value)
  return Number.isNaN(num) ? value : num
}

/** 值的展示文案：字典查字典，运行时取来的候选项查候选项，都没有就用原值 */
function describeSearchValue(item: RuntimeSearchItem | undefined, value: any): string {
  if (item?.dictType) {
    return getDictLabel(item.dictType, value) || String(value)
  }
  const matched = item?.columns?.find(option => option.value === value)
  return matched ? matched.label : String(value)
}

/** 把查询条件反着说成人话，用于搜索框的 placeholder 与已选提示 */
export function describeConditions(items: RuntimeSearchItem[], values: SearchValues): string[] {
  return buildConditions(items, values).map((condition) => {
    const item = items.find(candidate => candidate.field === condition.field)
    const label = item?.label || condition.field
    if (!condition.operator || isValuelessOperator(condition.operator)) {
      return `${label}:${condition.operator === 'IS_NOT_NULL' ? '非空' : '为空'}`
    }
    // 树形字典展开成 IN 之后，条件里是一整棵子树的值，而用户只点了一个节点 ——
    // 提示要说他点的那个，不是把子树念一遍
    if (item?.treeDict) {
      return `${label}:${describeSearchValue(item, values[item.field])}`
    }
    if (condition.value2 !== undefined && condition.value2 !== null && condition.value2 !== '') {
      return `${label}:${condition.value}~${condition.value2}`
    }
    if (Array.isArray(condition.value)) {
      return `${label}:${condition.value.map(value => describeSearchValue(item, value)).join('/')}`
    }
    return `${label}:${describeSearchValue(item, condition.value)}`
  })
}
