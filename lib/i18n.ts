import { initReactI18next } from 'react-i18next';
import i18n from 'i18next';

// Import translation files
import enTranslations from '../locales/en/common.json';
import esTranslations from '../locales/es/common.json';
import frTranslations from '../locales/fr/common.json';
import deTranslations from '../locales/de/common.json';

const resources = {
  en: {
    common: enTranslations,
  },
  es: {
    common: esTranslations,
  },
  fr: {
    common: frTranslations,
  },
  de: {
    common: deTranslations,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',

    ns: ['common'],
    defaultNS: 'common',

    interpolation: {
      escapeValue: false, // React already escapes by default
    },

    react: {
      useSuspense: false,
    },
  });

export default i18n;