import path from 'node:path'
import fs from 'node:fs/promises'

export function isWithinRoot(root, target) {
  const relative = path.relative(root, target)
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`))
}

export async function resolveAllowedPath(input, roots) {
  if (typeof input !== 'string' || !path.isAbsolute(input) || /[\r\n\0]/.test(input)) {
    throw Object.assign(new Error('An absolute path is required'), { status: 400 })
  }
  if (!roots.length) throw Object.assign(new Error('Configure PEEL_VIDEO_ROOTS before accessing videos'), { status: 403 })
  const resolved = path.resolve(input)
  if (!roots.some(root => isWithinRoot(root, resolved))) throw Object.assign(new Error('Path is outside the configured video folders'), { status: 403 })
  const canonical = await fs.realpath(resolved).catch(() => {
    throw Object.assign(new Error('Path does not exist'), { status: 404 })
  })
  if (!roots.some(root => isWithinRoot(root, canonical))) throw Object.assign(new Error('Linked path is outside the configured video folders'), { status: 403 })
  return canonical
}
