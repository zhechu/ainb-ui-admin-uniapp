import type { FormRuntimeCondition } from '@/api/infra/form-design'
import { getDictLabel } from '@/hooks/useDict'
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

/** 查询项配置 */
export interface RuntimeSearchItem {
  field: string
  label: string
  widget: SearchWidgetType
  operator?: string
  dictType?: string
}

/** 操作列配置 */
export interface RuntimeOperationColumn {
  show: boolean
  label: string
  /** 行内按钮的 key，如 edit / detail / delete */
  buttons: string[]
}

/** 解析后的列表配置 */
export interface ParsedListConf {
  columns: RuntimeColumn[]
  searchItems: RuntimeSearchItem[]
  operation: RuntimeOperationColumn
  pageSize: number
  sortField?: string
  sortOrder?: string
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

/** 卡片上最多显示几行键值 */
export const CARD_ROW_LIMIT = 3

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
 */
export function buildCardView(row: Record<string, any>, columns: RuntimeColumn[]): CardView {
  const [first, ...rest] = columns
  const titleColumn = first || { field: '', label: '' }
  const badgeColumn = rest.find(column => column.formatter?.type === 'TAG' || column.formatter?.type === 'DICT')
  const rowColumns = rest.filter(column => column !== badgeColumn).slice(0, CARD_ROW_LIMIT)
  return {
    badge: badgeColumn ? describeCell(row, badgeColumn) : undefined,
    rows: rowColumns.map(column => describeCell(row, column)),
    title: describeCell(row, titleColumn),
  }
}

/** 解析 list_conf。解析失败时降级为空配置而不是让整页崩掉 */
export function parseListConf(listConf?: string): ParsedListConf {
  // ⚠️ 操作列在降级时是「放开」而不是「关掉」：
  // 没配 list_conf（纯表单类型）不等于配了「隐藏操作」，
  // 关掉的后果是移动端连编辑入口都没有，而 web 端一切正常 —— 这种两端不一致最难查
  const fallback: ParsedListConf = {
    columns: [],
    operation: { buttons: ['edit', 'detail', 'delete'], label: '操作', show: true },
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
      operation: {
        buttons: Array.isArray(storedOperation.buttons)
          ? storedOperation.buttons
          : ['edit', 'detail', 'delete'],
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

/** 把查询条件反着说成人话，用于搜索框的 placeholder 与已选提示 */
export function describeConditions(items: RuntimeSearchItem[], values: SearchValues): string[] {
  return buildConditions(items, values).map((condition) => {
    const item = items.find(candidate => candidate.field === condition.field)
    const label = item?.label || condition.field
    if (!condition.operator || isValuelessOperator(condition.operator)) {
      return `${label}:${condition.operator === 'IS_NOT_NULL' ? '非空' : '为空'}`
    }
    if (condition.value2 !== undefined && condition.value2 !== null && condition.value2 !== '') {
      return `${label}:${condition.value}~${condition.value2}`
    }
    if (Array.isArray(condition.value)) {
      return `${label}:${condition.value
        .map(value => getDictLabel(item?.dictType || '', value) || value)
        .join('/')}`
    }
    const text = item?.dictType
      ? getDictLabel(item.dictType, condition.value) || condition.value
      : condition.value
    return `${label}:${text}`
  })
}
