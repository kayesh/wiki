export function collapseAssetPath (rawPath) {
  if (!rawPath || typeof rawPath !== 'string') {
    return ''
  }

  const trimmed = rawPath.trim()
  if (!trimmed) {
    return ''
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  const parts = trimmed.split('/').filter(Boolean)
  const collapsed = []

  for (const part of parts) {
    if (collapsed.length === 0 || collapsed[collapsed.length - 1] !== part) {
      collapsed.push(part)
    }
  }

  return collapsed.length ? `/${collapsed.join('/')}` : trimmed
}

export function buildMediaAssetPath (folderTree, filename, folderId) {
  const basename = (filename || '').split('/').filter(Boolean).pop() || filename
  if (!basename) {
    return ''
  }

  if (!folderId || !folderTree || folderTree.length === 0) {
    return collapseAssetPath(`/${basename}`)
  }

  const assetPath = folderTree.map(f => f.slug).join('/')
  return collapseAssetPath(`/${assetPath}/${basename}`)
}

export function resetMediaBrowserState (store) {
  if (!store) {
    return
  }

  store.set('editor/media@folderTree', [])
  store.set('editor/media@currentFolderId', 0)
  store.set('editor/media@currentFileId', null)
}
