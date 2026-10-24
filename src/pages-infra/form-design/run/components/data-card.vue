<template>
  <view class="yd-card" @click="emit('detail')">
    <!-- 标题 + 右上角状态标签 -->
    <view class="yd-card-title">
      <text class="min-w-0 flex-1 truncate">{{ card.title.text }}</text>
      <dict-tag
        v-if="badge && badge.dictType"
        class="ml-16rpx shrink-0"
        :type="badge.dictType"
        :value="badge.raw"
      />
      <wd-tag
        v-else-if="badge"
        class="ml-16rpx shrink-0"
        :type="badge.tagType"
        plain
        round
      >
        {{ badge.text }}
      </wd-tag>
    </view>

    <!-- 键值行 -->
    <view v-for="cell in card.rows" :key="cell.label" class="yd-cell-row">
      <text class="yd-cell-row__label truncate">{{ cell.label }}</text>
      <view class="yd-cell-row__value">
        <!-- 图片列：最多三张缩略图，点开看大图 -->
        <view v-if="cell.kind === 'IMAGE' && cell.urls.length > 0" class="flex flex-wrap gap-8rpx">
          <wd-img
            v-for="url in cell.urls.slice(0, 3)"
            :key="url"
            :src="url"
            width="96rpx"
            height="96rpx"
            mode="aspectFill"
            radius="8rpx"
            enable-preview
          />
        </view>
        <text v-else-if="cell.kind === 'LINK'" class="break-all text-primary">{{ cell.text }}</text>
        <dict-tag v-else-if="cell.dictType" :type="cell.dictType" :value="cell.raw" />
        <text v-else class="break-all">{{ cell.text }}</text>
      </view>
    </view>

    <!-- 行内操作。stop 修饰符是必需的：整张卡片都绑了跳详情 -->
    <view v-if="canUpdate || canDelete" class="mt-16rpx flex justify-end gap-16rpx border-t border-[var(--brand-border-light)] pt-16rpx">
      <wd-button
        v-if="canUpdate"
        size="small"
        variant="plain"
        @click.stop="emit('edit')"
      >
        编辑
      </wd-button>
      <wd-button
        v-if="canDelete"
        size="small"
        type="danger"
        variant="plain"
        @click.stop="emit('delete')"
      >
        删除
      </wd-button>
    </view>
  </view>
</template>

<script lang="ts" setup>
import type { CellView, RuntimeColumn } from './list-conf'
import { computed } from 'vue'
import { buildCardView } from './list-conf'

const props = defineProps<{
  /** 有编辑权限才显示编辑按钮 */
  canUpdate?: boolean
  /** 有删除权限才显示删除按钮 */
  canDelete?: boolean
  /** 列表列配置，决定卡片显示哪几项 */
  columns: RuntimeColumn[]
  /** 一行数据，key 是字段名 */
  row: Record<string, any>
}>()

const emit = defineEmits<{
  delete: []
  detail: []
  edit: []
}>()

const card = computed(() => buildCardView(props.row, props.columns))

/** 右上角的状态标签，由 buildCardView 从 TAG / DICT 列里挑出来 */
const badge = computed<CellView | undefined>(() => card.value.badge)
</script>
