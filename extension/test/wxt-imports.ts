type StoredValue = unknown
const values = new Map<string, StoredValue>()

export const storage = {
  defineItem<T>(key: string, options: { fallback: T }) {
    return {
      async getValue() {
        return (values.has(key) ? values.get(key) : options.fallback) as T
      },
      async setValue(value: T) {
        values.set(key, value)
      },
      async removeValue() {
        values.delete(key)
      },
    }
  },
}
