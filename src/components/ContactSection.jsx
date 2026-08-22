import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, MapPin, Mail, Check } from 'lucide-react';

export default function ContactSection() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [botcheck, setBotcheck] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    // Check honeypot field
    if (botcheck) {
      console.warn("Spam bot detected! Discarding submission.");
      setSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
      setBotcheck(false);
      return;
    }

    const accessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;

    if (!accessKey) {
      console.warn("VITE_WEB3FORMS_ACCESS_KEY is not defined in .env. Simulating success...");
      setIsSending(true);
      setTimeout(() => {
        setIsSending(false);
        setSubmitted(true);
        setFormData({ name: '', email: '', message: '' });
        setTimeout(() => {
          setSubmitted(false);
        }, 3000);
      }, 1000);
      return;
    }

    setIsSending(true);
    setErrorMessage('');

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          access_key: accessKey,
          name: formData.name,
          email: formData.email,
          message: formData.message,
          subject: 'New Message from AURA Customer',
          botcheck: botcheck
        })
      });

      const result = await response.json();
      if (result.success) {
        setSubmitted(true);
        setFormData({ name: '', email: '', message: '' });
        setTimeout(() => {
          setSubmitted(false);
        }, 3000);
      } else {
        throw new Error(result.message || 'Failed to send message.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section id="contact" className="pt-10 sm:pt-1 pb-20 bg-[#fff3f7] relative overflow-hidden rounded-none">

      <div className="max-w-6xl mx-auto px-4 sm:px-8 rounded-none">

        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-14 text-center sm:text-left rounded-none"
        >
        </motion.div>

        {/* Contact Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch rounded-none">

          {/* Left Column: Brand Details & Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-5 p-8 sm:p-10 rounded-none bg-[#ccc2c3] text-[#4A3E3B] flex flex-col justify-between shadow-2xl relative border border-[#4A3E3B]/10"
          >
            {/* Background Texture Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(rgba(74,62,59,0.1)_1px,transparent_1px)] [background-size:16px_16px] opacity-20 rounded-none" />

            <div className="relative z-10 space-y-6">
              <span className="font-script text-[5rem] text-[#ffffff] block -rotate-1 leading-none mb-2">
                Let's Connect
              </span>
              <p className="text-md text-[#ffffff] leading-relaxed font-sans text-justify">
                For collaborations, customer inquiries, supplier partnerships, or business proposals, we invite you to connect with AURA. Our team is always open to meaningful partnerships and opportunities, and we look forward to hearing from you.
              </p>
            </div>

            {/* Address & Email Info */}
            <div className="relative z-10 mt-10 space-y-6 border-t border-[#4A3E3B]/15 pt-8 text-xs sm:text-sm font-medium rounded-none">

              {/* Email */}
              <a
                href="mailto:auraofficialph@gmail.com"
                className="flex items-center gap-4 group p-1 hover:text-[#B86B60] transition-colors rounded-none"
              >
                <div className="w-10 h-10 rounded-none bg-[#4A3E3B]/10 flex items-center justify-center group-hover:bg-[#B86B60]/20 transition-all">
                  <Mail className="w-4 h-4 text-[#ffffff]" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#ffffff] block mb-0.5">EMAIL</span>
                  <span className="font-sans text-[#ffffff] group-hover:text-[#ffffff] transition-colors">auraofficialph@gmail.com</span>
                </div>
              </a>

              {/* Address */}
              <div className="flex items-center gap-4 p-1 rounded-none">
                <div className="w-10 h-10 rounded-none bg-[#4A3E3B]/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-[#ffffff]" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#ffffff] block mb-0.5">AURA HEADQUARTERS</span>
                  <span className="font-sans text-[#ffffff]">General Trias Cavite</span>
                </div>
              </div>

            </div>

          </motion.div>

          {/* Right Column: Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-7 p-8 sm:p-10 rounded-none bg-white border border-[#E8DCD7] shadow-sm flex flex-col justify-center"
          >
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10 rounded-none"
              >
                <div className="w-14 h-14 bg-[#fff3f7] text-emerald-600 rounded-none flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Check className="w-6 h-6" color="black" />
                </div>
                <h3 className="font-editorial text-3xl text-[#2C1E1B] mb-2 font-normal">Message Received</h3>
                <p className="text-xs text-[#705B56] leading-relaxed">
                  Thank you for connecting with AURA. We’ll be in touch shortly via email. Stay fabulous, darling!
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 rounded-none">
                {/* Honeypot Spam Bot Field (Hidden from humans, filled by bots) */}
                <input
                  type="checkbox"
                  name="botcheck"
                  className="hidden"
                  style={{ display: 'none' }}
                  checked={botcheck}
                  onChange={(e) => setBotcheck(e.target.checked)}
                />

                {/* Name */}
                <div className="relative rounded-none">
                  <input
                    type="text"
                    required
                    placeholder=" "
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#FAF5F2] border border-[#E8DCD7] focus:border-[#2C1E1B] rounded-none px-5 py-4 text-xs font-medium text-[#2C1E1B] placeholder-transparent focus:outline-none transition-all peer shadow-inner"
                    id="contact-name"
                  />
                  <label
                    htmlFor="contact-name"
                    className="absolute left-5 top-4 text-xs font-semibold uppercase tracking-wider text-[#A38E88] transition-all pointer-events-none origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-2.5 peer-focus:text-[#2C1E1B] peer-[:not(:placeholder-shown)]:scale-75 peer-[:not(:placeholder-shown)]:-translate-y-2.5"
                  >
                    Your Full Name
                  </label>
                </div>

                {/* Email */}
                <div className="relative rounded-none">
                  <input
                    type="email"
                    required
                    placeholder=" "
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#FAF5F2] border border-[#E8DCD7] focus:border-[#2C1E1B] rounded-none px-5 py-4 text-xs font-medium text-[#2C1E1B] placeholder-transparent focus:outline-none transition-all peer shadow-inner"
                    id="contact-email"
                  />
                  <label
                    htmlFor="contact-email"
                    className="absolute left-5 top-4 text-xs font-semibold uppercase tracking-wider text-[#A38E88] transition-all pointer-events-none origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-2.5 peer-focus:text-[#2C1E1B] peer-[:not(:placeholder-shown)]:scale-75 peer-[:not(:placeholder-shown)]:-translate-y-2.5"
                  >
                    Email Address
                  </label>
                </div>

                {/* Message */}
                <div className="relative rounded-none">
                  <textarea
                    required
                    rows={4}
                    placeholder=" "
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-[#FAF5F2] border border-[#E8DCD7] focus:border-[#2C1E1B] rounded-none px-5 py-4 text-xs font-medium text-[#2C1E1B] placeholder-transparent focus:outline-none transition-all peer shadow-inner resize-none"
                    id="contact-message"
                  />
                  <label
                    htmlFor="contact-message"
                    className="absolute left-5 top-4 text-xs font-semibold uppercase tracking-wider text-[#A38E88] transition-all pointer-events-none origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-2.5 peer-focus:text-[#2C1E1B] peer-[:not(:placeholder-shown)]:scale-75 peer-[:not(:placeholder-shown)]:-translate-y-2.5"
                  >
                    Inquiry / Styling Request details...
                  </label>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-none tracking-wide text-center">
                    {errorMessage}
                  </div>
                )}

                {/* Submit Button */}
                <motion.button
                  whileHover={{ scale: isSending ? 1 : 1.02 }}
                  whileTap={{ scale: isSending ? 1 : 0.98 }}
                  type="submit"
                  disabled={isSending}
                  className={`w-full py-4 rounded-none text-[#ffffff] text-xs font-semibold uppercase tracking-[0.2em] transition-all duration-300 shadow-xl flex items-center justify-center gap-2 ${isSending ? 'bg-[#ccc2c3]/60 cursor-not-allowed' : 'bg-[#ccc2c3] hover:bg-[#ccc2c3]/80'
                    }`}
                >
                  {isSending ? (
                    <>
                      <span>Sending Inquiry...</span>
                      <div className="w-3.5 h-3.5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                    </>
                  ) : (
                    <>
                      <span>SEND MESSAGE</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </motion.button>

              </form>
            )}
          </motion.div>

        </div>

      </div>
    </section>
  );
}
