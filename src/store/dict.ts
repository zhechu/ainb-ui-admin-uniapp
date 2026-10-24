import type { DictData } from '@/api/system/dict/data'
import { defineStore } from 'pinia'

import { computed, ref } from 'vue'
import { getSimpleDictDataList } from '@/api/system/dict/data'
import { sleep } from '@/utils/promise'

/** 字典项 */
export interface DictItem {
  label: string
  value: string
  colorType?: string
  cssClass?: string
  /** 字典数据编号，与 parentId 配对才能建出树 */
  id?: number
  /** 父节点编号，0 表示根。树形字典（如区域）靠它算「自身 + 全部后代」 */
  parentId?: number
}

/** 字典缓存类型 */
export type DictCache = Record<string, DictItem[]>

let loadingPromise: Promise<void> | null = null

export const useDictStore = defineStore(
  'dict',
  () => {
    const dictCache = ref<DictCache>({}) // 字典缓存
    const isLoaded = computed(() => Object.keys(dictCache.value).length > 0) // 是否已加载（基于 dictCache 非空判断）
    /**
     * 缓存里有没有层级信息
     *
     * parentId 是这次才存进来的，而 persist 会让老缓存一直活下去 ——
     * 不判一下，树形字典在升级后永远是摊平的，且看不出原因。缺层级就重取一次。
     * （服务端 simple-list 一直都返回 parentId，正常情况下重取一次就够了。）
     */
    const hasHierarchy = computed(() =>
      Object.values(dictCache.value).some(items => items.some(item => item.parentId !== undefined)),
    )

    /** 设置字典缓存 */
    const setDictCache = (dicts: DictCache) => {
      dictCache.value = dicts
    }

    /** 通过 API 加载字典数据 */
    const loadDictCache = async (force = false) => {
      if (!force && isLoaded.value && hasHierarchy.value) {
        return
      }
      if (loadingPromise) {
        return loadingPromise
      }

      loadingPromise = (async () => {
        const dicts = await getSimpleDictDataList()
        const dictCacheData: DictCache = {}
        dicts.forEach((dict: DictData) => {
          if (!dictCacheData[dict.dictType]) {
            dictCacheData[dict.dictType] = []
          }
          dictCacheData[dict.dictType].push({
            id: dict.id,
            label: dict.label,
            parentId: dict.parentId,
            value: dict.value,
            colorType: dict.colorType,
            cssClass: dict.cssClass,
          })
        })
        setDictCache(dictCacheData)
      })()

      try {
        await loadingPromise
      } finally {
        loadingPromise = null
      }
    }

    /** 重试加载字典数据，用于微信等环境下缓存丢失或网络抖动后的补偿 */
    const loadDictCacheWithRetry = async (maxRetry = 3) => {
      for (let i = 0; i <= maxRetry; i++) {
        try {
          await loadDictCache()
          return
        } catch (error) {
          console.error(`加载字典数据失败，第 ${i + 1} 次`, error)
          if (i >= maxRetry) {
            return
          }
          await sleep(800 * (i + 1))
        }
      }
    }

    /** 获取字典选项列表 */
    const getDictOptions = (dictType: string): DictItem[] => {
      return dictCache.value[dictType] || []
    }

    /** 获取字典数据对象 */
    const getDictData = (dictType: string, value: any): DictItem | undefined => {
      const dict = dictCache.value[dictType]
      if (!dict) {
        return undefined
      }
      return dict.find(d => d.value === value || d.value === String(value))
    }

    /** 清空字典缓存 */
    const clearDictCache = () => {
      dictCache.value = {}
    }

    return {
      dictCache,
      isLoaded,
      setDictCache,
      loadDictCache,
      loadDictCacheWithRetry,
      getDictOptions,
      getDictData,
      clearDictCache,
    }
  },
  {
    persist: true,
  },
)
