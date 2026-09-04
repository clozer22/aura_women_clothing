import React, { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ShoppingBag, Sliders, ArrowLeft, Search, Plus, X, Globe, Save, Trash2, LogOut, Upload, AlertTriangle, XCircle, Check, Edit, Star, Menu, ChevronLeft, ChevronRight, Loader2, LayoutDashboard, TrendingUp, Package, ShieldCheck, Users, CheckCircle2, DollarSign, Boxes, ArrowUpRight, Sparkles, RefreshCw } from 'lucide-react';
import { PRODUCTS } from '../data/products';
import { supabase } from '../lib/supabaseClient';
import { invalidateProductsCache, saveCachedProducts, getCachedProducts } from '../lib/productCache';
import AdminDashboardTab from './admin/AdminDashboardTab';
import AdminProductsTab from './admin/AdminProductsTab';
import AdminCustomizerTab from './admin/AdminCustomizerTab';
import AdminProfileTab from './admin/AdminProfileTab';
import AdminProductModal from './admin/AdminProductModal';
import AdminBulkModal from './admin/AdminBulkModal';

const isVideoUrl = (url) => url && (url.startsWith('data:video/') || url.match(/\.(mp4|mov|webm)($|\?)/i));

export const isAdminEmail = (email) => {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return lower.endsWith('@admin.com') || lower.endsWith('@superadmin.com') || lower.endsWith('@aura.com');
};

export const getAdminRole = (email) => {
  if (!email) return 'Admin';
  const lower = email.toLowerCase().trim();
  if (lower.endsWith('@superadmin.com')) return 'Super Admin';
  if (lower.endsWith('@admin.com')) return 'Admin';
  if (lower.includes('super')) return 'Super Admin';
  return 'Admin';
};

// Persistent Module-Level & SessionStorage Page Cache (survives re-renders and reloads)
const memoryPageCache = new Map();

