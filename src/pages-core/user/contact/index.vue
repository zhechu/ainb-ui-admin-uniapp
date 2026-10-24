<template>
  <view class="yd-page-container">
    <!-- 顶部导航栏 -->
    <wd-navbar
      title="联系客服"
      left-arrow
      placeholder
      safe-area-inset-top
      fixed
      @click-left="handleBack"
    />

    <!-- 客服卡片 -->
    <view class="mx-30rpx mt-20rpx rounded-16rpx bg-white px-60rpx py-80rpx">
      <!-- 未配置任何客服信息时的占位：不渲染裂图、不给无法拨打的入口 -->
      <view v-if="!qrCodeUrl && !servicePhone" class="flex flex-col items-center">
        <wd-icon name="warning" size="80rpx" color="var(--brand-primary)" class="mb-30rpx" />
        <text class="mb-16rpx text-32rpx text-gray-800 font-bold">暂未配置客服信息</text>
        <text class="text-28rpx text-gray-500">
          请联系系统管理员，在 env/.env 中配置 VITE_APP_SERVICE_QRCODE 或 VITE_APP_SERVICE_PHONE
        </text>
      </view>

      <view v-else class="flex flex-col items-center">
        <!-- 二维码图片 -->
        <template v-if="qrCodeUrl">
          <view class="mb-30rpx h-280rpx w-280rpx overflow-hidden rounded-16rpx">
            <wd-img
              :src="qrCodeUrl"
              width="280rpx"
              height="280rpx"
              mode="aspectFit"
            />
          </view>
          <text class="mb-40rpx text-32rpx text-gray-800 font-bold">
            添加客服二维码
          </text>
        </template>

        <text v-if="serviceTime" class="mb-16rpx text-28rpx text-gray-500">
          服务时间：{{ serviceTime }}
        </text>

        <!-- 客服电话 -->
        <view v-if="servicePhone" class="flex items-center text-28rpx text-gray-500">
          <text>客服电话：{{ servicePhone }}</text>
          <text
            class="ml-10rpx text-blue-500 underline"
            @click="handleCallPhone"
          >
            拨打
          </text>
        </view>

        <!-- 保存按钮 -->
        <view v-if="qrCodeUrl" class="mt-60rpx w-full">
          <wd-button type="primary" block @click="handleSaveQRCode">
            保存二维码图片
          </wd-button>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import { useToast } from '@wot-ui/ui/components/wd-toast'
import { computed } from 'vue'
import { navigateBackPlus } from '@/utils'
import { saveImageToAlbum, staticUrl } from '@/utils/download'

definePage({
  style: {
    navigationBarTitleText: '',
    navigationStyle: 'custom',
  },
})

const toast = useToast()

// 三项都来自 env，默认留空。上游把二维码写死成本仓并不存在的 /static/qrcode.png、
// 电话写死成上游演示号码——留空 + 模板里按有无值分支渲染，才不会显示裂图或拨不通的入口。
const qrCodeUrl = computed(() => {
  const raw = import.meta.env.VITE_APP_SERVICE_QRCODE
  return raw ? staticUrl(raw) : ''
})
const servicePhone = computed(() => import.meta.env.VITE_APP_SERVICE_PHONE || '')
const serviceTime = computed(() => import.meta.env.VITE_APP_SERVICE_TIME || '')

/** 返回上一页 */
function handleBack() {
  navigateBackPlus('/pages/user/index')
}

/** 拨打电话 */
function handleCallPhone() {
  uni.makePhoneCall({
    phoneNumber: servicePhone.value,
    fail: (_err) => {
      toast.show('拨打失败')
    },
  })
}

/** 保存二维码图片 */
async function handleSaveQRCode() {
  await saveImageToAlbum(qrCodeUrl.value, 'service-qrcode.png')
}
</script>
