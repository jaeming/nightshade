export type Route = [string, typeof Function]

export class Router {
  currentPath: string = '/'
  constructor (public routes: Route[]) {}

  get currentComponent () {
    const [_, c] = this.routes.find(
      ([path, component]) => this.currentPath === path
    )
    return c
  }
}
