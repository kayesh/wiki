#!/usr/bin/env node
/**
 * Normalize citation markup in page content for Visual Editor (CKEditor).
 *
 * CKEditor expects citations as:
 *   <div class="citation"><p>...</p></div>
 *
 * This script fixes content that still uses legacy / markdown-rendered shapes:
 *   <p class="citation">...</p>
 *   <div class="citation">raw text without paragraph</div>
 *
 * Markdown `{.citation}` blocks are left unchanged.
 *
 * Usage (local dev container):
 *   docker exec wiki-app sh -c "dockerdev=1 node dev/scripts/utils/fix-citation-markup-in-pages.js --dry-run"
 *   docker exec wiki-app sh -c "dockerdev=1 node dev/scripts/utils/fix-citation-markup-in-pages.js"
 *
 * Options:
 *   --dry-run       Print changes without writing
 *   --no-render     Update content only, skip re-render
 *   --locale=bn     Limit to one locale
 *   --path=1234     Limit to one page path
 *   --title-like=%  Limit to pages whose title matches (SQL LIKE)
 */

const path = require('path')
const cheerio = require('cheerio')
const _ = require('lodash')

const PCITATION_RE = /<p\b[^>]*class=["'][^"']*\bcitation\b[^"']*["'][^>]*>/i
const DIV_CITATION_RE = /<div\b[^>]*class=["'][^"']*\bcitation\b/i

function parseArgs (argv) {
  const args = {
    dryRun: false,
    noRender: false,
    locale: null,
    path: null,
    titleLike: null
  }

  for (const arg of argv) {
    if (arg === '--dry-run') { args.dryRun = true }
    else if (arg === '--no-render') { args.noRender = true }
    else if (arg.startsWith('--locale=')) { args.locale = arg.slice('--locale='.length) }
    else if (arg.startsWith('--path=')) { args.path = arg.slice('--path='.length) }
    else if (arg.startsWith('--title-like=')) { args.titleLike = arg.slice('--title-like='.length) }
  }

  return args
}

function hasCitationClass (className) {
  if (!className || typeof className !== 'string') { return false }
  return className.split(/\s+/).includes('citation')
}

function contentNeedsCitationFix (content) {
  if (!content || typeof content !== 'string') { return false }
  return PCITATION_RE.test(content) || DIV_CITATION_RE.test(content)
}

function buildCitationDiv ($, { style, innerHtml, extraClasses = [] }) {
  const classes = ['citation', ...extraClasses.filter(cls => cls && cls !== 'citation')]
  const $div = $('<div></div>').attr('class', classes.join(' '))

  if (style) {
    $div.attr('style', style)
  }

  const $p = $('<p></p>').html(innerHtml)
  $div.append($p)

  return $div
}

function fixCitationMarkup (content) {
  if (!contentNeedsCitationFix(content)) {
    return { content: content || '', count: 0, samples: [] }
  }

  const $ = cheerio.load(content, { decodeEntities: false }, false)
  let count = 0
  const samples = []

  $('p').each((idx, el) => {
    const $el = $(el)
    if (!hasCitationClass($el.attr('class'))) {
      return
    }

    const innerHtml = $el.html() || ''
    const style = $el.attr('style') || ''
    const extraClasses = ($el.attr('class') || '')
      .split(/\s+/)
      .filter(cls => cls && cls !== 'citation')

    const $div = buildCitationDiv($, { style, innerHtml, extraClasses })
    const before = $.html(el).trim()
    const after = $.html($div).trim()

    if (samples.length < 5) {
      samples.push({ before, after })
    }

    $el.replaceWith($div)
    count++
  })

  $('div').each((idx, el) => {
    const $el = $(el)
    if (!hasCitationClass($el.attr('class'))) {
      return
    }

    if ($el.children('p').length > 0) {
      return
    }

    const innerHtml = $el.html() || ''
    if (!innerHtml.trim()) {
      return
    }

    const style = $el.attr('style') || ''
    const extraClasses = ($el.attr('class') || '')
      .split(/\s+/)
      .filter(cls => cls && cls !== 'citation')

    const $div = buildCitationDiv($, {
      style,
      innerHtml,
      extraClasses
    })

    if (samples.length < 5) {
      samples.push({
        before: $.html(el).trim(),
        after: $.html($div).trim()
      })
    }

    $el.replaceWith($div)
    count++
  })

  return {
    content: $.root().html() || '',
    count,
    samples
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
  WIKI.logger = require('../../../server/core/logger').init('FIX-CITATION-MARKUP')

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

  const summary = {
    dryRun: args.dryRun,
    scanned: pages.length,
    withCitationMarkup: 0,
    updated: 0,
    skipped: 0,
    totalFixes: 0,
    rendered: 0,
    sample: [],
    errors: []
  }

  WIKI.logger.info(`Scanning ${pages.length} page(s)... dryRun=${args.dryRun}`)

  for (const page of pages) {
    try {
      if (!contentNeedsCitationFix(page.content)) {
        summary.skipped++
        continue
      }

      summary.withCitationMarkup++

      const { content, count, samples } = fixCitationMarkup(page.content)
      if (count === 0 || content === page.content) {
        summary.skipped++
        continue
      }

      summary.updated++
      summary.totalFixes += count

      WIKI.logger.info(
        `[UPDATE] ${page.localeCode}/${page.path} — ${page.title} (${count} citation block(s))`
      )

      if (summary.sample.length < 25) {
        summary.sample.push({
          page: `${page.localeCode}/${page.path}`,
          title: page.title,
          editorKey: page.editorKey,
          fixes: count,
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
  WIKI.logger.info(`Pages with citation markup: ${summary.withCitationMarkup}`)
  WIKI.logger.info(`${actionLabel}: ${summary.updated} page(s)`)
  WIKI.logger.info(`Skipped: ${summary.skipped}`)
  WIKI.logger.info(`Total citation blocks fixed: ${summary.totalFixes}`)
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
