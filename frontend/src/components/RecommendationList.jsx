import GameCard from './GameCard.jsx'

function RecommendationList({ games, searched, loading, error, searchLabel }) {
  return (
    <section className="recommendations-section" aria-labelledby="recommendations-heading">
      <h2 id="recommendations-heading">Recommendations</h2>
      {searched && !loading && !error && searchLabel && (
        <p className="search-label" role="status">{searchLabel}</p>
      )}
      {!searched && !loading && <p>Enter your available time to find games.</p>}
      {loading && <p>Finding games...</p>}
      {error && <p role="alert">Could not find recommendations. Please try again.</p>}
      {searched && !loading && !error && games.length === 0 && (
        <p>No games in the library fit within that time.</p>
      )}
      {searched && !loading && !error && games.length > 0 && (
        <ul className="game-list">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </ul>
      )}
    </section>
  )
}

export default RecommendationList
