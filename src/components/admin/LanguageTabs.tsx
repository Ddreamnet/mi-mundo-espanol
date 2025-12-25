import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import { Language } from "@/contexts/LanguageContext";

interface LanguageTabsProps {
  selectedLang: Language;
  onLanguageChange: (lang: Language) => void;
}

const languages: { code: Language; label: string; flag: string }[] = [
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

export function LanguageTabs({ selectedLang, onLanguageChange }: LanguageTabsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm text-muted-foreground">{t("common.editLanguage")}:</span>
      <Tabs value={selectedLang} onValueChange={(v) => onLanguageChange(v as Language)}>
        <TabsList className="h-9">
          {languages.map((lang) => (
            <TabsTrigger
              key={lang.code}
              value={lang.code}
              className="text-sm px-3 py-1.5 gap-1.5"
            >
              <span>{lang.flag}</span>
              <span className="hidden sm:inline">{lang.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
