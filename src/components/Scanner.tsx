import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

function playBeepSound(): void {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 1200
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.1)
  } catch {
    // fallback silencioso se AudioContext não disponível
  }
}

type ScannerProps = {
  onScan: (code: string) => void
  disabled?: boolean
}

export function Scanner({ onScan, disabled }: ScannerProps) {
  const reactId = useId()
  const containerId = `qr-reader-${reactId.replace(/:/g, '')}`
  const [torchOn, setTorchOn] = useState(false)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const lastCodeRef = useRef<string | null>(null)
  const lastCodeTimeRef = useRef(0)
  const onScanRef = useRef(onScan)
  const disabledRef = useRef(disabled)
  useEffect(() => {
    onScanRef.current = onScan
    disabledRef.current = disabled
  }, [onScan, disabled])

  const triggerFlash = useCallback(() => {
    const overlay = document.getElementById('scan-flash-overlay')
    if (overlay) {
      overlay.classList.add('scan-flash-active')
      setTimeout(() => overlay.classList.remove('scan-flash-active'), 200)
    }
  }, [])

  const handleSuccess = useCallback((decodedText: string) => {
    const now = Date.now()
    if (disabledRef.current) return
    if (decodedText === lastCodeRef.current && now - lastCodeTimeRef.current < 2000) return
    lastCodeRef.current = decodedText
    lastCodeTimeRef.current = now
    playBeepSound()
    triggerFlash()
    onScanRef.current(decodedText)
  }, [triggerFlash])

  const startScanner = useCallback(async () => {
    if (scannerRef.current) return
    const scanner = new Html5Qrcode(containerId)
    scannerRef.current = scanner
    const config = {
      fps: 10,
      qrbox: { width: 280, height: 180 },
      aspectRatio: 1.0,
      videoConstraints: {
        facingMode,
        advanced: [{ focusMode: 'continuous' }] as unknown as MediaTrackConstraintSet[],
      },
    }
    try {
      await scanner.start(
        { facingMode },
        config,
        handleSuccess,
        () => {}
      )
    } catch (err) {
      console.error('Erro ao iniciar câmera:', err)
    }
  }, [containerId, facingMode, handleSuccess])

  const stopScanner = useCallback(async () => {
    if (!scannerRef.current) return
    try {
      await scannerRef.current.stop()
    } catch {
      // ignore
    }
    scannerRef.current = null
  }, [])

  useEffect(() => {
    startScanner()
    return () => {
      stopScanner()
    }
  }, [startScanner, stopScanner])

  const switchCamera = useCallback(async () => {
    await stopScanner()
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
  }, [stopScanner])

  const toggleTorch = useCallback(async () => {
    const scanner = scannerRef.current
    if (!scanner) return
    try {
      const caps = scanner.getRunningTrackCameraCapabilities()
      const torch = caps?.torchFeature?.()
      if (torch) {
        const newState = !torchOn
        torch.apply(newState)
        setTorchOn(newState)
      }
    } catch {
      setTorchOn(false)
    }
  }, [torchOn])

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div id={containerId} className="rounded-2xl overflow-hidden bg-black" />
      <div
        id="scan-flash-overlay"
        className="pointer-events-none absolute inset-0 bg-white opacity-0 transition-opacity duration-150 rounded-2xl"
        aria-hidden
      />
      <div className="flex gap-3 mt-4 justify-center flex-wrap">
        <button
          type="button"
          onClick={switchCamera}
          className="min-h-[48px] px-6 py-3 rounded-xl bg-slate-700 text-white font-medium text-base touch-manipulation active:scale-95 transition"
        >
          Trocar câmera
        </button>
        <button
          type="button"
          onClick={toggleTorch}
          className="min-h-[48px] px-6 py-3 rounded-xl bg-slate-700 text-white font-medium text-base touch-manipulation active:scale-95 transition"
        >
          {torchOn ? 'Desligar flash' : 'Ligar flash'}
        </button>
      </div>
    </div>
  )
}
