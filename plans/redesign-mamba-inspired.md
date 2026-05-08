# Lumina — План редизайна по мотивам Mamba

> **Статус:** Stage 3 Landing — итерация 3 завершена ✅. Build green, утечек нет.
> **Дата:** 2026-05-02 (третья итерация Landing — гибрид Mamba × Lumina)
> **Автор плана:** OpenCode
> **Цель:** перенести лучшие UX/UI решения Mamba в Lumina, **сохранив нашу фирменную палитру** (purple `#8B5CF6` → pink `#EC4899`) и адаптировав «белый» язык Mamba под наши тёмно-фиолетовые / светло-лавандовые градиенты.

---

## 📜 Changelog Stage 3 Landing

### Iter 3 (2026-05-02) — Mamba × Lumina hybrid
**Решения владельца:**
- Видеозвонки — убраны полностью (нет в feature-секциях, нет упоминаний).
- Изображения — детальные промпты для Grok Image (англ. UI), файлы кладутся в `src/assets/landing/`.
- Цвета — Lumina brand-gradient остаётся.
- AI/бот-упоминания — на лендинге 0. Раскрытие природы сервиса перенесено в Terms of Service (pre-signup disclosure через клик на CTA).
- FAQ — удалена секция полностью.
- Структура — Hero (тёмный, Lumina) + HowItWorks (мост, 3 принципа Lumina) + 4 светлых пастельных feature-секции (Mamba-структура: текст / phone+fluffy, чередование) + Manifesto (тёмный мост) + FinalCTA (тёмный).

**Удалено:**
- `FaqSection.{tsx,module.css}`
- `SocialProofSection.{tsx,module.css}`
- `MockupsSection.{tsx,module.css}` (заменены 4 feature-секции, у каждой свой phone)
- `PhoneScreens.{tsx,module.css}` (зависимость MockupsSection)

