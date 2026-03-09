import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enTranslations from "../../locales/en/en.json";
import amTranslations from "../../locales/am/am.json";

const resources = {
  en: {
    translation: enTranslations,
  },
  am: {
    translation: amTranslations,
  },
};

// Initialize i18n synchronously at module level IF we can't wait for the Provider.
// However, in Next.js, it's better to do it once in the Providers component.
export const initI18n = (lng: string = "en") => {
  if (i18n.isInitialized) return i18n;

  i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

  return i18n;
};

export default i18n;
