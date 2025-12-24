import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import tr from "@/locales/tr.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";

const savedLanguage = typeof window !== "undefined" 
  ? localStorage.getItem("language") || "tr" 
  : "tr";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      tr: { translation: tr },
      en: { translation: en },
      es: { translation: es },
    },
    lng: savedLanguage,
    fallbackLng: "tr",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
