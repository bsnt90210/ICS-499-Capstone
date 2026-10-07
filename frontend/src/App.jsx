import { useEffect, useState } from 'react'
import GameLibrary from './components/GameLibrary.jsx'
import TimeInput from './components/TimeInput.jsx'
import RecommendationList from './components/RecommendationList.jsx'
import { getGames, getRecommendations } from './services/gameService.js'
import './App.css'

function App() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [minutes, setMinutes] = useState('')
  const [validationError, setValidationError] = useState('')
  const [recommendations, setRecommendations] = useState([])
  const [recommendationsLoading, setRecommendationsLoading] = useState(false)
  const [recommendationsError, setRecommendationsError] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    let active = true

    getGames()
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
  }, [])

  async function handleFindGames(event) {
    event.preventDefault()
    const availableMinutes = Number(minutes)

    if (minutes.trim() === '' || !Number.isInteger(availableMinutes) || availableMinutes <= 0) {
      setValidationError('Enter a time greater than zero in whole minutes.')
      setRecommendations([])
      setRecommendationsError(false)
      setSearched(false)
      return
    }

    setValidationError('')
    setRecommendationsError(false)
    setRecommendationsLoading(true)
    setSearched(true)

    try {
      setRecommendations(await getRecommendations(availableMinutes))
    } catch {
      setRecommendations([])
      setRecommendationsError(true)
    } finally {
      setRecommendationsLoading(false)
    }
  }

  function handleMinutesChange(value) {
    setMinutes(value)
    setValidationError('')
  }

  return (
    <main>
      <h1>MARS Game Finder</h1>
      <p>Find a game that fits the time you have available.</p>
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
      />
    </main>
  )
}

export default App
