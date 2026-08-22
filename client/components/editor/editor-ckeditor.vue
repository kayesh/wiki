<template lang='pug'>
  .editor-ckeditor
    div(ref='toolbarContainer')
    div.contents(ref='editor')
    v-system-bar.editor-ckeditor-sysbar(dark, status, color='grey darken-3')
      .caption.editor-ckeditor-sysbar-locale {{locale.toUpperCase()}}
      .caption.px-3 /{{path}}
      template(v-if='$vuetify.breakpoint.mdAndUp')
        v-spacer
        .caption Visual Editor
        v-spacer
        .caption {{$t('editor:ckeditor.stats', { chars: stats.characters, words: stats.words })}}
    editor-conflict(v-model='isConflict', v-if='isConflict')
    page-selector(mode='select', v-model='insertLinkDialog', :open-handler='insertLinkHandler', :path='path', :locale='locale')
</template>

<script>
import _ from 'lodash'
import { get, sync } from 'vuex-pathify'
// Vendored build with Citation plugin — rebuild from ../wiki-ckeditor5, copy to client/vendor/wiki-ckeditor5/
import DecoupledEditor from '../../vendor/wiki-ckeditor5/ckeditor'
import EditorConflict from './ckeditor/conflict.vue'
import { html as beautify } from 'js-beautify/js/lib/beautifier.min.js'

/* global siteLangs */

export default {
  components: {
    EditorConflict
  },
  props: {
    save: {
      type: Function,
      default: () => {}
    }
  },
  data() {
    return {
      editor: null,
      stats: {
        characters: 0,
        words: 0
      },
      content: '',
      isConflict: false,
      insertLinkDialog: false
    }
  },
  computed: {
    isMobile() {
      return this.$vuetify.breakpoint.smAndDown
    },
    locale: get('page/locale'),
    path: get('page/path'),
    activeModal: sync('editor/activeModal')
  },
  methods: {
    insertLink () {
      this.insertLinkDialog = true
    },
    insertLinkHandler ({ locale, path }) {
      this.editor.execute('link', siteLangs.length > 0 ? `/${locale}/${path}` : `/${path}`)
    }
  },
  async mounted () {
    this.$store.set('editor/editorKey', 'ckeditor')

    this.editor = await DecoupledEditor.create(this.$refs.editor, {
      language: this.locale,
      placeholder: 'Type the page content here',
      disableNativeSpellChecker: false,
      // TODO: Mention autocomplete
      //
      // mention: {
      //   feeds: [
      //     {
      //       marker: '@',
      //       feed: [ '@Barney', '@Lily', '@Marshall', '@Robin', '@Ted' ],
      //       minimumCharacters: 1
      //     }
      //   ]
      // },
      wordCount: {
        onUpdate: stats => {
          this.stats = {
            characters: stats.characters,
            words: stats.words
          }
        }
      }
    })
    this.$refs.toolbarContainer.appendChild(this.editor.ui.view.toolbar.element)

    if (this.mode !== 'create') {
      this.editor.setData(this.$store.get('editor/content'))
    }

    this.editor.model.document.on('change:data', _.debounce(evt => {
      this.$store.set('editor/content', beautify(this.editor.getData(), { indent_size: 2, end_with_newline: true }))
    }, 300))

    this.$root.$on('editorInsert', opts => {
      switch (opts.kind) {
        case 'IMAGE':
          this.editor.execute('imageInsert', {
            source: opts.path
          })
          break
        case 'BINARY':
          this.editor.execute('link', opts.path, {
            linkIsDownloadable: true
          })
          break
        case 'DIAGRAM':
          this.editor.execute('imageInsert', {
            source: `data:image/svg+xml;base64,${opts.text}`
          })
          break
      }
    })

    this.$root.$on('editorLinkToPage', opts => {
      this.insertLink()
    })

    // Handle save conflict
    this.$root.$on('saveConflict', () => {
      this.isConflict = true
    })
    this.$root.$on('overwriteEditorContent', () => {
      this.editor.setData(this.$store.get('editor/content'))
    })
  },
  beforeDestroy () {
    if (this.editor) {
      this.editor.destroy()
      this.editor = null
    }
  }
}
</script>

<style lang="scss">

$editor-height: calc(100vh - 64px - 24px);
$editor-height-mobile: calc(100vh - 56px - 16px);

