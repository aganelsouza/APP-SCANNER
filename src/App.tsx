import { useCallback, useState } from 'react'
import { Scanner } from './components/Scanner'
import { sendCode } from './services/api'

type SendStatus = 'idle' | 'sending' | 'success' | 'error'

export default function App() {
  const [status, setStatus] = useState<SendStatus>('idle')
  const [lastMessage, setLastMessage] = useState<string>('')

  const handleScan = useCallback(async (code: string) => {
    setStatus('sending')
    setLastMessage('')
    const timestamp = new Date().toISOString()
    const result = await sendCode({ code, timestamp })
    if (result.ok) {
      setStatus('success')
      setLastMessage(`Enviado: ${code}`)
      setTimeout(() => setStatus('idle'), 2500)
    } else {
      setStatus('error')
      setLastMessage(result.message)
      setTimeout(() => setStatus('idle'), 4000)
    }
  }, [])

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
