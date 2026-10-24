<template>
  <view class="yd-page-container yd-page-container-paging">
    <!-- 顶部导航栏。标题取表单名，发布到 App 的入口点进来才知道自己在看哪张表 -->
    <wd-navbar
      :title="formName"
      left-arrow placeholder safe-area-inset-top fixed
      @click-left="handleBack"
    />

    <!-- 搜索入口：没配查询项就不显示，空搜索框点开会是一张白弹窗 -->
    <SearchPopup
      v-if="searchItems.length > 0"
      :items="searchItems"
      @search="handleSearch"
      @reset="handleReset"
    />

    <!--
      数据列表。:auto="false" 是必需的 ——
      列配置来自 getFormRuntimeConfig，自动查询会在配置到位前先打一次 /page，
      那一次既没有排序字段也没有查询条件，翻出来的第一页和后面几页规则不一致。
    -->
    <z-paging
      ref="pagingRef"
      v-model="list"
      :auto="false"
      :fixed="false"
      class="min-h-0 flex-1"
      :default-page-size="pageSize"
      :refresher-enabled="true"
      :inside-more="true"
      :loading-more-default-as-loading="true"
      empty-view-text="暂无数据"
      @query="queryList"
    >
      <DataCard
        v-for="(row, index) in list"
        :key="rowKey(row, index)"
        :columns="columns"
        :row="row"
        :can-update="canUpdate"
        :can-delete="canDelete"
        @detail="handleDetail(row)"
        @edit="handleEdit(row)"
        @delete="handleDelete(row)"
      />
    </z-paging>

    <!-- 新增按钮 -->
    <wd-fab
      v-if="canCreate"
      position="right-bottom"
      type="primary"
      :expandable="false"
      @click="handleAdd"
    />
  </view>
</template>

<script lang="ts" setup>
import type { FormRuntimeConfig } from '@/api/infra/form-design'
import type { RuntimeColumn, RuntimeSearchItem, SearchValues } from './components/list-conf'
import { useDialog } from '@wot-ui/ui/components/wd-dialog'
import { useToast } from '@wot-ui/ui/components/wd-toast'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  deleteFormRuntimeData,
  getFormRuntimeConfig,
  getFormRuntimeDataPage,
} from '@/api/infra/form-design'
import { useAccess } from '@/hooks/useAccess'
import { decodeFields } from '@/pages-bpm/utils/form-create'
import { navigateBackPlus } from '@/utils'
import DataCard from './components/data-card.vue'
import { buildConditions, parseListConf } from './components/list-conf'
import { deriveColumns } from './components/rule-adapter'
import SearchPopup from './components/search-popup.vue'

/** code 来自导航节点的 query（`code={表单编码}`），uni-app 会把 query 注入同名 prop */
const props = defineProps<{
  code?: string
}>()

definePage({
  style: {
    navigationBarTitleText: '',
    navigationStyle: 'custom',
  },
})

const { hasAccessByCodes } = useAccess()
const toast = useToast()
const dialog = useDialog()

const formCode = computed(() => props.code || '')
const config = ref<FormRuntimeConfig>() // 运行时渲染配置
const list = ref<Record<string, any>[]>([]) // 列表数据，key 是字段名
const pagingRef = ref<any>() // 分页组件引用
const searchValues = ref<SearchValues>({}) // 当前生效的查询值

const listConf = computed(() => parseListConf(config.value?.listConf))
const formName = computed(() => config.value?.name || '在线表单')
const searchItems = computed<RuntimeSearchItem[]>(() => listConf.value.searchItems)
const pageSize = computed(() => listConf.value.pageSize)
const pkField = computed(() => config.value?.pkField || 'id')
/** 列表页的刷新事件名。新增/编辑/详情页保存后发出，避免回到列表看到的还是旧数据 */
const reloadEvent = computed(() => `infra:form-design-run:${formCode.value}:reload`)

/**
 * 卡片显示哪几列
 *
 * 配了列表列就用配的；没配（纯表单类型没有 list_conf）就从表单规则里兜底推一份 ——
 * 一张没有标题的卡片和「加载失败」在用户眼里是同一件事。
 */
const columns = computed<RuntimeColumn[]>(() => {
  const configured = listConf.value.columns
  if (configured.length > 0) {
    return configured
  }
  return deriveColumns(decodeFields(config.value?.formFields))
})

