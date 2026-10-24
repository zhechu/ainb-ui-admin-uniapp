<template>
  <!-- 搜索框入口：点开是弹窗，不占列表空间 -->
  <view @click="visible = true">
    <wd-search :placeholder="placeholder" hide-cancel disabled />
  </view>

  <!-- 搜索弹窗 -->
  <wd-popup
    v-model="visible"
    position="top"
    :custom-style="getTopPopupStyle()"
    :modal-style="getTopPopupModalStyle()"
    @close="visible = false"
  >
    <view class="yd-search-form-container">
      <template v-for="item in props.items" :key="item.field">
        <!-- 为空 / 不为空：条件本身就是全部信息，没有值要填 -->
        <view v-if="isValuelessOperator(item.operator)" class="yd-search-form-item">
          <view class="yd-search-form-label">
            {{ item.label }}
          </view>
          <view class="text-26rpx text-[var(--brand-text-muted)]">
            {{ item.operator === 'IS_NULL' ? '筛选为空的记录' : '筛选非空的记录' }}
          </view>
        </view>

        <!-- 日期区间 -->
        <yd-search-date-range
          v-else-if="item.widget === 'DATE_RANGE'"
          v-model="form[item.field]"
          :label="item.label"
        />

        <!-- 单个日期 -->
        <view v-else-if="item.widget === 'DATE'" class="yd-search-form-item">
          <view class="yd-search-form-label">
            {{ item.label }}
          </view>
          <view class="yd-search-form-date-range-picker" @click="openDatePicker(item)">
            {{ form[item.field] ? formatDate(form[item.field]) : '请选择日期' }}
          </view>
          <template v-if="activeDateField === item.field">
            <wd-datetime-picker-view v-model="dateTempValue" type="date" />
            <view class="yd-search-form-date-range-actions">
              <wd-button size="small" variant="plain" @click="activeDateField = ''">
                取消
              </wd-button>
              <wd-button size="small" type="primary" @click="confirmDatePicker">
                确定
              </wd-button>
            </view>
          </template>
        </view>

        <!-- 字典下拉。IN 操作符时多选 -->
        <yd-search-picker
          v-else-if="isMultiSelect(item)"
          v-model="form[item.field]"
          type="checkbox"
          :label="item.label"
          :dict-type="item.dictType"
          dict-kind="str"
          filterable
        />
        <yd-search-picker
          v-else-if="isSingleSelect(item)"
          v-model="form[item.field]"
          type="radio"
          :label="item.label"
          :dict-type="item.dictType"
          dict-kind="str"
          all-option
          filterable
        />

        <!-- 是 / 否。值用字符串 1 / 0，与 web 端 el-option 的取值一致 -->
        <yd-search-picker
          v-else-if="item.widget === 'SWITCH'"
          v-model="form[item.field]"
          type="radio"
          :label="item.label"
          :columns="SWITCH_COLUMNS"
          all-option
        />

        <!-- 区间：数字区间与文本区间共用两个输入框的形态 -->
        <view v-else-if="item.operator === 'BETWEEN'" class="yd-search-form-item">
          <view class="yd-search-form-label">
            {{ item.label }}
          </view>
          <view class="flex items-center gap-16rpx">
            <wd-input
              v-model="form[item.field][0]"
              class="flex-1"
              :type="item.widget === 'NUMBER_RANGE' ? 'number' : 'text'"
              :placeholder="rangePlaceholder(item)[0]"
              clearable
            />
            <text class="text-26rpx text-[var(--brand-text-muted)]">~</text>
            <wd-input
              v-model="form[item.field][1]"
              class="flex-1"
              :type="item.widget === 'NUMBER_RANGE' ? 'number' : 'text'"
              :placeholder="rangePlaceholder(item)[1]"
              clearable
            />
          </view>
        </view>

        <!-- 单个数字 -->
        <view v-else-if="item.widget === 'NUMBER'" class="yd-search-form-item">
          <view class="yd-search-form-label">
            {{ item.label }}
          </view>
          <wd-input
            v-model="form[item.field]"
            type="number"
            :placeholder="`请输入${item.label}`"
            clearable
          />
        </view>

        <!-- 兜底：文本框。认不出的配置走这里，至少还能查 -->
        <view v-else class="yd-search-form-item">
          <view class="yd-search-form-label">
            {{ item.label }}
          </view>
          <wd-input
            v-model="form[item.field]"
            :placeholder="`请输入${item.label}`"
            clearable
          />
        </view>
      </template>

      <view class="yd-search-form-actions">
        <wd-button class="flex-1" variant="plain" @click="handleReset">
          重置
        </wd-button>
        <wd-button class="flex-1" type="primary" @click="handleSearch">
          搜索
        </wd-button>
      </view>
    </view>
  </wd-popup>