.editor-ckeditor {
  background-color: mc('grey', '200');
  flex: 1 1 50%;
  display: flex;
  flex-flow: column nowrap;
  height: $editor-height;
  max-height: $editor-height;
  position: relative;

  @at-root .theme--dark & {
    background-color: mc('grey', '900');
  }

  @include until($tablet) {
    height: $editor-height-mobile;
    max-height: $editor-height-mobile;
  }

  &-sysbar {
    padding-left: 0;

    &-locale {
      background-color: rgba(255,255,255,.25);
      display:inline-flex;
      padding: 0 12px;
      height: 24px;
      width: 63px;
      justify-content: center;
      align-items: center;
    }
  }

  .contents {
    table {
      margin: inherit;
    }
    pre > code {
      background-color: unset;
      color: unset;
      padding: .15em;
    }

    p.citation,
    .citation {
      background-color: #cedee7;
      border-radius: 5px;
      padding: 12px 16px 12px 32px;
      display: block;
      margin: 10px 0;
      position: relative;
      color: #3c567e;
      font-weight: 200;
      font-size: 0.875rem;
      line-height: 1.5;

      &::before {
        content: '\F02FC';
        font-family: 'Material Design Icons', sans-serif;
        font-weight: 200;
        font-size: 18px;
        color: #3c567e;
        position: absolute;
        left: 4px;
        top: 10px;
      }

      > p {
        padding: 0;
        margin: 0;
        color: inherit;
        font-weight: inherit;
        font-size: inherit;
        line-height: inherit;

        &:not(:first-child) {
          padding-top: 0.5rem;
        }
      }
    }
  }

  .ck.ck-toolbar {
    border: none;
    justify-content: center;
    background-color: mc('grey', '300');
    color: #FFF;
  }

  .ck.ck-toolbar__items {
    justify-content: center;
  }

  .ck.ck-toolbar-dropdown.ck-wide-dropdown,
  .ck.ck-toolbar-dropdown .ck-wide-dropdown,
  .ck.ck-insert-elements-dropdown.ck-wide-dropdown {
    .ck-dropdown__panel {
      min-width: 240px;

      .ck-dropdown,
      .ck-splitbutton {
        width: 100%;
      }

      .ck-dropdown > .ck-button.ck-dropdown__button {
        width: 100%;
        justify-content: flex-start;

        .ck-dropdown__arrow {
          margin-left: auto;

          .ck-icon {
            display: none;
          }

          &::before {
            content: '>';
            font-size: 14px;
            line-height: 1;
          }
        }
      }

      .ck-splitbutton {
        .ck-splitbutton__action {
          flex: 1;
          justify-content: flex-start;
        }

        .ck-splitbutton__arrow {
          margin-left: auto;

          .ck-icon {
            display: none;
          }

          &::before {
            content: '>';
            font-size: 14px;
            line-height: 1;
          }
        }
      }
    }

    .ck-toolbar.ck-toolbar_vertical .ck-toolbar__items {
      flex-direction: column;
      align-items: stretch;
    }

    .ck-button.ck-button_with-text {
      width: 100%;
      justify-content: flex-start;

      .ck-button__icon {
        margin-left: 0;
        margin-right: 12px;
      }
    }
  }

  > .ck-editor__editable {
    background-color: mc('grey', '100');
    overflow-y: auto;
    overflow-x: hidden;
    padding: 2rem;
    box-shadow: 0 0 5px hsla(0, 0, 0, .1);
    margin: 1rem auto 0;
    width: calc(100vw - var(--nav-drawer-desktop-width, 300px) - 16vw);
    min-height: calc(100vh - 64px - 24px - 1rem - 40px);
    border-radius: 5px;

    @at-root .theme--dark & {
      background-color: #303030;
      color: #FFF;
    }

    @include until($widescreen) {
      width: calc(100vw - 2rem);
      margin: 1rem 1rem 0 1rem;
      min-height: calc(100vh - 64px - 24px - 1rem - 40px);
    }

    @include until($tablet) {
      width: 100%;
      margin: 0;
      min-height: calc(100vh - 56px - 24px - 76px);
    }

    &.ck.ck-editor__editable:not(.ck-editor__nested-editable).ck-focused {
      border-color: #FFF;
      box-shadow: 0 0 10px rgba(mc('blue', '700'), .25);

      @at-root .theme--dark & {
        border-color: #444;
        border-bottom: none;
        box-shadow: 0 0 10px rgba(#000, .25);
      }
    }

    &.ck .ck-editor__nested-editable.ck-editor__nested-editable_focused,
    &.ck .ck-editor__nested-editable:focus,
    .ck-widget.table td.ck-editor__nested-editable.ck-editor__nested-editable_focused,
    .ck-widget.table th.ck-editor__nested-editable.ck-editor__nested-editable_focused {
      background-color: mc('grey', '100');

      @at-root .theme--dark & {
        background-color: mc('grey', '900');
      }
    }
  }
}
</style>
