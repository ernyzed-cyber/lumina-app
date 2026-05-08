import { useState } from 'react';
import { Search as SearchIcon, Filter, MapPin, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StarField } from './home/StarField';
import s from './Search.module.css';

export default function SearchRedesign() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  return (
    <main className={s.page}>
      <StarField intensity="dim" />
      
      <div className={s.shell}>
        <header className={s.header}>
          <div className={s.headerTop}>
            <button
              type="button"
              className={s.headerBack}
              aria-label="Back"
              onClick={() => navigate('/__preview')}
            >
              <ChevronLeft size={20} strokeWidth={1.8} />
            </button>
            <span className={s.headerTitle}>Discover</span>
          </div>
          
          <div className={s.searchBarWrap}>
            <div className={s.searchBar}>
              <SearchIcon size={18} className={s.searchIcon} />
              <input
                type="text"
                placeholder="Search by name, interests..."
                className={s.searchInput}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button className={s.filterBtn} aria-label="Filters">
              <Filter size={18} />
            </button>
          </div>
        </header>

        <section className={s.content}>
          <div className={s.sectionHeader}>
            <h2 className={s.sectionTitle}>Online Now</h2>
            <button className={s.seeAllBtn}>See All</button>
          </div>
          
          {/* Horizontal scroll strip for online users */}
          <div className={s.onlineStrip}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className={s.onlineAvatarWrap}>
                <div className={s.onlineAvatar}>
                  <img src={`https://i.pravatar.cc/150?img=${i + 10}`} alt={`User ${i}`} />
                  <div className={s.onlineIndicator} />
                </div>
                <span className={s.onlineName}>Name</span>
              </div>
            ))}
          </div>

          <div className={s.sectionHeader}>
            <h2 className={s.sectionTitle}>Near You</h2>
          </div>

          {/* Grid of cards */}
          <div className={s.grid}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className={s.gridCard}>
                <img 
                  src={`https://i.pravatar.cc/300?img=${i + 20}`} 
                  alt={`Profile ${i}`} 
                  className={s.gridImage} 
                />
                <div className={s.gridOverlay}>
                  <div className={s.gridInfo}>
                    <span className={s.gridName}>Anna, 22</span>
                    <span className={s.gridDistance}>
                      <MapPin size={10} /> 1.5 km
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}