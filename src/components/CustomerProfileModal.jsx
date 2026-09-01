import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail, Phone, Lock, ShieldCheck, CheckCircle2, Loader2, AlertCircle, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CustomerProfileModal({ isOpen, onClose }) {
  const { user, profile, role, updatePassword, updateProfileData, signOut } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || user?.user_metadata?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !user) return null;

  const hasSetPassword = profile?.has_set_password ?? true;

  // Handle Profile Update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileSuccess('');
    setErrorMsg('');

    try {
      await updateProfileData({ full_name: fullName, phone });
      setProfileSuccess('Profile details updated successfully.');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) {
      console.error('Profile update failed:', err);
      setErrorMsg(err.message || 'Failed to update profile details.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Handle Setting Password
  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsSettingPassword(true);
    setPasswordSuccess('');
    setErrorMsg('');

    try {
      await updatePassword(newPassword);
      setPasswordSuccess(
        hasSetPassword
          ? 'Password successfully updated.'
          : 'Personal password successfully established! You can now sign in directly using your email and this password.'
      );
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 5000);
    } catch (err) {
      console.error('Password creation failed:', err);
      setErrorMsg(err.message || 'Failed to update password.');
    } finally {
      setIsSettingPassword(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[#2C1E1B]/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 bg-white max-w-lg w-full border border-[#E8DCD7] shadow-2xl p-6 sm:p-8 rounded-none max-h-[90vh] overflow-y-auto"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-[#705B56] hover:text-[#2C1E1B] transition-colors rounded-none cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header & Role Badge */}
          <div className="text-center pb-6 border-b border-[#E8DCD7] mb-6">
            <div className="w-14 h-14 bg-[#FAF5F2] border border-[#E8DCD7] rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-brand font-bold text-[#2C1E1B]">
              {fullName ? fullName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
            </div>
            <h2 className="font-brand text-2xl font-normal text-[#2C1E1B]">
              {fullName || 'Atelier Client'}
            </h2>
            <p className="text-xs text-[#705B56] mt-0.5">{user.email}</p>

            {/* Role Badge (customer / admin / superadmin) */}
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF5F2] border border-[#E8DCD7] text-[10px] uppercase font-bold tracking-[0.2em] text-[#B86B60]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Role: {role?.toUpperCase()}</span>
            </div>
          </div>

          {/* Alert Messages */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-none flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {profileSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-none flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}
          {passwordSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-none flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {/* Section 1: Customer Details Form */}
          <form onSubmit={handleUpdateProfile} className="space-y-4 mb-8">
            <h3 className="text-xs uppercase font-brand font-bold tracking-[0.2em] text-[#705B56] pb-2 border-b border-[#E8DCD7]">
              Client Information
            </h3>

            <div>
              <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#A38E88] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-1">
                Phone Number (For deliveries)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#A38E88] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+63 917 123 4567"
                  className="w-full pl-10 pr-3.5 py-2 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="py-2.5 px-5 bg-[#FAF5F2] hover:bg-[#2C1E1B] hover:text-white border border-[#2C1E1B] text-[#2C1E1B] text-xs uppercase font-bold tracking-[0.15em] transition-all rounded-none cursor-pointer"
            >
              {isUpdatingProfile ? 'Updating...' : 'Save Profile Changes'}
            </button>
          </form>

          {/* Section 2: Password Creation / Management */}
          <form onSubmit={handleSetPassword} className="space-y-4 pt-4 border-t border-[#E8DCD7]">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8DCD7]">
              <h3 className="text-xs uppercase font-brand font-bold tracking-[0.2em] text-[#705B56]">
                {hasSetPassword ? 'Change Password' : 'Create Your Password'}
              </h3>
              {!hasSetPassword && (
                <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 font-bold uppercase tracking-wider">
                  Action Recommended
                </span>
              )}
            </div>

            {!hasSetPassword && (
              <p className="text-xs text-[#705B56] leading-relaxed bg-[#FAF5F2] border border-[#E8DCD7] p-3">
                You currently sign in via Google. Create your personal password here so you can also log in directly using your email address anytime.
              </p>
            )}

            <div>
              <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-1">
                New Password (Minimum 6 characters) *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#A38E88] absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-1">
                Confirm New Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#A38E88] absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSettingPassword}
              className="w-full py-3.5 px-6 bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-xs uppercase font-bold tracking-[0.2em] transition-all rounded-none shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
            >
              {isSettingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Password...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>{hasSetPassword ? 'Update Password' : 'Create Personal Password'}</span>
                </>
              )}
            </button>
          </form>

          {/* Section 3: Sign Out */}
          <div className="mt-8 pt-4 border-t border-[#E8DCD7] flex justify-between items-center">
            <span className="text-xs text-[#A38E88]">Logged in as {user.email}</span>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                onClose();
              }}
              className="text-xs uppercase font-bold tracking-wider text-rose-700 hover:text-rose-900 cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
