import Reflective from './lib/reflective.ts'
import Test from './test.reflect'

const app = new Reflective()

app.mount(Test, '#app')
