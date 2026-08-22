export function parseConfigValue (rawValue) {
  if (!rawValue) {
    return { type: 'string', value: '' }
  }

  const parsed = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue
  if (!parsed || typeof parsed !== 'object') {
    return { type: 'string', value: parsed }
  }

  if (parsed.type && Object.prototype.hasOwnProperty.call(parsed, 'value')) {
    return parsed
  }

  if (Object.prototype.hasOwnProperty.call(parsed, 'v')) {
    return {
      ...parsed,
      type: parsed.type || (Array.isArray(parsed.v) ? 'json' : 'string'),
      value: parsed.v
    }
  }

  return parsed
}

export function getConfigFieldValue (cfg) {
  if (!cfg || !cfg.value) {
    return (cfg && Array.isArray(cfg.value)) ? cfg.value : ''
  }

  if (Object.prototype.hasOwnProperty.call(cfg.value, 'value')) {
    return cfg.value.value
  }

  if (Object.prototype.hasOwnProperty.call(cfg.value, 'v')) {
    return cfg.value.v
  }

  return cfg.value
}

export function normalizeUnicodeRange (value) {
  if (!value || !String(value).trim()) {
    return ''
  }
  return String(value)
    .split(',')
    .map(part => part.trim().toUpperCase())
    .filter(Boolean)
    .join(',')
}

export function buildFontCSS (fonts) {
  const normalized = (fonts || []).filter(font => font && font.family && font.filename && font.format)
  if (normalized.length < 1) {
    return ''
  }

  const faceRules = normalized.map(font => {
    const lines = [
      '@font-face {',
      `  font-family: ${font.family};`,
      `  src: url('/_custom/fonts/${encodeURIComponent(font.filename)}') format('${font.format}');`,
      `  font-weight: ${font.weight || 400};`,
      `  font-style: ${font.style || 'normal'};`
    ]
    if (font.unicodeRange) {
      lines.push(`  unicode-range: ${font.unicodeRange};`)
    }
    lines.push('}')
    return lines.join('\n')
  }).join('\n')

  const stack = `${[...new Set(normalized.map(font => font.family))].join(', ')}, sans-serif`
  const iconStack = `'Material Design Icons', sans-serif`
  const applyRule = (selector) => `${selector},
${selector} *:not(.v-icon) {
  font-family: ${stack} !important;
}

${selector} .v-icon {
  font-family: ${iconStack} !important;
  line-height: 1;
}`
  const applyRules = [
    applyRule('.v-main :is(.contents, .page-header-block, .page-col-sd, #arrow-boxes, .related-posts)'),
    applyRule('.v-application .v-navigation-drawer .__vuescroll'),
    applyRule('.v-application .nav-header .nav-header__site-title'),
    applyRule('.v-application .nav-header .v-toolbar__title')
  ].join('\n\n')

  return `${faceRules}\n\n${applyRules}`
}
