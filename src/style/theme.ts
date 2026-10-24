/**
 * 品牌色的 TS 侧常量：CSS 变量（--brand-*）在 JS 运行时、canvas、图表库、
 * 以及被 vite-plugin-uni-pages 编译进 pages.json 的 tabbar 配置里都读不到，
 * 这些地方只能用字面量，统一从这里取值，避免同一支色散落在几十个文件里。
 *
 * 取值必须与 src/style/tokens.scss 保持一致（tokens.scss 是设计令牌的事实来源）。
 */
export const BRAND = {
  /** 主色，等价于 --wot-color-theme / --brand-primary */
  primary: '#1890ff',

  /** 文本四级，等价于 --brand-text-strong / -primary / -secondary / -muted */
  textStrong: '#172033',
  textPrimary: '#344054',
  textSecondary: '#667085',
  textMuted: '#98a2b3',

  /** 画布 / 表面 / 分隔线，等价于 --brand-canvas / --brand-surface / --brand-line */
  canvas: '#f4f7fb',
  surface: '#ffffff',
  line: '#eef1f6',

  /** 填充与边框，等价于 --brand-fill、--brand-fill-light、--brand-border、--brand-border-light */
  fill: '#f5f7fa',
  fillLight: '#f8fafc',
  border: '#e6ebf2',
  borderLight: '#eef1f5',

  /** 强调底，等价于 --brand-accent */
  accent: '#eef4ff',

  /** 渐变，等价于 --brand-grad */
  grad: 'linear-gradient(120deg, #22a6f2 0%, #3b4bd8 100%)',

  /** 语义色：成功 / 警告 / 危险，与 wot-design-uni 默认一致 */
  success: '#34d19d',
  warning: '#f0883a',
  danger: '#fa4350',
} as const

/** tabbar 未选中态文字色（原生 tabbar 不支持 CSS 变量） */
export const TABBAR_COLOR = BRAND.textMuted

/** tabbar 选中态高亮色（原生 tabbar 不支持 CSS 变量） */
export const TABBAR_SELECTED_COLOR = BRAND.primary

/** tabbar 背景色 */
export const TABBAR_BG_COLOR = BRAND.surface
