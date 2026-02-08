import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { HUB_URL } from './config'

let connection = null
let connectingPromise = null
let currentPlayerName = null

function buildHubUrl(playerName) {
  if (!playerName) return HUB_URL
  const sep = HUB_URL.includes('?') ? '&' : '?'
  return `${HUB_URL}${sep}player=${encodeURIComponent(playerName)}`
}

export async function getHubConnection(playerName) {
  if (connection && currentPlayerName !== playerName) {
    await stopHubConnection()
  }

  if (connection) return connection
  if (connectingPromise) return connectingPromise

  currentPlayerName = playerName || null

  connectingPromise = (async () => {
    connection = new HubConnectionBuilder()
      .withUrl(buildHubUrl(currentPlayerName), { withCredentials: true })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build()

    await connection.start()
    return connection
  })()

  try {
    return await connectingPromise
  } finally {
    connectingPromise = null
  }
}

export async function ensureHubConnected(hub) {
  if (!hub) return null
  if (hub.state === 'Connected') return hub
  if (hub.state === 'Disconnected') {
    await hub.start()
  }
  return hub
}

export async function safeInvoke(playerName, method, ...args) {
  const hub = await getHubConnection(playerName)
  await ensureHubConnected(hub)
  if (hub.state !== 'Connected') {
    throw new Error('Realtime connection is not connected')
  }
  return hub.invoke(method, ...args)
}

export async function stopHubConnection() {
  if (!connection) return
  try {
    await connection.stop()
  } finally {
    connection = null
    currentPlayerName = null
  }
}