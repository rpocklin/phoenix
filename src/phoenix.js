/* eslint-disable */
import "regenerator-runtime/runtime"

// --- Libraries and Plugins ---
import Vue from 'vue'
import 'vue-resize/dist/vue-resize.css'
import VueResize from 'vue-resize'

// --- Components ---

import Phoenix from './Phoenix.vue'
import missingConfigPage from './pages/missingConfig.vue'

// --- Adding global libraries ---

import OwnCloud from 'owncloud-sdk'

import { sync } from 'vuex-router-sync'
import store from './store'
import router from './router'

// --- Plugins ----

import VueEvents from 'vue-events'
import VueRouter from 'vue-router'
import VueScrollTo from 'vue-scrollto'
import VueMeta from 'vue-meta'
import Vue2TouchEvents from 'vue2-touch-events'

// --- Gettext ----

import GetTextPlugin from 'vue-gettext'
import coreTranslations from '../l10n/translations.json'

// --- Image source ----

import MediaSource from './plugins/mediaSource.js'
import PhoenixPlugin from './plugins/phoenix'
import ChunkedUpload from './plugins/upload'

// --- Drag Drop ----

import { Drag, Drop } from 'vue-drag-drop'

// Import the Design System
import DesignSystem from 'owncloud-design-system'
import 'owncloud-design-system/dist/system/system.css'

import Avatar from './components/Avatar.vue'

import wgxpath from 'wicked-good-xpath'
wgxpath.install()

Vue.prototype.$client = new OwnCloud()

Vue.use(VueEvents)
Vue.use(VueRouter)
Vue.use(DesignSystem)
Vue.use(VueScrollTo)
Vue.use(MediaSource)
Vue.use(PhoenixPlugin)
Vue.use(VueResize)
Vue.use(VueMeta, {
  // optional pluginOptions
  refreshOnceOnNavigation: true
})
Vue.use(ChunkedUpload)
Vue.use(Vue2TouchEvents)

Vue.component('drag', Drag)
Vue.component('drop', Drop)
Vue.component('avatar-image', Avatar)

// --- Router ----

let apps
let config
const supportedLanguages = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  cs: 'Czech',
  fr: 'Français',
  it: 'Italiano',
  gl: 'Galego'
}

function loadApps () {
  let plugins = []
  let translations = coreTranslations

  let routes = [{
    path: '/',
    redirect: to => arguments[0].navItems[0].route
  }]

  for (let app of Array.from(arguments)) {
    if (!app.appInfo) {
      console.error('Try to load app with missing appInfo…')
    }
    if (app.routes) {
      // rewrite relative app routes by prefix'ing their corresponding appId
      app.routes.forEach(r => (r.path = `/${encodeURI(app.appInfo.id)}${r.path}`))

      // adjust routes in nav items
      if (app.navItems) {
        app.navItems.forEach(nav => {
          const r = app.routes.find(function(element) {
            return element.name === nav.route.name;
          });
          if (r) {
            r.meta = r.meta || {}
            r.meta.pageIcon = nav.iconMaterial
            r.meta.pageTitle = nav.name
            nav.route.path = nav.route.path || r.path
          } else {
            console.error(`Unknown route name ${nav.route.name}`)
          }
        })
      }
      routes.push(app.routes)
    }
    if (app.plugins) {
      plugins.push(app.plugins)
    }
    if (app.navItems) {
      store.commit('SET_NAV_ITEMS_FROM_CONFIG', {
        extension: app.appInfo.id,
        navItems: app.navItems
      })
    }
    if (app.translations) {
      Object.keys(supportedLanguages).forEach((lang) => {
        if (translations[lang] && app.translations[lang]) {
          Object.assign(translations[lang], app.translations[lang])
        }
      })
    }

    if(app.quickActions) {
      store.commit('ADD_QUICK_ACTIONS', app.quickActions)
    }

    if (app.store) {
      registerStoreModule(app)
    }

    store.dispatch('registerApp', app.appInfo)
    if (config.external_apps) {
      store.dispatch('loadExternalAppConfig', { app: app.appInfo, config })
    }
  }
  router.addRoutes(routes.flat())
  sync(store, router)

  // inject custom config into vuex
  store.dispatch('loadConfig', config)

  // basic init of ownCloud sdk
  Vue.prototype.$client.init({ baseUrl: config.server || window.location.origin })

  Vue.use(GetTextPlugin, {
    availableLanguages: supportedLanguages,
    defaultLanguage: navigator.language.substring(0, 2),
    translations: translations,
    silent: true
  })

  const OC = new Vue({
    el: '#owncloud',
    data: {
      config: config,
      plugins: plugins.flat()
    },
    store,
    router,
    render: h => h(Phoenix)
  })

  // externalize Vue - this is not the Vue instance but the class
  window.Vue = Vue

  // inject custom theme config into vuex
  fetch(`themes/${config.theme}.json`)
    .then(res => res.json())
    .then(res => {
      store.dispatch('loadTheme', { theme: res, name: config.theme })
    })
}

function registerStoreModule (app) {
  if (app.store.default) {
    return store.registerModule(app.appInfo.name, app.store.default)
  }

  return store.registerModule(app.appInfo.name, app.store)
}

function missingConfig () {
  const translations = coreTranslations

  Vue.use(GetTextPlugin, {
    availableLanguages: supportedLanguages,
    defaultLanguage: navigator.language.substring(0, 2),
    translations: translations,
    silent: true
  })

  const OC = new Vue({
    el: '#owncloud',
    store,
    render: h => h(missingConfigPage)
  })
}

function requireError (err) {
  if (err) {
    // display error to user
    let missingApps = []
    const failedId = err.requireModules && err.requireModules[0]
    missingApps.push(failedId)
    let index = apps.findIndex((a) => {
      return failedId === a.substring(2)
    })
    apps.splice(index, 1)
    config.state = 'corrupt'
    config.corrupted = missingApps
    requirejs(apps, loadApps, requireError)
  } else {
    throw err
  }
}

(async function () {
  try {
    config = await fetch('config.json').catch(() => {
      config.state = 'missing'
    })
    config = await config.json()

    // Loads apps from internal server
    apps = config.apps.map((app) => {
      return `./apps/${app}/${app}.bundle.js`
    })

    // Loads apps from external servers
    if (config.external_apps) {
      config.external_apps.map(app => apps.push(app.path))
    }

    // provide global config object
    // TODO: frozen object would be great ...
    window.phoenixConfig = config

    // requirejs.config({waitSeconds:200}) is not really working ... reason unknown
    // we are manipulating requirejs directly
    requirejs.s.contexts._.config.waitSeconds = 200

    requirejs(apps, loadApps, requireError)
  } catch (err) {
    router.push('missing-config')
    missingConfig()
  }
})()
