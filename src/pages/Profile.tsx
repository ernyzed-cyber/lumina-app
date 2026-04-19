import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  MapPin,
  Heart,
  Users,
  Target,
  GraduationCap,
  Globe,
  Hash,
  Home,
  ChevronRight,
  Plus,
  Crown,
  Lock,
  AlertTriangle,
  Trash2,
  Check,
  X,
  Camera,
  Flame,
  Sparkles,
  Briefcase,
  DollarSign,
  Wine,
  Plane,
  Activity,
  Ruler,
  Settings,
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import PageTransition from '../components/layout/PageTransition';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useLanguage } from '../i18n';
import { usePremium } from '../hooks/usePremium';
import { storage } from '../utils/helpers';
import s from './Profile.module.css';

/* ═══════════════════════════════════════════
   Types & Constants
   ═══════════════════════════════════════════ */

interface ProfileData {
  name: string;
  age: string;
  city: string;
  about: string;
  lookingFor: string;
  ageRange: string;
  datingGoal: string;
  education: string;
  work: string;
  languages: string;
  interests: string;
  wealth: string;
  living: string;
  children: string;
  smoking: string;
  alcohol: string;
  travel: string;
  appearance: string;
  bodyType: string;
  height: string;
  weight: string;
  photos: string[];
}

const DEFAULT_PROFILE: ProfileData = {
  name: '',
  age: '',
  city: '',
  about: '',
  lookingFor: '',
  ageRange: '18–45',
  datingGoal: '',
  education: '',
  work: '',
  languages: '',
  interests: '',
  wealth: '',
  living: '',
  children: '',
  smoking: '',
  alcohol: '',
  travel: '',
  appearance: '',
  bodyType: '',
  height: '',
  weight: '',
  photos: [],
};

const MAX_PHOTOS = 6;
const MAX_PHOTO_SIZE_MB = 5;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const PROGRESS_FIELDS: (keyof ProfileData)[] = [
  'name', 'age', 'city', 'about', 'lookingFor', 'datingGoal',
  'education', 'work', 'languages', 'interests', 'wealth', 'living',
  'children', 'smoking', 'alcohol', 'bodyType', 'height', 'weight',
];

const TOTAL_SEGMENTS = 5;

const PROFILE_STORAGE_KEY = 'profileData';

/** Validation limits for numeric profile fields */
const FIELD_LIMITS: Record<string, { min: number; max: number }> = {
  age: { min: 18, max: 100 },
  height: { min: 100, max: 250 },
  weight: { min: 30, max: 300 },
};

interface EditField {
  key: keyof ProfileData;
  title: string;
  type: 'text' | 'textarea' | 'select' | 'number';
  options?: { value: string; label: string }[];
}

/* ═══════════════════════════════════════════
   FieldRow — Reusable profile field row
   ═══════════════════════════════════════════ */

function FieldRow({
  icon,
  label,
  value,
  onClick,
  simple,
}: {
  icon?: ReactNode;
  label: string;
  value?: string;
  onClick: () => void;
  simple?: boolean;
}) {
  return (
    <button
      className={`${s.fieldRow} ${simple ? s.fieldRowSimple : ''}`}
      onClick={onClick}
    >
      {icon && <span className={s.fieldRowIcon}>{icon}</span>}
      <span className={s.fieldRowContent}>
        <span className={s.fieldRowLabel}>{label}</span>
        {value && <span className={s.fieldRowValue}>{value}</span>}
      </span>
      <ChevronRight size={20} className={s.fieldRowChevron} />
    </button>
  );
}

/* ═══════════════════════════════════════════
   BottomSheet — Edit field modal
   ═══════════════════════════════════════════ */

