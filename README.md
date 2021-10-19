# Tiny Router

A tiny URL router for any app;

* Zero dependencies.
* It has good **TypeScript** support.
* Framework agnostic. Can be used for **React**, **Preact**, **Vue**,
  **Svelte**, and vanilla JS.

```ts
// router.ts
import { Router, Page } from '@lifeart/tiny-router';

// Types for :params in route templates
interface Routes {
  home: void
  category: 'categoryId'
  post: 'categoryId' | 'id'
}

export const router = new Router<Routes>({
  home: '/',
  category: '/posts/:categoryId',
  post: '/posts/:categoryId/:id'
})

// async data loading per-route
router.addResolver('post', async function(page) {
  const request = await fetch(`/api/pages/${page.params.id}`);
  const data = await request.json();

  return data;
});

// async component loading per-route
router.addResolver('category', async function(page) {
  const MyCategory = await import('./components/my-category');

  return {
    component: MyCategory.default
  }
});

// add all routes handler
router.addHandler((page: Page, data: any) => {
  console.log({page, data});
});



// router.activeRoute === null

// change router state & resolve route
await router.mount('/posts/42');

router.activeRoute.page.route === 'category';
router.activeRoute.page.path === '/posts/42';

```

Store in active mode listen for `<a>` clicks on `document.body` and Back button
in browser.

```tsx
// components/layout.js
import type { Page } from '@lifeart/tiny-router';
import { router } from './router.ts';
import { tracked } from '@glimmer/tracking';

import NotFoundComponent from './components/pages/not-found.hbs';

class RouteComponent extends Component {
  router = router.addHandler((page, data) = this.navigate(page, data))
  @tracked page!: Page;
  @tracked routeComponent!: Component;
  navigate(page: Page, data: Component) {
    this.page = page;
    this.routeComponent = data.component || NotFoundComponent;
  }
}
```


## Install

```sh
yarn add @lifeart/tiny-router
```


## Usage

See [Tiny Router docs](https://github.com/lifeart/tiny-router#guide)
about using the router and subscribing to changes in UI frameworks.


### Routes

Routes is an object of route’s name to route pattern:

```ts
new Router({
  route1: '/',
  route2: '/path/:var1/and/:var2',
  route3: [/\/posts\/(draft|new)\/(\d+)/, (type, id) => ({ type, id })]
})
```

For string patterns you can use `:name` for variable parts.

Routes can have RegExp patterns. They should be an array with function,
which convert `()` groups to key-value map.

For TypeScript, you need specify interface with variable names, used in routes.

```ts
interface Routes {
  routeName: 'var1' | 'var2'
}

new Router<Routes>({
  routeName: '/path/:var1/and/:var2'
})
```


### URL Generation

Using `getPagePath()` avoids hard coding URL in templates. It is better
to use the router as a single place of truth.

```tsx
import { getPagePath } from '@lifeart/tiny-router'

…
  <a href={getPagePath(router, 'post', { categoryId: 'guides', id: '10' })}>
```

If you need to change URL programmatically you can use `openPage`
or `redirectPage`:

```ts
import { openPage, redirectPage } from '@lifeart/tiny-router'

function requireLogin () {
  openPage(router, 'login')
}

function onLoginSuccess() {
  // Replace login route, so we don’t face it on back navigation
  redirectPage(router, 'home')
}
```


### Server-Side Rendering

Router can be used in Node environment without `window` and `location`.
In this case, it will always return route to `/` path.

You can manually set any other route:

```js
if (isServer) {
  router.open('/posts/demo/1')
}
```
