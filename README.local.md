# Локальный запуск сайта

Коротко: установите Node.js и pnpm, скопируйте `.env.example` в `.env`, впишите ключ Clerk и выполните `pnpm install && pnpm start:site`.

## 1. Node.js

Скачайте LTS-версию с [nodejs.org](https://nodejs.org/) и установите её. Проверка в терминале:

```bash
node -v
```

Нужна версия 20 или новее.

## 2. pnpm

В том же терминале:

```bash
npm install -g pnpm
pnpm -v
```

## 3. Ключ Clerk

В папке `artifacts/auth-redirect-site` скопируйте пример окружения и откройте получившийся файл:

```bash
cp artifacts/auth-redirect-site/.env.example artifacts/auth-redirect-site/.env
```

На Windows в PowerShell:

```powershell
Copy-Item artifacts/auth-redirect-site/.env.example artifacts/auth-redirect-site/.env
```

Откройте `artifacts/auth-redirect-site/.env` и замените значение `VITE_CLERK_PUBLISHABLE_KEY` на свой ключ с [dashboard.clerk.com](https://dashboard.clerk.com) (раздел API Keys → Publishable key).

Без этого ключа сайт всё равно запустится, но вместо приложения покажет подсказку для разработчика.

## 4. Установка и запуск

Из корня репозитория:

```bash
pnpm install && pnpm start:site
```

После старта Vite откройте в браузере адрес из терминала. По умолчанию это [http://localhost:24247/](http://localhost:24247/). Переменные `PORT` и `BASE_PATH` задавать не обязательно.

Скрипт `scripts/post-merge.sh` нужен только на Replit и при обычной установке на компьютере не запускается.