/** 权限串由发布时登记的菜单按钮生成，服务端每个端点各查各的，这里只管显隐 */
function hasRunAccess(action: string): boolean {
  return hasAccessByCodes([`infra:form-design-run:${formCode.value}:${action}`])
}

/** 列表配置里有没有放行这个行内按钮 */
function operationAllows(button: string): boolean {
  const operation = listConf.value.operation
  return operation.show && operation.buttons.includes(button)
}

const canCreate = computed(() => hasRunAccess('create'))
const canUpdate = computed(() => hasRunAccess('update') && operationAllows('edit'))
const canDelete = computed(() => hasRunAccess('delete') && operationAllows('delete'))

/** 行主键。业务主键可能是单号这类字符串，取不到时用下标兜底保证 key 唯一 */
function rowKey(row: Record<string, any>, index: number) {
  return rowId(row) ?? `row-${index}`
}

/** 取一行的主键值，取不到返回 undefined —— 拿它去跳转只会打开一个查不到数据的详情页 */
function rowId(row: Record<string, any>) {
  const pk = row?.[pkField.value]
  return pk === undefined || pk === null || pk === '' ? undefined : String(pk)
}

/** 返回上一页 */
function handleBack() {
  navigateBackPlus()
}

/** 拉取渲染配置。配置到位后才让分页组件发起第一次查询 */
async function loadConfig() {
  if (!formCode.value) {
    toast.show('缺少表单标识')
    return
  }
  config.value = await getFormRuntimeConfig(formCode.value)
  pagingRef.value?.reload()
}

/** 查询列表数据 */
async function queryList(pageNo: number, size: number) {
  if (!formCode.value || !config.value) {
    pagingRef.value?.complete(false)
    return
  }
  try {
    const data = await getFormRuntimeDataPage(formCode.value, {
      conditions: buildConditions(searchItems.value, searchValues.value),
      pageNo,
      pageSize: size,
      sortField: listConf.value.sortField,
      sortOrder: listConf.value.sortOrder,
    })
    pagingRef.value?.completeByTotal(data.list || [], data.total || 0)
  } catch {
    pagingRef.value?.complete(false)
  }
}

/** 重新加载 */
function reload() {
  pagingRef.value?.reload()
}

/** 搜索 */
function handleSearch(values: SearchValues) {
  searchValues.value = values
  reload()
}

/** 重置搜索 */
function handleReset() {
  searchValues.value = {}
  reload()
}

/** 新增 */
function handleAdd() {
  uni.navigateTo({ url: `/pages-infra/form-design/run/form?code=${formCode.value}` })
}

/** 编辑 */
function handleEdit(row: Record<string, any>) {
  const id = rowId(row)
  if (!id) {
    toast.show('这条数据缺少主键，无法编辑')
    return
  }
  uni.navigateTo({ url: `/pages-infra/form-design/run/form?code=${formCode.value}&id=${id}` })
}

/**
 * 查看详情
 *
 * 不看 operationAllows('detail')：web 端那个开关控制的是表格行末的按钮，
 * 而移动端整张卡片就是行的化身，点卡片进详情是唯一的查看途径 ——
 * 跟着一起关掉的话，配了「隐藏详情按钮」的表单在 App 上就再也打不开了。
 */
function handleDetail(row: Record<string, any>) {
  const id = rowId(row)
  if (!id) {
    toast.show('这条数据缺少主键，无法查看详情')
    return
  }
  uni.navigateTo({ url: `/pages-infra/form-design/run/detail?code=${formCode.value}&id=${id}` })
}

/** 删除 */
async function handleDelete(row: Record<string, any>) {
  const id = rowId(row)
  if (!id) {
    toast.show('这条数据缺少主键，无法删除')
    return
  }
  try {
    await dialog.confirm({ title: '提示', msg: '确定要删除这条数据吗？' })
  } catch {
    return
  }
  await deleteFormRuntimeData(formCode.value, id)
  toast.success('删除成功')
  reload()
}

/** 初始化 */
onMounted(() => {
  uni.$on(reloadEvent.value, reload)
  loadConfig()
})

onUnmounted(() => {
  uni.$off(reloadEvent.value, reload)
})
</script>
