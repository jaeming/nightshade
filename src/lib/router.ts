export type Route = [string, typeof Function]

// TODO: 
// - replace URL
// - history api
// - cold load

export class Router {
  currentPath: string = '/'
  constructor (public routes: Route[]) {}

  get currentComponent () {
    const [_, c] = this.routes.find(
      ([path, component]) => this.currentPath === path
    )
    return c
  }

  updateHistory() {
    const state = {};
    const title = "";
    const url = this.currentPath
    history.pushState(state, title, url);
  }
}
