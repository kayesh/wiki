const {
  DEFAULT_ASSETS,
  getResolvedAssets,
  getProviders,
  applyProviders,
  syncLogoUrl,
  resolvePublicAssetUrl
} = require('../../helpers/assets')

describe('helpers/assets', () => {
  const originalWiki = global.WIKI

  beforeEach(() => {
    global.WIKI = {
      config: {
        logoUrl: DEFAULT_ASSETS.logo.siteLogo,
        auth: { loginBgUrl: '' },
        theming: { customFonts: [] }
      }
    }
  })

  afterEach(() => {
    global.WIKI = originalWiki
  })

  it('resolves current hardcoded defaults when no assets config exists', () => {
    const assets = getResolvedAssets()

    expect(assets.siteLogo).toBe(DEFAULT_ASSETS.logo.siteLogo)
    expect(assets.appleTouchIcon).toBe(DEFAULT_ASSETS.favicons.appleTouchIcon)
    expect(assets.androidChrome192).toBe(DEFAULT_ASSETS.favicons.androidChrome192)
    expect(assets.androidChrome256).toBe(DEFAULT_ASSETS.favicons.androidChrome256)
    expect(assets.favicon32).toBe(DEFAULT_ASSETS.favicons.favicon32)
    expect(assets.favicon16).toBe(DEFAULT_ASSETS.favicons.favicon16)
    expect(assets.safariPinnedTab).toBe(DEFAULT_ASSETS.favicons.safariPinnedTab)
    expect(assets.mstile150).toBe(DEFAULT_ASSETS.favicons.mstile150)
    expect(assets.faviconIco).toBe(DEFAULT_ASSETS.favicons.faviconIco)
    expect(assets.loginBackground).toBe(DEFAULT_ASSETS.backgrounds.login)
  })

  it('prefills providers from the current logo and login background', () => {
    WIKI.config.logoUrl = '/uploads/logo.svg'
    WIKI.config.auth.loginBgUrl = '/uploads/login.jpg'

    const providers = getProviders()
    const logo = providers.find(p => p.key === 'logo')
    const backgrounds = providers.find(p => p.key === 'backgrounds')
    const logoCfg = JSON.parse(logo.config.find(c => c.key === 'siteLogo').value)
    const loginCfg = JSON.parse(backgrounds.config.find(c => c.key === 'login').value)

    expect(logoCfg.value).toBe('/uploads/logo.svg')
    expect(loginCfg.value).toBe('/uploads/login.jpg')
  })

  it('returns providers with logo first', () => {
    const providers = getProviders()

    expect(providers.map(p => p.key)).toEqual([
      'logo',
      'favicons',
      'backgrounds',
      'openGraph',
      'customFonts'
    ])
  })

  it('applies new paths immediately to resolved assets and synced config', () => {
    applyProviders([
      {
        key: 'logo',
        isEnabled: true,
        config: [{ key: 'siteLogo', value: JSON.stringify({ v: '/uploads/new-logo.png' }) }]
      },
      {
        key: 'favicons',
        isEnabled: true,
        config: [{ key: 'favicon32', value: JSON.stringify({ v: '/uploads/favicon-32.png' }) }]
      },
      {
        key: 'backgrounds',
        isEnabled: true,
        config: [{ key: 'login', value: JSON.stringify({ v: '/uploads/bg.jpg' }) }]
      }
    ])

    const assets = getResolvedAssets()
    expect(assets.siteLogo).toBe('/uploads/new-logo.png')
    expect(assets.favicon32).toBe('/uploads/favicon-32.png')
    expect(assets.loginBackground).toBe('/uploads/bg.jpg')
    expect(WIKI.config.logoUrl).toBe('/uploads/new-logo.png')
    expect(WIKI.config.auth.loginBgUrl).toBe('/uploads/bg.jpg')
  })

  it('falls back to built-in defaults when a module is disabled', () => {
    WIKI.config.assets = {
      logo: { isEnabled: false, siteLogo: '/uploads/custom.svg' },
      favicons: { isEnabled: false, favicon32: '/uploads/custom-32.png' },
      backgrounds: { isEnabled: false, login: '/uploads/custom-bg.jpg' }
    }

    const assets = getResolvedAssets()
    expect(assets.siteLogo).toBe(DEFAULT_ASSETS.logo.siteLogo)
    expect(assets.favicon32).toBe(DEFAULT_ASSETS.favicons.favicon32)
    expect(assets.loginBackground).toBe(DEFAULT_ASSETS.backgrounds.login)
  })

  it('keeps general and security fields in sync', () => {
    syncLogoUrl('/uploads/from-general.svg')
    syncLoginBgUrl('/uploads/from-security.jpg')

    const assets = getResolvedAssets()
    expect(assets.siteLogo).toBe('/uploads/from-general.svg')
    expect(assets.loginBackground).toBe('/uploads/from-security.jpg')
  })

  it('resolves public asset urls for open graph images', () => {
    expect(resolvePublicAssetUrl('/assets/og.png', 'https://wiki.example.com')).toBe('https://wiki.example.com/assets/og.png')
    expect(resolvePublicAssetUrl('https://cdn.example.com/og.png', 'https://wiki.example.com')).toBe('https://cdn.example.com/og.png')
  })

  it('applies open graph image paths to resolved assets', () => {
    applyProviders([
      {
        key: 'openGraph',
        isEnabled: true,
        config: [{ key: 'image', value: JSON.stringify({ v: '/assets/og-image.png' }) }]
      }
    ])

    const assets = getResolvedAssets()
    expect(assets.ogImage).toBe('/assets/og-image.png')
  })

  it('prefills custom fonts from legacy theming config when assets fonts are empty', () => {
    WIKI.config.theming.customFonts = [{
      id: 'font-legacy',
      family: 'solaimanlipi',
      filename: 'solaimanlipi.woff2',
      format: 'woff2',
      weight: 400,
      style: 'normal',
      unicodeRange: 'U+0980-09FF'
    }]
    WIKI.config.assets = {
      customFonts: {
        isEnabled: true,
        fonts: []
      }
    }

    const providers = getProviders()
    const customFontsProvider = providers.find(p => p.key === 'customFonts')
    const fontsCfg = JSON.parse(customFontsProvider.config.find(c => c.key === 'fonts').value)

    expect(fontsCfg.value).toHaveLength(1)
    expect(fontsCfg.value[0].family).toBe('solaimanlipi')
  })

  it('stores custom fonts in assets and syncs theming config', () => {
    applyProviders([
      {
        key: 'customFonts',
        isEnabled: true,
        config: [{
          key: 'fonts',
          value: JSON.stringify({
            v: [{
              id: 'font-1',
              family: 'solaimanlipi',
              filename: 'solaimanlipi.woff2',
              format: 'woff2',
              weight: 400,
              style: 'normal',
              unicodeRange: 'U+0980-09FF'
            }]
          })
        }]
      }
    ])

    const providers = getProviders()
    const customFonts = providers.find(p => p.key === 'customFonts')
    const fontsCfg = JSON.parse(customFonts.config.find(c => c.key === 'fonts').value)

    expect(fontsCfg.value).toHaveLength(1)
    expect(fontsCfg.value[0].family).toBe('solaimanlipi')
    expect(WIKI.config.theming.customFonts).toHaveLength(1)
    expect(WIKI.config.assets.customFonts.fonts).toHaveLength(1)
  })
})
