import { createVuetify } from 'vuetify'
import { createPinia } from 'pinia'
import 'vuetify/styles'

global.CSS = { supports: () => false }

const vuetify = createVuetify()
const pinia = createPinia()

export default {
  global: {
    plugins: [vuetify, pinia]
  }
}