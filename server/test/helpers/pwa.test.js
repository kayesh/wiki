const { getWebAppManifest, PWA_DEFAULT_APP_NAME } = require('../../helpers/pwa')
const {
  getSiteDisplayName,
  PWA_APP_NAME,
  DEFAULT_WIKI_TITLE
} = require('../../helpers/siteDisplayName')

describe('helpers/pwa/getWebAppManifest', () => {
  const originalWiki = global.WIKI

  beforeEach(() => {
    global.WIKI = {
      config: {
        title: DEFAULT_WIKI_TITLE
      }
    }
  })

  afterEach(() => {
    global.WIKI = originalWiki
  })

  it('exports PWA default app name from central config', () => {
    expect(PWA_DEFAULT_APP_NAME).toBe(PWA_APP_NAME)
    expect(PWA_DEFAULT_APP_NAME).toBe('Sunni Noor')
  })

  it('uses Latin PWA app name in manifest when site title is Wiki.js default', () => {
    const manifest = getWebAppManifest()

    expect(manifest.name).toBe('Sunni Noor')
    expect(manifest.short_name).toBe('Sunni Noor')
    expect(manifest.lang).toBe('en')
    expect(manifest.id).toBe('/pwa/sunni-noor')
    expect(manifest.id).not.toBe('/')
  })

  it('keeps Latin PWA app name when admin site title is customized', () => {
    WIKI.config.title = 'Custom Wiki'

    const manifest = getWebAppManifest()

    expect(manifest.name).toBe('Sunni Noor')
    expect(manifest.short_name).toBe('Sunni Noor')
  })

  it('uses customized PWA icon paths from asset config', () => {
    WIKI.config.assets = {
      favicons: {
        isEnabled: true,
        androidChrome192: '/uploads/pwa-192.png',
        androidChrome256: '/uploads/pwa-256.png'
      }
    }

    const manifest = getWebAppManifest()
    expect(manifest.icons[0].src).toBe('/uploads/pwa-192.png')
    expect(manifest.icons[1].src).toBe('/uploads/pwa-256.png')
  })

  it('does not use Bengali site display name in manifest', () => {
    const manifest = getWebAppManifest()
    const siteName = getSiteDisplayName()

    expect(siteName).toBe('সুন্নি নূর')
    expect(manifest.name).not.toBe(siteName)
    expect(manifest.short_name).not.toBe(siteName)
  })
})
