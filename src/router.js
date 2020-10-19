import Home from './home.reflect'
import About from './about.reflect'
import Hello from './hello.reflect'
import PostsLayout from './posts_layout.reflect'
import Post from './post.reflect'
import { Router } from './lib/reflection'

export const router = new Router([
  ['/', Home],
  ['/about', About],
  ['/hello/:name/:title', Hello],
  ['/posts', PostsLayout, [
    ['/post', Post]
  ]]
])
