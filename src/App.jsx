import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import MarqueeTicker from './components/MarqueeTicker';
import AboutSection from './components/AboutSection';
import ProductCatalog from './components/ProductCatalog';
import QuickViewModal from './components/QuickViewModal';
import ContactSection from './components/ContactSection';
import Footer from './components/Footer';
import FullCatalogView from './components/FullCatalogView';
import AdminPortal from './components/AdminPortal';
import SplashScreen from './components/SplashScreen';
import { PRODUCTS } from './data/products';
import { supabase } from './lib/supabaseClient';

export default function App() {
  const getInitialView = () => {
    const path = window.location.pathname;
    if (path === '/admin-dashboard') return 'admin';
    if (path === '/full-catalog') return 'full-catalog';
    return 'home';
  };

  const [currentView, setCurrentView] = useState(getInitialView());
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  
  const [showSplash, setShowSplash] = useState(true);
  const [mediaTheme, setMediaTheme] = useState('light');

  const handleToggleMediaTheme = () => {
    setMediaTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Real-time products state loaded from database
  const [dbProducts, setDbProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dynamic customization configs (loaded from Supabase / storefront_config)
  const [heroConfig, setHeroConfig] = useState({
    id: null,
    posterUrl: null,
    title: 'Aura',
    aboutMediaUrl: null,
    aboutMediaType: 'image',
    aboutTitle: 'Oh What?',
    aboutSubtitle: 'Sakura Blossom - Milky Lavender',
    aboutDescription: 'The Brightening Secret. Lavender blushes are a viral beauty secret for a reason! This milky purple is a dream for fair skin and Asian skin tones, as the purple pigment acts as a color corrector to neutralize sallow or yellow tones, leaving a bright, "ethereal" glow.\n\nOn white skin with cool undertones, it creates a unique, high-fashion pastel flush. For darker skin, it can be used as a targeted brightening topper over a deeper blush to add a modern, multidimensional finish.',
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Fetch products from database
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('createdAt', { ascending: false });
      
      if (error) throw error;
      if (data) {
        setDbProducts(data);
      }
    } catch (err) {
      console.warn('Fallback to local mock data. Supabase products fetch error:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch storefront configuration
  const fetchStorefrontConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('storefront_config')
        .select('*')
        .limit(1)
        .single();
      
      if (error) throw error;
      if (data) {
        setHeroConfig({
          id: data.id,
          posterUrl: data.posterUrl,
          title: data.title,
          aboutMediaUrl: data.about_media_url || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1000&auto=format&fit=crop',
          aboutMediaType: data.about_media_type || 'image',
          aboutTitle: data.about_title || 'Oh What?',
          aboutSubtitle: data.about_subtitle || 'Sakura Blossom - Milky Lavender',
          aboutDescription: data.about_description || 'The Brightening Secret. Lavender blushes are a viral beauty secret for a reason! This milky purple is a dream for fair skin and Asian skin tones, as the purple pigment acts as a color corrector to neutralize sallow or yellow tones, leaving a bright, "ethereal" glow.\n\nOn white skin with cool undertones, it creates a unique, high-fashion pastel flush. For darker skin, it can be used as a targeted brightening topper over a deeper blush to add a modern, multidimensional finish.',
        });
      }
    } catch (err) {
      console.warn('Fallback to default hero. Supabase config fetch error:', err.message);
      // Restore hardcoded template defaults on failure
      setHeroConfig({
        id: null,
        posterUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1600&auto=format&fit=crop',
        title: 'Aura',
        aboutMediaUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1000&auto=format&fit=crop',
        aboutMediaType: 'image',
        aboutTitle: 'Oh What?',
        aboutSubtitle: 'Sakura Blossom - Milky Lavender',
        aboutDescription: 'The Brightening Secret. Lavender blushes are a viral beauty secret for a reason! This milky purple is a dream for fair skin and Asian skin tones, as the purple pigment acts as a color corrector to neutralize sallow or yellow tones, leaving a bright, "ethereal" glow.\n\nOn white skin with cool undertones, it creates a unique, high-fashion pastel flush. For darker skin, it can be used as a targeted brightening topper over a deeper blush to add a modern, multidimensional finish.',
      });
    }
  };

  // Trigger loads on mount & popstate history listener
  useEffect(() => {
    fetchProducts();
    fetchStorefrontConfig();

    const checkCurrentPath = () => {
      const path = window.location.pathname;
      if (path === '/admin-dashboard') {
        setCurrentView('admin');
      } else if (path === '/full-catalog') {
        setCurrentView('full-catalog');
      } else {
        setCurrentView('home');
      }
    };

    // Run path check on initial mount
    checkCurrentPath();

    window.addEventListener('popstate', checkCurrentPath);
    return () => window.removeEventListener('popstate', checkCurrentPath);
  }, []);

  const navigateToFullCatalog = () => {
    setCatalogSearchQuery('');
    setCurrentView('full-catalog');
    window.history.pushState(null, '', '/full-catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToHome = (scrollToSection = null) => {
    setCatalogSearchQuery('');
    setCurrentView('home');
    window.history.pushState(null, '', '/');
    
    if (scrollToSection && typeof scrollToSection === 'string') {
      setTimeout(() => {
        const element = document.getElementById(scrollToSection);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navigateToAdmin = () => {
    setCurrentView('admin');
    window.history.pushState(null, '', '/admin-dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Resolve active products list from database (filter out ARCHIVE)
  const allProducts = dbProducts;
  const activeProducts = allProducts.filter(p => p.statusBadge !== 'ARCHIVE');

  // Render full-screen Admin View if selected
  if (currentView === 'admin') {
    return (
      <AdminPortal 
        onClosePortal={() => {
          fetchProducts();
          fetchStorefrontConfig();
          navigateToHome();
        }}
        heroConfig={heroConfig}
        onUpdateHeroConfig={setHeroConfig}
        onRefreshData={() => {
          fetchProducts();
          fetchStorefrontConfig();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fff3f7] text-[#2C1E1B] selection:bg-[#D99B91] selection:text-white">
      
      {/* Premium Session-first Splash Screen */}
      <AnimatePresence>
        {showSplash && (
          <SplashScreen 
            onComplete={() => {
              sessionStorage.setItem('aura_splash_seen', 'true');
              setShowSplash(false);
            }} 
          />
        )}
      </AnimatePresence>
      {/* Animated Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-6 right-6 z-50 bg-[#2C1E1B] text-white px-5 py-3 rounded-none text-xs font-semibold shadow-2xl flex items-center gap-3 border border-white/20"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Floating Glass Navbar */}
      <Navbar
        onNavigateHome={navigateToHome}
        onNavigateFullCatalog={navigateToFullCatalog}
        onNavigateAdmin={navigateToAdmin}
        currentView={currentView}
        onSearch={(query) => {
          setCatalogSearchQuery(query);
          setCurrentView('full-catalog');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <main>
        {currentView === 'home' ? (
          <>
            {/* Hero Banner with Custom Config */}
            <Hero config={heroConfig} />

            {/* Continuous Scrolling Marquee Ticker */}
            <MarqueeTicker />

            {/* About Aura Brand Story */}
            <AboutSection config={heroConfig} />

            {/* Product Catalog Grid */}
            <ProductCatalog
              products={activeProducts}
              isLoading={isLoading}
              onSelectProduct={(product) => setSelectedProduct(product)}
              onViewFullCatalog={navigateToFullCatalog}
              mediaTheme={mediaTheme}
              onToggleMediaTheme={handleToggleMediaTheme}
            />

            {/* Atelier Contact Us Section */}
            <ContactSection />
          </>
        ) : (
          <FullCatalogView
            products={activeProducts}
            isLoading={isLoading}
            onBackToHome={navigateToHome}
            onSelectProduct={(product) => setSelectedProduct(product)}
            initialSearchQuery={catalogSearchQuery}
            mediaTheme={mediaTheme}
            onToggleMediaTheme={handleToggleMediaTheme}
          />
        )}
      </main>

      {/* Footer */}
      <Footer onNavigateAdmin={navigateToAdmin} />

      {/* Quick View Modal */}
      {selectedProduct && (
        <QuickViewModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          mediaTheme={mediaTheme}
        />
      )}

    </div>
  );
}
