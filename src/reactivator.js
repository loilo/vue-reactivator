// The cache for browser state value stores
const stores = new Map()
const storeInstances = new Set()

// A flag for temporary disabling the mixin, needed when
// used globally via Vue.mixin() to avoid an loops
let disabled = false

/**
 * Get a memoized store for the provided implementation which contains the implementation's state
 *
 * @param {function} Vue The Vue function to use when creating a store
 * @param {object} implementation The implementation to get a store for
 * @param {any} initialValue The initial value of the store. Could be derived from `implementation`, but no need to do that work twice
 */
function getStore(Vue, implementation, initialValue) {
  // Get store from cache if memoized
  if (stores.has(implementation)) {
    return stores.get(implementation)
  }

  // Create a store if none is cached
  disabled = true
  const store = new Vue({
    data: {
      value: initialValue,
      listeners: []
    },
    created() {
      // Attach listener if provided
      if (typeof implementation.listen === 'function') {
        this.cleanupListener = implementation.listen(value => {
          this.value = value
        })
      }
    },
    methods: {
      // Attach a listener callback that is invoked whenever the store's value changes
      listen(handler) {
        this.listeners.push(handler)
        const removeListener = this.$watch('value', handler)

        return () => {
          removeListener()
          this.listeners.splice(this.listeners.indexOf(handler), 1)

          // If the store has no more listeners...
          if (this.listeners.length === 0) {
            // ...tear down the implementation's listener
            if (typeof this.cleanupListener === 'function') {
              this.cleanupListener()
            }

            // ...detach it from the stores
            stores.delete(implementation)
          }
        }
      }
    }
  })
  disabled = false

  stores.set(implementation, store)

  return store
}

/**
 * Create a mixin of reactive browser state data from the provided implementations
 *
 * @param {object} implementations The implementations to employ in the mixin
 */
export default function browserStateMixin(implementations) {
  const implementationsArray = Object.entries(implementations)
  let Vue

  return {
    data(vm) {
      if (disabled) {
        storeInstances.add(this)
        return {}
      }

      // Set initial values of each implementation
      const data = {
        $browserStateListenerRemovers: []
      }

      for (const [name, implementation] of implementationsArray) {
        let value
        if (vm.$isServer) {
          if (typeof implementation.getSsrState === 'function') {
            value = implementation.getSsrState()
          }
        } else {
          if (typeof implementation.getInitialState === 'function') {
            value = implementation.getInitialState()
          }
        }

        data[name] = value
      }

      return data
    },
    created() {
      if (disabled) {
        return
      }

      // Initial state is immutable on the server, bail out of listening
      if (this.$isServer) {
        return
      }

      // Get global Vue constructor by walking up the instance's prototype chain
      if (!Vue) {
        let prototype = Object.getPrototypeOf(this)
        while (Object.getPrototypeOf(prototype).constructor !== Object) {
          prototype = Object.getPrototypeOf(prototype)
        }

        Vue = prototype.constructor
      }

      // Iterate over implementations
      for (const [name, implementation] of implementationsArray) {
        const store = getStore(Vue, implementation, this.$data[name])

        // Whenever the store updates, update the instance's value
        const removeListener = store.listen(value =>
          this.$set(this.$data, name, value)
        )

        // Remember listener remover for cleanup
        this.$data.$browserStateListenerRemovers.push(removeListener)
      }
    },
    beforeDestroy() {
      if (storeInstances.has(this)) {
        storeInstances.delete(this)
        return
      }

      // Cleanup: Remove listeners from all browser state stores
      for (const removeListener of this.$data.$browserStateListenerRemovers) {
        removeListener()
      }
    }
  }
}
