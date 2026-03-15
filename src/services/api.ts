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
  nota?: string
  viatura: string
  utd: string
  licenseKey: string
  // Adicionados para o fluxo de múltiplos terminais
  clientSheetId: string
  terminalId: string
}

export type TerminalRegistrationPayload = {
  clientSheetId: string;
  terminalName: string;
  viatura: string;
  utd: string;
}

export type TerminalRegistrationResult = { ok: true; terminalId: string } | { ok: false; message: string }

export type SendResult = { ok: true } | { ok: false; message: string }

/**
 * Valida a licença e retorna o ID da planilha (Database) do cliente.
 */
export async function validateLicense(licenseKey: string): Promise<{ ok: true; sheetId: string; maxTerminals: number } | { ok: false; message: string }> {
  const apiUrl = getApiUrl()
  try {
    // Chamamos o Apps Script via GET para validação
    const response = await fetch(`${apiUrl}?licenseKey=${licenseKey}&action=validate`) // Adicionado action=validate
    const data = await response.json()
    
    if (data.ok) {
      // O backend agora deve retornar maxTerminals
      return { ok: true, sheetId: data.sheetId, maxTerminals: data.maxTerminals }
    }
    return { ok: false, message: data.message || 'Licença inválida ou expirada.' }
  } catch (error) {
    console.error('Erro na licença:', error)
    return { ok: false, message: 'Erro ao conectar com servidor de licenças.' }
  }
}

/**
 * Envia o código lido para a API (POST JSON).
 */
export async function sendCode(payload: SendPayload): Promise<SendResult> { // SendPayload já inclui clientSheetId e terminalId
  const apiUrl = getApiUrl()
  try {
    const response = await fetch(`${apiUrl}?action=sendCode`, { // Adicionamos o parâmetro 'action'
      method: 'POST',
      // mode: 'no-cors', // Removido para permitir a leitura da resposta e tratamento de erros
      // O Apps Script precisa configurar o CORS corretamente.
      // Caso contrário, pode ser necessário adicionar `Access-Control-Allow-Origin: *` no Apps Script.
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    
    if (response.ok || response.type === 'opaque') return { ok: true }
    return { ok: false, message: 'Erro no servidor ao salvar dados.' }
  } catch (error) {
    const errorMessage = error instanceof Error ? 
    error.message : 'Erro desconhecido'
    console.error('Erro ao enviar o código:', errorMessage)
    return { ok: false, message: 'Falha ao enviar o código. Tente novamente.' }
  }
}

/**
 * Registra um novo terminal para um usuário licenciado.
 */
export async function registerTerminal(payload: TerminalRegistrationPayload): Promise<TerminalRegistrationResult> {
  const apiUrl = getApiUrl()
  try {
    const response = await fetch(`${apiUrl}?action=registerTerminal`, { // Novo parâmetro 'action'
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    return data as TerminalRegistrationResult;
  } catch (error) {
    console.error('Erro ao registrar terminal:', error)
    return { ok: false, message: 'Erro ao registrar terminal. Tente novamente.' }
  }
}
