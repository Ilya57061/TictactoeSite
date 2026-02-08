import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../api/http'
import { usePlayer } from '../components/PlayerContext.jsx'
import { getHubConnection, ensureHubConnected } from '../api/realtime'

function markToChar(m) {
  if (m === 1 || m === 'X') return 'X'
  if (m === 2 || m === 'O') return 'O'
  return ''
}

function statusBadge(status) {
  if (status === 0 || status === 'Open') return { label: 'Open', cls: 'text-bg-info' }
  if (status === 1 || status === 'InProgress') return { label: 'In progress', cls: 'text-bg-primary' }
  return { label: 'Finished', cls: 'text-bg-success' }
}

export default function GamePage() {
  const { id } = useParams()
  const { player } = usePlayer()
  const navigate = useNavigate()

  const [game, setGame] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const reload = async () => {
    const g = await apiFetch(`/api/games/${id}`)
    setGame(g)
  }

  useEffect(() => {
    let alive = true
    let hub = null
    let detach = null

      ; (async () => {
        try {
          await reload()

          hub = await getHubConnection(player.name)
          await ensureHubConnected(hub)

          if (hub.state === 'Connected') {
            await hub.invoke('LeaveLobby').catch(() => { })
            await hub.invoke('JoinGame', id)
          }

          const onGameUpdated = (updated) => {
            if (!alive) return
            setGame(updated)
          }

          const onPlayerLeft = (name) => {
            if (!alive) return
            setError(`${name} left the game`)
          }

          hub.on('GameUpdated', onGameUpdated)
          hub.on('PlayerLeft', onPlayerLeft)

          detach = () => {
            hub.off('GameUpdated', onGameUpdated)
            hub.off('PlayerLeft', onPlayerLeft)
          }
        } catch (err) {
          if (alive) setError(err.message)
        }
      })()

    return () => {
      alive = false
      if (detach) detach()
      if (hub) {
        ensureHubConnected(hub)
          .then((h) => h?.invoke('LeaveGame', id))
          .catch(() => { })
      }
    }
  }, [id, player.name])


  const role = useMemo(() => {
    if (!game) return { mine: false, mark: null }
    if (game.playerXName === player.name) return { mine: true, mark: 'X' }
    if (game.playerOName === player.name) return { mine: true, mark: 'O' }
    return { mine: false, mark: null }
  }, [game, player.name])

  const turn = useMemo(() => {
    if (!game) return null
    const xs = (game.board || []).filter((m) => m === 1 || m === 'X').length
    const os = (game.board || []).filter((m) => m === 2 || m === 'O').length
    return xs <= os ? 'X' : 'O'
  }, [game])

  const canMove = useMemo(() => {
    if (!game) return false
    if (game.status !== 1 && game.status !== 'InProgress') return false
    if (!role.mine) return false
    return role.mark === turn
  }, [game, role, turn])

  const winnerText = useMemo(() => {
    if (!game) return ''
    if (game.status !== 2 && game.status !== 'Finished') return ''
    const w = game.winner
    if (w === 1 || w === 'X') return `${game.playerXName} wins (X) 🏆`
    if (w === 2 || w === 'O') return `${game.playerOName || 'O'} wins (O) 🏆`
    return 'Draw 🤝'
  }, [game])

  const doMove = async (cellIndex) => {
    if (!game) return
    setError(null)
    setBusy(true)
    try {
      await apiFetch(`/api/games/${id}/move`, {
        method: 'POST',
        body: { playerName: player.name, cellIndex }
      })
      await reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const doRematch = async () => {
    if (!game) return
    setError(null)
    setBusy(true)
    try {
      await apiFetch(`/api/games/${id}/rematch`, {
        method: 'POST',
        body: { playerName: player.name }
      })
      await reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const quickJoin = async () => {
    setError(null)
    setBusy(true)
    try {
      await apiFetch(`/api/games/${id}/join`, { method: 'POST', body: { playerName: player.name } })
      await reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const badge = game ? statusBadge(game.status) : null

  return (
    <div className="row g-4">
      <div className="col-12 col-lg-4">
        <div className="card shadow-sm border-0">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start gap-2">
              <div>
                <h2 className="h5 fw-bold mb-1">Game</h2>
              </div>
              {badge ? <span className={`badge ${badge.cls}`}>{badge.label}</span> : null}
            </div>

            {error ? <div className="alert alert-danger mt-3">{error}</div> : null}

            {game ? (
              <>
                <div className="mt-3">
                  <div className="d-flex justify-content-between">
                    <span className="text-secondary">X</span>
                    <span className="fw-semibold">{game.playerXName}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-secondary">O</span>
                    <span className="fw-semibold">{game.playerOName || '— (waiting)'}</span>
                  </div>
                </div>

                {game.status === 0 || game.status === 'Open' ? (
                  <div className="mt-3">
                    {role.mine && role.mark === 'X' ? (
                      <div className="alert alert-info mb-2">Waiting for an opponent to join…</div>
                    ) : (
                      <button className="btn btn-success w-100" onClick={quickJoin} disabled={busy}>
                        Join game
                      </button>
                    )}

                    <div className="mt-2 small text-secondary">
                      Share this link: <span className="text-break">{window.location.href}</span>
                    </div>
                  </div>
                ) : null}

                {game.status === 1 || game.status === 'InProgress' ? (
                  <div className="mt-3">
                    <div className={`alert ${canMove ? 'alert-success' : 'alert-secondary'} mb-2`}>
                      {role.mine ? (
                        canMove ? (
                          <>Your move ({role.mark})</>
                        ) : (
                          <>Opponent's move ({turn})</>
                        )
                      ) : (
                        <>Spectating • Turn: {turn}</>
                      )}
                    </div>
                  </div>
                ) : null}

                {winnerText ? (
                  <div className="mt-3">
                    <div className="alert alert-success mb-2">{winnerText}</div>
                    {role.mine && game.playerOName ? (
                      <button className="btn btn-warning w-100" onClick={doRematch} disabled={busy}>
                        Play again (same session)
                      </button>
                    ) : (
                      <div className="small text-secondary">Waiting for players to start a new round…</div>
                    )}
                  </div>
                ) : null}

                <hr />
                <div className="d-flex gap-2">
                  <Link className="btn btn-outline-secondary flex-fill" to="/lobby">
                    Back to lobby
                  </Link>
                  <button className="btn btn-outline-danger" onClick={() => navigate('/lobby')}>
                    Exit
                  </button>
                </div>
              </>
            ) : (
              <div className="text-secondary mt-3">Loading…</div>
            )}
          </div>
        </div>
      </div>

      <div className="col-12 col-lg-8">
        <div className="card shadow-sm border-0">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <div className="text-secondary">Click a cell to make a move.</div>
              </div>
              {role.mine ? <span className="badge text-bg-dark">You are {role.mark}</span> : <span className="badge text-bg-secondary">Spectator</span>}
            </div>

            <div className={`board ${busy ? 'board-busy' : ''} ${canMove ? 'board-can-move' : ''}`}>
              {Array.from({ length: 9 }).map((_, idx) => {
                const cellMark = game?.board ? markToChar(game.board[idx]) : ''
                const disabled = busy || !canMove || !!cellMark
                return (
                  <button
                    key={idx}
                    className={`cell btn ${cellMark ? 'cell-filled' : 'cell-empty'}`}
                    onClick={() => doMove(idx)}
                    disabled={disabled}
                    aria-label={`Cell ${idx + 1}`}
                  >
                    <span
                      className={`cell-mark ${cellMark === 'X' ? 'cell-mark-x' : cellMark === 'O' ? 'cell-mark-o' : ''
                        }`}
                    >
                      {cellMark}
                    </span>
                  </button>
                )
              })}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
