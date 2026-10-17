import React from 'react';
import { X, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export const TermsModal: React.FC<TermsModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  showAcceptButton = false,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-[#141e12] border border-[#2d4329] shadow-2xl overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#243521] bg-[#10180e]/90">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  TERMS AND CONDITIONS FOR DAPOSI
                </h3>
                <p className="text-xs text-[#9db299]">
                  Official Investor & Peer-Assisted Agricultural Agreement
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#8fa38a] hover:text-white hover:bg-[#1f2e1c] transition-colors"
              aria-label="Close Terms"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 text-xs sm:text-[13px] text-[#c2d3bd] leading-relaxed space-y-4 scrollbar-thin scrollbar-thumb-[#2f492b]">
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start space-x-3">
              <ShieldAlert className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-400" />
              <div className="text-xs">
                <strong>Notice:</strong> Please read these Terms and Conditions carefully before registering or investing in DAPOSI. All peer-assistance and agricultural cycles operate under these verified rules.
              </div>
            </div>

            <div>
              <p>
                Welcome to <strong>DAPOSI Agricultural platform</strong>. These Terms and Conditions (&quot;Terms&quot;) govern your use of our website, mobile platform, and investment services. By creating an account or investing, you agree to these Terms.
              </p>
            </div>

            <div className="border-t border-[#223320] pt-3">
              <h4 className="font-bold text-green-400 uppercase tracking-wide text-xs mb-1">
                1. ABOUT DAPOSI
              </h4>
              <p>
                DAPOSI is a registered agricultural firm in Africa that support farmers financially, and provides farm produce trading. We provide an opportunity for members of the public to co-invest and support each other in our agricultural projects and earn returns based on profit of agricultural products sold.
              </p>
              <p className="mt-1 text-[#9db299]">
                Our platform operates as Daposi a peer-assisted agricultural financing platform.
              </p>
            </div>

            <div className="border-t border-[#223320] pt-3">
              <h4 className="font-bold text-green-400 uppercase tracking-wide text-xs mb-1">
                2. DEFINITIONS
              </h4>
              <p><strong>DAPOSI</strong> is our company name.</p>
              <p><strong>Investor/User</strong> means any person who creates an account and invests.</p>
            </div>

            <div className="border-t border-[#223320] pt-3">
              <h4 className="font-bold text-green-400 uppercase tracking-wide text-xs mb-1">
                3. ELIGIBILITY
              </h4>
              <p>3.1. You must be 18 years or older.</p>
              <p>3.2. You must provide accurate KYC information: Full Name, Valid Phone Number, Email, and Bank Account.</p>
              <p>3.3. One account per person. Multiple accounts will be banned.</p>
              <p>3.4. Daposi reserves the right to reject any registration.</p>
            </div>

            <div className="border-t border-[#223320] pt-3">
              <h4 className="font-bold text-green-400 uppercase tracking-wide text-xs mb-1">
                4. NATURE OF INVESTMENT
              </h4>
              <p>4.1. Your investment is used directly to support another famer for agricultural purposes including but not limited to: farm land lease, seedlings, fertilizers, livestock feeds, labour, storage and logistics.</p>
              <p>4.2. This is NOT a banking deposit. It is an agricultural co-investment, just a means of famers coming together to support each other.</p>
              <p>4.3. Returns are based on agricultural output and market performance.</p>
              <p className="text-amber-300 font-semibold mt-1">
                4.4. Minimum Investment: NGN 20,000. Maximum Investment: NGN 20,000,000 per slot. Investing above 20,000,000 will lead to automatic ban and forfeiture of the money.
              </p>
            </div>

            <div className="border-t border-[#223320] pt-3">
              <h4 className="font-bold text-green-400 uppercase tracking-wide text-xs mb-1">
                5. HOW IT WORKS SUPPORT &amp; REDEEM SUPPORT (RS)
              </h4>
              <p>5.1. <strong>SUPPORT</strong> is a way of lending a fellow farmer money for 28 Days. Your funds are allocated to an active farm cycle. Support duration is 28 days.</p>
              <p>5.2. <strong>DIVIDEND</strong> After 28 days, you are eligible for up to 20% dividend once you click on get help, another famer or farmers will pay you with inters of 20%.</p>
              <p>5.3. <strong>REDEEM SUPPORT (RS): REQUEST WITHDRAWAL</strong> After maturity, you can request your capital + dividend via the request withdrawal button (GH) on your dashboard.</p>
              <p>5.4. Approval is done by the system admin. Payouts are processed within 24 to 48 hours.</p>
              <p>5.5. You must have an active &quot;Request withdrawal&quot; to be eligible for withdrawal.</p>
              <p className="text-amber-300 font-semibold mt-1">
                5.6. Individual/s who refuses to pay within 24hours after their account is matched will be barned from using Daposi&apos;s platform
              </p>
            </div>

            <div className="border-t border-[#223320] pt-3">
              <h4 className="font-bold text-green-400 uppercase tracking-wide text-xs mb-1">
                6. RISK DISCLOSURE
              </h4>
              <p>6.1. Agriculture involves risks: weather, pests, disease, market price fluctuation.</p>
              <p>6.2. While DAPOSI takes all measures to secure investments through insurance and best practices, we do not guarantee 100% capital protection in cases of force majeure (flood, drought, fire, government policy).</p>
              <p>6.3. By investing, you acknowledge and accept these risks.</p>
              <p>6.4. Past performance does not guarantee future returns.</p>
            </div>

            <div className="border-t border-[#223320] pt-3">
              <h4 className="font-bold text-green-400 uppercase tracking-wide text-xs mb-1">
                7. PAYMENTS &amp; WITHDRAWALS
              </h4>
              <p>7.1. All payments are in Nigerian Naira (NGN).</p>
              <p>7.2. Deposits must be made to the account displayed on user&apos;s dashboard only.</p>
              <p>7.3. Withdrawals are only to the bank account registered in your name.</p>
              <p>7.4. DAPOSI will never ask for your password.</p>
            </div>

            <div className="border-t border-[#223320] pt-3">
              <h4 className="font-bold text-green-400 uppercase tracking-wide text-xs mb-1">
                8. USER OBLIGATIONS
              </h4>
              <p>8.1. You must keep your login details confidential.</p>
              <p>8.2. You must not use the platform for money laundering or fraud.</p>
              <p>8.3. You must not create fake payment proofs.</p>
              <p className="text-amber-300 font-semibold">
                8.4. Any attempt to manipulate the system will lead to permanent ban and forfeiture of funds.
              </p>
            </div>

            <div className="border-t border-[#223320] pt-3">
              <h4 className="font-bold text-green-400 uppercase tracking-wide text-xs mb-1">
                9. COMPANY OBLIGATIONS
              </h4>
              <p>9.1. To manage funds transparently and provide regular farm updates.</p>
              <p>9.2. To process withdrawal requests fairly and timely.</p>
              <p>9.3. To maintain data privacy and security.</p>
            </div>

            <div className="border-t border-[#223320] pt-3">
              <h4 className="font-bold text-green-400 uppercase tracking-wide text-xs mb-1">
                10. CANCELLATION &amp; REFUND
              </h4>
              <p>10.1. An account matched for payment can be cancelled and barn within 24 hours if not yet paid.</p>
              <p>10.2. After approved, cancellation is not possible until maturity.</p>
              <p>10.3. In case of proven system error, a refund will be processed within 7 working days.</p>
            </div>

            <div className="border-t border-[#223320] pt-3">
              <h4 className="font-bold text-green-400 uppercase tracking-wide text-xs mb-1">
                11. FEES
              </h4>
              <p>11.1. DAPOSI charges a 0% management fee on dividends earned.</p>
              <p>11.2. No hidden charges.</p>
            </div>

            <div className="border-t border-[#223320] pt-3">
              <h4 className="font-bold text-green-400 uppercase tracking-wide text-xs mb-1">
                12. ACCOUNT SUSPENSION &amp; TERMINATION
              </h4>
              <p>We reserve the right to suspend or terminate accounts that violate these Terms, provide false information, or engage in fraudulent activity.</p>
            </div>

            <div className="border-t border-[#223320] pt-3">
              <h4 className="font-bold text-green-400 uppercase tracking-wide text-xs mb-1">
                13. LIMITATION OF LIABILITY
              </h4>
              <p>DAPOSI shall not be liable for indirect losses, loss of profit, or third-party actions.</p>
            </div>

            <div className="border-t border-[#223320] pt-3">
              <h4 className="font-bold text-green-400 uppercase tracking-wide text-xs mb-1">
                14. PRIVACY POLICY
              </h4>
              <p>Your personal data will be used only for KYC, payment processing, and communication. We do not sell your data.</p>
            </div>

            <div className="border-t border-[#223320] pt-3">
              <h4 className="font-bold text-green-400 uppercase tracking-wide text-xs mb-1">
                15. INTELLECTUAL PROPERTY
              </h4>
              <p>All content on the platform, including logo &quot;DAPOSI&quot;, text, images are property of DAPOSI.</p>
            </div>

            <div className="border-t border-[#223320] pt-3">
              <h4 className="font-bold text-green-400 uppercase tracking-wide text-xs mb-1">
                16. CHANGES TO TERMS
              </h4>
              <p>We may update these Terms at any time. Continued use of the platform means you accept the new Terms.</p>
              <p className="mt-1 font-semibold text-white">By clicking &quot;I Agree&quot; you confirm that you have read, understood, and accepted these Terms and Conditions.</p>
            </div>

            <div className="border-t border-[#2f462c] pt-3.5 bg-[#0f170e]/80 p-4 rounded-xl text-amber-200/90 space-y-2 border border-amber-500/20">
              <p className="font-bold text-amber-300">DISCLAIMER &amp; PLATFORM POLICY:</p>
              <p>
                By accessing and using our platform, you acknowledge and agree that DAPOSI shall not be held liable for any direct, indirect, incidental, or consequential financial losses, damages, or missed opportunities incurred by individuals. Please invest only what you can afford.
              </p>
              <p>
                All participation, investments, or transactions are undertaken at your own risk. <strong>DAPOSI has the Right to Restrict or Terminate Accounts.</strong>
              </p>
              <p>
                We are committed to maintaining a fair, safe, and transparent environment for all users. Daposi reserves the absolute right to suspend, restrict, or permanently terminate any user account, without prior notice, if we detect any attempt to cheat, exploit, hack, or manipulate the system or its features.
              </p>
              <p>
                Fraudulent activities, by usage of unauthorized automated bots, or deceptive practices is a violations of our Terms of Service or community guidelines. Daposi has the right to shutdown the company if we encounter huge losses.
              </p>
              <p className="font-semibold text-white pt-1">
                By continuing or Accepting to use our services, you agree to abide by these terms.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-[#243521] bg-[#10180e] flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] text-[#8fa38a]">
              DAPOSI Agricultural Platform • Updated {new Date().getFullYear()}
            </span>
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-[#2e422a] text-sm text-[#c2d3bd] hover:text-white hover:bg-[#1a2817] transition-colors"
              >
                Close
              </button>
              {showAcceptButton && onAccept && (
                <button
                  type="button"
                  onClick={() => {
                    onAccept();
                    onClose();
                  }}
                  className="w-full sm:w-auto px-5 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-sm font-semibold text-white shadow-lg shadow-green-900/30 flex items-center justify-center space-x-2 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>I Read &amp; Agree</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
