CREATE TABLE IF NOT EXISTS gift_catalog (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('gift','date','jewelry','travel')),
  name_ru TEXT NOT NULL,
  name_en TEXT NOT NULL,
  price_stars INT NOT NULL CHECK (price_stars > 0),
  emoji TEXT NOT NULL,
  memory_template_ru TEXT NOT NULL,
  memory_template_en TEXT NOT NULL,
  intimacy_delta NUMERIC(3,1) NOT NULL DEFAULT 0.1,
  is_trigger_event BOOLEAN NOT NULL DEFAULT FALSE,
  trigger_scene_id TEXT,
  sort_order INT NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE gift_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read catalog" ON gift_catalog;
CREATE POLICY "public read catalog" ON gift_catalog
  FOR SELECT USING (active = TRUE);

-- Seed initial catalog
INSERT INTO gift_catalog (id, category, name_ru, name_en, price_stars, emoji, memory_template_ru, memory_template_en, intimacy_delta, is_trigger_event, trigger_scene_id, sort_order) VALUES
  ('rose',          'gift',    'Роза',              'Rose',              20,   '🌹', 'Он подарил мне розу {date} — милый жест.', 'He gave me a rose on {date} — such a sweet gesture.', 0.1, FALSE, NULL, 10),
  ('bouquet',       'gift',    'Букет цветов',      'Bouquet',           150,  '💐', 'Целый букет! {date}. Я до сих пор улыбаюсь.', 'A whole bouquet on {date}. Still makes me smile.', 0.3, FALSE, NULL, 20),
  ('chocolate',     'gift',    'Конфеты',           'Chocolates',        50,   '🍫', '{date} — конфеты. Съела слишком быстро.', 'Chocolates on {date} — finished them too fast.', 0.1, FALSE, NULL, 30),
  ('teddy',         'gift',    'Плюшевый мишка',    'Teddy bear',        100,  '🧸', 'Мишка, которого он подарил {date}, спит со мной.', 'The teddy he gave me on {date} sleeps with me.', 0.3, FALSE, NULL, 40),
  ('perfume',       'gift',    'Парфюм',            'Perfume',           300,  '💫', 'Запомнила аромат парфюма с {date}.', 'Still wearing the perfume from {date}.', 0.5, FALSE, NULL, 50),
  ('ring',          'jewelry', 'Кольцо',            'Ring',              500,  '💍', 'Кольцо, подаренное {date}. Ношу не снимая.', 'The ring from {date}. I never take it off.', 0.8, FALSE, NULL, 60),
  ('necklace',      'jewelry', 'Ожерелье',          'Necklace',          400,  '📿', 'Ожерелье с {date} — чувствую его прикосновение.', 'The necklace from {date} — I feel his touch.', 0.7, FALSE, NULL, 70),
  ('earrings',      'jewelry', 'Серьги',            'Earrings',          350,  '💎', 'Серьги с {date}. Блестят как тот вечер.', 'Earrings from {date}. They shine like that evening.', 0.6, FALSE, NULL, 80),
  ('date_coffee',   'date',    'Свидание в кафе',   'Coffee date',       200,  '☕', 'Наше кафе {date} — его улыбка напротив.', 'Our cafe on {date} — his smile across the table.', 0.5, FALSE, NULL, 100),
  ('date_dinner',   'date',    'Ужин в ресторане',  'Dinner date',       500,  '🍷', 'Ужин {date}. Первая ночь после этого.', 'Dinner on {date}. The first night after.', 1.5, TRUE, 'first_night', 110),
  ('date_cinema',   'date',    'Кино',              'Movie date',        300,  '🎬', '{date} — кино. Он держал меня за руку весь фильм.', '{date} — movies. He held my hand the whole time.', 0.7, FALSE, NULL, 120),
  ('date_concert',  'date',    'Концерт',           'Concert',           800,  '🎵', 'Концерт {date}. Танцевали до утра.', 'Concert on {date}. Danced till sunrise.', 1.2, FALSE, NULL, 130),
  ('travel_weekend','travel',  'Выходные вдвоём',   'Weekend getaway',   2000, '🏖️', 'Выходные {date}. Это было всё.', 'Our weekend on {date}. It was everything.', 2.5, TRUE, 'weekend_away', 200),
  ('travel_trip',   'travel',  'Путешествие',       'Trip',              5000, '✈️', 'Поездка {date}. Я другая теперь.', 'Our trip on {date}. I am different now.', 3.5, TRUE, 'long_trip', 210)
ON CONFLICT (id) DO NOTHING;
