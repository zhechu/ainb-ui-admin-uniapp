<template>
  <view class="yd-page-container">
    <!-- 顶部导航栏 -->
    <wd-navbar
      :title="pageTitle"
      left-arrow placeholder safe-area-inset-top fixed
      @click-left="handleBack"
    />

    <!-- 加载中 -->
    <view v-if="loading" class="py-100rpx text-center">
      <wd-loading size="40rpx" />
      <view class="mt-24rpx text-26rpx text-[var(--brand-text-secondary)]">
        加载中...
      </view>
    </view>

    <template v-else>
      <view class="yd-detail-body">
        <view class="yd-card yd-card--flush run-detail-card">
          <view v-if="loadFailed" class="p-32rpx text-26rpx text-[var(--brand-text-secondary)]">
            数据加载失败，请返回后重试
          </view>
          <FormCreate
            v-else
            v-model="detailForm.value"
            :option="detailForm.option"
            :rule="detailForm.rule"
            readonly
          />
        </view>
      </view>

      <!-- 底部操作按钮 -->
      <view v-if="!loadFailed && (canUpdate || canDelete)" class="yd-detail-footer">
        <view class="yd-detail-footer-actions">
          <wd-button v-if="canUpdate" class="flex-1" type="primary" @click="handleEdit">
            编辑
          </wd-button>
          <wd-button
            v-if="canDelete"
            class="flex-1"
            type="danger"
            :loading="deleting"
            @click="handleDelete"
          >
            删除
          </wd-button>
        </view>
      </view>
    </template>
  </view>
</template>

<script lang="ts" setup>
import type { FormCreatePreview } from '@/pages-bpm/utils/form-create'
import { useDialog } from '@wot-ui/ui/components/wd-dialog'
import { useToast } from '@wot-ui/ui/components/wd-toast'
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import {
  deleteFormRuntimeData,
  getFormRuntimeConfig,
  getFormRuntimeData,
} from '@/api/infra/form-design'
import { useAccess } from '@/hooks/useAccess'
import FormCreate from '@/pages-bpm/components/form-create/packages/wot-ui/src/index.vue'
import { setConfAndFields2 } from '@/pages-bpm/utils/form-create'
import { delay, navigateBackPlus } from '@/utils'
import { adaptFormRules, toTextValues } from './components/rule-adapter'

/** code / id 都来自路由 query */
const props = defineProps<{
  code?: string
  id?: string
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

const loading = ref(true) // 加载状态
const loadFailed = ref(false) // 配置或数据加载失败
const deleting = ref(false) // 删除状态
const formName = ref('') // 表单名，用于页头
const detailForm = ref<FormCreatePreview>({ option: {}, rule: [], value: {} }) // 只读表单配置与数据

const formCode = computed(() => props.code || '')
const recordId = computed(() => props.id || '')
const pageTitle = computed(() => (formName.value ? `${formName.value}详情` : '数据详情'))
const canUpdate = computed(() => hasRunAccess('update'))
const canDelete = computed(() => hasRunAccess('delete'))

/** 权限串与列表页同源，服务端各端点自行校验，这里只管显隐 */
function hasRunAccess(action: string): boolean {
  return hasAccessByCodes([`infra:form-design-run:${formCode.value}:${action}`])
}

/** 返回上一页 */
function handleBack() {
  navigateBackPlus()
}

/**
 * 加载配置与数据
 *
 * 只读态用 adaptFormRules 的 readonly 模式：移动端没实现的控件降级成纯文本，
 * 而不是整条剔除 —— 详情页要的是把值看到，少一行等于数据丢了。
 * 降级字段的值还要过一遍 toTextValues，否则 `{type,id}` 这类对象会印出 [object Object]。
 */
async function loadDetail() {
  if (!formCode.value || !recordId.value) {
    loading.value = false
    loadFailed.value = true
    toast.show('缺少表单标识或数据主键')
    return
  }
  loading.value = true
  try {
    const [config, data] = await Promise.all([
      getFormRuntimeConfig(formCode.value),
      getFormRuntimeData(formCode.value, recordId.value),
    ])
    formName.value = config.name || ''
    setConfAndFields2(detailForm, config.formConf, config.formFields, {})
    const adapted = await adaptFormRules(detailForm.value.rule, 'readonly')
    detailForm.value = {
      option: {
        ...detailForm.value.option,
        resetBtn: false,
        submitBtn: false,
      },
      rule: adapted.rules,
      value: toTextValues(adapted.textFields, data || {}),
    }
    loadFailed.value = false
  } catch {
    // 错误提示由 http 拦截器统一给出，这里只负责把页面切到失败态
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

/** 编辑 */
function handleEdit() {
  uni.navigateTo({
    url: `/pages-infra/form-design/run/form?code=${formCode.value}&id=${recordId.value}`,
  })
}

/** 删除 */
async function handleDelete() {
  try {
    await dialog.confirm({ title: '提示', msg: '确定要删除这条数据吗？' })
  } catch {
    return
  }
  deleting.value = true
  try {
    await deleteFormRuntimeData(formCode.value, recordId.value)
    toast.success('删除成功')
    uni.$emit(`infra:form-design-run:${formCode.value}:reload`)
    delay(handleBack)
  } finally {
    deleting.value = false
  }
}

// 用 onShow 而不是 onMounted：从编辑页返回时要重新取一次，否则看到的还是改之前的值
onShow(() => {
  loadDetail()
})
</script>

<style lang="scss" scoped>
/*
 * 只读态下渲染器把输入控件按 disabled 上色，值会印成占位符灰，读起来像没填；
 * 星号在只读页也只是噪音。详情页要的是「把值看清」，所以两者都在本页收敛。
 * 用 CSS 变量 + :deep 而不是改 packages/：BPM 流程表单共用同一个渲染器。
 */
.run-detail-card {
  --wot-input-disabled-color: var(--brand-text-primary);
  --wot-textarea-disabled-color: var(--brand-text-primary);

  :deep(.wd-cell__required) {
    display: none;
  }
}
</style>
