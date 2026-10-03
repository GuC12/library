import { useUser } from '@clerk/react';
import { useEffect, useRef, useState } from 'react';
import { processAndUploadAvatar } from './avatar-utils';
import {
  fetchRemoteProfile,
  fetchRemoteReader,
  isNicknameAvailable,
  saveRemoteProfile,
  updateAuthorInCommunityBooks,
  upsertRemoteReader,
  type UserProfileRow,
} from './supabase';
import { getStoredReadingStats, readerRecordFromStats } from './reading-system';

export const DEFAULT_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <circle cx="50" cy="50" r="50" fill="#3E2F1C"/>
  <circle cx="50" cy="38" r="18" fill="#D9C7AA"/>
  <path d="M22 84C22 68 34 58 50 58C66 58 78 68 78 84" fill="#B1844D"/>
  <circle cx="44" cy="36" r="2" fill="#2D2418"/>
  <circle cx="56" cy="36" r="2" fill="#2D2418"/>
  <path d="M46 43C46 43 48 45 50 45C52 45 54 43 54 43" stroke="#2D2418" stroke-width="2" stroke-linecap="round"/>
</svg>
`)}`;

export interface UserProfileData {
  nickname: string;
  avatar: string;
}

export function getUserNicknameKey(userId?: string): string {
  return userId ? `library_user_nickname_${userId}` : 'library_user_nickname';
}

export function getUserAvatarKey(userId?: string): string {
  return userId ? `library_user_avatar_${userId}` : 'library_user_avatar';
}

export function getStoredProfile(clerkUser?: ReturnType<typeof useUser>['user']): UserProfileData {
  let nickname = '';
  let avatar = '';
  const userId = clerkUser?.id;

  if (typeof window !== 'undefined') {
    // Сначала пробуем ключ с привязкой к аккаунту
    if (userId) {
      nickname = window.localStorage.getItem(getUserNicknameKey(userId)) || '';
      avatar = window.localStorage.getItem(getUserAvatarKey(userId)) || '';
    }
    // Если пусто — fallback на старый общий ключ (для обратной совместимости)
    if (!nickname) {
      nickname = window.localStorage.getItem('library_user_nickname') || '';
    }
    if (!avatar) {
      avatar = window.localStorage.getItem('library_user_avatar') || '';
    }
  }

  if (!nickname) {
    nickname =
      clerkUser?.username ||
      clerkUser?.firstName ||
      clerkUser?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
      'Читатель';
  }

  if (!avatar) {
    avatar = clerkUser?.imageUrl || DEFAULT_AVATAR;
  }

  return { nickname, avatar };
}

export function saveStoredProfile(profile: Partial<UserProfileData>, userId?: string) {
  if (typeof window === 'undefined') return;

  try {
    if (profile.nickname !== undefined) {
      if (userId) {
        window.localStorage.setItem(getUserNicknameKey(userId), profile.nickname);
      }
      window.localStorage.setItem('library_user_nickname', profile.nickname);
    }
    if (profile.avatar !== undefined) {
      if (userId) {
        window.localStorage.setItem(getUserAvatarKey(userId), profile.avatar);
      }
      window.localStorage.setItem('library_user_avatar', profile.avatar);
    }
  } catch (err) {
    console.warn('LocalStorage save error (possibly quota):', err);
  }

  window.dispatchEvent(
    new CustomEvent('library-profile-changed', {
      detail: { userId, ...profile },
    })
  );
}

