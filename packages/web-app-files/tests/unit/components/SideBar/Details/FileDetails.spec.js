import { createLocalVue, shallowMount } from '@vue/test-utils'
import Vuex from 'vuex'
import FileDetails from 'packages/web-app-files/src/components/SideBar/Details/FileDetails.vue'
import stubs from '../../../../../../../tests/unit/stubs'
import GetTextPlugin from 'vue-gettext'

const localVue = createLocalVue()
localVue.use(Vuex)
localVue.use(GetTextPlugin, {
  translations: 'does-not-matter.json',
  silent: true
})
const OcTooltip = jest.fn()

const selectors = {
  timestamp: '[data-test-id="timestamp"]',
  ownerName: '[data-test-id="ownerName"]',
  sharingInfo: '[data-test-id="sharingInfo"]',
  sizeInfo: '[data-test-id="sizeInfo"]',
  versionsInfo: '[data-test-id="versionsInfo"]',
  previewImgContainer: '.details-preview'
}

const simpleOwnFolder = {
  type: 'folder',
  ownerId: 'marie',
  ownerDisplayName: 'Marie',
  mdate: 'Wed, 21 Oct 2015 07:28:00 GMT',
  size: '30MB'
}

const sharedFolder = {
  type: 'folder',
  ownerId: 'einstein',
  ownerDisplayName: 'Einstein',
  sdate: 'Wed, 21 Oct 2015 07:28:00 GMT',
  size: '30MB',
  shareTypes: [0]
}

describe('Details SideBar Accordion Item', () => {
  describe('displays a resource of type folder', () => {
    describe('on a private page', () => {
      it('with timestamp, size info and (me) as owner', () => {
        const wrapper = createWrapper(simpleOwnFolder)
        expect(wrapper.find(selectors.timestamp).exists()).toBeTruthy()
        expect(wrapper.find(selectors.ownerName).exists()).toBeTruthy()
        expect(wrapper.find(selectors.ownerName).text()).toContain('(me)')
        expect(wrapper.find(selectors.sizeInfo).exists()).toBeTruthy()
        expect(wrapper.find(selectors.sharingInfo).exists()).toBeFalsy()
        expect(wrapper.find(selectors.versionsInfo).exists()).toBeFalsy()
        expect(wrapper.find(selectors.previewImgContainer).exists()).toBeFalsy()
      })
      it('with timestamp, size info, share info and share date', () => {
        const wrapper = createWrapper(sharedFolder)
        expect(wrapper.find(selectors.timestamp).exists()).toBeTruthy()
        expect(wrapper.find(selectors.ownerName).exists()).toBeTruthy()
        expect(wrapper.find(selectors.ownerName).text()).not.toContain('(me)')
        expect(wrapper.find(selectors.sizeInfo).exists()).toBeTruthy()
        expect(wrapper.find(selectors.sharingInfo).exists()).toBeTruthy()
        expect(wrapper.find(selectors.versionsInfo).exists()).toBeFalsy()
        expect(wrapper.find(selectors.previewImgContainer).exists()).toBeFalsy()
      })
    })
    describe('on a public page', () => {
      it('with owner, timestap, size info and no share info', () => {
        const wrapper = createWrapper(sharedFolder, [], null, true)
        expect(wrapper.find(selectors.timestamp).exists()).toBeTruthy()
        expect(wrapper.find(selectors.ownerName).exists()).toBeTruthy()
        expect(wrapper.find(selectors.ownerName).text()).not.toContain('(me)')
        expect(wrapper.find(selectors.sizeInfo).exists()).toBeTruthy()
        expect(wrapper.find(selectors.sharingInfo).exists()).toBeFalsy()
        expect(wrapper.find(selectors.versionsInfo).exists()).toBeFalsy()
        expect(wrapper.find(selectors.previewImgContainer).exists()).toBeFalsy()
      })
      it('with owner, timestamp, size info and no share info', () => {
        const wrapper = createWrapper(sharedFolder, [], null, true)
        expect(wrapper.find(selectors.timestamp).exists()).toBeTruthy()
        expect(wrapper.find(selectors.ownerName).exists()).toBeTruthy()
        expect(wrapper.find(selectors.ownerName).text()).not.toContain('(me)')
        expect(wrapper.find(selectors.sizeInfo).exists()).toBeTruthy()
        expect(wrapper.find(selectors.sharingInfo).exists()).toBeFalsy()
        expect(wrapper.find(selectors.versionsInfo).exists()).toBeFalsy()
        expect(wrapper.find(selectors.previewImgContainer).exists()).toBeFalsy()
      })
    })
  })
})

function createWrapper(testResource, testVersions = [], testPreview, publicRoute = false) {
  return shallowMount(FileDetails, {
    store: new Vuex.Store({
      getters: {
        user: function() {
          return { id: 'marie' }
        }
      },
      modules: {
        Files: {
          namespaced: true,
          getters: {
            highlightedFile: function() {
              return testResource
            },
            versions: function() {
              return 2
            }
          },
          actions: {
            loadVersions: function() {
              return testVersions
            },
            loadPreview: function() {
              return testPreview
            }
          }
        }
      }
    }),
    localVue,
    stubs: stubs,
    directives: {
      OcTooltip
    },
    mocks: {
      $route: {
        meta: {
          auth: !publicRoute
        }
      }
    }
  })
}