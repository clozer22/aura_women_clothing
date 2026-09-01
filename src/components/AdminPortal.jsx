import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ShoppingBag, Sliders, ArrowLeft, Search, Plus, X, Globe, Save, Trash2, LogOut, Upload, AlertTriangle, XCircle, Check, Edit, Star, Menu } from 'lucide-react';
import { PRODUCTS } from '../data/products';
import { supabase } from '../lib/supabaseClient';
import RichTextEditor from './RichTextEditor';

const isVideoUrl = (url) => url && (url.startsWith('data:video/') || url.match(/\.(mp4|mov|webm)($|\?)/i));

export default function AdminPortal({
  onClosePortal,
  heroConfig,
  onUpdateHeroConfig,
  onRefreshData
}) {
  const [session, setSession] = useState(null);

  // Login credentials states
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard states
  const [activeTab, setActiveTab] = useState('products'); // 'profile' | 'products' | 'customize'
  const [productList, setProductList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'top' | 'bottom'

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

      // Upload to bucket 'storefront' with 1-year CDN & browser caching
      const { data, error: uploadError } = await supabase.storage
        .from('storefront')
        .upload(filePath, file, { cacheControl: '31536000', upsert: false });

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
        .upload(filePath, file, { cacheControl: '31536000', upsert: false });

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
        .upload(filePath, file, { cacheControl: '31536000', upsert: false });

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
        .upload(filePath, file, { cacheControl: '31536000', upsert: false });

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

  // Load products and profile details once authenticated
  const fetchAdminData = async () => {
    if (!session?.user) return;
    setIsLoadingProfile(true);
    try {
      // 1. Fetch products from database
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .order('createdAt', { ascending: false });
      if (prodErr) throw prodErr;
      if (prodData) {
        setProductList(prodData);
      } else {
        setProductList([]);
      }

      // 2. Fetch admin profile details
      const { data: profData, error: profErr } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profErr) throw profErr;
      if (profData) {
        const profObj = {
          name: profData.name || 'Elena Vance',
          role_title: profData.role_title || 'Owner & Head Atelier Designer',
          avatar_url: profData.avatar_url || '',
          bio: profData.bio || 'Bespoke designer commanding elegance for the modern profile.',
          email: session.user.email
        };
        setProfile(profObj);
        setEditProfileForm(profObj);
      }
    } catch (err) {
      console.warn('Supabase fetch failed. Falling back to empty array:', err.message);
      setProductList([]);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchAdminData();
    }
  }, [session]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) throw error;
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
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

      // Refresh home views
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

          setProductList(productList.filter(p => p.id !== id));
          // Remove from selection if deleted
          setSelectedProductIds(prev => prev.filter(item => item !== id));
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

          setProductList(productList.filter(p => !selectedProductIds.includes(p.id)));
          setSelectedProductIds([]);
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
        .upload(filePath, file, { cacheControl: '31536000', upsert: false });

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

      // Update local state
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
      if (onRefreshData) onRefreshData();
      triggerNotification('success', 'Theme Saved', 'Theme configurations applied to frontpage successfully!');
    } catch (err) {
      triggerNotification('error', 'Save Failed', err.message);
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

  const featuredCount = productList.filter(p => p.isFeatured).length;

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

  // Auto-initialize first 6 active products as featured if none are selected in the database
  const hasInitializedFeaturedRef = useRef(false);
  useEffect(() => {
    const initFeatured = async () => {
      if (hasInitializedFeaturedRef.current) return;
      if (productList.length > 0 && featuredCount === 0) {
        hasInitializedFeaturedRef.current = true;
        const firstSixActive = productList
          .filter(p => p.statusBadge !== 'ARCHIVE')
          .slice(0, 6);

        if (firstSixActive.length > 0) {
          const idsToFeature = firstSixActive.map(p => p.id);

          // 1. Update local state so checkboxes check instantly in the UI
          setProductList(prevList =>
            prevList.map(p => idsToFeature.includes(p.id) ? { ...p, isFeatured: true } : p)
          );
          // 2. Persist to database so they remain checked on page reload
          const { error } = await supabase
            .from('products')
            .update({ isFeatured: true })
            .in('id', idsToFeature);

          if (error) {
            console.warn('Supabase auto-feature sync failed:', error.message);
          } else {
            if (onRefreshData) onRefreshData();
          }
        }
      }
    };

    if (session && productList.length > 0 && !hasInitializedFeaturedRef.current) {
      initFeatured();
    }
  }, [session, productList, featuredCount]);

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

  // 1. RENDER SECURE LOGIN SCREEN IF NOT AUTHENTICATED
  if (!session) {
    return (
      <div className="min-h-screen bg-[#FAF0EC] flex items-center justify-center p-6 select-none font-sans">
        <div className="w-full max-w-md bg-white border border-[#E8DCD7] shadow-xl p-8 rounded-none flex flex-col justify-between">
          <div>
            <div className="text-center mb-8">
              <span className="font-brand text-4xl text-[#2C1E1B] tracking-widest block mb-2">AURA</span>
              <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-[#B86B60]">Atelier Secure Login</span>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-none tracking-wide text-center">
                  {authError}
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#705B56] mb-2">
                  Atelier Email
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
                className="w-full py-4 rounded-none bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-[11px] font-semibold uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {isLoggingIn ? 'Verifying Credentials...' : 'Access Portal'}
              </button>
            </form>
          </div>

          <div className="mt-8 pt-6 border-t border-[#E8DCD7]/60">
            <button
              onClick={onClosePortal}
              className="w-full py-3 bg-white text-[#705B56] hover:text-[#2C1E1B] rounded-none text-[10px] font-semibold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border border-[#E8DCD7]/60"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Shop</span>
            </button>
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
          <span className="text-[8px] tracking-[0.18em] uppercase font-sans text-[#2C1E1B] bg-white/50 px-1.5 py-0.5 rounded-none font-semibold">Admin</span>
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
                      setActiveTab('profile');
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

                  <button
                    onClick={() => {
                      setActiveTab('products');
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
                      setActiveTab('customize');
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
                </nav>
              </div>

              {/* Bottom Actions */}
              <div className="pt-6 border-t border-white/10 flex flex-col gap-2 w-full mt-8">
                <button
                  onClick={onClosePortal}
                  className="py-3 w-full bg-white text-[#2C1E1B] rounded-none text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Shop</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="py-3 w-full bg-white text-[#2C1E1B] rounded-none text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 border"
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
            <span className="text-[9px] tracking-[0.18em] uppercase font-sans text-[#2C1E1B] bg-white/50 px-2 py-0.5 rounded-none font-semibold">Admin</span>
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
              onClick={() => setActiveTab('profile')}
              className={`py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-left flex items-center gap-3 transition-all rounded-none ${activeTab === 'profile'
                ? 'bg-white text-[#2C1E1B] font-bold'
                : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              title="Owner Profile"
            >
              <User className="w-4 h-4" />
              <span>Owner Profile</span>
            </button>

            <button
              onClick={() => setActiveTab('products')}
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
              onClick={() => setActiveTab('customize')}
              className={`py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-left flex items-center gap-3 transition-all rounded-none ${activeTab === 'customize'
                ? 'bg-white text-[#2C1E1B] font-bold'
                : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              title="Store Customizer"
            >
              <Sliders className="w-4 h-4" />
              <span>Store Customizer</span>
            </button>
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="pt-6 border-t border-white/10 flex flex-col gap-2 w-full">
          <button
            onClick={onClosePortal}
            className="py-3.5 w-full bg-white text-[#2C1E1B] rounded-none text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-white/10"
            title="Return to Shop"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Shop</span>
          </button>

          <button
            onClick={handleLogout}
            className="py-3.5 w-full bg-white text-[#2C1E1B] rounded-none text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 border"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>

          <span className="text-[9px] font-mono tracking-widest text-[#2C1E1B]/60 text-center block pt-1 uppercase">
            Aura Atelier • v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.3.0'}
          </span>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="flex-1 p-6 sm:p-12 overflow-y-auto max-h-screen">

        {/* VIEW 1: OWNER PROFILE */}
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl space-y-8"
          >
            <div>
              {/* <span className="font-script text-[5rem] leading-none text-[#2C1E1B] block -mb-2">Super Admin</span> */}
              <h2 className="text-3xl sm:text-5xl font-editorial font-light text-[#2C1E1B] tracking-tight">Main Admin Profile</h2>
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleUpdateProfile} className="bg-white border border-[#E8DCD7] shadow-sm p-8 rounded-none space-y-6">
                <h3 className="font-editorial text-2xl text-[#2C1E1B] pb-2 border-b border-[#E8DCD7]/60">Edit Profile Details</h3>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Display Name</label>
                    <input
                      type="text"
                      required
                      value={editProfileForm.name}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Role / Title</label>
                    <input
                      type="text"
                      required
                      value={editProfileForm.role_title}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, role_title: e.target.value })}
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
                          onChange={handleAvatarUpload}
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
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, bio: e.target.value })}
                      className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] resize-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E8DCD7] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditProfileForm({ ...profile });
                      setIsEditingProfile(false);
                    }}
                    className="py-3 px-5 border border-[#E8DCD7] hover:bg-[#FAF0EC] text-[#705B56] text-xs font-semibold uppercase tracking-wider rounded-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-3 px-6 bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-xs font-semibold uppercase tracking-wider rounded-none shadow-md"
                  >
                    Save Profile Changes
                  </button>
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
                      <span className="text-[#2C1E1B]">{profile.role_title}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#A38E88] uppercase block mb-0.5">Assigned Email</span>
                      <span className="text-[#2C1E1B]">{profile.email}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#E8DCD7]">
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="py-3 px-6 bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-xs font-semibold uppercase tracking-wider rounded-none transition-all shadow-md"
                    >
                      Edit Owner Profile
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* VIEW 2: PRODUCT TABLE */}
        {activeTab === 'products' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-script text-[5rem] text-[#2C1E1B] block mb-1">Catalog Admin</span>
                <h2 className="text-3xl sm:text-5xl font-editorial font-light text-[#2C1E1B] tracking-tight">Atelier Garment Inventory</h2>
              </div>
              <button
                onClick={() => {
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
                    description: '',
                    shopeeLink: '',
                    rating: '',
                    solds: '',
                    statusBadge: ''
                  });
                  setIsAddModalOpen(true);
                }}
                className="bg-[#ccc2c3] hover:bg-[#ccc2c5] text-[#2C1E1B] py-3.5 px-6 rounded-none text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 bg-white border border-[#E8DCD7] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 rounded-none">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-[#705B56] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search code/name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] placeholder-[#A38E88] focus:outline-none focus:border-[#2C1E1B]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                <span className="text-xs font-semibold text-[#705B56]">
                  Featured in Collection: <strong className="text-[#B86B60]">{featuredCount}/6</strong>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-[#705B56] font-semibold">Filter:</span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] font-semibold rounded-none px-4 py-2.5 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    <option value="top">Tops</option>
                    <option value="bottom">Bottoms</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-[#E8DCD7] shadow-sm overflow-x-auto rounded-none relative">
              {selectedProductIds.length > 0 && (
                <div className="bg-[#FAF5F2] p-3 border-b border-[#E8DCD7] flex items-center justify-between px-6 sticky left-0 right-0 z-10 shadow-sm animate-fadeIn">
                  <span className="text-xs font-semibold text-[#705B56]">
                    Selected <strong className="text-[#B86B60]">{selectedProductIds.length}</strong> {selectedProductIds.length === 1 ? 'garment' : 'garments'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setBulkSizeChart('');
                        setIsBulkModalOpen(true);
                      }}
                      className="bg-[#2C1E1B] hover:bg-[#4A3E3B] text-white py-2 px-4 rounded-none text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-sm focus:outline-none cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Bulk Update</span>
                    </button>
                    <button
                      onClick={handleDeleteSelected}
                      className="bg-red-700 hover:bg-red-800 text-white py-2 px-4 rounded-none text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-sm focus:outline-none cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Selected</span>
                    </button>
                  </div>
                </div>
              )}
              <table className="w-full text-left border-collapse rounded-none">
                <thead>
                  <tr className="bg-[#F3EAE6] border-b border-[#E8DCD7] text-[10px] uppercase tracking-wider font-bold text-[#705B56]">
                    <th className="p-4 text-center w-12">
                      <input
                        type="checkbox"
                        checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.includes(p.id))}
                        onChange={() => handleSelectAllFiltered(filteredProducts)}
                        className="w-4 h-4 rounded-none accent-[#2C1E1B] cursor-pointer"
                        title="Select All on page"
                      />
                    </th>
                    <th className="p-4 text-center">Featured</th>
                    <th className="p-4">Thumbnail</th>
                    <th className="p-4">Product Name</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Colors</th>
                    <th className="p-4">Sizes</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Rating</th>
                    <th className="p-4">Solds</th>
                    <th className="p-4">Shopee Link</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8DCD7]/60 text-xs font-semibold text-[#2C1E1B]">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className={`hover:bg-[#FAF5F2]/40 transition-colors ${selectedProductIds.includes(p.id) ? 'bg-[#FAF0EC]' : ''}`}>
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(p.id)}
                          onChange={() => handleToggleSelectProduct(p.id)}
                          className="w-4 h-4 rounded-none accent-[#2C1E1B] cursor-pointer"
                        />
                      </td>
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleFeatured(p.id, !p.isFeatured)}
                          disabled={!p.isFeatured && featuredCount >= 6}
                          className="focus:outline-none flex items-center justify-center mx-auto transition-transform active:scale-95 disabled:opacity-40"
                          title={!p.isFeatured && featuredCount >= 6 ? "Maximum 6 featured items reached" : "Toggle featured status"}
                        >
                          {p.isFeatured ? (
                            <Star className="w-5 h-5 text-amber-500 fill-amber-500 hover:scale-110 transition-transform" />
                          ) : (
                            <Star className={`w-5 h-5 transition-transform hover:scale-110 ${featuredCount >= 6
                              ? 'text-[#ccc2c3]/30 cursor-not-allowed'
                              : 'text-[#ccc2c3] hover:text-amber-400'
                              }`} />
                          )}
                        </button>
                      </td>
                      <td className="p-4">
                        <img
                          src={p.image}
                          alt={p.name}
                          loading="lazy"
                          decoding="async"
                          className="w-10 h-12 object-cover border border-[#E8DCD7] rounded-none"
                        />
                      </td>
                      <td className="p-4 font-normal text-sm text-[#2C1E1B]">{p.name}</td>
                      <td className="p-4">
                        <span className="text-[#705B56] uppercase tracking-wider text-[10px] block">{p.mainCategory === 'top' ? 'Top' : 'Bottom'}</span>
                        <span className="text-[9px] text-[#A38E88] font-normal">{p.subType}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          {p.colors && p.colors.map((c, idx) => (
                            <span
                              key={idx}
                              className="w-3.5 h-3.5 rounded-none border border-black/10 inline-block"
                              style={{ backgroundColor: c.hex }}
                              title={c.name}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-[#705B56] uppercase tracking-wider text-[10px]">
                        {Array.isArray(p.sizes) ? p.sizes.join(', ') : (p.sizes || 'XXS-XS, S-M, L, XL')}
                      </td>
                      <td className="p-4 font-mono text-gray-800">₱{Number(p.price)?.toLocaleString()}</td>
                      <td className="p-4 font-mono text-amber-600">{p.rating} ★</td>
                      <td className="p-4 font-mono text-gray-600">{p.solds} sold</td>
                      <td className="p-4">
                        <a
                          href={p.shopeeLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#B86B60] hover:text-[#2C1E1B] transition-colors flex items-center gap-1 text-[10px]"
                        >
                          <Globe className="w-3 h-3" />
                          <span className="truncate max-w-[80px] block">Shopee</span>
                        </a>
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] tracking-wider uppercase font-bold px-2 py-0.5 rounded-none border ${p.statusBadge === 'ARCHIVE'
                          ? 'bg-gray-100 text-gray-700 border-gray-300'
                          : p.statusBadge === 'SOLD OUT'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : p.statusBadge === 'PRE-ORDER'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                          {p.statusBadge || 'IN STOCK'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditProductClick(p)}
                            className="p-2 rounded-none text-[#705B56] hover:text-white hover:bg-[#705B56] border border-[#E8DCD7] transition-colors focus:outline-none flex items-center justify-center"
                            title="Edit Product"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-2 rounded-none text-red-700 hover:text-white hover:bg-red-700 border border-red-200 transition-colors focus:outline-none flex items-center justify-center"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredProducts.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-xs">No garments found matching query.</div>
              )}
            </div>
          </motion.div>
        )}

        {/* VIEW 3: STOREFRONT CUSTOMIZER */}
        {activeTab === 'customize' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl space-y-8"
          >
            <div>
              <span className="font-script text-[5rem] leading-none text-[#B86B60] block -mb-2">Visual Atelier</span>
              <h2 className="text-3xl sm:text-5xl font-editorial font-light text-[#2C1E1B] tracking-tight">Frontpage Style Customizer</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

              {/* Left Column: Form Fields */}
              <div className="lg:col-span-7 bg-white border border-[#E8DCD7] shadow-sm p-8 rounded-none space-y-6">

                <h3 className="font-editorial text-2xl text-[#2C1E1B] pb-2 border-b border-[#E8DCD7]/60">Customize Hero Banner</h3>

                <div className="space-y-4">
                  {/* Poster Image (Manual Upload Only) */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56] block">
                      Main Poster
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="cursor-pointer bg-[#FAF0EC] hover:bg-[#E8DCD7]/50 border border-[#E8DCD7] text-[#2C1E1B] text-xs font-semibold px-4 py-3 rounded-none flex items-center gap-2 transition-all">
                        <Upload className="w-4 h-4 text-[#705B56]" />
                        <span>{isUploadingPoster ? 'Uploading...' : 'Choose File'}</span>
                        <input
                          type="file"
                          accept=".png, .jpg, .jpeg, .mp4, .mov, .webm"
                          onChange={(e) => handleMediaUpload(e, 'poster')}
                          className="hidden"
                          disabled={isUploadingPoster}
                        />
                      </label>
                      <span className="text-[10px] text-[#705B56] truncate max-w-[200px]">
                        {localHeroConfig.posterUrl ? 'File selected & active' : 'No file selected'}
                      </span>
                    </div>
                    <p className="text-[9px] text-[#A38E88] leading-relaxed">
                      Supports PNG, JPG, MP4, MOV, WEBM.<br />
                      <strong className="text-[#B86B60]">Recommended: 1920 x 1080px (16:9) or 1600 x 1200px (4:3) with subject centered</strong> both horizontally and vertically (crop-safe for both desktop landscape and mobile portrait).
                    </p>
                  </div>

                  {/* Display Title */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56] block">Display Branding Title</label>
                    <input
                      type="text"
                      value={localHeroConfig.title}
                      onChange={(e) => setLocalHeroConfig({ ...localHeroConfig, title: e.target.value })}
                      className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                    />
                  </div>
                </div>

                <h3 className="font-editorial text-2xl text-[#2C1E1B] pb-2 border-b border-[#E8DCD7]/60 pt-4">Customize About Us</h3>

                <div className="space-y-4">
                  {/* About Media (Manual Upload Only) */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56] block">
                      About Us Featured Media (Manual Upload)
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="cursor-pointer bg-[#FAF0EC] hover:bg-[#E8DCD7]/50 border border-[#E8DCD7] text-[#2C1E1B] text-xs font-semibold px-4 py-3 rounded-none flex items-center gap-2 transition-all">
                        <Upload className="w-4 h-4 text-[#705B56]" />
                        <span>{isUploadingAboutMedia ? 'Uploading...' : 'Choose File'}</span>
                        <input
                          type="file"
                          accept=".png, .jpg, .jpeg, .mp4, .mov, .webm"
                          onChange={(e) => handleMediaUpload(e, 'about')}
                          className="hidden"
                          disabled={isUploadingAboutMedia}
                        />
                      </label>
                      <span className="text-[10px] text-[#705B56] truncate max-w-[200px]">
                        {localHeroConfig.aboutMediaUrl ? 'File selected & active' : 'No file selected'}
                      </span>
                    </div>
                    <p className="text-[9px] text-[#A38E88] leading-relaxed">
                      Supports PNG, JPG, MP4, MOV, WEBM.<br />
                      <strong className="text-[#B86B60]">Recommended: 1920 x 1080px (16:9) or 1600 x 1200px (4:3) with subject on the left</strong> (to keep the text readable on the right on desktop views).
                    </p>
                  </div>

                  {/* About Title */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56] block">About Title</label>
                    <input
                      type="text"
                      value={localHeroConfig.aboutTitle || ''}
                      onChange={(e) => setLocalHeroConfig({ ...localHeroConfig, aboutTitle: e.target.value })}
                      className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                      placeholder="Oh What?"
                    />
                  </div>

                  {/* About Subtitle */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56] block">About Subtitle</label>
                    <input
                      type="text"
                      value={localHeroConfig.aboutSubtitle || ''}
                      onChange={(e) => setLocalHeroConfig({ ...localHeroConfig, aboutSubtitle: e.target.value })}
                      className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                      placeholder="Sakura Blossom - Milky Lavender"
                    />
                  </div>

                  {/* About Description */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56] block">About Description Narrative</label>
                    <textarea
                      rows={5}
                      value={localHeroConfig.aboutDescription || ''}
                      onChange={(e) => setLocalHeroConfig({ ...localHeroConfig, aboutDescription: e.target.value })}
                      className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] resize-y"
                      placeholder="About Us description narrative..."
                    />
                  </div>
                </div>

                <button
                  onClick={handleApplyCustomizations}
                  className="w-full mt-6 py-4 bg-[#2C1E1B] hover:bg-[#B86B60] text-white rounded-none text-xs font-semibold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <Save className="w-4 h-4" />
                  <span>Apply Theme Settings</span>
                </button>
              </div>

              {/* Right Column: Visual Mockup / Live Preview */}
              <div className="lg:col-span-5 bg-white border border-[#E8DCD7] shadow-sm p-5 rounded-none space-y-6 lg:sticky lg:top-6">
                <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#B86B60] bg-[#FAF0EC] px-3 py-1 rounded-none inline-block">LIVE WORKSPACE PREVIEWS</span>

                {/* Preview 1: Hero Banner */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#705B56] block">Hero Banner Preview</span>
                  <div className="border border-[#E8DCD7] rounded-none overflow-hidden relative min-h-[220px] flex items-center justify-center bg-gray-100">
                    {localHeroConfig.posterUrl?.startsWith('data:video/') || localHeroConfig.posterUrl?.match(/\.(mp4|webm|mov|ogg)($|\?)/i) ? (
                      <video
                        src={localHeroConfig.posterUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={localHeroConfig.posterUrl}
                        alt="Banner Preview"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}

                    <div className="relative z-10 text-center px-4">
                      <h1
                        className="text-4xl font-brand font-normal text-white lowercase first-letter:capitalize tracking-tight leading-none drop-shadow-lg"
                        style={{ textShadow: '0 4px 24px rgba(44, 30, 27, 0.7), 0 2px 8px rgba(44, 30, 27, 0.5)' }}
                      >
                        {localHeroConfig.title}
                      </h1>
                    </div>
                  </div>
                </div>

                {/* Preview 2: About Us Section */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#705B56] block">About Us Section Preview</span>
                  <div className="border border-[#E8DCD7] rounded-none overflow-hidden relative min-h-[240px] flex items-center justify-end bg-gray-100 p-4">
                    {localHeroConfig.aboutMediaUrl ? (
                      localHeroConfig.aboutMediaUrl.startsWith('data:video/') || localHeroConfig.aboutMediaUrl.match(/\.(mp4|webm|mov|ogg)($|\?)/i) ? (
                        <video
                          src={localHeroConfig.aboutMediaUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="absolute inset-0 w-full h-full object-cover object-left"
                        />
                      ) : (
                        <img
                          src={localHeroConfig.aboutMediaUrl}
                          alt="About Us Preview"
                          className="absolute inset-0 w-full h-full object-cover object-left"
                        />
                      )
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#2C1E1B]/10 to-[#2C1E1B]/40" />

                    <div
                      className="relative z-10 w-[55%] flex flex-col justify-center text-left text-white"
                      style={{ textShadow: '0 2px 8px rgba(44, 30, 27, 0.8), 0 1px 3px rgba(44, 30, 27, 0.6)' }}
                    >
                      <h4 className="font-editorial italic text-xl leading-none text-white block mb-1">
                        {localHeroConfig.aboutTitle || 'Oh What?'}
                      </h4>
                      <span className="text-[7px] uppercase tracking-[0.2em] font-semibold text-[#D99B91] mb-2 block">
                        {localHeroConfig.aboutSubtitle || 'Sakura Blossom'}
                      </span>
                      <p className="text-[7.5px] leading-relaxed font-sans text-white/95 line-clamp-4 whitespace-pre-line">
                        {localHeroConfig.aboutDescription || 'The Brightening Secret...'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}

      </main>

      {/* VIEW MODAL: ADD PRODUCT FORM */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 w-full max-w-lg bg-white rounded-none shadow-2xl border border-[#E8DCD7] p-6 sm:p-8 flex flex-col max-h-[90vh] md:max-h-[85vh]"
            >
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-4 right-4 text-[#705B56] hover:text-[#2C1E1B] transition-colors p-1 z-10"
                aria-label="Close form modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6 flex-shrink-0">
                <span className="font-script text-[4.5rem] leading-none text-[#B86B60] block -mb-1">
                  {editingProductId ? 'Garment Refinement' : 'Garment Creation'}
                </span>
                <h3 className="text-xl sm:text-2xl font-editorial text-[#2C1E1B]">
                  {editingProductId ? 'Edit Product Details' : 'Upload New Product'}
                </h3>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-4 overflow-y-auto pr-2 flex-grow">
                <div className="grid grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Product Name</label>
                    <input
                      type="text"
                      required
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                      placeholder="e.g. The Monogram Silk Trench"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Category */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Category Group</label>
                    <select
                      value={newProduct.mainCategory}
                      onChange={(e) => setNewProduct({ ...newProduct, mainCategory: e.target.value })}
                      className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none cursor-pointer"
                    >
                      <option value="top">Tops</option>
                      <option value="bottom">Bottoms</option>
                    </select>
                  </div>

                  {/* Subtype */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Subtype / Section</label>
                    <input
                      type="text"
                      required
                      value={newProduct.subType}
                      onChange={(e) => setNewProduct({ ...newProduct, subType: e.target.value })}
                      className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                      placeholder="e.g. Blazers & Jackets"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Status Dropdown */}
                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Garment Status</label>
                    <select
                      value={newProduct.statusBadge}
                      onChange={(e) => setNewProduct({ ...newProduct, statusBadge: e.target.value })}
                      className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none cursor-pointer"
                    >
                      <option value="">IN STOCK (Normal)</option>
                      <option value="SOLD OUT">SOLD OUT</option>
                      <option value="PRE-ORDER">PRE-ORDER</option>
                      <option value="NEW ARRIVAL">NEW ARRIVAL</option>
                      <option value="BEST SELLER">BEST SELLER</option>
                      <option value="ARCHIVE">ARCHIVE (Hidden from Storefront)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {/* Price */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Price (₱)</label>
                    <input
                      type="number"
                      required
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Quantity</label>
                    <input
                      type="number"
                      required
                      value={newProduct.qty}
                      onChange={(e) => setNewProduct({ ...newProduct, qty: e.target.value })}
                      className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                    />
                  </div>

                  {/* Solds (Fake) */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Solds</label>
                    <input
                      type="number"
                      required
                      value={newProduct.solds}
                      onChange={(e) => setNewProduct({ ...newProduct, solds: e.target.value })}
                      className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                    />
                  </div>
                </div>

                {/* Ratings (Fake) */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Rating (e.g. 4.9)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    required
                    value={newProduct.rating}
                    onChange={(e) => setNewProduct({ ...newProduct, rating: e.target.value })}
                    className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                  />
                </div>

                {/* Sizes Range Input */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Available Sizes (e.g. XXS-XS, S-M, L, XL)</label>
                  <input
                    type="text"
                    required
                    value={newProduct.sizes}
                    onChange={(e) => setNewProduct({ ...newProduct, sizes: e.target.value })}
                    className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                    placeholder="e.g. XXS-XS, S-M, L, XL"
                  />
                </div>

                {/* Product Media Upload */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">
                    Product Media (Photo or Video - Portrait Orientation Only)
                  </label>
                  <input
                    type="file"
                    id="product-image-file"
                    accept="image/*,video/*"
                    onChange={handleProductImageUpload}
                    className="hidden"
                    disabled={isUploadingProductImage}
                  />

                  {isUploadingProductImage ? (
                    <div className="h-28 border border-dashed border-[#E8DCD7] bg-[#FAF0EC] flex flex-col items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-t-transparent border-[#B86B60] rounded-full animate-spin" />
                      <span className="text-[9px] uppercase tracking-wider font-bold text-[#B86B60]">Uploading to Server...</span>
                    </div>
                  ) : newProduct.image ? (
                    <div className="flex items-center gap-4 p-3 bg-[#FAF0EC] border border-[#E8DCD7] rounded-none">
                      {isVideoUrl(newProduct.image) ? (
                        <video
                          src={newProduct.image}
                          muted
                          playsInline
                          className="w-16 h-20 object-cover border border-[#E8DCD7] bg-white flex-shrink-0"
                        />
                      ) : (
                        <img
                          src={newProduct.image}
                          alt="Product Preview"
                          className="w-16 h-20 object-cover border border-[#E8DCD7] bg-white flex-shrink-0"
                        />
                      )}
                      <div className="space-y-1.5">
                        <span className="text-[9px] uppercase tracking-widest font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-none block w-max">
                          Media Loaded
                        </span>
                        <label
                          htmlFor="product-image-file"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-[#E8DCD7] text-[10px] font-bold uppercase tracking-wider text-[#2C1E1B] cursor-pointer transition-colors"
                        >
                          <Upload className="w-3 h-3 text-[#B86B60]" />
                          Replace Media
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label
                      htmlFor="product-image-file"
                      className="flex flex-col items-center justify-center h-28 border border-dashed border-[#E8DCD7] bg-[#FAF0EC] hover:bg-[#FAF0EC]/60 transition-colors cursor-pointer text-center p-4 gap-1.5 rounded-none"
                    >
                      <Upload className="w-5 h-5 text-[#B86B60]" />
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Upload Product Media</span>
                      <span className="text-[9px] text-[#A38E88] font-medium leading-normal">
                        Supports images (PNG, JPG, WEBP) & videos (MP4, MOV, WEBM).<br />
                        <strong className="text-[#B86B60]">Must be portrait</strong> if uploading an image.
                      </span>
                    </label>
                  )}

                  {/* Hidden input to store image URL for required form validation */}
                  <input
                    type="hidden"
                    name="image"
                    value={newProduct.image}
                    required
                  />
                </div>

                {/* Shopee Link */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Shopee Link</label>
                  <input
                    type="url"
                    required
                    value={newProduct.shopeeLink}
                    onChange={(e) => setNewProduct({ ...newProduct, shopeeLink: e.target.value })}
                    className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                    placeholder="e.g. https://shopee.ph/..."
                  />
                </div>

                {/* Description Label */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Description Label / Heading</label>
                  <input
                    type="text"
                    required
                    value={newProduct.descriptionLabel}
                    onChange={(e) => setNewProduct({ ...newProduct, descriptionLabel: e.target.value })}
                    className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                    placeholder="e.g. Description, Craftsmanship, Garment Story"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Product Description</label>
                  <RichTextEditor
                    value={newProduct.description}
                    onChange={(html) => setNewProduct({ ...newProduct, description: html })}
                    placeholder="Describe material tailoring details..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E8DCD7] mt-6">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="py-3 px-5 border border-[#E8DCD7] hover:bg-[#FAF0EC] text-[#705B56] text-xs font-semibold uppercase tracking-wider rounded-none transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-3 px-6 bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-xs font-semibold uppercase tracking-wider rounded-none shadow-md transition-all"
                  >
                    Save Garment
                  </button>
                </div>
              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VIEW MODAL: BULK UPDATE */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBulkModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 w-full max-w-md bg-white rounded-none shadow-2xl border border-[#E8DCD7] p-6 sm:p-8 flex flex-col max-h-[90vh] md:max-h-[85vh] select-none"
            >
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="absolute top-4 right-4 text-[#705B56] hover:text-[#2C1E1B] transition-colors p-1 z-10 cursor-pointer"
                aria-label="Close bulk modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6 flex-shrink-0">
                <h3 className="font-editorial text-2xl sm:text-3xl text-[#2C1E1B] font-normal leading-tight">
                  Bulk Update Size Chart
                </h3>
                <p className="text-[10px] text-[#705B56] mt-1.5 leading-relaxed font-semibold">
                  Upload a size chart image below. It will be applied to the {selectedProductIds.length} selected garments.
                </p>
              </div>

              <form onSubmit={handleBulkUpdate} className="flex-1 overflow-y-auto pr-1 space-y-5 scrollbar-thin">
                {/* Size Chart Image Uploader */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">
                    Select Size Chart Image
                  </label>
                  <input
                    type="file"
                    id="bulk-sizechart-file"
                    accept="image/*"
                    onChange={handleBulkSizeChartUpload}
                    className="hidden"
                    disabled={isUploadingSizeChart}
                  />

                  {isUploadingSizeChart ? (
                    <div className="h-28 border border-dashed border-[#E8DCD7] bg-[#FAF0EC] flex flex-col items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-t-transparent border-[#B86B60] rounded-full animate-spin" />
                      <span className="text-[9px] uppercase tracking-wider font-bold text-[#B86B60]">Uploading Size Chart...</span>
                    </div>
                  ) : bulkSizeChart ? (
                    <div className="flex items-center gap-4 p-3 bg-[#FAF0EC] border border-[#E8DCD7] rounded-none">
                      <img
                        src={bulkSizeChart}
                        alt="Bulk Size Chart Preview"
                        className="w-20 h-16 object-contain border border-[#E8DCD7] bg-white flex-shrink-0"
                      />
                      <div className="space-y-1.5">
                        <span className="text-[9px] uppercase tracking-widest font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-none block w-max">
                          Image Loaded
                        </span>
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor="bulk-sizechart-file"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-[#E8DCD7] text-[10px] font-bold uppercase tracking-wider text-[#2C1E1B] cursor-pointer transition-colors"
                          >
                            <Upload className="w-3 h-3 text-[#B86B60]" />
                            Replace Image
                          </label>
                          <button
                            type="button"
                            onClick={() => setBulkSizeChart('')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-50 border border-red-200 text-[10px] font-bold uppercase tracking-wider text-red-600 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label
                      htmlFor="bulk-sizechart-file"
                      className="flex flex-col items-center justify-center h-28 border border-dashed border-[#E8DCD7] bg-[#FAF0EC] hover:bg-[#FAF0EC]/60 transition-colors cursor-pointer text-center p-4 gap-1.5 rounded-none"
                    >
                      <Upload className="w-5 h-5 text-[#B86B60]" />
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Upload Size Chart Image</span>
                      <span className="text-[9px] text-[#A38E88] font-medium leading-normal">
                        Supports PNG, JPG, WEBP.
                      </span>
                    </label>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E8DCD7] mt-6 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkSizeChart('');
                      setIsBulkModalOpen(false);
                    }}
                    className="py-2.5 px-5 border border-[#E8DCD7] hover:bg-[#FAF0EC] text-[#705B56] text-xs font-semibold uppercase tracking-wider rounded-none transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!bulkSizeChart || isUploadingSizeChart}
                    className="py-2.5 px-6 bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-xs font-semibold uppercase tracking-wider rounded-none shadow-md transition-all cursor-pointer disabled:opacity-40"
                  >
                    Apply Bulk Size Chart
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
