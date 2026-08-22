const graphHelper = require('../../helpers/graph')
const customFonts = require('../../helpers/customFonts')
const {
  getProviders,
  applyProviders
} = require('../../helpers/assets')

/* global WIKI */

module.exports = {
  Query: {
    async assetCustomization () { return {} }
  },
  Mutation: {
    async assetCustomization () { return {} }
  },
  AssetCustomizationQuery: {
    async providers () {
      return getProviders()
    }
  },
  AssetCustomizationMutation: {
    async updateProviders (obj, args) {
      try {
        const assets = applyProviders(args.providers)
        await customFonts.cleanupOrphans(WIKI.config.theming.customFonts)
        await WIKI.configSvc.saveToDb(['assets', 'logoUrl', 'auth', 'theming'])
        return {
          responseResult: graphHelper.generateSuccess('Asset customization saved.'),
          assets
        }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    }
  }
}
