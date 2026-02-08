import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { usePlayer } from './PlayerContext.jsx'

export default function TopNav() {
  const { player, logout } = usePlayer()
  const location = useLocation()
  const navigate = useNavigate()

  const onLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark border-bottom border-dark-subtle">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center gap-2" to={player?.name ? '/lobby' : '/'}>
          <span className="brand-dot" />
          <span className="fw-semibold">TicTacToe Arena</span>
        </Link>

        <div className="d-flex align-items-center gap-2">
          {player?.name ? (
            <>
              <span className="badge text-bg-secondary d-none d-sm-inline">{player.name}</span>
              <Link
                className={`btn btn-sm ${location.pathname.startsWith('/lobby') ? 'btn-outline-light' : 'btn-outline-secondary'}`}
                to="/lobby"
              >
                Lobby
              </Link>
              <button className="btn btn-sm btn-warning" onClick={onLogout}>
                Change name
              </button>
            </>
          ) : (
            <span className="navbar-text text-secondary">No login, just vibe ✨</span>
          )}
        </div>
      </div>
    </nav>
  )
}
