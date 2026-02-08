import { API_BASE_URL } from './config'

function isGuidLike(s) {
  return (
    typeof s === 'string' &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s)
  )
}

export async function apiFetch(path, { method = 'GET', body, ...rest } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(rest.headers || {})
    },
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest
  })

  const contentType = res.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await res.json().catch(() => null)
    : await res.text().catch(() => '')

  if (!res.ok) {
    const message = payload?.message || payload?.title || (typeof payload === 'string' ? payload : '') || `Request failed (${res.status})`
    const err = new Error(message)
    err.status = res.status
    err.code = payload?.code
    err.payload = payload
    throw err
  }

  if (isGuidLike(payload)) return { id: payload }
  return payload
}
