/* THEME SPECIFIC JAVASCRIPT */

const ARABIC_CHAR_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
const ARABIC_RUN_RE = /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF][\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0660-\u06690-9\s.,;:!?،؛؟'"“”‘’\-\/]*)/g
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'KBD', 'SAMP'])

function wrapArabicRunsInTextNode(textNode) {
  const text = textNode.nodeValue
  if (!text || !ARABIC_CHAR_RE.test(text)) {
    return
  }

  let lastIdx = 0
  const fragment = document.createDocumentFragment()
  text.replace(ARABIC_RUN_RE, (match, run, offset) => {
    if (offset > lastIdx) {
      fragment.appendChild(document.createTextNode(text.slice(lastIdx, offset)))
    }
    const span = document.createElement('span')
    span.setAttribute('lang', 'ar')
    span.setAttribute('dir', 'rtl')
    span.textContent = run
    fragment.appendChild(span)
    lastIdx = offset + run.length
    return match
  })

  if (lastIdx < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIdx)))
  }

  textNode.parentNode.replaceChild(fragment, textNode)
}

function processBlockquote(blockquote) {
  if (blockquote.dataset.arabicWrapped === '1') {
    return
  }

  const walker = document.createTreeWalker(blockquote, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent || SKIP_TAGS.has(parent.tagName)) {
        return NodeFilter.FILTER_REJECT
      }
      if (parent.closest('script, style, code, pre, kbd, samp')) {
        return NodeFilter.FILTER_REJECT
      }
      return NodeFilter.FILTER_ACCEPT
    }
  })

  const textNodes = []
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode)
  }
  textNodes.forEach(wrapArabicRunsInTextNode)

  blockquote.dataset.arabicWrapped = '1'
}

function processAllBlockquotes(root = document) {
  root.querySelectorAll('.v-main .contents blockquote').forEach(processBlockquote)
}

function initArabicLineHeightSupport() {
  processAllBlockquotes()

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(node => {
        if (!(node instanceof HTMLElement)) {
          return
        }
        if (node.matches && node.matches('.v-main .contents blockquote')) {
          processBlockquote(node)
        } else if (node.querySelectorAll) {
          processAllBlockquotes(node)
        }
      })
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initArabicLineHeightSupport)
} else {
  initArabicLineHeightSupport()
}
