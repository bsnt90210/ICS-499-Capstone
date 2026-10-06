function RecommendationList({ games, searched, loading, error }) {
  return (
    <section className="recommendations-section" aria-labelledby="recommendations-heading">
      <h2 id="recommendations-heading">Recommendations</h2>
      {!searched && !loading && <p>Enter your available time to find games.</p>}
      {loading && <p>Finding games...</p>}
      {error && <p role="alert">Could not find recommendations. Please try again.</p>}
      {searched && !loading && !error && games.length === 0 && (
        <p>No games in the library fit within that time.</p>
      )}
      {searched && !loading && !error && games.length > 0 && (
        <ul className="game-list">
          {games.map((game) => (
            <li className="game-card" key={game.id}>
              <h3>{game.title}</h3>
              <p>{game.genre}</p>
              <p>Estimated session: {game.estimatedMinutes} minutes</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default RecommendationList
