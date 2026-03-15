import React, { useState } from 'react';
import { registerTerminal } from '../services/api';
import { User, Truck, MapPin } from 'lucide-react';

type TerminalRegistrationProps = {
  clientSheetId: string;
  setTerminalId: (id: string) => void;
  maxTerminals: number;
};

export function TerminalRegistration({ clientSheetId, setTerminalId, maxTerminals }: TerminalRegistrationProps) {
  const [terminalName, setTerminalName] = useState('');
  const [viatura, setViatura] = useState('');
  const [utd, setUtd] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTerminalRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalName.trim() || !viatura.trim() || !utd.trim()) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    setIsLoading(true);
    const result = await registerTerminal({ clientSheetId, terminalName, viatura, utd });

    if (result.ok) {
      localStorage.setItem('scanner_terminal_id', result.terminalId);
      setTerminalId(result.terminalId);
      alert('Terminal registrado com sucesso!');
    } else {
      alert(result.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
      <form onSubmit={handleTerminalRegister} className="w-full max-w-sm bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl text-center">
        <User className="mx-auto mb-4 text-blue-400" size={48} />
        <h2 className="text-xl font-bold mb-2">Registrar Terminal</h2>
        <p className="text-slate-400 text-sm mb-6">
          Este terminal será vinculado à planilha do usuário licenciado. Limite de terminais: {maxTerminals}.
        </p>
        
        <div className="relative mb-4">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            value={terminalName}
            onChange={(e) => setTerminalName(e.target.value)}
            placeholder="Nome da Equipe/Usuário"
            className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 pl-10 pr-4 outline-none focus:border-blue-500"
            required
          />
        </div>
        <div className="relative mb-4">
          <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            value={viatura}
            onChange={(e) => setViatura(e.target.value)}
            placeholder="Viatura (Ex: V-01)"
            className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 pl-10 pr-4 outline-none focus:border-blue-500"
            required
          />
        </div>
        <div className="relative mb-6">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            value={utd}
            onChange={(e) => setUtd(e.target.value)}
            placeholder="UTD (Ex: UTD-LOG)"
            className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 pl-10 pr-4 outline-none focus:border-blue-500"
            required
          />
        </div>
        <button disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded-lg font-semibold transition-all">
          {isLoading ? 'Registrando...' : 'Registrar Terminal'}
        </button>
      </form>
    </div>
  );
}