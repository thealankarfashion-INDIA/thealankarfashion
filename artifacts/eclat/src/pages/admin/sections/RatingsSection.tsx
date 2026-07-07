import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, User as UserIcon, Trash2 } from 'lucide-react';
import { subscribeToRatings, AppRating, deleteAppRating, deleteAllAppRatings } from '@/lib/ratings';
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal';

export function RatingsSection() {
  const [ratings, setRatings] = useState<AppRating[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToRatings((data) => {
      setRatings(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteSingle = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    await deleteAppRating(itemToDelete);
    setIsDeleting(false);
    setDeleteModalOpen(false);
    setItemToDelete(null);
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    await deleteAllAppRatings();
    setIsDeleting(false);
    setBulkDeleteOpen(false);
  };

  const totalRatings = ratings.length;
  const averageRating = totalRatings > 0 
    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings).toFixed(1) 
    : '0.0';

  const ratingCounts = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: ratings.filter(r => r.rating === stars).length
  }));

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-[#B47A67]/30 border-t-[#B47A67] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="font-serif text-3xl text-[#8E5E4F] mb-2">App Ratings</h2>
          <p className="text-[#8E5E4F]/60">View feedback from your users</p>
        </div>
        {totalRatings > 0 && (
          <button 
            onClick={() => setBulkDeleteOpen(true)}
            className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium text-sm border border-red-100"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Ratings
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Average Rating Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[#E8D8D1] rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm"
        >
          <div className="text-5xl font-black text-[#2C1E16] mb-2">{averageRating}</div>
          <div className="flex gap-1 mb-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Star 
                key={i} 
                className={`w-5 h-5 ${i <= Math.round(Number(averageRating)) ? 'fill-[#D4AF37] text-[#D4AF37]' : 'fill-gray-100 text-gray-200'}`} 
              />
            ))}
          </div>
          <div className="text-sm text-[#8E5E4F]/60">Based on {totalRatings} ratings</div>
        </motion.div>

        {/* Rating Breakdown */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white border border-[#E8D8D1] rounded-2xl p-6 md:col-span-2 shadow-sm flex flex-col justify-center"
        >
          <h3 className="text-sm font-bold text-[#2C1E16] mb-4 uppercase tracking-wider">Rating Breakdown</h3>
          <div className="space-y-3">
            {ratingCounts.map(rc => (
              <div key={rc.stars} className="flex items-center gap-4">
                <div className="flex items-center gap-1 w-12 shrink-0">
                  <span className="text-sm font-medium text-[#8E5E4F]">{rc.stars}</span>
                  <Star className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
                </div>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#B47A67] rounded-full" 
                    style={{ width: totalRatings > 0 ? `${(rc.count / totalRatings) * 100}%` : '0%' }}
                  />
                </div>
                <div className="w-8 text-right text-sm text-[#8E5E4F]/60 shrink-0">{rc.count}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Ratings List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white border border-[#E8D8D1] rounded-2xl overflow-hidden shadow-sm"
      >
        <div className="px-6 py-4 border-b border-[#E8D8D1] bg-[#FBF6F3]">
          <h3 className="font-serif text-lg text-[#8E5E4F]">Recent Feedback</h3>
        </div>
        
        {ratings.length === 0 ? (
          <div className="p-8 text-center text-[#8E5E4F]/50">No ratings yet.</div>
        ) : (
          <div className="divide-y divide-[#E8D8D1]">
            {ratings.map((rating) => {
              const date = rating.createdAt?.toDate ? rating.createdAt.toDate() : new Date(rating.createdAt);
              
              return (
                <div key={rating.id} className="p-6 flex flex-col md:flex-row md:items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 md:w-1/3">
                    <div className="w-10 h-10 rounded-full bg-[#E8D8D1] flex items-center justify-center shrink-0">
                      <UserIcon className="w-5 h-5 text-[#8E5E4F]" />
                    </div>
                    <div>
                      <div className="font-medium text-[#2C1E16]">{rating.userName || 'Anonymous'}</div>
                      <div className="text-xs text-[#8E5E4F]/60">ID: {rating.userId ? rating.userId.slice(0, 8) + '...' : 'N/A'}</div>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star 
                          key={i} 
                          className={`w-4 h-4 ${i <= rating.rating ? 'fill-[#D4AF37] text-[#D4AF37]' : 'fill-gray-100 text-gray-200'}`} 
                        />
                      ))}
                    </div>
                    {rating.comment && (
                      <p className="text-sm text-[#2C1E16] bg-white p-3 rounded-xl border border-[#E8D8D1] shadow-sm italic mt-2">
                        "{rating.comment}"
                      </p>
                    )}
                  </div>
                  
                  <div className="text-sm text-[#8E5E4F]/50 md:text-right shrink-0 flex flex-col md:items-end gap-2">
                    <span>{date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <button 
                      onClick={() => { setItemToDelete(rating.id); setDeleteModalOpen(true); }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Rating"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
        onConfirm={handleDeleteSingle}
        title="Delete Rating"
        message="Are you sure you want to delete this rating? This action cannot be undone."
        isDeleting={isDeleting}
      />

      <ConfirmDeleteModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleDeleteAll}
        title="Delete All Ratings"
        message="Are you absolutely sure you want to delete ALL ratings? This will permanently wipe all feedback from the database and free up storage space. This action cannot be undone."
        isBulk={true}
        isDeleting={isDeleting}
      />
    </div>
  );
}
