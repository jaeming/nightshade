import Home from './home.reflect'
import About from './about.reflect'
import { Router } from './lib/reflection'

export const router = new Router([
  ['/', Home],
  ['/about', About]
])
