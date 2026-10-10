# Supabase для Forma

Без ключей приложение работает в локальном режиме (данные только на устройстве).
Синхронизация телефон ↔ ноутбук включается, когда заданы две переменные окружения.

## 1. Проект

1. [supabase.com](https://supabase.com) → **New project**, регион EU (Frankfurt). Пароль БД сохранить в менеджере паролей.
2. **SQL Editor → New query** → вставить содержимое `supabase/migrations/0001_init.sql` → **Run**.
   Должно появиться 8 таблиц с включённым RLS и политикой `own rows`.

## 2. Вход по коду (email OTP)

1. **Authentication → Providers → Email**: включён.
2. **Authentication → Email Templates**: в двух шаблонах — **Confirm signup** и **Magic Link** — заменить `{{ .ConfirmationURL }}` на `{{ .Token }}`.
   Тогда письмо содержит 6-значный код, а не ссылку. Приложение вводит код через `verifyOtp`.
   Первое письмо новому адресу уходит по шаблону Confirm signup, поэтому без правки обоих первый вход придёт ссылкой.
3. **Authentication → Settings**: срок жизни OTP (`Email OTP Expiration`) выставить 600 секунд.
4. **Authentication → URL Configuration → Site URL**: `https://yankeez2505.github.io/forma/`.

Встроенная почта Supabase шлёт письма только участникам проекта и с лимитом в несколько писем в час.
Для себя этого хватает. Перед вторым пользователем нужен свой SMTP (Resend или Brevo) в **Project Settings → Auth → SMTP**.

## 3. Ключи

**Project Settings → API**: `Project URL` и `anon public` key.

Локально — файл `.env` в корне (в git не попадает):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Деплой — GitHub → репозиторий `forma` → **Settings → Secrets and variables → Actions → New repository secret**:
`VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`. После этого перезапустить workflow `deploy`
(**Actions → deploy → Run workflow**).

## 4. Keep-alive

Бесплатный проект засыпает после 7 дней без запросов. Workflow `.github/workflows/keepalive.yml`
раз в день делает один запрос к REST API с теми же секретами. Без секретов шаг пропускается.
