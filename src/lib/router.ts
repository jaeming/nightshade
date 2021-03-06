import * as qs from 'qs'

export type Route = [string, typeof Function, Route[] | undefined]

export class Router {
  currentPath: string = '/'
  constructor (public routes: Route[]) {}

  get currentComponent () {
    const [_, component] = this.currentRoute
    return component
  }

  get path () {
    const [path, _] = this.currentRoute
    return path
  }

  get currentRoute () {
    return this.find(this.currentPath)
  }

  find (path) {
    return this.routes.find(([p, _c]) => p === path || this.patternMatch(p, path)) || this.isChild(path)
  }

  updateHistory() {
    const state = {}
    const title = ""
    const url = this.currentPath
    history.pushState(state, title, url)
  }

  private patternMatch(path, comparePath) {
    const identifiers = path.split('/').filter(i => i[0] !== ':' && i !== '')
    if (!identifiers.length) return
    return identifiers.every(i => comparePath.includes(i))
  }

  isChild(path) {
    // const [_p, _c, childRoutes] = this.currentRoute
    // if (!childRoutes) return

    // return childRoutes.find(([p, _c]) => p === path || this.patternMatch(p, path))
    console.log('find child...', this.routes.filter(([_p, _c, children]) => children).map(([_p, _c, children]) => children).find(c => c.find(([p]) => p === path)))
    return this.routes.filter(([_p, _c, children]) => children).map(([_p, _c, children]) => children).find(c => c.find(([p]) => p === path))

  }

  get params() {
    if (!this.path.includes(':')) return {}
    
    const currentPathParts = this.currentPath.split('/')
    return this.path.split('/').reduce((memo, part, index) => {
      if (part[0] === ':') memo[part.substring(1)] = currentPathParts[index].split('?')[0]
      
      return memo
    }, {} as any)
  }

  get query() {
    console.log('locate', location.search)
    return qs.parse(location.search, { ignoreQueryPrefix: true })
  }
}
