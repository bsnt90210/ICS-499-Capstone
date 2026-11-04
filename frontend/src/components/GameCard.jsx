function GameCard({ game }) {
  // Keep the Iteration 2 library readable until the new API is available.
  const genres = game.genres ?? (game.genre ? [game.genre] : [])
  const playtime = Number.isFinite(game.playtimeMinutes)
    ? `${(game.playtimeMinutes / 60).toFixed(1)} hours`
    : 'Unavailable'
  const lastPlayed = game.lastPlayed === null
    ? 'Never played'
    : game.lastPlayed ?? 'Unavailable'

  return (
    <li className="game-card">
      <h3>{game.title}</h3>
      <p>{genres.length ? genres.join(' · ') : 'Uncategorized'}</p>
      {game.categories?.length > 0 && (
        <p className="game-categories">{game.categories.join(' · ')}</p>
      )}
      <p>Estimated session: {game.estimatedMinutes} minutes</p>
      <p>Total playtime: {playtime}</p>
      <p>Last played: {lastPlayed}</p>
    </li>
  )
}

export default GameCard
