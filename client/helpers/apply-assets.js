function cacheBust (href) {
  if (!href) {
    return href
  }
  const separator = href.includes('?') ? '&' : '?'
  return `${href}${separator}v=${Date.now()}`
}

function upsertLink ({ rel, href, sizes, type, color }) {
  if (typeof document === 'undefined' || !href) {
    return
  }

  let selector = `link[rel="${rel}"]`
  if (sizes) {
    selector += `[sizes="${sizes}"]`
  }

  let el = document.querySelector(selector)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }

  el.setAttribute('href', cacheBust(href))
  if (sizes) {
    el.setAttribute('sizes', sizes)
  }
  if (type) {
    el.setAttribute('type', type)
  }
  if (color) {
    el.setAttribute('color', color)
  }
}

function resolveClientAssetUrl (href) {
  if (!href || typeof href !== 'string') {
    return href
  }
  if (/^https?:\/\//i.test(href)) {
    return href
  }
  if (typeof window === 'undefined') {
    return href
  }
  return `${window.location.origin}${href.startsWith('/') ? href : `/${href}`}`
}

export function applyResolvedAssets (assets, store) {
  if (!assets) {
    return
  }

  if (typeof document !== 'undefined') {
    upsertLink({ rel: 'apple-touch-icon', sizes: '180x180', href: assets.appleTouchIcon })
    upsertLink({ rel: 'icon', type: 'image/png', sizes: '192x192', href: assets.androidChrome192 })
    upsertLink({ rel: 'icon', type: 'image/png', sizes: '32x32', href: assets.favicon32 })
    upsertLink({ rel: 'icon', type: 'image/png', sizes: '16x16', href: assets.favicon16 })
    upsertLink({ rel: 'mask-icon', href: assets.safariPinnedTab, color: '#1976d2' })
    upsertLink({ rel: 'shortcut icon', href: assets.faviconIco })

    const tile = document.querySelector('meta[name="msapplication-TileImage"]')
    if (tile && assets.mstile150) {
      tile.setAttribute('content', cacheBust(assets.mstile150))
    }

    const ogImage = document.querySelector('meta[property="og:image"]')
    if (ogImage) {
      ogImage.setAttribute('content', assets.ogImage ? cacheBust(resolveClientAssetUrl(assets.ogImage)) : '')
    }
  }

  if (typeof window !== 'undefined' && window.siteConfig) {
    window.siteConfig.logoUrl = assets.siteLogo
    window.siteConfig.loginBgUrl = assets.loginBackground
    window.siteConfig.assets = assets
  }

  if (store && assets.siteLogo) {
    store.set('site/logoUrl', assets.siteLogo)
  }
}