function BottomSheet({
  field,
  value,
  onChange,
  onSelectOption,
  onSave,
  onClose,
  saveLabel,
}: {
  field: EditField;
  value: string;
  onChange: (v: string) => void;
  onSelectOption: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
  saveLabel: string;
}) {
  return (
    <>
      <motion.div
        className={s.sheetOverlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className={s.sheetPanel}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className={s.sheetHandle} />
        <div className={s.sheetHeader}>
          <h3 className={s.sheetTitle}>{field.title}</h3>
          <button className={s.sheetClose} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={s.sheetBody}>
          {field.type === 'select' && field.options ? (
            <div className={s.sheetOptionList}>
              {field.options.map((opt) => (
                <button
                  key={opt.value}
                  className={`${s.sheetOption} ${
                    value === opt.value ? s.sheetOptionSelected : ''
                  }`}
                  onClick={() => onSelectOption(opt.value)}
                >
                  <span>{opt.label}</span>
                  {value === opt.value && (
                    <Check size={18} className={s.sheetOptionCheck} />
                  )}
                </button>
              ))}
            </div>
          ) : field.type === 'textarea' ? (
            <>
              <textarea
                className={s.sheetTextarea}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                maxLength={500}
                autoFocus
                rows={5}
              />
              <button className={s.sheetSaveBtn} onClick={onSave}>
                {saveLabel}
              </button>
            </>
          ) : (
            <>
              <input
                className={s.sheetInput}
                type={field.type === 'number' ? 'number' : 'text'}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                autoFocus
              />
              <button className={s.sheetSaveBtn} onClick={onSave}>
                {saveLabel}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}

/* ═══════════════════════════════════════════
   Profile Page
   ═══════════════════════════════════════════ */

export default function Profile() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isPremium } = usePremium();

  /* ── State ── */
  const [profileData, setProfileData] = useState<ProfileData>(() => {
    const saved = storage.load<ProfileData>(PROFILE_STORAGE_KEY);
    return saved ? { ...DEFAULT_PROFILE, ...saved } : { ...DEFAULT_PROFILE };
  });
  const [editingField, setEditingField] = useState<EditField | null>(null);
  const [editValue, setEditValue] = useState('');

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Delete
  const [deleting, setDeleting] = useState(false);

  // Photos
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Auth guard ── */
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  /* ── Persist profile to localStorage ── */
  useEffect(() => {
    storage.save(PROFILE_STORAGE_KEY, profileData);
  }, [profileData]);

  /* ── Load profile from Supabase ── */
  useEffect(() => {
    if (!user) return;
    const name = (user.user_metadata?.full_name as string) ?? '';
    setProfileData((prev) => ({ ...prev, name }));

    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('bio, avatar_url, photos')
          .eq('id', user.id)
          .single();
        if (data) {
          setProfileData((prev) => ({
            ...prev,
            about: data.bio ?? prev.about,
            photos: Array.isArray(data.photos) ? data.photos : prev.photos,
          }));
        }
      } catch {
        // Table not created yet
      }
    })();
  }, [user]);

  /* ── Progress ── */
  const progress = useMemo(() => {
    const filled = PROGRESS_FIELDS.filter(
      (k) => (profileData[k] as string).trim() !== '',
    ).length;
    return Math.round((filled / PROGRESS_FIELDS.length) * 100);
  }, [profileData]);

  const filledSegments = useMemo(
    () => Math.round((progress / 100) * TOTAL_SEGMENTS),
    [progress],
  );

  /* ── Select-field option maps ── */
  const lookingForOptions = useMemo(
    () => [
      { value: 'female', label: t('profile.fields.lookingForFemale') },
      { value: 'male', label: t('profile.fields.lookingForMale') },
      { value: 'any', label: t('profile.fields.lookingForAny') },
    ],
    [t],
  );

  const goalOptions = useMemo(
    () => [
      { value: 'serious', label: t('filters.goalSerious') },
      { value: 'friendship', label: t('filters.goalFriendship') },
      { value: 'flirt', label: t('filters.goalFlirt') },
      { value: 'undecided', label: t('filters.goalUndecided') },
    ],
    [t],
  );

  const educationOptions = useMemo(
    () => [
      { value: 'school', label: t('filters.eduSchool') },
      { value: 'college', label: t('filters.eduCollege') },
      { value: 'bachelor', label: t('filters.eduBachelor') },
      { value: 'master', label: t('filters.eduMaster') },
      { value: 'phd', label: t('filters.eduPhd') },
    ],
    [t],
  );

  const childrenOptions = useMemo(
    () => [
      { value: 'none', label: t('filters.childrenNone') },
      { value: 'has', label: t('filters.childrenHas') },
      { value: 'want', label: t('filters.childrenWant') },
      { value: 'dontWant', label: t('filters.childrenDontWant') },
    ],
    [t],
  );

  const smokingOptions = useMemo(
    () => [
      { value: 'no', label: t('filters.smokingNo') },
      { value: 'sometimes', label: t('filters.smokingSometimes') },
      { value: 'yes', label: t('filters.smokingYes') },
    ],
    [t],
  );

  const alcoholOptions = useMemo(
    () => [
      { value: 'no', label: t('filters.alcoholNo') },
      { value: 'sometimes', label: t('filters.alcoholSometimes') },
      { value: 'yes', label: t('filters.alcoholYes') },
    ],
    [t],
  );

  const bodyTypeOptions = useMemo(
    () => [
      { value: 'slim', label: t('filters.bodySlim') },
      { value: 'athletic', label: t('filters.bodyAthletic') },
      { value: 'average', label: t('filters.bodyAverage') },
      { value: 'curvy', label: t('filters.bodyCurvy') },
      { value: 'plus', label: t('filters.bodyPlus') },
    ],
    [t],
  );

  const wealthOptions = useMemo(
    () => [
      { value: 'stable', label: t('filters.wealthStable') },
      { value: 'average', label: t('filters.wealthAverage') },
      { value: 'wealthy', label: t('filters.wealthWealthy') },
    ],
    [t],
  );

  const livingOptions = useMemo(
    () => [
      { value: 'own', label: t('filters.livingOwn') },
      { value: 'rent', label: t('filters.livingRent') },
      { value: 'parents', label: t('filters.livingParents') },
    ],
    [t],
  );

  /* ── Resolve select value → human label ── */
  const getSelectLabel = useCallback(
    (key: keyof ProfileData, value: string): string => {
      if (!value) return '';
      const maps: Record<string, { value: string; label: string }[]> = {
        lookingFor: lookingForOptions,
        datingGoal: goalOptions,
        education: educationOptions,
        children: childrenOptions,
        smoking: smokingOptions,
        alcohol: alcoholOptions,
        bodyType: bodyTypeOptions,
        wealth: wealthOptions,
        living: livingOptions,
      };
      const list = maps[key];
      if (!list) return value;
      return list.find((o) => o.value === value)?.label ?? value;
    },
    [
      lookingForOptions,
      goalOptions,
      educationOptions,
      childrenOptions,
      smokingOptions,
      alcoholOptions,
      bodyTypeOptions,
      wealthOptions,
      livingOptions,
    ],
  );

  /* ── Open editor ── */
  const openEditor = useCallback(
    (field: EditField) => {
      setEditingField(field);
      setEditValue(profileData[field.key] as string);
    },
    [profileData],
  );

  /* ── Save text/number field ── */
  const saveField = useCallback(async () => {
    if (!editingField) return;
    const key = editingField.key;
    const trimmed = editValue.trim();

    /* Validation: name must not be empty */
    if (key === 'name' && trimmed.length === 0) {
      showToast(t('profile.toast.nameRequired'), 'warning');
      return;
    }

    /* Validation: numeric limits (age, height, weight) */
    const limits = FIELD_LIMITS[key];
    if (limits && trimmed !== '') {
      const num = Number(trimmed);
      if (Number.isNaN(num) || num < limits.min || num > limits.max) {
        showToast(
          t('profile.toast.valueLimits', { min: limits.min, max: limits.max }),
          'warning',
        );
        return;
      }
    }

    setProfileData((prev) => ({ ...prev, [key]: trimmed }));

    // Sync name / bio with Supabase
    if (user && (key === 'name' || key === 'about')) {
      try {
        if (key === 'name') {
          await supabase.auth.updateUser({ data: { full_name: editValue } });
          await supabase.from('profiles').upsert({
            id: user.id,
            display_name: editValue,
            updated_at: new Date().toISOString(),
          });
        } else {
          await supabase.from('profiles').upsert({
            id: user.id,
            bio: editValue,
            updated_at: new Date().toISOString(),
          });
        }
      } catch {
        /* silent */
      }
    }

    setEditingField(null);
    setEditValue('');
  }, [editingField, editValue, user, showToast, t]);

  /* ── Select option (auto-save) ── */
  const handleSelectOption = useCallback(
    (value: string) => {
      if (!editingField) return;
      setProfileData((prev) => ({ ...prev, [editingField.key]: value }));
      setEditingField(null);
      setEditValue('');
    },
    [editingField],
  );

  /* ── Close editor ── */
  const closeEditor = useCallback(() => {
    setEditingField(null);
    setEditValue('');
  }, []);

  /* ── Upload photo ── */
  const handleUploadPhoto = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // reset input so same file can be re-selected
      if (e.target) e.target.value = '';
      if (!file || !user) return;

      if (profileData.photos.length >= MAX_PHOTOS) {
        showToast(t('profile.photoLimit', { max: MAX_PHOTOS }), 'warning');
        return;
      }

      if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
        showToast(t('profile.photoInvalidType'), 'error');
        return;
      }

      if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
        showToast(
          t('profile.photoTooLarge', { max: MAX_PHOTO_SIZE_MB }),
          'error',
        );
        return;
      }

      setUploadingPhoto(true);
      try {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        const publicUrl = urlData.publicUrl;
        const newPhotos = [...profileData.photos, publicUrl];

        // If first photo → also set as avatar_url
        const isFirst = profileData.photos.length === 0;

        const { error: upsertError } = await supabase.from('profiles').upsert({
          id: user.id,
          photos: newPhotos,
          ...(isFirst ? { avatar_url: publicUrl } : {}),
          updated_at: new Date().toISOString(),
        });

        if (upsertError) throw upsertError;

        setProfileData((prev) => ({ ...prev, photos: newPhotos }));
        showToast(t('profile.photoUploaded'), 'success');
      } catch (err) {
        console.error('[Profile] photo upload error:', err);
        showToast(t('profile.photoUploadError'), 'error');
      } finally {
        setUploadingPhoto(false);
      }
    },
    [user, profileData.photos, showToast, t],
  );

  /* ── Delete photo ── */
  const handleDeletePhoto = useCallback(
    async (photoUrl: string) => {
      if (!user) return;
      if (!window.confirm(t('profile.deletePhoto') + '?')) return;

      try {
        // Extract storage path after "/avatars/"
        const marker = '/avatars/';
        const idx = photoUrl.indexOf(marker);
        if (idx !== -1) {
          const path = photoUrl.slice(idx + marker.length);
          await supabase.storage.from('avatars').remove([path]);
        }

        const newPhotos = profileData.photos.filter((p) => p !== photoUrl);
        const newAvatar = newPhotos[0] ?? null;

        await supabase.from('profiles').upsert({
          id: user.id,
          photos: newPhotos,
          avatar_url: newAvatar,
          updated_at: new Date().toISOString(),
        });

        setProfileData((prev) => ({ ...prev, photos: newPhotos }));
        showToast(t('profile.photoDeleted'), 'info');
      } catch (err) {
        console.error('[Profile] photo delete error:', err);
        showToast(t('profile.photoDeleteError'), 'error');
      }
    },
    [user, profileData.photos, showToast, t],
  );

  /* ── Change password ── */
  const handleChangePassword = useCallback(async () => {
    if (!newPassword) {
      showToast(t('profile.toast.enterNewPassword'), 'warning');
      return;
    }
    if (newPassword.length < 6) {
      showToast(t('profile.toast.passwordMinLength'), 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast(t('profile.toast.passwordsDontMatch'), 'error');
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      showToast(t('profile.toast.passwordChanged'), 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      showToast(t('profile.toast.passwordChangeError'), 'error');
    } finally {
      setSavingPassword(false);
    }
  }, [newPassword, confirmPassword, showToast, t]);

  /* ── Delete account ── */
  const handleDeleteAccount = useCallback(async () => {
    if (!user) return;
    const first = window.confirm(t('profile.confirm.deleteAccount1'));
    if (!first) return;
    const second = window.confirm(t('profile.confirm.deleteAccount2'));
    if (!second) return;

    setDeleting(true);
    try {
      await Promise.all([
        supabase.from('messages').delete().eq('user_id', user.id),
        supabase.from('likes').delete().eq('user_id', user.id),
        supabase.from('favorites').delete().eq('user_id', user.id),
        supabase.from('notifications').delete().eq('user_id', user.id),
        supabase.from('profiles').delete().eq('id', user.id),
      ]);
      await signOut();
      showToast(t('profile.toast.accountDeleted'), 'info');
      navigate('/auth', { replace: true });
    } catch {
      showToast(t('profile.toast.accountDeleteError'), 'error');
      setDeleting(false);
    }
  }, [user, signOut, showToast, navigate, t]);

  /* ═══════════════════════════════════════════
     Render
     ═══════════════════════════════════════════ */

  if (authLoading) {
    return (
      <div className={s.page}>
        <Navbar />
        <div className={s.loading}>
          <div className={s.spinner} />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <PageTransition>
      <div className={s.page}>
        <Navbar />

        <main className={s.main}>
          {/* ════════ Header ════════ */}
          <div className={s.header}>
            <div className={s.headerCenter}>
              <h1 className={s.headerTitle}>{t('profile.pageTitle')}</h1>
              <p className={s.headerSubtitle}>
                {t('profile.progress', { percent: String(progress) })}
              </p>
            </div>
            <div className={s.headerActions}>
              <button
                className={s.headerBtn}
                onClick={() => navigate('/settings')}
                aria-label={t('navbar.settings')}
              >
                <Settings size={22} />
              </button>
            </div>
          </div>

          {/* ════════ Progress bar ════════ */}
          <div className={s.progressBar}>
            {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => (
              <div
                key={i}
                className={`${s.progressSegment} ${
                  i < filledSegments ? s.progressSegmentFilled : ''
                }`}
              />
            ))}
          </div>

          {/* ════════ VIP Banner ════════ */}
          {!isPremium && (
            <button
              className={s.vipBanner}
              onClick={() => navigate('/premium')}
            >
              <Crown size={20} className={s.vipIcon} />
              <span className={s.vipText}>Lumina VIP</span>
            </button>
          )}

          {/* ════════ Photo Grid ════════ */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={handleUploadPhoto}
          />
          <div className={s.photoGrid}>
            {/* Main photo slot */}
            {profileData.photos[0] ? (
              <div className={s.photoMain}>
                <img
                  src={profileData.photos[0]}
                  alt=""
                  className={s.photoImg}
                />
                <button
                  type="button"
                  className={s.photoDeleteBtn}
                  onClick={() => handleDeletePhoto(profileData.photos[0])}
                  aria-label={t('profile.deletePhoto') as string}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={s.photoMain}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                <Plus size={32} className={s.photoPlaceholderIcon} />
              </button>
            )}

            {/* Small photo slot 1 */}
            {profileData.photos[1] ? (
              <div className={s.photoSmall}>
                <img
                  src={profileData.photos[1]}
                  alt=""
                  className={s.photoImg}
                />
                <button
                  type="button"
                  className={s.photoDeleteBtn}
                  onClick={() => handleDeletePhoto(profileData.photos[1])}
                  aria-label={t('profile.deletePhoto') as string}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={s.photoSmall}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                <Plus size={24} className={s.photoPlaceholderIcon} />
              </button>
            )}

            {/* Small photo slot 2 */}
            {profileData.photos[2] ? (
              <div className={s.photoSmall}>
                <img
                  src={profileData.photos[2]}
                  alt=""
                  className={s.photoImg}
                />
                <button
                  type="button"
                  className={s.photoDeleteBtn}
                  onClick={() => handleDeletePhoto(profileData.photos[2])}
                  aria-label={t('profile.deletePhoto') as string}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={s.photoSmall}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                <Plus size={24} className={s.photoPlaceholderIcon} />
              </button>
            )}
          </div>

          {/* Extra photos (slots 4-6) as a row below the grid */}
          {profileData.photos.length > 3 && (
            <div className={s.extraPhotosRow}>
              {profileData.photos.slice(3).map((url) => (
                <div key={url} className={s.extraPhoto}>
                  <img src={url} alt="" className={s.photoImg} />
                  <button
                    type="button"
                    className={s.photoDeleteBtn}
                    onClick={() => handleDeletePhoto(url)}
                    aria-label={t('profile.deletePhoto') as string}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ════════ Add Photo Button ════════ */}
          <button
            className={s.addPhotoBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto || profileData.photos.length >= MAX_PHOTOS}
          >
            <Camera size={18} />
            {uploadingPhoto
              ? t('profile.photoUploading')
              : profileData.photos.length >= MAX_PHOTOS
                ? t('profile.photoLimit', { max: MAX_PHOTOS })
                : t('profile.addPhoto')}
          </button>

          {/* ════════ Profile Fields ════════ */}
          <div className={s.fieldsSection}>
            {/* Name (simple — no icon) */}
            <FieldRow
              simple
              label={profileData.name || t('profile.fields.name')}
              onClick={() =>
                openEditor({
                  key: 'name',
                  title: t('profile.fields.name'),
                  type: 'text',
                })
              }
            />

            {/* Age (simple — no icon) */}
            <FieldRow
              simple
              label={
                profileData.age
                  ? `${profileData.age} ${t('profile.fields.years')}`
                  : t('profile.fields.birthday')
              }
              onClick={() =>
                openEditor({
                  key: 'age',
                  title: t('profile.fields.birthday'),
                  type: 'number',
                })
              }
            />

            {/* Location */}
            <FieldRow
              icon={<MapPin size={20} />}
              label={t('profile.fields.location')}
              value={profileData.city || undefined}
              onClick={() =>
                openEditor({
                  key: 'city',
                  title: t('profile.fields.location'),
                  type: 'text',
                })
              }
            />

            {/* About me — inline textarea */}
            <div className={s.aboutWrapper}>
              <textarea
                className={s.aboutTextarea}
                placeholder={t('profile.fields.aboutPlaceholder') as string}
                value={profileData.about}
                onChange={(e) =>
                  setProfileData((prev) => ({
                    ...prev,
                    about: e.target.value,
                  }))
                }
                onBlur={async () => {
                  if (user && profileData.about) {
                    try {
                      await supabase.from('profiles').upsert({
                        id: user.id,
                        bio: profileData.about,
                        updated_at: new Date().toISOString(),
                      });
                    } catch {
                      /* silent */
                    }
                  }
                }}
                maxLength={500}
              />
            </div>

            {/* Looking for */}
            <FieldRow
              icon={<Heart size={20} />}
              label={t('profile.fields.lookingFor')}
              value={
                getSelectLabel('lookingFor', profileData.lookingFor) ||
                undefined
              }
              onClick={() =>
                openEditor({
                  key: 'lookingFor',
                  title: t('profile.fields.lookingFor'),
                  type: 'select',
                  options: lookingForOptions,
                })
              }
            />

            {/* Age range */}
            <FieldRow
              icon={<Users size={20} />}
              label={t('profile.fields.ageRange')}
              value={profileData.ageRange || undefined}
              onClick={() =>
                openEditor({
                  key: 'ageRange',
                  title: t('profile.fields.ageRange'),
                  type: 'text',
                })
              }
            />

            {/* Dating goal */}
            <FieldRow
              icon={<Target size={20} />}
              label={t('profile.fields.datingGoal')}
              value={
                getSelectLabel('datingGoal', profileData.datingGoal) ||
                undefined
              }
              onClick={() =>
                openEditor({
                  key: 'datingGoal',
                  title: t('profile.fields.datingGoal'),
                  type: 'select',
                  options: goalOptions,
                })
              }
            />

            {/* Education */}
            <FieldRow
              icon={<GraduationCap size={20} />}
              label={t('profile.fields.education')}
              value={
                getSelectLabel('education', profileData.education) || undefined
              }
              onClick={() =>
                openEditor({
                  key: 'education',
                  title: t('profile.fields.education'),
                  type: 'select',
                  options: educationOptions,
                })
              }
            />

            {/* Work */}
            <FieldRow
              icon={<Briefcase size={20} />}
              label={t('profile.fields.work')}
              value={profileData.work || undefined}
              onClick={() =>
                openEditor({
                  key: 'work',
                  title: t('profile.fields.work'),
                  type: 'text',
                })
              }
            />

            {/* Languages */}
            <FieldRow
              icon={<Globe size={20} />}
              label={t('profile.fields.languages')}
              value={profileData.languages || undefined}
              onClick={() =>
                openEditor({
                  key: 'languages',
                  title: t('profile.fields.languages'),
                  type: 'text',
                })
              }
            />

            {/* Interests */}
            <FieldRow
              icon={<Hash size={20} />}
              label={t('profile.fields.interests')}
              value={profileData.interests || undefined}
              onClick={() =>
                openEditor({
                  key: 'interests',
                  title: t('profile.fields.interests'),
                  type: 'text',
                })
              }
            />

            {/* Wealth */}
            <FieldRow
              icon={<DollarSign size={20} />}
              label={t('profile.fields.wealth')}
              value={
                getSelectLabel('wealth', profileData.wealth) || undefined
              }
              onClick={() =>
                openEditor({
                  key: 'wealth',
                  title: t('profile.fields.wealth'),
                  type: 'select',
                  options: wealthOptions,
                })
              }
            />

            {/* Living */}
            <FieldRow
              icon={<Home size={20} />}
              label={t('profile.fields.living')}
              value={
                getSelectLabel('living', profileData.living) || undefined
              }
              onClick={() =>
                openEditor({
                  key: 'living',
                  title: t('profile.fields.living'),
                  type: 'select',
                  options: livingOptions,
                })
              }
            />

            {/* Children */}
            <FieldRow
              icon={<Heart size={20} />}
              label={t('profile.fields.children')}
              value={
                getSelectLabel('children', profileData.children) || undefined
              }
              onClick={() =>
                openEditor({
                  key: 'children',
                  title: t('profile.fields.children'),
                  type: 'select',
                  options: childrenOptions,
                })
              }
            />

            {/* Smoking */}
            <FieldRow
              icon={<Flame size={20} />}
              label={t('profile.fields.smoking')}
              value={
                getSelectLabel('smoking', profileData.smoking) || undefined
              }
              onClick={() =>
                openEditor({
                  key: 'smoking',
                  title: t('profile.fields.smoking'),
                  type: 'select',
                  options: smokingOptions,
                })
              }
            />

            {/* Alcohol */}
            <FieldRow
              icon={<Wine size={20} />}
              label={t('profile.fields.alcohol')}
              value={
                getSelectLabel('alcohol', profileData.alcohol) || undefined
              }
              onClick={() =>
                openEditor({
                  key: 'alcohol',
                  title: t('profile.fields.alcohol'),
                  type: 'select',
                  options: alcoholOptions,
                })
              }
            />

            {/* Travel */}
            <FieldRow
              icon={<Plane size={20} />}
              label={t('profile.fields.travel')}
              value={profileData.travel || undefined}
              onClick={() =>
                openEditor({
                  key: 'travel',
                  title: t('profile.fields.travel'),
                  type: 'text',
                })
              }
            />

            {/* Appearance */}
            <FieldRow
              icon={<Sparkles size={20} />}
              label={t('profile.fields.appearance')}
              value={profileData.appearance || undefined}
              onClick={() =>
                openEditor({
                  key: 'appearance',
                  title: t('profile.fields.appearance'),
                  type: 'text',
                })
              }
            />

            {/* Body type */}
            <FieldRow
              icon={<Activity size={20} />}
              label={t('profile.fields.bodyType')}
              value={
                getSelectLabel('bodyType', profileData.bodyType) || undefined
              }
              onClick={() =>
                openEditor({
                  key: 'bodyType',
                  title: t('profile.fields.bodyType'),
                  type: 'select',
                  options: bodyTypeOptions,
                })
              }
            />

            {/* Height */}
            <FieldRow
              icon={<Ruler size={20} />}
              label={t('profile.fields.height')}
              value={
                profileData.height
                  ? `${profileData.height} ${t('filters.cm')}`
                  : undefined
              }
              onClick={() =>
                openEditor({
                  key: 'height',
                  title: t('profile.fields.height'),
                  type: 'number',
                })
              }
            />

            {/* Weight */}
            <FieldRow
              icon={<Activity size={20} />}
              label={t('profile.fields.weight')}
              value={
                profileData.weight
                  ? `${profileData.weight} ${t('filters.kg')}`
                  : undefined
              }
              onClick={() =>
                openEditor({
                  key: 'weight',
                  title: t('profile.fields.weight'),
                  type: 'number',
                })
              }
            />
          </div>

          {/* ════════ Change Password ════════ */}
          <div className={s.section}>
            <h3 className={s.sectionTitle}>
              <Lock
                size={18}
                style={{ verticalAlign: 'middle', marginRight: 8 }}
              />
              {t('profile.password.title')}
            </h3>
            <div className={s.formGroup}>
              <Input
                label={t('profile.password.newPasswordLabel') as string}
                type="password"
                placeholder={
                  t('profile.password.newPasswordPlaceholder') as string
                }
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Input
                label={t('profile.password.confirmLabel') as string}
                type="password"
                placeholder={
                  t('profile.password.confirmPlaceholder') as string
                }
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <div className={s.saveRow}>
                <Button
                  onClick={handleChangePassword}
                  loading={savingPassword}
                  icon={<Lock size={16} />}
                >
                  {t('profile.password.changeBtn')}
                </Button>
              </div>
            </div>
          </div>

          {/* ════════ Danger Zone ════════ */}
          <div className={s.dangerZone}>
            <h3 className={s.dangerTitle}>
              <AlertTriangle size={18} />
              {t('profile.dangerZone.title')}
            </h3>
            <p className={s.dangerText}>
              {t('profile.dangerZone.description')}
            </p>
            <button
              className={s.dangerBtn}
              onClick={handleDeleteAccount}
              disabled={deleting}
            >
              <Trash2
                size={14}
                style={{ verticalAlign: 'middle', marginRight: 6 }}
              />
              {deleting
                ? t('profile.dangerZone.deletingBtn')
                : t('profile.dangerZone.deleteBtn')}
            </button>
          </div>
        </main>

        {/* ════════ BottomSheet ════════ */}
        <AnimatePresence>
          {editingField && (
            <BottomSheet
              field={editingField}
              value={editValue}
              onChange={setEditValue}
              onSelectOption={handleSelectOption}
              onSave={saveField}
              onClose={closeEditor}
              saveLabel={t('common.save')}
            />
          )}
        </AnimatePresence>

        <ToastContainer />
      </div>
    </PageTransition>
  );
}
