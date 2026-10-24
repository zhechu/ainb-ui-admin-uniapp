<template>
  <view class="yd-card">
    <view class="flex items-center">
      <view class="avatar-wrapper mr-20rpx">
        <wd-img :src="avatarSrc" width="100rpx" height="100rpx" mode="aspectFill" round @error="avatarLoadFailed = true" />
      </view>
      <view class="flex-1">
        <view class="text-32rpx text-[var(--brand-text-strong)] font-semibold leading-tight">
          {{ greeting }}，{{ userInfo.nickname || userInfo.username }}
        </view>
        <view class="mt-8rpx text-26rpx text-[var(--brand-text-muted)]">
          {{ description }}
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia'
import { DEFAULT_AVATAR, useUserStore } from '@/store'

defineOptions({
  name: 'UserHeader',
})

const userStore = useUserStore()
const { userInfo } = storeToRefs(userStore)

// 头像加载失败（如外链失效）时回退默认头像，避免裂图
const avatarLoadFailed = ref(false)
watch(() => userInfo.value.avatar, () => {
  avatarLoadFailed.value = false
})
const avatarSrc = computed(() => (avatarLoadFailed.value ? DEFAULT_AVATAR : userInfo.value.avatar))

/** 根据时间获取问候语 */
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) {
    return '凌晨好'
  } else if (hour < 9) {
    return '早上好'
  } else if (hour < 12) {
    return '上午好'
  } else if (hour < 14) {
    return '中午好'
  } else if (hour < 17) {
    return '下午好'
  } else if (hour < 19) {
    return '傍晚好'
  } else {
    return '晚上好'
  }
})

/** 描述语 */
const description = computed(() => {
  const hour = new Date().getHours()
  if (hour < 9) {
    return '开始新的一天，加油！'
  } else if (hour < 12) {
    return '工作顺利，效率满满！'
  } else if (hour < 14) {
    return '午休时间，记得休息~'
  } else if (hour < 18) {
    return '继续努力，收获满满！'
  } else {
    return '辛苦了，注意休息！'
  }
})
</script>

<style lang="scss" scoped>
.avatar-wrapper {
  border: 3rpx solid var(--brand-border-light);
  border-radius: 50%;
  box-shadow: var(--brand-shadow-1);
}
</style>
