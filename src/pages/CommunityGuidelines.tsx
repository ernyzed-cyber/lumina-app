import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageTransition from '../components/layout/PageTransition';
import { useLanguage } from '../i18n';
import s from './Legal.module.css';

export default function CommunityGuidelines() {
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
            <h1 className={s.pageTitle}>{t('legal.community.pageTitle')}</h1>
            <p className={s.subtitle}>{t('legal.community.subtitle')}</p>
            <span className={s.lastUpdated}>
              {t('legal.lastUpdated', { date: 'April 12, 2026' })}
            </span>
          </div>

          {lang === 'ru' ? <GuidelinesRU /> : <GuidelinesEN />}

          {/* Navigation between legal pages */}
          <div className={s.legalNav}>
            <Link to="/terms" className={s.legalNavLink}>
              {t('landing.footer.termsOfService')}
            </Link>
            <Link to="/privacy" className={s.legalNavLink}>
              {t('landing.footer.privacyPolicy')}
            </Link>
            <Link to="/community-guidelines" className={`${s.legalNavLink} ${s.legalNavLinkActive}`}>
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
function GuidelinesEN() {
  return (
    <div className={s.content}>
      <div className={s.section}>
        <h2 className={s.sectionTitle}>Our Mission</h2>
        <p className={s.paragraph}>
          Lumina is a place for genuine connections. We believe everyone deserves to feel safe, respected, and valued when meeting new people. These Community Guidelines help create that environment. Violating these guidelines may result in account warnings, temporary suspension, or permanent removal.
        </p>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>1. Be Authentic</h2>
        <ul className={s.list}>
          <li><strong>Use real photos:</strong> your profile photos should accurately represent you. No stock photos, celebrity images, or heavily manipulated pictures;</li>
          <li><strong>Be honest:</strong> provide truthful information about yourself. Misrepresenting your age, identity, or intentions undermines trust;</li>
          <li><strong>One account per person:</strong> do not create multiple accounts or impersonate others.</li>
        </ul>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>2. Be Respectful</h2>
        <ul className={s.list}>
          <li><strong>Treat others with kindness:</strong> everyone on Lumina is a real person with feelings. Be courteous and considerate in your interactions;</li>
          <li><strong>Accept rejection gracefully:</strong> not every match will lead to a conversation, and not every conversation will lead to a date. Respect boundaries;</li>
          <li><strong>No hate speech:</strong> discrimination based on race, ethnicity, nationality, gender, sexual orientation, religion, disability, or any other characteristic is strictly prohibited;</li>
          <li><strong>No bullying or harassment:</strong> repeated unwanted contact, insults, or intimidation will not be tolerated.</li>
        </ul>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>3. Keep It Safe</h2>
        <ul className={s.list}>
          <li><strong>No threats or violence:</strong> any form of threats, descriptions of violence, or incitement to harm is strictly prohibited;</li>
          <li><strong>No sharing of personal information:</strong> do not share others' personal details (addresses, phone numbers, workplace) without their consent;</li>
          <li><strong>Report suspicious behavior:</strong> if someone makes you feel unsafe or uncomfortable, report them immediately;</li>
          <li><strong>Meet safely:</strong> when meeting someone in person, choose a public place, tell a friend where you are going, and trust your instincts.</li>
        </ul>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>4. Appropriate Content</h2>
        <ul className={s.list}>
          <li><strong>No explicit or sexual content:</strong> profile photos and messages must not contain nudity, pornography, or sexually explicit material;</li>
          <li><strong>No graphic violence:</strong> content depicting violence, gore, or cruelty is not permitted;</li>
          <li><strong>No illegal content:</strong> do not post content that promotes illegal activities, including drug use, weapons, or other prohibited substances;</li>
          <li><strong>Respect intellectual property:</strong> do not share copyrighted material without permission.</li>
        </ul>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>5. No Spam or Commercial Activity</h2>
        <ul className={s.list}>
          <li><strong>No advertising:</strong> do not use the platform to promote products, services, or other platforms;</li>
          <li><strong>No solicitation:</strong> requests for money, gifts, or financial assistance are prohibited;</li>
          <li><strong>No automated accounts:</strong> bots, scripts, or automated tools to interact with the Service are not allowed;</li>
          <li><strong>No scams:</strong> any form of fraud, phishing, or deceptive practices will result in immediate account termination.</li>
        </ul>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>6. Age Requirement</h2>
        <p className={s.paragraph}>
          Lumina is exclusively for users aged 18 and older. If we discover that a user is under 18, their account will be immediately terminated. If you encounter someone you believe to be underage, please report them to us right away.
        </p>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>7. Reporting and Enforcement</h2>
        <p className={s.paragraph}>
          We take violations seriously. Our moderation team reviews reports and takes appropriate action, which may include:
        </p>
        <ul className={s.list}>
          <li>A warning for first-time minor violations;</li>
          <li>Temporary account suspension (24 hours to 30 days);</li>
          <li>Permanent account ban for serious or repeated violations;</li>
          <li>Referral to law enforcement for illegal activity.</li>
        </ul>
        <p className={s.paragraph}>
          If you believe your account was actioned in error, you can appeal by contacting our support team.
        </p>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>8. Safety Tips</h2>
        <div className={s.highlight}>
          <p>
            <strong>Before meeting in person:</strong> video call first, meet in a public place, tell a friend or family member your plans, arrange your own transportation, stay sober and alert, and trust your gut — if something feels off, leave.
          </p>
        </div>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>9. Contact Us</h2>
        <div className={s.contactInfo}>
          <h3 className={s.contactTitle}>Need to report something?</h3>
          <p className={s.paragraph}>
            If you experience or witness a violation of these guidelines, please contact us immediately:
          </p>
          <a className={s.contactEmail} href="mailto:safety@lumina.app">safety@lumina.app</a>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Russian version
   ═══════════════════════════════════════════ */
function GuidelinesRU() {
  return (
    <div className={s.content}>
      <div className={s.section}>
        <h2 className={s.sectionTitle}>Наша миссия</h2>
        <p className={s.paragraph}>
          Lumina — это место для настоящих знакомств. Мы верим, что каждый заслуживает чувствовать себя в безопасности, уважаемым и ценным при встрече с новыми людьми. Эти Правила сообщества помогают создать такую среду. Нарушение правил может привести к предупреждению, временной блокировке или полному удалению аккаунта.
        </p>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>1. Будьте настоящими</h2>
        <ul className={s.list}>
          <li><strong>Используйте реальные фото:</strong> фотографии профиля должны точно отражать вашу внешность. Запрещены стоковые фото, фото знаменитостей или сильно отредактированные изображения;</li>
          <li><strong>Будьте честными:</strong> предоставляйте правдивую информацию о себе. Искажение возраста, личности или намерений подрывает доверие;</li>
          <li><strong>Один аккаунт на человека:</strong> не создавайте множественные аккаунты и не выдавайте себя за других.</li>
        </ul>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>2. Проявляйте уважение</h2>
        <ul className={s.list}>
          <li><strong>Относитесь к другим по-доброму:</strong> каждый пользователь Lumina — реальный человек с чувствами. Будьте вежливы и внимательны в общении;</li>
          <li><strong>Принимайте отказ достойно:</strong> не каждый мэтч приведёт к разговору, и не каждый разговор — к свиданию. Уважайте границы;</li>
          <li><strong>Запрет на язык ненависти:</strong> дискриминация по признаку расы, этнической принадлежности, национальности, пола, сексуальной ориентации, религии, инвалидности или любой другой характеристике строго запрещена;</li>
          <li><strong>Запрет на буллинг и преследование:</strong> повторяющиеся нежелательные контакты, оскорбления или запугивание недопустимы.</li>
        </ul>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>3. Обеспечивайте безопасность</h2>
        <ul className={s.list}>
          <li><strong>Никаких угроз или насилия:</strong> любые формы угроз, описания насилия или подстрекательства к причинению вреда строго запрещены;</li>
          <li><strong>Не делитесь личной информацией:</strong> не распространяйте чужие персональные данные (адреса, телефоны, места работы) без их согласия;</li>
          <li><strong>Сообщайте о подозрительном поведении:</strong> если кто-то вызывает у вас чувство опасности или дискомфорта, немедленно сообщите об этом;</li>
          <li><strong>Встречайтесь безопасно:</strong> при встрече лично выбирайте общественное место, сообщите другу о своих планах и доверяйте своей интуиции.</li>
        </ul>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>4. Допустимый контент</h2>
        <ul className={s.list}>
          <li><strong>Запрет откровенного контента:</strong> фото профиля и сообщения не должны содержать обнажённости, порнографии или откровенно сексуальных материалов;</li>
          <li><strong>Запрет графического насилия:</strong> контент, изображающий насилие, жестокость или кровь, не допускается;</li>
          <li><strong>Запрет незаконного контента:</strong> не публикуйте контент, пропагандирующий незаконную деятельность, включая употребление наркотиков, оружие или запрещённые вещества;</li>
          <li><strong>Уважайте интеллектуальную собственность:</strong> не распространяйте защищённые авторским правом материалы без разрешения.</li>
        </ul>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>5. Запрет спама и коммерческой деятельности</h2>
        <ul className={s.list}>
          <li><strong>Запрет рекламы:</strong> не используйте платформу для продвижения товаров, услуг или других платформ;</li>
          <li><strong>Запрет вымогательства:</strong> просьбы о деньгах, подарках или финансовой помощи запрещены;</li>
          <li><strong>Запрет автоматизированных аккаунтов:</strong> боты, скрипты или автоматизированные инструменты для взаимодействия с Сервисом не допускаются;</li>
          <li><strong>Запрет мошенничества:</strong> любые формы мошенничества, фишинга или обманных практик приведут к немедленному удалению аккаунта.</li>
        </ul>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>6. Возрастные ограничения</h2>
        <p className={s.paragraph}>
          Lumina предназначена исключительно для пользователей старше 18 лет. Если мы обнаружим, что пользователю нет 18 лет, его аккаунт будет немедленно удалён. Если вы встретите кого-то, кому, по вашему мнению, нет 18 лет, пожалуйста, сообщите нам.
        </p>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>7. Жалобы и применение правил</h2>
        <p className={s.paragraph}>
          Мы серьёзно относимся к нарушениям. Наша команда модерации рассматривает жалобы и принимает соответствующие меры:
        </p>
        <ul className={s.list}>
          <li>Предупреждение за первое незначительное нарушение;</li>
          <li>Временная блокировка аккаунта (от 24 часов до 30 дней);</li>
          <li>Постоянная блокировка аккаунта за серьёзные или повторные нарушения;</li>
          <li>Передача дела в правоохранительные органы при незаконной деятельности.</li>
        </ul>
        <p className={s.paragraph}>
          Если вы считаете, что действия в отношении вашего аккаунта были ошибочными, вы можете подать апелляцию, обратившись в нашу службу поддержки.
        </p>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>8. Советы по безопасности</h2>
        <div className={s.highlight}>
          <p>
            <strong>Перед личной встречей:</strong> сначала сделайте видеозвонок, встречайтесь в общественном месте, сообщите другу или родственнику о своих планах, организуйте собственный транспорт, оставайтесь трезвыми и внимательными, доверяйте своей интуиции — если что-то кажется странным, уходите.
          </p>
        </div>
      </div>

      <div className={s.section}>
        <h2 className={s.sectionTitle}>9. Свяжитесь с нами</h2>
        <div className={s.contactInfo}>
          <h3 className={s.contactTitle}>Нужно сообщить о нарушении?</h3>
          <p className={s.paragraph}>
            Если вы столкнулись с нарушением данных правил или стали его свидетелем, немедленно свяжитесь с нами:
          </p>
          <a className={s.contactEmail} href="mailto:safety@lumina.app">safety@lumina.app</a>
        </div>
      </div>
    </div>
  );
}
