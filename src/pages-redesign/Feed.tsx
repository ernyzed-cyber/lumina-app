import { Star, X, Heart, Sparkles, SlidersHorizontal, MapPin, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StarField } from './home/StarField';
import s from './Feed.module.css';

export default function FeedRedesign() {
  const navigate = useNavigate();

  return (
    <main className={s.page}>
      <StarField intensity="dim" />
      <div className={s.shell}>
        <header className={s.header}>
          <div className={s.logoWrap}>
            <button
              type="button"
              className={s.headerBack}
              aria-label="Back"
              onClick={() => navigate('/__preview')}
            >
              <ChevronLeft size={20} strokeWidth={1.8} />
            </button>
            <span className={s.logo}>LUMINA</span>
          </div>
          <div className={s.headerActions}>
            <button className={s.iconBtn} aria-label="Filters">
              <SlidersHorizontal size={20} />
            </button>
            <div className={s.balance}>
              <Star size={14} className={s.starIcon} fill="currentColor" />
              <span>1240</span>
            </div>
          </div>
        </header>

        <section className={s.cardContainer}>
          {/* Placeholder for the swipeable card */}
          <div className={s.card}>
            <img 
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80" 
              alt="Profile" 
              className={s.photo} 
            />
            
            <div className={s.cardOverlay}>
              <div className={s.info}>
                <div className={s.nameRow}>
                  <h2 className={s.name}>Elena, 24</h2>
                  <div className={s.badge}>New</div>
                </div>
                <div className={s.locationRow}>
                  <MapPin size={14} />
                  <span>2 km away</span>
                </div>
                <p className={s.bio}>Looking for someone to share coffee and meaningful conversations.</p>
              </div>
            </div>
          </div>
        </section>

        <div className={s.actionBar}>
          <button className={`${s.actionBtn} ${s.btnNope}`} aria-label="Nope">
            <X size={28} strokeWidth={2.5} />
          </button>
          <button className={`${s.actionBtn} ${s.btnSuper}`} aria-label="Super Like">
            <Sparkles size={24} strokeWidth={2.5} />
          </button>
          <button className={`${s.actionBtn} ${s.btnLike}`} aria-label="Like">
            <Heart size={28} strokeWidth={2.5} fill="currentColor" />
          </button>
        </div>
      </div>
    </main>
  );
}
