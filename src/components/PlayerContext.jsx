import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const PlayerCtx = createContext(null)
const LS_KEY = 'tictactoe_arena_player'

export function PlayerProvider({ children }) {
  const [player, setPlayer] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (player) localStorage.setItem(LS_KEY, JSON.stringify(player))
    else localStorage.removeItem(LS_KEY)
  }, [player])

  const value = useMemo(() => ({ player, setPlayer, logout: () => setPlayer(null) }), [player])

  return <PlayerCtx.Provider value={value}>{children}</PlayerCtx.Provider>
}

export function usePlayer() {
  const ctx = useContext(PlayerCtx)
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider')
  return ctx
}
