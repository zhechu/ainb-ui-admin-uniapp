<template>
  <view class="yd-page-container yd-page-container-paging">
    <!-- 顶部导航栏 -->
    <wd-navbar
      title="参数配置管理"
      left-arrow placeholder safe-area-inset-top fixed
      @click-left="handleBack"
    />

    <!-- 搜索组件 -->
    <SearchForm @search="handleQuery" @reset="handleReset" />

    <!-- 参数配置列表 -->
    <z-paging
      ref="pagingRef"
      v-model="list"
      :fixed="false"
      class="min-h-0 flex-1"
      :default-page-size="10"
      :refresher-enabled="true"
      :inside-more="true"
      :loading-more-default-as-loading="true"
      empty-view-text="暂无参数配置数据"
      @query="queryList"
    >
      <view
        v-for="item in list"
        :key="item.id"
        class="yd-card"
        @click="handleDetail(item)"
      >
        <view class="yd-card-title">
          <text class="min-w-0 flex-1 truncate">{{ item.name }}</text>
          <dict-tag class="ml-16rpx shrink-0" :type="DICT_TYPE.INFRA_CONFIG_TYPE" :value="item.type" />
        </view>
        <view class="yd-cell-row">
          <text class="yd-cell-row__label">参数分类</text>
          <text class="yd-cell-row__value truncate">{{ item.category }}</text>
        </view>
        <view class="yd-cell-row">
          <text class="yd-cell-row__label">参数键名</text>
          <text class="yd-cell-row__value truncate">{{ item.key }}</text>
        </view>
        <view class="yd-cell-row">
          <text class="yd-cell-row__label">参数键值</text>
          <text class="yd-cell-row__value truncate">{{ item.value }}</text>
        </view>
        <view class="yd-cell-row">
          <text class="yd-cell-row__label">是否可见</text>
          <view class="yd-cell-row__value">
            <dict-tag :type="DICT_TYPE.INFRA_BOOLEAN_STRING" :value="item.visible" />
          </view>
        </view>
        <view class="yd-cell-row">
          <text class="yd-cell-row__label">创建时间</text>
          <text class="yd-cell-row__value">{{ formatDateTime(item.createTime) }}</text>
        </view>
      </view>
    </z-paging>

    <!-- 新增按钮 -->
    <wd-fab
      v-if="hasAccessByCodes(['infra:config:create'])"
      position="right-bottom"
      type="primary"
      :expandable="false"
      @click="handleAdd"
    />
  </view>
</template>

<script lang="ts" setup>
import type { Config } from '@/api/infra/config'
import { onMounted, onUnmounted, ref } from 'vue'
import { getConfigPage } from '@/api/infra/config'
import { useAccess } from '@/hooks/useAccess'
import { navigateBackPlus } from '@/utils'
import { DICT_TYPE } from '@/utils/constants'
import { formatDateTime } from '@/utils/date'
import SearchForm from './components/search-form.vue'

definePage({
  style: {
    navigationBarTitleText: '',
    navigationStyle: 'custom',
  },
})

const { hasAccessByCodes } = useAccess()
const list = ref<Config[]>([]) // 列表数据
const pagingRef = ref<any>() // 分页组件引用
const queryParams = ref<Record<string, any>>({}) // 查询参数

/** 返回上一页 */
function handleBack() {
  navigateBackPlus()
}

/** 查询参数配置列表 */
async function queryList(pageNo: number, pageSize: number) {
  try {
    const params = {
      ...queryParams.value,
      pageNo,
      pageSize,
    }
    const data = await getConfigPage(params)
    pagingRef.value?.completeByTotal(data.list, data.total)
  } catch {
    pagingRef.value?.complete(false)
  }
}

/** 搜索按钮操作 */
function handleQuery(data?: Record<string, any>) {
  queryParams.value = { ...data }
  reload()
}

/** 重置按钮操作 */
function handleReset() {
  handleQuery()
}

/** 重新加载 */
function reload() {
  pagingRef.value?.reload()
}

/** 新增参数配置 */
function handleAdd() {
  uni.navigateTo({
    url: '/pages-infra/config/form/index',
  })
}

/** 查看详情 */
function handleDetail(item: Config) {
  uni.navigateTo({
    url: `/pages-infra/config/detail/index?id=${item.id}`,
  })
}

/** 初始化 */
onMounted(() => {
  uni.$on('infra:config:reload', reload)
})

/** 卸载 */
onUnmounted(() => {
  uni.$off('infra:config:reload', reload)
})
</script>
