#!/usr/bin/env node
/**
 * Convert legacy h5 "note" blocks into citation markup.
 *
 * Previously, h5 headings were styled as compact note/citation boxes. This script
 * rewrites them to the dedicated citation format:
 *
 *   Markdown editor:
 *     (note text)
 *     {.citation}
 *
 *   HTML / Visual editor:
 *     <div class="citation"><p>note text</p></div>
 *
 * Handles:
 *   - Markdown lines: ##### note text
 *   - HTML in content: <h5>...</h5> (including pasted toc-header / toc-anchor markup)
 *   - Preserves inline formatting inside the h5
 *   - Preserves text-align when not left-aligned (uses inline HTML in markdown)
 *
 * Usage (local dev container):
 *   docker exec wiki-app sh -c "dockerdev=1 node dev/scripts/utils/convert-h5-to-citation-in-pages.js --dry-run"
 *   docker exec wiki-app sh -c "dockerdev=1 node dev/scripts/utils/convert-h5-to-citation-in-pages.js"
 *
 * Options:
 *   --dry-run       Print changes without writing
 *   --no-render     Update content only, skip re-render
 *   --locale=bn     Limit to one locale
 *   --path=1234     Limit to one page path
 *   --title-like=%  Limit to pages whose title matches (SQL LIKE)
 *   --format=auto   Output format: auto (from editorKey), markdown, or html
 *   --level=5       Heading level to convert (default: 5)
 */

const path = require('path')
const cheerio = require('cheerio')
const _ = require('lodash')

function parseArgs (argv) {
  const args = {
    dryRun: false,
    noRender: false,
    locale: null,
    path: null,
    titleLike: null,
    format: 'auto',
    level: 5
  }

  for (const arg of argv) {
    if (arg === '--dry-run') { args.dryRun = true }
    else if (arg === '--no-render') { args.noRender = true }
    else if (arg.startsWith('--locale=')) { args.locale = arg.slice('--locale='.length) }
    else if (arg.startsWith('--path=')) { args.path = arg.slice('--path='.length) }
    else if (arg.startsWith('--title-like=')) { args.titleLike = arg.slice('--title-like='.length) }
    else if (arg.startsWith('--format=')) { args.format = arg.slice('--format='.length) }
    else if (arg.startsWith('--level=')) {
      args.level = _.toSafeInteger(arg.slice('--level='.length))
    }
  }

  return args
}

function validateArgs (args) {
  if (!Number.isInteger(args.level) || args.level < 1 || args.level > 6) {
    throw new Error('--level must be an integer between 1 and 6')
  }

  if (!['auto', 'markdown', 'html'].includes(args.format)) {
    throw new Error('--format must be auto, markdown, or html')
  }
}

function headingPrefix (level) {
  return '#'.repeat(level)
}

function markdownHeadingLineRe (level) {
  const hashes = headingPrefix(level)
  return new RegExp(`^${hashes}\\s+(.+?)\\s*$`)
}

function htmlHeadingTag (level) {
  return `h${level}`
}

function extractTextAlign (style) {
  if (!style || typeof style !== 'string') { return null }
  const match = style.match(/text-align\s*:\s*([^;]+)/i)
  return match ? match[1].trim().toLowerCase() : null
}

function isDefaultAlignment (align) {
  return !align || align === 'left' || align === 'start' || align === 'initial' || align === 'inherit'
}

function stripHeadingDecorations ($, el) {
  const clone = $(el).clone()
  clone.find('.toc-anchor').remove()
  clone.find('a.toc-anchor').remove()
  return clone
}

function getHeadingInnerHtml ($, el) {
  return stripHeadingDecorations($, el).html().trim()
}

function buildCitationMarkdown (innerHtml, align) {
  if (!isDefaultAlignment(align)) {
    return `<p class="citation" style="text-align: ${align}">${innerHtml}</p>`
  }

  return `${innerHtml}\n{.citation}`
}

function buildCitationHtml (innerHtml, align) {
  const styleAttr = !isDefaultAlignment(align) ? ` style="text-align: ${align}"` : ''

  return `<div class="citation"${styleAttr}><p>${innerHtml}</p></div>`
}

function buildCitation (innerHtml, align, format) {
  if (format === 'markdown') {
    return buildCitationMarkdown(innerHtml, align)
  }

  return buildCitationHtml(innerHtml, align)
}

function resolveOutputFormat (page, args) {
  if (args.format !== 'auto') {
    return args.format
  }

  return page.editorKey === 'markdown' ? 'markdown' : 'html'
}

