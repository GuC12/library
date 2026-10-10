import { LibraryBrandIcon } from '@/components/library-brand-icon';
import { useClerk, useUser } from '@clerk/react';
import { Camera, Check, LogOut, RotateCcw, Trash2, UserRound } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useLanguage } from '@/lib/i18n';
import { DEFAULT_AVATAR, useUserProfile } from '@/lib/user-profile';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

export function UserPortalPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const { nickname, avatar, updateProfile, saveAvatarFile, resetAvatar, isSaving } = useUserProfile();

  const [inputNickname, setInputNickname] = useState(nickname);
  const [profileSaved, setProfileSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Синхронизируем input с загруженным никнеймом
  useEffect(() => {
    if (nickname) {
      setInputNickname(nickname);
    }
  }, [nickname]);

  if (!isLoaded) {
    return (
      <main className="gate-noise flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--background))] px-5">
        <div className="w-full max-w-md text-center" data-testid="status-loading-account">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-[hsl(var(--card))] shadow-[0_16px_40px_hsl(33.5_37.8%_17.6%/.2)]">
            <LibraryBrandIcon className="h-14 w-12" />
          </div>
           <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--accent-foreground))]">{t('account')}</p>
           <h1 className="mt-4 font-serif text-4xl font-semibold tracking-[-0.03em] text-[hsl(var(--foreground))]">{t('checkingShelf')}</h1>
           <p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">{t('moment')}</p>
        </div>
      </main>
    );
  }

  const handleSignOut = async () => {
    await signOut({ redirectUrl: `${window.location.origin}${basePath}/sign-up` });
    setLocation('/sign-up');
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrorMessage('');
    const res = await saveAvatarFile(file);
    if (res.success) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2200);
    } else {
      setErrorMessage(res.error === 'nicknameTaken' ? t('nicknameTaken') : t('avatarSaveError'));
      setTimeout(() => setErrorMessage(''), 3500);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResetAvatar = async () => {
    setErrorMessage('');
    const res = await resetAvatar();
    if (res.success) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2200);
    }
  };

  const handleSaveNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const nextNick = inputNickname.trim() || nickname;
    const res = await updateProfile(nextNick, avatar);
    if (res.success) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2200);
    } else {
      setErrorMessage(res.error === 'nicknameTaken' ? t('nicknameTaken') : t('profileSaveError'));
      setTimeout(() => setErrorMessage(''), 3500);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm(t('deleteAccountConfirm'))) return;
    try {
      if (user) {
        await user.delete();
      }
      window.localStorage.clear();
      window.location.href = `${window.location.origin}${basePath}/sign-up`;
    } catch (err) {
      console.error(err);
      window.localStorage.clear();
      await signOut({ redirectUrl: `${window.location.origin}${basePath}/sign-up` });
      setLocation('/sign-up');
    }
  };

  return (
    <main className="gate-noise flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--background))] px-5 py-12">
      <div className="w-full max-w-2xl rounded-[2rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 shadow-[var(--shadow-md)] sm:p-10" data-testid="account-choice">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-[14px] transition-transform hover:scale-105" title={t('backHome')}>
            <LibraryBrandIcon className="h-11 w-10" />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">{t('brand')} / {t('account')}</span>
          </div>
        </div>

        {/* Секция настройки профиля (аватарка и никнейм) */}
        <div className="mt-8 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.35)] p-5">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative group">
              <img
                src={avatar || DEFAULT_AVATAR}
                alt={nickname}
                className="h-20 w-20 rounded-full object-cover border-2 border-[hsl(var(--accent))] shadow-md"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title={t('uploadAvatar')}
              >
                <Camera className="h-6 w-6" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-xs font-bold rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 bg-[hsl(var(--card))] hover:bg-[hsl(var(--secondary))] transition-colors"
                >
                  <Camera className="h-3.5 w-3.5" />
                  {t('uploadAvatar')}
                </button>
                <button
                  type="button"
                  onClick={handleResetAvatar}
                  className="inline-flex items-center gap-1.5 text-xs font-bold rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t('defaultAvatar')}
                </button>
              </div>

              <form onSubmit={handleSaveNickname} className="mt-3 flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={inputNickname}
                    onChange={(e) => setInputNickname(e.target.value)}
                    placeholder={t('nickname')}
                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 py-2 text-sm font-semibold outline-none focus:border-[hsl(var(--accent))]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSaving ? '...' : profileSaved ? <Check className="h-4 w-4" /> : t('saveProfile')}
                </button>
              </form>
            </div>
          </div>
          {errorMessage && (
            <p className="mt-2 text-xs text-center sm:text-left text-red-500 font-semibold">
              {errorMessage}
            </p>
          )}
          {profileSaved && (
            <p className="mt-2 text-xs text-center sm:text-left text-[hsl(var(--primary))] font-bold">
              ✓ {t('profileSaved')}
            </p>
          )}
        </div>

        <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--accent-foreground))]">{t('accessVerified')}</p>
        <h1 className="mt-2 max-w-xl font-serif text-4xl font-semibold leading-[.95] tracking-[-0.03em] text-[hsl(var(--foreground))] sm:text-5xl">{t('whereRead')}</h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          {t('signedInAs')} <span className="font-bold text-[hsl(var(--foreground))]">{nickname}</span> ({user?.primaryEmailAddress?.emailAddress ?? 'reader'}). {t('chooseLibrary')}
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link href="/library" className="group inline-flex items-center justify-center gap-3 rounded-full bg-[hsl(var(--primary))] px-5 py-3.5 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]" data-testid="link-open-library">
            {t('openLibrary')}
            <LibraryBrandIcon className="h-5 w-5 rounded-sm bg-[hsl(var(--card))] p-0.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link href="/" className="inline-flex items-center justify-center gap-3 rounded-full border border-[hsl(var(--border))] px-5 py-3.5 text-sm font-bold text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--secondary)/.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]" data-testid="button-stay-here">
            {t('stayOnSite')}
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[hsl(var(--border))] pt-5">
          <button
            type="button"
            onClick={handleDeleteAccount}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            title={t('deleteAccount')}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('deleteAccount')}
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] px-4 py-2.5 text-xs font-bold text-[hsl(4_63%_46%)] transition-colors hover:bg-[hsl(4_63%_46%/.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]"
            data-testid="button-sign-out-portal"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            {t('signOutAccount')}
          </button>
        </div>
      </div>
    </main>
  );
}