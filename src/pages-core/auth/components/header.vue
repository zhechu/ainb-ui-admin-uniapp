<template>
  <view class="header flex flex-col items-center pb-40rpx pt-120rpx">
    <wd-img class="mb-24rpx" src="/static/logo.png" width="160rpx" height="160rpx" mode="aspectFit" round />
    <view class="text-44rpx text-[var(--brand-text-strong)] font-bold leading-tight">
      {{ title }}
    </view>
  </view>
</template>

<script lang="ts" setup>
const title = import.meta.env.VITE_APP_TITLE // 应用标题
</script>
