# Supabase Edge Functions

## chat-ai — прокси к Groq

Функция принимает `{ messages, system_prompt }` и вызывает Groq
(`llama-3.1-8b-instant`). Ключ хранится только в серверных secrets, на фронт
не попадает.

### Переменные окружения

В **Supabase Dashboard → Project Settings → Edge Functions → Secrets** добавить:

```
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Деплой через Supabase CLI (рекомендуется)

1. Установить CLI (если ещё нет):
   ```powershell
   npm i -g supabase
   ```
2. Войти:
   ```powershell
   supabase login
   ```
3. Привязать проект (один раз, из корня репо):
   ```powershell
   supabase link --project-ref rfmcpnpdqbhecwtodyaz
   ```
4. Задеплоить функцию:
   ```powershell
   supabase functions deploy chat-ai --no-verify-jwt
   ```
   > `--no-verify-jwt` оставлено на время отладки. Когда всё заработает —
   > убери флаг, и Supabase сам будет проверять токен пользователя.

5. Прописать secret (если ещё не сделано через Dashboard):
   ```powershell
   supabase secrets set GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### Деплой через Dashboard (альтернатива)

1. Открой Dashboard → **Edge Functions** → **Create a new function**.
2. Имя: `chat-ai`.
3. Вставь содержимое `index.ts`.
4. Перед деплоем добавь secret `GROQ_API_KEY` в **Project Settings → Edge
   Functions → Secrets**.
5. Нажми **Deploy**.

### Проверка

```powershell
curl -X POST https://rfmcpnpdqbhecwtodyaz.supabase.co/functions/v1/chat-ai `
  -H "Authorization: Bearer <VITE_SUPABASE_ANON_KEY>" `
  -H "Content-Type: application/json" `
  -d '{"messages":[{"role":"user","content":"Привет"}],"system_prompt":"Ты дружелюбная девушка 25 лет."}'
```

Ожидаемый ответ:

```json
{ "reply": "Привет! Как дела?", "model": "llama-3.1-8b-instant", "usage": {...} }
```
