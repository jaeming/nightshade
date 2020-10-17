export type Route = [string, typeof Function]

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
    return this.routes.find(([p, _c]) => p === path || this.patternMatch(p, path))
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

  get params() {
    if (!this.path.includes(':')) return {}
    
    const currentPathParts = this.currentPath.split('/')
    return this.path.split('/').reduce((memo, part, index) => {
      if (part[0] === ':') memo[part.substring(1)] = currentPathParts[index]
      
      return memo
    }, {} as any)
  }
}
