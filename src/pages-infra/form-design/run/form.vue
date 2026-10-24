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
        加载表单中...
      </view>
    </view>

    <template v-else>
      <view class="yd-detail-body">
        <view class="yd-card yd-card--flush">
          <!-- 加载失败：配置都拿不到，渲染器里什么都不会有 -->
          <view v-if="loadFailed" class="p-32rpx text-26rpx text-[var(--brand-text-secondary)]">
            表单加载失败，请返回后重试
          </view>
          <view
            v-else-if="detailForm.rule.length === 0"
            class="p-32rpx text-26rpx text-[var(--brand-text-secondary)]"
          >
            该表单在移动端暂无可填写的字段
          </view>
          <FormCreate
            v-else
            v-model="detailForm.value"
            v-model:api="fApi"
            :option="detailForm.option"
            :rule="detailForm.rule"
            @change="handleFormChange"
          />
        </view>
      </view>

      <!-- 底部保存按钮。渲染器自带的提交按钮已被 option 关掉，页面按钮才够得着 -->
      <view v-if="!loadFailed && detailForm.rule.length > 0" class="yd-detail-footer">
        <wd-button type="primary" block :loading="submitting" @click="handleSubmit">
          保存
        </wd-button>
      </view>
    </template>
  </view>
</template>

<script lang="ts" setup>
import type { FormCreateApi } from '@/pages-bpm/components/form-create/packages/wot-ui/types'
import type { FormCreatePreview } from '@/pages-bpm/utils/form-create'
import { useToast } from '@wot-ui/ui/components/wd-toast'
import { computed, onMounted, ref } from 'vue'
import {
  createFormRuntimeData,
  getFormRuntimeConfig,
  getFormRuntimeData,
  updateFormRuntimeData,
} from '@/api/infra/form-design'
import FormCreate from '@/pages-bpm/components/form-create/packages/wot-ui/src/index.vue'
import { filterFormVariablesByFields, setConfAndFields2 } from '@/pages-bpm/utils/form-create'
import { delay, navigateBackPlus } from '@/utils'
import { adaptFormRules } from './components/rule-adapter'

/** code / id 都来自路由 query。有 id 是编辑，没有是新增 */
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

const toast = useToast()

const loading = ref(true) // 表单配置加载状态
const loadFailed = ref(false) // 配置或数据加载失败
const submitting = ref(false) // 提交状态
const formName = ref('') // 表单名，用于页头
const fApi = ref<FormCreateApi>() // 渲染器 API，提交前用它校验与取数
const detailForm = ref<FormCreatePreview>({ option: {}, rule: [], value: {} }) // 表单配置与数据

const formCode = computed(() => props.code || '')
const isEdit = computed(() => !!props.id)
const pageTitle = computed(() => {
  const action = isEdit.value ? '编辑' : '新增'
  return formName.value ? `${action}${formName.value}` : `${action}数据`
})

/** 返回上一页 */
function handleBack() {
  navigateBackPlus()
}

/** 同步表单数据 */
function handleFormChange(data: Record<string, any>) {
  detailForm.value.value = data
}

/**
 * 加载渲染配置与数据
 *
 * 顺序不能反：先 setConfAndFields2 解出原始规则，再交给适配层改写。
 * 适配是异步的（远程选择器要预取选项），所以整段 await 完才关 loading ——
 * 提前关的话渲染器会先按未适配的规则渲染一遍，用户能看到「暂不支持」一闪而过。
 */
async function loadForm() {
  loading.value = true
  try {
    const config = await getFormRuntimeConfig(formCode.value)
    formName.value = config.name || ''
    setConfAndFields2(detailForm, config.formConf, config.formFields, {})
    const adapted = await adaptFormRules(detailForm.value.rule, 'edit')
    detailForm.value = {
      option: {
        ...detailForm.value.option,
        // 用页面底部按钮提交，关掉渲染器内置的两个按钮
        resetBtn: false,
        submitBtn: false,
      },
      rule: adapted.rules,
      value: {},
    }
    if (isEdit.value) {
      detailForm.value.value = await getFormRuntimeData(formCode.value, props.id!)
    }
  } catch {
    // 错误提示由 http 拦截器统一给出，这里只负责把页面切到失败态
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

/** 提交 */
async function handleSubmit() {
  if (!fApi.value || submitting.value) {
    return
  }
  const { valid } = await fApi.value.validate()
  if (!valid) {
    return
  }

  submitting.value = true
  try {
    // 只提交表单里真实存在的字段。被适配层剔除的控件不能把原值回写一遍 ——
    // 详情接口对脱敏字段返回的是掩码，原样提交等于把掩码写进库；
    // 而服务端 update 的 SET 子句按提交列拼，不提交就是「这一列这次不改」
    const data = filterFormVariablesByFields(detailForm.value.rule, fApi.value.formData())
    if (isEdit.value) {
      await updateFormRuntimeData(formCode.value, props.id!, data)
      toast.success('修改成功')
    } else {
      await createFormRuntimeData(formCode.value, data)
      toast.success('新增成功')
    }
    uni.$emit(`infra:form-design-run:${formCode.value}:reload`)
    delay(handleBack)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  if (!formCode.value) {
    loading.value = false
    loadFailed.value = true
    toast.show('缺少表单标识')
    return
  }
  loadForm()
})
</script>
