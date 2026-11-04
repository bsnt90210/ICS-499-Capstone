import GameCard from './GameCard.jsx'

function GameLibrary({ games, loading, error }) {
  return (
    <section className="library-section" aria-labelledby="library-heading">
      <h2 id="library-heading">Game library</h2>
      {loading && <p>Loading games...</p>}
      {error && <p role="alert">Could not load the game library. Please refresh the page.</p>}
      {!loading && !error && games.length === 0 && <p>No games are in the library yet.</p>}
      {!loading && !error && games.length > 0 && (
        <ul className="game-list">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </ul>
      )}
    </section>
  )
}

export default GameLibrary
