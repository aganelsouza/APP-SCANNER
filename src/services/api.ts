/**
 * Serviço de envio de códigos lidos para a API (Google Apps Script).
 */

const getApiUrl = (): string => {
  const url = import.meta.env.VITE_API_URL
  if (!url) {
    throw new Error('VITE_API_URL não configurada. Defina no .env a URL do seu Google Apps Script.')
  }
  return url
}

export type SendPayload = {
  code: string
  timestamp: string
}

export type SendResult = { ok: true } | { ok: false; message: string }

/**
 * Envia o código lido para a API (POST JSON).
 */
export async function sendCode(payload: SendPayload): Promise<SendResult> {
  const apiUrl = getApiUrl()
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text()
      return { ok: false, message: text || `Erro ${res.status}` }
    }
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha na rede'
    return { ok: false, message }
  }
}
