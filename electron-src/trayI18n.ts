export type Language =
  | 'en'
  | 'zh'
  | 'zh-TW'
  | 'ja'
  | 'de'
  | 'fr'
  | 'ru'
  | 'pt'
  | 'es'
  | 'it'
  | 'ar'
  | 'no'
  | 'sv';

type TrayKey = 'tray.showMainWindow' | 'tray.quit';

const TRAY_TRANSLATIONS: Record<Language, Record<TrayKey, string>> = {
  en: {
    'tray.showMainWindow': 'Show Main Window',
    'tray.quit': 'Quit',
  },
  zh: {
    'tray.showMainWindow': '显示主界面',
    'tray.quit': '退出',
  },
  'zh-TW': {
    'tray.showMainWindow': '顯示主介面',
    'tray.quit': '退出',
  },
  ja: {
    'tray.showMainWindow': 'メインウィンドウを表示',
    'tray.quit': '終了',
  },
  de: {
    'tray.showMainWindow': 'Hauptfenster anzeigen',
    'tray.quit': 'Beenden',
  },
  fr: {
    'tray.showMainWindow': 'Afficher la fenêtre principale',
    'tray.quit': 'Quitter',
  },
  ru: {
    'tray.showMainWindow': 'Показать главное окно',
    'tray.quit': 'Выход',
  },
  pt: {
    'tray.showMainWindow': 'Mostrar janela principal',
    'tray.quit': 'Sair',
  },
  es: {
    'tray.showMainWindow': 'Mostrar ventana principal',
    'tray.quit': 'Salir',
  },
  it: {
    'tray.showMainWindow': 'Mostra finestra principale',
    'tray.quit': 'Esci',
  },
  ar: {
    'tray.showMainWindow': 'إظهار النافذة الرئيسية',
    'tray.quit': 'إنهاء',
  },
  no: {
    'tray.showMainWindow': 'Vis hovedvindu',
    'tray.quit': 'Avslutt',
  },
  sv: {
    'tray.showMainWindow': 'Visa huvudfönster',
    'tray.quit': 'Avsluta',
  },
};

export function normalizeLanguage(input: string | null | undefined): Language {
  const raw = String(input ?? '').trim();
  if (!raw) return 'en';

  // Normalize common locale patterns (e.g. "en-US" -> "en", "zh-CN" -> "zh").
  const lower = raw.toLowerCase();
  if (lower === 'zh-tw' || lower === 'zh-hant' || lower === 'zh-hk') return 'zh-TW';
  if (lower.startsWith('zh')) return 'zh';

  const base = raw.split('-')[0] as Language;
  if (base in TRAY_TRANSLATIONS) return base;

  // Support exact matches for our set (case-sensitive codes like "zh-TW")
  if ((raw as Language) in TRAY_TRANSLATIONS) return raw as Language;

  return 'en';
}

export function tTray(lang: Language, key: TrayKey): string {
  return TRAY_TRANSLATIONS[lang]?.[key] ?? TRAY_TRANSLATIONS.en[key];
}


