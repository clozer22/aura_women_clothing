import React, { memo, useState, useMemo } from 'react';
import { Star, MessageSquare, Trash2, Search, Filter, RefreshCw, CheckCircle2 } from 'lucide-react';
import LuxuryButton from '../common/LuxuryButton';

const AdminReviewsTab = memo(({
  reviews = [],
  isLoading = false,
  onRefresh,
  onDeleteReview,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStarFilter, setActiveStarFilter] = useState(0); // 0 = all
  const [isDeletingId, setIsDeletingId] = useState(null);

  // Calculate rating stats
  const totalReviews = reviews.length;
  const avgRating = useMemo(() => {
    if (totalReviews === 0) return '5.0';
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    return (sum / totalReviews).toFixed(1);
  }, [reviews, totalReviews]);

  const countsByStar = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
      counts[star] = (counts[star] || 0) + 1;
    });
    return counts;
  }, [reviews]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (activeStarFilter > 0 && Math.round(Number(r.rating) || 5) !== activeStarFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pMatch = (r.product_name || '').toLowerCase().includes(q);
        const cMatch = (r.comment || '').toLowerCase().includes(q);
        const uMatch = (r.user_name || '').toLowerCase().includes(q);
        const oMatch = (r.order_reference || '').toLowerCase().includes(q);
        return pMatch || cMatch || uMatch || oMatch;
      }
      return true;
    });
  }, [reviews, activeStarFilter, searchQuery]);

  const handleDelete = async (rev) => {
    if (!onDeleteReview) return;
    if (!window.confirm(`Are you sure you want to remove the review from ${rev.user_name} for "${rev.product_name}"?`)) {
      return;
    }
    setIsDeletingId(rev.id);
    try {
      await onDeleteReview(rev.id);
    } finally {
      setIsDeletingId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
              Reviews
            </span>
            <span className="text-xs text-slate-400 font-medium">Customer Ratings & Moderation</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-sans text-slate-900 tracking-tight">
            Customer Reviews
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified customer ratings submitted on delivered garments.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200/80 shadow-xs transition-all disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
          <span>{isLoading ? 'Syncing...' : 'Sync Reviews'}</span>
        </button>
      </div>

      {/* Ratings Overview Banner */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left: Big Score (4 cols) */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-5 bg-slate-50 border border-slate-200/70 rounded-xl text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
            Store Average Rating
          </span>
          <div className="font-sans text-4xl sm:text-5xl text-slate-900 font-bold">
            {avgRating}
          </div>
          <div className="flex items-center gap-1 my-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-4 h-4 ${
                  s <= Math.round(Number(avgRating)) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-slate-500">
            Based on <strong className="text-slate-800">{totalReviews}</strong> verified ratings
          </span>
        </div>

        {/* Right: Star Breakdown (8 cols) */}
        <div className="md:col-span-8 space-y-2">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = countsByStar[stars] || 0;
            const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;

            return (
              <button
                key={stars}
                onClick={() => setActiveStarFilter(activeStarFilter === stars ? 0 : stars)}
                className={`w-full flex items-center gap-3 text-xs p-2 rounded-xl transition-all cursor-pointer text-left ${
                  activeStarFilter === stars ? 'bg-blue-50 font-semibold' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1 w-16 flex-shrink-0">
                  <span className="font-semibold text-slate-850">{stars}</span>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                </div>
                <div className="flex-grow bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="w-20 text-right text-[11px] text-slate-500 flex-shrink-0">
                  {count} ({pct}%)
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 border border-slate-200/80 rounded-2xl shadow-xs">
        {/* Star Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveStarFilter(0)}
            className={`px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all rounded-xl cursor-pointer border ${
              activeStarFilter === 0
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All ({totalReviews})
          </button>
          {[5, 4, 3, 2, 1].map((stars) => (
            <button
              key={stars}
              onClick={() => setActiveStarFilter(stars)}
              className={`px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all rounded-xl cursor-pointer border flex items-center gap-1 ${
                activeStarFilter === stars
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{stars}★</span>
              <span className="text-[10px] opacity-80">({countsByStar[stars] || 0})</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reviews or garments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white rounded-xl placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center space-y-2 shadow-xs">
          <MessageSquare className="w-8 h-8 text-slate-400 mx-auto stroke-[1.5]" />
          <h3 className="font-sans font-bold text-sm text-slate-800">No Reviews Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {reviews.length === 0
              ? 'When customers receive their delivered garments, their ratings and feedback will stream here.'
              : 'No reviews match your current star or search filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white border border-slate-200/80 hover:border-blue-400/80 transition-all p-5 space-y-3 rounded-2xl shadow-xs flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                {/* Header: Stars, Verified Badge, Delete */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= (rev.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-full">
                      Verified Purchase
                    </span>
                  </div>

                  <button
                    onClick={() => handleDelete(rev)}
                    disabled={isDeletingId === rev.id}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Delete Review"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Product Name & Order Ref */}
                <div>
                  <h4 className="font-sans font-bold text-sm text-slate-900">
                    {rev.product_name}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Order Ref:{' '}
                    <span className="font-semibold text-slate-700">{rev.order_reference}</span> •{' '}
                    {formatDate(rev.created_at)}
                  </p>
                </div>

                {/* Fit Tag & Highlights */}
                {(rev.fit_feedback || (rev.tags && rev.tags.length > 0)) && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {rev.fit_feedback && (
                      <span className="text-[10px] px-2.5 py-0.5 bg-blue-50 border border-blue-200/60 text-blue-800 font-semibold rounded-full">
                        Fit: {rev.fit_feedback}
                      </span>
                    )}
                    {rev.tags?.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-full"
                      >
                        ✓ {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Comment Text */}
                {rev.comment && (
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 border border-slate-200/70 rounded-xl italic">
                    "{rev.comment}"
                  </p>
                )}
              </div>

              {/* Author */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  Customer: <strong className="text-slate-800">{rev.user_name}</strong>
                  {rev.user_email ? ` (${rev.user_email})` : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

AdminReviewsTab.displayName = 'AdminReviewsTab';

export default AdminReviewsTab;
