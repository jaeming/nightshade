import Reflection from './lib/reflection'
import Layout from './layout.reflect'
import { router } from './router.js'

const app = new Reflection()

app.router = router
app.mount(Layout, '#app', { myProp: 'Test Prop' })
