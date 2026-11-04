import { afterEach, expect, it, vi } from 'vitest'
import { getGames, getRecommendations } from './gameService.js'

afterEach(() => vi.unstubAllGlobals())

it('encodes genre filters in library and recommendation URLs and omits All genres', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
  vi.stubGlobal('fetch', fetch)
  await getGames('RPG')
  await getRecommendations(60, 'RPG')
  await getGames('')
  await getRecommendations(30, '')
  await getRecommendations(30, 'Free To Play')
  expect(fetch.mock.calls.map(([url]) => url)).toEqual([
    '/api/games?genre=RPG',
    '/api/recommendations?availableMinutes=60&genre=RPG',
    '/api/games',
    '/api/recommendations?availableMinutes=30',
    '/api/recommendations?availableMinutes=30&genre=Free+To+Play',
  ])
})
