import mockGames from '../data/mockGames.js'

export async function getGames() {
  return mockGames
}

export async function getRecommendations(availableMinutes) {
  return mockGames.filter((game) => game.estimatedMinutes <= availableMinutes)
}