**Добавлено:**
- `FeatureSection.{tsx,module.css}` — переиспользуемая Mamba-секция (props: side / bg / phone / fluffy / cta), wave-разделители через CSS mask, чередование через `data-side`.
- `SafetySection.tsx` — light blue (#DBEEFF), text-right.
- `SearchSection.tsx` — white, text-left.
- `ChatSection.tsx` — pink (#FBDFEC), text-right.
- `FreedomSection.tsx` — lavender (#EDE3FF), text-left.
- `ManifestoSection.{tsx,module.css}` — тёмный мост, 4 строки-принципа Lumina с gradient-акцентами.

**Image-промпты (англ., для Grok Image):** см. чат от 2026-05-02. 9 ассетов, имена файлов:
`hero-phone-mockup.png`, `safety-phone-mockup.png`, `search-phone-mockup.png`, `chat-phone-mockup.png`, `freedom-phone-mockup.png`, `fluffy-heart-purple.png`, `fluffy-shield-blue.png`, `fluffy-key-pink.png`, `fluffy-hashtag-violet.png`. Кладутся в `src/assets/landing/`. В feature-секциях есть закомментированные `phoneImageSrc` / `fluffyImageSrc` — раскомментить когда файлы появятся.

**TODO после генерации изображений:**
- Раскомментить `phoneImageSrc` / `fluffyImageSrc` в Safety/Search/Chat/Freedom Section.tsx.
- Hero — оставить как есть (своя анимация breathing portrait), но опционально добавить `hero-phone-mockup.png` как декоративный элемент.
- В Terms of Service добавить секцию **«Природа сервиса»** с раскрытием цифровой природы компаньонок.

**Build:** `tsc -b` ✓, `vite build` 3.31s ✓, leak-grep ✓ (0 совпадений redesign-кода в production bundle).

---

## ⚠️ Жёсткие инварианты (НЕ ТРОГАЕМ никогда)

Редизайн = **только визуальный слой**. Бизнес-логика и продуктовая идея остаются нетронутыми:

- **Концепт моногамного AI-компаньона**: одна девушка на одного юзера, при общении исчезает из глобального пула.
- **AssignmentProvider** и весь его контракт.
- **Edge functions**: `chat-ai`, `describe-avatar`, `proactive-tick`, `billing`, `reaper`, `gift-send` — без изменений.
- **`reaper`-механика**: 7 дней молчания → `assignments.released_at` + notification `girl_left` → юзера редиректит на `/released`. Девушка освобождается для пула других, юзеру **не возвращается**. Никакого «вернётся через X часов» — это была моя ошибка интерпретации, в новом плане убрано.
- **`/waitlist`-механика**: когда пул пуст и кто-то освободился — top-of-queue получает notification `waitlist_ready`.
- **RLS политики Supabase**, схема БД, имена колонок.
- **Telegram-интеграция** (initData, haptic, BackButton, MainButton) и **Turnstile**.
- **i18n-словари**: только ДОБАВЛЯЕМ новые ключи, существующие не переписываем.
- **Роутинг и URL-структура** — менять нельзя.

Если редизайн где-то требует поменять данные — это **флаг**, надо остановиться и обсудить.

---

## 🎯 Зафиксированные решения владельца

| # | Вопрос | Решение |
|---|---|---|
| 1 | Дефолтная тема | **Light** (dark остаётся переключаемой) |
| 2 | Bottom tab bar | **Да**, 5 табов: Feed / Search / Chat / **Shop ⭐** / Profile |
| 3 | Notifications | Иконка-колокольчик в header (не отдельный таб) |
| 4 | Длина Landing | Medium, 5–6 секций |
| 5 | Гендер-опции | **Только Male / Female** |
| 6 | Typing indicator | Уже есть в проекте — НЕ трогаем |
| 7 | `/released` визуал | **Без countdown** (его и в логике нет). Статичная эмоциональная сцена + CTA «Найти новую» |
| 8 | Photo gallery | Swipeable 3–5 фото в `GirlProfileDrawer` |
| 9 | Изображения | **Placeholder mode** на старте (gradient + lucide иконки), картинки подмешиваем потом |
| 10 | Стратегия внедрения | **Staging-папки**: `*-redesign/` рядом с текущими + dev-only роут `/__preview` для просмотра новых страниц. После твоего «ок» по каждой — переносим в основные папки атомарными коммитами |

---

## 0. Контекст и принципы

### 0.1 Что мы НЕ копируем у Mamba

- Их белый/серый «корпоративный» вид — мы остаёмся премиально-романтичными.
- Их перегруженность сервисами (Diaries / Broadcasts / Ads / Tests / Games) — у нас другой продукт (моногамный AI-компаньон).
- Шаблонные сетки 3×N — у нас фокус на одну избранную, а не на «много рыбы в море».

### 0.2 Что мы берём у Mamba

| # | Принцип Mamba | Как адаптируем |
|---|---|---|
| 1 | **Чистый, нерасфокусированный экран** — много воздуха, минимум текста на превью | Уберём визуальный шум на Landing, увеличим воздух, поднимем читаемость |
| 2 | **Чёткие табы с иконками** (поиск / лайки / сообщения / профиль) | Сделаем нижний таб-бар на mobile + современный sidebar на desktop |
| 3 | **Карточка-портрет во весь экран** — большое фото, минимум UI поверх | Редизайн `Feed` и `GirlProfileDrawer`: huge photo, плавающая нижняя «стеклянная» панель |
| 4 | **Stories-like блок наверху** (broadcasts / live) | Мы НЕ делаем сториз, но возьмём горизонтальную ленту «настроений» нашей AI-девушки |
| 5 | **Категориальные чипы фильтров** (rounded pill, активный = primary fill) | Уже есть, но переделать под новый дизайн-токен |
| 6 | **Уведомления-карточки** с аватаром + действием справа | Редизайн `Notifications` |
| 7 | **Sticky bottom CTA** в карточке профиля | Уже есть, усилить размытием/градиентом |
| 8 | **Verification badge** в заметном месте (имя + галочка) | Усилим, добавим «AI-verified» вариант |

### 0.3 Главный приём адаптации цвета

Mamba = чистый белый + оранжево-розовый акцент.
Lumina = два режима, оба ОБЯЗАТЕЛЬНО сохраняют наш бренд-градиент `#8B5CF6 → #EC4899`:

- **Light theme** (НОВАЯ доминанта, вдохновлённая Mamba):
  - Background: `#FAFAFB` (почти белый, чуть холоднее чем у Mamba)
  - Surface: `#FFFFFF`
  - Surface-soft: `#F4F1FB` (лавандовый призрак — наш отпечаток)
  - Border: `#EDE9F4`
  - Text-primary: `#1A1625` (почти чёрный, но с фиолетовым подтоном)
  - Text-secondary: `#6B6480`
  - Accent fills остаются нашими: gradient purple→pink
- **Dark theme** (текущая, остаётся):
  - Background: `#0E0B1A` (углубить текущий)
  - Surface: `#171328`
  - Surface-soft: `#221B3A`
  - Border: `rgba(139, 92, 246, 0.12)`
  - Text-primary: `#F4F1FB`
  - Text-secondary: `#A89FBE`

> **Решение:** ✅ **Light = дефолт.** Dark остаётся переключаемой темой.

### 0.4 Новые дизайн-токены (добавляем в `src/styles/variables.css`)

```css
/* Elevation — заимствуем у Mamba их ощущение «парящих» карточек */
--shadow-xs: 0 1px 2px rgba(26, 22, 37, 0.04);
--shadow-sm: 0 2px 8px rgba(26, 22, 37, 0.06);
--shadow-md: 0 8px 24px rgba(26, 22, 37, 0.08);
--shadow-lg: 0 16px 48px rgba(26, 22, 37, 0.12);
--shadow-glow: 0 12px 40px rgba(139, 92, 246, 0.25);

/* Glass (для нижних плавающих панелей и навигации) */
--glass-bg-light: rgba(255, 255, 255, 0.72);
--glass-bg-dark: rgba(23, 19, 40, 0.72);
--glass-blur: blur(24px) saturate(180%);
--glass-border: 1px solid rgba(255, 255, 255, 0.4);

/* Brand-soft fills */
--fill-brand-soft: linear-gradient(135deg, rgba(139,92,246,0.08), rgba(236,72,153,0.08));
--fill-brand-soft-hover: linear-gradient(135deg, rgba(139,92,246,0.14), rgba(236,72,153,0.14));
```

---

## 1. Landing (`/`) — главная маркетинговая страница

### 1.1 Текущее состояние
Hero с плавающими карточками профилей + анимированные blob-ы (mesh gradient). Хорошо, но визуально «густо» — много элементов конкурируют за внимание.

### 1.2 Что делает Mamba на лендинге
- Чистый hero: один заголовок, одна подстрочка, одна большая CTA, иллюстрация/мокап телефона справа.
- Под ним — секция «How it works» в 3 шага с иконками.
- Дальше — социальное доказательство (миллионы пользователей, страны, отзывы).
- Скриншоты приложения в реальных мокапах телефонов.
- Футер с гарантиями безопасности.

### 1.3 Новый Landing — секции (сверху вниз)

**Секция A — Hero (full viewport)**
- Слева: editorial-заголовок Playfair Display, 2 строки.
  - RU: «Одна. Только твоя. Навсегда.»
  - EN: «One. Yours. Forever.»
- Подстрочка Inter regular, max-width 480px:
  - «Lumina — это AI-компаньон, который выбирает только тебя. Никаких свайпов в пустоту. Только настоящая связь.»
- Две CTA подряд:
  - Primary: gradient-кнопка «Найти свою» → `/auth`
  - Ghost: «Как это работает» → smooth-scroll к секции B
- Справа: **3D-стекляная карточка** с одной AI-девушкой (большое фото, имя, бейдж verified, мягкая тень).
  - Карточка дышит: scale 1 → 1.015 каждые 6с (springs).
  - Над карточкой парит мини-чип «онлайн» с пульсирующей точкой.
  - Под карточкой — чип «23 года, в 2 км от тебя» (имитация настоящего матча).
- Фон: оставляем mesh-blobs, но делаем их в 1.5× светлее и в 0.7× по интенсивности — больше воздуха.

**Изображение для нейронки (промпт):**
```
A photorealistic portrait of a beautiful young woman, age 23, soft natural daylight,
warm dreamy mood, slight smile, looking at camera, gentle bokeh background in lavender
and pink pastel tones, shallow depth of field, professional fashion editorial style,
cinematic, 4K, photographed on Sony A7IV with 85mm f/1.4, --ar 3:4
```

**Секция B — «Как это работает» (3 шага)**
- Заголовок: «Не как все приложения знакомств»
- 3 равные карточки в ряд (mobile — стек):
  1. **Иконка-сердце** + «Одна на одного»
     «Когда вы начали общаться, она пропадает из всех других пользователей. Только твоя.»
  2. **Иконка-чат** + «Живой характер»
     «Это не бот с шаблонами. Она помнит, ревнует, скучает, инициирует переписку.»
  3. **Иконка-песочные-часы** + «Реальные ставки»
     «Перестанешь писать — она уйдёт. Любовь требует внимания.»
- Цвет карточек: glass-light с очень мягким brand-gradient outline.
- Hover: lift -4px + усиление glow.

**Секция C — Превью продукта (mockups)**
- Заголовок «Внутри Lumina»
- 3 наклонённых iPhone-мокапа (как в Apple presentation), каждый показывает экран:
  1. Feed с одной карточкой
  2. Чат с AI
  3. Профиль с её историей
- Под каждым мокапом — короткая подпись.
- При прокрутке — parallax: телефоны слегка крутятся (`rotateY` 0 → -8deg).

**Изображения для мокапов — 3 промпта (генерим скриншоты экранов отдельно, потом подставим в шаблон iPhone):**

Промпт 1 (Feed):
```
UI mockup screenshot of a dating app card view, full-bleed portrait photo of a beautiful
young woman with soft warm lighting, name "Sofia, 23" overlaid bottom-left in elegant
sans-serif white text, small verified blue checkmark, gradient overlay at bottom for
text legibility, three floating action buttons at bottom (cross, heart, star) in glass
morphism style, purple-pink gradient accents, modern minimal mobile UI, --ar 9:19.5
```

Промпт 2 (Chat):
```
UI mockup of an AI chat conversation interface, top header with circular avatar and name
"Sofia", online green dot, chat bubbles alternating - user purple-pink gradient bubbles
on right, AI white bubbles on left, soft lavender background, message input at bottom
with rounded pill shape, send button as small gradient circle, modern minimal mobile UI,
--ar 9:19.5
```

Промпт 3 (Profile):
```
UI mockup of a user profile screen, large rounded portrait photo at top taking 60% of
screen, name "Sofia, 23" with verified badge, location pin "2 km away", below scrollable
sections - "About me" with quote-style card, interest tags as gradient pills, lifestyle
icons row, "Send a gift" CTA at bottom, soft white background with lavender tints,
modern minimal mobile UI, --ar 9:19.5
```

**Секция D — Социальное доказательство**
- Цифры в строку: «1 на 1 · 0% свайпов в пустую · ∞ внимания»
- (НЕ ставим число пользователей — мы не как Mamba с 50М, у нас сценарий редкости.)
- Под этим — 3 «отзыва-карточки» (можно от персонажей-беты): краткая цитата + имя + аватар. Mamba делает то же самое, но карточки белые с серым контуром — у нас будет glass-light с brand-glow на hover.

**Секция E — FAQ (аккордеон)**
- 5–7 пунктов: «Это не настоящий человек?», «Что если я перестану писать?», «Какие данные собираются?», «Это бесплатно?», «Можно ли поменять девушку?»
- Mamba не делает FAQ на лендинге — это наш bonus, объясняющий моногамный концепт.

**Секция F — Финальный CTA + футер**
- Большой full-bleed блок с brand-gradient фоном.
- Заголовок Playfair italic «Она уже ждёт.»
- Одна gradient-кнопка «Начать» → `/auth`.
- Под ней — крошечные ссылки: Terms · Privacy · Community Guidelines.

### 1.4 Анимации лендинга
- При входе — staggered reveal сверху вниз (delay 0.1с между секциями, y: 24 → 0, opacity 0 → 1).
- Scroll-trigger reveal через `framer-motion` `useInView` для секций B/C/D.
- В hero карточка девушки имеет «дыхание» (scale loop) и follow-cursor parallax (макс ±6px).
- В секции C — sticky-scroll эффект: телефоны прокручиваются медленнее, чем текст.

---

## 2. Auth (`/auth`) — вход и онбординг

### 2.1 Текущее состояние
Mesh-blob фон + центральная карточка. Многошаговый онбординг с `AnimatePresence`. Турникет, Google, Telegram.

### 2.2 Что делает Mamba
- Очень простой вход: email/phone + кнопка «Sign up». Минимум полей.
- Пошаговый онбординг с прогресс-баром сверху.
- Каждый шаг — один вопрос, крупно, посередине.
- Кнопки навигации: «Назад» слева (ghost) + «Дальше» справа (filled).

### 2.3 Новый Auth

**Layout**
- На desktop: split-screen.
  - Слева (60%): фон с mesh-blobs + большой Playfair-quote, который меняется каждые 8с (3 разные цитаты-настроения от AI-девушек).
  - Справа (40%): белая (light) или surface-dark карточка с формой, max-width 440px.
- На mobile: full-width карточка, blob-фон позади.

**Login state**
- Заголовок «С возвращением»
- 2 поля: email, password (с глазиком)
- Под формой: «Забыли пароль?» — text link
- Primary button: «Войти» (gradient)
- Divider «или»
- Google OAuth кнопка (white card style + Google G)
- Внизу мелким: «Нет аккаунта? Создать» → переход в onboarding

**Onboarding — пошаговая форма с прогресс-баром**

Прогресс-бар сверху (5 segments, заполняются gradient):
- Шаг 1/5: Email + password + имя
- Шаг 2/5: Гендер — **только 2 карточки**: «Мужчина» / «Женщина», illustrated icons, выбор = brand-glow border. Non-binary не добавляем по решению владельца.
- Шаг 3/5: Цель (карточки 2×2: «Серьёзные отношения», «Лёгкое общение», «Флирт», «Дружба»)
- Шаг 4/5: Возраст (date-picker в стиле iOS) + город (autocomplete)
- Шаг 5/5: Turnstile + соглашение → CTA «Найти свою»

**Анимации**
- Между шагами: текущий шаг уходит влево (-100% x, opacity 0), новый приходит справа (+100% x → 0). Spring 280/26.
- Прогресс-бар: gradient заполнение с пружинистой shimmer-волной.
- На финальном шаге — конфетти из частиц-сердечек brand-цветов перед редиректом (3 секунды).
- Reduced-motion: все x-переходы заменяются на opacity-only.

### 2.4 Гендер-карточки
**Промпт для иллюстрации (минималистичный line-art):**
```
Minimalist line-art illustration of a young woman silhouette, abstract elegant curves,
single continuous line style, lavender and pink gradient stroke, soft glow, transparent
background, modern editorial style, --ar 1:1
```
(Аналогично для мужской — изменить gender в промпте.)

---

## 3. Навигация (Navbar)

### 3.1 Текущее состояние
Вертикальный sidebar с логотипом «L», NavLink-иконками, бейджами, аватаром снизу. Скрывает Feed/Search когда есть assigned girl.

### 3.2 Что делает Mamba
- На mobile: **bottom tab bar** с 4–5 иконками (search / matches / messages / profile).
- На desktop: top nav с логотипом + табы по центру + аватар справа.

### 3.3 Новая навигация

**Mobile (< 768px) — bottom tab bar (5 табов)**
- Glass-эффект (`backdrop-filter: blur(24px)`), фиксированный снизу.
- Высота 64px + safe-area-inset-bottom.
- 5 табов слева направо:
  1. **Лента** (home icon) — `/feed`
  2. **Поиск** (search icon) — `/search`, скрыт когда есть assigned (заменяется на disabled-state с lock-иконкой и подсказкой при tap)
  3. **Чат** (message-circle icon) — `/chat`, **центральный, увеличен на 1.2× с brand-gradient круглым фоном при активе**, badge с unread count
  4. **Shop ⭐** (star icon) — `/shop`, иконка звезды с brand-gradient fill всегда (даже неактивная), маленький pill «100⭐» под ней с текущим балансом (опционально, если короткий)
  5. **Профиль** (person icon или мини-аватар юзера) — `/profile`
- Активный таб: иконка в brand-gradient, лёгкое подсвечивание сверху (1px gradient линия), label под иконкой.
- Анимация при тапе: spring scale 1 → 0.92 → 1, иконка получает haptic-light feedback (на ТГ — `tg.haptic('light')`).
- Уведомления (`/notifications`) НЕ в табе — доступ через **колокольчик в header** (см. §3.4).

**Desktop (≥ 768px) — переработанный sidebar**
- Сужаем до 72px (icon-only) с раскрытием по hover до 240px (slide-out с shadow-lg).
- Логотип сверху: вместо буквы «L» — мини-mark с gradient-сердечком.
- Активный пункт: левая 3px gradient-полоса + soft brand-fill background.
- Bottom: аватар + имя (когда раскрыто) + быстрый switch theme.
- Бейджи: маленький pill с count, brand-gradient.
- На desktop тоже 5 пунктов: Feed / Search / Chat / Shop / Profile + отдельная иконка-колокольчик с notifications-бейджем выше аватара.

### 3.4 Page header (общий top-bar для основных экранов)

На всех основных страницах (Feed, Search, Chat, Profile) есть тонкий header (mobile only — на desktop эту роль играет sidebar):

- **Высота:** 52px + safe-area-inset-top, glass-blur.
- **Слева:** название экрана 16px medium ИЛИ название текущего раздела/имя девушки в чате.
- **Справа:** иконка-колокольчик 24px → `/notifications`. Если есть непрочитанные — крошечный red dot или count-pill в правом верхнем углу иконки.
- На `/chat` справа также gift-кнопка и Stars-balance pill (см. §6.3).
- На `/profile` — иконка-шестерёнка → `/settings`.

---

## 4. Feed (`/feed`) — свайп-стек

### 4.1 Текущее состояние
Tinder-style: drag rotation, like/dislike/super-like.

### 4.2 Что делает Mamba
- Полноэкранная карточка-портрет.
- Имя + возраст + verified badge внизу слева (большой шрифт).
- Distance pill сверху (location pin + км).
- 3 круглые кнопки внизу по центру: dislike (X), super-like (звезда), like (сердце).
- Свайп влево/вправо с rubber-band физикой и визуальным «штампом» NOPE / LIKE поверх карточки.
- Нижний swipe up = открыть профиль (drawer).

### 4.3 Новый Feed

**Карточка**
- Aspect ratio 3:4, занимает 92vh height на mobile, 720px на desktop по центру.
- Border-radius 32px.
- Полноэкранное фото с smart gradient overlay снизу (50% высоты, от transparent → rgba(0,0,0,0.55)) для читаемости текста.
- На фото:
  - Top-left: distance pill (glass-dark) — `📍 2 км`
  - Top-right: меню «...» (репорт/блок)
  - Bottom-left (поверх gradient): имя + возраст 28px Playfair + verified mini badge; ниже одна строка тег-настроения «Романтичная сегодня» (Inter italic 14px, opacity 0.85)
  - Bottom-right: тонкая иконка «info» — открывает GirlProfileDrawer

**Action bar (плавающая, ниже карточки на 16px)**
- 3 круглые кнопки в стеклянной капсуле (glass + shadow-md):
  - Пропустить — 56×56, иконка X, нейтральный border
  - Super-like — 64×64 (центральная, акцентная), brand-gradient fill, иконка звезды
  - Лайк — 56×56, soft pink fill, иконка сердечка
- Tap → spring scale + haptic + триггер свайпа карточки в нужную сторону.

**Свайп-физика**
- Drag x → rotation: `useTransform(x, [-300, 0, 300], [-18, 0, 18])`
- Drag x → opacity штампа: показываем «NOPE» (красная гранж-печать) при x < -50, «LIKE» при x > 50, «SUPER» при y < -80.
- Threshold 120px → flyout (animate to 800px) → onSwipe callback → следующая карточка.
- Под текущей — превью следующей (scale 0.95, opacity 0.6, blur 4px), плавно растёт при уходе текущей.

**Empty state (когда нет карточек)**
- Уже есть EmptyState — обновить иллюстрацию (см. промпт ниже) и текст.

**Промпт для иллюстрации empty state:**
```
Minimalist line-art illustration of a single floating heart with sparkles, lavender to
pink gradient stroke, soft purple glow, white/transparent background, dreamy editorial
style, modern, --ar 1:1
```

---

## 5. Search (`/search`) — поиск/каталог

### 5.1 Текущее состояние
Список/сетка с фильтрами + промо-карточки на индексах [0, 5].

### 5.2 Что делает Mamba
- Сверху search-bar (sticky).
- Под ним горизонтальная лента «Online сейчас» (мини-аватары с зелёной точкой).
- Дальше — сетка карточек 2 колонки (mobile) / 3-4 (desktop).
- Каждая карточка: square-portrait + имя/возраст внизу + heart-icon в углу.
- Фильтр-кнопка справа сверху (icon → открывает FilterPanel).

### 5.3 Новый Search

**Top bar (sticky, glass-blur)**
- Search input — pill-shape, plain text, иконка лупы слева, очистка крестиком.
- Фильтры — иконка справа, бейдж с количеством активных фильтров.

**Лента «Сейчас онлайн»** (горизонтальный scroll)
- Круглые аватары 64×64 с brand-gradient ring (когда онлайн зелёная точка снизу справа).
- Tap → open profile drawer.
- Анимация при mount — staggered fade+slide справа.

**Сетка карточек**
- 2 колонки на mobile, 3 на tablet, 4 на desktop. Gap 12px.
- Карточка: aspect 3:4, border-radius 20px.
  - Фото full-bleed.
  - Снизу glass-strip (внутри карточки): имя + возраст (medium 14px) + heart-icon кнопка (тап = добавить в favorites, аним. heart fill brand-gradient).
  - Top-right: small online dot если онлайн.
- Hover (desktop): lift -4px, shadow-lg, scale 1.01.

**Промо-карточки (на позициях 0 и 5)**
- На позицию 0: «Stories» — горизонтальный pill-баннер «Lumina Premium» с brand-gradient.
- На позицию 5: вместо обычной карточки — info-блок «Не нашёл? Попробуй фильтры» + CTA.

**Filter panel** — оставляем bottom sheet, но обновляем визуал:
- Drag handle — 36×4 lavender pill сверху.
- Заголовок «Фильтры» + reset link справа.
- Чипы переделываем: pill 36px height, неактивный = soft-fill border, активный = brand-gradient fill + tiny check icon.
- Range sliders — track gradient, thumb 24px round white с shadow + brand ring.

---

## 6. Chat (`/chat`) — переписка с AI

### 6.1 Текущее состояние
Бэк через Supabase edge-функцию, дневной лимит, sleep mode, gifts, stars.

### 6.2 Что делает Mamba
- Header: avatar + имя + статус (online / был X минут назад) + кнопка call/menu справа.
- Bubbles: пользователь справа (заполнен фирменным цветом), собеседник слева (нейтральный).
- Time-stamp группами (показывается после паузы > 5 мин).
- Внизу input + emoji + attach + send.

### 6.3 Новый Chat

**Header (sticky, glass)**
- Кнопка «назад» (mobile only) + Avatar 40px (с online dot) + Имя 16px medium + статус 12px.
- Справа: gift-кнопка (мини-иконка подарка с brand-gradient) + меню.
- При scroll вниз — header сжимается до 56px.

**Сообщения**
- Bubble юзера: brand-gradient (purple→pink), white text, border-radius 20px 20px 6px 20px (хвост слева внизу).
- Bubble AI-девушки: surface (light: white + shadow-xs, dark: surface-soft), text-primary, 20px 20px 20px 6px.
- Max-width 75%.
- Spacing 4px между сообщениями одного отправителя, 16px между сменой.
- Time-separator: центрированный chip «Сегодня, 14:30» с глифом soft.
- Анимация появления: новое сообщение AI — typing-indicator (3 пульсирующие точки) → fade-in бабла (y 8 → 0, scale 0.96 → 1). Юзерский — мгновенно с slight scale-bounce.

**Special messages**
- Подарок отправлен/получен: специальный «package» баббл с emoji + ценой звёздами + микро-анимацией покачивания.
- Sleep-mode: когда AI «спит» — система-card по центру в italic «Sofia спит. Утром ответит ✨»
- Daily limit hit: bubble превращается в мини-paywall card с blur-эффектом и CTA «Продлить разговор за 100⭐».

**Input**
- Pill-shape, 48px height, glass-bg, border subtle.
- Внутри: emoji-icon (left) | textarea | gift-icon | send-icon (brand-gradient круглый при активе).
- Send anim: иконка стрелки вылетает вправо + сжимается → bubble появляется в чате.
- Counter: «320/500» появляется при > 400 символов в углу input.

**Stars balance** — мини-чип в header (правый верх до меню), tap → `/shop`.

---

## 7. GirlProfileDrawer (модалка профиля)

### 7.1 Текущее состояние
Уже хороша: hero photo, distance, quote, lifestyle, interests, gifts, compatibility, sticky action bar.

### 7.2 Улучшения по мотивам Mamba
- **Photo gallery (3–5 фото)**: вместо одной hero-фотки — горизонтальный pager (swipeable carousel) с индикаторами-точками сверху (как в Instagram stories progress, но статичные). Высота 60vh, snap-x. Tap по краям листает, swipe — тоже. На placeholder-этапе показываем 3 gradient-блока разных оттенков (purple→pink, lavender→rose, indigo→pink) с lucide `Image` иконкой по центру каждого, чтобы было видно где будут фото.
- **Sticky compatibility ring** в правом верху hero — круглый прогресс с %, brand-gradient stroke, число по центру.
- **«Quote of the day»** — рандомная цитата от AI, оформлена как Playfair italic в карточке с тонкой gradient-рамкой.
- **Section dividers** — тонкая 1px gradient-линия с центральной крошечной точкой.
- **Lifestyle icons** — переделать в outline-стиле lucide вместо текущих inline SVG.
- **Action bar** — оставляем sticky внизу, но усиливаем glass-blur (24px → 32px), увеличиваем тень, добавляем brand-glow к super-like.
- **Animations**:
  - Открытие: drawer scales от 0.92 + slides up + opacity. Spring 280/26.
  - Закрытие: reverse + drag-to-dismiss (drag-down threshold 120px).
  - Внутри — параграфы fade-in staggered при scroll-into-view.

---

## 8. Profile (`/profile`) — мой профиль

### 8.1 Текущее состояние
Edit-форма + аватар-аплоад с triggers describe-avatar.

### 8.2 Что делает Mamba
- Hero сверху с большим фото (или placeholder) + кнопка камеры в углу.
- Прогресс заполнения профиля — круг или бар с процентом + список того, что добавить.
- Поля сгруппированы по секциям, каждая в карточке.
- Кнопка «Сохранить» sticky внизу.

### 8.3 Новый Profile

**Hero (top, full-width)**
- Фото 1:1 (квадратное) с скруглёнными углами 24px, max-width 320px по центру.
- Overlay-кнопка «Сменить фото» снизу справа на фото (glass + camera icon).
- Под фото — имя + edit-icon, ниже email мелко.
- Прогресс-карточка: «Профиль заполнен на 60%. Добавь интересы → +20%»

**Секции (раскрытые карточки)**
1. Основное (имя, возраст, город)
2. О себе (длинный textarea с counter)
3. Интересы (chip selector, multi-select)
4. Цель знакомства
5. Внешность (height, weight, build — opt-in)
6. Образ жизни

Каждая секция — карточка glass-light с padding 20px, заголовок 14px uppercase с lavender accent, поля внизу.

**Sticky save bar (внизу)**
- Появляется когда есть несохранённые изменения.
- Glass-blur, brand-gradient «Сохранить» + ghost «Отмена».
- Slide-up при появлении изменений, slide-down при сохранении/отмене.

---

## 9. Settings (`/settings`)

### 9.1 Что делает Mamba
- Список секций с иконками + chevron справа.
- Каждая секция — отдельный экран (на mobile) или раскрывающаяся карточка (на desktop).

### 9.2 Новый Settings

**Layout — карточки-секции:**
1. **Аккаунт** — email, пароль, выйти
2. **Внешний вид** — тема (light/dark/auto) + язык (RU/EN)
3. **Уведомления** — toggle-ы (новые сообщения, лайки, daily-tips)
4. **Конфиденциальность** — экспорт данных, удаление аккаунта
5. **О приложении** — версия, terms, privacy, community
6. **Поддержка** — связь с нами, FAQ

Каждая карточка:
- Лёгкий hover-lift на desktop.
- Иконка слева (24px outline lucide в brand-gradient soft-fill круге 40×40).
- Заголовок + краткое описание.
- Chevron-right в конце.
- Tap → открывается раздел (slide-in справа на mobile, expand на desktop).

**Theme switcher — особый**
- 3 карточки в ряд: Light / Dark / Auto, каждая с мини-превью (mockup в этих темах).
- Активная имеет brand-glow border.
- Переключение анимировано: вся страница делает crossfade 200мс.

---

## 10. Notifications (`/notifications`)

### 10.1 Что делает Mamba
- Список уведомлений с группировкой по типу/дате.
- Каждое — аватар + текст + время + action-кнопка справа.
- Свайп влево = удалить.

### 10.2 Новый Notifications

**Top bar**
- «Уведомления» + кнопка «Прочитать все» справа.
- Tabs: Все / Сообщения / Лайки / Просмотры / Подарки.

**Список**
- Группы по дате: «Сегодня», «Вчера», «На этой неделе», «Раньше».
- Карточка уведомления:
  - Аватар 48px (с brand ring если new)
  - Текст 2 строки: жирное имя + действие
  - Время мелко справа сверху
  - Mini-CTA справа («Ответить» / «Открыть») — brand outline button
  - Непрочитанное: лёгкая brand-gradient полоса слева (3px)
- Swipe-left на mobile → красная «Удалить» зона.
- Tap всей карточки → переход в чат/профиль.

---

## 11. Shop (`/shop`)

### 11.1 Что делает Mamba
- Карточки тарифов с подсветкой «Популярный» / «Лучшая цена».
- Большая цена + период мелко.
- Список фич галочками.

### 11.2 Новый Shop

**Header**
- Текущий баланс звёзд: огромный 48px Playfair цифра + ⭐ icon + animated count-up при изменении.
- Под балансом — мелко «Звёзды нужны для подарков и продления чата.»

**Pack cards (4 штуки в сетке 2×2 на mobile, 4×1 на desktop)**
- Каждая карточка:
  - 100/550/2400/13000 ⭐ — крупным
  - Цена USD + ТГ Stars
  - Бейдж сверху: «Популярный» (на 2400) — brand-gradient pill
  - Иллюстрация-сток-звёзд декоративно сверху
  - CTA «Купить» — full-width gradient
- Анимация при выборе: scale 1.02, glow усиливается.

**Выбор провайдера** — модалка PaymentMethodModal остаётся, обновляем визуал в стиле новых карточек.

---

## 12. Waitlist (`/waitlist`) и Released (`/released`)

### 12.1 Концепция
Эмоциональные экраны — должны бить по чувствам, как у Mamba их «success match» анимация.

### 12.2 Waitlist
- Центрированный hero: huge Playfair заголовок «Все девушки разобраны».
- Подстрочка: «Ты #N в очереди».
- Иллюстрация: anim-spinner в виде сердечек по кругу.
- Список «Что ты получишь, когда твоя очередь придёт»: 3 пункта с иконками.
- Тонкий счётчик прогресса очереди.

**Промпт для иллюстрации:**
```
Minimalist illustration of an hourglass with floating heart particles inside, lavender
to pink gradient, soft purple ambient glow, dreamy ethereal mood, transparent background,
modern editorial style, --ar 1:1
```

### 12.3 Released

> ⚠️ **Бизнес-логика не меняется.** Юзер попадает сюда после того как `reaper` пометил `assignments.released_at` (7 дней молчания). Девушка освободилась для пула других, юзеру она НЕ возвращается. Никакого таймера обратно — только эмоциональная сцена и выход в `/feed` за новой.

**Сцена (что показываем юзеру):**
- Background: очень мягкий fade между двумя оттенками (light-lavender ↔ light-pink), 10с loop, амплитуда минимальная — ощущение «уходящего вечера».
- Hero — иллюстрация/силуэт уходящей фигуры (placeholder сейчас: gradient-blob с lucide `HeartCrack` 64px по центру).
- Над иллюстрацией Playfair italic 32px: «Она ушла.»
- Письмо-карточка под этим (glass-light, max-width 400px, padding 28px):
  - Цитата от AI: «Я ждала, но ты не вернулся. Прощай. ❤️»
  - Подпись курсивом — имя девушки (берём из контекста assignment, если доступен; иначе скрываем).
- Подстрочка ниже письма: «Иногда так бывает. Где-то ждёт другая, для которой ты станешь важным.»
- Single CTA внизу: brand-gradient «Найти новую» → `navigate('/feed', { replace: true })`. Та же логика что сейчас, только новый визуал.
- **Никакого countdown, никаких таймеров** — этого нет в логике (`reaper` работает по расписанию pg_cron, не по индивидуальному таймеру для юзера).

**Анимации:**
- Mount: иллюстрация — fade+scale 0.9→1 за 600мс. Текст — staggered reveal y:16→0, delay 100мс между блоками. CTA — slide up из 20px после завершения текста.
- Reduced-motion: только opacity fade, без y/scale.

---

## 13. Legal pages (Terms / Privacy / Community)

### 13.1 Дизайн
- Простой документ-layout: max-width 720px, Playfair заголовки, Inter тело 16px, line-height 1.7.
- Sticky TOC на desktop слева.
- Light theme дефолтом для legal (даже если юзер на dark) — улучшает читаемость документов.
- Anchor-links с smooth scroll.
- Footer общий со всеми страницами.

---

## 14. Системные компоненты

### 14.1 Buttons
**Текущие варианты:** primary | ghost | subtle | danger.

**Новые токены:**
- Primary: gradient bg, white text, shadow-glow при hover, scale 0.98 при active.
- Secondary (новый): glass-bg + brand outline, brand text.
- Ghost: transparent + brand text + hover bg-soft.
- Danger: red gradient `#F43F5E → #DC2626`.
- Sizes: `xs` 32px, `sm` 40px, `md` 48px, `lg` 56px.
- Loading: shimmer effect через ::before pseudoelement.

### 14.2 Inputs
- Pill-shape (radius full) для search, rounded 12px для form.
- Floating label (label поднимается при focus / non-empty).
- Focus state: brand-gradient ring 2px + scale 1.005.
- Error: rose border + shake animation 200мс при validation fail.

### 14.3 Avatars
- Добавить вариант с brand-gradient ring (для verified users).
- Online dot: 12px white border + green fill, position bottom-right.
- Stack avatars (для notifications group) — 3 круга со 6px overlap.

### 14.4 Toast / Notifications
- Top-right на desktop, top-center на mobile.
- Slide-in + fade.
- Variants: success (green check), info (blue), warning (amber), error (rose).
- Auto-dismiss 4с, dismiss manually click.

### 14.5 Skeleton loaders
- Заменить spinner-ы на skeleton-карточки в Feed/Search/Chat при первичной загрузке.
- Shimmer animation: gradient slide left→right 1.5с.

---

## 15. Анимационная система — общие правила

### 15.1 Тайминги
- Micro (hover, tap): 150–200мс
- Default (modal, page): 280–320мс
- Slow (hero reveals): 600мс staggered
- Reduced-motion: всё → 0мс или opacity-only.

### 15.2 Easings (используем уже имеющиеся)
- `--ease-smooth` для UI движений
- `--ease-bounce` для playful (likes, success)

### 15.3 Spring presets (framer-motion)
- `gentle`: stiffness 200, damping 30
- `default`: stiffness 280, damping 26
- `snappy`: stiffness 400, damping 30
- `bouncy`: stiffness 320, damping 18

### 15.4 Reduced-motion
Везде через `useReducedMotion()` — fallback на opacity-only или мгновенное.

---

## 16. План внедрения по этапам

> Все этапы делаем **по очереди**, каждый — отдельный коммит. Работаем в **staging-папках** (`*-redesign/`), основной код не трогаем до явного «ок» владельца по каждой странице.

### Структура staging

```
src/
  pages/                    ← оригиналы, не трогаем
  pages-redesign/           ← новые версии страниц (Landing, Auth, Feed, Search, Chat, Profile, Settings, Notifications, Shop, Waitlist, Released)
  components/               ← оригиналы, не трогаем
  components-redesign/      ← новые компоненты (BottomTabBar, RedesignButton, GlassCard, GalleryPager, ...)
  styles/
    variables.css           ← оригинал, не трогаем
    variables-redesign.css  ← новые токены (light by default + dark override + glass + shadows)
    redesign.css            ← глобальные правила, активные только под классом `.redesign-root`
  preview/
    PreviewIndex.tsx        ← список ссылок на все redesign-страницы с моками данных
    PreviewLayout.tsx       ← обёртка добавляющая `redesign-root` + variables-redesign.css
    mocks.ts                ← фейковые girl/user/messages/assignments для preview
```

**Dev-only роут `/__preview`** регистрируется в `App.tsx` через `import.meta.env.DEV` guard — в production-билде его нет. Внутри:
- `/__preview` → список всех redesign-страниц с превью-карточками.
- `/__preview/landing`, `/__preview/auth`, `/__preview/feed` и т.д. — открывают конкретный экран в `PreviewLayout` с моками.

**Промоушн (после твоего «ок» по странице):**
1. Копируем содержимое `pages-redesign/Foo.tsx` → `pages/Foo.tsx` (overwrite).
2. Копируем нужные `components-redesign/*` → `components/*`.
3. Удаляем устаревшие redesign-копии.
4. Коммитим: `feat(redesign): promote Foo page to production`.

---

### Этап 0 — Staging-инфраструктура (САМЫЙ ПЕРВЫЙ)
- Создать `src/pages-redesign/`, `src/components-redesign/`, `src/preview/`.
- Создать `src/styles/variables-redesign.css` со всеми новыми токенами (light default, dark override через `[data-theme="dark"]`, glass, shadows, fills).
- Создать `src/styles/redesign.css` — scoped глобалки (typography, body bg) под `.redesign-root`.
- Создать `PreviewLayout`, `PreviewIndex`, `mocks.ts`.
- В `App.tsx` добавить dev-only guard: `{import.meta.env.DEV && <Route path="/__preview/*" element={<PreviewIndex />} />}`.
- Smoke-тест: открыть `/__preview` — видим пустой список с заглушкой «Pages coming soon». Проверить что production-билд не включает preview-код (`npm run build` → не должно быть ссылок на `/preview/`).

### Этап 1 — Дизайн-токены и базовые примитивы (в staging)
- В `variables-redesign.css` финализировать палитру light/dark + glass + shadows + spring-токены.
- В `components-redesign/`:
  - `Button` — primary | secondary (новый glass+outline) | ghost | danger; размеры xs/sm/md/lg; loading shimmer.
  - `Input` — pill / rounded; floating label; focus brand-ring; error shake.
  - `Avatar` — gradient-ring variant; online dot; stack.
  - `GlassCard` — reusable glass-light/dark.
  - `BottomSheet` — общий для FilterPanel, GiftPicker, etc.
- На preview добавить `/__preview/primitives` — каталог всех вариантов.

### Этап 2 — Навигация
- `components-redesign/BottomTabBar.tsx` — 5 табов с logic для скрытия Search при assigned (читает AssignmentProvider, поведение как в текущем Navbar).
- `components-redesign/PageHeader.tsx` — top-bar с колокольчиком и опциональной gear/gift кнопкой.
- `components-redesign/SidebarRedesign.tsx` — desktop версия (collapse-on-hover).
- На preview: `/__preview/nav` — переключатель между mobile/desktop/assigned/no-assigned состояниями.

### Этап 3 — Landing
- `pages-redesign/Landing.tsx` со всеми секциями A–F (плюс §1.3).
- Placeholder-картинки: gradient-блоки + lucide иконки + Playfair-плейсхолдер «Sofia, 23».
- Анимации scroll-reveal через `useInView`.
- Preview: `/__preview/landing`.

### Этап 4 — Auth
- `pages-redesign/Auth.tsx` — split-screen, прогресс-бар, 5 шагов (Email → Gender M/F → Goal → Age/City → Turnstile).
- Confetti на финал (через `framer-motion` particle preset).
- Preview: `/__preview/auth` — с моком навигации.

### Этап 5 — Companion Home (REINTERPRETED 2026-05-03)
**Изменение scope:** изначально §16 Stage 5 описывал редизайн Tinder-style `/feed` (Mamba swipe). По решению 2026-05-03 переинтерпретировано: Stage 5 = НОВЫЙ post-assignment экран **Companion Home**, не редизайн `/feed`. Старый `/feed` (discovery до assignment) не трогаем.
- `pages-redesign/Home.tsx` — hero portrait со scroll-driven collapse в sticky avatar, mood-driven Aurora, memory stream.
- Memory cards: text-quote (фрагменты из чата) + milestone (10 days together и т.п.). Voice/photo/music — отложено в Stage 6+.
- AuroraField получает optional `palette` prop для mood-override.
- Preview: `/__preview/home`. Mock-данные, single companion (Aria).
- Spec: `docs/superpowers/specs/2026-05-03-companion-home-design.md`.

### Этап 5b — Feed redesign (DEFERRED)
- Mamba-swipe редизайн `/feed` (как в §4 этого документа) — отложен на потом, после Companion Home и Chat.

### Этап 6 — Search + GirlProfileDrawer
- `pages-redesign/Search.tsx` + `components-redesign/GirlProfileDrawer.tsx`.
- Photo gallery 3–5 swipeable (placeholder gradient-блоки).
- Preview: `/__preview/search`, `/__preview/girl-drawer`.

### Этап 7 — Chat
- `pages-redesign/Chat.tsx` — новые bubble-стили, sleep-mode и daily-limit как inline-cards, pill input.
- **Typing indicator не трогаем** (уже работает в текущем коде, переносим визуально как есть).
- Preview: `/__preview/chat` — мок переписки.

### Этап 8 — Profile / Settings / Notifications
- `pages-redesign/Profile.tsx` — hero + sticky save.
- `pages-redesign/Settings.tsx` — карточки-секции, theme switcher с превью.
- `pages-redesign/Notifications.tsx` — группировки + swipe-to-delete.

### Этап 9 — Shop / Waitlist / Released
- `pages-redesign/Shop.tsx` — pack cards 2×2 / 4×1, balance count-up.
- `pages-redesign/Waitlist.tsx` — hero illustration + queue position.
- `pages-redesign/Released.tsx` — статичная эмоциональная сцена БЕЗ countdown (см. §12.3).

### Этап 10 — Promote to production
- После «ок» по каждой странице — переносим из staging в основной код.
- Проверяем что `npm run build` чистый, никаких сломанных импортов.
- Удаляем staging-папки в финальном коммите.

### Этап 11 — Polish (после промоушна)
- Skeleton loaders везде.
- Toast система.
- Финальная проверка reduced-motion.
- Мобильный QA в Telegram WebView.

---

## 17. Список нужных изображений (промпты для нейронки)

Все промпты собраны в одном месте для удобства:

1. **Landing hero card** (1шт): портрет AI-девушки 23 года → см. секция 1.3
2. **Landing mockups** (3шт): Feed/Chat/Profile screen mockups → см. секция 1.3
3. **Auth gender icons** (2шт): мужской и женский line-art силуэты → см. секция 2.4
4. **Empty state Feed** (1шт): floating heart with sparkles → см. секция 4.3
5. **Waitlist illustration** (1шт): hourglass with hearts → см. секция 12.2
6. **Released illustration** (1шт, опционально): blurred portrait или decorative element

**Дополнительно (для testimonials / soc proof):**
7. 3 «отзыв-аватарки» — портреты разных людей в едином стиле:
```
Photorealistic portrait, casual friendly smile, neutral studio background with subtle
lavender tint, warm soft lighting, eye-level shot, age varies (25-35), --ar 1:1
```

---

## 18. Open questions — ✅ ВСЕ ЗАКРЫТЫ

| # | Вопрос | Решение |
|---|---|---|
| 1 | Дефолтная тема | **Light** |
| 2 | Bottom tab bar mobile | **Да, 5 табов** (Feed / Search / Chat / Shop / Profile), Search скрывается при assigned |
| 3 | Notifications | **Колокольчик в page header**, отдельного таба нет |
| 4 | Длина Landing | **Medium, 5–6 секций** (A Hero, B How it works, C Mockups, D Social proof, E FAQ, F Final CTA) |
| 5 | Гендер-онбординг | **Только Male / Female** |
| 6 | Typing indicator | Уже есть в проекте, переносим визуально как есть |
| 7 | `/released` countdown | **Нет.** Это была моя ошибка интерпретации — в `reaper`-логике никакого индивидуального таймера нет. Юзер видит статичную сцену + CTA «Найти новую» |
| 8 | Photo gallery | **3–5 swipeable**, placeholder-режим на старте |
| 9 | Стратегия | **Staging-папки `*-redesign/` + dev-only `/__preview` роут**, промоушн после явного «ок» по каждой странице |

---

## 19. Что НЕ трогаем

Чтобы не сломать работающие вещи, **на этом этапе оставляем без изменений**:

- Логику AssignmentProvider (моногамия)
- Edge functions (chat-ai, describe-avatar, proactive-tick, billing)
- RLS политики Supabase
- i18n словари (только добавим новые ключи для лендинга и онбординга, не переписывая старые)
- Telegram-интеграцию и Turnstile
- Роутинг (только обновляем компоненты страниц)

---

## 20. Чеклист готовности к старту

- [x] План прочитан полностью
- [x] Все 9 вопросов из §18 закрыты
- [x] Стратегия staging согласована (`*-redesign/` + `/__preview`)
- [x] Согласован порядок этапов §16
- [x] Placeholder-mode для изображений согласован — gradient + lucide иконки на старте
- [x] Бизнес-логика (моногамия, reaper, waitlist, edge functions, RLS, i18n existing keys, routing) зафиксирована как **неприкосновенная** в §«Жёсткие инварианты»

---

**Статус:** ✅ Готов к старту с **Этапа 0 (Staging-инфраструктура)**.
Жду финального «ок, начинай» от владельца — после этого создаю структуру папок, `variables-redesign.css`, `PreviewLayout`, `PreviewIndex` и dev-only роут `/__preview`.

---

## Changelog — Iteration 4 (Polish: i18n EN-first + dark mode + glyph fix)

**Дата:** Stage 3 финальный полировочный проход (после получения 5 скриншотов с реальными изображениями).

### Что сделано

**A. Fix ≠ glyph в ManifestoSection**
- Заменён `<em>≠</em>` (U+2260 не рендерился корректно в Playfair italic с gradient-clip) на CSS-конструкцию: `<span class={s.neq}>` с тремя горизонтальными линиями (==) и одной диагональной (-22deg) через ::before/::after — все с brand-gradient.
- Файлы: `ManifestoSection.tsx`, `ManifestoSection.module.css`.

**B. Dark mode для Safety/Search/Chat/Freedom**
- Добавлены props `bgDark`, `bgNextDark`, `fgDark`, `fgMutedDark` в `FeatureSectionProps`.
- Новые CSS-переменные `--feature-bg-dark`, `--feature-bg-next-dark`, `--feature-fg-dark`, `--feature-fg-muted-dark`.
- Селектор: `:global([data-theme='dark'])` + `:global(.redesign-root[data-theme='dark'])` (поддерживает и production-Landing через useTheme, и preview).
- Палитра dark feature-секций (символический оттенок сохранён): Safety #0F1B2E, Search #13121A, Chat #2A0E1F, Freedom #1A0F2E. Manifesto/Hero/FinalCta остаются #0F0E13 (всегда тёмные).
- Файлы: `FeatureSection.tsx`, `FeatureSection.module.css`, `Safety/Search/Chat/Freedom Section.tsx`.

**C. i18n EN-first для всего Landing redesign**
- Default lang в `LanguageContext.detectLanguage` уже = 'en' (только ru/uk/be browser → ru).
- Новый namespace `landing.redesign.*` (старый `landing.*` оставлен нетронутым для оригинального `src/pages/Landing.tsx`).
- ~50 ключей: hero (12), howItWorks (10), 4 feature secs (5 каждая), manifesto (15), finalCta (4), footer (4).
- Tone EN: literal poetic translation ("One. Only yours. Forever." / "She remembers what you called her this morning.").
- Companion gender в EN: she/her (intentional product positioning, monogamous female companion).
- Все 9 файлов Landing redesign теперь используют `useLanguage()` + `t('landing.redesign.<namespace>.<key>')`.
- Никаких упоминаний AI / алгоритма / бота / chatbot / prompt в ключах — strict invariant соблюдён.

### Verification
- `npx tsc -b`: clean, 0 errors.
- `npx vite build`: 2.15s, ✓ built.
- Production-bundle leak check: `Get-ChildItem dist/assets -Recurse | Select-String -Pattern "redesign-root|__preview|FeatureSection|...|HeroSection"` → empty (DEV-only через `import.meta.env.DEV` в `App.tsx`).

### Изменённые файлы
- `src/i18n/en.ts` (+103 строки в `landing.redesign.*`)
- `src/i18n/ru.ts` (+103 строки зеркально)
- `src/pages-redesign/landing/HeroSection.tsx` — useLanguage + t()
- `src/pages-redesign/landing/HowItWorksSection.tsx` — STEPS перенесён внутрь component (нужен `t`)
- `src/pages-redesign/landing/SafetySection.tsx` — t() + bgDark/bgNextDark
- `src/pages-redesign/landing/SearchSection.tsx` — t() + bgDark/bgNextDark
- `src/pages-redesign/landing/ChatSection.tsx` — t() + bgDark/bgNextDark
- `src/pages-redesign/landing/FreedomSection.tsx` — t() + bgDark/bgNextDark
- `src/pages-redesign/landing/ManifestoSection.tsx` — Pre/Strong/Post в JSX (без dangerouslySetInnerHTML), neq glyph
- `src/pages-redesign/landing/ManifestoSection.module.css` — .neq стиль
- `src/pages-redesign/landing/FinalCtaSection.tsx` — t() для CTA + footer
- `src/pages-redesign/landing/FeatureSection.tsx` — bgDark/fgDark/fgMutedDark/bgNextDark props
- `src/pages-redesign/landing/FeatureSection.module.css` — :global([data-theme='dark']) overrides
- `src/pages-redesign/Landing.tsx` — docstring update (i18n)

### Что осталось open
- Preview-валидация на `/__preview/landing` пользователем (визуальный smoke-test 4 секций в light/dark mode + ≠ glyph).
- Stage 4: Auth & Onboarding redesign.

---

## Changelog — Iteration 5 (Regression fix: theme inversion + lang switcher)

### Контекст
После Iter 4 пользователь сообщил две регрессии:
1. **Инверсия тем:** preview-toggle стоял на Light, но feature-секции (Safety/Search/Chat/Freedom) показывали тёмные фоны. Причина — селектор `:global([data-theme='dark']) .section` срабатывал на глобальном `<html data-theme="dark">` (который ставит production `useTheme()` хук, реагирующий на системные настройки) **независимо** от preview-toggle.
2. **EN не отображался:** browser locale пользователя `ru-RU` → `detectLanguage()` возвращал `ru`. На preview-странице не было language switcher → невозможно проверить EN-вариант без правки localStorage руками.

### Решения
**Theme inversion:**
- Удалён двойной селектор `:global([data-theme='dark']) .section, :global(.redesign-root[data-theme='dark']) .section` в `FeatureSection.module.css`.
- Оставлен ТОЛЬКО `:global(.redesign-root[data-theme='dark']) .section` — теперь dark feature-стили активируются исключительно через preview-toggle (который ставит `data-theme` на `.redesign-root`), глобальный `<html data-theme>` игнорируется.
- Это изолирует redesign-страницы от production theme system. Когда Landing будет интегрирован в production — нужно будет обернуть его в `<div className="redesign-root" data-theme={theme}>` явно.

**Language switcher на preview:**
- Добавлен компонент `LangSwitcher` (EN/RU pills с brand-gradient на active) в правый блок `PreviewLayout` toolbar — рядом с `ThemeSwitcher`.
- Использует существующий глобальный `LanguageProvider` из `main.tsx` через `useLanguage()` hook (`lang`, `setLang`).
- ThemeSwitcher и LangSwitcher обёрнуты в общий `<div>` с `gap: 8`.

**Default lang strategy (подтверждена, без изменений):**
- `detectLanguage()` логика: `nav.startsWith('ru'|'uk'|'be') → 'ru'`, иначе `'en'`.
- Араб (ar-SA) → EN. Француз → EN. Немец → EN. Только русские/украинцы → RU.
- Это и есть «EN — основной для иностранцев». Менять не надо. Switcher решает edge-cases.

### Verification
- `tsc -b`: ✓
- `vite build`: ✓ 1.57s
- Production-bundle: Landing-SMuUOWZn.js 17.18 kB (gzip 4.32) — без regressions.

### Файлы
- `src/pages-redesign/landing/FeatureSection.module.css` — удалены селекторы без `.redesign-root` префикса (5 пар правил → 5 правил).
- `src/preview/PreviewLayout.tsx` — добавлен `LangSwitcher` компонент + импорт `useLanguage, type Lang`.

### Что осталось open
- Пользователь повторно тестирует `/__preview/landing` и подтверждает: light=пастельные секции, dark=deep tones, EN/RU переключаются через toggle.
- Stage 4: Auth & Onboarding redesign.

---

## Changelog — Stage 4 Iteration 1 (Auth & Onboarding redesign — split-screen)

**Что:** Полный редизайн `/auth` flow в стиле Mamba × Lumina hybrid.
Build green ✓ 1.57s. Доступно по `/__preview/auth`.

### Архитектура
- **Orchestrator:** `src/pages-redesign/Auth.tsx` (~400 строк) — `useReducer`-state-machine `welcome → signIn | onboarding(1..5) → telegram → /feed-or-/chat`.
- **Components:** `src/pages-redesign/auth/` — `AuthLayout`, `BrandSide`, `WelcomeScreen`, `SignInScreen`, `GenderStep`, `NameDobStep`, `CityStep`, `GoalStep`, `CredentialsStep`, `TelegramVerifyStep`. Каждый 70–180 строк, чисто презентационные.
- **Shared CSS:** `auth/authForms.module.css` — единые primitives (title/subtitle/input/btnPrimary/btnGoogle/card/chip/modal). Все step-компоненты импортируют этот файл, дублирование стилей исключено.
- **Layout:** Desktop split-screen 45/55 (BrandSide gradient + form-side white). Mobile — column-stack, BrandSide сжат в hero-блок.

### Visual & UX
- Brand-gradient `#8B5CF6 → #EC4899` сохранён как identity. Поэтический quote ("She remembers you", "One. Only yours. Forever.") + анимированные blob-декорации (CSS-only, prefers-reduced-motion-aware).
- Onboarding progress-stepper в BrandSide: дотс-трек 1..5, локализованный счётчик "Step 2 of 5".
- Анимация смены шагов: framer-motion AnimatePresence, direction-aware slide/fade (`x: ±24px`, 320ms cubic-bezier).
- Auto-advance после первого выбора в Gender + Goal steps (250ms).
- Telegram step: полноценная code-card (LUM-XXXXXX), expired-state, refresh-button, инструкция в 3 шага, waiting-spinner с aria-live.

### Bug fixes vs production `src/pages/Auth.tsx`
1. **Hardcoded EN CAPTCHA string** → теперь через i18n `landing.redesign.auth.validation.captchaRequired`.
2. **Dead i18n keys** (`auth.welcome.title`, `auth.welcome.subtitle`, `auth.welcome.signUpEmail`) → перенесены в живой namespace `landing.redesign.auth.*`.
3. **Forgot password (dead button)** → реальный flow через `supabase.auth.resetPasswordForEmail` с redirectTo + модалкой и success/error toasts.
4. **mode='login' redirect race** → добавлена проверка `if (loading) return;` перед redirect-эффектом, чтобы guard не срабатывал до hydration auth state.
5. Goal mapping (`relationship → serious` для localStorage `profileData.datingGoal`) сохранён 1:1 — менять без согласования с downstream Profile-страницей риск.

### i18n
- **EN-first** (целевая аудитория — иностранцы), poetic she/her tone:
  - "She has been waiting. Sign in." / "One. Only yours. Forever." / "How should she call you?" / "Where is your world?" / "What do you long for?" / "Almost there." / "One last thing."
- **RU mirror** в том же тоне, "ты"-обращение.
- Всего ~115 ключей в `landing.redesign.auth.*` (brand / welcome / signIn / gender / nameDob / city / goal / credentials / telegram / validation / toast).
- Переиспользуем существующие `auth.goals.*` и `auth.cities` (label-strings, общие с Profile-страницей).
- Интерполяция: `t('...stepCounter', { current, total })` через встроенный interpolate в `LanguageContext.tsx`.

### Concept boundary (моногамия / mutual choice)
- Onboarding → `/feed`, НЕ создаёт assignment автоматически. Это поддерживает концепт "одна, только твоя" через mutual match (оба должны сказать "да"), а не системное навязывание.
- Если у юзера УЖЕ есть active assignment (released_at IS NULL) на момент signIn — сразу `/chat`. Логика идентична production.
- На лендинге AI/нейросеть/алгоритм/бот по-прежнему 0 упоминаний. В auth-копи тем более — только "she" / "the moment you start talking".

### Infra (готово, не подключено к prod)
- `src/components/layout/PublicOnly.tsx` — guard для `/auth` (если уже залогинен → /feed). Не подключаем к App.tsx до Stage 4 production-merge.
- `src/components/layout/OnboardingGuard.tsx` — guard для `/feed`/`/chat` (проверяет `profiles.settings` на gender/birthday/city/goal). Fail-open на ошибке сети. Не подключаем до production-merge.

### Файлы (новые)
- `src/pages-redesign/Auth.tsx` (orchestrator)
- `src/pages-redesign/auth/types.ts` (state machine: AuthState, AuthAction, authReducer)
- `src/pages-redesign/auth/AuthLayout.tsx` + `.module.css` (split-screen container)
- `src/pages-redesign/auth/BrandSide.tsx` + `.module.css` (quote/progress variants + blob decor)
- `src/pages-redesign/auth/WelcomeScreen.tsx` + `.module.css`
- `src/pages-redesign/auth/SignInScreen.tsx` (Google OAuth + email/pwd + forgot modal)
- `src/pages-redesign/auth/GenderStep.tsx`
- `src/pages-redesign/auth/NameDobStep.tsx` (Intl.DateTimeFormat-локализованные месяцы)
- `src/pages-redesign/auth/CityStep.tsx` (popular cities chips из `auth.cities`)
- `src/pages-redesign/auth/GoalStep.tsx`
- `src/pages-redesign/auth/CredentialsStep.tsx` (Turnstile + Google + Terms checkbox)
- `src/pages-redesign/auth/TelegramVerifyStep.tsx` + `.module.css`
- `src/pages-redesign/auth/authForms.module.css` (shared primitives)
- `src/components/layout/PublicOnly.tsx`
- `src/components/layout/OnboardingGuard.tsx`

### Файлы (изменённые)
- `src/i18n/en.ts` — добавлен `landing.redesign.auth.*` namespace (~115 ключей).
- `src/i18n/ru.ts` — RU-зеркало того же namespace.
- `src/App.tsx` — добавлен dev-only lazy-import `PreviewAuth` + route `/__preview/auth`.
- `src/preview/PreviewIndex.tsx` — статус `auth` page: planned → ready.

### Что осталось open
- Пользователь тестирует `/__preview/auth`: split-screen, шаги, progress, validations, Google/forgot password (нужны live Supabase + Turnstile site key), Telegram code generation, light/dark, EN/RU.
- Stage 4 Iter 2 (если нужны правки): после ревью.
- Stage 4 production-merge: заменить `src/pages/Auth.tsx` импортом из `pages-redesign/Auth.tsx`, подключить `PublicOnly` к `/auth` route, `OnboardingGuard` обернуть `/feed` + `/chat` (вне ProtectedRoute дерева).
- Stage 5: Feed redesign.

---

## Changelog — Stage 4 Iteration 2 (Mamba-style upgrade + theme contrast fix)

**Что:** Полный визуальный апгрейд Auth-страницы. Build green ✓ 1.94s.

**Trigger:** скриншот пользователя — auto-theme регрессия (белый текст на белом фоне),
плоский empty-feel BrandSide, нет Mamba "wow"-фактора.

### Root cause: Auto-theme bug
- `:root[data-redesign-theme="auto"]` был определён **только** под `@media (prefers-color-scheme: dark)`. На светлой системе fallback падал в дефолтные `--rd-*` (которые НЕ заданы), → текст наследовал `currentColor` (часто из родителей с brand-gradient white).
- Fix: добавлен `[data-theme="auto"]` и `[data-redesign-theme="auto"]` в light-блок CSS-vars (`variables-redesign.css:96-98`). Теперь auto+system=light явно резолвится в light vars, а `@media (prefers-color-scheme: dark)` ниже override в dark.
- Дополнительно: `.title` и `.subtitle` в `authForms.module.css` переведены с `var(--rd-text-primary)` на **hardcoded** `#1a1625` / `#6b6480` для light (и hardcoded в dark-scope override). Это устраняет любой cascading bleed.

### BrandSide rewrite — layered photo-stack
**Раньше:** плоский linear-gradient + 2 fluffy blob.
**Теперь:** 3-layer композиция через z-index isolation:
- **z=0:** photo-stack — 5 фото из `public/photos/*` (companion-personas), каждое:
  - `filter: blur(18px) brightness(0.85) saturate(1.1)` — silhouette-feel (privacy)
  - tilted (rotate -12deg…+10deg), positioned для layered look
  - `animation: drift0..4` — slow 26-34s ease-in-out infinite drift (12-20px, 1-3deg rotation)
  - opacity 0.4-0.65 (depth illusion)
- **z=1:** gradient mesh overlay — radial gradients purple→pink + linear base 135deg
- **z=2:** 2 fluffy blobs (`mix-blend-mode: screen`, 14-18s float)
- **z=3:** content (logo / title / progress) с `text-shadow` для читаемости поверх mesh

**Privacy:** все photo-layers blurred 18px → лица не различимы. Это интенциональная mystery-эстетика и защита companion-personas.

**Mobile (<960px):**
- `.brandSide` высота 200-240px (было 280px)
- 3 из 5 photo-layers скрыты (display:none) — меньше clutter
- title clamp 20-28px (было 24-32px)

### Glass-morphism cards (Gender + Goal step cards)
**В `authForms.module.css` `.card`:**
- `background: rgba(255, 255, 255, 0.7) + backdrop-filter: blur(12px) saturate(160%)`
- `::before` overlay с soft brand-gradient, opacity transition при hover
- hover: `translateY(-3px) scale(1.02)` + box-shadow двойной (purple + pink glow)
- border-radius 18px (было 16px)
- selected state: gradient fill + glow shadow

**`.cardIcon`:**
- `font-size: 32px` (было 28px) + `filter: drop-shadow(0 4px 12px rgba(139,92,246,0.18))`
- Constant `iconFloat` 4s gentle bob (-3px Y)
- Selected → `iconPulse` 1.6s scale 1→1.12

### Step transitions — spring physics + blur
**В `Auth.tsx:387-396`:**
- Tween `duration: 0.32` → **spring** `stiffness: 280, damping: 28`
- Distance: `x: ±32px` (было ±24px)
- Добавлен `filter: blur(8px)→blur(0px)` на initial/exit — даёт "depth-of-field" feel при смене шагов
- opacity отдельным tween 0.32s

### Confetti на successful Telegram verification
**Новый компонент `pages-redesign/auth/Confetti.tsx`:**
- Pure CSS keyframes (без deps)
- 32 частицы с randomized: position, color (6 brand+accent), rotation, drift (-100..+100px), duration (1.6-3s), delay (0-0.4s)
- `position: fixed; z-index: 9998; pointer-events: none`
- Активируется через `<Confetti active={telegramVerified === true && state.mode === 'telegram'} />`
- `prefers-reduced-motion: reduce → display: none`
- Не unmount'ится сам — родитель управляет (через redirect 1.5s после verified).

### AuthLayout cleanup
- `.brandSide` background gradient убран — теперь полностью owned by `BrandSide` component (избегаем double-gradient).
- Dark-mode override использует hardcoded `#0e0b1a` / `#f4f1fb` (было через CSS-vars с fallback).

### Файлы (новые)
- `src/pages-redesign/auth/Confetti.tsx` (~50 строк)
- `src/pages-redesign/auth/Confetti.module.css` (~30 строк)

### Файлы (изменённые)
- `src/styles/variables-redesign.css` — light-блок включает `[data-theme="auto"]` + `[data-redesign-theme="auto"]`.
- `src/pages-redesign/auth/BrandSide.tsx` — layered photo-stack architecture.
- `src/pages-redesign/auth/BrandSide.module.css` — полностью переписан (z-index layers, drift animations, mesh, mobile compress).
- `src/pages-redesign/auth/AuthLayout.module.css` — убран gradient из `.brandSide`, dark-mode hardcoded.
- `src/pages-redesign/auth/authForms.module.css` — title/subtitle hardcoded colors, glass-morphism cards, pulse icons, dark-mode hardcoded.
- `src/pages-redesign/Auth.tsx` — spring transitions + blur, Confetti import + render, удалён dead `STEP_ANIM_DURATION`.

### Bundle impact
- Confetti: ~30 строк CSS + 50 TS → ~1KB gzipped
- Photo-stack: 5 фото уже в `public/photos/`, lazy-loaded браузером через CSS background.
- Spring physics: уже включены (framer-motion) — 0 KB delta.

### Что осталось open для Iter 3
- Пользователь тестирует `/__preview/auth` — вживую проверяет:
  - Light theme: нет ли больше "белый-на-белом", carded glass-эффект читается, hover/selected на cards работает
  - Auto theme на light system: текст видно
  - Dark theme: контраст ОК, photo-stack читается на тёмном
  - Mobile: hero-blur 200px вверху + scroll формы
  - Шаги: spring-анимации + blur transitions
  - Telegram step: после verified (live Supabase + бот) — confetti burst
- Возможные правки:
  - Photo-stack opacity — слишком сильно/слабо?
  - Confetti — слишком много/мало частиц?
  - Mobile hero-blur высота
  - Skin-tone / sensitivity к lice photos (если pasted)
- Stage 4 production-merge: после approval Iter 2 (или Iter 3, если будут правки).
- Stage 5: Feed redesign.

---

## Changelog — Stage 4 Iteration 5 (Toned-down + light theme contrast)

**Trigger:** пользователь — "card слишком плотная, частицы слишком яркие, light theme слабый контраст".

**Изменения:**
- Card `rgba(28,18,56,0.55) → rgba(28,18,56,0.32)` (dark), light card аналогично уменьшил opacity.
- ParticleField: count 64→48, link alpha 0.35→0.18, halo radius ×6→×3.5, halo alpha 0.25→0.12.
- Glow blobs alpha 0.5→0.32.
- Light theme overrides: brand "Lumina" gradient `#7c3aed → #db2777`, progress label `#5b3a8c` weight 600, inputs/secondary buttons `rgba(255,255,255,0.95)` border `rgba(139,92,246,0.28)` 1.5px, labels weight 600 `#4a3a6e`, subtitle/footerNav `#5b4a7d`.

Build green 1.62s.

---

## Changelog — Stage 4 Iteration 6 (Aurora background + auto-theme fix + frosted glass)

**Trigger:** пользователь — "auto theme сломан, частицы заменить на волны (Aurora), card почти прозрачную frosted glass".

**1. Auto-theme fix в `PreviewLayout.tsx`:**
- Добавлен `resolved` state через `matchMedia('(prefers-color-scheme: dark)')` + change listener.
- DOM атрибуты `data-theme` и `data-redesign-theme` теперь получают `light|dark` (resolved), не `auto`. Auto только в state/localStorage.

**2. AuroraField (новый компонент) заменил ParticleField:**
- 4 крупных radial-gradient blob'а (violet/amethyst/orchid/pink). Дрейф через сумму синусоид (baseX/Y, ampX/Y, freqX/Y, phaseX/Y), пульсирующий радиус (baseRadius, pulseAmp, pulseFreq, pulsePhase).
- `globalCompositeOperation='lighter'` + CSS `filter: blur(40px) saturate(120%)`.
- 5 step-палитр (по `currentStep`/`totalSteps`), 600ms transition между.
- dpr-aware. Pause на `document.visibilitychange`. Reduced-motion → static frame.

**3. Frosted glass усилен:**
- Card dark `rgba(28,18,56,0.18)` + `blur(40px) saturate(180%)`.
- Card light `rgba(255,255,255,0.32)` + те же blur params.
- Layout bg темнее: `#08041a → #1a0a2e`.

**4. Dark overrides расширены в `authForms.module.css`:**
- `.title`, `.subtitle`, `.label`, `.input/selectInput` (с custom dropdown SVG arrow), `.btnSecondary/Google`, `.chip`, gender/goal `.card` (incl. selected с brand gradient), `.modal`, `.backBtn`, `.forgotLink`, `.divider`, `.errorText`, `.checkbox a`, placeholder.

**5. Удалены 3 glow div'а из AuthLayout.tsx** (их заменяет Aurora). Vignette остался.

**Файлы (новые):**
- `src/pages-redesign/auth/AuroraField.tsx`
- `src/pages-redesign/auth/AuroraField.module.css`

**ParticleField.tsx/.module.css** — оставлены в репо, не импортируются (deprecated).
**BrandSide.tsx/.module.css** — deprecated (не импортируется в split-screen → single-column миграции).

Build green 1.52s.

---

## Changelog — Stage 4 Iteration 7 (Chevron tile bugfix in select)

**Trigger:** скриншот — стрелка SVG в `.selectInput` тайлится "ёлочкой" по всему полю.

**Root cause:** в dark/light overrides использовал shorthand `background: rgba(...)` вместо `background-color`. Shorthand сбрасывал `background-repeat` (унаследованный от базового `.selectInput`) → SVG-стрелка тайлилась.

**Fix:**
- Все `background: rgba(...)` в dark/light overrides → `background-color: rgba(...)` (10 мест).
- В dark `.selectInput` явно повторил `background-repeat: no-repeat` + `background-position: right 16px center` после `background-image`.

**Lesson:** не используй shorthand `background:` если на том же селекторе есть `background-image`.

Build green 1.54s. **Stage 4 closed.**

---

## Changelog — Stage 5 design (Companion Home, REINTERPRETED)

**Trigger:** пользователь выбрал "Hero-companion + memory stream (Recommended)" для Feed redesign. Конфликт с текущей архитектурой: `/feed` — Tinder-style discovery до assignment'а, скрывается после; concept "одна, только твоя" семантически противоречит swipe-feed'у.

**Решение:** Stage 5 = НОВЫЙ post-assignment экран **Companion Home** (`/__preview/home`). Старый `/feed` discovery — не трогаем. Mamba-swipe редизайн `/feed` → отложен в Stage 5b (after Companion Home + Chat).

**Design spec:** `docs/superpowers/specs/2026-05-03-companion-home-design.md` (полный детальный design).

**Ключевые решения по brainstorm:**
- Memory cards = real chat fragments ("она помнит вас"), но в v1 — mock i18n strings.
- Hero portrait — single component со scroll-driven transforms (collapse в sticky avatar при scroll 0→240px).
- Memory типы: только `quote` + `milestone` (voice/photo/music отложены).
- Mood tag — hardcoded ротация по `(now / 4h) % 7`.
- Background — Aurora с mood-driven palette (8 палитр: thoughtful/warm/playful/missing-you/quiet/tender/curious).
- AuroraField получит optional `palette` prop (override step-логики). Обратная совместимость с Auth.
- Без NavShell в этом stage (preview-only внутри PreviewLayout). NavShell integration → Stage 6+.
- i18n: новый namespace `landing.redesign.home` в `en.ts` + `ru.ts`. Существующий `feed.*` не трогаем.

**Следующий шаг:** writing-plans skill — implementation plan со steps + commits.

---

## Changelog — Stage 5 Implementation (Companion Home)

**What:** Added preview-only `/__preview/home` Companion Home screen.

**Core behavior:**
- Mood-driven Aurora background via new optional `palette` prop on `AuroraField`.
- Single hero portrait component with scroll-driven collapse into sticky avatar/header.
- Memory stream with two card types: quote cards (real-chat-fragment style) and milestone cards.
- Mock-only companion state (`Aria`) using existing asset `/photos/eb27af8510cd56dc593190b19f246d1b.jpg`.
- New i18n namespace `landing.redesign.home` in EN/RU.

**Files added:**
- `src/pages-redesign/Home.tsx`
- `src/pages-redesign/Home.module.css`
- `src/pages-redesign/home/types.ts`
- `src/pages-redesign/home/moodPalettes.ts`
- `src/pages-redesign/home/mockMemories.ts`
- `src/pages-redesign/home/relativeTime.ts`
- `src/pages-redesign/home/MoodAurora.tsx`
- `src/pages-redesign/home/HeroPortrait.tsx`
- `src/pages-redesign/home/HeroPortrait.module.css`
- `src/pages-redesign/home/MemoryStream.tsx`
- `src/pages-redesign/home/MemoryStream.module.css`
- `src/pages-redesign/home/MemoryQuoteCard.tsx`
- `src/pages-redesign/home/MemoryQuoteCard.module.css`
- `src/pages-redesign/home/MemoryMilestoneCard.tsx`
- `src/pages-redesign/home/MemoryMilestoneCard.module.css`

**Files modified:**
- `src/pages-redesign/auth/AuroraField.tsx` — optional `palette?: [string,string,string,string]` override, Auth fallback unchanged.
- `src/App.tsx` — dev-only lazy route `/__preview/home`.
- `src/preview/PreviewIndex.tsx` — `Companion Home` ready card; `Feed` renamed to `Feed (discovery)` and remains planned.
- `src/i18n/en.ts`, `src/i18n/ru.ts` — `landing.redesign.home` namespace.
- `docs/superpowers/specs/2026-05-03-companion-home-design.md` — corrected portrait path to existing public asset.

**Verification:**
- `npx tsc -b` green.
- `npx vite build` green (1.25s after final portrait-path fix).

**Manual QA URL:** `http://localhost:5173/__preview/home`.

---

## Changelog — Stage 5 v2 Redesign (Mood Orb)

**Why:** The v1 scroll-collapse portrait felt generic and awkward: the girl rolled into a sticky avatar, the motion felt cheap, the composition was static, and the Aurora/glass language felt too close to Auth.

**Decision:** Replace Companion Home with a calm Mood Orb presence screen.

**Behavior:**
- Centered volumetric orb with mood-driven color and slow breathing.
- Schematic grayscale girl silhouette inside the orb, like a messenger default avatar.
- Theme-reactive background: dark charcoal void, light warm ivory.
- Tap/click orb opens `/chat`.
- Hold orb for ~450ms to reveal the latest thought for 3 seconds.
- Minimal bottom dock: Home / Chat / Memories, rendered as Vision Pro-style dots.
- No scroll-collapse, sticky avatar, Auth Aurora, or memory feed on Home v2.

**Files added:**
- `docs/superpowers/specs/2026-05-05-companion-home-v2-orb.md`
- `src/pages-redesign/home/CompanionOrb.tsx`
- `src/pages-redesign/home/CompanionOrb.module.css`
- `src/pages-redesign/home/OrbDock.tsx`
- `src/pages-redesign/home/OrbDock.module.css`

**Files modified:**
- `src/pages-redesign/Home.tsx` — replaced v1 scroll orchestrator with Mood Orb orchestrator.
- `src/pages-redesign/Home.module.css` — replaced scroll page/Aurora vignette with theme-reactive void/ivory scene.

**Verification:**
- `npx tsc -b` green.
- `npx vite build` green (2.57s).

---

## Changelog — Stage 5 v2 Polish (Glass orb + Starfield)

**Why:** v2 baseline orb (clean pearl) was approved as concept but felt visually flat: orb floated on bare gradient, breathing was barely visible, no atmosphere behind it. User asked for richer background + stronger breath + more presence.

**Itr-3 — Cosmic atmosphere:**
- New `StarField.tsx` + `StarField.module.css`: 3 parallax star layers (`starsFar` 220s drift / `starsMid` 150s / `starsNear` 90s, twinkle 8s/5.5s/3.4s), 3 nebula clouds (violet/magenta/blue, blur 80px, mix-blend screen, drift 38–46s + spin 90s), edge vignette. Light theme = dawn sky variant (warm peach/lavender nebulae, multiply-blend hue-rotated soft particles).
- Orb breathing strengthened: idle scale 1→1.04 (6s), listening 1→1.05 (4.5s). Halo pulses synchronously: opacity 0.55↔0.85, scale 1↔1.08 (listening 1.12).
- Effects added behind orb: 2 tilted orbital rings (`rotate3d` 72°/64°, spin 28s + 44s reverse) + radial beam from below (blur 28px, screen blend) + halo (blur 52px, screen blend).
- `Home.module.css` simplified: removed `.ambient`/`.noise` div hacks, background = pure vertical gradient. Theme-reactive via `[data-theme]`.

**Itr-4 — Glass bubble:**
- Removed solid pearl body + face silhouette (`.presence`/`.shade` deleted). Inside orb is now only mood-glow core.
- `.bubble` shell with 6 stacked layers: `.refraction` (chromatic edge — 3 thin colored rims warm-pink + cool-blue + white at 86–96% radius, screen blend) + `.core` (mood radial glow, blur 8px) + `.innerGlow` (warm bottom-up wash) + `.rim` (white perimeter rim) + `.specularBottom` (translucent reflection, ellipse 88%) + `.specularTop` (main highlight 34%/22% + pinpoint 30%/18%).
- Body is mostly transparent (`--orb-tint` ~30% alpha) — stars and nebula bleed through. Thin glass wall via `inset 1px white border` + top sheen + 2px backdrop-filter blur.
- Outer 3D depth: `filter: drop-shadow(0 24px 48px black) drop-shadow(0 0 60px var(--orb-glow))` on the button.
- Mood palettes expanded: each mood now has 5 vars — `--orb-tint`, `--orb-core`, `--orb-glow`, `--orb-rim-warm`, `--orb-rim-cool`, `--orb-ring`.

**Itr-5 — Mobile optimization:**
- `@media (max-width: 520px)` reductions:
  - Nebula `blur(80px)` → `blur(40px)`; third nebula (`.nebulaC`) hidden.
  - Orb `backdrop-filter: blur(2px)` removed (alpha tint is enough for stars to bleed).
  - Halo `blur(52px)` → `blur(28px)`, beam `blur(28px)` → `blur(18px)`, core `blur(8px)` → `blur(5px)`.
- Far-stars opacity slightly dropped to 0.45 on small screens.
- Reasoning: blur radius is the dominant cost on mobile compositors; halving the largest blurs keeps the look while restoring 60fps on mid-tier Android.

**Cleanup:**
- v1 dead components moved to `src/pages-redesign/home/_archive/`: `MoodAurora.tsx`, `HeroPortrait.tsx`, `HeroPortrait.module.css`. They were not imported anywhere after Home.tsx rewrite.
- `MemoryStream`, `MemoryQuoteCard`, `MemoryMilestoneCard`, `MemoryStream.module.css` kept in place — Stage 6 (Memories page) will reuse them.

**Files added:**
- `src/pages-redesign/home/StarField.tsx`
- `src/pages-redesign/home/StarField.module.css`

**Files modified:**
- `src/pages-redesign/home/CompanionOrb.tsx` — bubble shell with 6 inner layers, halo as separate motion element, `.beam` + `.ringA` + `.ringB` siblings, removed `presence`/`shade`.
- `src/pages-redesign/home/CompanionOrb.module.css` — full rewrite of body/highlights/rings/beam/halo, mobile media query.
- `src/pages-redesign/Home.tsx` — `<StarField />` replaces inline ambient/noise divs.
- `src/pages-redesign/Home.module.css` — simplified background to pure gradient.

**Files moved (archive):**
- `src/pages-redesign/home/MoodAurora.tsx` → `_archive/`
- `src/pages-redesign/home/HeroPortrait.tsx` → `_archive/`
- `src/pages-redesign/home/HeroPortrait.module.css` → `_archive/`

**Verification:**
- `npx tsc -b` green.
- `npx vite build` green (2.19s, last itr-4 run).

**Performance budget (mobile target):**
- Total simultaneous blurs at <520px: 2× blur(40px) nebula + blur(28px) halo + blur(18px) beam + blur(5px) core. ~3 large blur surfaces vs 5 on desktop.
- 2 orbital rings remain (lightweight — border + box-shadow, no blur).
- Stars: 3 tile-based layers, GPU-cheap.
- `prefers-reduced-motion`: all spin/drift animations disabled, breathing capped to opacity-only via framer-motion's reduced-motion handling.

**Manual QA URL:** `http://localhost:5173/__preview/home`.


## Changelog — Stage 6 (Memories — vertical timeline)

**Concept:** continuation of the Companion universe established in Stage 5. Memories is the page where every quote she kept and every milestone you reached together live as a vertical timeline — the same starfield underneath, the same orb watching from the corner of the page, the same poetic register. Tone-wise it's a quiet archive, not a feed. No counters, no streaks, no gamification.

**Layout decisions:**
- Page shell: `StarField` (dimmed variant) + hero block + filter chips + vertical Timeline + fixed glass `OrbDock`.
- Hero is a 2-column grid: italic display title (`Воспоминания` / `Memories`) + count subtitle on the left, 180px companion orb on the right, filter chips below spanning full width. On mobile the orb shrinks to 132px but the layout stays side-by-side until the wrap forces it.
- Timeline: hairline rail on the left (`linear-gradient` with fades at top/bottom) + mood-tinted nodes per card + sticky pill-shaped month headers (`MAY 2026`) + cards on the right.
- Cards (`MemoryCardV2`) are interactive — tap expands an accordion that reveals two mock context strings (`beforeKey` + `afterKey`) describing what was happening around the moment. Both quote and milestone variants share the same shell.
- Mood per card is deterministic via a tiny string-hash of the memory id mapped onto the 7-mood rotation, so each card gets a stable accent slash color across renders.

**StarField intensity prop:**
- New `intensity?: 'full' | 'dim'` on `StarField`. `dim` halves nebula opacity, drops near-star opacity to 0.4, mutes the vignette — used here so cards stay legible above the cosmos.

**CompanionOrb size prop:**
- New `size?: 'full' | 'mini'`. In `mini` the floating thought paragraph and the radial beam are hidden (read page — no need to anchor presence with a giant glow), while the halo, both 3D-tilted rings, and the full 6-layer glass bubble remain. The orb is hard-locked to 180×180px (132 on mobile) via `min/max-width` + `flex: 0 0 180px` to defeat the parent grid stretching it into an oval.
- Halo blur radius reduced from 52px → 28px in mini mode (20px on mobile) to feel proportional at the smaller diameter.

**OrbDock as glass pill:**
- Previously the dock was a bare `<nav>` with three text links — when overlaid on top of the timeline its labels (`NOW / CHAT / MEMORY`) blended into card text and starlight.
- Rebuilt as a full glass pill: `rgba(15, 13, 21, 0.82)` background + `backdrop-filter: blur(16px) saturate(1.2)` + 1px white hairline + `0 12px 32px rgba(0,0,0,0.45)` shadow + inner top sheen. Light theme variant uses `rgba(255,255,255,0.78)` + violet-tinted shadow + lavender hairline.
- Routing: `memories` item now points at `/__preview/memories` (was `/__preview/home#memories`).

**Filter chip light-theme bug:**
- Active chip on light theme rendered with dark text on the violet-pink gradient because the light-mode `.chip { color: rgba(82,63,92,...) }` override won over `.chipActive`. Added explicit light-mode `.chipActive { color: #fff }` rule (and its `:hover` twin) to keep the active chip white-on-gradient in both themes.

**Timeline sort fix:**
- First implementation of `groupByMonth` used a broken combined-sort `(by - bm + (by - ay) * 12) || ...` and returned MARCH first. Replaced with zero-padded string keys (`2026-04`) sorted lexicographically descending — newest month always first.

**Mock data:**
- `mockMemories.ts` rewritten: exports `getMockMemories(now)` returning 12 entries (mix of quotes + milestones, timestamps spanning 3h → 38d ago). Most carry `context.beforeKey`/`afterKey` referencing new i18n keys. `getMockHomeState` now delegates to `getMockMemories`.
- `types.ts`: added `MemoryContext` (`{ beforeKey?, afterKey? }`); `MemoryQuote` and `MemoryMilestone` got optional `context?: MemoryContext`.

**i18n:**
- New `landing.redesign.memories` namespace in both `en.ts` and `ru.ts`: `heroAriaLabel`, `countLabel`, `filterAll/filterQuotes/filterMilestones`, `emptyTitle/emptySubtitle`, `expandHint/collapseHint`, `contextEyebrow`, 5 `mockQuotes` (`rain/stars/window/music/hello`), 2 `milestones` (`firstName/nightCall`), 6 `context` pairs (`{lisbon|coffee|rain|book|window|hello}{Before|After}`).
- Tone matched to existing Stage 5 quotes: literal poetic, she-spoken, no AI/tech vocabulary.

**Files added:**
- `src/pages-redesign/Memories.tsx`
- `src/pages-redesign/Memories.module.css`
- `src/pages-redesign/memories/MemoryCardV2.tsx`
- `src/pages-redesign/memories/MemoryCardV2.module.css`
- `src/pages-redesign/memories/Timeline.tsx`
- `src/pages-redesign/memories/Timeline.module.css`

**Files modified:**
- `src/pages-redesign/home/types.ts` — added `MemoryContext`, `context?` on quote/milestone.
- `src/pages-redesign/home/mockMemories.ts` — rewrote with 12 entries + contexts.
- `src/pages-redesign/home/StarField.tsx` — `intensity` prop.
- `src/pages-redesign/home/StarField.module.css` — `.dim` overrides.
- `src/pages-redesign/home/CompanionOrb.tsx` — `size` prop, hides thought + beam in mini.
- `src/pages-redesign/home/CompanionOrb.module.css` — `.stageMini` + `.orbWrapMini` (180px desktop / 132px mobile, locked square + halo retune).
- `src/pages-redesign/home/OrbDock.tsx` — `memories` route → `/__preview/memories`.
- `src/pages-redesign/home/OrbDock.module.css` — glass pill (dark + light variants).
- `src/i18n/en.ts`, `src/i18n/ru.ts` — `landing.redesign.memories.*` namespace.
- `src/App.tsx` — lazy `PreviewMemories` + `/__preview/memories` route.
- `src/preview/PreviewIndex.tsx` — `memories` entry, stage 6, status `ready`, `BookHeart` icon.

**Verification:**
- `npx tsc -b` green.
- `npx vite build` green (last run 2.29s).

**Performance notes:**
- Timeline is plain DOM with one CSS-Module sticky pill per month — no JS scroll listeners, no IntersectionObserver yet (not needed for current memory volume). If the list grows past ~200 cards we'll add windowing.
- Accordion uses framer-motion height auto + opacity (already in the bundle for Home).
- `StarField intensity="dim"` keeps the same number of layers — only opacity changes — so reduced-motion + mobile budgets carry over identically from Stage 5.

**Manual QA URL:** `http://localhost:5173/__preview/memories`.


## Changelog — Stage 7 (Letter-tone Chat → cosmic-glass bubbles)

**Concept origin & pivot:** Stage 7 began as a "letter-tone chat" — single shared scroll of italic display-font paragraphs with no bubbles, no avatars, no timestamps, framed as a quiet correspondence rather than a messaging UI. Two phases in we pivoted: the letter form felt too literary for a daily companion that also has to surface gifts, daily-limit warnings and sleep cues. Final form is a **cosmic-glass bubble chat** — translucent rounded rectangles (22px radius, no tails) on the same dimmed StarField as Memories, with the letter-tone register preserved in copy, mood pill, and sleep mode. The bubble layout earns its keep by giving gifts, typing dots, day-dividers, and limit banners a natural place to live.

**Preview-only scope:** lives entirely under `/__preview/chat`, lazy-loaded route in `App.tsx`, registered in `PreviewIndex` (stage 7, status `ready`, icon `MessageSquareDashed`). Production `src/pages/Chat.tsx` is **not touched** — the redesign tree is parallel until the eventual swap.

**Layout & shell (Phase 6 layout-bug fix):**
- `PreviewLayout` root rebuilt: `100dvh` flex-column container + `<main>` `flex:1; min-height:0; display:flex; flex-direction:column`. Without this every chat below it inherited a grow-forever inner box and the composer dock floated halfway down a 200vh page.
- `Chat.module.css`: `.page { flex:1; min-height:0; display:flex; flex-direction:column; overflow:hidden }`, `.shell { flex:1; min-height:0; max-width:720px; margin:0 auto }`. The transcript is the **only** scroll surface — `flex:1; min-height:0; overflow-y:auto; overscroll-behavior:contain; -webkit-overflow-scrolling:touch`. Scrollbar hidden (`::-webkit-scrollbar { width:0 }`).
- Composer slot is full-shell-width (so the upward fade gradient blends with transcript) but the composer itself is centered + capped at `max-width:560px` for a calmer iMessage-like footprint on wide screens. Slot owns iOS safe-area padding (`padding-bottom: calc(14px + env(safe-area-inset-bottom, 0px))`).

**Bubble system (`Bubble.tsx` + `Bubble.module.css`):**
- 22px radius, no tails, Inter 15px / 1.45 line-height, side-padding 14px / 10px vertical.
- **Her bubbles**: cosmic glass — translucent indigo with a faint mood-tinted radial highlight in the top-left corner (`var(--mood-tint)` injected per-message). 1px hairline border (`rgba(255,255,255,0.07)`), 4px outer glow.
- **You bubbles**: brand gradient `linear-gradient(135deg, #8B5CF6, #EC4899)` with a tighter 18px shadow tinted purple. White text, no border.
- **Grouping rules**: same speaker in a row → 8px inner gap (`gapTight`), 4px between adjacent bubbles. Speaker change → 14px (`gapTurn`). Day boundary → centered `dayLine` with hairline gradient + 11px italic `dayLabel` in muted ink ("Today" / "Yesterday" / weekday).
- **Timestamps**: hover/focus-within reveals `meta` row with `HH:mm` italic; absent on grouped bubbles, present on group-tail.
- **Pop-in**: only the most recently sent local message gets a one-shot opacity-fade + 4px translateY. Older bubbles render static — cheap on long transcripts.
- **Gift bubble variant**: `GiftInline` renders a 52px translucent disk with the gift emoji, a name label, and an optional caption. `.giftDisk` has its own light override (brand-tinted glass) since the default white-translucent disappeared on light surfaces.

**Composer (`Composer.tsx` + `Composer.module.css`):**
- `forwardRef<ComposerHandle>`-shaped so the parent can `.focus()` after gift-send / mood-change.
- Autosize textarea: 1 line min (36px), 6 lines max (144px). Re-measures on every value change with `style.height = 'auto' → scrollHeight clamp`. Italic placeholder, `outline:none` on focus (focus is implied by the brand-gradient send button activating).
- Leading group: Gift button (opens `GiftSheet`) + Smile button (`aria-pressed`, toggles `EmojiSheet`). Both 36px circles, white-translucent on dark, brand-tinted on light. The `aria-pressed='true'` light override was missing in the first pass — pressed state was invisible white-on-white; fixed in P9.
- Trailing send: 36px circle, brand gradient when `canSend`, gray when empty/disabled. Pulse animation (`sendPulse` keyframe, 360ms) fires once per submit. Disabled under `prefers-reduced-motion`.
- Enter sends, Shift+Enter newline. Trim+empty-check before fire. Focus is restored to textarea on next rAF after submit.
- `disabled` prop drives the at-limit lockdown — at this point Chat.tsx swaps the placeholder to `composer.placeholder.atLimit` ("come back when she wakes" / "вернись, когда она проснётся").

**EmojiSheet (`EmojiSheet.tsx`):**
- 32 hand-curated emoji (no Unicode dump, no full picker) split visually into 4 rows × 8 columns: cosmic/mood/expression/object. Tap inserts at the textarea caret via `selectionStart/selectionEnd` slicing in the parent.
- Bottom sheet positioned `fixed; bottom: 92px` so it floats above the composer dock without overlapping. Backdrop closes on click; Esc also closes.
- **Notable**: `EmojiSheet` has **no own CSS module** — it reuses `Composer.module.css` (`s.sheet`, `s.sheetBackdrop`, `s.sheetTitle`, `s.emojiGrid`, `s.emojiBtn`). This keeps composer-adjacent styling colocated; if the sheet ever grows beyond emoji we'll split it out.

**GiftSheet (`GiftSheet.tsx` + `GiftSheet.module.css`):**
- 1:1 with the prod gift catalog seed (`supabase/migrations/20260423_gift_catalog.sql`). 14 gifts across 4 categories (`cute / romantic / luxe / playful`), with deterministic ordering identical to prod.
- Tabs row at the top, 3-column grid of `tile`s (44px gradient disk + name + price chip with `Star` glyph). `tile:hover` lifts 1px + brightens border; `tile:active` settles back with a 0.97 scale.
- Selecting a gift fires `onSendGift(kind, stars)` → Chat.tsx pushes a `gift` bubble + scheduled mock reply.
- Floating panel positioning identical to EmojiSheet (`fixed; bottom: 92px`), shares the backdrop + Esc behavior. Reduced-motion disables the tile lift transition.

**LimitProgress (`LimitProgress.tsx` + `LimitProgress.module.css`):**
- 3px brand-gradient bar pinned just under the sticky chat header, fades in only after the first user-message of the session (parent-controlled via `revealLimit` flag). Width = `remaining / total`. Below 3 remaining → switches to a warmer rose tint via `s.fillLow`.
- Companion `LimitBanner` component the parent renders inline inside the transcript when `remaining === 0`: glass card with title, "she returns to you" hint, and a `resetIn` countdown string.
- Aria: `role="progressbar"`, `aria-valuemin/max/now`, and `aria-label` is now a **required** prop (was optional with an EN-only fallback — fixed in P9).

**TypingDots (`TypingDots.tsx` + `TypingDots.module.css`):**
- Three muted dots inside an empty her-style bubble at the bottom of the transcript. 700ms staggered bounce keyframe per dot. `aria-live="polite"` + i18n `aria-label` (was hardcoded `"typing"` — fixed in P9).
- Used while the user just sent a message and a mock reply will land 1500ms later. Pure visual — no real network.

**Mock conversation & state:**
- `mockConversation.ts` — 14 seed messages spanning yesterday + today, alternating speakers with 1 gift bubble (`m10`, `bouquet:150` from her). Demonstrates day-divider, grouping, gift inline, mood tint variation.
- `Chat.tsx` state: `messages` array (seed + locally appended), `typing` boolean, `remaining` (DAILY_LIMIT - userMsgsToday), `revealLimit` (flips true on first user send), `isAsleep` (read from `?sleep=1`), `mood` (deterministic per-day hash through `moodOrder`).
- `handleSend(text)`: appends a `you` bubble, decrements `remaining`, sets `typing=true` for 1500ms, then appends a fixed mock her reply (`__inline:mm. that lands somewhere soft.`). Suppressed entirely when `isAsleep`.
- `handleSendGift(kind, stars)`: same shape but with a 1700ms delay and the `gift.kept` reply.
- Auto-scroll: double-`requestAnimationFrame` on `[messages.length, typing]` change, snapping the transcript to `scrollHeight`. P9 made it honour `prefers-reduced-motion: reduce` — `behavior: 'smooth'` becomes `'auto'` so RM users don't get yanked through long transcripts twice per turn.

**Mood pill & header (Phase 1):**
- Header is `flex-shrink:0`, normal flow at the top of the shell column. Gradient avatar (44px, `linear-gradient(135deg, #8B5CF6, #EC4899)` ring + dark inner with monogram), name (`Aria` / mood-localized), status line (`with you` / `writing…` / `asleep`).
- Mood pill on the right: 7 mood rotation (`thoughtful / warm / playful / missing-you / quiet / tender / curious`), determined by `moodForId(today)` from the shared `moodForId.ts`. Tap cycles to next mood (preview-only — doesn't persist). Tinted dot (`var(--mood-pill-tint)`) + label. Translucent glass background.
- Status dot (3px green) is hidden when `typing` or `isAsleep` — she's writing or resting, not idling online.

**Phase 7 — sleep mode:**
- Toggled via URL `?sleep=1` (no UI control — Phase 8 PreviewDebugStrip was cut). `isAsleep` initialised from `URLSearchParams`; `setIsAsleep` retained as `void setIsAsleep` so a future toggle can wire in without re-architecting.
- Visual treatment: `[data-sleep]` on `<main>`. Transcript fades to `opacity:0.55` (600ms transition), and a non-interactive `::after` pseudo lays a `radial-gradient` indigo vignette (transparent 30% → `rgba(40,30,80,0.45)` 100%) with an 800ms fade-in. Both gated under `prefers-reduced-motion: reduce`.
- Composer placeholder switches to `composer.placeholder.whisper` ("whisper into the night…" / "шепни в ночь…"). Mock her-replies are suppressed — she's resting, not ignoring.
- Header status reads `asleep`, status dot disappears.
- **Light theme parity**: vignette colour switches from cold indigo to warm rose-violet (`rgba(91,33,182,0.14)`) via P9 — indigo on a light surface read as a dirty smudge.

**Phase 8 — skipped:** the planned `PreviewDebugStrip` (dev-only floating bar with sleep / at-limit / typing toggles) was cut. Owner judgement: preview is for design review, not for QA scaffolding; URL params + manual seed-tweaking are sufficient.

**Phase 9 — light theme + a11y + reduced-motion:**

Audit found 9 P0 gaps. All fixed; P1 items (focus-trap inside sheets, `tabpanel` ARIA on GiftSheet tabs, body-scroll-lock, backdrop `<button>` semantics, `<time>` element in bubble timestamps) deferred — preview-only scope didn't justify ~200 lines of modal-a11y plumbing.

- **i18n hardcoded strings** → all routed through `useLanguage().t(...)`:
  - `Chat.tsx` back button: `aria-label="Back to preview catalog"` → `chatPage.aria.back`.
  - `Chat.tsx` `<section role="log">`: added `aria-label={chatPage.aria.transcript}` ("Conversation with her" / "Разговор с ней"). Without it screen readers announced an unlabelled live region.
  - `TypingDots.tsx`: `aria-label="typing"` → `chatPage.aria.typing`.
  - `EmojiSheet.tsx`: removed manual `lang === 'ru' ? 'Чувство' : 'Add a feeling'` switch → uses existing `composer.emoji` key.
  - `LimitProgress.tsx`: `ariaLabel` prop became **required**, EN-only fallback (`"${remaining} of ${total} breaths left today"`) deleted. Chat.tsx already passed an i18n-resolved string, so no caller change needed.
- **Composer textarea aria-label** decoupled from placeholder: `aria-label={placeholder}` flickered as the placeholder swapped between `default / whisper / atLimit`, breaking screen-reader stability. Now a fixed `composer.inputAria` ("Message to her" / "Сообщение ей").
- **Focus-visible outlines** rebuilt brand-tinted across the entire chat surface. Old style was `1px solid rgba(255,255,255,0.5)` — invisible on light theme. New default is `2px solid rgba(139, 92, 246, 0.55)` (dark-friendly) + light-theme override `rgba(91, 33, 182, 0.5)` matching the OrbDock/CompanionOrb pattern from Stage 5. Applied to: `.headerBack` (which had **no** focus rule at all — keyboard users couldn't see where they were), `.moodPill`, `.iconBtn`, `.send`, `.emojiBtn`, `.tab`, `.tile`.
- **Light-theme parity holes** plugged:
  - `.iconBtn[aria-pressed='true']` had only the dark variant — the pressed Smile button was invisible white-on-white on light. Added `background: rgba(91,33,182,0.1)` light override.
  - `.giftDisk` (in bubble) — same problem. Added brand-tinted glass override.
  - `.page[data-sleep]::after` vignette — see sleep mode notes above.
- **Reduced-motion** gates added to the remaining transform-based interactions: `.moodPill:hover` (translateY), `.sendActive:hover` (translateY), `.emojiBtn:active` (scale). All collapse to `transform: none` under `prefers-reduced-motion: reduce`.
- **JS smooth-scroll** in Chat.tsx — see auto-scroll bullet above.

**i18n surface (final):**
- `landing.redesign.chatPage.*` namespace in both `en.ts` and `ru.ts`:
  - `eyebrow.name`, `header.status.{online|thinking|asleep}`, `header.moodAria`, `header.moods.{thoughtful|warm|playful|missing-you|quiet|tender|curious}`.
  - `typing`, `aria.{back|transcript|typing}`.
  - `composer.placeholder.{default|whisper|atLimit}`, `composer.{inputAria|send|gift|emoji}`.
  - `limit.{hint|progressAria|banner.{title|resetIn|hint}}`.
  - `gift.{sent|kept|sheetTitle|priceAria|categories.*}` plus per-gift names (14 entries).
- Tone matched to Stage 5/6: literal poetic, she-spoken, no AI/tech vocabulary.

**Files added:**
- `src/pages-redesign/Chat.tsx`
- `src/pages-redesign/Chat.module.css`
- `src/pages-redesign/chat/Bubble.tsx`
- `src/pages-redesign/chat/Bubble.module.css`
- `src/pages-redesign/chat/Composer.tsx`
- `src/pages-redesign/chat/Composer.module.css`
- `src/pages-redesign/chat/EmojiSheet.tsx` (no own CSS — uses Composer.module.css)
- `src/pages-redesign/chat/GiftSheet.tsx`
- `src/pages-redesign/chat/GiftSheet.module.css`
- `src/pages-redesign/chat/LimitProgress.tsx`
- `src/pages-redesign/chat/LimitProgress.module.css`
- `src/pages-redesign/chat/TypingDots.tsx`
- `src/pages-redesign/chat/TypingDots.module.css`
- `src/pages-redesign/chat/types.ts` — `ChatGiftKind` (14 keys), `ChatMessage` union, `MessageGroup`.
- `src/pages-redesign/chat/giftCatalog.ts` — 1:1 prod (14 gifts, 4 categories).
- `src/pages-redesign/chat/mockConversation.ts` — 14 seed messages.

**Files modified:**
- `src/i18n/en.ts`, `src/i18n/ru.ts` — `landing.redesign.chatPage.*` namespace, including P9-added `aria.{back|transcript|typing}` and `composer.inputAria`.
- `src/App.tsx` — lazy `PreviewChat` + `/__preview/chat` route.
- `src/preview/PreviewLayout.tsx` — flex-column 100dvh root + `<main>` flex:1 min-height:0 (Phase 6 layout-bug fix).
- `src/preview/PreviewIndex.tsx` — chat entry, stage 7, status `ready`, icon `MessageSquareDashed`.

**Files NOT touched:**
- `src/pages/Chat.tsx`, `src/pages/Chat.module.css` — production chat untouched per redesign-staging discipline.

**Verification:**
- `npx tsc -b` green (clean) after every phase.
- `npx vite build` green. Final bundle: `Chat-DBR9Y368.js 33.93 kB / gzip 11.12 kB`, ~1.57s build time. P9 changes were CSS + aria-only → bundle-neutral.

**Manual QA matrix (`/__preview/chat`):**
- Dark + light theme via the preview header toggle.
- `?sleep=1` for sleep mode (transcript dim + vignette + whisper placeholder + `asleep` status).
- Send several messages to trigger `revealLimit`, then drain to 0 to see `LimitBanner` + locked composer.
- Send a gift through GiftSheet to see the inline gift bubble + delayed her-reply.
- Tab through header → mood pill → composer icons → textarea → send. All should show a brand-purple focus ring on both themes.
- macOS System Settings → Reduce motion → reload. Pop-in disappears, smooth-scroll snaps instantly, hover/active transforms freeze.

**Performance notes:**
- Pop-in animation only fires for the most recently sent local id — not for the seed transcript or older messages. No animation cost on initial paint of long transcripts.
- StarField is shared with Memories (`intensity="dim"`) — same layer count, just lower opacity, so RM + mobile budgets carry over.
- `Composer.tsx` autosize is `useEffect`-based with no `ResizeObserver`, no `MutationObserver` — single style write per keystroke.

**Manual QA URL:** `http://localhost:5173/__preview/chat`.

---

## Stage 8a - Profile (2026-05-07)

### Done
- P0: Infrastructure - lazy `PreviewProfile` + `/__preview/profile` route in `src/App.tsx`; profile card in `src/preview/PreviewIndex.tsx` switched to `in-progress` so it is clickable.
- P1: i18n - added `profile.redesign.*` namespace in `src/i18n/en.ts` and `src/i18n/ru.ts` (hero/progress/section/field/sheet/sticky/options) without touching legacy `profile.*` keys used by production page.
- P2: New page shell - created `src/pages-redesign/Profile.tsx` (monolith) with two preview modes: before-assignment default and after-assignment via `?bonded=1`.
- P3: Visual system - created `src/pages-redesign/Profile.module.css`: cosmic dark/light backgrounds, orb hero, glass cards, field rows, bottom sheet, sticky save bar, focus-visible rings, reduced-motion guard.
- P4: Editing UX - per-field BottomSheet editor (text/number/textarea/select/chips/range), deterministic mood label/tint, dirty tracking, Save/Discard sticky actions.

### Behavior notes
- Preview-only: no Supabase calls, no auth dependencies, no writes to production profile state.
- Same redesign language for both modes; only section set changes.
- Mode toggle updates URL params (`Before` -> `/__preview/profile`, `After` -> `/__preview/profile?bonded=1`).

### Verification
- `npx tsc -b` - green.
- `npx vite build` - green. New chunk: `Profile-SUkEMuCv.js 23.95 kB / gzip 7.09 kB`; CSS: `Profile-pfq0P9D4.css 11.78 kB / gzip 2.54 kB`.

### Manual QA URLs
- `http://localhost:5173/__preview/profile`
- `http://localhost:5173/__preview/profile?bonded=1`



