import { useEffect, useRef, useState } from 'react'
import GameLibrary from './components/GameLibrary.jsx'
import GenreFilter from './components/GenreFilter.jsx'
import TimeInput from './components/TimeInput.jsx'
import RecommendationList from './components/RecommendationList.jsx'
import { getGames, getGenres, getRecommendations } from './services/gameService.js'
import './App.css'

function App() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [genres, setGenres] = useState([])
  const [selectedGenre, setSelectedGenre] = useState('')
  const [genresLoading, setGenresLoading] = useState(true)
  const [genresError, setGenresError] = useState(false)
  const [minutes, setMinutes] = useState('')
  const [validationError, setValidationError] = useState('')
  const [recommendations, setRecommendations] = useState([])
  const [recommendationsLoading, setRecommendationsLoading] = useState(false)
  const [recommendationsError, setRecommendationsError] = useState(false)
  const [searched, setSearched] = useState(false)
  const [searchLabel, setSearchLabel] = useState('')
  const searchVersion = useRef(0)

  useEffect(() => {
    let active = true

    getGenres()
      .then((names) => {
        if (active) setGenres(names)
      })
      .catch(() => {
        if (active) setGenresError(true)
      })
      .finally(() => {
        if (active) setGenresLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    getGames(selectedGenre)
      .then((library) => {
        if (active) setGames(library)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [selectedGenre])

  function handleGenreChange(genre) {
    if (genre === selectedGenre) return
    clearSearch()
    setSelectedGenre(genre)
    setLoading(true)
    setError(false)
  }

  function clearSearch() {
    searchVersion.current += 1
    setRecommendations([])
    setRecommendationsError(false)
    setSearched(false)
    setSearchLabel('')
  }

  async function handleFindGames(event) {
    event.preventDefault()
    if (recommendationsLoading) return
    const availableMinutes = Number(minutes)

    if (!/^[1-9][0-9]*$/.test(minutes) || !Number.isSafeInteger(availableMinutes)) {
      setValidationError('Enter a time greater than zero in whole minutes.')
      clearSearch()
      return
    }

    setValidationError('')
    clearSearch()
    const version = searchVersion.current
    setRecommendationsLoading(true)

    try {
      const results = await getRecommendations(availableMinutes, selectedGenre)
      if (version !== searchVersion.current) return
      setRecommendations(results)
      setSearchLabel(`Games for ${availableMinutes} min · ${selectedGenre || 'All genres'}`)
      setSearched(true)
    } catch {
      if (version === searchVersion.current) setRecommendationsError(true)
    } finally {
      setRecommendationsLoading(false)
    }
  }

  function handleMinutesChange(value) {
    if (value !== minutes) clearSearch()
    setMinutes(value)
    setValidationError('')
  }

  return (
    <main>
      <h1>MARS Game Finder</h1>
      <p>Find a game that fits the time you have available.</p>
      <GenreFilter
        genres={genres}
        selectedGenre={selectedGenre}
        onGenreChange={handleGenreChange}
        loading={genresLoading}
        error={genresError}
      />
      <GameLibrary games={games} loading={loading} error={error} />
      <TimeInput
        minutes={minutes}
        onMinutesChange={handleMinutesChange}
        onSubmit={handleFindGames}
        loading={recommendationsLoading}
        validationError={validationError}
      />
      <RecommendationList
        games={recommendations}
        searched={searched}
        loading={recommendationsLoading}
        error={recommendationsError}
        searchLabel={searchLabel}
      />
    </main>
  )
}

export default App
