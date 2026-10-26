<script setup lang="ts">
import { openUrl } from '@/utils/url'

/** 跳转到用户协议 */
function handleGoAgreement() {
  uni.navigateTo({ url: '/pages-core/user/settings/agreement/index' })
}

/** 跳转到隐私协议 */
function handleGoPrivacy() {
  uni.navigateTo({ url: '/pages-core/user/settings/privacy/index' })
}

/** 打开工信部备案查询 */
function handleGoBeian() {
  openUrl('https://beian.miit.gov.cn')
}
</script>

<template>
  <view class="flex flex-col items-center">
    <view class="mb-40rpx flex items-center text-26rpx">
      <text class="text-primary" @click="handleGoAgreement">《用户协议》</text>
      <text class="text-gray-500">与</text>
      <text class="text-primary" @click="handleGoPrivacy">《隐私协议》</text>
    </view>
    <text class="mb-10rpx text-24rpx text-gray-400">
      Copyright © 2026 启凌
    </text>
    <text class="text-24rpx text-gray-400">
      MIT License
    </text>
    <text class="mt-10rpx text-24rpx text-gray-400" @click="handleGoBeian">
      粤ICP备2026165134号
    </text>
  </view>
</template>
