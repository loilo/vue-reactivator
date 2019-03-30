const browserState = require('./dist/reactivator.common.js')
const Vue = require('vue')

/**
 * Make a Vue instance return `true` when asked for its `$isServer` property
 * @param {Vue} vm The Vue instance to enable SSR on
 */
function enableSsr(vm) {
  Object.setPrototypeOf(
    vm,
    new Proxy(Object.getPrototypeOf(vm), {
      get: (target, key, receiver) =>
        key === '$isServer' ? true : Reflect.get(target, key, receiver)
    })
  )
}

// A sample reactivator implementation
const sampleImplementation = {
  getSsrState: () => 'ssr',
  getInitialState: () => 'initial',
  listen(setState) {
    const timeoutId1 = setTimeout(() => {
      setState('timeout 1')
    }, 100)

    const timeoutId2 = setTimeout(() => {
      setState('timeout 2')
    }, 200)

    return () => {
      clearTimeout(timeoutId1)
      clearTimeout(timeoutId2)
    }
  }
}

test('should get `undefined` for SSR value if not exists', () => {
  // Create an SSR component
  const vm = new Vue({
    beforeCreate() {
      enableSsr(this)
    },
    mixins: [browserState({ value: {} })]
  })

  expect(vm.$isServer).toBe(true)
  expect(vm.value).toBe(undefined)

  vm.$destroy()
})

test('should get SSR value if exists', () => {
  // Create an SSR component
  const vm = new Vue({
    beforeCreate() {
      enableSsr(this)
    },
    mixins: [
      browserState({
        value: {
          getSsrState: sampleImplementation.getSsrState
        }
      })
    ]
  })

  expect(vm.$isServer).toBe(true)
  expect(vm.value).toBe('ssr')

  vm.$destroy()
})

test('should get `undefined` for initial state if not exists', () => {
  // Create a component
  const vm = new Vue({
    mixins: [browserState({ value: {} })]
  })

  expect(vm.value).toBe(undefined)

  vm.$destroy()
})

test('should get initial state if exists', () => {
  // Create a component
  const vm = new Vue({
    mixins: [
      browserState({
        value: {
          getInitialState: sampleImplementation.getInitialState
        }
      })
    ]
  })

  expect(vm.value).toBe('initial')

  vm.$destroy()
})

test('should listen to changes', async () => {
  // Create a component
  const vm = new Vue({
    mixins: [
      browserState({
        value: sampleImplementation
      })
    ]
  })

  expect(vm.value).toBe('initial')

  await new Promise(resolve => {
    setTimeout(() => {
      expect(vm.value).toBe('timeout 1')
      resolve()
    }, 150)
  })

  vm.$destroy()
})

test('should detach listeners correctly', async () => {
  // Create a component
  const vm = new Vue({
    mixins: [
      browserState({
        value: sampleImplementation
      })
    ]
  })

  await new Promise(resolve => {
    setTimeout(() => {
      vm.$destroy()
    }, 150)

    setTimeout(() => {
      expect(vm.value).toBe('timeout 1')
      resolve()
    }, 250)
  })
})
