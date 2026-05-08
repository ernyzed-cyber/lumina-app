# components-redesign/

Staging-папка для новых reusable-компонентов редизайна.

## Что сюда попадает

- **Примитивы**: новые версии Button, Input, Avatar (с префиксом или просто свои стили).
- **Layout**: BottomTabBar, PageHeader, SidebarRedesign.
- **Surfaces**: GlassCard, BottomSheet.
- **Feature-specific**: GalleryPager (для GirlProfileDrawer), CompatibilityRing, и т.д.

## Правила

1. Использовать только токены `--rd-*` из `variables-redesign.css`.
2. CSS Modules рядом с компонентом.
3. Не импортировать из `src/components/` (production) — иначе теряем изоляцию.
   Если нужен какой-то существующий хук типа `useTheme` — импортировать из `src/hooks/`,
   но не из самих компонентов.
4. Все компоненты типизированы (TypeScript strict).
5. Все интерактивные элементы поддерживают `prefers-reduced-motion`.

## Промоушн в production

Когда владелец одобряет страницу, использующую компонент отсюда:

1. Перенести `src/components-redesign/Foo.tsx` → `src/components/Foo.tsx` (overwrite).
2. Обновить импорты в перенесённой странице с `../components-redesign/Foo` на `../components/Foo`.
3. Удалить файл из `components-redesign/`.
4. Коммит: `feat(redesign): promote Foo component`.
