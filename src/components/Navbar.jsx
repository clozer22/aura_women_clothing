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
import cartBasketIcon from '../images/icons/CART BASKET.png';
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
            <img src={cartBasketIcon} alt="Cart" className="w-[55px] h-[55px] object-contain" />
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
                className="text-[#2C1E1B] hover:text-[#B86B60] p-1.5 focus:outline-none transition-colors flex items-center gap-1.5 text-xs uppercase font-bold tracking-wider cursor-pointer"
                title="Sign In / Register"
                aria-label="Sign In or Register"
              >
                <User className="w-[22px] h-[22px] stroke-[1.75]" />
                <span className="hidden lg:inline text-[11px]">Sign In</span>
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
      {/* Mobile Menu Hamburger (Visible on mobile only, left aligned) */}
      <div className="flex md:hidden items-center">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setMobileMenuOpen(!mobileMenuOpen);
            setShowSearchInput(false);
          }}
          className="p-2 text-[#2C1E1B] bg-transparent border-none focus:outline-none flex items-center justify-center rounded-none"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </motion.button>
      </div>

      {/* Mobile Actions: Search + Cart Basket + User Profile in far right corner */}
      <div className="flex md:hidden items-center gap-3">
        {/* 1. Mobile Search Button */}
        <button
          ref={mobileSearchBtnRef}
          onClick={() => {
            setShowSearchInput(!showSearchInput);
            setMobileMenuOpen(false);
          }}
          className="p-1 text-[#2C1E1B] bg-transparent border-none focus:outline-none flex items-center justify-center rounded-none"
          aria-label="Toggle Mobile Search"
        >
          <Search className="w-5 h-5 stroke-[1.75]" />
        </button>

        {/* 2. Mobile Cart Basket */}
        <button
          onClick={onOpenWishlist}
          className="p-1 text-[#2C1E1B] bg-transparent border-none focus:outline-none flex items-center justify-center rounded-none relative cursor-pointer"
          aria-label="View Shopping Bag"
        >
          <img src={cartBasketIcon} alt="Cart" className="w-[28px] h-[28px] object-contain" />
          {wishlistCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#B86B60] text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold shadow-md">
              {wishlistCount}
            </span>
          )}
        </button>

        {/* 3. Mobile User Account Button (Far Right Corner) */}
        {user ? (
          <button
            onClick={onOpenProfile}
            className="w-8 h-8 rounded-full bg-[#2C1E1B] text-white flex items-center justify-center text-[10px] font-bold font-brand tracking-wider relative cursor-pointer"
            title="Account"
            aria-label="Account"
          >
            {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
            {profile?.has_set_password === false && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full border border-white" />
            )}
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="p-1 text-[#2C1E1B] bg-transparent border-none focus:outline-none flex items-center justify-center cursor-pointer"
            aria-label="Sign In"
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

      {/* Mobile Menu Dropdown containing centered square icon slots */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="absolute top-full left-0 right-0 bg-white/95 backdrop-blur-2xl border-b border-[#E8DCD7]/60 py-8 px-6 flex justify-center items-center gap-5 shadow-lg z-40 rounded-none"
          >
            {navLinks.map((link) => {
              const IconComponent = link.icon;
              return (
                <button
                  key={link.name}
                  onClick={(e) => handleLinkClick(e, link)}
                  className="w-14 h-14 border border-[#E8DCD7] hover:border-[#2C1E1B] flex items-center justify-center transition-all bg-[#FAF0EC]/30 text-[#B86B60] hover:text-[#2C1E1B] focus:outline-none rounded-none"
                  title={link.name}
                  aria-label={link.name}
                >
                  <IconComponent className="w-5 h-5 stroke-[1.6]" />
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

    </motion.header>
  );
}
