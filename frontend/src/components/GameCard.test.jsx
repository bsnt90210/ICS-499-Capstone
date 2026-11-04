// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import GameCard from './GameCard.jsx'

afterEach(cleanup)

it('renders every genre, play mode, session length, playtime, and last-played date', () => {
  render(<ul><GameCard game={{
    id: 1, title: 'Hades', genres: ['Action', 'Indie', 'RPG'],
    categories: ['Co-op', 'Single-player'], estimatedMinutes: 60,
    playtimeMinutes: 3210, lastPlayed: '2024-11-28',
  }} /></ul>)
  expect(screen.getByRole('heading', { name: 'Hades' })).toBeTruthy()
  for (const text of ['Action · Indie · RPG', 'Co-op · Single-player', 'Estimated session: 60 minutes', 'Total playtime: 53.5 hours', 'Last played: 2024-11-28']) {
    expect(screen.getByText(text)).toBeTruthy()
  }
})

it('shows Never played for a null date and handles empty metadata', () => {
  render(<ul><GameCard game={{
    id: 99, title: 'Stray', genres: [], categories: [],
    estimatedMinutes: 60, playtimeMinutes: 0, lastPlayed: null,
  }} /></ul>)
  expect(screen.getByText('Last played: Never played')).toBeTruthy()
  expect(screen.getByText('Total playtime: 0.0 hours')).toBeTruthy()
  expect(screen.getByText('Uncategorized')).toBeTruthy()
})
