'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Key, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/components/LanguageProvider';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const redirect = searchParams.get('redirect') || '/library';
  const urlToken = searchParams.get('token');
  const errorParam = searchParams.get('error');

  useEffect(() => {
    // 如果 URL 中有 token，自动填充并登录
    if (urlToken) {
      setToken(urlToken);
      handleLogin(urlToken);
    }
    
    // 显示错误信息
    if (errorParam === 'invalid_token') {
      setError(t('auth.login.error.invalid'));
    }
  }, [urlToken, errorParam]);

  const handleLogin = async (tokenToUse?: string) => {
    const useToken = tokenToUse || token;
    if (!useToken.trim()) {
      setError(t('auth.login.error.empty'));
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: useToken.trim() }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 403) {
          setError(t('auth.login.error.disabled'));
        } else if (response.status === 401) {
          setError(t('auth.login.error.invalid'));
        } else {
          setError(data.error || t('auth.login.error.failed'));
        }
        return;
      }
      
      setSuccess(true);
      setTimeout(() => {
        router.push(redirect);
      }, 1000);
    } catch (err) {
      console.error('Login error:', err);
      setError(t('auth.login.error.network'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background transition-colors duration-300">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-orange-500/10 to-transparent rounded-full blur-3xl opacity-50" />
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Box className="text-white w-7 h-7" />
            </div>
            <span className="text-3xl font-bold text-foreground">ImageBox</span>
          </div>
        </div>
        
        {/* Login Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          <div className="text-center mb-8">
            <h1 className="text-xl font-semibold text-card-foreground mb-2">{t('auth.login.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('auth.login.subtitle')}</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setError('');
                  }}
                  placeholder={t('auth.login.placeholder')}
                  disabled={loading || success}
                  className="w-full bg-muted/50 border border-input rounded-xl pl-12 pr-4 py-4 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
                  autoFocus
                />
              </div>
            </div>
            
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
              >
                <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
                <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
              </motion.div>
            )}
            
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
              >
                <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
                <span className="text-sm text-green-600 dark:text-green-400">{t('auth.login.success')}</span>
              </motion.div>
            )}
            
            <button
              type="submit"
              disabled={loading || success || !token.trim()}
              className="w-full py-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('auth.login.verifying')}
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  {t('auth.login.verified')}
                </>
              ) : (
                t('auth.login.submit')
              )}
            </button>
          </form>
          
          <p className="text-center text-muted-foreground text-xs mt-6">
            {t('auth.login.hint')}
          </p>
        </div>
        
        {/* Footer */}
        <p className="text-center text-muted-foreground text-xs mt-6">
          {t('auth.login.footer')}
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