const getPageFromCache = (key) => {
  if (memoryPageCache.has(key)) {
    return memoryPageCache.get(key);
  }
  try {
    const raw = sessionStorage.getItem(`aura_p_cache_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryPageCache.set(key, parsed);
      return parsed;
    }
  } catch (e) {
    // ignore
  }
  return null;
};

const setPageToCache = (key, data, count) => {
  const payload = { data, count, timestamp: Date.now() };
  memoryPageCache.set(key, payload);
  try {
    sessionStorage.setItem(`aura_p_cache_${key}`, JSON.stringify(payload));
  } catch (e) {
    // ignore
  }
};

const clearAllPageCache = () => {
  memoryPageCache.clear();
  try {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith('aura_p_cache_')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
  } catch (e) {
    // ignore
  }
};

const updateFeaturedInPageCache = (productId, isFeatured) => {
  memoryPageCache.forEach((val, key) => {
    if (Array.isArray(val.data)) {
      val.data = val.data.map(p => p.id === productId ? { ...p, isFeatured } : p);
      try {
        sessionStorage.setItem(`aura_p_cache_${key}`, JSON.stringify(val));
      } catch (e) { }
    }
  });
};

export default function AdminPortal({
  onClosePortal,
  heroConfig,
  onUpdateHeroConfig,
  onRefreshData
}) {
  const [session, setSession] = useState(null);
  const isAdmin = !!(session?.user?.email && isAdminEmail(session.user.email));
  const adminRole = getAdminRole(session?.user?.email);

  // Login credentials states
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard states
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'products' | 'customize' | 'profile'
  const [isPendingTab, startTabTransition] = useTransition();

  const handleTabChange = useCallback((tab) => {
    startTabTransition(() => {
      setActiveTab(tab);
    });
  }, []);
  const [dashboardStats, setDashboardStats] = useState({
    totalSales: 0,
    paidOrdersCount: 0,
    totalStock: 0,
    totalProducts: 0,
    lowStockCount: 0,
    lowStockItems: [],
    adminCount: 1,
    verifiedUserCount: 0,
    recentOrders: [],
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [productList, setProductList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'top' | 'bottom'

  // Server-Side Range Pagination States
  const isInitialFilterMount = useRef(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [totalProductsCount, setTotalProductsCount] = useState(0);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [featuredCount, setFeaturedCount] = useState(0);

  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Dynamic profile loaded from admin_profiles table
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profile, setProfile] = useState({
    name: 'Yzelle Lim',
    role_title: 'CEO',
    avatar_url: '',
    bio: 'Bespoke designer commanding elegance for the modern profile.',
    email: ''
  });

  // Profile edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({
    name: 'Yzelle Lim',
    role_title: 'CEO',
    avatar_url: '',
    bio: 'Bespoke designer commanding elegance for the modern profile.',
    email: ''
  });

  // Modals / Form states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'Suits & Coats',
    mainCategory: 'top',
    subType: '',
    price: '',
    qty: '',
    colorsRaw: '',
    sizes: 'XXS-XS, S-M, L, XL',
    image: '',
    sizeChart: '',
    descriptionLabel: 'Description',
    description: '',
    shopeeLink: '',
    rating: '',
    solds: '',
    statusBadge: ''
  });

  // Local customize states preloaded from heroConfig props
  const [localHeroConfig, setLocalHeroConfig] = useState(heroConfig);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [isUploadingAboutMedia, setIsUploadingAboutMedia] = useState(false);
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);
  const [isUploadingSizeChart, setIsUploadingSizeChart] = useState(false);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [notification, setNotification] = useState(null); // { type: 'success' | 'error' | 'warning', title: string, message: string }
  const [confirmDialog, setConfirmDialog] = useState(null); // { message: string, onConfirm: () => void }
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkSizeChart, setBulkSizeChart] = useState('');

  const triggerNotification = (type, title, message) => {
    setNotification({ type, title, message });
  };

  useEffect(() => {
    if (heroConfig) {
      setLocalHeroConfig(heroConfig);
    }
  }, [heroConfig]);

  // Generic Media Upload Handler with Base64 fallback
  const handleMediaUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/') || !!file.name.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp)$/i);
    const isVideo = file.type.startsWith('video/') ||
      file.type.toLowerCase().includes('quicktime') ||
      !!file.name.toLowerCase().match(/\.(mp4|webm|mov|ogg|qt|m4v|avi|mkv)$/i);

    if (!isImage && !isVideo) {
      triggerNotification('warning', 'Invalid File Format', 'Only images (PNG, JPG, JPEG) and videos (MP4, MOV, WEBM) are allowed.');
      return;
    }

    if (type === 'poster') {
      setIsUploadingPoster(true);
    } else {
      setIsUploadingAboutMedia(true);
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_media_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to bucket 'storefront'
      const { data, error: uploadError } = await supabase.storage
        .from('storefront')
        .upload(filePath, file, { cacheControl: '31536000', upsert: true });

      if (!uploadError && data) {
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('storefront')
          .getPublicUrl(filePath);

        if (type === 'poster') {
          setLocalHeroConfig(prev => ({
            ...prev,
            posterUrl: publicUrl
          }));
        } else {
          const isVideoFile = file.type.startsWith('video/') ||
            file.type.toLowerCase().includes('quicktime') ||
            !!file.name.toLowerCase().match(/\.(mp4|webm|mov|ogg|qt|m4v|avi|mkv)$/i);
          setLocalHeroConfig(prev => ({
            ...prev,
            aboutMediaUrl: publicUrl,
            aboutMediaType: isVideoFile ? 'video' : 'image'
          }));
        }
      } else {
        // Base64 Fallback
        console.warn('Storage upload failed, utilizing Base64 fallback:', uploadError?.message);
        const reader = new FileReader();
        reader.onload = (event) => {
          if (type === 'poster') {
            setLocalHeroConfig(prev => ({
              ...prev,
              posterUrl: event.target.result
            }));
          } else {
            const isVideoFile = file.type.startsWith('video/') ||
              file.type.toLowerCase().includes('quicktime') ||
              !!file.name.toLowerCase().match(/\.(mp4|webm|mov|ogg|qt|m4v|avi|mkv)$/i);
            setLocalHeroConfig(prev => ({
              ...prev,
              aboutMediaUrl: event.target.result,
              aboutMediaType: isVideoFile ? 'video' : 'image'
            }));
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      triggerNotification('error', 'Upload Failed', err.message);
    } finally {
      if (type === 'poster') {
        setIsUploadingPoster(false);
      } else {
        setIsUploadingAboutMedia(false);
      }
    }
  };

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/') || !!file.name.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp)$/i);
    if (!isImage) {
      triggerNotification('warning', 'Invalid File Format', 'Only image files (PNG, JPG, JPEG) are allowed.');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `profile_avatar_${session?.user?.id || 'admin'}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('storefront')
        .upload(filePath, file, { cacheControl: '31536000', upsert: true });

      if (!uploadError && data) {
        const { data: { publicUrl } } = supabase.storage
          .from('storefront')
          .getPublicUrl(filePath);

        setEditProfileForm(prev => ({
          ...prev,
          avatar_url: publicUrl
        }));
        triggerNotification('success', 'Upload Successful', 'Profile photo uploaded successfully.');
      } else {
        console.warn('Storage upload failed, utilizing Base64 fallback:', uploadError?.message);
        const reader = new FileReader();
        reader.onload = (event) => {
          setEditProfileForm(prev => ({
            ...prev,
            avatar_url: event.target.result
          }));
          triggerNotification('success', 'Upload Successful', 'Profile photo loaded as Base64.');
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      triggerNotification('error', 'Upload Failed', err.message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const validateImageDimensions = (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          isPortrait: img.naturalHeight > img.naturalWidth
        });
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };
    });
  };

  const handleProductImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/') || !!file.name.toLowerCase().match(/\.(mp4|mov|webm)$/i);
    const isImage = file.type.startsWith('image/') || !!file.name.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp)$/i);

    if (!isImage && !isVideo) {
      triggerNotification('warning', 'Invalid File Format', 'Only image and video files (PNG, JPG, JPEG, WEBP, MP4, MOV, WEBM) are allowed.');
      return;
    }

    setIsUploadingProductImage(true);
    try {
      if (isImage) {
        const dimensions = await validateImageDimensions(file);
        if (dimensions) {
          if (!dimensions.isPortrait) {
            triggerNotification(
              'error',
              'Invalid Image Orientation',
              `Aura collection layouts require portrait photos (height must be greater than width). Uploaded size: ${dimensions.width}x${dimensions.height}px.`
            );
            setIsUploadingProductImage(false);
            return;
          }
          if (dimensions.height < 600) {
            triggerNotification(
              'warning',
              'Low Resolution Warning',
              `We recommend portrait images with at least 600px height for optimal display. Uploaded size: ${dimensions.width}x${dimensions.height}px.`
            );
          }
        }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `product_${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('storefront')
        .upload(filePath, file, { cacheControl: '31536000', upsert: true });

      if (!uploadError && data) {
        const { data: { publicUrl } } = supabase.storage
          .from('storefront')
          .getPublicUrl(filePath);

        setNewProduct(prev => ({
          ...prev,
          image: publicUrl
        }));
      } else {
        console.warn('Storage upload failed, utilizing Base64 fallback:', uploadError?.message);
        const reader = new FileReader();
        reader.onload = (event) => {
          setNewProduct(prev => ({
            ...prev,
            image: event.target.result
          }));
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      triggerNotification('error', 'Upload Failed', err.message);
    } finally {
      setIsUploadingProductImage(false);
    }
  };

  const handleSizeChartUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/') || !!file.name.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp)$/i);
    if (!isImage) {
      triggerNotification('warning', 'Invalid File Format', 'Only image files (PNG, JPG, JPEG, WEBP) are allowed for size charts.');
      return;
    }

    setIsUploadingSizeChart(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `sizechart_${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('storefront')
        .upload(filePath, file, { cacheControl: '31536000', upsert: true });

      if (!uploadError && data) {
        const { data: { publicUrl } } = supabase.storage
          .from('storefront')
          .getPublicUrl(filePath);

        setNewProduct(prev => ({
          ...prev,
          sizeChart: publicUrl
        }));
      } else {
        console.warn('Storage upload failed, utilizing Base64 fallback:', uploadError?.message);
        const reader = new FileReader();
        reader.onload = (event) => {
          setNewProduct(prev => ({
            ...prev,
            sizeChart: event.target.result
          }));
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      triggerNotification('error', 'Upload Failed', err.message);
    } finally {
      setIsUploadingSizeChart(false);
    }
  };

  // Monitor Supabase session changes using a single listener
  useEffect(() => {
    let active = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Supabase Auth Event:', event);
      if (active) {
        setSession(session);
        setIsCheckingSession(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // 1. Fetch admin profile details
  const fetchAdminProfile = async () => {
    if (!session?.user) return;
    setIsLoadingProfile(true);
    try {
      const { data: profData, error: profErr } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profErr) throw profErr;
      if (profData) {
        const profObj = {
          name: profData.name || session.user.user_metadata?.full_name || 'Administrator',
          role_title: profData.role_title || (adminRole === 'Super Admin' ? 'Super Administrator' : 'Administrator'),
          avatar_url: profData.avatar_url || '',
          bio: profData.bio || 'Bespoke designer commanding elegance for the modern profile.',
          email: session.user.email
        };
        setProfile(profObj);
        setEditProfileForm(profObj);
      } else {
        const defaultProf = {
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Administrator',
          role_title: adminRole === 'Super Admin' ? 'Super Administrator' : 'Administrator',
          avatar_url: '',
          bio: 'Bespoke designer commanding elegance for the modern profile.',
          email: session.user.email
        };
        setProfile(defaultProf);
        setEditProfileForm(defaultProf);
      }
    } catch (err) {
      console.warn('Admin profile fetch notice:', err.message);
      const defaultProf = {
        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Administrator',
        role_title: adminRole === 'Super Admin' ? 'Super Administrator' : 'Administrator',
        avatar_url: '',
        bio: 'Bespoke designer commanding elegance for the modern profile.',
        email: session.user.email
      };
      setProfile(defaultProf);
      setEditProfileForm(defaultProf);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // 0. Fetch high-level analytics & metrics for the Main Dashboard
  const fetchDashboardStats = async () => {
    if (!session?.user) return;
    setIsLoadingStats(true);
    try {
      // 1. Fetch all products for stock calculations, low stock alerts, and pagination pre-warming
      const { data: prodsData, error: prodsErr } = await supabase
        .from('products')
        .select('*')
        .order('createdAt', { ascending: false });

      let totalStock = 0;
      let lowStockItems = [];
      let totalProducts = 0;

      if (!prodsErr && prodsData) {
        totalProducts = prodsData.length;
        totalStock = prodsData.reduce((acc, p) => acc + (Number(p.qty) || 0), 0);
        lowStockItems = [...prodsData].filter(p => (Number(p.qty) || 0) <= 10).sort((a, b) => (Number(a.qty) || 0) - (Number(b.qty) || 0));

        // Synchronize featured count directly from catalog
        const fCount = prodsData.filter(p => p.isFeatured).length;
        setFeaturedCount(fCount);

        // Pre-warm all page cache entries so pagination is 100% instantaneous
        saveCachedProducts(prodsData);
        const totalP = Math.ceil(totalProducts / pageSize);
        for (let p = 1; p <= totalP; p++) {
          const pKey = `p_${p}_s__c_all`;
          const pSlice = prodsData.slice((p - 1) * pageSize, p * pageSize);
          setPageToCache(pKey, pSlice, totalProducts);
        }
      }

      // 2. Fetch orders for total sales revenue & recent activity
      let totalSales = 0;
      let paidOrdersCount = 0;
      let recentOrders = [];
      try {
        const { data: ordersData, error: ordersErr } = await supabase
          .from('orders')
          .select('id, order_reference, customer_name, customer_email, total_amount, payment_status, status, created_at, items')
          .order('created_at', { ascending: false });

        if (!ordersErr && ordersData) {
          recentOrders = ordersData.slice(0, 6);
          ordersData.forEach(o => {
            const isPaid = (o.payment_status || '').toUpperCase() === 'PAID' ||
              (o.status || '').toUpperCase() === 'COMPLETED' ||
              (o.status || '').toUpperCase() === 'DELIVERED';
            if (isPaid) {
              totalSales += Number(o.total_amount) || 0;
              paidOrdersCount += 1;
            }
          });
        }
      } catch (ordErr) {
        console.warn('Orders fetch note:', ordErr.message);
      }

      // 3. Count active administrators
      let adminCount = 1;
      try {
        const { data: adminData } = await supabase
          .from('admin_profiles')
          .select('id, email');

        const adminSet = new Set((adminData || []).map(a => a.id || a.email).filter(Boolean));
        if (session?.user?.id) adminSet.add(session.user.id);
        if (session?.user?.email) adminSet.add(session.user.email);
        adminCount = Math.max(1, adminSet.size);
      } catch (admErr) {
        console.warn('Admin count note:', admErr.message);
      }

      // 4. Count verified customer users (excluding admin accounts)
      let verifiedUserCount = 0;
      try {
        const { data: userData, error: userErr } = await supabase
          .from('user_profiles')
          .select('id, email, role');

        if (!userErr && userData) {
          const verifiedUsers = userData.filter(u => {
            if (!u.email) return false;
            if (isAdminEmail(u.email)) return false;
            return true;
          });
          verifiedUserCount = verifiedUsers.length;
        }
      } catch (uErr) {
        console.warn('User profiles note:', uErr.message);
      }

      setDashboardStats({
        totalSales,
        paidOrdersCount,
        totalStock,
        totalProducts,
        lowStockCount: lowStockItems.length,
        lowStockItems,
        adminCount,
        verifiedUserCount,
        recentOrders,
      });
    } catch (err) {
      console.warn('Dashboard stats fetch failed:', err.message);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // 2. Fetch products using Server-Side Range Pagination with Persistent Page Caching
  const fetchProductsPage = async (page = 1, search = searchQuery, category = categoryFilter, forceRefresh = false) => {
    if (!session?.user) return;

    const normalizedSearch = (search || '').trim().toLowerCase();
    const normalizedCat = category || 'all';
    const cacheKey = `p_${page}_s_${normalizedSearch}_c_${normalizedCat}`;

    // 1. Instant zero-delay return if already cached in memory or sessionStorage
    if (!forceRefresh) {
      const cached = getPageFromCache(cacheKey);
      if (cached) {
        setProductList(cached.data);
        setTotalProductsCount(cached.count);
        setIsLoadingProducts(false);
        return;
      }

      // Check fallback from full catalog cache if query is default
      if (!normalizedSearch && normalizedCat === 'all') {
        const allCached = getCachedProducts();
        if (allCached && allCached.length > 0) {
          const from = (page - 1) * pageSize;
          const to = from + pageSize;
          const pageItems = allCached.slice(from, to);
          if (pageItems.length > 0 || from === 0) {
            setPageToCache(cacheKey, pageItems, allCached.length);
            setProductList(pageItems);
            setTotalProductsCount(allCached.length);
            setIsLoadingProducts(false);
            return;
          }
        }
      }
    }

    setIsLoadingProducts(true);
    try {
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' });

      if (normalizedSearch) {
        query = query.or(`name.ilike.%${normalizedSearch}%,subType.ilike.%${normalizedSearch}%`);
      }
      if (normalizedCat !== 'all') {
        query = query.eq('mainCategory', normalizedCat);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await query
        .order('createdAt', { ascending: false })
        .range(from, to);

      if (error) throw error;
      const items = data || [];
      const total = count || 0;

      // Cache this page's result persistently
      setPageToCache(cacheKey, items, total);

      setProductList(items);
      setTotalProductsCount(total);

      // Prefetch adjacent next page silently in background
      const nextPage = page + 1;
      const maxPages = Math.ceil(total / pageSize);
      if (nextPage <= maxPages) {
        const nextCacheKey = `p_${nextPage}_s_${normalizedSearch}_c_${normalizedCat}`;
        if (!getPageFromCache(nextCacheKey)) {
          const nextFrom = (nextPage - 1) * pageSize;
          const nextTo = nextFrom + pageSize - 1;
          let nextQuery = supabase.from('products').select('*', { count: 'exact' });
          if (normalizedSearch) {
            nextQuery = nextQuery.or(`name.ilike.%${normalizedSearch}%,subType.ilike.%${normalizedSearch}%`);
          }
          if (normalizedCat !== 'all') {
            nextQuery = nextQuery.eq('mainCategory', normalizedCat);
          }
          nextQuery.order('createdAt', { ascending: false }).range(nextFrom, nextTo).then(({ data: nextData }) => {
            if (nextData) {
              setPageToCache(nextCacheKey, nextData, total);
            }
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Supabase paginated fetch failed:', err.message);
      setProductList([]);
      setTotalProductsCount(0);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const adminInitializedForUser = useRef(null);
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;
  const categoryFilterRef = useRef(categoryFilter);
  categoryFilterRef.current = categoryFilter;

  // Initial load when session is active and user has admin authorization
  useEffect(() => {
    if (session?.user?.id && isAdmin) {
      // Prevent refetching/resetting to page 1 when browser tab re-focuses or token refreshes for the same user
      if (adminInitializedForUser.current === session.user.id) {
        return;
      }
      adminInitializedForUser.current = session.user.id;

      fetchAdminProfile();
      fetchDashboardStats();
      fetchProductsPage(currentPageRef.current || 1, searchQueryRef.current || '', categoryFilterRef.current || 'all');
    } else if (!session) {
      adminInitializedForUser.current = null;
    }
  }, [session?.user?.id, isAdmin]);

  // Handle Search and Filter changes with debouncing (resets to page 1, skips first mount)
  useEffect(() => {
    if (isInitialFilterMount.current) {
      isInitialFilterMount.current = false;
      return;
    }
    if (session && isAdmin) {
      setCurrentPage(1);
      const timer = setTimeout(() => {
        fetchProductsPage(1, searchQuery, categoryFilter);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, categoryFilter]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError(null);

    if (!isAdminEmail(authEmail)) {
      setAuthError('Access Denied: You do not have permission to access the Atelier administrator dashboard.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) throw error;
      if (data?.user && !isAdminEmail(data.user.email)) {
        await supabase.auth.signOut();
        throw new Error('Access Denied: Account does not have administrator privileges.');
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setAuthEmail('');
    setAuthPassword('');
  };

  // Filter products based on search & category
  const filteredProducts = productList.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.subType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.mainCategory === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getHexForColorName = (name) => {
    const n = name.toLowerCase();
    if (n.includes('pink')) return '#F3C5C5';
    if (n.includes('rose')) return '#D99B91';
    if (n.includes('beige')) return '#E6D7CD';
    if (n.includes('espresso')) return '#362420';
    if (n.includes('gray') || n.includes('grey')) return '#6B7280';
    if (n.includes('white')) return '#FFFFFF';
    if (n.includes('black')) return '#111827';
    if (n.includes('cream')) return '#F9F6F0';
    if (n.includes('gold')) return '#E5D3B3';
    if (n.includes('taupe')) return '#D99B91';
    if (n.includes('sandstone')) return '#DED3C9';
    if (n.includes('ivory')) return '#FAF5F2';
    if (n.includes('mocha')) return '#A8928B';
    return '#E6D7CD'; // default nude tone
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const colorsList = newProduct.colorsRaw.split(',')
      .map(c => c.trim())
      .filter(Boolean)
      .map(c => ({
        name: c,
        hex: getHexForColorName(c)
      }));

    const productObj = {
      name: newProduct.name,
      subtitle: 'Atelier Runway Collection',
      category: newProduct.mainCategory === 'top' ? 'Suits & Coats' : 'Tailored Pants',
      mainCategory: newProduct.mainCategory,
      subType: newProduct.subType,
      price: Number(newProduct.price) || 0,
      qty: Number(newProduct.qty) || 0,
      colors: colorsList,
      sizes: newProduct.sizes,
      image: newProduct.image,
      hoverImage: newProduct.hoverImage || newProduct.image, // fall back to light-mode if empty
      sizeChart: newProduct.sizeChart || null,
      descriptionLabel: newProduct.descriptionLabel || 'Description',
      description: newProduct.description,
      shopeeLink: newProduct.shopeeLink || 'https://shopee.ph',
      rating: Number(newProduct.rating) || 5.0,
      solds: Number(newProduct.solds) || 0,
      statusBadge: newProduct.statusBadge || null
    };

    try {
      if (editingProductId) {
        // Edit mode (Update)
        const { error } = await supabase
          .from('products')
          .update(productObj)
          .eq('id', editingProductId);

        if (error) throw error;

        const existingProd = productList.find(p => p.id === editingProductId) || {};
        const updatedObj = {
          ...productObj,
          id: editingProductId,
          reviewsCount: existingProd.reviewsCount || 15,
          isNew: existingProd.isNew ?? true,
          isFeatured: existingProd.isFeatured ?? false
        };
        setProductList(productList.map(p => p.id === editingProductId ? updatedObj : p));
        triggerNotification('success', 'Garment Updated', 'Product updated successfully!');
      } else {
        // Create mode (Insert)
        const randomId = `aura-custom-${Date.now()}`;
        const newProductObj = {
          ...productObj,
          id: randomId,
          reviewsCount: Math.floor(Math.random() * 50) + 10,
          isNew: true
        };

        const { error } = await supabase.from('products').insert([newProductObj]);
        if (error) throw error;

        setProductList([newProductObj, ...productList]);
        triggerNotification('success', 'Garment Created', 'Product uploaded successfully!');
      }

      setIsAddModalOpen(false);

      // Invalidate persistent page cache and force-refresh paginated catalog
      clearAllPageCache();
      invalidateProductsCache();
      await fetchProductsPage(currentPage, searchQuery, categoryFilter, true);
      fetchDashboardStats();
      if (onRefreshData) onRefreshData();

      // Reset Form
      setNewProduct({
        name: '',
        category: 'Suits & Coats',
        mainCategory: 'top',
        subType: '',
        price: '',
        qty: '',
        colorsRaw: '',
        sizes: 'XXS-XS, S-M, L, XL',
        image: '',
        sizeChart: '',
        descriptionLabel: 'Description',
        description: '',
        shopeeLink: '',
        rating: '',
        solds: '',
        statusBadge: ''
      });
      setEditingProductId(null);
    } catch (err) {
      triggerNotification('error', 'Database Write Failed', `Check your Supabase settings. Details: ${err.message}`);
    }
  };

  // Pagination navigation handler
  const totalPages = Math.max(1, Math.ceil(totalProductsCount / pageSize));

  const handlePageChange = useCallback((newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    startTabTransition(() => {
      setCurrentPage(newPage);
      fetchProductsPage(newPage, searchQuery, categoryFilter);
    });
    const tableContainer = document.getElementById('admin-products-table-container');
    if (tableContainer) {
      const rect = tableContainer.getBoundingClientRect();
      if (rect.top < 0) {
        tableContainer.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }
  }, [totalPages, currentPage, searchQuery, categoryFilter]);

  const handleSearchChange = useCallback((val) => {
    setSearchQuery(val);
  }, []);

  const handleCategoryChange = useCallback((cat) => {
    startTabTransition(() => {
      setCategoryFilter(cat);
    });
  }, []);

  const handleOpenAddProduct = useCallback(() => {
    setEditingProductId(null);
    setNewProduct({
      name: '',
      category: 'Suits & Coats',
      mainCategory: 'top',
      subType: '',
      price: '',
      qty: '',
      colorsRaw: '',
      sizes: 'XXS-XS, S-M, L, XL',
      image: '',
      sizeChart: '',
      descriptionLabel: 'Description',
      description: '',
      shopeeLink: '',
      rating: '5.0',
      solds: '0',
      statusBadge: ''
    });
    setIsAddModalOpen(true);
  }, []);

  const handleEditProductClick = (product) => {
    setEditingProductId(product.id);
    setNewProduct({
      name: product.name,
      category: product.category || 'Suits & Coats',
      mainCategory: product.mainCategory || 'top',
      subType: product.subType || '',
      price: product.price || '',
      qty: product.qty || 0,
      colorsRaw: (product.colors || []).map(c => c.name).join(', '),
      sizes: product.sizes || '',
      image: product.image || '',
      sizeChart: product.sizeChart || '',
      descriptionLabel: product.descriptionLabel || 'Description',
      description: product.description || '',
      shopeeLink: product.shopeeLink || '',
      rating: product.rating || '4.9',
      solds: product.solds || '0',
      statusBadge: product.statusBadge || ''
    });
    setIsAddModalOpen(true);
  };

  const handleDeleteProduct = async (id) => {
    setConfirmDialog({
      message: 'Are you sure you want to remove this garment from inventory?',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('products').delete().eq('id', id);
          if (error) throw error;

          // Remove from selection if deleted
          setSelectedProductIds(prev => prev.filter(item => item !== id));
          clearAllPageCache();
          invalidateProductsCache();
          await fetchProductsPage(currentPage, searchQuery, categoryFilter, true);
          fetchDashboardStats();
          if (onRefreshData) onRefreshData();
          triggerNotification('success', 'Product Deleted', 'The garment has been removed from inventory successfully.');
        } catch (err) {
          triggerNotification('error', 'Delete Failed', err.message);
        }
      }
    });
  };

  const handleToggleSelectProduct = (id) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = (filteredList) => {
    const filteredIds = filteredList.map(p => p.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedProductIds.includes(id));

    if (allSelected) {
      setSelectedProductIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedProductIds(prev => {
        const union = new Set([...prev, ...filteredIds]);
        return Array.from(union);
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedProductIds.length === 0) return;

    setConfirmDialog({
      message: `Are you sure you want to remove the ${selectedProductIds.length} selected garments from inventory?`,
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('products')
            .delete()
            .in('id', selectedProductIds);

          if (error) throw error;

          setSelectedProductIds([]);
          clearAllPageCache();
          invalidateProductsCache();
          await fetchProductsPage(currentPage, searchQuery, categoryFilter, true);
          fetchDashboardStats();
          if (onRefreshData) onRefreshData();
          triggerNotification('success', 'Products Deleted', 'The selected garments have been removed from inventory successfully.');
        } catch (err) {
          triggerNotification('error', 'Delete Failed', err.message);
        }
      }
    });
  };

  const handleBulkSizeChartUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/') || !!file.name.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp)$/i);
    if (!isImage) {
      triggerNotification('warning', 'Invalid File Format', 'Only image files (PNG, JPG, JPEG, WEBP) are allowed for size charts.');
      return;
    }

    setIsUploadingSizeChart(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `sizechart_${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('storefront')
        .upload(filePath, file, { cacheControl: '31536000', upsert: true });

      if (!uploadError && data) {
        const { data: { publicUrl } } = supabase.storage
          .from('storefront')
          .getPublicUrl(filePath);

        setBulkSizeChart(publicUrl);
      } else {
        console.warn('Storage upload failed, utilizing Base64 fallback:', uploadError?.message);
        const reader = new FileReader();
        reader.onload = (event) => {
          setBulkSizeChart(event.target.result);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      triggerNotification('error', 'Upload Failed', err.message);
    } finally {
      setIsUploadingSizeChart(false);
    }
  };

  const handleBulkUpdate = async (e) => {
    e.preventDefault();
    if (selectedProductIds.length === 0) return;

    if (!bulkSizeChart) {
      triggerNotification('warning', 'No Image Selected', 'Please upload a size chart image to bulk update.');
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({ sizeChart: bulkSizeChart })
        .in('id', selectedProductIds);

      if (error) throw error;

      // Update local state and purge page cache
      clearAllPageCache();
      setProductList(prevList =>
        prevList.map(p =>
          selectedProductIds.includes(p.id) ? { ...p, sizeChart: bulkSizeChart } : p
        )
      );
      setSelectedProductIds([]);
      setBulkSizeChart('');
      setIsBulkModalOpen(false);
      if (onRefreshData) onRefreshData();
      triggerNotification('success', 'Bulk Update Success', `Successfully updated the size chart for ${selectedProductIds.length} selected garments.`);
    } catch (err) {
      triggerNotification('error', 'Bulk Update Failed', err.message);
    }
  };

  const handleApplyCustomizations = async () => {
    if (isSavingTheme || isUploadingPoster || isUploadingAboutMedia) return;
    setIsSavingTheme(true);
    try {
      const { error } = await supabase
        .from('storefront_config')
        .update({
          posterUrl: localHeroConfig.posterUrl,
          title: localHeroConfig.title,
          about_media_url: localHeroConfig.aboutMediaUrl,
          about_media_type: localHeroConfig.aboutMediaType,
          about_title: localHeroConfig.aboutTitle,
          about_subtitle: localHeroConfig.aboutSubtitle,
          about_description: localHeroConfig.aboutDescription
        })
        .eq('id', localHeroConfig.id || 'd18d4dc0-5bfa-4c48-b4b9-1234567890ab');

      if (error) throw error;

      onUpdateHeroConfig(localHeroConfig);
      invalidateProductsCache();
      if (onRefreshData) onRefreshData();
      triggerNotification('success', 'Theme Saved', 'Theme configurations applied to frontpage successfully!');
    } catch (err) {
      triggerNotification('error', 'Save Failed', err.message);
    } finally {
      setIsSavingTheme(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!session?.user) return;
    try {
      const { error } = await supabase
        .from('admin_profiles')
        .upsert({
          id: session.user.id,
          name: editProfileForm.name,
          role_title: editProfileForm.role_title,
          avatar_url: editProfileForm.avatar_url,
          bio: editProfileForm.bio,
          email: session.user.email,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setProfile(editProfileForm);
      setIsEditingProfile(false);
      triggerNotification('success', 'Profile Updated', 'Atelier Profile updated successfully!');
    } catch (err) {
      triggerNotification('error', 'Update Failed', err.message);
    }
  };

  const handleToggleFeatured = async (id, isChecked) => {
    if (isChecked && featuredCount >= 6) {
      triggerNotification('warning', 'Limit Reached', 'You can only select up to 6 featured items for the homepage collection.');
      return;
    }
    try {
      const { error } = await supabase
        .from('products')
        .update({ isFeatured: isChecked })
        .eq('id', id);

      if (error) throw error;

      setProductList(prevList => prevList.map(p => p.id === id ? { ...p, isFeatured: isChecked } : p));
      setFeaturedCount(prev => isChecked ? prev + 1 : Math.max(0, prev - 1));

      // Keep persistent cached pages in sync with featured state
      updateFeaturedInPageCache(id, isChecked);
      invalidateProductsCache();
      triggerNotification(
        'success',
        isChecked ? 'Garment Featured' : 'Garment Unfeatured',
        isChecked ? 'Garment successfully added to home collection.' : 'Garment successfully removed from home collection.'
      );
      if (onRefreshData) onRefreshData();
    } catch (err) {
      triggerNotification('error', 'Update Failed', err.message);
    }
  };

  // 0. RENDER CONNECTING SCREEN WHILE INITIALIZING SESSION
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#FAF0EC] flex items-center justify-center p-6 select-none font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-transparent border-[#B86B60] rounded-full animate-spin" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-[#705B56]">Connecting to Atelier...</span>
        </div>
      </div>
    );
  }

  // 1. RENDER ACCESS DENIED IF LOGGED IN WITH NON-ADMIN / CUSTOMER ACCOUNT
  if (session && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#FAF0EC] flex items-center justify-center p-6 select-none font-sans">
        <div className="w-full max-w-md bg-white border border-rose-200 shadow-xl p-8 rounded-none text-center">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 mx-auto mb-4 flex items-center justify-center border border-rose-200">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-rose-700 block mb-1">
            ACCESS RESTRICTED
          </span>
          <h2 className="font-brand text-2xl text-[#2C1E1B] mb-2">Administrator Access Only</h2>
          <p className="text-xs text-[#705B56] mb-4 leading-relaxed">
            This dashboard is strictly reserved for authorized Atelier administrators. Your current account does not have administrative privileges.
          </p>
          <div className="bg-[#FAF5F2] border border-[#E8DCD7] p-3 text-xs text-[#2C1E1B] mb-6 font-mono break-all">
            Logged in as: {session.user?.email} (Customer)
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-3.5 bg-[#2C1E1B] hover:bg-rose-950 text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
          >
            Sign Out & Switch to Admin
          </button>
        </div>
      </div>
    );
  }

  // 2. RENDER SECURE LOGIN SCREEN IF NOT AUTHENTICATED
  if (!session) {
    return (
      <div className="min-h-screen bg-[#FAF0EC] flex items-center justify-center p-6 select-none font-sans">
        <div className="w-full max-w-md bg-white border border-[#E8DCD7] shadow-xl p-8 rounded-none flex flex-col justify-between">
          <div>
            <div className="text-center mb-8">
              <span className="font-brand text-4xl text-[#2C1E1B] tracking-widest block mb-2">AURA</span>
              <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-[#B86B60]">Atelier Secure Login</span>
              <p className="text-[10px] text-[#A38E88] mt-1">Authorized Personnel Only</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-none tracking-wide text-center">
                  {authError}
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#705B56] mb-2">
                  Administrator Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@aura.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-none bg-white border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] transition-colors placeholder-[#A8928B]/60"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#705B56] mb-2">
                  Atelier Security Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-none bg-white border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] transition-colors placeholder-[#A8928B]/60"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-4 rounded-none bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-[11px] font-semibold uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {isLoggingIn ? 'Verifying Credentials...' : 'Access Portal'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // 2. RENDER WORKSPACE ONCE LOGGED IN
  return (
    <div className="min-h-screen bg-[#FAF0EC] text-[#2C1E1B] flex flex-col md:flex-row select-none rounded-none">

      {/* Mobile Top Header */}
      <header className="md:hidden w-full bg-[#ccc2c3] p-4 flex items-center justify-between border-b border-white/10 z-20 shadow-md flex-shrink-0">
        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          className="p-2 -ml-2 text-white hover:text-white/80 focus:outline-none"
          aria-label="Open sidebar drawer"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xl font-brand tracking-widest text-[#2C1E1B]">Aura</span>
          <span className="text-[8px] tracking-[0.18em] uppercase font-sans text-[#2C1E1B] bg-white/50 px-1.5 py-0.5 rounded-none font-semibold">{adminRole}</span>
        </div>

        <div className="w-9" /> {/* Visual spacer */}
      </header>

      {/* Mobile Off-Canvas Drawer */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMobileDrawerOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
            />

            {/* Drawer Container */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="md:hidden fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#ccc2c3] p-6 flex flex-col justify-between shadow-2xl border-r border-white/5 overflow-y-auto"
            >
              <div className="space-y-8">
                {/* Header with Close */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-brand tracking-widest text-[#2C1E1B]">Aura</span>
                    <span className="text-[8px] tracking-[0.18em] uppercase font-sans text-[#2C1E1B] bg-white/50 px-1.5 py-0.5 rounded-none font-semibold">Atelier</span>
                  </div>
                  <button
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="p-1.5 text-white hover:text-white/80 focus:outline-none"
                    aria-label="Close drawer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Profile Card Summary */}
                {!isLoadingProfile && (
                  <div className="flex items-center gap-4 bg-white p-4 rounded-none border border-white/10 w-full">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.name}
                        className="w-10 h-10 object-cover rounded-none border border-[#D99B91]/40 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-[#FAF0EC] flex items-center justify-center border border-[#E8DCD7] rounded-none flex-shrink-0">
                        <User className="w-4 h-4 text-[#ccc2c3]" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-editorial text-base text-[#2C1E1B] font-normal leading-tight">{profile.name}</h4>
                      <p className="text-[9px] uppercase tracking-wider text-[#2C1E1B] font-semibold mt-0.5">{profile.role_title}</p>
                    </div>
                  </div>
                )}

                {/* Navigation Menu */}
                <nav className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      handleTabChange('dashboard');
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider text-left flex items-center gap-3 transition-all rounded-none ${activeTab === 'dashboard'
                      ? 'bg-white text-[#2C1E1B] font-bold'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </button>

                  <button
                    onClick={() => {
                      handleTabChange('products');
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider text-left flex items-center gap-3 transition-all rounded-none ${activeTab === 'products'
                      ? 'bg-white text-[#2C1E1B] font-bold'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Products Table</span>
                  </button>

                  <button
                    onClick={() => {
                      handleTabChange('customize');
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider text-left flex items-center gap-3 transition-all rounded-none ${activeTab === 'customize'
                      ? 'bg-white text-[#2C1E1B] font-bold'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                  >
                    <Sliders className="w-4 h-4" />
                    <span>Store Customizer</span>
                  </button>

                  <button
                    onClick={() => {
                      handleTabChange('profile');
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider text-left flex items-center gap-3 transition-all rounded-none ${activeTab === 'profile'
                      ? 'bg-white text-[#2C1E1B] font-bold'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                  >
                    <User className="w-4 h-4" />
                    <span>Owner Profile</span>
                  </button>
                </nav>
              </div>

              {/* Bottom Actions */}
              <div className="pt-6 border-t border-white/10 flex flex-col gap-2 w-full mt-8">
                <button
                  onClick={handleLogout}
                  className="py-3.5 w-full bg-white text-[#2C1E1B] rounded-none text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 border cursor-pointer hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Stationary Sidebar */}
      <aside className="hidden md:flex md:w-80 bg-[#ccc2c3] text-white flex-col justify-between p-6 rounded-none z-10 border-r border-white/5 h-screen sticky top-0 flex-shrink-0">
        <div className="space-y-8">
          {/* Logo Identity */}
          <div className="flex items-center gap-2.5 pb-6 border-b border-white/10">
            <span className="text-2xl font-brand tracking-widest text-[#2C1E1B]">Aura</span>
            <span className="text-[9px] tracking-[0.18em] uppercase font-sans text-[#2C1E1B] bg-white/50 px-2 py-0.5 rounded-none font-semibold">{adminRole}</span>
          </div>

          {/* Profile Card Summary */}
          {isLoadingProfile ? (
            <div className="flex items-center gap-4 bg-white/60 p-4 rounded-none border border-white/10 w-full animate-pulse">
              <div className="w-12 h-12 bg-[#2C1E1B]/10 skeleton-shimmer flex-shrink-0" />
              <div className="space-y-2 flex-grow">
                <div className="h-4 bg-[#2C1E1B]/10 skeleton-shimmer w-3/4" />
                <div className="h-3 bg-[#2C1E1B]/10 skeleton-shimmer w-1/2" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 bg-white p-4 rounded-none border border-white/10 w-full">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name}
                  className="w-12 h-12 object-cover rounded-none border border-[#D99B91]/40 flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 bg-[#FAF0EC] flex items-center justify-center border border-[#E8DCD7] rounded-none flex-shrink-0">
                  <User className="w-5 h-5 text-[#ccc2c3]" />
                </div>
              )}
              <div>
                <h4 className="font-editorial text-lg text-[#2C1E1B] font-normal leading-tight">{profile.name}</h4>
                <p className="text-[10px] uppercase tracking-wider text-[#2C1E1B] font-semibold mt-0.5">{profile.role_title}</p>
              </div>
            </div>
          )}

          {/* Navigation Menu */}
          <nav className="flex flex-col gap-2">
            <button
              onClick={() => handleTabChange('dashboard')}
              className={`py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-left flex items-center gap-3 transition-all rounded-none ${activeTab === 'dashboard'
                ? 'bg-white text-[#2C1E1B] font-bold'
                : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              title="Dashboard Overview"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => handleTabChange('products')}
              className={`py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-left flex items-center gap-3 transition-all rounded-none ${activeTab === 'products'
                ? 'bg-white text-[#2C1E1B] font-bold'
                : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              title="Products Table"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Products Table</span>
            </button>

            <button
              onClick={() => handleTabChange('customize')}
              className={`py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-left flex items-center gap-3 transition-all rounded-none ${activeTab === 'customize'
                ? 'bg-white text-[#2C1E1B] font-bold'
                : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              title="Store Customizer"
            >
              <Sliders className="w-4 h-4" />
              <span>Store Customizer</span>
            </button>

            <button
              onClick={() => handleTabChange('profile')}
              className={`py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-left flex items-center gap-3 transition-all rounded-none ${activeTab === 'profile'
                ? 'bg-white text-[#2C1E1B] font-bold'
                : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              title="Owner Profile"
            >
              <User className="w-4 h-4" />
              <span>Owner Profile</span>
            </button>
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="pt-6 border-t border-white/10 flex flex-col gap-2 w-full">
          <button
            onClick={handleLogout}
            className="py-3.5 w-full bg-white text-[#2C1E1B] rounded-none text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 border cursor-pointer hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="flex-1 p-6 sm:p-12 overflow-y-auto max-h-screen overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>

        {/* TAB CONTENTS */}
        {activeTab === 'dashboard' && (
          <AdminDashboardTab
            dashboardStats={dashboardStats}
            isLoadingStats={isLoadingStats}
            onRefresh={fetchDashboardStats}
            onAddProduct={handleOpenAddProduct}
            onNavigateTab={handleTabChange}
            onEditProduct={handleEditProductClick}
          />
        )}

        {activeTab === 'products' && (
          <AdminProductsTab
            productList={productList}
            totalProductsCount={totalProductsCount}
            currentPage={currentPage}
            pageSize={pageSize}
            totalPages={totalPages}
            searchQuery={searchQuery}
            categoryFilter={categoryFilter}
            featuredCount={featuredCount}
            selectedProductIds={selectedProductIds}
            isLoadingProducts={isLoadingProducts}
            onSearchChange={handleSearchChange}
            onCategoryChange={handleCategoryChange}
            onAddProduct={handleOpenAddProduct}
            onEditProduct={handleEditProductClick}
            onDeleteProduct={handleDeleteProduct}
            onToggleFeatured={handleToggleFeatured}
            onSelectAllFiltered={handleSelectAllFiltered}
            onToggleSelectProduct={handleToggleSelectProduct}
            onOpenBulkModal={() => {
              setBulkSizeChart('');
              setIsBulkModalOpen(true);
            }}
            onDeleteSelected={handleDeleteSelected}
            onPageChange={handlePageChange}
          />
        )}

        {activeTab === 'customize' && (
          <AdminCustomizerTab
            localHeroConfig={localHeroConfig}
            setLocalHeroConfig={setLocalHeroConfig}
            isUploadingPoster={isUploadingPoster}
            isUploadingAboutMedia={isUploadingAboutMedia}
            isSavingTheme={isSavingTheme}
            onMediaUpload={handleMediaUpload}
            onApplyCustomizations={handleApplyCustomizations}
          />
        )}

        {activeTab === 'profile' && (
          <AdminProfileTab
            profile={profile}
            editProfileForm={editProfileForm}
            setEditProfileForm={setEditProfileForm}
            isEditingProfile={isEditingProfile}
            setIsEditingProfile={setIsEditingProfile}
            isLoadingProfile={isLoadingProfile}
            isUploadingAvatar={isUploadingAvatar}
            adminRole={adminRole}
            userEmail={session?.user?.email}
            onAvatarUpload={handleAvatarUpload}
            onUpdateProfile={handleUpdateProfile}
          />
        )}
      </main>

      {/* MODALS */}
      <AdminProductModal
        isOpen={isAddModalOpen}
        editingProductId={editingProductId}
        newProduct={newProduct}
        setNewProduct={setNewProduct}
        isUploadingProductImage={isUploadingProductImage}
        onProductImageUpload={handleProductImageUpload}
        onSaveProduct={handleSaveProduct}
        onClose={() => setIsAddModalOpen(false)}
      />

      <AdminBulkModal
        isOpen={isBulkModalOpen}
        selectedCount={selectedProductIds.length}
        bulkSizeChart={bulkSizeChart}
        setBulkSizeChart={setBulkSizeChart}
        isUploadingSizeChart={isUploadingSizeChart}
        onBulkSizeChartUpload={handleBulkSizeChartUpload}
        onBulkUpdate={handleBulkUpdate}
        onClose={() => {
          setBulkSizeChart('');
          setIsBulkModalOpen(false);
        }}
      />

      {/* Custom Confirmation Dialog */}
      <AnimatePresence>
        {confirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="w-full max-w-sm bg-[#FAF5F2] border border-[#E8DCD7] shadow-2xl p-6 text-center rounded-none relative"
            >
              <div className="mx-auto w-12 h-12 rounded-none bg-rose-100 flex items-center justify-center text-rose-600 mb-4">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-editorial text-lg text-[#2C1E1B] mb-2 font-normal">
                Confirm Removal
              </h3>
              <p className="text-xs text-[#705B56] leading-relaxed mb-6 font-sans">
                {confirmDialog.message}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="w-1/2 py-3 bg-white hover:bg-gray-50 text-[#705B56] border border-[#E8DCD7] text-xs font-semibold uppercase tracking-wider rounded-none transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className="w-1/2 py-3 bg-[#2C1E1B] hover:bg-rose-700 text-white text-xs font-semibold uppercase tracking-wider rounded-none transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Notification Modal */}
      <AnimatePresence>
        {notification && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="w-full max-w-sm bg-[#FAF5F2] border border-[#E8DCD7] shadow-2xl p-6 text-center rounded-none relative"
            >
              <div className="mx-auto w-12 h-12 rounded-none flex items-center justify-center mb-4">
                {notification.type === 'success' ? (
                  <div className="w-12 h-12 bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Check className="w-5 h-5" />
                  </div>
                ) : notification.type === 'warning' ? (
                  <div className="w-12 h-12 bg-amber-100 flex items-center justify-center text-amber-600">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-rose-100 flex items-center justify-center text-rose-600">
                    <XCircle className="w-5 h-5" />
                  </div>
                )}
              </div>
              <h3 className="font-editorial text-lg text-[#2C1E1B] mb-2 font-normal">
                {notification.title}
              </h3>
              <p className="text-xs text-[#705B56] leading-relaxed mb-6 font-sans">
                {notification.message}
              </p>
              <button
                type="button"
                onClick={() => setNotification(null)}
                className="w-full py-3 bg-[#2C1E1B] hover:bg-[#ccc2c3] text-white hover:text-[#2C1E1B] text-xs font-semibold uppercase tracking-wider rounded-none transition-all"
              >
                Okay
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
