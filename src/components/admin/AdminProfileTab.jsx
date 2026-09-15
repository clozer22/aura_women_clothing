import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { User, Upload, Save, X } from 'lucide-react';
import LuxuryButton from '../common/LuxuryButton';

const AdminProfileTab = memo(({
  profile,
  editProfileForm,
  setEditProfileForm,
  isEditingProfile,
  setIsEditingProfile,
  isLoadingProfile,
  isUploadingAvatar,
  adminRole,
  userEmail,
  onAvatarUpload,
  onUpdateProfile,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="max-w-3xl space-y-6"
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 700px' }}
    >
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
            Account
          </span>
          <span className="text-xs text-slate-400 font-medium">Administrator Identity</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold font-sans text-slate-900 tracking-tight">
          Admin Profile
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage administrator display credentials, avatar photo, and account privileges.
        </p>
      </div>

      {isEditingProfile ? (
        <form onSubmit={onUpdateProfile} className="bg-white border border-slate-200/80 shadow-xs p-6 sm:p-8 rounded-2xl space-y-5">
          <h3 className="font-sans font-bold text-base text-slate-900 pb-3 border-b border-slate-100">
            Edit Profile Details
          </h3>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-600 block">Display Name</label>
              <input
                type="text"
                required
                value={editProfileForm.name}
                onChange={(e) => setEditProfileForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-600 block">Role / Title</label>
              <input
                type="text"
                required
                value={editProfileForm.role_title}
                onChange={(e) => setEditProfileForm(prev => ({ ...prev, role_title: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-600 block">
                Profile Avatar Photo
              </label>
              <div className="flex items-center gap-4">
                <label className={`cursor-pointer border border-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all ${isUploadingAvatar ? 'bg-slate-100 opacity-75 cursor-not-allowed' : 'bg-slate-50 hover:bg-slate-100'
                  }`}>
                  {isUploadingAvatar ? (
                    <div className="w-4 h-4 border-2 border-slate-400 border-t-blue-600 rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 text-slate-500" />
                  )}
                  <span>{isUploadingAvatar ? 'Uploading Avatar...' : 'Choose Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onAvatarUpload}
                    className="hidden"
                    disabled={isUploadingAvatar}
                  />
                </label>
                <span className="text-xs text-slate-500 truncate max-w-[200px]">
                  {isUploadingAvatar ? 'Uploading to storage...' : (editProfileForm.avatar_url ? 'Avatar active' : 'No photo uploaded')}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-600 block">Biography / Atelier Notes</label>
              <textarea
                rows={4}
                value={editProfileForm.bio}
                onChange={(e) => setEditProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white resize-y"
                placeholder="Atelier owner bio notes..."
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs shadow-blue-600/20 transition-all flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
            <button
              type="button"
              onClick={() => setIsEditingProfile(false)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : isLoadingProfile ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-white border border-slate-200/80 shadow-xs p-8 rounded-2xl animate-pulse">
          <div className="md:col-span-4 aspect-square bg-slate-100 rounded-2xl" />
          <div className="md:col-span-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="h-4 bg-slate-100 rounded w-1/4" />
              <div className="h-8 bg-slate-100 rounded w-3/4" />
              <div className="h-16 bg-slate-100 rounded w-full" />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 bg-white border border-slate-200/80 shadow-xs p-6 sm:p-8 rounded-2xl">
          <div className="md:col-span-4 aspect-square bg-slate-100 border border-slate-200 overflow-hidden rounded-2xl flex items-center justify-center">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Admin Portrait"
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              <User className="w-16 h-16 text-slate-400" />
            )}
          </div>
          <div className="md:col-span-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <span className="text-[10px] tracking-wider uppercase font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200/60 inline-block">
                FOUNDER
              </span>
              <h3 className="text-2xl font-bold font-sans text-slate-900">{profile.name}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {profile.bio}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Role Privileges</span>
                <span className="text-slate-800 font-semibold">{profile.role_title || (adminRole === 'Super Admin' ? 'Super Administrator' : 'Administrator')}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Assigned Email</span>
                <span className="text-slate-800 font-semibold">{profile.email || userEmail}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsEditingProfile(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs shadow-blue-600/20 transition-all cursor-pointer"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
});

AdminProfileTab.displayName = 'AdminProfileTab';

export default AdminProfileTab;
