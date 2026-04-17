import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const PIN_LENGTH = 4;

export default function LoginPage() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKey = (digit: string) => {
    if (pin.length >= PIN_LENGTH) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError("");
    if (newPin.length === PIN_LENGTH) {
      submitPin(newPin);
    }
  };

  const handleBackspace = () => {
    setPin((p) => p.slice(0, -1));
    setError("");
  };

  const submitPin = async (value: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pin: value }),
      });
      if (res.ok) {
        navigate("/", { replace: true });
      } else {
        triggerShake("PIN 碼錯誤，請再試一次");
      }
    } catch {
      triggerShake("連線失敗，請重試");
    } finally {
      setLoading(false);
    }
  };

  const triggerShake = (msg: string) => {
    setPin("");
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const dots = Array.from({ length: PIN_LENGTH }, (_, i) => i < pin.length);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🦞</div>
        <h1 className="text-2xl font-bold text-white">ClaudeTable</h1>
        <p className="text-slate-400 text-sm mt-1">海鮮餐廳訂位系統</p>
      </div>

      <div
        className="bg-slate-800 rounded-2xl p-8 w-full max-w-xs shadow-2xl"
        style={{
          animation: shake ? "shake 0.5s ease-in-out" : undefined,
        }}
      >
        <p className="text-slate-300 text-center text-sm mb-6">請輸入 PIN 碼</p>

        {/* Dots indicator */}
        <div className="flex justify-center gap-4 mb-6">
          {dots.map((filled, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                filled
                  ? "bg-sky-400 border-sky-400 scale-110"
                  : "border-slate-500 bg-transparent"
              }`}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-red-400 text-xs text-center mb-4">{error}</p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button
              key={d}
              onClick={() => handleKey(d)}
              disabled={loading}
              className="bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white text-xl font-semibold h-14 rounded-xl transition-colors disabled:opacity-50"
            >
              {d}
            </button>
          ))}
          {/* Empty, 0, Backspace */}
          <div />
          <button
            onClick={() => handleKey("0")}
            disabled={loading}
            className="bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white text-xl font-semibold h-14 rounded-xl transition-colors disabled:opacity-50"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            disabled={loading || pin.length === 0}
            className="bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-slate-300 text-lg h-14 rounded-xl transition-colors disabled:opacity-30"
          >
            ⌫
          </button>
        </div>

        {/* Hidden input for keyboard support on desktop */}
        <input
          ref={inputRef}
          type="tel"
          value={pin}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH);
            setPin(v);
            if (v.length === PIN_LENGTH) submitPin(v);
          }}
          className="sr-only"
          aria-label="PIN input"
        />
      </div>

      <p className="text-slate-600 text-xs mt-6">預設 PIN：1234</p>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
