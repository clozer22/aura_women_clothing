import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Info,
  Sliders,
  Mail,
  Menu,
  X,
  Search,
  ShoppingBag,
  Heart,
  Package,
  User,
  LogOut,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import cartBasketIcon from '../images/icons/cart-basket.webp';
import { getWishlist, subscribeWishlist } from '../lib/wishlistManager';
import { useAuth } from '../context/AuthContext';

export default function Navbar({
  onNavigateHome,
  onNavigateFullCatalog,
  onNavigateAdmin,
  onNavigateOrders,
  onOpenWishlist,
  onOpenAuth,
  onOpenProfile,
  currentView,
  onSearch,
}) {
  const { user, profile, role, signOut } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [wishlistCount, setWishlistCount] = useState(getWishlist().length);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const searchContainerRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const mobileSearchBtnRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const unsub = subscribeWishlist((items) => {
      setWishlistCount(items.length);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSearchInput) {
        const clickedInsideDesktop = searchContainerRef.current && searchContainerRef.current.contains(event.target);
        const clickedInsideMobileDropdown = mobileSearchRef.current && mobileSearchRef.current.contains(event.target);
        const clickedInsideMobileBtn = mobileSearchBtnRef.current && mobileSearchBtnRef.current.contains(event.target);

        if (!clickedInsideDesktop && !clickedInsideMobileDropdown && !clickedInsideMobileBtn) {
          setShowSearchInput(false);
        }
      }

      if (userMenuOpen) {
        if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
          setUserMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showSearchInput, userMenuOpen]);

  const navLinks = [
    { name: 'About', href: '#about', isSection: true, icon: Info },
    { name: 'Shop', isShop: true, icon: ShoppingBag },
    { name: 'Orders', isOrders: true, icon: Package },
    { name: 'Contact', href: '#contact', isSection: true, icon: Mail },
  ];

  const handleLinkClick = (e, link) => {
    if (link.isPortal) {
      e.preventDefault();
      onNavigateAdmin();
      setMobileMenuOpen(false);
      setShowSearchInput(false);
    } else if (link.isShop) {
      e.preventDefault();
      if (onNavigateFullCatalog) {
        onNavigateFullCatalog();
      }
      setMobileMenuOpen(false);
      setShowSearchInput(false);
    } else if (link.isOrders) {
      e.preventDefault();
      if (onNavigateOrders) {
        onNavigateOrders();
      }
      setMobileMenuOpen(false);
      setShowSearchInput(false);
    } else if (link.isSection) {
      e.preventDefault();
      setMobileMenuOpen(false);
      setShowSearchInput(false);

      const sectionId = link.href.substring(1); // 'about' or 'contact'
      if (currentView !== 'home') {
        onNavigateHome(sectionId);
      } else {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } else {
      setMobileMenuOpen(false);
      setShowSearchInput(false);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (onSearch) {
        onSearch(searchVal);
      }
      setShowSearchInput(false);
      setMobileMenuOpen(false);
    }
  };

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="absolute top-0 left-0 right-0 w-full h-[80px] z-50 bg-[#fff3f7] backdrop-blur-xl border-b border-[#E8DCD7]/60 px-6 sm:px-12 flex items-center justify-between m-0 rounded-none shadow-sm"
    >
      {/* --- DESKTOP VIEW ELEMENTS --- */}
      {/* Desktop Logo (Visible on desktop only) */}
      <button onClick={onNavigateHome} className="hidden md:flex items-center gap-2 group focus:outline-none rounded-none">
        <span className="text-2xl sm:text-3xl font-brand font-normal tracking-wide text-[#2C1E1B] group-hover:text-[#2C1E1B] transition-colors duration-300">
          Aura
        </span>
      </button>

      {/* Desktop Links & Actions Row (Visible on desktop only) */}
      <div className="hidden md:flex items-center gap-8">
        <nav className="flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href || '#'}
              onClick={(e) => handleLinkClick(e, link)}
              className="relative text-xs uppercase tracking-[0.2em] font-brand font-semibold text-[#2C1E1B] hover:text-[#2C1E1B] transition-colors py-1 group rounded-none"
            >
              <span>{link.name}</span>
              <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-[#B86B60] group-hover:w-full transition-all duration-300 rounded-none" />
            </a>
          ))}
        </nav>

        {/* Desktop Actions Row (Search + Cart Basket + Profile in far right corner) */}
        <div className="flex items-center border-l border-[#E8DCD7] pl-6 ml-2 gap-4">
          {/* 1. Search Toggle Icon */}
          <div className="flex items-center" ref={searchContainerRef}>
            <button
              onClick={() => setShowSearchInput(!showSearchInput)}
              className="text-[#2C1E1B] hover:text-[#B86B60] p-1.5 focus:outline-none transition-colors flex items-center justify-center cursor-pointer"
              aria-label="Toggle search input"
              title="Search catalog"
            >
              <Search className="w-[25px] h-[25px] stroke-[1.75]" />
            </button>
            <AnimatePresence>
              {showSearchInput && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 180, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="border-b border-[#E8DCD7] focus-within:border-[#2C1E1B] px-1 py-0.5 overflow-hidden flex items-center ml-2"
                >
                  <input
                    type="text"
                    placeholder="Search catalog..."
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                    onKeyDown={handleSearchSubmit}
                    className="w-full bg-transparent border-none text-[11px] text-[#2C1E1B] placeholder-[#A38E88] focus:outline-none py-0.5"
                    autoFocus
                  />
                  {searchVal && (
                    <button
                      onClick={() => setSearchVal('')}
                      className="text-[10px] text-[#A38E88] hover:text-[#2C1E1B] ml-1 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 2. Cart Basket Icon: Balanced in size with Profile */}
          <button
            onClick={onOpenWishlist}
            className="text-[#B86B60] hover:text-[#2C1E1B] p-1 focus:outline-none transition-colors relative flex items-center justify-center cursor-pointer"
            title="Shopping Bag"
            aria-label="View Shopping Bag"
          >
            <img src={cartBasketIcon} alt="Cart" width={55} height={55} loading="lazy" decoding="async" className="w-[55px] h-[55px] object-contain" />
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#B86B60] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-md">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* 3. User Account / Profile Trigger (Far Right Corner) */}
          <div className="relative" ref={userMenuRef}>
            {user ? (
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-9 h-9 rounded-full bg-[#2C1E1B] text-white flex items-center justify-center text-xs font-bold font-brand tracking-wider hover:bg-[#B86B60] transition-colors cursor-pointer shadow-sm relative"
                title="Account Menu"
                aria-label="Account Menu"
              >
                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                {profile?.has_set_password === false && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white" title="Password setup recommended" />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="text-[#2C1E1B] hover:text-[#B86B60] p-1.5 focus:outline-none transition-colors flex items-center justify-center cursor-pointer"
                title="Sign In / Register"
                aria-label="Sign In or Register"
              >
                <User className="w-[22px] h-[22px] stroke-[1.75]" />
              </button>
            )}

            {/* User Dropdown Menu */}
            <AnimatePresence>
              {user && userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-3 w-64 bg-white border border-[#E8DCD7] shadow-xl p-4 rounded-none z-50 text-left space-y-3"
                >
                  <div className="pb-3 border-b border-[#E8DCD7]">
                    <p className="text-xs font-bold text-[#2C1E1B] truncate">
                      {profile?.full_name || 'Valued Client'}
                    </p>
                    <p className="text-[11px] text-[#705B56] truncate">{user.email}</p>
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-[#FAF5F2] border border-[#E8DCD7] text-[9px] uppercase font-bold tracking-wider text-[#B86B60]">
                      <ShieldCheck className="w-3 h-3" />
                      <span>{role?.toUpperCase()}</span>
                    </div>
                  </div>

                  {profile?.has_set_password === false && (
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full p-2 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold text-left flex items-center gap-2 hover:bg-amber-100 transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Set Password (Action Needed)</span>
                    </button>
                  )}

                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full text-left py-1.5 px-2 text-xs text-[#2C1E1B] hover:bg-[#FAF5F2] flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-[#705B56]" />
                      <span>Profile & Settings</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onNavigateOrders();
                      }}
                      className="w-full text-left py-1.5 px-2 text-xs text-[#2C1E1B] hover:bg-[#FAF5F2] flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Package className="w-3.5 h-3.5 text-[#705B56]" />
                      <span>My Orders</span>
                    </button>

                    {(role === 'admin' || role === 'superadmin') && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          onNavigateAdmin();
                        }}
                        className="w-full text-left py-1.5 px-2 text-xs text-[#B86B60] hover:bg-[#FAF5F2] flex items-center gap-2 transition-colors cursor-pointer font-bold"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Admin Studio</span>
                      </button>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#E8DCD7]">
                    <button
                      type="button"
                      onClick={async () => {
                        setUserMenuOpen(false);
                        await signOut();
                      }}
                      className="w-full text-left py-1.5 px-2 text-xs text-rose-700 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer font-semibold"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* --- MOBILE VIEW ELEMENTS --- */}
      {/* Mobile Menu Hamburger & Brand Logo (Visible on mobile only, left aligned) */}
      <div className="flex md:hidden items-center gap-2.5">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setMobileMenuOpen(!mobileMenuOpen);
            setShowSearchInput(false);
          }}
          className="p-1.5 text-[#2C1E1B] bg-transparent border-none focus:outline-none flex items-center justify-center rounded-none cursor-pointer"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </motion.button>

        <button onClick={onNavigateHome} className="focus:outline-none flex items-center">
          <span className="text-xl font-brand font-normal tracking-wide text-[#2C1E1B]">
            Aura
          </span>
        </button>
      </div>

      {/* Mobile Actions: Search + Cart Basket + User Profile (Icons only) */}
      <div className="flex md:hidden items-center gap-3 sm:gap-4">
        {/* 1. Mobile Search Button */}
        <button
          ref={mobileSearchBtnRef}
          onClick={() => {
            setShowSearchInput(!showSearchInput);
            setMobileMenuOpen(false);
          }}
          className="p-1 text-[#2C1E1B] hover:text-[#B86B60] bg-transparent border-none focus:outline-none rounded-none cursor-pointer transition-colors"
          aria-label="Toggle Mobile Search"
        >
          <Search className="w-5 h-5 stroke-[1.75]" />
        </button>

        {/* 2. Mobile Cart Basket */}
        <button
          onClick={onOpenWishlist}
          className="p-1 text-[#2C1E1B] hover:text-[#B86B60] bg-transparent border-none focus:outline-none rounded-none relative cursor-pointer transition-colors"
          aria-label="View Shopping Bag"
        >
          <div className="relative">
            <img src={cartBasketIcon} alt="Cart" width={24} height={24} loading="lazy" decoding="async" className="w-[24px] h-[24px] object-contain" />
            {wishlistCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-[#B86B60] text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold shadow-md">
                {wishlistCount}
              </span>
            )}
          </div>
        </button>

        {/* 3. Mobile User Account Button */}
        {user ? (
          <button
            onClick={onOpenProfile}
            className="p-1 text-[#2C1E1B] bg-transparent border-none focus:outline-none rounded-none cursor-pointer"
            title="Account"
            aria-label="Account"
          >
            <div className="w-6 h-6 rounded-full bg-[#2C1E1B] text-white flex items-center justify-center text-[10px] font-bold font-brand tracking-wider relative">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
              {profile?.has_set_password === false && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-500 rounded-full border border-white" />
              )}
            </div>
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="p-1 text-[#2C1E1B] hover:text-[#B86B60] bg-transparent border-none focus:outline-none rounded-none cursor-pointer transition-colors"
            aria-label="Sign In"
            title="Sign In / Register"
          >
            <User className="w-5 h-5 stroke-[1.75]" />
          </button>
        )}
      </div>

      {/* Mobile Slide-down Search Bar */}
      <AnimatePresence>
        {showSearchInput && (
          <motion.div
            ref={mobileSearchRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 bg-white border-b border-[#E8DCD7]/60 px-6 py-3.5 flex items-center shadow-lg z-40 rounded-none md:hidden"
          >
            <Search className="w-4 h-4 text-[#B86B60] mr-2" />
            <input
              type="text"
              placeholder="Search catalog..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onKeyDown={handleSearchSubmit}
              className="w-full bg-transparent border-none text-xs text-[#2C1E1B] placeholder-[#A38E88] focus:outline-none py-1"
              autoFocus
            />
            {searchVal && (
              <button
                onClick={() => setSearchVal('')}
                className="text-[#A38E88] hover:text-[#2C1E1B] ml-2 text-xs"
              >
                Clear
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Dropdown containing navigation bar items with icon and label */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="absolute top-full left-0 right-0 bg-[#fff3f7]/98 backdrop-blur-2xl border-b border-[#E8DCD7] py-6 px-4 shadow-xl z-40 rounded-none md:hidden"
          >
            <div className="max-w-md mx-auto space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {navLinks.map((link) => {
                  const IconComponent = link.icon;
                  return (
                    <button
                      key={link.name}
                      onClick={(e) => handleLinkClick(e, link)}
                      className="flex flex-col items-center justify-center gap-1.5 py-3 px-1 border border-[#E8DCD7] hover:border-[#2C1E1B] bg-white/70 hover:bg-white text-[#2C1E1B] focus:outline-none transition-all rounded-none group cursor-pointer shadow-xs"
                      title={link.name}
                      aria-label={link.name}
                    >
                      <IconComponent className="w-5 h-5 stroke-[1.6] text-[#B86B60] group-hover:text-[#2C1E1B] transition-colors" />
                      <span className="text-[10px] font-brand uppercase tracking-[0.14em] font-bold text-[#2C1E1B]">
                        {link.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Mobile Quick Account / Sign In Row */}
              <div className="pt-3.5 border-t border-[#E8DCD7]/60 flex items-center justify-between">
                {user ? (
                  <div className="flex items-center justify-between w-full text-xs font-brand tracking-wider">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenProfile();
                      }}
                      className="flex items-center gap-2 text-[#2C1E1B] hover:text-[#B86B60] font-semibold text-left cursor-pointer"
                    >
                      <User className="w-4 h-4 text-[#B86B60]" />
                      <span className="truncate max-w-[180px] text-[11px] uppercase tracking-wider font-bold">
                        {profile?.full_name || 'My Account'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setMobileMenuOpen(false);
                        await signOut();
                      }}
                      className="text-rose-700 hover:text-rose-900 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAuth();
                    }}
                    className="w-full py-2.5 bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-[11px] font-bold uppercase tracking-[0.2em] font-brand transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <User className="w-4 h-4" />
                    <span>Client Sign In / Register</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.header>
  );
}
