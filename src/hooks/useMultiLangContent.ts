import { useState, useEffect, useCallback } from "react";
import { Language } from "@/contexts/LanguageContext";

export type MultiLangContent<T> = {
  tr: T;
  en: T;
  es: T;
};

export function useMultiLangContent<T>(
  initialDefault: T,
  savedContent: MultiLangContent<T> | T | null | undefined
) {
  const [editingLang, setEditingLang] = useState<Language>("tr");
  const [content, setContent] = useState<MultiLangContent<T>>({
    tr: initialDefault,
    en: initialDefault,
    es: initialDefault,
  });

  // Check if content is in new multi-lang format or old single format
  const isMultiLangFormat = useCallback((data: unknown): data is MultiLangContent<T> => {
    if (!data || typeof data !== "object") return false;
    const obj = data as Record<string, unknown>;
    return "tr" in obj && "en" in obj && "es" in obj;
  }, []);

  // Load saved content - handle both old and new formats
  useEffect(() => {
    if (savedContent) {
      if (isMultiLangFormat(savedContent)) {
        // New multi-lang format
        setContent({
          tr: { ...initialDefault, ...savedContent.tr },
          en: { ...initialDefault, ...savedContent.en },
          es: { ...initialDefault, ...savedContent.es },
        });
      } else {
        // Old single-lang format - use for TR, copy to others
        const mergedContent = { ...initialDefault, ...savedContent } as T;
        setContent({
          tr: mergedContent,
          en: initialDefault,
          es: initialDefault,
        });
      }
    } else {
      setContent({
        tr: initialDefault,
        en: initialDefault,
        es: initialDefault,
      });
    }
  }, [savedContent, initialDefault, isMultiLangFormat]);

  // Update content for current language
  const updateContent = useCallback((newContent: T) => {
    setContent((prev) => ({
      ...prev,
      [editingLang]: newContent,
    }));
  }, [editingLang]);

  // Update a single field in current language's content
  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setContent((prev) => ({
      ...prev,
      [editingLang]: {
        ...prev[editingLang],
        [field]: value,
      },
    }));
  }, [editingLang]);

  // Copy content from Turkish to current language
  const copyFromTurkish = useCallback(() => {
    if (editingLang !== "tr") {
      setContent((prev) => ({
        ...prev,
        [editingLang]: { ...prev.tr },
      }));
    }
  }, [editingLang]);

  // Get current language's content
  const currentContent = content[editingLang];

  return {
    editingLang,
    setEditingLang,
    content,
    currentContent,
    updateContent,
    updateField,
    copyFromTurkish,
    isMultiLangFormat,
  };
}
