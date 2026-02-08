import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/http'
import { usePlayer } from '../components/PlayerContext.jsx'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setPlayer, player } = usePlayer()
  const [name, setName] = useState(player?.name || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const trimmed = useMemo(() => name.trim(), [name])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!trimmed) {
      setError('Please enter your name.')
      return
    }
    setBusy(true)
    try {
      const dto = await apiFetch('/api/players/login', {
        method: 'POST',
        body: { name: trimmed }
      })
      setPlayer({ name: dto.name })
      navigate('/lobby')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-md-8 col-lg-6">
        <div className="card shadow-sm border-0">
          <div className="card-body p-4 p-md-5">
            <h1 className="display-6 fw-bold mb-2">Play Tic-Tac-Toe online</h1>
            <p className="text-secondary mb-4">No registration. No password. Pick a name and jump into the arena.</p>

            {error ? <div className="alert alert-danger">{error}</div> : null}

            <form onSubmit={onSubmit} className="d-grid gap-2">
              <label className="form-label mb-1">Your name</label>
              <input
                className="form-control form-control-lg"
                placeholder="e.g. Neo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={64}
                autoFocus
              />
              <button className="btn btn-primary btn-lg mt-2" disabled={busy || !trimmed}>
                {busy ? 'Entering…' : 'Enter the lobby'}
              </button>
            </form>


          </div>
        </div>
      </div>
    </div>
  )
}
