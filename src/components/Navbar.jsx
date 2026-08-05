import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Sliders, Mail, Menu, X, Search, ShoppingBag } from 'lucide-react';
import cartBasketIcon from '../images/icons/CART BASKET.png';

export default function Navbar({ onNavigateHome, onNavigateFullCatalog, onNavigateAdmin, currentView, onSearch }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const searchContainerRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const mobileSearchBtnRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!showSearchInput) return;

      const clickedInsideDesktop = searchContainerRef.current && searchContainerRef.current.contains(event.target);
      const clickedInsideMobileDropdown = mobileSearchRef.current && mobileSearchRef.current.contains(event.target);
      const clickedInsideMobileBtn = mobileSearchBtnRef.current && mobileSearchBtnRef.current.contains(event.target);

      if (!clickedInsideDesktop && !clickedInsideMobileDropdown && !clickedInsideMobileBtn) {
        setShowSearchInput(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showSearchInput]);

  const navLinks = [
    { name: 'About', href: '#about', isSection: true, icon: Info },
    { name: 'Contact', href: '#contact', isSection: true, icon: Mail },
  ];

  const handleLinkClick = (e, link) => {
    if (link.isPortal) {
      e.preventDefault();
      onNavigateAdmin();
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

        {/* Desktop Actions Row (Search + Catalog Cart Icon) */}
        <div className="flex items-center border-l border-[#E8DCD7] pl-6 ml-2 gap-4">
          {/* Catalog Cart Icon */}
          <button
            onClick={onNavigateFullCatalog}
            className="text-[#B86B60] hover:text-[#2C1E1B] p-1 focus:outline-none transition-colors flex items-center justify-center"
            title="View Catalog"
            aria-label="View Catalog"
          >
            <img src={cartBasketIcon} alt="Cart" className="w-[70px] h-[70px] object-contain" />
          </button>

          {/* Search Toggle Icon */}
          <div className="flex items-center" ref={searchContainerRef}>
            <button
              onClick={() => setShowSearchInput(!showSearchInput)}
              className="text-[#2C1E1B] hover:text-[#2C1E1B] p-1 focus:outline-none transition-colors flex items-center justify-center"
              aria-label="Toggle search input"
            >
              <Search className="w-[40px] h-[40px] stroke-[1.6]" />
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

      {/* Mobile Actions: Search + Cart (Visible on mobile only, right aligned) */}
      <div className="flex md:hidden items-center gap-1.5 sm:gap-2">
        {/* Mobile Search Button */}
        <button
          ref={mobileSearchBtnRef}
          onClick={() => {
            setShowSearchInput(!showSearchInput);
            setMobileMenuOpen(false);
          }}
          className="p-1 text-[#2C1E1B] bg-transparent border-none focus:outline-none flex items-center justify-center rounded-none"
          aria-label="Toggle Mobile Search"
        >
          <Search className="w-[35px] h-[35px] stroke-[1.6]" />
        </button>

        {/* Mobile Catalog Cart Button */}
        <button
          onClick={onNavigateFullCatalog}
          className="p-1 text-[#2C1E1B] bg-transparent border-none focus:outline-none flex items-center justify-center rounded-none"
          aria-label="View Catalog"
        >
          <img src={cartBasketIcon} alt="Cart" className="w-[55px] h-[55px] object-contain" />
        </button>
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
