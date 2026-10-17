import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Sprout, TrendingUp, Users, ChevronRight, CheckCircle2 } from 'lucide-react';
import { TermsModal } from './TermsModal';

export default function Landing() {
  const [showTerms, setShowTerms] = useState(false);
  return (
    <div className="min-h-screen bg-[#182416] text-[#f2f6f0] font-sans">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 border-b border-[#2d4028] bg-[#141f13]/85 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 text-white shadow-sm">
              <Sprout className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">DAPOSI</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-[#c2d3bd]">
            <a href="#about" className="hover:text-amber-400 transition-colors">About</a>
            <a href="#how-it-works" className="hover:text-amber-400 transition-colors">How It Works</a>
            <Link to="/auth?mode=login" className="hover:text-amber-400 transition-colors">Login</Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link 
              to="/auth?mode=register"
              className="flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 shadow-sm transition-colors"
            >
              Register
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#162214] pt-16 md:pt-24 pb-32">
        <div className="absolute inset-0 z-0 opacity-15">
          <img 
            src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80" 
            alt="Farm background" 
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="mx-auto max-w-7xl px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-3xl"
          >
            <div className="mb-6 inline-flex items-center rounded-full bg-[#243521] px-3 py-1 text-sm font-semibold text-green-300 ring-1 ring-green-500/30">
              <Sprout className="mr-2 h-4 w-4 text-green-400" />
              Agricultural support Platform • ₦5,000 Per Referral
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl mb-6">
              Grow With DAPOSI
            </h1>
            <p className="text-lg leading-8 text-[#c2d3bd] mb-10">
              Invest in African Agriculture. Empower local farmers, fund verified farms, and earn up to <span className="font-bold text-amber-400">20% in 28 Days</span>. Plus get <span className="font-bold text-green-400">₦5,000 referral bonus</span> on every friend you invite. Safe, secure, and transparent.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                to="/auth?mode=register"
                className="w-full sm:w-auto flex items-center justify-center rounded-xl bg-green-600 px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 transition-all font-bold"
              >
                Register
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
              <Link 
                to="/auth?mode=login"
                className="w-full sm:w-auto flex items-center justify-center rounded-xl bg-[#243521] px-8 py-4 text-base font-semibold text-white shadow-sm ring-1 ring-inset ring-[#3b5235] hover:bg-[#2e422a] transition-all"
              >
                Login
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* About Us & Vision */}
      <section id="about" className="py-24 bg-[#182416]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid md:grid-cols-2 gap-10 items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex flex-col justify-between rounded-2xl bg-[#202f1d] border border-[#2f432a] p-8 shadow-sm"
            >
              <div>
                <div className="inline-flex items-center space-x-2 text-xs font-semibold text-green-400 uppercase tracking-wider mb-3">
                  <Sprout className="h-4 w-4" />
                  <span>Agricultural Empowerment</span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl mb-4">About DAPOSI</h2>
                <p className="text-base text-[#c2d3bd] leading-relaxed mb-6">
                  DAPOSI is a registered agricultural firm in Africa that supports farmers financially and provides farm produce trading. We provide an opportunity for members of the public to co-invest and support each other in our agricultural projects, earning returns based on the profit of agricultural products sold.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 pt-4 border-t border-[#2e422a]/60 text-xs text-[#dde8d9]">
                <div className="flex items-center space-x-2">
                  <span className="h-2 w-2 rounded-full bg-green-400"></span>
                  <span>Peer-Assisted Financing</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                  <span>28-Day Farm Cycles</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="h-2 w-2 rounded-full bg-green-400"></span>
                  <span>Direct Farm Inputs & Labour</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                  <span>Up to 20% Dividend</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="flex flex-col justify-between space-y-6"
            >
              <div className="rounded-2xl bg-[#202f1d] border border-[#2f432a] p-8 shadow-sm flex-1">
                <div className="inline-flex items-center space-x-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">
                  <TrendingUp className="h-4 w-4" />
                  <span>Long-Term Purpose</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Our Vision</h3>
                <p className="text-base text-[#dde8d9] leading-relaxed">
                  To achieve food security in Africa by empowering farmers with capital and giving everyday people a secure, mutually supportive way to participate in sustainable agriculture and grow wealth.
                </p>
              </div>

              <div className="rounded-2xl bg-[#1a2618] border border-[#2c4027] p-8 shadow-sm flex-1">
                <div className="inline-flex items-center space-x-2 text-xs font-semibold text-green-400 uppercase tracking-wider mb-3">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Transparent Operations</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Peer Agricultural Support</h3>
                <p className="text-sm text-[#b9ccb5] leading-relaxed">
                  Your funds are allocated directly into active farming cycles—fertilizers, seedlings, land leases, and logistics. Farmers come together to support each other with zero hidden charges.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-[#141f13]">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl mb-16">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Provide Support', desc: 'Create an account and support with a secure amount to fund agricultural projects.' },
              { step: '2', title: 'We Support in Farms', desc: 'Your support goes directly into vetted crop and livestock across Africa.' },
              { step: '3', title: 'Redeem Support & Dividend', desc: 'After 28 days, redeem your initial support plus up to 20% dividend.' },
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="relative bg-[#1f2e1c] p-8 rounded-2xl shadow-sm border border-[#2e422a]"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#2b3e26] mb-6">
                  <span className="text-xl font-bold text-green-400">{item.step}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-[#a8bda3]">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-24 bg-[#182416]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Why Choose Us</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Sprout, title: 'Verified Farms', desc: 'Every farm on our platform is physically verified and insured.' },
              { icon: TrendingUp, title: '20% Returns in 28 Days', desc: 'Earn up to 20% dividend on your agricultural support in a 28-day growth cycle.' },
              { icon: Users, title: '₦5,000 Referral Bonus', desc: 'Earn ₦5,000 cash bonus credited to your wallet for each referral made.' },
              { icon: ShieldCheck, title: 'Secure & Transparent', desc: 'Track your dividend growth in real-time with an active countdown progress bar.' },
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-[#1f2e1c] p-6 rounded-2xl border border-[#2e422a] hover:border-amber-500/40 transition-colors"
              >
                <feature.icon className="h-8 w-8 text-amber-400 mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-[#a8bda3]">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-[#141f13]">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl mb-10 text-center">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              {
                q: '1. What is the minimum amount I can support?',
                a: 'You can start with as little as ₦20,000 and support up to a maximum of ₦20,000,000 per slot. All support allocations are subject to confirmation and approval by the admin.'
              },
              {
                q: '2. When do I get my payout?',
                a: 'Your capital plus up to 20% dividend is due exactly 28 days after your support is confirmed and approved. Once matured, you can request Redeem Support (withdrawal) to your registered bank account.'
              },
              {
                q: '3. How does the referral bonus work?',
                a: 'You earn an instant ₦5,000 bonus directly in your DAPOSI wallet for every new farmer who registers with your unique referral code. You can withdraw your referral bonus directly to your bank once you have up to 4 referrals.'
              },
              {
                q: '4. How does the dividend progress bar work?',
                a: 'Once your support is approved by admin, your dashboard activates a live 28-day progress bar. It counts day-by-day from Day 1 to Day 28 until your dividend is fully matured and ready for Redeem Support.'
              },
              {
                q: '5. How do you make money in 28 days to pay us?',
                a: 'DAPOSI generates income from ultra-fast-cycle agriculture. We grow vegetables like Raphanus sativus and Lepidium sativum that are sold within 28 days. Your support funds the farm cycle, we harvest and sell to our off-takers, and the profit pays your 20% dividend.'
              },
              {
                q: '6. What other vegetables do you make money from?',
                a: `1. Lepidium sativum - 14 to 21 days
2. Trigonella foenum-graecum - 20 to 28 days
3. Coriandrum sativum - 25 to 30 days
4. Anethum graveolens - 25 to 30 days
5. Ocimum basilicum - 28 to 30 days`
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-[#1f2e1c] p-6 rounded-2xl shadow-sm border border-[#2e422a]">
                <h3 className="text-lg font-bold text-white mb-2">{faq.q}</h3>
                <p className="text-[#c2d3bd] whitespace-pre-line leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#10180e] py-12 border-t border-[#233320]">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center text-[#8ea489] text-sm">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Sprout className="h-5 w-5 text-green-500" />
            <span className="font-bold text-white text-lg">DAPOSI</span>
          </div>
          <div className="flex space-x-6">
            <a href="#about" className="hover:text-white transition-colors">About</a>
            <button
              type="button"
              onClick={() => setShowTerms(true)}
              className="hover:text-white transition-colors text-sm"
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => setShowTerms(true)}
              className="hover:text-white transition-colors text-sm"
            >
              Privacy Policy
            </button>
          </div>
          <p className="mt-4 md:mt-0 text-[#6d8268]">© {new Date().getFullYear()} DAPOSI Agritech. All rights reserved.</p>
        </div>
      </footer>

      {/* Terms and Conditions Modal */}
      <TermsModal
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
      />
    </div>
  );
}
