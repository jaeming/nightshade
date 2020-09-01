import Reflection from './lib/reflection'
import Test from './test.reflect'

const app = new Reflection()

let myProp = 'Test Prop'

app.mount(Test, '#app', { myProp })
