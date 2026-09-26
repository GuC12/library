import { useUser } from '@clerk/react';
import { useEffect, useState } from 'react';

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

const NICKNAME_KEY = 'library_user_nickname';
const AVATAR_KEY = 'library_user_avatar';

export function getStoredProfile(clerkUser?: ReturnType<typeof useUser>['user']): UserProfileData {
  let nickname = '';
  let avatar = '';

  if (typeof window !== 'undefined') {
    nickname = window.localStorage.getItem(NICKNAME_KEY) || '';
    avatar = window.localStorage.getItem(AVATAR_KEY) || '';
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

export function saveStoredProfile(profile: Partial<UserProfileData>) {
  if (typeof window === 'undefined') return;

  if (profile.nickname !== undefined) {
    window.localStorage.setItem(NICKNAME_KEY, profile.nickname);
  }
  if (profile.avatar !== undefined) {
    window.localStorage.setItem(AVATAR_KEY, profile.avatar);
  }

  window.dispatchEvent(new Event('library-profile-changed'));
}

export function useUserProfile() {
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState<UserProfileData>(() => getStoredProfile(user));

  useEffect(() => {
    setProfile(getStoredProfile(user));
  }, [user, isLoaded]);

  useEffect(() => {
    const handleProfileChange = () => {
      setProfile(getStoredProfile(user));
    };

    window.addEventListener('library-profile-changed', handleProfileChange);
    return () => window.removeEventListener('library-profile-changed', handleProfileChange);
  }, [user]);

  const updateProfile = (nickname: string, avatar: string) => {
    saveStoredProfile({ nickname, avatar });
    setProfile({ nickname, avatar });
  };

  const isDefault = !profile.avatar || profile.avatar === DEFAULT_AVATAR;

  return {
    nickname: profile.nickname,
    avatar: profile.avatar || DEFAULT_AVATAR,
    isDefaultAvatar: isDefault,
    updateProfile,
    user,
  };
}

