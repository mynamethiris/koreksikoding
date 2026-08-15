import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import id from '@/locales/id.json';
import en from '@/locales/en.json';

const STORAGE_KEY = 'kk_language';

i18n.use(initReactI18next).init({
  resources: {
    id: { translation: id },
    en: { translation: en },
  },
  lng: localStorage.getItem(STORAGE_KEY) || 'id',
  fallbackLng: 'id',
  interpolation: { escapeValue: false },
});

export function setLanguage(lang: 'id' | 'en') {
  i18n.changeLanguage(lang);
  localStorage.setItem(STORAGE_KEY, lang);
}

export default i18n;
