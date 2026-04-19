import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface MyProfile {
  avatarUrl: string | null;
  displayName: string | null;
  photos: string[];
}

interface MyProfileContextValue extends MyProfile {
  refresh: () => Promise<void>;
  setAvatarUrl: (url: string | null) => void;
  setPhotos: (photos: string[]) => void;
}

const defaultValue: MyProfileContextValue = {
  avatarUrl: null,
  displayName: null,
  photos: [],
  refresh: async () => {},
  setAvatarUrl: () => {},
  setPhotos: () => {},
};

const MyProfileContext = createContext<MyProfileContextValue>(defaultValue);

export function MyProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    if (!user) {
      setAvatarUrl(null);
      setDisplayName(null);
      setPhotos([]);
      return;
    }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, display_name, photos')
        .eq('id', user.id)
        .single();
      if (data) {
        setAvatarUrl(data.avatar_url ?? null);
        setDisplayName(data.display_name ?? null);
        setPhotos(Array.isArray(data.photos) ? data.photos : []);
      }
    } catch {
      /* silent — profiles row may not exist yet */
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime subscription — update when profile row changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`my-profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as {
            avatar_url?: string | null;
            display_name?: string | null;
            photos?: string[] | null;
          } | null;
          if (!row) return;
          if ('avatar_url' in row) setAvatarUrl(row.avatar_url ?? null);
          if ('display_name' in row) setDisplayName(row.display_name ?? null);
          if ('photos' in row) setPhotos(Array.isArray(row.photos) ? row.photos : []);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <MyProfileContext.Provider
      value={{
        avatarUrl,
        displayName,
        photos,
        refresh,
        setAvatarUrl,
        setPhotos,
      }}
    >
      {children}
    </MyProfileContext.Provider>
  );
}

export function useMyProfile() {
  return useContext(MyProfileContext);
}
