const _ = require('lodash')
const customFonts = require('./customFonts')

/* global WIKI */

const DEFAULT_ASSETS = {
  logo: {
    siteLogo: 'https://static.requarks.io/logo/wikijs-butterfly.svg'
  },
  favicons: {
    appleTouchIcon: '/_assets/favicons/apple-touch-icon.png',
    androidChrome192: '/_assets/favicons/android-chrome-192x192.png',
    androidChrome256: '/_assets/favicons/android-chrome-256x256.png',
    favicon32: '/_assets/favicons/favicon-32x32.png',
    favicon16: '/_assets/favicons/favicon-16x16.png',
    safariPinnedTab: '/_assets/favicons/safari-pinned-tab.svg',
    mstile150: '/_assets/favicons/mstile-150x150.png',
    faviconIco: '/_assets/favicon.ico'
  },
  backgrounds: {
    login: '/_assets/img/splash/1.jpg'
  },
  openGraph: {
    image: ''
  },
  customFonts: {
    fonts: []
  }
}

const MODULE_ORDER = {
  logo: 0,
  favicons: 1,
  backgrounds: 2,
  openGraph: 3,
  customFonts: 4
}

const MODULE_DEFS = [
  {
    key: 'logo',
    title: 'Logo',
    description: 'Site logo used in the header, login screen, and emails.',
    isAvailable: true,
    props: {
      siteLogo: {
        type: String,
        title: 'Site logo path',
        default: DEFAULT_ASSETS.logo.siteLogo,
        hint: 'Path or full URL. Used in the header, login page, and notification emails.',
        order: 1
      }
    }
  },
  {
    key: 'favicons',
    title: 'Favicons',
    description: 'Browser tab icons, Apple touch icon, pinned-tab, and PWA icons.',
    isAvailable: true,
    props: {
      appleTouchIcon: {
        type: String,
        title: 'Apple touch icon (180x180)',
        default: DEFAULT_ASSETS.favicons.appleTouchIcon,
        hint: 'Used as apple-touch-icon.',
        order: 1
      },
      androidChrome192: {
        type: String,
        title: 'Android / PWA icon (192x192)',
        default: DEFAULT_ASSETS.favicons.androidChrome192,
        hint: 'Used as the 192x192 favicon and PWA icon.',
        order: 2
      },
      androidChrome256: {
        type: String,
        title: 'PWA icon (256x256)',
        default: DEFAULT_ASSETS.favicons.androidChrome256,
        hint: 'Used in the web app manifest.',
        order: 3
      },
      favicon32: {
        type: String,
        title: 'Favicon 32x32',
        default: DEFAULT_ASSETS.favicons.favicon32,
        hint: 'Used as the 32x32 PNG favicon.',
        order: 4
      },
      favicon16: {
        type: String,
        title: 'Favicon 16x16',
        default: DEFAULT_ASSETS.favicons.favicon16,
        hint: 'Used as the 16x16 PNG favicon.',
        order: 5
      },
      safariPinnedTab: {
        type: String,
        title: 'Safari pinned tab',
        default: DEFAULT_ASSETS.favicons.safariPinnedTab,
        hint: 'SVG used as the Safari mask-icon.',
        order: 6
      },
      mstile150: {
        type: String,
        title: 'Microsoft tile (150x150)',
        default: DEFAULT_ASSETS.favicons.mstile150,
        hint: 'Used as msapplication-TileImage.',
        order: 7
      },
      faviconIco: {
        type: String,
        title: 'Favicon ICO',
        default: DEFAULT_ASSETS.favicons.faviconIco,
        hint: 'Used as the shortcut icon.',
        order: 8
      }
    }
  },
  {
    key: 'backgrounds',
    title: 'Backgrounds',
    description: 'Background images used on public screens.',
    isAvailable: true,
    props: {
      login: {
        type: String,
        title: 'Login background path',
        default: DEFAULT_ASSETS.backgrounds.login,
        hint: 'Path or full URL. Shown behind the login and password-reset screens.',
        order: 1
      }
    }
  },
  {
    key: 'openGraph',
    title: 'Open Graph',
    description: 'Default social sharing image used for og:image meta tags.',
    isAvailable: true,
    props: {
      image: {
        type: String,
        title: 'og:image path',
        default: DEFAULT_ASSETS.openGraph.image,
        hint: 'Path or full URL. Recommended size is 1200×630. Used when sharing links on social platforms.',
        order: 1
      }
    }
  },
  {
    key: 'customFonts',
    title: 'Custom Fonts',
    description: 'Upload font files (.ttf, .otf, .woff, .woff2). @font-face rules are generated automatically and injected on every page.',
    isAvailable: true,
    props: {
      fonts: {
        type: 'json',
        title: 'Custom fonts',
        default: [],
        hint: 'Upload font files and configure family name, weight, and unicode range.',
        order: 1
      }
    }
  }
]

