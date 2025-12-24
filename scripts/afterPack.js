/**
 * electron-builder afterPack hook
 *
 * 目的：修复打包后白屏（/ 500）——根因是 `.next/standalone` 里的 better-sqlite3 native binding
 *      不是当前架构（例如 standalone 里被提前复制了 x86_64，但实际打包的是 arm64）。
 *
 * 思路：electron-builder 会按当前 arch 重新编译/下载 native deps 到 `resources/app/node_modules/...`，
 *      afterPack 阶段我们把“正确架构”的 binding 覆盖到 `.next/standalone/node_modules/...`。
 */

const fs = require('fs')
const path = require('path')

function exists(p) {
  try {
    fs.accessSync(p)
    return true
  } catch {
    return false
  }
}

function copyDir(src, dest) {
  if (!exists(src)) return false
  fs.mkdirSync(dest, { recursive: true })
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
  return true
}

exports.default = async function afterPack(context) {
  const { appOutDir, electronPlatformName } = context

  // 计算 resources/app 目录
  // - mac:   <out>/<Product>.app/Contents/Resources/app
  // - win/linux: <out>/resources/app
  let appDir
  if (electronPlatformName === 'darwin') {
    const productFilename = context.packager.appInfo.productFilename
    appDir = path.join(appOutDir, `${productFilename}.app`, 'Contents', 'Resources', 'app')
  } else {
    appDir = path.join(appOutDir, 'resources', 'app')
  }

  const rebuiltBinding = path.join(appDir, 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node')
  const standaloneBinding = path.join(appDir, '.next', 'standalone', 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node')

  if (!exists(rebuiltBinding)) {
    // eslint-disable-next-line no-console
    console.warn('[afterPack] better-sqlite3 rebuilt binding not found:', rebuiltBinding)
    return
  }

  const destDir = path.dirname(standaloneBinding)
  fs.mkdirSync(destDir, { recursive: true })
  fs.copyFileSync(rebuiltBinding, standaloneBinding)

  // eslint-disable-next-line no-console
  console.log('[afterPack] Patched standalone better-sqlite3 binding:', {
    from: rebuiltBinding,
    to: standaloneBinding
  })

  // Prisma runtime: ensure `node_modules/.prisma/client/*` exists in packaged app
  // Otherwise Prisma will crash with: "Cannot find module '.prisma/client/default'"
  const projectDir = context.packager?.projectDir || process.cwd()
  const srcDotPrisma = path.join(projectDir, 'node_modules', '.prisma')
  const destDotPrisma = path.join(appDir, 'node_modules', '.prisma')

  if (!exists(destDotPrisma)) {
    if (copyDir(srcDotPrisma, destDotPrisma)) {
      // eslint-disable-next-line no-console
      console.log('[afterPack] Copied Prisma runtime folder:', { from: srcDotPrisma, to: destDotPrisma })
    } else {
      // eslint-disable-next-line no-console
      console.warn('[afterPack] Prisma runtime folder not found in project:', srcDotPrisma)
    }
  }
}


