# Tiny Router

A tiny URL router for any app;

* Zero dependencies.
* It has good **TypeScript** support.
* Framework agnostic. Can be used for **React**, **Preact**, **Vue**,
  **Svelte**, and vanilla JS.

```ts
// router.ts
import { Router, Page } from '@lifeart/tiny-router';

export const router = new Router({
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

```ts
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



Stack based navigation:

```ts
import { Router } from '@lifeart/tiny-router';

// lets define stack for route
export const router = new Router<Routes>({
  "users": '/users',
  "users.user": '/users/:user',
  "users.user.card": '/users/:user/:card'
})

```

in this case, `users.user.card` route resolution will be started from `users`, then `users.user`, and at the end `users.user.card`;

it mean we could "chain" resolvers:

```ts
router.addResolver('users', () => {
  return [ { cards: [ { name: "hello" }]  }];
});

router.addResolver('users.user', () => {
  const users = router.dataForRoute('users');
  return users[0]; // { cards: [ { name: "hello" } ] }
});

router.addResolver('users.user.card', () => {
  const user = router.dataForRoute('users.user');
  return user.cards[0]; // { name: "hello" }
});
```

by default, resolved data cached by key params, way to invalidate it -

```ts
router.unloadRouteData('users');
```

in this case, this route will reload data



Chained routing example:

```ts
// components/layout.js
import type { Page } from '@lifeart/tiny-router';
import { router } from './router.ts';
import { tracked } from '@glimmer/tracking';

import NotFoundComponent from './components/pages/not-found.hbs';

import Component, { hbs } from '@glimmerx/component';

interface IStackedRouter {
  stack: { name: string, data: null | unknown }[];
  components?: Record<string, Component>
}


const DefaultRoute = hbs`
  {{#if @hasChildren}} {{yield}} {{/if}}
`;

class StackedRouter extends Component<IStackedRouter> {
    get tail() {
      return this.parts.tail;
    }
    get parts() {
      const [ head, ...tail] = this.args.stack;
      return {
        head, tail
      }
    }
    get components() {
      return this.args.components ?? {};
    }
    get Component() {
      return this.model?.component || this.components[this.route] || DefaultRoute;
    }
    get route() {
      return this.parts.head.name;
    }
    get model() {
      return (this.parts.head.data || {}) as Record<string, unknown>;
    }
    static template = hbs`
      {{#if @stack.length}}
        <this.Component
          @route={{this.route}}
          @hasChildren={{this.tail.length}}
          @model={{this.model}}
          @params={{@params}}
        >
          <StackedRouter @components={{this.components}} @stack={{this.tail}} @params={{@params}} />
        </this.Component>
      {{/if}}
    `
  }

class RouteComponent extends Component {
  router = router.addHandler((page, data, stack) = this.navigate(page, data, stack));
  @tracked stack = [];
  @tracked params = {};
  navigate(page: Page, _ : any, stack: [string, any][]) {
    this.params = page.params;
    this.stack = stack;
  }
  static template = hbs`
    <StackedRoute @params={{this.params}} @stack={{this.stack}} />
  `
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

For string patterns you can use `:name` for variable parts.

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
