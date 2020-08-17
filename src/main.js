import Reflection from './lib/reflection'
import Test from './test.reflect'

const app = new Reflection()

app.mount(Test, '#app')