export function useUserProfile() {
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState<UserProfileData>(() => getStoredProfile(user));
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const remoteLoadedForRef = useRef<string | null>(null);

  // Синхронизация локального состояния при смене Clerk user
  useEffect(() => {
    if (!user?.id) {
      setProfile(getStoredProfile(user));
      return;
    }

    // Если аккаунт сменился, сбрасываем флаг загрузки
    if (remoteLoadedForRef.current !== user.id) {
      setProfile(getStoredProfile(user));
    }
  }, [user, isLoaded]);

  // Загрузка сохранённого профиля из Supabase при авторизации
  useEffect(() => {
    if (!user?.id || remoteLoadedForRef.current === user.id) return;

    let isMounted = true;
    setIsLoadingRemote(true);

    async function loadCloudProfile() {
      try {
        const userId = user!.id;
        // Запрашиваем профиль из таблицы user_profiles
        let remote: UserProfileRow | null = await fetchRemoteProfile(userId);

        // Если в user_profiles нет, проверяем в reader_stats
        if (!remote) {
          const reader = await fetchRemoteReader(userId);
          if (reader && reader.nickname) {
            remote = {
              user_id: userId,
              nickname: reader.nickname,
              avatar: reader.avatar,
            };
          }
        }

        if (!isMounted) return;

        if (remote) {
          const cloudNickname = remote.nickname || profile.nickname;
          const cloudAvatar = remote.avatar || profile.avatar || DEFAULT_AVATAR;

          const updated: UserProfileData = {
            nickname: cloudNickname,
            avatar: cloudAvatar,
          };

          setProfile(updated);
          saveStoredProfile(updated, userId);
        } else {
          // Если пользователя в облаке ещё нет, сохраняем его начальный профиль
          const initialNickname =
            user!.username ||
            user!.firstName ||
            user!.primaryEmailAddress?.emailAddress?.split('@')[0] ||
            'Читатель';
          const initialAvatar = user!.imageUrl || DEFAULT_AVATAR;

          const initialProfile: UserProfileData = {
            nickname: initialNickname,
            avatar: initialAvatar,
          };

          try {
            await saveRemoteProfile({
              user_id: userId,
              nickname: initialNickname,
              avatar: initialAvatar,
            });

            const stats = getStoredReadingStats();
            await upsertRemoteReader(
              readerRecordFromStats(userId, initialNickname, initialAvatar, stats, 0)
            );
          } catch (initErr) {
            console.warn('Initial profile sync warning:', initErr);
          }

          if (isMounted) {
            setProfile(initialProfile);
            saveStoredProfile(initialProfile, userId);
          }
        }
      } catch (err) {
        console.warn('Failed to load cloud profile:', err);
      } finally {
        if (isMounted) {
          remoteLoadedForRef.current = user!.id;
          setIsLoadingRemote(false);
        }
      }
    }

    loadCloudProfile();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Слушатель локальных изменений между вкладками и компонентами
  useEffect(() => {
    const handleProfileChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ userId?: string; nickname?: string; avatar?: string }>;
      if (customEvent.detail && customEvent.detail.userId && user?.id && customEvent.detail.userId !== user.id) {
        return;
      }
      setProfile(getStoredProfile(user));
    };

    window.addEventListener('library-profile-changed', handleProfileChange);
    return () => window.removeEventListener('library-profile-changed', handleProfileChange);
  }, [user]);

  /**
   * Обновляет профиль (никнейм и аватарку) локально и в облаке Supabase:
   * 1. Проверяет уникальность никнейма в Supabase
   * 2. Сохраняет в LocalStorage с привязкой к userId
   * 3. Сохраняет в Supabase user_profiles
   * 4. Обновляет reader_stats (рейтинг читателей)
   * 5. Обновляет имя и аватар автора в опубликованных книгах
   */
  const updateProfile = async (
    nextNickname: string,
    nextAvatar: string,
    syncRemote = true
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmedNick = nextNickname.trim() || profile.nickname;
    const finalAvatar = nextAvatar || profile.avatar || DEFAULT_AVATAR;

    // Сразу сохраняем локально для мгновенной реакции UI
    saveStoredProfile({ nickname: trimmedNick, avatar: finalAvatar }, user?.id);
    setProfile({ nickname: trimmedNick, avatar: finalAvatar });

    if (!syncRemote || !user?.id) {
      return { success: true };
    }

    setIsSaving(true);
    try {
      // Проверяем занятость никнейма, если он изменился
      if (trimmedNick !== profile.nickname) {
        const available = await isNicknameAvailable(trimmedNick, user.id);
        if (!available) {
          // Откатываем обратно
          saveStoredProfile({ nickname: profile.nickname, avatar: finalAvatar }, user.id);
          setProfile({ nickname: profile.nickname, avatar: finalAvatar });
          setIsSaving(false);
          return { success: false, error: 'nicknameTaken' };
        }
      }

      // Сохраняем в user_profiles
      await saveRemoteProfile({
        user_id: user.id,
        nickname: trimmedNick,
        avatar: finalAvatar,
      });

      // Обновляем статистику читателя
      const stats = getStoredReadingStats();
      await upsertRemoteReader(
        readerRecordFromStats(user.id, trimmedNick, finalAvatar, stats, 0)
      );

      // Обновляем автора на книгах пользователя
      await updateAuthorInCommunityBooks(user.id, trimmedNick, finalAvatar);

      setIsSaving(false);
      return { success: true };
    } catch (err: unknown) {
      console.error('Failed to sync profile to Supabase:', err);
      setIsSaving(false);
      const errorMessage = err instanceof Error ? err.message : 'saveError';
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Сжимает изображение в квадратный 256x256 (~20 КБ),
   * загружает в Storage (или использует безопасный dataUrl fallback)
   * и сохраняет в профиле.
   */
  const saveAvatarFile = async (file: File): Promise<{ success: boolean; avatarUrl?: string; error?: string }> => {
    if (!file) return { success: false, error: 'noFile' };

    setIsSaving(true);
    try {
      const avatarUrl = await processAndUploadAvatar(file, user?.id || 'guest');
      const result = await updateProfile(profile.nickname, avatarUrl, Boolean(user?.id));
      setIsSaving(false);
      return { success: result.success, avatarUrl, error: result.error };
    } catch (err: unknown) {
      console.error('Failed to process/upload avatar:', err);
      setIsSaving(false);
      const errorMessage = err instanceof Error ? err.message : 'avatarUploadFailed';
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Сбрасывает аватарку на стандартную
   */
  const resetAvatar = async (): Promise<{ success: boolean; error?: string }> => {
    return updateProfile(profile.nickname, DEFAULT_AVATAR, Boolean(user?.id));
  };

  const isDefault = !profile.avatar || profile.avatar === DEFAULT_AVATAR;

  return {
    nickname: profile.nickname,
    avatar: profile.avatar || DEFAULT_AVATAR,
    isDefaultAvatar: isDefault,
    isLoadingRemote,
    isSaving,
    updateProfile,
    saveAvatarFile,
    resetAvatar,
    user,
  };
}
