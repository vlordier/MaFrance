import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '../../../services/store.js'
import LocationSelector from '../LocationSelector.vue'

// Mock departement names
vi.mock('../../../utils/departementNames.js', () => ({
  DepartementNames: {
    '01': 'Ain',
    '02': 'Aisne'
  }
}))

describe('LocationSelector', () => {
  let wrapper
  let dataStore

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    dataStore = useDataStore()
    dataStore.labelState = 1
    dataStore.setCountry = vi.fn()
    dataStore.setDepartement = vi.fn()
    dataStore.setCommune = vi.fn()
    dataStore.searchCommunes = vi.fn().mockResolvedValue([
      {
        COG: '01001',
        commune: 'Test Commune',
        departement: '01'
      }
    ])

    wrapper = mount(LocationSelector, {
      props: {
        location: { type: 'country' }
      },
      global: {
        plugins: [pinia],
        stubs: {
          'v-card': true,
          'v-card-title': true,
          'v-btn': true,
          'v-col': true,
          'v-select': true,
          'v-autocomplete': true,
          'v-row': true,
          'v-card-text': true,
          'v-expand-transition': true
        }
      }
    })
  })

  it('renders the component', () => {
    expect(wrapper.exists()).toBe(true)
  })

  it('displays correct title based on labelState', async () => {
    expect(wrapper.vm.cardTitle).toBe('Sélection du niveau de visualisation')

    // Change labelState to 3
    dataStore.labelState = 3
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.cardTitle).toBe('Visualization level selection')
  })

  it('toggles collapse when title is clicked', async () => {
    expect(wrapper.vm.isCollapsed).toBe(false)

    wrapper.vm.toggleCollapse()
    expect(wrapper.vm.isCollapsed).toBe(true)

    wrapper.vm.toggleCollapse()
    expect(wrapper.vm.isCollapsed).toBe(false)
  })

  it('selects France when France button is clicked', async () => {
    wrapper.vm.selectFrance()

    expect(dataStore.setCountry).toHaveBeenCalled()
    expect(wrapper.vm.selectedDepartement).toBe('')
    expect(wrapper.vm.selectedCommune).toBe(null)
  })

  it('calls setDepartement when departement is selected', async () => {
    wrapper.vm.selectedDepartement = '01'
    wrapper.vm.onDepartementChange()

    expect(dataStore.setDepartement).toHaveBeenCalledWith('01')
  })

  it('searches communes when query length >= 3', async () => {
    // Set query to less than 3 characters
    wrapper.vm.communeQuery = 'ab'
    await wrapper.vm.onCommuneInput()
    expect(dataStore.searchCommunes).not.toHaveBeenCalled()

    // Set query to 3 or more characters
    wrapper.vm.communeQuery = 'abc'
    await wrapper.vm.onCommuneInput()
    expect(dataStore.searchCommunes).toHaveBeenCalledWith('abc')
  })

  it('calls setCommune when commune is selected', async () => {
    const commune = {
      COG: '01001',
      commune: 'Test Commune',
      departement: '01'
    }

    await wrapper.vm.onCommuneSelect(commune)

    expect(dataStore.setCommune).toHaveBeenCalledWith('01001', 'Test Commune', '01')
  })
})