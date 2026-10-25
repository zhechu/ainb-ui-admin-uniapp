import type { Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

interface ManifestType {
  'plus'?: {
    distribute?: {
      plugins?: Record<string, any>
    }
  }
  'app-plus'?: {
    distribute?: {
      plugins?: Record<string, any>
    }
  }
}

export default function syncManifestPlugin(): Plugin {
  return {
    name: 'sync-manifest',
    apply: 'build',
    enforce: 'post',
    writeBundle: {
      order: 'post',
      handler() {
        // 只有 app 端产物里有 plus.distribute 这一层，H5 与小程序不需要也不该被写入
        if (!process.env.UNI_PLATFORM?.startsWith('app'))
          return

        const srcManifestPath = path.resolve(process.cwd(), './src/manifest.json')
        // 产物目录随命令变化：uni build -p app → dist/build/app，uni -p app → dist/dev/app
        const buildMode = process.env.NODE_ENV === 'production' ? 'build' : 'dev'
        const distAppPath = path.resolve(process.cwd(), `./dist/${buildMode}/app/manifest.json`)

        try {
          // 读取源文件
          const srcManifest = JSON.parse(fs.readFileSync(srcManifestPath, 'utf8')) as ManifestType
          const plugins = srcManifest['app-plus']?.distribute?.plugins
          // 没配原生插件就无事可做。必须在这里返回：早先无条件建目录，
          // 导致每次构建（含 H5）都会在 dist 下留一个空的 dev/app/
          if (!plugins)
            return

          // 确保目标目录存在
          const distAppDir = path.dirname(distAppPath)
          if (!fs.existsSync(distAppDir)) {
            fs.mkdirSync(distAppDir, { recursive: true })
          }

          // 读取目标文件（如果存在）
          let distManifest: ManifestType = {}
          if (fs.existsSync(distAppPath)) {
            distManifest = JSON.parse(fs.readFileSync(distAppPath, 'utf8'))
          }

          // 确保目标文件中有必要的对象结构
          if (!distManifest.plus)
            distManifest.plus = {}
          if (!distManifest.plus.distribute)
            distManifest.plus.distribute = {}

          // 复制 plugins 内容
          distManifest.plus.distribute.plugins = plugins

          // 写入更新后的内容
          fs.writeFileSync(distAppPath, JSON.stringify(distManifest, null, 2))
          console.log('✅ Manifest plugins 同步成功')
        } catch (error) {
          console.error('❌ 同步 manifest plugins 失败:', error)
        }
      },
    },
  }
}
