import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/http'
import { usePlayer } from '../components/PlayerContext.jsx'
import { getHubConnection, ensureHubConnected } from '../api/realtime'

function formatUtc(iso) {
  try {
    const d = new Date(iso)
    return d.toLocaleString()
  } catch {
    return iso
  }
}

export default function LobbyPage() {
  const { player } = usePlayer()
  const navigate = useNavigate()

  const [stats, setStats] = useState(null)
  const [openGames, setOpenGames] = useState([])
  const [busyCreate, setBusyCreate] = useState(false)
  const [error, setError] = useState(null)

  const reload = async () => {
    setError(null)
    const [s, g] = await Promise.all([
      apiFetch(`/api/players/${encodeURIComponent(player.name)}/stats`),
      apiFetch('/api/games/open')
    ])
    setStats(s)
    setOpenGames(g)
  }

  useEffect(() => {
    let alive = true
    let hub = null

    const attach = async () => {
      await reload()

      hub = await getHubConnection(player.name)
      await ensureHubConnected(hub)

      if (hub.state === 'Connected') {
        await hub.invoke('JoinLobby')
      }

      const onLobbyUpdated = async () => {
        if (!alive) return
        try {
          const [g, s] = await Promise.all([
            apiFetch('/api/games/open'),
            apiFetch(`/api/players/${encodeURIComponent(player.name)}/stats`)
          ])
          if (alive) {
            setOpenGames(g)
            setStats(s)
          }
        } catch {
        }
      }

      hub.on('LobbyUpdated', onLobbyUpdated)
      return () => {
        hub.off('LobbyUpdated', onLobbyUpdated)
      }
    }

    let detach = null
    attach()
      .then((fn) => {
        detach = fn
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })

    return () => {
      alive = false
      if (detach) detach()
      if (hub) {
        ensureHubConnected(hub)
          .then((h) => h?.invoke('LeaveLobby'))
          .catch(() => { })
      }
    }
  }, [player.name])


  const myOpenGames = useMemo(() => openGames.filter((g) => g.playerXName === player.name), [openGames, player.name])

  const onCreate = async () => {
    setBusyCreate(true)
    setError(null)
    try {
      const res = await apiFetch('/api/games', { method: 'POST', body: { playerName: player.name } })
      const id = res?.id || res?.Id || res
      if (!id) throw new Error('Backend did not return game id.')
      navigate(`/game/${id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyCreate(false)
    }
  }

  const onJoin = async (gameId) => {
    setError(null)
    try {
      await apiFetch(`/api/games/${gameId}/join`, { method: 'POST', body: { playerName: player.name } })
      navigate(`/game/${gameId}`)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="row g-4">
      <div className="col-12 col-lg-4">
        <div className="card shadow-sm border-0 sticky-lg-top" style={{ top: 20 }}>
          <div className="card-body">
            <h2 className="h5 fw-bold mb-3">Your stats</h2>
            {error ? <div className="alert alert-danger">{error}</div> : null}

            {stats ? (
              <div className="stats-grid">
                <div className="stat">
                  <div className="stat-label">Played</div>
                  <div className="stat-value">{stats.played}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Wins</div>
                  <div className="stat-value">{stats.wins}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Losses</div>
                  <div className="stat-value">{stats.losses}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Draws</div>
                  <div className="stat-value">{stats.draws}</div>
                </div>
              </div>
            ) : (
              <div className="text-secondary">Loading…</div>
            )}

            <hr />

            <button className="btn btn-primary w-100" onClick={onCreate} disabled={busyCreate}>
              {busyCreate ? 'Creating…' : 'Create new game'}
            </button>

            {myOpenGames.length ? (
              <div className="mt-3 small text-secondary">
                <div className="fw-semibold text-dark mb-1">Your open games:</div>
                {myOpenGames.map((g) => (
                  <div key={g.id} className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-truncate">{g.id}</span>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate(`/game/${g.id}`)}>
                      Open
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="col-12 col-lg-8">
        <div className="d-flex align-items-end justify-content-between mb-3">
          <div>
            <div className="text-secondary">Pick one to join — it starts instantly.</div>
          </div>
        </div>

        {openGames?.length ? (
          <div className="row g-3">
            {openGames.map((g) => (
              <div className="col-12 col-md-6" key={g.id}>
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div>
                        <div className="fw-semibold">{g.playerXName}</div>
                        <div className="small text-secondary">Created: {formatUtc(g.createdAtUtc)}</div>
                      </div>
                      <span className="badge text-bg-info">Open</span>
                    </div>
                    <div className="mt-3 d-grid">
                      <button className="btn btn-success" onClick={() => onJoin(g.id)}>
                        Join as O
                      </button>
                    </div>
                    <div className="mt-2 small text-secondary">Game id: {g.id}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-secondary">No open games right now. Create one and invite a friend!</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
