import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { User, Upload, Save } from 'lucide-react';
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="max-w-3xl space-y-8"
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 700px' }}
    >
      <div>
        <h2 className="text-3xl sm:text-5xl font-editorial font-light text-[#2C1E1B] tracking-tight">Main Admin Profile</h2>
      </div>

      {isEditingProfile ? (
        <form onSubmit={onUpdateProfile} className="bg-white border border-[#E8DCD7] shadow-sm p-8 rounded-none space-y-6">
          <h3 className="font-editorial text-2xl text-[#2C1E1B] pb-2 border-b border-[#E8DCD7]/60">Edit Profile Details</h3>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Display Name</label>
              <input
                type="text"
                required
                value={editProfileForm.name}
                onChange={(e) => setEditProfileForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Role / Title</label>
              <input
                type="text"
                required
                value={editProfileForm.role_title}
                onChange={(e) => setEditProfileForm(prev => ({ ...prev, role_title: e.target.value }))}
                className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56] block">
                Profile Avatar Photo (Manual Upload)
              </label>
              <div className="flex items-center gap-4 bg-[#FAF0EC]/30 p-2 border border-[#E8DCD7] rounded-none">
                {editProfileForm.avatar_url && (
                  <img
                    src={editProfileForm.avatar_url}
                    alt="Avatar Preview"
                    className="w-12 h-12 rounded-full object-cover border border-[#E8DCD7] bg-[#FAF0EC]"
                  />
                )}
                <label className="cursor-pointer bg-[#FAF0EC] hover:bg-[#E8DCD7]/50 border border-[#E8DCD7] text-[#2C1E1B] text-xs font-semibold px-4 py-3 rounded-none flex items-center gap-2 transition-all">
                  <Upload className="w-4 h-4 text-[#705B56]" />
                  <span>{isUploadingAvatar ? 'Uploading...' : 'Choose Photo'}</span>
                  <input
                    type="file"
                    accept=".png, .jpg, .jpeg"
                    onChange={onAvatarUpload}
                    className="hidden"
                    disabled={isUploadingAvatar}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Biography</label>
              <textarea
                rows={4}
                required
                value={editProfileForm.bio}
                onChange={(e) => setEditProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] resize-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#E8DCD7] flex items-center justify-end gap-3">
            <LuxuryButton
              variant="outline"
              type="button"
              onClick={() => {
                setEditProfileForm({ ...profile });
                setIsEditingProfile(false);
              }}
            >
              Cancel
            </LuxuryButton>
            <LuxuryButton
              variant="primary"
              type="submit"
              icon={Save}
            >
              Save Profile Changes
            </LuxuryButton>
          </div>
        </form>
      ) : isLoadingProfile ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 bg-white border border-[#E8DCD7] shadow-sm p-8 rounded-none animate-pulse">
          <div className="md:col-span-4 aspect-square bg-[#2C1E1B]/5 skeleton-shimmer border border-[#E8DCD7] rounded-none" />
          <div className="md:col-span-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="h-6 bg-[#2C1E1B]/5 skeleton-shimmer w-1/4" />
              <div className="h-10 bg-[#2C1E1B]/5 skeleton-shimmer w-3/4" />
              <div className="h-20 bg-[#2C1E1B]/5 skeleton-shimmer w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-[#E8DCD7] pt-6">
              <div className="space-y-2">
                <div className="h-3 bg-[#2C1E1B]/5 skeleton-shimmer w-1/2" />
                <div className="h-4 bg-[#2C1E1B]/5 skeleton-shimmer w-3/4" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-[#2C1E1B]/5 skeleton-shimmer w-1/2" />
                <div className="h-4 bg-[#2C1E1B]/5 skeleton-shimmer w-3/4" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 bg-white border border-[#E8DCD7] shadow-sm p-8 rounded-none">
          <div className="md:col-span-4 aspect-square bg-[#FAF0EC] border border-[#E8DCD7] overflow-hidden rounded-none flex items-center justify-center">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Atelier Owner Portrait"
                className="w-full h-full object-cover rounded-none"
              />
            ) : (
              <User className="w-16 h-16 text-[#ccc2c3]" />
            )}
          </div>
          <div className="md:col-span-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <span className="text-[10px] tracking-widest uppercase font-bold text-[#B86B60] bg-[#FAF0EC] px-3 py-1 rounded-none inline-block">FOUNDER</span>
              <h3 className="text-3xl font-editorial font-light text-[#2C1E1B]">{profile.name}</h3>
              <p className="text-xs text-[#705B56] leading-relaxed">
                {profile.bio}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-[#E8DCD7] pt-6 text-xs font-semibold">
              <div>
                <span className="text-[10px] text-[#A38E88] uppercase block mb-0.5">Role Privileges</span>
                <span className="text-[#2C1E1B]">{profile.role_title || (adminRole === 'Super Admin' ? 'Super Administrator' : 'Administrator')}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#A38E88] uppercase block mb-0.5">Assigned Email</span>
                <span className="text-[#2C1E1B]">{profile.email || userEmail}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E8DCD7]">
              <LuxuryButton
                variant="primary"
                onClick={() => setIsEditingProfile(true)}
              >
                Edit Owner Profile
              </LuxuryButton>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
});

AdminProfileTab.displayName = 'AdminProfileTab';

export default AdminProfileTab;
