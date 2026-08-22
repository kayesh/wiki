<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row, wrap)
      v-flex(xs12)
        .admin-header
          v-icon.animated.fadeInUp(color='primary', size='80') mdi-image-edit-outline
          .admin-header-title
            .headline.primary--text.animated.fadeInLeft Asset Customization
            .subtitle-1.grey--text.animated.fadeInLeft.wait-p2s Logo, favicons, backgrounds, Open Graph, and custom fonts
          v-spacer
          v-btn.animated.fadeInDown.wait-p2s.mr-3(icon, outlined, color='grey', @click='refresh')
            v-icon mdi-refresh
          v-btn.animated.fadeInDown(color='success', @click='save', depressed, large)
            v-icon(left) mdi-check
            span {{$t('common:actions.apply')}}

      v-flex(lg3, xs12)
        v-card.animated.fadeInUp
          v-toolbar(flat, color='primary', dark, dense)
            .subtitle-1 Module
          v-list(two-line, dense).py-0
            template(v-for='(item, idx) in providers')
              v-list-item(:key='item.key', @click='selectedProvider = item.key', :disabled='!item.isAvailable')
                v-list-item-avatar(size='24')
                  v-icon(color='grey', v-if='!item.isAvailable') mdi-minus-box-outline
                  v-icon(color='primary', v-else-if='item.isEnabled', v-ripple, @click='item.isEnabled = false') mdi-checkbox-marked-outline
                  v-icon(color='grey', v-else, v-ripple, @click='item.isEnabled = true') mdi-checkbox-blank-outline
                v-list-item-content
                  v-list-item-title.body-2(:class='!item.isAvailable ? `grey--text` : (selectedProvider === item.key ? `primary--text` : ``)') {{ item.title }}
                  v-list-item-subtitle: .caption(:class='!item.isAvailable ? `grey--text text--lighten-1` : (selectedProvider === item.key ? `blue--text ` : ``)') {{ item.description }}
                v-list-item-avatar(v-if='selectedProvider === item.key', size='24')
                  v-icon.animated.fadeInLeft(color='primary', large) mdi-chevron-right
              v-divider(v-if='idx < providers.length - 1')

      v-flex.asset-customization-panel(xs12, lg9)
        v-card.asset-customization-panel__card.animated.fadeInUp.wait-p2s
          v-toolbar(color='primary', dense, flat, dark)
            .subtitle-1 {{provider.title}}
            v-spacer
            v-switch(
              dark
              color='blue lighten-5'
              label='Active'
              v-model='provider.isEnabled'
              hide-details
              inset
              )
          v-card-info(color='blue')
            div
              div {{provider.description}}
              span.caption(v-if='provider.website'): a(:href='provider.website') {{provider.website}}
            v-spacer
            .admin-providerlogo(v-if='provider.logo')
              img(:src='provider.logo', :alt='provider.title')
          .asset-customization-panel__scroll
            v-form
              .overline.grey--text.pa-4 Configuration
              template(v-if='provider.key === "customFonts"')
                .px-4.pb-4
                  .caption.grey--text.mb-3 Upload font files (.ttf, .otf, .woff, .woff2). @font-face rules are generated automatically and injected on every page.
                  v-data-table(
                    :headers='fontHeaders'
                    :items='customFontsList'
                    hide-default-footer
                    :items-per-page='100'
                    no-data-text='No custom fonts uploaded yet.'
                    )
                    template(v-slot:item.actions='{ item }')
                      v-btn(icon, small, @click='removeFont(item)')
                        v-icon.red--text mdi-delete
                  v-btn.mt-3(color='primary', depressed, @click='openFontDialog')
                    v-icon(left) mdi-upload
                    span Add Font
                  v-textarea.is-monospaced.mt-4(
                    :value='generatedFontCSS'
                    label='Generated @font-face CSS'
                    outlined
                    readonly
                    auto-grow
                    rows='3'
                    )
              template(v-else)
                .body-1.ml-3.mb-4(v-if='!provider.config || provider.config.length < 1'): em No configuration options available.
                template(v-else, v-for='(cfg, idx) in provider.config')
                  .pt-2.pb-7.pl-10.pr-3(:key='cfg.key')
                    .d-flex.align-center
                      v-avatar(size='100', tile)
                        v-img(
                          :src='cfg.value.value'
                          lazy-src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNcWQ8AAdcBKrJda2oAAAAASUVORK5CYII='
                          aspect-ratio='1'
                          :alt='cfg.value.title'
                          )
                      .ml-4(style='flex: 1 1 auto;')
                        v-text-field(
                          outlined
                          :label='cfg.value.title'
                          v-model='cfg.value.value'
                          :hint='cfg.value.hint ? cfg.value.hint : ""'
                          persistent-hint
                          append-icon='mdi-folder-image'
                          @click:append='browseAsset(cfg)'
                          @keyup.enter='refreshPreview'
                          )
                  v-divider(v-if='idx < provider.config.length - 1')
            v-alert.ma-4(v-if='provider.key === "logo"', outlined, type='info', dense, icon='mdi-information-outline')
              div The <strong>site logo</strong> is used in the header, login screen, and emails.
              ul.mt-2.mb-0
                li Enter a path such as <code>/_assets/svg/logo-wikijs.svg</code> or a full URL.
                li Apply updates the header logo immediately.
            v-alert.ma-4(v-else-if='provider.key === "favicons"', outlined, type='info', dense, icon='mdi-information-outline')
              div <strong>Favicon paths</strong> replace the current browser and PWA icons.
              ul.mt-2.mb-0
                li Fields start with the built-in <code>/_assets/favicons/…</code> files.
                li Apply updates tab icons on this page immediately. Other visitors see them on the next load.
            v-alert.ma-4(v-else-if='provider.key === "backgrounds"', outlined, type='info', dense, icon='mdi-information-outline')
              div The <strong>login background</strong> is shown behind the login and password-reset screens.
              ul.mt-2.mb-0
                li The current default is <code>/_assets/img/splash/1.jpg</code>.
                li Leave Active on and change the path to use an uploaded image.
            v-alert.ma-4(v-else-if='provider.key === "openGraph"', outlined, type='info', dense, icon='mdi-information-outline')
              div The <strong>og:image</strong> meta tag is used when your site is shared on social platforms.
              ul.mt-2.mb-0
                li Use a wide image, ideally <strong>1200×630</strong> pixels.
                li Enter a path such as <code>/assets/og-image.png</code> or a full URL.
                li Apply updates the default sharing image site-wide.
            v-alert.ma-4(v-else-if='provider.key === "customFonts"', outlined, type='info', dense, icon='mdi-information-outline')
              div <strong>Custom fonts</strong> replace the default site typography on content pages, navigation, and headers.
              ul.mt-2.mb-0
                li Upload a font file, then set the CSS <strong>font-family</strong> name used in your theme CSS.
                li Use <strong>Unicode range</strong> presets for Bengali or Arabic script when needed.
                li Apply saves the font list and updates injected CSS site-wide.

    v-dialog(v-model='fontDialog', max-width='600', persistent)
      v-card
        v-card-title Add Custom Font
        v-card-text
          v-file-input(
            v-model='fontUploadFile'
            label='Font file'
            accept='.ttf,.otf,.woff,.woff2'
            prepend-icon='mdi-file-font'
            show-size
            outlined
            )
          v-text-field(
            v-model='fontForm.family'
            label='Font family name (CSS)'
            hint='e.g. solaimanlipi — letters, numbers, underscore, hyphen only'
            persistent-hint
            outlined
            )
          v-text-field(
            v-model.number='fontForm.weight'
            label='Font weight'
            type='number'
            outlined
            )
          v-select(
            v-model='fontForm.style'
            :items='fontStyles'
            label='Font style'
            outlined
            )
          v-textarea.is-monospaced(
            v-model='fontForm.unicodeRange'
            label='Unicode range (optional)'
            hint='Comma-separated ranges, e.g. U+0980-09FF or U+0600-06FF,U+0750-077F,U+08A0-08FF'
            persistent-hint
            outlined
            auto-grow
            rows='2'
            )
          .caption.grey--text.mt-2.mb-1 Quick presets:
          v-chip.mr-1.mb-1(
            v-for='preset in unicodeRangePresets'
            :key='preset.label'
            small
            label
            color='primary'
            outlined
            @click='fontForm.unicodeRange = preset.value'
            ) {{ preset.label }}
        v-card-actions
          v-spacer
          v-btn(text, @click='closeFontDialog') Cancel
          v-btn(color='primary', depressed, :loading='fontUploading', @click='uploadFont') Upload

    component(:is='activeModal')
