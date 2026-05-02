import { useState, useEffect } from 'react';
import { Shield, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { session } from '../utils/storage';

const VAULT_PIN = '2026'; // Default pilot PIN

export default function Gatekeeper({ children }) {
  const [pin, setPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const unlocked = session.getItem('vault_unlocked');
    if (unlocked === 'true') {
      setIsUnlocked(true);
    }
    setIsLoading(false);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin === VAULT_PIN) {
      session.setItem('vault_unlocked', 'true');
      setIsUnlocked(true);
      setShowModal(false);
      setError(null);
    } else {
      setError('Invalid verification PIN. Access denied.');
      setPin('');
    }
  };

  const handleOpenGate = () => setShowModal(true);

  if (isLoading) return null;

  return (
    <>
      {children(isUnlocked, handleOpenGate)}

      {showModal && (
        <div className="fixed inset-0 z-[9999] bg-vault-bg/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-vault-surface border border-white/[0.08] rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-vault-green/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-vault-green/10 border border-vault-green/20 flex items-center justify-center mb-6">
                <Shield className="text-vault-green" size={32} />
              </div>
              
              <h1 className="text-2xl font-bold text-vault-text mb-2">Admin Verification</h1>
              <p className="text-vault-muted text-sm mb-8 leading-relaxed">
                Enter the administrator PIN to unlock sensitive CO₂ metrics and payout data.
              </p>

              <form onSubmit={handleSubmit} className="w-full space-y-4">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-vault-muted">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter 4-digit PIN"
                    className="w-full bg-vault-surface2 border border-white/[0.1] rounded-xl py-3.5 pl-12 pr-4 text-vault-text focus:outline-none focus:border-vault-green/50 transition-all tracking-[0.5em] text-lg font-mono"
                    autoFocus
                    maxLength={4}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-vault-red text-xs bg-vault-red/10 p-3 rounded-lg border border-vault-red/20 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={14} />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-vault-green hover:bg-vault-green/90 text-vault-bg font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all group"
                >
                  Verify Identity
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full text-vault-muted hover:text-vault-text text-xs py-2 transition-colors"
                >
                  Cancel
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
