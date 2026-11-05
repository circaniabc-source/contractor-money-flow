/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Money Flow Tracker - 4-digit PIN Security Lock Screen
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, Delete, ShieldAlert } from 'lucide-react';

export const PinLockModal: React.FC = () => {
  const { unlockWithPin } = useApp();
  const [pin, setPin] = useState('');
  const [errorShake, setErrorShake] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setErrorMessage('');

    if (nextPin.length === 4) {
      setTimeout(() => {
        const success = unlockWithPin(nextPin);
        if (!success) {
          setErrorShake(true);
          setErrorMessage('Incorrect PIN. Please try again.');
          setTimeout(() => {
            setErrorShake(false);
            setPin('');
          }, 600);
        }
      }, 100);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col justify-center items-center p-6 text-white select-none">
      <div className="w-full max-w-xs text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold tracking-tight">Enter Your App PIN</h2>
        <p className="text-xs text-slate-400 mt-1 mb-8">
          Money Flow Tracker is locked for your privacy
        </p>

        {/* 4 dots */}
        <div
          className={`flex items-center justify-center gap-4 mb-6 transition-transform ${
            errorShake ? 'animate-bounce text-rose-500' : ''
          }`}
        >
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                pin.length > idx
                  ? errorShake
                    ? 'bg-rose-500 border-rose-500 scale-110'
                    : 'bg-emerald-500 border-emerald-500 scale-110'
                  : 'border-slate-600 bg-transparent'
              }`}
            />
          ))}
        </div>

        {errorMessage && (
          <div className="flex items-center gap-1.5 text-xs text-rose-400 mb-4 animate-fade-in">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Numeric keypad */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-[260px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              type="button"
              className="w-16 h-16 rounded-full bg-slate-800/80 hover:bg-slate-700 active:bg-emerald-600 active:scale-95 text-xl font-bold text-white flex items-center justify-center transition-all mx-auto shadow-sm"
            >
              {num}
            </button>
          ))}

          <button
            onClick={() => setPin('')}
            type="button"
            className="w-16 h-16 rounded-full text-xs font-semibold text-slate-400 hover:text-white flex items-center justify-center mx-auto"
          >
            Clear
          </button>

          <button
            onClick={() => handleDigit('0')}
            type="button"
            className="w-16 h-16 rounded-full bg-slate-800/80 hover:bg-slate-700 active:bg-emerald-600 active:scale-95 text-xl font-bold text-white flex items-center justify-center transition-all mx-auto shadow-sm"
          >
            0
          </button>

          <button
            onClick={handleDelete}
            type="button"
            className="w-16 h-16 rounded-full text-slate-400 hover:text-white active:scale-95 flex items-center justify-center mx-auto"
            aria-label="Delete last digit"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
