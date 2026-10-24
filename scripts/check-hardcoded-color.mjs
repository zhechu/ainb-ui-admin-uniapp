#!/usr/bin/env node
/**
 * 只读扫描：拦住会破坏品牌一致性的硬编码色值。
 *
 * 用法：node scripts/check-hardcoded-color.mjs
 *
 * 两类规则：
 *  · 禁用（必须为 0）：#3370ff —— 历史遗留的飞书蓝，与品牌主色 #1890ff 不是同一支色，
 *    出现在工作台里会明显「串色」。
 *  · 限额（不得超过基线）：#1890ff —— 色值本身是对的，但应当写成 `bg-primary` /
 *    `text-primary` / `var(--wot-color-theme)`，或从 `src/style/theme.ts` 取 BRAND.primary。
 *    存量已在 2026-10 全部迁移完毕，基线归零，此后任何一处新增都会被拦下。
 *
 * 不修改任何文件；退出码 0 = 通过，1 = 有违规。
 */
import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')

/** 不参与扫描的目录：第三方 vendor 副本与生成物 */
const EXCLUDE_DIRS = [
  join('src', 'uni_modules'),
  join('src', 'lib'),
  join('src', 'pages-bpm', 'components', 'form-create', 'packages'),
  join('src', 'service'),
]

const EXTENSIONS = new Set(['.vue', '.ts', '.tsx', '.js', '.scss', '.css'])

/** 必须为 0 的色值 */
const FORBIDDEN = [
  { pattern: /#3370ff/gi, name: '#3370ff（飞书蓝，应改为 bg-primary / text-primary / BRAND.primary）' },
]

/** 有存量、只拦新增的色值（存量已清零，baseline 保持 0 即为硬门禁） */
const BASELINED = [
  { pattern: /#1890ff/gi, name: '#1890ff（应改为 bg-primary / text-primary / BRAND.primary）', baseline: 0 },
]

/** tokens.scss 与 theme.ts 是色值的唯一落地点，豁免 */
const EXEMPT_FILES = [
  join('src', 'style', 'tokens.scss'),
  join('src', 'style', 'theme.ts'),
]

async function walk(dir, out = []) {
  for (const entry of await readdir(dir)) {
    const full = join(dir, entry)
    const rel = relative(ROOT, full)
    if (EXCLUDE_DIRS.some(ex => rel === ex || rel.startsWith(ex + sep))) {
      continue
    }
    const info = await stat(full)
    if (info.isDirectory()) {
      await walk(full, out)
    } else if (EXTENSIONS.has(entry.slice(entry.lastIndexOf('.')))) {
      out.push(full)
    }
  }
  return out
}

const files = await walk(SRC)
const hits = []

for (const file of files) {
  const rel = relative(ROOT, file).replaceAll(sep, '/')
  if (EXEMPT_FILES.some(ex => rel === ex.replaceAll(sep, '/'))) {
    continue
  }
  const lines = (await readFile(file, 'utf8')).split(/\r?\n/)
  lines.forEach((line, index) => {
    for (const rule of [...FORBIDDEN, ...BASELINED]) {
      rule.pattern.lastIndex = 0
      const count = (line.match(rule.pattern) || []).length
      if (count > 0) {
        hits.push({ rel, line: index + 1, rule: rule.name, count })
      }
    }
  })
}

const totalOf = name => hits.filter(hit => hit.rule === name).reduce((sum, hit) => sum + hit.count, 0)

let failed = false

for (const rule of FORBIDDEN) {
  const total = totalOf(rule.name)
  if (total > 0) {
    failed = true
    console.error(`✖ 禁用色 ${rule.name}：发现 ${total} 处`)
    for (const hit of hits.filter(h => h.rule === rule.name)) {
      console.error(`    ${hit.rel}:${hit.line}`)
    }
  } else {
    console.log(`✔ 禁用色 ${rule.name}：0 处`)
  }
}

for (const rule of BASELINED) {
  const total = totalOf(rule.name)
  if (total > rule.baseline) {
    failed = true
    console.error(`✖ 限额色 ${rule.name}：当前 ${total} 处，超过基线 ${rule.baseline} 处（新增了 ${total - rule.baseline} 处）`)
    for (const hit of hits.filter(h => h.rule === rule.name)) {
      console.error(`    ${hit.rel}:${hit.line}`)
    }
  } else {
    console.log(`✔ 限额色 ${rule.name}：当前 ${total} 处 ≤ 基线 ${rule.baseline} 处`)
  }
}

if (failed) {
  console.error('\n请把新增的硬编码色值改成设计令牌：')
  console.error('  · 模板 class：bg-primary / text-primary / text-[var(--brand-text-secondary)]')
  console.error('  · 模板 prop 或 script 里的色值：import { BRAND } from \'@/style/theme\'')
  console.error('  · scss：var(--brand-*)，令牌定义见 src/style/tokens.scss')
  process.exit(1)
}
