import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageTransition from '../components/layout/PageTransition';
import { useLanguage } from '../i18n';
import s from './Legal.module.css';

export default function Privacy() {
  const { lang, t } = useLanguage();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <PageTransition>
      <div className={s.page}>
        {/* Top bar */}
        <div className={s.topBar}>
          <Link to="/" className={s.backBtn}>
            <ArrowLeft size={16} />
            {t('legal.backToHome')}
          </Link>
          <span className={s.topLogo}>Lumina</span>
        </div>

        <main className={s.main}>
          {/* Header */}
          <div className={s.header}>
            <h1 className={s.pageTitle}>{t('legal.privacy.pageTitle')}</h1>
            <p className={s.subtitle}>{t('legal.privacy.subtitle')}</p>
            <span className={s.lastUpdated}>
              {t('legal.lastUpdated', { date: 'April 12, 2026' })}
            </span>
          </div>

          {lang === 'ru' ? <PrivacyRU /> : <PrivacyEN />}

          {/* Navigation between legal pages */}
          <div className={s.legalNav}>
            <Link to="/terms" className={s.legalNavLink}>
              {t('landing.footer.termsOfService')}
            </Link>
            <Link to="/privacy" className={`${s.legalNavLink} ${s.legalNavLinkActive}`}>
              {t('landing.footer.privacyPolicy')}
            </Link>
            <Link to="/community-guidelines" className={s.legalNavLink}>
              {t('landing.footer.communityGuidelines')}
            </Link>
          </div>
        </main>
      </div>
    </PageTransition>
  );
}

/* ═══════════════════════════════════════════
   English version
   ═══════════════════════════════════════════ */