</template>

<script lang="ts" setup>
import type { RuntimeSearchItem, SearchValues } from './list-conf'
import { computed, reactive, ref, watch } from 'vue'
import { getTopPopupModalStyle, getTopPopupStyle } from '@/utils'
import { formatDate } from '@/utils/date'
import { describeConditions, isValuelessOperator } from './list-conf'

const props = defineProps<{
  /** 查询项配置，来自 list_conf.searchItems */
  items: RuntimeSearchItem[]
}>()

const emit = defineEmits<{
  reset: []
  search: [values: SearchValues]
}>()

/** 「是 / 否」的选项。值取字符串，与 web 端查询区的 el-option 完全一致 */
const SWITCH_COLUMNS = [
  { label: '是', value: '1' },
  { label: '否', value: '0' },
]

const visible = ref(false) // 搜索弹窗显示状态
const form = reactive<SearchValues>({}) // 查询项的当前值，key 是字段名
const activeDateField = ref('') // 正在填写的单日期字段，全部日期项共用一个选择器
const dateTempValue = ref<number>(Date.now()) // 日期选择器的临时值

/** 区间型：值是二元数组。DATE_RANGE 存时间戳，其余存输入框原值 */
function isRangeItem(item: RuntimeSearchItem): boolean {
  return item.widget === 'DATE_RANGE' || item.widget === 'NUMBER_RANGE' || item.operator === 'BETWEEN'
}

/** 字典下拉。没配字典时退回文本框 —— 空下拉比文本框更难查 */
function isSingleSelect(item: RuntimeSearchItem): boolean {
  return item.widget === 'SELECT' && !!item.dictType && item.operator !== 'IN'
}

function isMultiSelect(item: RuntimeSearchItem): boolean {
  return item.widget === 'SELECT' && !!item.dictType && item.operator === 'IN'
}

function rangePlaceholder(item: RuntimeSearchItem): [string, string] {
  return item.widget === 'NUMBER_RANGE' ? ['最小值', '最大值'] : ['起始值', '结束值']
}

/** 按查询项重建表单值。区间型必须是数组，否则模板里的 [0]/[1] 会读到 undefined 的属性 */
function resetForm() {
  Object.keys(form).forEach(key => delete form[key])
  props.items.forEach((item) => {
    form[item.field] = isRangeItem(item) ? [undefined, undefined] : undefined
  })
  activeDateField.value = ''
}

watch(() => props.items, resetForm, { immediate: true })

/** 搜索框占位：把已填的条件说成人话，收起弹窗也知道当前筛了什么 */
const placeholder = computed(() => describeConditions(props.items, form).join(' | ') || '搜索')

/** 展开某一项的日期选择器 */
function openDatePicker(item: RuntimeSearchItem) {
  dateTempValue.value = Number(form[item.field]) || Date.now()
  activeDateField.value = activeDateField.value === item.field ? '' : item.field
}

/** 确认日期选择 */
function confirmDatePicker() {
  form[activeDateField.value] = dateTempValue.value
  activeDateField.value = ''
}

/** 搜索 */
function handleSearch() {
  visible.value = false
  emit('search', { ...form })
}

/** 重置 */
function handleReset() {
  resetForm()
  visible.value = false
  emit('reset')
}
</script>
