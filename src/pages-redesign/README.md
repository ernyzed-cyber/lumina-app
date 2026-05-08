# pages-redesign/

Staging-папка для редизайна страниц по плану `plans/redesign-mamba-inspired.md`.

## Правила

1. **Не импортировать** отсюда из production-кода (`src/pages/`, `src/App.tsx` основные роуты).
2. Всё, что здесь — рендерится только через `/__preview/*` (dev-only роут).
3. Каждая redesign-страница должна:
   - Использовать только токены из `src/styles/variables-redesign.css` (с префиксом `--rd-*`).
   - Не зависеть от AssignmentProvider / useAuth / Supabase напрямую — данные приходят
     props'ами из mocks (`src/preview/mocks.ts`).
   - Иметь scoped CSS (`.module.css` рядом).
4. Когда страница утверждена владельцем — она **переносится** в `src/pages/` (overwrite),
   зависимости из `components-redesign/` переносятся в `src/components/`, а здесь файл удаляется.

## Стиль

- CSS Modules рядом с компонентом.
- framer-motion для анимаций (с `useReducedMotion`).
- Lucide иконки.
- На старте — placeholder-картинки (gradient + lucide), реальные фото подмешиваем потом.

## Этапы

См. `plans/redesign-mamba-inspired.md` §16. Текущий этап: **0 (Staging-инфраструктура)**.
