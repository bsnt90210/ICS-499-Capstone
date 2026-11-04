
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      reporter: ['text', 'html'],
      thresholds: {
        lines: 90,
        branches: 75,
        functions: 85,
        statements: 85,
      },
    },
  },
})
