import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShieldCheck,
  FileText,
  RotateCcw,
  Truck,
  Building,
  Lock,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  HelpCircle
} from 'lucide-react';

export default function LegalModal({ isOpen, initialTab = 'privacy', onClose }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'privacy');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const tabs = [
    { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheck, tag: 'RA 10173 / GDPR' },
    { id: 'terms', label: 'Terms of Service', icon: FileText, tag: 'RA 8792 E-Commerce' },
    { id: 'returns', label: 'Returns & Refunds', icon: RotateCcw, tag: 'RA 7394 Consumer Act' },
    { id: 'shipping', label: 'Shipping & Delivery', icon: Truck, tag: 'Nationwide Logistics' },
    { id: 'legitimacy', label: 'Business & Legitimacy', icon: Building, tag: 'DTI & BIR Registered' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 select-none font-sans">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-4xl bg-white border border-[#E8DCD7] shadow-2xl rounded-none flex flex-col max-h-[92vh] overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-[#E8DCD7] flex items-center justify-between bg-[#FAF5F2]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white border border-[#E8DCD7] flex items-center justify-center text-[#2C1E1B]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-editorial text-lg sm:text-xl font-normal text-[#2C1E1B]">
                  Legal & Compliance Center
                </h2>
                <p className="text-[10px] sm:text-xs text-[#705B56]">
                  Aura Women's Clothing • Republic of the Philippines
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-[#705B56] hover:text-[#2C1E1B] transition-colors cursor-pointer border border-transparent hover:border-[#E8DCD7]"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body: Tabs Sidebar + Content */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar Navigation */}
            <div className="w-full md:w-64 bg-[#FAF5F2]/60 border-b md:border-b-0 md:border-r border-[#E8DCD7] p-2 sm:p-4 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto flex-shrink-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`p-2.5 sm:p-3 text-left transition-all rounded-none flex items-center justify-between whitespace-nowrap md:whitespace-normal cursor-pointer ${
                      isActive
                        ? 'bg-[#2C1E1B] text-white shadow-xs'
                        : 'text-[#705B56] hover:bg-white hover:text-[#2C1E1B]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold">{tab.label}</p>
                        <span className={`text-[9px] uppercase tracking-wider block ${isActive ? 'text-white/70' : 'text-[#A38E88]'}`}>
                          {tab.tag}
                        </span>
                      </div>
                    </div>
                    {isActive && <ChevronRight className="w-4 h-4 hidden md:block opacity-70" />}
                  </button>
                );
              })}
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 sm:p-8 overflow-y-auto max-h-[65vh] md:max-h-full space-y-6 text-[#2C1E1B] leading-relaxed text-xs">
              
              {/* TAB 1: PRIVACY POLICY */}
              {activeTab === 'privacy' && (
                <div className="space-y-5">
                  <div className="border-b border-[#E8DCD7] pb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#B86B60] block mb-1">
                      Republic Act No. 10173 • Data Privacy Act of 2012
                    </span>
                    <h3 className="font-editorial text-2xl text-[#2C1E1B]">Privacy Policy</h3>
                    <p className="text-[11px] text-[#705B56] mt-1">Effective Date: January 1, 2026 • Last Reviewed: 2026</p>
                  </div>

                  <section className="space-y-2">
                    <h4 className="font-bold text-sm text-[#2C1E1B]">1. Commitment to Customer Privacy</h4>
                    <p className="text-[#705B56]">
                      Aura Women's Clothing ("Aura Atelier", "we", "us", or "our") operates in strict compliance with the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong> of the Republic of the Philippines and international data privacy principles. We are committed to protecting your personal information and handling your orders with transparency and high-grade security.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="font-bold text-sm text-[#2C1E1B]">2. Personal Information Collected</h4>
                    <p className="text-[#705B56]">When you browse, register, or place an order, we collect only necessary data:</p>
                    <ul className="list-disc pl-5 space-y-1 text-[#705B56]">
                      <li><strong>Identity Data:</strong> Full customer name, account email address.</li>
                      <li><strong>Delivery & Logistics Data:</strong> Shipping street address, barangay, city, province/region, postal zip code, and active mobile phone number for rider delivery coordination.</li>
                      <li><strong>Order Transaction Data:</strong> Garment purchases, size choices, payment reference numbers, order history, and delivery receipts.</li>
                      <li><strong>Technical & Session Data:</strong> IP address, device browser type, and anonymous session IDs to maintain your cart and prevent fraudulent orders.</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h4 className="font-bold text-sm text-[#2C1E1B]">3. Payment Data Security (Xendit Verified)</h4>
                    <p className="text-[#705B56]">
                      <strong>We DO NOT store or hold your credit card numbers, GCash MPINs, Maya passwords, or bank credentials on our servers.</strong> All payment processing is securely orchestrated by <strong>Xendit Philippines Inc.</strong>, a Bangko Sentral ng Pilipinas (BSP) regulated Operator of Payment Systems and certified <strong>PCI-DSS Level 1</strong> compliant payment gateway with 256-bit SSL encryption.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="font-bold text-sm text-[#2C1E1B]">4. Disclosure to Third-Party Logistics Partners</h4>
                    <p className="text-[#705B56]">
                      Your shipping details are shared strictly on a need-to-know basis with our accredited courier fulfillment partners (e.g., <strong>J&T Express, LBC Express, Ninja Van, Flash Express</strong>) solely for parcel transit, dispatch notification SMS, and doorstep delivery. We never sell, rent, or trade your personal data to marketing third parties.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="font-bold text-sm text-[#2C1E1B]">5. Your Rights as a Data Subject</h4>
                    <p className="text-[#705B56]">
                      Under Section 16 of the Data Privacy Act of 2012, you hold explicit rights to: (a) be informed of data processing, (b) access your data, (c) rectify inaccurate information, (d) request deletion or erasure of your account, and (e) object to non-essential processing.
                    </p>
                    <p className="text-[#705B56]">
                      For privacy inquiries or data erasure requests, email our designated Data Protection Officer at: <strong className="text-[#2C1E1B]">care@aurawomen.com</strong>
                    </p>
                  </section>
                </div>
              )}

              {/* TAB 2: TERMS OF SERVICE */}
              {activeTab === 'terms' && (
                <div className="space-y-5">
                  <div className="border-b border-[#E8DCD7] pb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#B86B60] block mb-1">
                      Republic Act No. 8792 • Electronic Commerce Act
                    </span>
                    <h3 className="font-editorial text-2xl text-[#2C1E1B]">Terms of Service & Conditions of Sale</h3>
                    <p className="text-[11px] text-[#705B56] mt-1">Legally binding sales agreement under Philippine Jurisdiction</p>
                  </div>

                  <section className="space-y-2">
                    <h4 className="font-bold text-sm text-[#2C1E1B]">1. Acceptance of Terms</h4>
                    <p className="text-[#705B56]">
                      By browsing, accessing, or placing an order on Aura Women's Clothing ("the Site"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Site.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="font-bold text-sm text-[#2C1E1B]">2. Intellectual Property & Brand Copyright</h4>
                    <p className="text-[#705B56]">
                      All content on this website—including garment silhouette designs, size charts, lookbook imagery, branding trademarks, logos, typography, styling, and editorial narratives—is the exclusive intellectual property of Aura Women's Clothing. Unauthorized reproduction, web scraping, commercial re-selling, or copying constitutes intellectual property theft punishable under Philippine copyright and trademark laws.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="font-bold text-sm text-[#2C1E1B]">3. Order Validation & Pricing Accuracy</h4>
                    <p className="text-[#705B56]">
                      All garment orders are subject to acceptance and stock availability. While we make every effort to display accurate colorways, descriptions, and Philippine Peso (₱) pricing, typographical errors may occasionally occur. In the event of a manifest pricing error or fraudulent checkout attempt, Aura reserves the right to cancel the transaction and issue an immediate 100% refund.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="font-bold text-sm text-[#2C1E1B]">4. Cash on Delivery (COD) Obligations</h4>
                    <p className="text-[#705B56]">
                      For customers electing Cash on Delivery (COD), placing an order constitutes a firm legal commitment to accept and pay the courier rider upon parcel arrival. Intentional refusal of valid deliveries damages logistical operations and may result in permanent blacklisting from future COD transactions.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="font-bold text-sm text-[#2C1E1B]">5. Governing Law & Dispute Resolution</h4>
                    <p className="text-[#705B56]">
                      These Terms of Service are governed by and construed in accordance with the laws of the Republic of the Philippines. Any legal action or proceeding arising out of or related to this platform shall be brought exclusively in the proper courts of Metro Manila, Philippines.
                    </p>
                  </section>
                </div>
              )}

              {/* TAB 3: RETURN & REFUND POLICY */}
              {activeTab === 'returns' && (
                <div className="space-y-5">
                  <div className="border-b border-[#E8DCD7] pb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#B86B60] block mb-1">
                      Republic Act No. 7394 • Consumer Act of the Philippines & DTI Guidelines
                    </span>
                    <h3 className="font-editorial text-2xl text-[#2C1E1B]">Return, Refund & Exchange Policy</h3>
                    <p className="text-[11px] text-[#705B56] mt-1">Comprehensive 7-day buyer protection policy</p>
                  </div>

                  <section className="space-y-2">
                    <h4 className="font-bold text-sm text-[#2C1E1B]">1. The 7-Calendar-Day Return Window</h4>
                    <p className="text-[#705B56]">
                      In full compliance with DTI regulations and the Consumer Act of the Philippines (RA 7394), you have <strong>seven (7) calendar days</strong> from the official date your courier delivers your order to request an exchange, return, or replacement.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="font-bold text-sm text-[#2C1E1B]">2. Eligibility Standards for Garment Return</h4>
                    <p className="text-[#705B56]">To qualify for an exchange or refund:</p>
                    <ul className="list-disc pl-5 space-y-1 text-[#705B56]">
                      <li>The garment must be in its original atelier condition: unwashed, unworn, and free of stains, cosmetics, perfume, or alterations.</li>
                      <li>Original brand tags, size markers, and luxury polybags must be attached intact.</li>
                      <li>Proof of purchase (Order Reference number and delivery receipt) must be provided.</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h4 className="font-bold text-sm text-[#2C1E1B]">3. Defective or Incorrect Item Replacement (100% Covered)</h4>
                    <p className="text-[#705B56]">
                      If you receive a defective garment, damaged stitching, or an incorrect size/item dispatched by our warehouse, Aura will shoulder <strong>100% of the reverse pickup and replacement shipping costs</strong>. We will arrange courier pickup from your doorstep and dispatch the replacement immediately.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="font-bold text-sm text-[#2C1E1B]">4. Size Exchange (Fit Guarantee)</h4>
                    <p className="text-[#705B56]">
                      If the garment does not fit as desired, we gladly accommodate size exchanges subject to inventory availability. Customers only shoulder standard courier logistics fees for change-of-mind size swaps.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="font-bold text-sm text-[#2C1E1B]">5. Refund Processing Timelines</h4>
                    <p className="text-[#705B56]">
                      Once your return parcel arrives at our atelier and passes physical inspection, refunds are processed within <strong>3 to 5 business days</strong> directly back to your original payment channel (GCash, Maya, Bank Transfer, or store credit voucher).
                    </p>
                  </section>
                </div>
              )}

              {/* TAB 4: SHIPPING & DELIVERY */}
              {activeTab === 'shipping' && (
                <div className="space-y-5">
                  <div className="border-b border-[#E8DCD7] pb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#B86B60] block mb-1">
                      Nationwide Delivery Standards
                    </span>
                    <h3 className="font-editorial text-2xl text-[#2C1E1B]">Shipping & Logistics Terms</h3>
                    <p className="text-[11px] text-[#705B56] mt-1">Doorstep parcel delivery across Luzon, Visayas, and Mindanao</p>
                  </div>

                  <section className="space-y-2">
                    <h4 className="font-bold text-sm text-[#2C1E1B]">1. Processing & Atelier Dispatch</h4>
                    <p className="text-[#705B56]">
                      Orders placed before 2:00 PM PHT (Monday through Friday) are prepared, steam-pressed, and handed over to our courier partner within <strong>24 to 48 hours</strong>. Orders placed on Sundays or official Philippine public holidays are processed the next business day.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="font-bold text-sm text-[#2C1E1B]">2. Estimated Transit Timelines</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 bg-[#FAF5F2] border border-[#E8DCD7]">
                        <p className="font-bold text-xs text-[#2C1E1B]">Metro Manila</p>
                        <p className="text-[11px] text-[#705B56]">1 to 3 business days</p>
                      </div>
                      <div className="p-3 bg-[#FAF5F2] border border-[#E8DCD7]">
                        <p className="font-bold text-xs text-[#2C1E1B]">Greater Manila (Cavite/Laguna/Rizal/Bulacan)</p>
                        <p className="text-[11px] text-[#705B56]">2 to 4 business days</p>
                      </div>
                      <div className="p-3 bg-[#FAF5F2] border border-[#E8DCD7]">
                        <p className="font-bold text-xs text-[#2C1E1B]">Provincial Luzon</p>
                        <p className="text-[11px] text-[#705B56]">3 to 5 business days</p>
                      </div>
                      <div className="p-3 bg-[#FAF5F2] border border-[#E8DCD7]">
                        <p className="font-bold text-xs text-[#2C1E1B]">Visayas & Mindanao</p>
                        <p className="text-[11px] text-[#705B56]">4 to 7 business days</p>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h4 className="font-bold text-sm text-[#2C1E1B]">3. Real-Time Parcel Tracking</h4>
                    <p className="text-[#705B56]">
                      As soon as your parcel is scanned into the courier logistics hub, you will receive an active tracking code. You can monitor delivery progress directly from your <strong>Order History</strong> or through the courier portal (J&T Express / LBC).
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="font-bold text-sm text-[#2C1E1B]">4. Lost or Damaged Parcel Protocol</h4>
                    <p className="text-[#705B56]">
                      All outbound packages are covered by logistics transit insurance. If a parcel is deemed lost by the courier, Aura will immediately send a replacement at no additional charge or issue a 100% full refund.
                    </p>
                  </section>
                </div>
              )}

              {/* TAB 5: BUSINESS LEGITIMACY & ACCREDITATION */}
              {activeTab === 'legitimacy' && (
                <div className="space-y-5">
                  <div className="border-b border-[#E8DCD7] pb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#B86B60] block mb-1">
                      Business Entity Disclosures & Authenticity
                    </span>
                    <h3 className="font-editorial text-2xl text-[#2C1E1B]">Business Legitimacy & Accreditation</h3>
                    <p className="text-[11px] text-[#705B56] mt-1">Official trade identification & consumer rights</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#FAF5F2] border border-[#E8DCD7] space-y-1.5">
                      <div className="flex items-center gap-2 text-emerald-800">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-bold text-xs uppercase tracking-wider">DTI Registered Enterprise</span>
                      </div>
                      <p className="text-[11px] text-[#705B56]">
                        Registered business trade name under the Department of Trade and Industry (DTI), Republic of the Philippines.
                      </p>
                    </div>

                    <div className="p-4 bg-[#FAF5F2] border border-[#E8DCD7] space-y-1.5">
                      <div className="flex items-center gap-2 text-emerald-800">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-bold text-xs uppercase tracking-wider">BIR Tax Compliant</span>
                      </div>
                      <p className="text-[11px] text-[#705B56]">
                        Compliant with Bureau of Internal Revenue (BIR) e-commerce taxation guidelines and registered taxpayer rules.
                      </p>
                    </div>

                    <div className="p-4 bg-[#FAF5F2] border border-[#E8DCD7] space-y-1.5">
                      <div className="flex items-center gap-2 text-emerald-800">
                        <Lock className="w-4 h-4" />
                        <span className="font-bold text-xs uppercase tracking-wider">256-Bit SSL Encrypted</span>
                      </div>
                      <p className="text-[11px] text-[#705B56]">
                        Full HTTPS transport-layer security encryption safeguarding all checkout transmissions against eavesdropping.
                      </p>
                    </div>

                    <div className="p-4 bg-[#FAF5F2] border border-[#E8DCD7] space-y-1.5">
                      <div className="flex items-center gap-2 text-emerald-800">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="font-bold text-xs uppercase tracking-wider">Xendit Certified Merchant</span>
                      </div>
                      <p className="text-[11px] text-[#705B56]">
                        Directly integrated with certified PCI-DSS Level 1 compliant gateway Xendit for GCash, Maya, and card payments.
                      </p>
                    </div>
                  </div>

                  <section className="space-y-2 pt-2">
                    <h4 className="font-bold text-sm text-[#2C1E1B]">Customer Support & Inquiries</h4>
                    <p className="text-[#705B56]">
                      For customer assistance, order inquiries, size sizing support, or formal communications:
                    </p>
                    <div className="p-4 bg-[#FAF0EC]/60 border border-[#E8DCD7] space-y-1 text-xs">
                      <p><strong>Official Email:</strong> care@aurawomen.com</p>
                      <p><strong>Support Hours:</strong> Monday – Saturday, 9:00 AM – 6:00 PM PHT</p>
                      <p><strong>Atelier Location:</strong> Metro Manila, Philippines</p>
                      <p><strong>Official Channels:</strong> Instagram (@auraofficial.ph) • TikTok (@auraofficial.ph)</p>
                    </div>
                  </section>
                </div>
              )}

            </div>
          </div>

          {/* Footer Bar */}
          <div className="p-4 border-t border-[#E8DCD7] bg-[#FAF5F2] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[11px] text-[#705B56]">
              <Lock className="w-3.5 h-3.5 text-emerald-700" />
              <span>PCI-DSS Level 1 Secured • SSL 256-Bit Encrypted • DTI & BIR Compliant</span>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Close Hub
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
