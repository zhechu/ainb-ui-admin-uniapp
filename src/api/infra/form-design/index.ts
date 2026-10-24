import type { PageParam, PageResult } from '@/http/types'
import { http } from '@/http/http'

/** 表单运行时渲染配置 */
export interface FormRuntimeConfig {
  code: string
  name: string
  /** 表单类型：1-纯表单 2-表单+列表 */
  formType: number
  version?: number
  /** form-create 的表单配置 JSON */
  formConf?: string
  /** form-create 的字段规则（每项是一段 JSON 字符串） */
  formFields?: string[]
  /** 列表配置 JSON，仅「表单+列表」类型有值 */
  listConf?: string
  /** 主键字段名，编辑/删除时要用 */
  pkField?: string
  /** 乐观锁版本字段名，为空表示未启用 */
  versionField?: string
  changeLogEnabled?: boolean
  customButtons?: string
  detailTabs?: string
  printTemplate?: string
  validateRules?: string
  logicRules?: string
  extensionMode?: number
  formScript?: string
  submitHookTimeoutAction?: number
}

/** 查询条件。operator 缺省时服务端按 LIKE 处理 */
export interface FormRuntimeCondition {
  field: string
  operator?: string
  value?: any
  /** BETWEEN 的第二个值 */
  value2?: any
}

/** 运行时数据分页参数 */
export interface FormRuntimePageParam extends PageParam {
  conditions?: FormRuntimeCondition[]
  sortField?: string
  /** 只允许 ASC / DESC */
  sortOrder?: string
}

/** 运行时接口的统一前缀 */
const RUNTIME_BASE = '/infra/form-design/runtime'

/** 获取表单运行时渲染配置 */
export function getFormRuntimeConfig(code: string) {
  return http.get<FormRuntimeConfig>(`${RUNTIME_BASE}/${code}/config`)
}

/** 分页查询表单数据 */
export function getFormRuntimeDataPage(code: string, data: FormRuntimePageParam) {
  return http.post<PageResult<Record<string, any>>>(`${RUNTIME_BASE}/${code}/page`, data)
}

/** 获取单条表单数据 */
export function getFormRuntimeData(code: string, id: number | string) {
  return http.get<Record<string, any>>(`${RUNTIME_BASE}/${code}/get?id=${id}`)
}

/** 新增表单数据，返回新记录的主键 */
export function createFormRuntimeData(code: string, data: Record<string, any>) {
  return http.post<number | string>(`${RUNTIME_BASE}/${code}/create`, data)
}

/** 更新表单数据 */
export function updateFormRuntimeData(code: string, id: number | string, data: Record<string, any>) {
  return http.put<boolean>(`${RUNTIME_BASE}/${code}/update?id=${id}`, data)
}

/** 删除表单数据 */
export function deleteFormRuntimeData(code: string, id: number | string) {
  return http.delete<boolean>(`${RUNTIME_BASE}/${code}/delete?id=${id}`)
}

/**
 * 取某一列的去重值
 *
 * 左侧树的「表单字段」数据源用它：候选项是这一列的实际取值，字典里没有。
 * 与 web 端 `RuntimeApi.getDistinctValues` 同一个端点，服务端最多返回 500 个。
 */
export function getFormRuntimeDistinctValues(code: string, field: string) {
  return http.get<any[]>(`${RUNTIME_BASE}/${code}/distinct-values?field=${encodeURIComponent(field)}`)
}

/**
 * 按编码调用数据接口取候选项
 *
 * 走 code 而不是 id：该端点只要求登录态，不要求数据接口的管理权限 ——
 * 填单人不可能有那个权限。
 */
export function fetchDataInterfaceOptions(interfaceCode: string, args: Record<string, any> = {}) {
  return http.post<any>(`/infra/data-interface/options?code=${interfaceCode}`, args)
}
