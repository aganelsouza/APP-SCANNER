import { useCallback, useState, useEffect } from 'react'
import { Scanner } from './components/Scanner'
import { sendCode, validateLicense } from './services/api'
import { ShieldCheck, Key, Share2, X } from 'lucide-react'
import { TerminalRegistration } from './components/TerminalRegistration'

type SendStatus = 'idle' | 'sending' | 'success' | 'error'

export default function App() {
  const [status, setStatus] = useState<SendStatus>('idle')
  const [lastMessage, setLastMessage] = useState<string>('')
  const [licenseKey, setLicenseKey] = useState<string>(localStorage.getItem('scanner_license') || '')
  const [clientSheetId, setClientSheetId] = useState<string | null>(localStorage.getItem('scanner_sheet_id'))
  const [terminalId, setTerminalId] = useState<string | null>(localStorage.getItem('scanner_terminal_id'))
  const [maxTerminals, setMaxTerminals] = useState<number>(parseInt(localStorage.getItem('scanner_max_terminals') || '0'))
  const [showInvite, setShowInvite] = useState(false)

  // Detecta convite via URL (Deep Linking simplificado)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const inviteId = params.get('invite')
    const inviteKey = params.get('key')

    if (inviteId && inviteKey && !terminalId) {
      localStorage.setItem('scanner_license', inviteKey)
      localStorage.setItem('scanner_sheet_id', inviteId)
      setLicenseKey(inviteKey)
      setClientSheetId(inviteId)
      
      // Limpa a URL para não ficar com os parâmetros expostos
      window.history.replaceState({}, document.title, window.location.pathname)
      alert('Configurações de licença importadas! Agora registre seu terminal.')
    }
  }, [terminalId])

  // Calculamos isLicensedUser diretamente dos dados existentes.
  const isLicensedUser = !!(licenseKey && clientSheetId)
  const [isLoadingLicense, setIsLoadingLicense] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!licenseKey.trim()) return
    
    setIsLoadingLicense(true)
    const result = await validateLicense(licenseKey)
    
    if (result.ok) {
      localStorage.setItem('scanner_license', licenseKey)
      localStorage.setItem('scanner_sheet_id', result.sheetId)
      localStorage.setItem('scanner_max_terminals', result.maxTerminals.toString())
      setClientSheetId(result.sheetId)
      setMaxTerminals(result.maxTerminals)
    } else {
      localStorage.removeItem('scanner_license')
      // Clear any old license info if validation fails
      alert(result.message)
    }
    setIsLoadingLicense(false)
  }

  const handleScan = useCallback(async (code: string) => {
    setStatus('sending')
    setLastMessage('')
    const timestamp = new Date().toISOString()
    
    if (!clientSheetId || !terminalId) {
      setLastMessage('Erro: Terminal não registrado ou licença inválida.')
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
      return
    }

    const result = await sendCode({ 
      code, 
      timestamp, 
      nota: '', 
      viatura: 'V-01', 
      utd: 'UTD-LOG',
      licenseKey: licenseKey,
      clientSheetId: clientSheetId,
      terminalId: terminalId,
    })

    if (result.ok) {
      setStatus('success')
      setLastMessage(`Enviado: ${code}`)
      setTimeout(() => setStatus('idle'), 1500)
    } else {
      setStatus('error')
      setLastMessage(result.message)
      setTimeout(() => setStatus('idle'), 2500)
    }
  }, [licenseKey, clientSheetId, terminalId])
  // If not a licensed user, show the license activation screen
  if (!isLicensedUser) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <form onSubmit={handleRegister} className="w-full max-w-sm bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl text-center">
          <ShieldCheck className="mx-auto mb-4 text-amber-500" size={48} />
          <h2 className="text-xl font-bold mb-2">Ativar Scanner</h2>
          <p className="text-slate-400 text-sm mb-6">Insira sua licença para configurar seu banco de dados no Excel/Sheets.</p>
          <div className="relative mb-4">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
              placeholder="CHAVE-LICENCA"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 pl-10 pr-4 outline-none focus:border-amber-500"
              required
            />
          </div>
          <button disabled={isLoadingLicense} className="w-full bg-amber-600 hover:bg-amber-500 py-2 rounded-lg font-semibold transition-all">
            {isLoadingLicense ? 'Validando...' : 'Ativar Agora'}
          </button>
        </form>
      </div>
    )
  }

  // If licensed but no terminal registered (e.g., a new terminal user scanning QR)
  if (isLicensedUser && !terminalId) {
    return <TerminalRegistration clientSheetId={clientSheetId!} setTerminalId={setTerminalId} maxTerminals={maxTerminals} />
  }

  const inviteLink = `${window.location.origin}?invite=${clientSheetId}&key=${licenseKey}`

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-6 px-4 pb-10">
      <header className="w-full max-w-md flex justify-between items-center mb-4 px-2">
        <div className="text-left">
          <h1 className="text-xl font-bold text-white">Scanner Logístico</h1>
          <p className="text-slate-400 text-xs">Terminal: {terminalId}</p>
        </div>
        <button 
          onClick={() => setShowInvite(true)}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors border border-slate-700"
          title="Conectar novo aparelho"
        >
          <Share2 size={20} className="text-amber-500" />
        </button>
      </header>

      {/* Modal de Convite */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl max-w-sm w-full relative">
            <button onClick={() => setShowInvite(false)} className="absolute right-4 top-4 text-slate-400 hover:text-white">
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold mb-4">Conectar Novo Aparelho</h3>
            <p className="text-sm text-slate-400 mb-4">
              Envie este link para o outro aparelho ou gere um QR Code com ele:
            </p>
            <div className="bg-slate-900 p-3 rounded-lg break-all text-xs font-mono border border-slate-700 mb-4">
              {inviteLink}
            </div>
            <button 
              onClick={() => { navigator.clipboard.writeText(inviteLink); alert('Link copiado!'); }}
              className="w-full bg-amber-600 hover:bg-amber-500 py-2 rounded-lg font-semibold transition-all"
            >
              Copiar Link de Convite
            </button>
          </div>
        </div>
      )}

      <main className="w-full flex-1 flex flex-col items-center">
        <div className="w-full flex justify-center mb-4 min-h-[48px]">
          {status === 'sending' && (
            <div className="flex items-center gap-2 text-amber-400">
              <span className="inline-block w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <span>Enviando...</span>
            </div>
          )}
          {status === 'success' && (
            <div className="flex items-center gap-2 text-emerald-400">
              <span className="text-lg" aria-hidden>✓</span>
              <span>{lastMessage || 'Enviado com sucesso!'}</span>
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-2 text-red-400 max-w-[90%]">
              <span className="text-lg shrink-0" aria-hidden>✕</span>
              <span>{lastMessage || 'Erro ao enviar.'}</span>
            </div>
          )}
          {status === 'idle' && (
            <span className="text-slate-500 text-sm">Leia um código para enviar</span>
          )}
        </div>

        <div className={status === 'sending' ? 'pointer-events-none opacity-70' : ''}>
          <Scanner onScan={handleScan} disabled={status === 'sending'} />
        </div>
      </main>
    </div>
  )
}