function wikiConfig () {
  return (typeof WIKI !== 'undefined' && WIKI.config) || {}
}

function pickPath (...candidates) {
  for (const candidate of candidates) {
    if (_.isString(candidate) && candidate.trim()) {
      return candidate.trim()
    }
  }
  return ''
}

function resolvePublicAssetUrl (path, host) {
  const trimmed = pickPath(path)
  if (!trimmed) {
    return ''
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  const base = String(host || '').replace(/\/$/, '')
  return `${base}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`
}

function moduleEnabled (stored, key) {
  return _.get(stored, `${key}.isEnabled`, true) !== false
}

function getStoredCustomFonts (config) {
  const assetFonts = _.get(config, 'assets.customFonts.fonts')
  const themeFonts = _.get(config, 'theming.customFonts')

  if (_.isArray(assetFonts) && assetFonts.length > 0) {
    return customFonts.normalizeFonts(assetFonts)
  }
  if (_.isArray(themeFonts) && themeFonts.length > 0) {
    return customFonts.normalizeFonts(themeFonts)
  }
  if (_.isArray(assetFonts)) {
    return customFonts.normalizeFonts(assetFonts)
  }
  return customFonts.normalizeFonts(themeFonts || DEFAULT_ASSETS.customFonts.fonts)
}

function getStoredAssets () {
  const config = wikiConfig()
  return {
    logo: {
      isEnabled: _.get(config, 'assets.logo.isEnabled', true) !== false,
      siteLogo: pickPath(
        _.get(config, 'assets.logo.siteLogo'),
        config.logoUrl,
        DEFAULT_ASSETS.logo.siteLogo
      )
    },
    favicons: {
      isEnabled: _.get(config, 'assets.favicons.isEnabled', true) !== false,
      appleTouchIcon: pickPath(_.get(config, 'assets.favicons.appleTouchIcon'), DEFAULT_ASSETS.favicons.appleTouchIcon),
      androidChrome192: pickPath(_.get(config, 'assets.favicons.androidChrome192'), DEFAULT_ASSETS.favicons.androidChrome192),
      androidChrome256: pickPath(_.get(config, 'assets.favicons.androidChrome256'), DEFAULT_ASSETS.favicons.androidChrome256),
      favicon32: pickPath(_.get(config, 'assets.favicons.favicon32'), DEFAULT_ASSETS.favicons.favicon32),
      favicon16: pickPath(_.get(config, 'assets.favicons.favicon16'), DEFAULT_ASSETS.favicons.favicon16),
      safariPinnedTab: pickPath(_.get(config, 'assets.favicons.safariPinnedTab'), DEFAULT_ASSETS.favicons.safariPinnedTab),
      mstile150: pickPath(_.get(config, 'assets.favicons.mstile150'), DEFAULT_ASSETS.favicons.mstile150),
      faviconIco: pickPath(_.get(config, 'assets.favicons.faviconIco'), DEFAULT_ASSETS.favicons.faviconIco)
    },
    backgrounds: {
      isEnabled: _.get(config, 'assets.backgrounds.isEnabled', true) !== false,
      login: pickPath(
        _.get(config, 'assets.backgrounds.login'),
        _.get(config, 'auth.loginBgUrl'),
        DEFAULT_ASSETS.backgrounds.login
      )
    },
    openGraph: {
      isEnabled: _.get(config, 'assets.openGraph.isEnabled', true) !== false,
      image: pickPath(_.get(config, 'assets.openGraph.image'), DEFAULT_ASSETS.openGraph.image)
    },
    customFonts: {
      isEnabled: _.get(config, 'assets.customFonts.isEnabled', true) !== false,
      fonts: getStoredCustomFonts(config)
    }
  }
}

function getResolvedAssets () {
  const stored = getStoredAssets()
  const logo = moduleEnabled(stored, 'logo') ? stored.logo : { ...DEFAULT_ASSETS.logo }
  const favicons = moduleEnabled(stored, 'favicons') ? stored.favicons : { ...DEFAULT_ASSETS.favicons }
  const backgrounds = moduleEnabled(stored, 'backgrounds') ? stored.backgrounds : { ...DEFAULT_ASSETS.backgrounds }
  const openGraph = moduleEnabled(stored, 'openGraph') ? stored.openGraph : { ...DEFAULT_ASSETS.openGraph }

  return {
    siteLogo: logo.siteLogo,
    appleTouchIcon: favicons.appleTouchIcon,
    androidChrome192: favicons.androidChrome192,
    androidChrome256: favicons.androidChrome256,
    favicon32: favicons.favicon32,
    favicon16: favicons.favicon16,
    safariPinnedTab: favicons.safariPinnedTab,
    mstile150: favicons.mstile150,
    faviconIco: favicons.faviconIco,
    loginBackground: backgrounds.login,
    ogImage: openGraph.image
  }
}

function getProviders () {
  const stored = getStoredAssets()
  return _.sortBy(MODULE_DEFS.map(def => ({
    key: def.key,
    title: def.title,
    description: def.description,
    isAvailable: def.isAvailable,
    isEnabled: stored[def.key].isEnabled !== false,
    logo: null,
    website: null,
    config: _.sortBy(_.map(def.props, (prop, key) => ({
      key,
      value: JSON.stringify({
        ...prop,
        type: prop.type || 'string',
        value: stored[def.key][key]
      })
    })), item => {
      try {
        return JSON.parse(item.value).order || 100
      } catch (err) {
        return 100
      }
    })
  })), provider => MODULE_ORDER[provider.key] ?? 100)
}

function applyProviders (providers) {
  const next = getStoredAssets()

  for (const provider of providers || []) {
    if (!next[provider.key]) {
      continue
    }
    next[provider.key].isEnabled = provider.isEnabled !== false
    for (const cfg of provider.config || []) {
      const parsed = _.isString(cfg.value) ? JSON.parse(cfg.value) : cfg.value
      const value = _.get(parsed, 'v', _.get(parsed, 'value', ''))
      if (provider.key === 'customFonts' && cfg.key === 'fonts') {
        next.customFonts.fonts = customFonts.normalizeFonts(value)
        continue
      }
      if (Object.prototype.hasOwnProperty.call(next[provider.key], cfg.key)) {
        const fallback = DEFAULT_ASSETS[provider.key][cfg.key]
        next[provider.key][cfg.key] = pickPath(value) || (fallback !== undefined ? fallback : '')
      }
    }
  }

  const config = wikiConfig()
  config.assets = next

  const resolved = getResolvedAssets()
  config.logoUrl = resolved.siteLogo
  config.auth = {
    ...(config.auth || {}),
    loginBgUrl: next.backgrounds.isEnabled ? next.backgrounds.login : ''
  }
  config.theming = {
    ...(config.theming || {}),
    customFonts: moduleEnabled(next, 'customFonts') ? next.customFonts.fonts : []
  }

  return resolved
}

function syncLogoUrl (logoUrl) {
  const config = wikiConfig()
  const next = getStoredAssets()
  next.logo.siteLogo = pickPath(logoUrl, DEFAULT_ASSETS.logo.siteLogo)
  config.assets = next
  return next
}

function syncLoginBgUrl (loginBgUrl) {
  const config = wikiConfig()
  const next = getStoredAssets()
  next.backgrounds.login = pickPath(loginBgUrl, DEFAULT_ASSETS.backgrounds.login)
  config.assets = next
  return next
}

module.exports = {
  DEFAULT_ASSETS,
  MODULE_DEFS,
  MODULE_ORDER,
  getStoredAssets,
  getResolvedAssets,
  getProviders,
  applyProviders,
  syncLogoUrl,
  syncLoginBgUrl,
  resolvePublicAssetUrl
}
