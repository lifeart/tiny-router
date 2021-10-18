var __defProp = Object.defineProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __export = (target, all) => {
  __markAsModule(target);
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
__export(exports, {
  Router: () => Router,
  getPagePath: () => getPagePath,
  openPage: () => openPage,
  redirectPage: () => redirectPage
});
class Router {
  constructor(routes) {
    this.handlers = [];
    this.resolvers = {};
    this._handlers = [];
    this.prev = "";
    this.routes = Object.keys(routes).map((name) => {
      let value = routes[name];
      if (typeof value === "string") {
        value = value.replace(/\/$/g, "") || "/";
        let names = (value.match(/\/:\w+/g) || []).map((i) => i.slice(2));
        let pattern = value.replace(/[\s!#$()+,.:<=?[\\\]^{|}]/g, "\\$&").replace(/\/\\:\w+/g, "/([^/]+)");
        return [
          name,
          RegExp("^" + pattern + "$", "i"),
          (...matches) => matches.reduce((params, match, index) => {
            params[names[index]] = match;
            return params;
          }, {}),
          value
        ];
      } else {
        return [name, ...value];
      }
    });
  }
  parse(path) {
    path = path.replace(/\/$/, "") || "/";
    if (this.prev === path)
      return false;
    this.prev = path;
    for (let [route, pattern, cb] of this.routes) {
      let match = path.match(pattern);
      if (match) {
        return { path, route, params: cb(...match.slice(1)) };
      }
    }
    return false;
  }
  addResolver(routeName, fn) {
    this.resolvers[routeName] = fn;
  }
  addHandler(fn) {
    this.handlers.push(fn);
    return this;
  }
  async navigate(page) {
    let data = null;
    if (page.route in this.resolvers) {
      data = await this.resolvers[page.route](page.params);
    }
    this.handlers.forEach((fn) => fn(page, data));
  }
  async open(path, redirect) {
    let page = this.parse(path);
    if (page !== false) {
      if (typeof history !== "undefined") {
        if (redirect) {
          history.replaceState(null, "", path);
        } else {
          history.pushState(null, "", path);
        }
      }
      await this.navigate(page);
    }
  }
  async popstate() {
    let page = this.parse(location.pathname);
    if (page !== false) {
      await this.navigate(page);
    }
  }
  onClick(rawEvent) {
    const event = rawEvent;
    let link = event.target.closest("a");
    if (!event.defaultPrevented && link && event.button === 0 && link.target !== "_blank" && link.dataset.noRouter == null && link.rel !== "external" && !link.download && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      let url = new URL(link.href);
      if (url.origin === location.origin) {
        event.preventDefault();
        let changed = location.hash !== url.hash;
        this.open(url.pathname);
        if (changed) {
          location.hash = url.hash;
          if (url.hash === "" || url.hash === "#") {
            window.dispatchEvent(new HashChangeEvent("hashchange"));
          }
        }
      }
    }
  }
  async mount(path = typeof location !== void 0 ? location.pathname : "/", ssr = false) {
    if (!ssr) {
      if (typeof window === "undefined") {
        throw new Error("Unable to mount in SSR mode");
      }
      const onClick = (e) => {
        return this.onClick(e);
      };
      const popState = () => {
        return this.popstate();
      };
      document.body.addEventListener("click", onClick);
      this._handlers.push([document.body, "click", onClick]);
      window.addEventListener("popstate", popState);
      this._handlers.push([window, "popstate", popState]);
    }
    let page = this.parse(path);
    if (page !== false) {
      await this.navigate(page);
    }
  }
  unmount() {
    this._handlers.forEach(([element, eventName, fn]) => {
      element.removeEventListener(eventName, fn);
    });
  }
}
function getPagePath(router, name, params) {
  let route = router.routes.find((i) => i[0] === name);
  if (!route) {
    throw new Error(`Unknown route: ${name}`);
  }
  return route[3].replace(/\/:\w+/g, (i) => "/" + params[i.slice(2)]);
}
function openPage(router, name, params) {
  router.open(getPagePath(router, name, params));
}
function redirectPage(router, name, params) {
  router.open(getPagePath(router, name, params), true);
}
