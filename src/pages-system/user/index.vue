<template>
  <view class="yd-page-container yd-page-container-paging">
    <!-- 顶部导航栏 -->
    <wd-navbar
      title="用户管理"
      left-arrow placeholder safe-area-inset-top fixed
      @click-left="handleBack"
    />

    <!-- 搜索组件 -->
    <SearchForm @search="handleQuery" @reset="handleReset" />

    <!-- 用户列表 -->
    <z-paging
      ref="pagingRef"
      v-model="list"
      :fixed="false"
      class="min-h-0 flex-1"
      :default-page-size="10"
      :refresher-enabled="true"
      :inside-more="true"
      :loading-more-default-as-loading="true"
      empty-view-text="暂无用户数据"
      @query="queryList"
    >
      <view
        v-for="item in list"
        :key="item.id"
        class="yd-card"
        @click="handleDetail(item)"
      >
        <view class="flex items-center gap-16rpx">
          <wd-img
            v-if="item.avatar"
            :src="item.avatar"
            :width="40"
            :height="40"
            mode="aspectFill"
            round
          />
          <view
            v-else
            class="h-80rpx w-80rpx flex shrink-0 items-center justify-center rounded-full bg-[var(--brand-accent)] text-32rpx text-primary font-500"
          >
            {{ (item.nickname || item.username)?.charAt(0) }}
          </view>
          <view class="min-w-0 flex-1">
            <view class="truncate text-30rpx text-[var(--brand-text-strong)] font-semibold leading-tight">
              {{ item.nickname || item.username }}
            </view>
            <view class="mt-6rpx truncate text-24rpx text-[var(--brand-text-muted)]">
              {{ item.deptName || '未分配部门' }}
            </view>
          </view>
          <dict-tag class="shrink-0" :type="DICT_TYPE.COMMON_STATUS" :value="item.status" />
        </view>
        <view v-if="item.loginDate" class="mt-16rpx text-24rpx text-[var(--brand-text-muted)]">
          登录时间：{{ formatDate(item.loginDate) }}
        </view>
      </view>
    </z-paging>

    <!-- 新增按钮 -->
    <wd-fab
      v-if="hasAccessByCodes(['system:user:create'])"
      position="right-bottom"
      type="primary"
      :expandable="false"
      @click="handleAdd"
    />
  </view>
</template>

<script lang="ts" setup>
import type { User } from '@/api/system/user'
import { onUnload } from '@dcloudio/uni-app'
import { onMounted, ref } from 'vue'
import { getUserPage } from '@/api/system/user'
import { useAccess } from '@/hooks/useAccess'
import { navigateBackPlus } from '@/utils'
import { DICT_TYPE } from '@/utils/constants'
import { formatDate } from '@/utils/date'
import SearchForm from './components/search-form.vue'

definePage({
  style: {
    navigationBarTitleText: '',
    navigationStyle: 'custom',
  },
})

const { hasAccessByCodes } = useAccess()
const list = ref<User[]>([]) // 列表数据
const queryParams = ref<Record<string, any>>({}) // 查询参数
const pagingRef = ref<any>() // 分页组件引用

/** 返回上一页 */
function handleBack() {
  navigateBackPlus()
}

/** 查询用户列表 */
async function queryList(pageNo: number, pageSize: number) {
  try {
    const params = {
      ...queryParams.value,
      pageNo,
      pageSize,
    }
    const data = await getUserPage(params)
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

/** 新增用户 */
function handleAdd() {
  uni.navigateTo({
    url: '/pages-system/user/form/index',
  })
}

/** 查看详情 */
function handleDetail(item: User) {
  uni.navigateTo({
    url: `/pages-system/user/detail/index?id=${item.id}`,
  })
}

/** 初始化 */
onMounted(() => {
  uni.$on('system:user:reload', reload)
})

/** 卸载 */
onUnload(() => {
  uni.$off('system:user:reload', reload)
})
</script>
