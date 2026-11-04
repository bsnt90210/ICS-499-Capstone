function GenreFilter({ genres, selectedGenre, onGenreChange, loading, error }) {
  return (
    <section aria-labelledby="genre-heading">
      <h2 id="genre-heading">Filter by genre</h2>
      <label htmlFor="genre-filter">Genre</label>
      <select
        id="genre-filter"
        value={selectedGenre}
        onChange={(event) => onGenreChange(event.target.value)}
        disabled={loading || error}
        aria-describedby={loading || error ? 'genre-status' : undefined}
      >
        <option value="">All genres</option>
        {genres.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
      </select>
      {loading && <p id="genre-status" role="status">Loading genres...</p>}
      {error && <p id="genre-status" role="status">Genres unavailable. Showing all genres.</p>}
    </section>
  )
}

export default GenreFilter
