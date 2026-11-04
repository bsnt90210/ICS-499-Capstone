
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      reporter: ['text', 'html'],
      thresholds: {
        lines: 32,
        branches: 40,
        functions: 38,
        statements: 33,
      },
    },
  },
})