function contentHasTargetHeading (content, level) {
  if (!content || typeof content !== 'string') { return false }

  const tagRe = new RegExp(`<${htmlHeadingTag(level)}[\\s>]`, 'i')
  if (tagRe.test(content)) {
    return true
  }

  const prefix = headingPrefix(level)
  return content.split('\n').some(line => line.startsWith(`${prefix} `))
}

function convertHtmlHeadings (content, level, format) {
  const tag = htmlHeadingTag(level)
  const tagRe = new RegExp(`<${tag}[\\s>]`, 'i')

  if (!tagRe.test(content || '')) {
    return { content: content || '', count: 0, samples: [] }
  }

  const $ = cheerio.load(content, { decodeEntities: false }, false)
  let count = 0
  const samples = []

  $(tag).each((idx, el) => {
    const innerHtml = getHeadingInnerHtml($, el)
    if (!innerHtml) {
      $(el).remove()
      count++
      return
    }

    const align = extractTextAlign($(el).attr('style'))
    const replacement = buildCitation(innerHtml, align, format)

    if (samples.length < 5) {
      samples.push({
        before: $.html(el).trim(),
        after: replacement
      })
    }

    $(el).replaceWith(replacement)
    count++
  })

  return {
    content: $.root().html() || '',
    count,
    samples
  }
}

function convertMarkdownHeadingLines (content, level, format) {
  if (!content || typeof content !== 'string') {
    return { content: content || '', count: 0, samples: [] }
  }

  const lineRe = markdownHeadingLineRe(level)
  const prefix = headingPrefix(level)
  const lines = content.split('\n')
  const nextLines = []
  let count = 0
  const samples = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (!line.startsWith(`${prefix} `)) {
      nextLines.push(line)
      continue
    }

    const match = line.match(lineRe)
    if (!match) {
      nextLines.push(line)
      continue
    }

    const innerHtml = match[1].trim()
    if (!innerHtml) {
      nextLines.push(line)
      continue
    }

    const nextLine = (lines[i + 1] || '').trim()
    if (nextLine === '{.citation}' || /^<p\b[^>]*class=["'][^"']*\bcitation\b/i.test(nextLine)) {
      nextLines.push(line)
      continue
    }

    const replacement = buildCitation(innerHtml, null, format)
    if (samples.length < 5) {
      samples.push({
        before: line,
        after: replacement.replace(/\n/g, '\\n')
      })
    }

    nextLines.push(replacement)
    count++
  }

  return {
    content: nextLines.join('\n'),
    count,
    samples
  }
}

function convertPageContent (page, args) {
  const format = resolveOutputFormat(page, args)
  const original = page.content || ''

  const htmlResult = convertHtmlHeadings(original, args.level, format)
  const mdResult = convertMarkdownHeadingLines(htmlResult.content, args.level, format)

  return {
    content: mdResult.content,
    count: htmlResult.count + mdResult.count,
    format,
    samples: [...htmlResult.samples, ...mdResult.samples]
  }
}

async function renderPage (pageId) {
  const page = await WIKI.models.pages.getPageFromDb(pageId)
  if (!page) {
    throw new Error(`Invalid page id ${pageId}`)
  }

  await WIKI.models.renderers.fetchDefinitions()
  const pipeline = await WIKI.models.renderers.getRenderingPipeline(page.contentType)

  let output = page.content
  for (const core of pipeline) {
    const renderer = require(path.join(WIKI.SERVERPATH, 'modules/rendering', `${_.kebabCase(core.key)}/renderer.js`))
    output = await renderer.render.call({
      config: core.config,
      children: core.children,
      page,
      input: output
    })
  }

  const $ = cheerio.load(output)
  const isStrict = $('h1').length > 0
  const toc = { root: [] }

  $('h1,h2,h3,h4,h5,h6').each((idx, el) => {
    const depth = _.toSafeInteger(el.name.substring(1)) - (isStrict ? 1 : 2)
    let leafPathError = false

    const leafPath = _.reduce(_.times(depth), (curPath) => {
      if (_.has(toc, curPath)) {
        const lastLeafIdx = _.get(toc, curPath).length - 1
        if (lastLeafIdx >= 0) {
          curPath = `${curPath}[${lastLeafIdx}].children`
        } else {
          leafPathError = true
        }
      }
      return curPath
    }, 'root')

    if (leafPathError) { return }

    const leafSlug = $('.toc-anchor', el).first().attr('href')
    $('.toc-anchor', el).remove()

    _.get(toc, leafPath).push({
      title: _.trim($(el).text()),
      anchor: leafSlug,
      children: []
    })
  })

  await WIKI.models.pages.query()
    .patch({
      render: output,
      toc: JSON.stringify(toc.root)
    })
    .where('id', page.id)

  await WIKI.models.pages.savePageToCache({
    ...page,
    render: output,
    toc: JSON.stringify(toc.root)
  })
}

