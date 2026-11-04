
import { test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App.jsx'

vi.mock('./services/gameService.js', () => ({
  getGames: vi.fn().mockResolvedValue([]),
  getRecommendations: vi.fn().mockResolvedValue([]),
}))

test('renders the MARS Game Finder heading', () => {
  render(<App />)

  expect(
    screen.getByRole('heading', { name: 'MARS Game Finder' })
  ).toBeTruthy()
})
