import mockGames from '../data/mockGames.js'

export async function getGames() {
  const response = await fetch("/api/games");
	const data = await response.json();
	return data
}

export async function getRecommendations(availableMinutes) {
  const response = await fetch("/api/games");
	const data = await response.json();
	return data.filter((data) => data.estimatedMinutes <= availableMinutes)
}
