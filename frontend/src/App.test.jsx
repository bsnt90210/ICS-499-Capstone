// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from './App.jsx'
import { getGames, getGenres, getRecommendations } from './services/gameService.js'

vi.mock('./services/gameService.js', () => ({
  getGames: vi.fn(),
  getGenres: vi.fn(),
  getRecommendations: vi.fn(),
}))

const hades = {
  id: 1, title: 'Hades', genres: ['Action', 'Indie', 'RPG'],
  categories: ['Single-player'], estimatedMinutes: 60,
  playtimeMinutes: 3210, lastPlayed: '2024-11-28',
}

async function openApp() {
  render(<App />)
  await screen.findByRole('heading', { name: 'Hades' })
  await waitFor(() => expect(screen.getByLabelText('Genre').disabled).toBe(false))
}

function minutes(value) {
  fireEvent.change(screen.getByLabelText('How many minutes do you have?'), { target: { value } })
}

function search() {
  fireEvent.click(screen.getByRole('button', { name: 'Find Games' }))
}

beforeEach(() => {
  vi.resetAllMocks()
  getGames.mockResolvedValue([hades])
  getGenres.mockResolvedValue(['Action', 'RPG', 'Strategy'])
  getRecommendations.mockResolvedValue([hades])
})

afterEach(cleanup)

describe('Iteration 3 player flow', () => {
  it.each(['', '3e1', '0x1e', '1.5', '0', '-5', '30.0', '+30', '030', ' 30', '9007199254740992'])(
    'rejects invalid minutes %j without requesting recommendations', async (value) => {
      await openApp()
      minutes(value)
      search()
      expect(screen.getByRole('alert').textContent).toContain('Enter a time greater than zero')
      expect(getRecommendations).not.toHaveBeenCalled()
    },
  )

  it('filters the library and searches with the selected genre, then restores All genres', async () => {
    await openApp()
    const dropdown = screen.getByLabelText('Genre')
    expect(within(dropdown).getAllByRole('option')[0].textContent).toBe('All genres')
    fireEvent.change(dropdown, { target: { value: 'RPG' } })
    await waitFor(() => expect(getGames).toHaveBeenLastCalledWith('RPG'))
    minutes('60')
    search()
    await screen.findByText('Games for 60 min · RPG')
    expect(getRecommendations).toHaveBeenLastCalledWith(60, 'RPG')
    fireEvent.change(dropdown, { target: { value: '' } })
    await waitFor(() => expect(getGames).toHaveBeenLastCalledWith(''))
    search()
    await screen.findByText('Games for 60 min · All genres')
    expect(getRecommendations).toHaveBeenLastCalledWith(60, '')
  })

  it('shows an empty result separately from a failed request', async () => {
    getRecommendations.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('Offline'))
    await openApp()
    minutes('20')
    search()
    await screen.findByText('No games in the library fit within that time.')
    search()
    await screen.findByRole('alert')
    expect(screen.getByRole('alert').textContent).toContain('Could not find recommendations')
    expect(screen.queryByText('No games in the library fit within that time.')).toBeNull()
  })

  it.each(['minutes', 'genre'])('clears completed results when %s changes', async (input) => {
    await openApp()
    minutes('60')
    search()
    await screen.findByText('Games for 60 min · All genres')
    if (input === 'minutes') minutes('30')
    else fireEvent.change(screen.getByLabelText('Genre'), { target: { value: 'RPG' } })
    const results = screen.getByRole('region', { name: 'Recommendations' })
    expect(within(results).queryByRole('list')).toBeNull()
    expect(screen.queryByText('Games for 60 min · All genres')).toBeNull()
  })

  it.each(['minutes', 'genre'])('ignores a pending response after %s changes', async (input) => {
    let resolveSearch
    getRecommendations.mockImplementationOnce(() => new Promise((resolve) => { resolveSearch = resolve }))
    await openApp()
    minutes('60')
    search()
    expect(screen.getByRole('button', { name: 'Find Games' }).disabled).toBe(true)
    if (input === 'minutes') minutes('30')
    else fireEvent.change(screen.getByLabelText('Genre'), { target: { value: 'RPG' } })
    resolveSearch([hades])
    await waitFor(() => expect(screen.getByRole('button', { name: 'Find Games' }).disabled).toBe(false))
    expect(within(screen.getByRole('region', { name: 'Recommendations' })).queryByRole('list')).toBeNull()
    expect(screen.queryByText(/Games for 60 min/)).toBeNull()
  })

  it('keeps time search available when genre loading fails', async () => {
    getGenres.mockRejectedValueOnce(new Error('Offline'))
    render(<App />)
    await screen.findByText('Genres unavailable. Showing all genres.')
    expect(screen.getByLabelText('Genre').disabled).toBe(true)
    minutes('60')
    search()
    await screen.findByText('Games for 60 min · All genres')
    expect(getRecommendations).toHaveBeenLastCalledWith(60, '')
  })
})
