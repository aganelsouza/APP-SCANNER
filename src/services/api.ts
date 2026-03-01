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
    await fetch(apiUrl, {
      method: 'POST',
      mode: 'no-cors', // Evita erros CORS, mas não permite ler a resposta
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return { ok: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Erro ao enviar código:', errorMessage)
    return { ok: false, message: 'Falha ao enviar o código. Tente novamente.' }
  }
  }
