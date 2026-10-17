import React, { useState, useEffect } from 'react';
import { 
  Mail, Lock, Phone, User, Users, ArrowRight, Sprout, 
  Eye, EyeOff, Building2, CreditCard, ShieldCheck, FileText, CheckCircle2, ExternalLink 
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { TermsModal } from './TermsModal';
import { signUpWithSupabase, signInWithSupabase, resetPasswordSupabase } from '../lib/supabaseService';
import { isSupabaseConfigured } from '../supabaseClient';

const POPULAR_BANKS = [
  'Access Bank',
  'GTBank (Guaranty Trust Bank)',
  'Zenith Bank',
  'First Bank of Nigeria',
  'United Bank for Africa (UBA)',
  'Kuda Bank',
  'Moniepoint MFB',
  'OPay',
  'PalmPay',
  'Stanbic IBTC Bank',
  'Fidelity Bank',
  'FCMB (First City Monument Bank)',
  'Sterling Bank',
  'Union Bank',
  'Wema Bank / ALAT',
  'Ecobank Nigeria',
  'Standard Chartered',
  'Keystone Bank',
  'Polaris Bank',
  'Jaiz Bank',
  'Other African / Commercial Bank'
];

export default function Auth({ setToken }: { setToken: (t: string) => void }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get('mode');
  const refParam = searchParams.get('ref') || searchParams.get('referredBy') || '';

  const [isLogin, setIsLogin] = useState(modeParam !== 'register' && modeParam !== 'signup');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    password: '', 
    referredBy: refParam,
    bankName: '',
    accountNumber: '',
    accountName: ''
  });

  useEffect(() => {
    if (modeParam === 'register' || modeParam === 'signup') {
      setIsLogin(false);
    } else if (modeParam === 'login') {
      setIsLogin(true);
    }
    if (refParam && !formData.referredBy) {
      setFormData(prev => ({ ...prev, referredBy: refParam }));
    }
    if (localStorage.getItem('daposi_remember_me') === 'true') {
      const savedEmail = localStorage.getItem('daposi_remember_email');
      if (savedEmail) {
        setFormData(prev => ({ ...prev, email: savedEmail }));
      }
    }
  }, [modeParam, refParam]);
  const [customBankName, setCustomBankName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('daposi_remember_me') === 'true';
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isForgotPassword) {
      setLoading(true);
      try {
        await resetPasswordSupabase(formData.email);
        setSuccess('If an account exists with this email, a Supabase password reset link has been sent to your inbox.');
      } catch (err: any) {
        setError(err.message || 'Something went wrong sending reset email');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Validation for registration
    if (!isLogin) {
      if (!agreedToTerms) {
        setError('You must read and tick the box to agree to DAPOSI Terms and Conditions.');
        return;
      }

      const effectiveBankName = formData.bankName === 'Other African / Commercial Bank' 
        ? customBankName.trim() 
        : formData.bankName.trim();

      if (!effectiveBankName) {
        setError('Please select or specify your bank name for payouts and peer matching.');
        return;
      }

      if (!formData.accountNumber.trim() || formData.accountNumber.trim().length < 9) {
        setError('Please provide a valid bank account number (10 digits).');
        return;
      }

      if (!formData.accountName.trim()) {
        setError('Please provide the account holder name corresponding to your bank account.');
        return;
      }
    }

    setLoading(true);
    const effectiveBankName = formData.bankName === 'Other African / Commercial Bank' 
      ? customBankName.trim() 
      : formData.bankName.trim();

    try {
      let authResult;
      if (isLogin) {
        authResult = await signInWithSupabase(formData.email, formData.password);
        if (rememberMe) {
          localStorage.setItem('daposi_remember_me', 'true');
          localStorage.setItem('daposi_remember_email', formData.email.trim());
        } else {
          localStorage.removeItem('daposi_remember_me');
          localStorage.removeItem('daposi_remember_email');
        }
      } else {
        authResult = await signUpWithSupabase({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          referredBy: formData.referredBy,
          bankName: effectiveBankName,
          accountNumber: formData.accountNumber,
          accountName: formData.accountName.trim() || formData.name.trim()
        });
      }

      localStorage.setItem('token', authResult.token);
      setToken(authResult.token);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#182416] p-4 sm:p-6 font-sans relative overflow-hidden py-12">
      <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
        <img 
          src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80" 
          alt="African Agriculture Background" 
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
          className="w-full h-full object-cover"
        />
      </div>
      
      <Link to="/" className="absolute top-6 left-6 z-20 flex items-center space-x-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 text-white shadow-sm">
          <Sprout className="h-5 w-5" />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">DAPOSI</span>
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full ${!isLogin && !isForgotPassword ? 'max-w-2xl' : 'max-w-md'} rounded-2xl bg-[#202e1c] border border-[#2e422a] p-6 sm:p-8 shadow-2xl relative z-10 transition-all`}
      >
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-green-600/20 text-green-400 mb-3 border border-green-500/20">
            <Sprout className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1.5">
            {isForgotPassword 
              ? 'Reset Password' 
              : isLogin 
                ? 'Welcome Back' 
                : 'Create Farmers Account'}
          </h1>
          <p className="text-sm text-[#a8bda3]">
            {isForgotPassword 
              ? "Enter your email to receive a password reset link" 
              : isLogin 
                ? "Sign in to access your agricultural portfolio & dividend desk" 
                : "Peer-assisted African agricultural investment platform"}
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl bg-red-500/10 border border-red-500/30 p-3.5 text-sm text-red-300 text-center flex items-center justify-center space-x-2">
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="mb-5 rounded-xl bg-green-500/10 border border-green-500/30 p-3.5 text-sm text-green-300 text-center flex items-center justify-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && !isForgotPassword && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#c2d3bd]">
                Full Name (KYC Legal Name) *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#7d9378]" />
                <input
                  type="text"
                  required
                  className="w-full rounded-xl bg-[#141d12] border border-[#2e422a] py-3 pl-10 pr-4 text-sm text-white placeholder-[#6d8268] focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  placeholder="e.g. Chukwuma Adebayo"
                  value={formData.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setFormData(prev => ({ 
                      ...prev, 
                      name: newName,
                      // Pre-fill account name if user hasn't typed a different one yet
                      accountName: prev.accountName === prev.name || !prev.accountName ? newName : prev.accountName 
                    }));
                  }}
                />
              </div>
            </div>
          )}

          <div className={!isLogin && !isForgotPassword ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-4'}>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#c2d3bd]">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#7d9378]" />
                <input
                  type="email"
                  required
                  className="w-full rounded-xl bg-[#141d12] border border-[#2e422a] py-3 pl-10 pr-4 text-sm text-white placeholder-[#6d8268] focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            {!isLogin && !isForgotPassword && (
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#c2d3bd]">
                  Phone Number (Active WhatsApp / Calls) *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#7d9378]" />
                  <input
                    type="tel"
                    required
                    className="w-full rounded-xl bg-[#141d12] border border-[#2e422a] py-3 pl-10 pr-4 text-sm text-white placeholder-[#6d8268] focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    placeholder="e.g. +234 801 234 5678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {!isForgotPassword && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#c2d3bd] mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#7d9378]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full rounded-xl bg-[#141d12] border border-[#2e422a] py-3 pl-10 pr-11 text-sm text-white placeholder-[#6d8268] focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9db299] hover:text-white focus:outline-none transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Remember Me Checkbox & Forgot Password Link */}
              {isLogin && (
                <div className="flex items-center justify-between pt-2.5 px-0.5">
                  <label className="flex items-center space-x-2.5 cursor-pointer group select-none">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-[#385333] bg-[#0f170e] text-green-600 focus:ring-green-500 focus:ring-offset-[#182416] cursor-pointer"
                    />
                    <span className="text-xs font-medium text-[#c2d3bd] group-hover:text-white transition-colors">
                      Remember me
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(true); setError(''); setSuccess(''); }}
                    className="text-xs text-amber-400 hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>
          )}

          {/* USER ACCOUNT & BANKING DETAILS (REQUIRED FOR REGISTRATION) */}
          {!isLogin && !isForgotPassword && (
            <div className="rounded-xl border border-amber-500/25 bg-[#172516] p-4 space-y-3.5 my-2">
              <div className="flex items-center space-x-2 text-amber-400">
                <Building2 className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  User's Bank Account Details (For Payouts & Matching)
                </span>
              </div>
              <p className="text-[11px] text-[#9db299] leading-relaxed">
                As required by Section 3.2 of the KYC Guidelines, provide your registered bank account where peer withdrawal payouts will be transferred directly.
              </p>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#c2d3bd]">Bank Name *</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#7d9378]" />
                  <select
                    required
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full rounded-xl bg-[#121c11] border border-[#2e422a] py-2.5 pl-10 pr-4 text-sm text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  >
                    <option value="">Select your bank...</option>
                    {POPULAR_BANKS.map((b) => (
                      <option key={b} value={b} className="bg-[#182416] text-white">
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.bankName === 'Other African / Commercial Bank' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#c2d3bd]">Specify Bank Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full rounded-xl bg-[#121c11] border border-[#2e422a] py-2.5 px-3 text-sm text-white placeholder-[#6d8268] focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    placeholder="Enter your commercial bank name"
                    value={customBankName}
                    onChange={(e) => setCustomBankName(e.target.value)}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#c2d3bd]">Account Number *</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7d9378]" />
                    <input
                      type="text"
                      maxLength={12}
                      required
                      className="w-full rounded-xl bg-[#121c11] border border-[#2e422a] py-2.5 pl-9 pr-3 text-sm font-mono text-white placeholder-[#6d8268] focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                      placeholder="0123456789"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[#c2d3bd]">Account Name (As on Bank) *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7d9378]" />
                    <input
                      type="text"
                      required
                      className="w-full rounded-xl bg-[#121c11] border border-[#2e422a] py-2.5 pl-9 pr-3 text-sm text-white placeholder-[#6d8268] focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                      placeholder="John Chukwuma Doe"
                      value={formData.accountName}
                      onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isLogin && !isForgotPassword && (
            <div>
              <label className="mb-1 block text-xs font-medium text-[#c2d3bd]">Referral Code (Optional)</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#7d9378]" />
                <input
                  type="text"
                  className="w-full rounded-xl bg-[#141d12] border border-[#2e422a] py-2.5 pl-10 pr-4 text-sm text-white placeholder-[#6d8268] focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  placeholder="e.g. JOHN1234"
                  value={formData.referredBy}
                  onChange={(e) => setFormData({ ...formData, referredBy: e.target.value })}
                />
              </div>
              <p className="mt-1 text-[11px] text-[#7d9378]">
                Your referrer earns a ₦5,000 bonus once your account is created.
              </p>
            </div>
          )}

          {/* TERMS AND CONDITIONS LINK & TICK BOX (REQUIRED FOR REGISTRATION) */}
          {!isLogin && !isForgotPassword && (
            <div className="pt-2 space-y-3 border-t border-[#293d26]">
              {/* Terms Link Button */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-xl bg-[#121c10] border border-[#263a23]">
                <div className="flex items-center space-x-2.5">
                  <FileText className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-white">
                    DAPOSI Terms &amp; Conditions
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 hover:text-green-300 text-xs font-medium transition-all group"
                >
                  <span>Read Full Terms &amp; Disclosures</span>
                  <ExternalLink className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* Checkbox to continue */}
              <label className="flex items-start space-x-3 cursor-pointer group p-3.5 rounded-xl bg-[#141e12] border border-[#2b4127] hover:border-green-500/50 transition-colors">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  required
                  className="mt-0.5 h-4 w-4 rounded border-[#385333] bg-[#0f170e] text-green-600 focus:ring-green-500 focus:ring-offset-[#182416] cursor-pointer flex-shrink-0"
                />
                <span className="text-xs text-[#c2d3bd] leading-normal select-none group-hover:text-white transition-colors">
                  I confirm that I am at least 18 years old, and I have read, understood, and tick this box to agree to the{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowTermsModal(true);
                    }}
                    className="text-amber-400 font-semibold underline hover:text-amber-300 inline"
                  >
                    Terms and Conditions &amp; Risk Disclosures of DAPOSI
                  </button>
                  .
                </span>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (!isLogin && !isForgotPassword && !agreedToTerms)}
            className="mt-6 flex w-full items-center justify-center rounded-xl bg-green-600 py-3.5 font-semibold text-white transition-colors hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 focus:ring-offset-[#182416] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading 
              ? 'Processing...' 
              : isForgotPassword 
                ? 'Send Reset Link' 
                : isLogin 
                  ? 'Sign In to Account' 
                  : 'Register Account & Accept Terms'}
            {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#9db299]">
          {isForgotPassword ? (
            <button
              onClick={() => { setIsForgotPassword(false); setError(''); setSuccess(''); }}
              className="text-amber-400 hover:underline font-medium"
            >
              Back to login
            </button>
          ) : isLogin ? (
            <>
              Don't have an account?{' '}
              <button
                onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}
                className="text-amber-400 hover:underline font-semibold"
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
                className="text-amber-400 hover:underline font-semibold"
              >
                Log in
              </button>
            </>
          )}
        </p>
      </motion.div>

      {/* DAPOSI Terms and Conditions Modal */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        showAcceptButton={!isLogin}
        onAccept={() => setAgreedToTerms(true)}
      />
    </div>
  );
}
