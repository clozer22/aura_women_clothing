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
import WishlistDrawer from './components/WishlistDrawer';
import CheckoutPage from './components/CheckoutPage';
import OrderConfirmed from './components/OrderConfirmed';
import OrderHistory from './components/OrderHistory';
import { PRODUCTS } from './data/products';
import { supabase } from './lib/supabaseClient';
import { getWishlist } from './lib/wishlistManager';
import { AuthProvider, useAuth } from './context/AuthContext';
import CustomerAuthModal from './components/CustomerAuthModal';
import CustomerProfilePage from './components/CustomerProfilePage';
import PasswordPromptBanner from './components/PasswordPromptBanner';

function MainApp() {
  const { user } = useAuth();

  const getInitialView = () => {
    const path = window.location.pathname;
    if (path === '/admin-dashboard') return 'admin';
    if (path === '/full-catalog') return 'full-catalog';
    if (path === '/checkout') return 'checkout';
    if (path === '/orders') return 'orders';
    if (path === '/order-confirmed') return 'order-confirmed';
    if (path === '/profile') return 'profile';
    return 'home';
  };

  const getInitialOrder = () => {
    try {
      localStorage.removeItem('aura_guest_orders');
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      const last = localStorage.getItem('aura_last_order');
      const lastOrder = last ? JSON.parse(last) : null;
      if (lastOrder && (!ref || lastOrder.order_reference === ref)) {
        if (ref) {
          lastOrder.payment_status = 'PAID';
          lastOrder.status = 'PROCESSING';
          localStorage.setItem('aura_last_order', JSON.stringify(lastOrder));
        }
        return lastOrder;
      }
      return lastOrder || null;
    } catch (e) {
      return null;
    }
  };

  const [currentView, setCurrentView] = useState(getInitialView());
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [wishlistDrawerOpen, setWishlistDrawerOpen] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState([]);
  const [pendingCheckoutItems, setPendingCheckoutItems] = useState(null);
  const [completedOrder, setCompletedOrder] = useState(getInitialOrder());
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [showSplash, setShowSplash] = useState(true);

  // Read initial cache from sessionStorage to allow instantaneous loads with 0ms delay
  const getCachedProducts = () => {
    try {
      const cached = sessionStorage.getItem('aura_products_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  };

  const getCachedConfig = () => {
    try {
      const cached = sessionStorage.getItem('aura_storefront_config_cache');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  };

  const initialProducts = getCachedProducts();
  const initialConfig = getCachedConfig();

  // Real-time products state loaded from database (initialized from cache if available)
  const [dbProducts, setDbProducts] = useState(initialProducts);
  const [isLoading, setIsLoading] = useState(initialProducts.length === 0);

  // Dynamic customization configs (loaded from Supabase / storefront_config)
  const [heroConfig, setHeroConfig] = useState(initialConfig || {
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

  // Fetch products from database (stale-while-revalidate in background)
  const fetchProducts = async () => {
    if (dbProducts.length === 0) {
      setIsLoading(true);
    }
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;
      if (data) {
        setDbProducts(data);
        try {
          sessionStorage.setItem('aura_products_cache', JSON.stringify(data));
        } catch {}
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
        const configData = {
          id: data.id,
          posterUrl: data.posterUrl,
          title: data.title,
          aboutMediaUrl: data.about_media_url || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1000&auto=format&fit=crop',
          aboutMediaType: data.about_media_type || 'image',
          aboutTitle: data.about_title || 'Oh What?',
          aboutSubtitle: data.about_subtitle || 'Sakura Blossom - Milky Lavender',
          aboutDescription: data.about_description || 'The Brightening Secret. Lavender blushes are a viral beauty secret for a reason! This milky purple is a dream for fair skin and Asian skin tones, as the purple pigment acts as a color corrector to neutralize sallow or yellow tones, leaving a bright, "ethereal" glow.\n\nOn white skin with cool undertones, it creates a unique, high-fashion pastel flush. For darker skin, it can be used as a targeted brightening topper over a deeper blush to add a modern, multidimensional finish.',
        };
        setHeroConfig(configData);
        try {
          sessionStorage.setItem('aura_storefront_config_cache', JSON.stringify(configData));
        } catch {}
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
      } else if (path === '/checkout') {
        setCurrentView('checkout');
      } else if (path === '/orders') {
        setCurrentView('orders');
      } else if (path === '/order-confirmed') {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        if (ref) {
          try {
            const savedOrders = JSON.parse(localStorage.getItem('aura_guest_orders') || '[]');
            const found = savedOrders.find((o) => o.order_reference === ref);
            if (found) {
              found.payment_status = 'PAID';
              found.status = 'PROCESSING';
              localStorage.setItem('aura_guest_orders', JSON.stringify(savedOrders));
              setCompletedOrder(found);
            }
          } catch (e) {}
        }
        setCurrentView('order-confirmed');
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

  const navigateToCheckout = (items) => {
    const validItems = Array.isArray(items) && items.length > 0 ? items : getWishlist();
    if (validItems.length === 0) {
      showToast('Your wishlist / bag is currently empty.');
      return;
    }

    // Require login to checkout: guests can browse, but checking out triggers auth modal
    if (!user) {
      setPendingCheckoutItems(validItems);
      setWishlistDrawerOpen(false);
      setSelectedProduct(null);
      setAuthModalOpen(true);
      showToast('Please sign in or create an account to proceed to checkout.');
      return;
    }

    setCheckoutItems(validItems);
    setCurrentView('checkout');
    window.history.pushState(null, '', '/checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToOrders = () => {
    setCurrentView('orders');
    window.history.pushState(null, '', '/orders');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToProfile = () => {
    setCurrentView('profile');
    window.history.pushState(null, '', '/profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderCompleted = (order) => {
    setCompletedOrder(order);
    setCurrentView('order-confirmed');
    window.history.pushState(null, '', '/order-confirmed');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBuyNow = (productWithVariant) => {
    navigateToCheckout([
      {
        id: productWithVariant.id,
        name: productWithVariant.name,
        image: productWithVariant.image,
        price: productWithVariant.price,
        size: productWithVariant.size || 'Standard',
        color: productWithVariant.color || 'Standard',
        quantity: productWithVariant.quantity || 1,
      },
    ]);
  };

  // Resolve active products list from database (filter out ARCHIVE)
  const allProducts = dbProducts;
  const activeProducts = allProducts.filter((p) => p.statusBadge !== 'ARCHIVE');

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

  // Render full-screen Checkout View (Guarded: login required)
  if (currentView === 'checkout') {
    if (!user) {
      return (
        <div className="min-h-screen bg-[#FAF5F2] flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8DCD7] p-8 max-w-md w-full text-center shadow-xl">
            <span className="text-[10px] font-brand uppercase tracking-[0.25em] text-[#B86B60] font-bold block mb-1">
              AUTHENTICATION REQUIRED
            </span>
            <h2 className="font-brand text-2xl text-[#2C1E1B] mb-2">Sign In to Checkout</h2>
            <p className="text-xs text-[#705B56] mb-6 leading-relaxed">
              Please sign in with Google or your email account to proceed with your checkout and track your order.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={navigateToHome}
                className="flex-1 py-3 border border-[#2C1E1B] text-xs font-bold uppercase tracking-wider text-[#2C1E1B] hover:bg-[#FAF5F2] cursor-pointer"
              >
                Return to Shop
              </button>
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex-1 py-3 bg-[#2C1E1B] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#B86B60] cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <CheckoutPage
        checkoutItems={checkoutItems.length > 0 ? checkoutItems : getWishlist()}
        onBackToShop={navigateToHome}
        onOrderCompleted={handleOrderCompleted}
      />
    );
  }

  // Render full-screen Order Confirmation View
  if (currentView === 'order-confirmed') {
    return (
      <OrderConfirmed
        order={completedOrder}
        onContinueShopping={navigateToHome}
        onViewOrders={navigateToOrders}
      />
    );
  }

  // Render full-screen Order History View
  if (currentView === 'orders') {
    return (
      <OrderHistory
        onBackToShop={navigateToHome}
      />
    );
  }

  // Render full-screen Customer Profile & Settings View
  if (currentView === 'profile') {
    return (
      <CustomerProfilePage
        onBackToShop={navigateToHome}
        onNavigateOrders={navigateToOrders}
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

      {/* Password Creation Prompt for Google Users */}
      <PasswordPromptBanner onOpenProfile={navigateToProfile} />

      {/* Main Floating Glass Navbar */}
      <Navbar
        onNavigateHome={navigateToHome}
        onNavigateFullCatalog={navigateToFullCatalog}
        onNavigateAdmin={navigateToAdmin}
        onNavigateOrders={navigateToOrders}
        onOpenWishlist={() => setWishlistDrawerOpen(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenProfile={navigateToProfile}
        currentView={currentView}
        onSearch={(query) => {
          setCatalogSearchQuery(query);
          setCurrentView('full-catalog');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <main>
        {/* Home View - kept in DOM to preserve rendered images and scroll state */}
        <div className={currentView === 'home' ? 'block' : 'hidden'} aria-hidden={currentView !== 'home'}>
          {/* Hero Banner with Custom Config */}
          <Hero config={heroConfig} />

          {/* Continuous Scrolling Marquee Ticker */}
          <MarqueeTicker />

          <div className="w-full flex items-center justify-center pt-[4rem] pb-7 bg-white">
            <h2
              className="font-brand font-light text-[2.2rem] sm:text-[5rem] tracking-[0.25em] leading-none text-[#705B56] block uppercase text-center select-none"
            >
              {heroConfig.aboutTitle || 'About Aura'}
            </h2>
          </div>
          <AboutSection config={heroConfig} />
          <div className="w-full flex flex-col items-center justify-center py-5 px-3 bg-white pb-16">
            <div className='max-w-2xl'>
              <p className="text-xs sm:text-sm text-[#705B56] font-sans text-center leading-relaxed">
                {heroConfig.aboutDescription || ''}
              </p>
            </div>
          </div>
          {/* Product Catalog Grid */}
          <ProductCatalog
            products={activeProducts}
            isLoading={isLoading}
            onSelectProduct={(product) => setSelectedProduct(product)}
            onViewFullCatalog={navigateToFullCatalog}
          />

          {/* Atelier Contact Us Section */}
          <ContactSection />
        </div>

        {/* Full Catalog View - kept in DOM so navigating back and forth has 0ms delay and zero re-fetching */}
        <div className={currentView === 'full-catalog' ? 'block' : 'hidden'} aria-hidden={currentView !== 'full-catalog'}>
          <FullCatalogView
            products={activeProducts}
            isLoading={isLoading}
            onBackToHome={navigateToHome}
            onSelectProduct={(product) => setSelectedProduct(product)}
            initialSearchQuery={catalogSearchQuery}
          />
        </div>
      </main>

      {/* Footer */}
      <Footer onNavigateAdmin={navigateToAdmin} />

      {/* Quick View Modal */}
      {selectedProduct && (
        <QuickViewModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onBuyNow={handleBuyNow}
          onOpenWishlist={() => setWishlistDrawerOpen(true)}
        />
      )}

      {/* Right Slide-out Wishlist Navigation Drawer */}
      <WishlistDrawer
        isOpen={wishlistDrawerOpen}
        onClose={() => setWishlistDrawerOpen(false)}
        onProceedToCheckout={(items) => navigateToCheckout(items)}
        onAddToCart={(item) => {
          showToast(`${item.name} moved to bag`);
        }}
      />

      {/* Customer Authentication Modal (Google / Email / OTP) */}
      <CustomerAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          showToast('Welcome to Aura');
          if (pendingCheckoutItems && pendingCheckoutItems.length > 0) {
            const items = [...pendingCheckoutItems];
            setPendingCheckoutItems(null);
            setCheckoutItems(items);
            setCurrentView('checkout');
            window.history.pushState(null, '', '/checkout');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
