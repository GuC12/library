# Библиотека

Сайт: https://guc12.github.io/library/

React-приложение с каталогом книг, книжной читалкой, профилями и достижениями.
Авторизация работает через Clerk, облачные данные — через Supabase.

## Локальный запуск

1. Установите Node.js 24 и pnpm 10.
2. Выполните `pnpm install --frozen-lockfile`.
3. Скопируйте `artifacts/auth-redirect-site/.env.example` в `.env` в той же папке и заполните клиентские настройки.
4. Выполните `pnpm start:site`.

## Публикация

Каждый push в `main` запускает `.github/workflows/pages.yml`.
В настройках GitHub Pages выбран источник GitHub Actions.
Клиентские настройки сборки хранятся в Repository Actions Variables:

- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Это публичные настройки браузерного приложения. Не используйте здесь Clerk secret key или Supabase service-role key.
В Clerk должен быть разрешён адрес сайта. Для полноценного публичного запуска используйте production instance Clerk.

GitHub Pages размещает статический интерфейс. Код из `artifacts/api-server` там не запускается.
Приложение обращается к Clerk и Supabase напрямую. Настройка базы описана в SQL-файлах в `artifacts/auth-redirect-site`.
