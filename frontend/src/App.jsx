import { useEffect, useState } from 'react'
import GameLibrary from './components/GameLibrary.jsx'
import { getGames } from './services/gameService.js'
import './App.css'

function App() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

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

  return (
    <main>
      <h1>MARS Game Finder</h1>
      <p>Find a game that fits the time you have available.</p>
      <GameLibrary games={games} loading={loading} error={error} />
    </main>
  )
}

export default App