function PrivacyEN() {
  return (
    <div className={s.content}>
      <div className={s.section}>
        <h2 className={s.sectionTitle}>1. Introduction</h2>
        <p className={s.paragraph}>
          Lumina ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our dating application ("Service").
        </p>
        <p className={s.paragraph}>
          By using the Service, you consent to the data practices described in this Privacy Policy. If you do not agree with the terms of this Privacy Policy, please do not use the Service.
        </p>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>2. Information We Collect</h2>

        <h3 className={s.sectionSubtitle}>2.1 Information You Provide</h3>
        <ul className={s.list}>
          <li><strong>Account data:</strong> name, email address, date of birth, gender, city, and relationship goals provided during registration;</li>
          <li><strong>Profile data:</strong> biography, profile photo, and other information you choose to share;</li>
          <li><strong>Messages:</strong> content of messages you send and receive through the Service;</li>
          <li><strong>Payment data:</strong> billing information processed through third-party payment providers (Stripe, YooKassa). We do not store full credit card numbers.</li>
        </ul>

        <h3 className={s.sectionSubtitle}>2.2 Automatically Collected Information</h3>
        <ul className={s.list}>
          <li><strong>Device information:</strong> browser type, operating system, device identifiers;</li>
          <li><strong>Usage data:</strong> pages visited, features used, timestamps, interactions with other profiles;</li>
          <li><strong>Location data:</strong> approximate location based on your selected city (we do not use GPS tracking);</li>
          <li><strong>Cookies and similar technologies:</strong> session data for authentication and analytics.</li>
        </ul>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>3. How We Use Your Information</h2>
        <p className={s.paragraph}>We use the collected information for the following purposes:</p>
        <ul className={s.list}>
          <li>To create and manage your account;</li>
          <li>To provide, operate, and maintain the Service;</li>
          <li>To personalize your experience and deliver relevant profiles;</li>
          <li>To facilitate communication between users;</li>
          <li>To process transactions and manage subscriptions;</li>
          <li>To send important notifications about your account and the Service;</li>
          <li>To detect, prevent, and address fraud, abuse, and security issues;</li>
          <li>To improve the Service through analytics and user feedback;</li>
          <li>To comply with legal obligations.</li>
        </ul>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>4. Data Sharing and Disclosure</h2>
        <p className={s.paragraph}>We do not sell your personal information. We may share your data in the following circumstances:</p>
        <ul className={s.list}>
          <li><strong>With other users:</strong> your profile information (name, photo, bio, city) is visible to other users of the Service;</li>
          <li><strong>Service providers:</strong> trusted third-party providers who assist us in operating the Service (hosting, analytics, payment processing);</li>
          <li><strong>Legal requirements:</strong> when required by law, regulation, or legal process;</li>
          <li><strong>Safety:</strong> to protect the rights, property, or safety of Lumina, our users, or the public;</li>
          <li><strong>Business transfers:</strong> in connection with a merger, acquisition, or sale of assets.</li>
        </ul>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>5. Data Security</h2>
        <p className={s.paragraph}>
          We implement appropriate technical and organizational security measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. These measures include:
        </p>
        <ul className={s.list}>
          <li>Encryption of data in transit (TLS/SSL);</li>
          <li>Encryption of sensitive data at rest;</li>
          <li>Row-level security policies in our database;</li>
          <li>Regular security assessments and updates;</li>
          <li>Access controls and authentication mechanisms.</li>
        </ul>
        <p className={s.paragraph}>
          However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.
        </p>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>6. Data Retention</h2>
        <p className={s.paragraph}>
          We retain your personal information for as long as your account is active or as needed to provide the Service. When you delete your account, we permanently remove your personal data within 30 days, except where retention is required by law or for legitimate business purposes (e.g., fraud prevention).
        </p>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>7. Your Rights</h2>
        <p className={s.paragraph}>Depending on your jurisdiction, you may have the following rights:</p>
        <ul className={s.list}>
          <li><strong>Access:</strong> request a copy of the personal data we hold about you;</li>
          <li><strong>Correction:</strong> request correction of inaccurate or incomplete data;</li>
          <li><strong>Deletion:</strong> request deletion of your personal data;</li>
          <li><strong>Data portability:</strong> request your data in a structured, machine-readable format;</li>
          <li><strong>Withdraw consent:</strong> withdraw consent for data processing at any time;</li>
          <li><strong>Object:</strong> object to processing of your data for certain purposes.</li>
        </ul>
        <p className={s.paragraph}>
          To exercise any of these rights, please contact us at <a href="mailto:privacy@lumina.app" style={{ color: 'var(--accent-lavender)' }}>privacy@lumina.app</a>.
        </p>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>8. Cookies</h2>
        <p className={s.paragraph}>
          We use essential cookies for authentication and session management. We may also use analytics cookies to understand how users interact with the Service. You can manage cookie preferences through your browser settings.
        </p>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>9. Third-Party Services</h2>
        <p className={s.paragraph}>
          The Service may integrate with third-party services (e.g., Google OAuth for authentication, Supabase for data storage, Stripe for payments). These services have their own privacy policies, and we encourage you to review them.
        </p>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>10. Children's Privacy</h2>
        <p className={s.paragraph}>
          The Service is not intended for individuals under 18 years of age. We do not knowingly collect personal information from minors. If we learn that we have collected data from a user under 18, we will promptly delete it.
        </p>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>11. Changes to This Policy</h2>
        <p className={s.paragraph}>
          We may update this Privacy Policy from time to time. We will notify you of material changes by updating the "Last updated" date at the top of this page. We encourage you to review this policy periodically.
        </p>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>12. Contact Us</h2>
        <div className={s.contactInfo}>
          <h3 className={s.contactTitle}>Privacy questions?</h3>
          <p className={s.paragraph}>
            If you have any questions about this Privacy Policy or our data practices, please contact us:
          </p>
          <a className={s.contactEmail} href="mailto:privacy@lumina.app">privacy@lumina.app</a>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Russian version
   ═══════════════════════════════════════════ */
function PrivacyRU() {
  return (
    <div className={s.content}>
      <div className={s.section}>
        <h2 className={s.sectionTitle}>1. Введение</h2>
        <p className={s.paragraph}>
          Lumina («мы», «нас», «наш») обязуется защищать вашу конфиденциальность. Настоящая Политика конфиденциальности описывает, как мы собираем, используем, раскрываем и защищаем вашу персональную информацию при использовании нашего приложения для знакомств («Сервис»).
        </p>
        <p className={s.paragraph}>
          Используя Сервис, вы соглашаетесь с практиками обработки данных, описанными в настоящей Политике. Если вы не согласны с условиями данной Политики, пожалуйста, не используйте Сервис.
        </p>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>2. Информация, которую мы собираем</h2>

        <h3 className={s.sectionSubtitle}>2.1 Информация, которую вы предоставляете</h3>
        <ul className={s.list}>
          <li><strong>Данные аккаунта:</strong> имя, адрес электронной почты, дата рождения, пол, город и цели знакомства, указанные при регистрации;</li>
          <li><strong>Данные профиля:</strong> биография, фотография профиля и другая информация, которую вы решили предоставить;</li>
          <li><strong>Сообщения:</strong> содержание сообщений, которые вы отправляете и получаете через Сервис;</li>
          <li><strong>Платёжные данные:</strong> платёжная информация обрабатывается сторонними платёжными провайдерами (Stripe, ЮKassa). Мы не храним полные номера банковских карт.</li>
        </ul>

        <h3 className={s.sectionSubtitle}>2.2 Автоматически собираемая информация</h3>
        <ul className={s.list}>
          <li><strong>Информация об устройстве:</strong> тип браузера, операционная система, идентификаторы устройства;</li>
          <li><strong>Данные об использовании:</strong> посещённые страницы, используемые функции, временные метки, взаимодействия с другими профилями;</li>
          <li><strong>Данные о местоположении:</strong> приблизительное местоположение на основе выбранного города (мы не используем GPS-отслеживание);</li>
          <li><strong>Файлы cookie и аналогичные технологии:</strong> данные сессий для аутентификации и аналитики.</li>
        </ul>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>3. Как мы используем вашу информацию</h2>
        <p className={s.paragraph}>Мы используем собранную информацию для следующих целей:</p>
        <ul className={s.list}>
          <li>Создание и управление вашим аккаунтом;</li>
          <li>Предоставление, эксплуатация и поддержка Сервиса;</li>
          <li>Персонализация вашего опыта и подбор релевантных профилей;</li>
          <li>Обеспечение коммуникации между пользователями;</li>
          <li>Обработка транзакций и управление подписками;</li>
          <li>Отправка важных уведомлений о вашем аккаунте и Сервисе;</li>
          <li>Обнаружение, предотвращение и устранение мошенничества, злоупотреблений и проблем безопасности;</li>
          <li>Улучшение Сервиса на основе аналитики и обратной связи;</li>
          <li>Соблюдение требований законодательства.</li>
        </ul>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>4. Передача и раскрытие данных</h2>
        <p className={s.paragraph}>Мы не продаём ваши персональные данные. Мы можем передавать данные в следующих случаях:</p>
        <ul className={s.list}>
          <li><strong>Другим пользователям:</strong> информация вашего профиля (имя, фото, биография, город) видна другим пользователям Сервиса;</li>
          <li><strong>Поставщикам услуг:</strong> доверенным сторонним поставщикам, которые помогают нам в работе Сервиса (хостинг, аналитика, обработка платежей);</li>
          <li><strong>Юридические требования:</strong> когда это требуется законом, регулированием или юридическим процессом;</li>
          <li><strong>Безопасность:</strong> для защиты прав, собственности или безопасности Lumina, наших пользователей или общества;</li>
          <li><strong>Бизнес-сделки:</strong> в связи со слиянием, приобретением или продажей активов.</li>
        </ul>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>5. Безопасность данных</h2>
        <p className={s.paragraph}>
          Мы применяем соответствующие технические и организационные меры безопасности для защиты ваших персональных данных от несанкционированного доступа, изменения, раскрытия или уничтожения. Эти меры включают:
        </p>
        <ul className={s.list}>
          <li>Шифрование данных при передаче (TLS/SSL);</li>
          <li>Шифрование конфиденциальных данных при хранении;</li>
          <li>Политики безопасности на уровне строк в базе данных;</li>
          <li>Регулярные оценки безопасности и обновления;</li>
          <li>Контроль доступа и механизмы аутентификации.</li>
        </ul>
        <p className={s.paragraph}>
          Однако ни один метод передачи через Интернет или электронного хранения не является на 100% безопасным. Несмотря на наши усилия по защите данных, мы не можем гарантировать абсолютную безопасность.
        </p>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>6. Хранение данных</h2>
        <p className={s.paragraph}>
          Мы храним вашу персональную информацию до тех пор, пока ваш аккаунт активен или пока это необходимо для предоставления Сервиса. При удалении аккаунта мы безвозвратно удалим ваши персональные данные в течение 30 дней, за исключением случаев, когда хранение требуется по закону или для законных деловых целей (например, предотвращение мошенничества).
        </p>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>7. Ваши права</h2>
        <p className={s.paragraph}>В зависимости от вашей юрисдикции вы можете обладать следующими правами:</p>
        <ul className={s.list}>
          <li><strong>Доступ:</strong> запросить копию персональных данных, которые мы храним о вас;</li>
          <li><strong>Исправление:</strong> запросить исправление неточных или неполных данных;</li>
          <li><strong>Удаление:</strong> запросить удаление ваших персональных данных;</li>
          <li><strong>Переносимость данных:</strong> запросить данные в структурированном, машиночитаемом формате;</li>
          <li><strong>Отзыв согласия:</strong> отозвать согласие на обработку данных в любое время;</li>
          <li><strong>Возражение:</strong> возражать против обработки данных в определённых целях.</li>
        </ul>
        <p className={s.paragraph}>
          Для реализации любого из этих прав свяжитесь с нами по адресу <a href="mailto:privacy@lumina.app" style={{ color: 'var(--accent-lavender)' }}>privacy@lumina.app</a>.
        </p>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>8. Файлы cookie</h2>
        <p className={s.paragraph}>
          Мы используем основные файлы cookie для аутентификации и управления сессиями. Мы также можем использовать аналитические cookie для понимания того, как пользователи взаимодействуют с Сервисом. Вы можете управлять настройками cookie через параметры вашего браузера.
        </p>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>9. Сторонние сервисы</h2>
        <p className={s.paragraph}>
          Сервис может интегрироваться со сторонними сервисами (например, Google OAuth для аутентификации, Supabase для хранения данных, Stripe для платежей). Эти сервисы имеют собственные политики конфиденциальности, и мы рекомендуем вам ознакомиться с ними.
        </p>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>10. Конфиденциальность несовершеннолетних</h2>
        <p className={s.paragraph}>
          Сервис не предназначен для лиц младше 18 лет. Мы сознательно не собираем персональную информацию несовершеннолетних. Если мы узнаем, что собрали данные пользователя младше 18 лет, мы незамедлительно удалим их.
        </p>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>11. Изменения в Политике</h2>
        <p className={s.paragraph}>
          Мы можем обновлять настоящую Политику конфиденциальности время от времени. Мы уведомим вас о существенных изменениях, обновив дату «Последнее обновление» вверху страницы. Рекомендуем периодически просматривать эту политику.
        </p>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>12. Свяжитесь с нами</h2>
        <div className={s.contactInfo}>
          <h3 className={s.contactTitle}>Вопросы по конфиденциальности?</h3>
          <p className={s.paragraph}>
            Если у вас есть вопросы о настоящей Политике конфиденциальности или о практиках обработки данных, свяжитесь с нами:
          </p>
          <a className={s.contactEmail} href="mailto:privacy@lumina.app">privacy@lumina.app</a>
        </div>
      </div>
    </div>
  );
}
