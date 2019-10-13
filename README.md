<div align="center">
  <br>
  <br>

![Reactivator logo showing a Newton's Cradle](https://cdn.jsdelivr.net/gh/Loilo/vue-reactivator@HEAD/reactivator.svg)

  <br>
</div>

# Reactivator

[![Travis](https://img.shields.io/travis/Loilo/vue-reactivator.svg?label=unix&logo=travis)](https://travis-ci.org/Loilo/vue-reactivator)
[![AppVeyor](https://img.shields.io/appveyor/ci/Loilo/vue-reactivator.svg?label=windows&logo=appveyor)](https://ci.appveyor.com/project/Loilo/vue-reactivator)
[![npm](https://img.shields.io/npm/v/vue-reactivator.svg)](https://www.npmjs.com/package/vue-reactivator)

Reactivator is a tiny Vue mixin (0.5KB minified & gzipped) which enables you to create reactive properties from arbitrary non-reactive state.

## Motivation

There is global state all around that is completely unrelated to Vue. A lot of it is mutable, for example your browser's viewport size. Wouldn't it be nice to use those as reactive properties in Vue?

```vue
<div>Your browser viewport dimensions are {{ size[0] }}x{{ size[1] }} pixels.</div>
```

This is what Reactivator is for. Given an according implementation, it will take some non-reactive state and turn it into a reactive property in your Vue components.

There are already some handy browser-related Reactivator implementations in the [`vue-browser-state`](https://github.com/Loilo/vue-browser-state) package. However, Reactivator is not limited to browser-related state. Do you use Vue for only small parts of your website? Then you may encounter situations where you want to react to changes that are happening _outside_ of your components. This can be handled by your own custom implementations. If you want to know how to write those, take a look at the [Write Reactivator Implementations](#write-reactivator-implementations) section.

## Installation

Reactivator is available on npm:

```bash
npm install vue-reactivator
```

After installing, you can include it in the usual ways — via good ol' `require`...

```js
const reactivator = require('vue-reactivator')
```

...or as an ES module:

```js
import reactivator from 'vue-reactivator'
```

---

If you want to play around or just prefer coding that way, you can also get Reactivator from the usual CDNs like unpkg:

```html
<script src="https://unpkg.com/vue-reactivator"></script>
```

> **Note:** While this documentation will use the `reactivator` variable name for the Reactivator mixin, fetching it from a CDN will store the mixin in the `vueReactivator` global variable to make it easier to mentally associate it with Vue.

## Usage

Since Reactivator is really just a _framework_ for easy handling of global state, it doesn't do anything on its own. You need an accompanying _implementation_ for each state. A good starting point is the browser state collection from [`vue-browser-state`](https://github.com/Loilo/vue-browser-state), so we'll use those in our examples.

> A word on browser support: Reactivator is supported in all modern browsers. If you want to use it in older browsers like Internet Explorer, you'll have to transpile it to ES5 and include polyfills (e.g. for [`Object.entries`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/entries)) yourself.

Using a Reactivator implementation is really quite simple:

1. Import Reactivator
2. Import the implementation
3. Register Reactivator as a mixin

---

Let's see how this works with the browser viewport size example from the introduction:

```vue
<template>
  <div>
    Your browser viewport dimensions are {{ size[0] }}x{{ size[1] }} pixels.
  </div>
</template>

<script>
import reactivator from 'vue-reactivator'
import { viewportSize } from 'vue-browser-state'

export default {
  mixins: [
    reactivator({
      size: viewportSize
    })
  ]
}
</script>
```

> **See it in action**
>
> You can take a look at the example above [in CodeSandbox](https://codesandbox.io/s/nn5vj1100l). Play around a little bit and resize the preview window, and you will see the numbers update immediately.

Now you can access `this.size` anywhere in your component, just like a regular prop  — you can use it to derive computed properties or put a watcher on it.

---

As you can see in the example, `reactivator` is not _actually_ a mixin but rather a function that _returns_ a mixin based on the data it receives.

The `reactivator` function takes an object as its only parameter. The object consists of Reactivator implementations as values and the property names those implementations should be assigned to as keys.

> **Pro Tip:** You can write the script part from above even terser by renaming the imported `viewportSize`:
>
> ```js
> import reactivator from 'vue-reactivator'
> import { viewportSize as size } from 'vue-browser-state'
>
> export default {
>   mixins: [reactivator({ size })]
> }
> ```

## Write Reactivator Implementations

As announced above, we're going to write a Reactivator implementation here. We're actually going to re-implement one from the `vue-browser-state` package: The `online` state. It simply contains `true` or `false`, depending on whether the user currently has a connection to the internet.

First things first — here's what a Reactivator implementation looks like:

```js
const implementation = {
  getSsrState() { ... },
  getInitialState() { ... },
  listen(setState) { ... }
}
```

That's it! Not that complicated after all. In a nutshell: A Reactivator implementation is an object containing up to three methods. Each of those methods is useful yet optional.

> In the sections below, these three methods will be explained and applied to our "online" implementation. So let's start by just creating an empty object which will receive those methods one by one:
>
> ```js
> const online = {}
> ```

### `getSsrState()`

Not all information that we have in the browser is available on the server side. Therefore, this method should return a reasonable fallback value that is used during server-side rendering.

If this method is not defined, the property will be `undefined` until `getInitalState()` is called.

> When a user fetches a page from a server, they are usually online. (With things like PWAs in place, this is no longer necessarily the case, but it's sufficient to assume a user is online until the component is rendered and may prove us wrong.)
>
> ```js
> online.getSsrState = () => true
> ```

### `getInitialState()`

This method is called inside [the `created` hook](https://vuejs.org/v2/api/#created) of our component. It should return the value our state initially has when the component is created — it therefore is the client-side equivalent of the `getSsrState` method.

If this method is not defined, the property will, again, be `undefined` until the listeners initiated in the `listen()` method provide any information.

> We can get the information whether a user is online from `navigator.onLine`. Therefore, our method looks as simple as this:
>
> ```js
> online.getInitialState = () => navigator.onLine
> ```

### `listen(setState)`

When the initial state has been received, Reactivator will look for and call the `listen` method.

It basically is a setup function where event listeners can be initialized. The provided `setState` parameter is a callback which can be used to update the implementation's state.

The `listen` method may return a cleanup function which will be called when the implementation is no longer attached to any components.

> The `online` and `offline` events on the `window` object notify about changes in the user's online state. We can implement them like this:
>
> ```js
> online.listen = setState => {
>   const onlineListener = () => setState(true)
>   const offlineListener = () => setState(false)
>
>   // Attach online/offline listeners
>   window.addEventListener('online', onlineListener)
>   window.addEventListener('offline', offlineListener)
>
>   return () => {
>     // Remove the listeners in the cleaup function
>     window.removeEventListener('online', onlineListener)
>     window.removeEventListener('offline', offlineListener)
>   }
> }
> ```

---

That's it — our custom Reactivator implementation is ready to be used! Let's put that into a separate file:

```js
// online.js

const online = {
  getSsrState: () => ...,
  getInitialState: () => ...,
  listen: () => ...
}

export default online
```

Now we can include this implementation in our component:

```vue
<template>
  <div>Your browser is {{ online ? 'online' : 'offline' }}.</div>
</template>

<script>
import reactivator from 'vue-reactivator'
import online from './online'

export default {
  mixins: [reactivator({ online })]
}
</script>
```

### ES Modules for Implementations

If you've had a keen eye at the `online.js` file above, you might have noticed something: Because an implementation is _an object with three methods_, we can make use of how ES modules work to make our implementation even cleaner:

```js
// online.js

export function getSsrState() { ... }
export function getInitialState() { ... }
export function listen() { ... }
```

And then import it like this:

```js
import * as online from './online'
```

Feels really natural, doesn't it?

## Related

- [`vue-browser-state`](https://github.com/Loilo/vue-browser-state) – Various browser-related Reactivator implementations

## Credit

The Vue Reactivator icon is based on an illustration by [Vectors Market](https://www.flaticon.com/authors/vectors-market) from [www.flaticon.com](https://www.flaticon.com) (licensed under [Flaticon Basic License](https://file000.flaticon.com/downloads/license/license.pdf)).
