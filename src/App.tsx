import { useCallback, useState } from 'react'
import { Scanner } from './components/Scanner'
import { sendCode, validateLicense } from './services/api'
import { ShieldCheck, Key } from 'lucide-react'

type SendStatus = 'idle' | 'sending' | 'success' | 'error'

export default function App() {
  const [status, setStatus] = useState<SendStatus>('idle')
  const [lastMessage, setLastMessage] = useState<string>('')
  const [license, setLicense] = useState<string>(localStorage.getItem('scanner_license') || '')
  const [isRegistered, setIsRegistered] = useState<boolean>(!!localStorage.getItem('scanner_license'))
  const [isLoadingLicense, setIsLoadingLicense] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!license.trim()) return
    
    setIsLoadingLicense(true)
    const result = await validateLicense(license)
    
    if (result.ok) {
      localStorage.setItem('scanner_license', license)
      localStorage.setItem('scanner_sheet_id', result.sheetId)
      setIsRegistered(true)
    } else {
      alert(result.message)
    }
    setIsLoadingLicense(false)
  }

  const handleScan = useCallback(async (code: string) => {
    setStatus('sending')
    setLastMessage('')
    const timestamp = new Date().toISOString()
    
    const result = await sendCode({ 
      code, 
      timestamp, 
      nota: '', 
      viatura: 'V-01', 
      utd: 'UTD-LOG',
      licenseKey: license 
    })

    if (result.ok) {
      setStatus('success')
      setLastMessage(`Enviado: ${code}`)
      setTimeout(() => setStatus('idle'), 2000)
    } else {
      setStatus('error')
      setLastMessage(result.message)
      setTimeout(() => setStatus('idle'), 3000)
    }
  }, [license])

  if (!isRegistered) {
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
              value={license}
              onChange={(e) => setLicense(e.target.value.toUpperCase())}
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-6 px-4 pb-10">
      <header className="w-full max-w-md text-center mb-4">
        <h1 className="text-xl font-bold text-white">Scanner Logístico</h1>
        <p className="text-slate-400 text-sm mt-1">Aponte para o código de barras</p>
      </header>

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
