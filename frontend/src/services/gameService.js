async function getGameArray(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  const games = await response.json()
  if (!Array.isArray(games)) throw new Error('Expected a list of games')
  return games
}

export function getGames(genre = '') {
  const query = new URLSearchParams()
  if (genre) query.set('genre', genre)
  return getGameArray(`/api/games${query.size ? `?${query}` : ''}`)
}

export async function getGenres() {
  const genres = await getGameArray('/api/genres')
  if (!genres.every((genre) => typeof genre === 'string' && genre.trim() !== '')) {
    throw new Error('Expected a list of genre names')
  }
  return genres
}

export function getRecommendations(availableMinutes, genre = '') {
  const query = new URLSearchParams({ availableMinutes: String(availableMinutes) })
  if (genre) query.set('genre', genre)
  return getGameArray(`/api/recommendations?${query}`)
}
