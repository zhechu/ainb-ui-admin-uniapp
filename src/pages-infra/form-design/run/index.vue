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
      标签页筛选：一个标签等价于一个常驻的等值条件，比每次点开搜索弹窗选一遍快。
      web 端是列表上方的一排标签，移动端同一形态，多了能横滑。「全部」由运行时加在最前面。
    -->
    <wd-tabs v-if="tabItems.length > 1" v-model="activeTabIndex" shrink>
      <wd-tab v-for="tab in tabItems" :key="tab.value" :title="tab.label" />
    </wd-tabs>

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
        :edit-label="editLabel"
        :delete-label="deleteLabel"
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
import type { FormRuntimeCondition, FormRuntimeConfig } from '@/api/infra/form-design'
import type { RuntimeColumn, RuntimeSearchItem, SearchOption, SearchValues } from './components/list-conf'
import { useDialog } from '@wot-ui/ui/components/wd-dialog'
import { useToast } from '@wot-ui/ui/components/wd-toast'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  deleteFormRuntimeData,
  getFormRuntimeConfig,
  getFormRuntimeDataPage,
  getFormRuntimeDistinctValues,
} from '@/api/infra/form-design'
import { useAccess } from '@/hooks/useAccess'
import { decodeFields } from '@/pages-bpm/utils/form-create'
import { navigateBackPlus } from '@/utils'
import DataCard from './components/data-card.vue'
import {
  buildConditions,
  leftTreeToSearchItem,
  parseListConf,
  rowButton,
  toolbarButton,
} from './components/list-conf'
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
const pageSize = computed(() => listConf.value.pageSize)
const pkField = computed(() => config.value?.pkField || 'id')
/** 列表页的刷新事件名。新增/编辑/详情页保存后发出，避免回到列表看到的还是旧数据 */
const reloadEvent = computed(() => `infra:form-design-run:${formCode.value}:reload`)

/** 左侧树「表单字段」数据源的候选项，进页面时取一次 */
const leftTreeOptions = ref<SearchOption[]>([])

/**
 * 搜索弹窗里的查询项 = 配置的查询项 + 左侧树
 *
 * 左侧树在 web 端是列表左边一棵常驻的树，移动端没有那个位置 ——
 * 折成搜索弹窗里的一个下拉，一样是按那个字段筛，配置一个字都不丢。
 * 同一字段已经配了查询项时不再追加：两个长得一样的下拉摆在一起，
 * 用户只会以为其中一个坏了。
 */
const searchItems = computed<RuntimeSearchItem[]>(() => {
  const configured = listConf.value.searchItems
  const tree = listConf.value.leftTree
  if (!tree || configured.some(item => item.field === tree.field)) {
    return configured
  }
  return [...configured, leftTreeToSearchItem(tree, leftTreeOptions.value)]
})

/** 当前选中的标签下标，0 恒为「全部」 */
const activeTabIndex = ref(0)

/** 标签清单。「全部」由运行时加在最前面，配置里不存这一项（与 web 一致） */
const tabItems = computed(() => {
  const conf = listConf.value.tabs
  return conf ? [{ label: '全部', value: '' }, ...conf.tabs] : []
})

/** 查询条件 = 搜索弹窗里填的 + 当前标签，两者是 AND 关系（与 web buildConditions 一致） */
const conditions = computed<FormRuntimeCondition[]>(() => {
  const built = buildConditions(searchItems.value, searchValues.value)
  const conf = listConf.value.tabs
  const value = tabItems.value[activeTabIndex.value]?.value
  if (conf && value) {
    built.push({ field: conf.field, operator: 'EQ', value })
  }
  return built
})

/** 切标签就是换查询条件，立刻重查第一页 */
watch(activeTabIndex, () => reload())

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

/**
 * 新增走工具栏口径，编辑/删除走行内口径
 *
 * 两者的闸门不一样，与 web 端一致：`operationColumn.show` 关的是表格行末那一列，
 * 而「新增」在工具栏上，关掉操作列不该把新增入口一起带走。
 */
const canCreate = computed(
  () => hasRunAccess('create') && !!toolbarButton(listConf.value.operation, 'create'),
)
const canUpdate = computed(
  () => hasRunAccess('update') && !!rowButton(listConf.value.operation, 'edit'),
)
const canDelete = computed(
  () => hasRunAccess('delete') && !!rowButton(listConf.value.operation, 'delete'),
)
/** 按钮文案用设计器配的（「删除」在有些业务里叫「作废」），没配就用出厂文案 */
const editLabel = computed(() => rowButton(listConf.value.operation, 'edit')?.label || '编辑')
const deleteLabel = computed(() => rowButton(listConf.value.operation, 'delete')?.label || '删除')

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
  // 候选项与首屏数据互不相干，不必互相等：先让列表出来，下拉的选项随后填上
  void loadLeftTreeOptions()
  pagingRef.value?.reload()
}

/**
 * 取左侧树「表单字段」数据源的候选项
 *
 * 不能从当前页数据里提取 —— 第二页才出现的值会缺，用户看到的下拉是不全的，
 * 而 web 端那棵树是全的，同一个配置两端筛出来的结果就不一样了。
 * 失败时留空：搜索弹窗那一格会退回文本框，还能手输值查，不至于整页打不开。
 */
async function loadLeftTreeOptions() {
  const tree = listConf.value.leftTree
  if (!tree || tree.dataSource !== 'FIELD') {
    leftTreeOptions.value = []
    return
  }
  try {
    const values = await getFormRuntimeDistinctValues(formCode.value, tree.field)
    // 与 web 端 loadTreeNodes 同一口径：空值不进候选，值一律转字符串再送条件
    leftTreeOptions.value = (values || [])
      .filter(value => value !== null && value !== undefined && value !== '')
      .map(value => ({ label: String(value), value: String(value) }))
  } catch (error) {
    console.warn('[form-design] 左侧树候选项取数失败', tree.field, error)
    leftTreeOptions.value = []
  }
}

/** 查询列表数据 */
async function queryList(pageNo: number, size: number) {
  if (!formCode.value || !config.value) {
    pagingRef.value?.complete(false)
    return
  }
  try {
    const data = await getFormRuntimeDataPage(formCode.value, {
      conditions: conditions.value,
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
  // 标签也归位到「全部」，否则点了重置却发现列表还被标签筛着（与 web resetQuery 一致）。
  // 归位会触发 watch 里的 reload，这里不再重复查一次
  if (activeTabIndex.value !== 0) {
    activeTabIndex.value = 0
    return
  }
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
