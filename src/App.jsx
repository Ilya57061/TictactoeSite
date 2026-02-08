import React from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import LobbyPage from './pages/LobbyPage.jsx'
import GamePage from './pages/GamePage.jsx'
import TopNav from './components/TopNav.jsx'
import { PlayerProvider, usePlayer } from './components/PlayerContext.jsx'

function RequirePlayer({ children }) {
  const { player } = usePlayer()
  const location = useLocation()
  if (!player?.name) return <Navigate to="/" replace state={{ from: location }} />
  return children
}

export default function App() {
  return (
    <PlayerProvider>
      <div className="app-shell">
        <TopNav />
        <main className="container py-4">
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route
              path="/lobby"
              element={
                <RequirePlayer>
                  <LobbyPage />
                </RequirePlayer>
              }
            />
            <Route
              path="/game/:id"
              element={
                <RequirePlayer>
                  <GamePage />
                </RequirePlayer>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </PlayerProvider>
  )
}
