
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        lines: 40,
        branches: 43,
        functions: 45,
        statements: 41,
      },
    },
  },
})
