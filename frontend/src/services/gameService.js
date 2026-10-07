async function getGameArray(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  const games = await response.json()
  if (!Array.isArray(games)) throw new Error('Expected a list of games')
  return games
}

export function getGames() {
  return getGameArray('/api/games')
}

export function getRecommendations(availableMinutes) {
  const query = new URLSearchParams({ availableMinutes: String(availableMinutes) })
  return getGameArray(`/api/recommendations?${query}`)
}
