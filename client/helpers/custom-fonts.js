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

const BENGALI_UNICODE_RANGE_RE = new RegExp('U\\+0980-09FF', 'i')
const ARABIC_UNICODE_RANGE_RE = new RegExp(
  'U\\+0?600-0?6FF|U\\+0?750-0?77F|U\\+0?8A0-0?8FF|U\\+FB50-FDFF|U\\+FE70-FEFF|U\\+10E60-10E7F',
  'i'
)

const BENGALI_LINE_GAP_OVERRIDE = '85%'
const ARABIC_LINE_GAP_OVERRIDE = '100%'

function matchesUnicodeRange (unicodeRange, pattern) {
  if (!unicodeRange || !String(unicodeRange).trim()) {
    return false
  }

  return String(unicodeRange)
    .split(',')
    .some(part => pattern.test(part.trim()))
}

export function isBengaliUnicodeRange (unicodeRange) {
  return matchesUnicodeRange(unicodeRange, BENGALI_UNICODE_RANGE_RE)
}

export function isArabicUnicodeRange (unicodeRange) {
  return matchesUnicodeRange(unicodeRange, ARABIC_UNICODE_RANGE_RE)
}

export function buildFontCSS (fonts) {
  const normalized = (fonts || []).filter(font => font && font.family && font.filename && font.format)
  if (normalized.length < 1) {
    return ''
  }

  const faceRules = normalized.map(font => {
    const unicodeRange = font.unicodeRange ? normalizeUnicodeRange(font.unicodeRange) : ''
    const lines = [
      '@font-face {',
      `  font-family: ${font.family};`,
      `  src: url('/_custom/fonts/${encodeURIComponent(font.filename)}') format('${font.format}');`,
      `  font-weight: ${font.weight || 400};`,
      `  font-style: ${font.style || 'normal'};`
    ]
    if (unicodeRange) {
      lines.push(`  unicode-range: ${unicodeRange};`)
    }
    if (isBengaliUnicodeRange(unicodeRange)) {
      lines.push(`  line-gap-override: ${BENGALI_LINE_GAP_OVERRIDE};`)
    } else if (isArabicUnicodeRange(unicodeRange)) {
      lines.push(`  line-gap-override: ${ARABIC_LINE_GAP_OVERRIDE};`)
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

  const applyTargets = [
    '.v-main :is(.contents, .page-header-block, .page-col-sd, #arrow-boxes, .related-posts)',
    '.v-application.admin .v-main',
    '.v-application .v-navigation-drawer .__vuescroll',
    '.v-application .nav-header .nav-header__site-title',
    '.v-application .nav-header .v-toolbar__title'
  ]
  const applyRules = applyTargets.map(applyRule).join('\n\n')

  return `${faceRules}\n\n${applyRules}`
}