async function main () {
  const args = parseArgs(process.argv.slice(2))
  validateArgs(args)

  if (!process.env.dockerdev && !process.env.CONFIG_FILE) {
    process.env.dockerdev = '1'
  }

  global.WIKI = {
    ROOTPATH: path.resolve(__dirname, '../../..'),
    SERVERPATH: path.resolve(__dirname, '../../../server'),
    IS_DEBUG: false
  }

  WIKI.configSvc = require('../../../server/core/config')
  WIKI.configSvc.init()
  WIKI.logger = require('../../../server/core/logger').init('CONVERT-H5-TO-CITATION')

  WIKI.models = require('../../../server/core/db').init()
  await WIKI.configSvc.loadFromDb()
  await WIKI.configSvc.applyFlags()

  WIKI.logger.info(
    `Postgres: ${WIKI.config.db.user}@${WIKI.config.db.host}:${WIKI.config.db.port}/${WIKI.config.db.db}`
  )

  let query = WIKI.models.pages.query()
    .select('id', 'path', 'localeCode', 'title', 'content', 'contentType', 'editorKey')

  if (args.locale) {
    query = query.where('localeCode', args.locale)
  }
  if (args.path) {
    query = query.where('path', args.path)
  }
  if (args.titleLike) {
    query = query.where('title', 'like', args.titleLike)
  }

  const pages = await query.orderBy('path', 'asc')
  const tag = htmlHeadingTag(args.level)

  const summary = {
    dryRun: args.dryRun,
    level: args.level,
    format: args.format,
    scanned: pages.length,
    withTargetHeading: 0,
    updated: 0,
    skipped: 0,
    totalConversions: 0,
    rendered: 0,
    sample: [],
    errors: []
  }

  WIKI.logger.info(
    `Scanning ${pages.length} page(s) for h${args.level} → citation ` +
    `format=${args.format} dryRun=${args.dryRun}`
  )

  for (const page of pages) {
    try {
      if (!contentHasTargetHeading(page.content, args.level)) {
        summary.skipped++
        continue
      }

      summary.withTargetHeading++

      const { content, count, format, samples } = convertPageContent(page, args)
      if (count === 0) {
        summary.skipped++
        continue
      }

      summary.updated++
      summary.totalConversions += count

      WIKI.logger.info(
        `[UPDATE] ${page.localeCode}/${page.path} — ${page.title} ` +
        `(${count} h${args.level} → citation, format=${format})`
      )

      if (summary.sample.length < 25) {
        summary.sample.push({
          page: `${page.localeCode}/${page.path}`,
          title: page.title,
          editorKey: page.editorKey,
          conversions: count,
          format,
          examples: samples.slice(0, 2)
        })
      }

      if (args.dryRun) {
        for (const example of samples.slice(0, 2)) {
          WIKI.logger.info(`  before: ${example.before}`)
          WIKI.logger.info(`  after:  ${example.after}`)
        }
        continue
      }

      await WIKI.models.pages.query()
        .patch({ content })
        .where('id', page.id)

      if (!args.noRender) {
        await renderPage(page.id)
        summary.rendered++
      }
    } catch (err) {
      summary.errors.push({ page: `${page.localeCode}/${page.path}`, message: err.message })
      WIKI.logger.error(`Failed on ${page.localeCode}/${page.path}: ${err.message}`)
    }
  }

  const actionLabel = args.dryRun ? 'Would update' : 'Updated'
  WIKI.logger.info('Done.')
  WIKI.logger.info(`Pages with h${args.level}: ${summary.withTargetHeading}`)
  WIKI.logger.info(`${actionLabel}: ${summary.updated} page(s)`)
  WIKI.logger.info(`Skipped: ${summary.skipped}`)
  WIKI.logger.info(`Total h${args.level} converted: ${summary.totalConversions}`)
  if (!args.dryRun && summary.rendered > 0) {
    WIKI.logger.info(`Re-rendered: ${summary.rendered}`)
  }
  WIKI.logger.info(JSON.stringify(summary, null, 2))

  await WIKI.models.knex.destroy()
  process.exit(summary.errors.length > 0 ? 1 : 0)
}

main().catch(err => {
  console.error(err.message || err)
  process.exit(1)
})