</template>

<script>
import _ from 'lodash'
import Cookies from 'js-cookie'
import { sync } from 'vuex-pathify'

import { applyResolvedAssets } from '../../helpers/apply-assets'
import { resetMediaBrowserState } from '../../helpers/asset-path'
import { buildFontCSS, getConfigFieldValue, normalizeUnicodeRange, parseConfigValue } from '../../helpers/custom-fonts'
import editorStore from '../../store/editor'
import providersQuery from 'gql/admin/asset-customization/asset-customization-query-providers.gql'
import providersSaveMutation from 'gql/admin/asset-customization/asset-customization-mutation-save-providers.gql'

/* global WIKI */

WIKI.$store.registerModule('editor', editorStore)

export default {
  components: {
    editorModalMedia: () => import(/* webpackChunkName: "editor", webpackMode: "lazy" */ '../editor/editor-modal-media.vue')
  },
  data () {
    return {
      providers: [],
      selectedProvider: 'logo',
      provider: {},
      browsingField: null,
      fontDialog: false,
      fontUploading: false,
      fontUploadFile: null,
      fontForm: {
        family: '',
        weight: 400,
        style: 'normal',
        unicodeRange: ''
      },
      fontStyles: ['normal', 'italic', 'oblique'],
      unicodeRangePresets: [
        { label: 'Bengali', value: 'U+0980-09FF' },
        { label: 'Arabic script', value: 'U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF,U+10E60-10E7F' }
      ]
    }
  },
  computed: {
    activeModal: sync('editor/activeModal'),
    customFontsConfig () {
      if (this.provider.key !== 'customFonts') {
        return null
      }
      return _.find(this.provider.config, ['key', 'fonts'])
    },
    customFontsList () {
      const value = getConfigFieldValue(this.customFontsConfig)
      return Array.isArray(value) ? value : []
    },
    generatedFontCSS () {
      return buildFontCSS(this.customFontsList)
    },
    fontHeaders () {
      return [
        { text: 'Family', value: 'family' },
        { text: 'File', value: 'filename' },
        { text: 'Weight', value: 'weight', width: 90 },
        { text: 'Style', value: 'style', width: 90 },
        { text: 'Unicode Range', value: 'unicodeRange' },
        { text: '', value: 'actions', sortable: false, width: 60, align: 'right' }
      ]
    }
  },
  watch: {
    selectedProvider (newValue) {
      this.provider = _.find(this.providers, ['key', newValue]) || {}
    },
    providers (newValue) {
      if (newValue.length && !this.selectedProvider) {
        this.selectedProvider = newValue[0].key
      }
      this.provider = _.find(newValue, ['key', this.selectedProvider]) || newValue[0] || {}
    }
  },
  mounted () {
    this.$root.$on('editorInsert', opts => {
      if (!this.browsingField) {
        return
      }
      this.browsingField.value.value = opts.path
      this.browsingField = null
    })
  },
  beforeDestroy () {
    this.$root.$off('editorInsert')
  },
  methods: {
    browseAsset (cfg) {
      this.browsingField = cfg
      resetMediaBrowserState(this.$store)
      this.$store.set('editor/editorKey', 'common')
      this.activeModal = 'editorModalMedia'
    },
    refreshPreview () {
      this.$forceUpdate()
    },
    openFontDialog () {
      this.fontForm = {
        family: '',
        weight: 400,
        style: 'normal',
        unicodeRange: ''
      }
      this.fontUploadFile = null
      this.fontDialog = true
    },
    closeFontDialog () {
      this.fontDialog = false
      this.fontUploadFile = null
    },
    async uploadFont () {
      if (!this.fontUploadFile) {
        this.$store.commit('showNotification', {
          message: 'Choose a font file to upload.',
          style: 'red',
          icon: 'alert'
        })
        return
      }
      if (!this.fontForm.family || !/^[a-zA-Z0-9_-]+$/.test(this.fontForm.family)) {
        this.$store.commit('showNotification', {
          message: 'Enter a valid font family name (letters, numbers, underscore, hyphen only).',
          style: 'red',
          icon: 'alert'
        })
        return
      }

      this.fontUploading = true
      try {
        const formData = new FormData()
        formData.append('fontUpload', this.fontUploadFile)
        formData.append('fontMetadata', JSON.stringify({
          family: this.fontForm.family,
          weight: this.fontForm.weight || 400,
          style: this.fontForm.style || 'normal',
          unicodeRange: normalizeUnicodeRange(this.fontForm.unicodeRange)
        }))

        const jwtToken = Cookies.get('jwt')
        const resp = await fetch('/u/fonts', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${jwtToken}`
          },
          body: formData
        })
        const result = await resp.json()
        if (!resp.ok || !result.succeeded) {
          throw new Error(result.message || 'Font upload failed.')
        }

        if (!Array.isArray(getConfigFieldValue(this.customFontsConfig))) {
          this.$set(this.customFontsConfig.value, 'value', [])
        }
        this.customFontsConfig.value.value.push(result.font)
        this.closeFontDialog()
        this.$store.commit('showNotification', {
          message: 'Font uploaded. Click Apply to save changes.',
          style: 'success',
          icon: 'check'
        })
      } catch (err) {
        this.$store.commit('showNotification', {
          message: err.message,
          style: 'red',
          icon: 'alert'
        })
      }
      this.fontUploading = false
    },
    removeFont (font) {
      if (!confirm(`Remove font "${font.family}"?`)) {
        return
      }

      this.customFontsConfig.value.value = this.customFontsList.filter(item => item.id !== font.id)
      this.$store.commit('showNotification', {
        message: 'Font removed. Click Apply to save changes.',
        style: 'success',
        icon: 'check'
      })
    },
    async refresh () {
      await this.$apollo.queries.providers.refetch()
      this.$store.commit('showNotification', {
        message: 'Asset customization configuration refreshed.',
        style: 'success',
        icon: 'cached'
      })
    },
    async save () {
      this.$store.commit('loadingStart', 'admin-asset-customization-save')
      try {
        const resp = await this.$apollo.mutate({
          mutation: providersSaveMutation,
          variables: {
            providers: this.providers.map(str => _.pick(str, [
              'isEnabled',
              'key',
              'config'
            ])).map(str => ({
              ...str,
              config: str.config.map(cfg => ({
                ...cfg,
                value: JSON.stringify({ v: getConfigFieldValue(cfg) })
              }))
            }))
          }
        })
        if (_.get(resp, 'data.assetCustomization.updateProviders.responseResult.succeeded', false)) {
          applyResolvedAssets(_.get(resp, 'data.assetCustomization.updateProviders.assets'), this.$store)
          this.$store.commit('showNotification', {
            message: 'Asset customization saved. Site assets updated.',
            style: 'success',
            icon: 'check'
          })
        } else {
          throw new Error(_.get(resp, 'data.assetCustomization.updateProviders.responseResult.message', 'Unexpected error'))
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }
      this.$store.commit('loadingStop', 'admin-asset-customization-save')
    }
  },
  apollo: {
    providers: {
      query: providersQuery,
      fetchPolicy: 'network-only',
      update: (data) => _.cloneDeep(data.assetCustomization.providers).map(str => ({
        ...str,
        config: _.sortBy(str.config.map(cfg => ({
          ...cfg,
          value: parseConfigValue(cfg.value)
        })), [t => t.value.order, t => t.key])
      })).sort((a, b) => {
        const order = { logo: 0, favicons: 1, backgrounds: 2, openGraph: 3, customFonts: 4 }
        return (order[a.key] || 100) - (order[b.key] || 100)
      }),
      watchLoading (isLoading) {
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-asset-customization-refresh')
      }
    }
  }
}
</script>

<style lang='scss'>
.asset-customization-panel {
  min-height: 0;
}

.asset-customization-panel__card {
  display: flex;
  flex-direction: column;
}

.asset-customization-panel__scroll {
  max-height: calc(100vh - 320px);
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 16px;
}

@media #{map-get($display-breakpoints, 'md-and-up')} {
  .asset-customization-panel__scroll {
    max-height: calc(100vh - 320px);
  }
}

@media #{map-get($display-breakpoints, 'sm-and-down')} {
  .asset-customization-panel__scroll {
    max-height: none;
    overflow: visible;
  }
}

.v-textarea.is-monospaced textarea {
  font-family: 'Roboto Mono', 'Courier New', Courier, monospace;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
}
</style>
