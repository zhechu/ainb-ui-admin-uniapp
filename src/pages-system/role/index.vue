<template>
  <view class="yd-page-container yd-page-container-paging">
    <!-- 顶部导航栏 -->
    <wd-navbar
      title="角色管理"
      left-arrow placeholder safe-area-inset-top fixed
      @click-left="handleBack"
    />

    <!-- 搜索组件 -->
    <SearchForm @search="handleQuery" @reset="handleReset" />

    <!-- 角色列表 -->
    <z-paging
      ref="pagingRef"
      v-model="list"
      :fixed="false"
      class="min-h-0 flex-1"
      :default-page-size="10"
      :refresher-enabled="true"
      :inside-more="true"
      :loading-more-default-as-loading="true"
      empty-view-text="暂无角色数据"
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
          <dict-tag class="ml-16rpx shrink-0" :type="DICT_TYPE.COMMON_STATUS" :value="item.status" />
        </view>
        <view class="yd-cell-row">
          <text class="yd-cell-row__label">角色标识</text>
          <text class="yd-cell-row__value truncate">{{ item.code }}</text>
        </view>
        <view v-if="item.remark" class="yd-cell-row">
          <text class="yd-cell-row__label">备注</text>
          <text class="yd-cell-row__value line-clamp-1">{{ item.remark }}</text>
        </view>
      </view>
    </z-paging>

    <!-- 新增按钮 -->
    <wd-fab
      v-if="hasAccessByCodes(['system:role:create'])"
      position="right-bottom"
      type="primary"
      :expandable="false"
      @click="handleAdd"
    />
  </view>
</template>

<script lang="ts" setup>
import type { Role } from '@/api/system/role'
import { onUnload } from '@dcloudio/uni-app'
import { onMounted, ref } from 'vue'
import { getRolePage } from '@/api/system/role'
import { useAccess } from '@/hooks/useAccess'
import { navigateBackPlus } from '@/utils'
import { DICT_TYPE } from '@/utils/constants'
import SearchForm from './components/search-form.vue'

definePage({
  style: {
    navigationBarTitleText: '',
    navigationStyle: 'custom',
  },
})

const { hasAccessByCodes } = useAccess()
const list = ref<Role[]>([]) // 列表数据
const queryParams = ref<Record<string, any>>({}) // 查询参数
const pagingRef = ref<any>() // 分页组件引用

/** 返回上一页 */
function handleBack() {
  navigateBackPlus()
}

/** 查询角色列表 */
async function queryList(pageNo: number, pageSize: number) {
  try {
    const params = {
      ...queryParams.value,
      pageNo,
      pageSize,
    }
    if ((params as any).status === -1) {
      delete (params as any).status
    }
    const data = await getRolePage(params)
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

/** 新增角色 */
function handleAdd() {
  uni.navigateTo({
    url: '/pages-system/role/form/index',
  })
}

/** 查看详情 */
function handleDetail(item: Role) {
  uni.navigateTo({
    url: `/pages-system/role/detail/index?id=${item.id}`,
  })
}

/** 初始化 */
onMounted(() => {
  uni.$on('system:role:reload', reload)
})

/** 卸载 */
onUnload(() => {
  uni.$off('system:role:reload', reload)
})
</script>
