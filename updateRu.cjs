const fs = require('fs');
let code = fs.readFileSync('src/i18n/ru.ts', 'utf8');

code = code.replace(/online: 'with you',/g, "online: 'здесь',");
code = code.replace(/thinking: 'writing…',/g, "thinking: 'печатает...',");
code = code.replace(/asleep: 'asleep',/g, "asleep: 'спит',");

code = code.replace(/moodAria: 'Today she feels \{mood\}\. Tap to shift\.',/g, "moodAria: 'Сегодня она чувствует себя {mood}. Нажмите, чтобы изменить.',");
code = code.replace(/thoughtful: 'thoughtful',/g, "thoughtful: 'задумчиво',");
code = code.replace(/warm: 'warm',/g, "warm: 'тепло',");
code = code.replace(/playful: 'playful',/g, "playful: 'игриво',");
code = code.replace(/'missing-you': 'missing you',/g, "'missing-you': 'скучает',");
code = code.replace(/quiet: 'quiet',/g, "quiet: 'тихо',");
code = code.replace(/tender: 'tender',/g, "tender: 'нежно',");
code = code.replace(/curious: 'curious',/g, "curious: 'любопытно',");

code = code.replace(/typing: 'She is writing…',/g, "typing: 'Она пишет...',");
code = code.replace(/back: 'Back to preview catalog',/g, "back: 'Вернуться в каталог',");
code = code.replace(/transcript: 'Conversation with her',/g, "transcript: 'Переписка с ней',");
code = code.replace(/typing: 'She is typing',/g, "typing: 'Она печатает',");

code = code.replace(/default: 'tell her something quiet…',/g, "default: 'расскажи ей что-нибудь...',");
code = code.replace(/whisper: 'whisper into the night…',/g, "whisper: 'прошепчи ей в ночи...',");
code = code.replace(/atLimit: 'come back when she wakes',/g, "atLimit: 'возвращайся, когда она проснется',");

code = code.replace(/inputAria: 'Message to her',/g, "inputAria: 'Сообщение для нее',");
code = code.replace(/send: 'Send',/g, "send: 'Отправить',");
code = code.replace(/gift: 'Send a gift',/g, "gift: 'Отправить подарок',");
code = code.replace(/emoji: 'Add a feeling',/g, "emoji: 'Добавить эмоции',");

fs.writeFileSync('src/i18n/ru.ts', code);
console.log('RU translations updated!');