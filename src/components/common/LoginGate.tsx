import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface LoginGateProps {
  onLoginSuccess: () => void;
}

export default function LoginGate({ onLoginSuccess }: LoginGateProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getCorrectPassword = (): string => {
    // Falls back to '1234' if process.env.SITE_PASSWORD is not configured
    return process.env.SITE_PASSWORD || '1234';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(false);

    const correctPassword = getCorrectPassword();
    
    // Simulate minor delay for polished feel
    setTimeout(() => {
      if (password === correctPassword) {
        toast.success('성공적으로 로그인되었습니다.');
        onLoginSuccess();
      } else {
        setError(true);
        toast.error('비밀번호가 일치하지 않습니다.');
      }
      setIsSubmitting(false);
    }, 400);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white select-none px-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-sm w-full py-8"
      >
        <div className="relative">
          <div className="text-center">
            <h1 className="text-[24px] font-extrabold text-zinc-800 tracking-tight">
              안녕하세요 선생님
            </h1>
            <p className="text-zinc-400 text-[13px] md:text-[14px] font-medium mt-[8px] leading-relaxed">
              설정된 비밀번호를 입력해 주세요.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-[80px] space-y-4">
            <div className="relative w-4/5 mx-auto">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(false);
                }}
                placeholder="Password"
                className={`w-full h-13 pl-[20px] pr-10 rounded-xl border-none bg-zinc-100/70 text-zinc-900 placeholder-zinc-500 caret-zinc-900 text-left text-[13px] font-medium tracking-wide focus:outline-none focus:ring-0 ${
                  error
                    ? 'bg-destructive/5 text-destructive'
                    : ''
                }`}
                disabled={isSubmitting}
                autoFocus
              />
              
              {/* Password Toggle Button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 transition-colors p-1 rounded-lg cursor-pointer"
                title={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPassword ? <EyeOff className="w-5 h-5 text-zinc-500" /> : <Eye className="w-5 h-5 text-zinc-500" />}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-1.5 text-destructive text-xs font-semibold w-4/5 mx-auto"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>비밀번호가 올바르지 않습니다.</span>
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !password}
              className="w-4/5 mx-auto h-13 rounded-xl bg-zinc-800 text-white text-[13px] font-extrabold cursor-pointer transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <span>LOGIN</span>
              )}
            </button>
          </form>

          {/* Help Info if password is still using fallback */}
          {!process.env.SITE_PASSWORD && (
            <div className="mt-8 p-3.5 bg-zinc-50 border border-zinc-100 rounded-xl text-center text-[11px] text-zinc-400 font-medium leading-relaxed">
              💡 아직 환경변수 <code className="font-mono bg-zinc-100 text-zinc-500 px-1 py-0.5 rounded">SITE_PASSWORD</code>가<br />
              설정되지 않아 기본 비밀번호(<code className="font-mono font-bold text-zinc-600">1234</code>)로 접속 가능합니다.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
