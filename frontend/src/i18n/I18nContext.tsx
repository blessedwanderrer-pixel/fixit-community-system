import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { dictionaries, languageMeta, translateExact, type Language } from './dictionaries';

type I18nValue = {
  language: Language;
  direction: 'ltr' | 'rtl';
  setLanguage: (language: Language) => void;
  t: (value: string) => string;
};

const STORAGE_KEY = 'fixit-language';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const I18nContext = createContext<I18nValue | null>(null);
const textOriginals = new WeakMap<Text, string>();
const attributeOriginals = new WeakMap<Element, Map<string, string>>();
const translatedAttributes = ['aria-label', 'placeholder', 'title'];

const readInitialLanguage = (): Language => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'ur' || saved === 'ps') return saved;
  } catch { /* Fall through to the first-party cookie when storage is blocked. */ }
  const savedCookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${STORAGE_KEY}=`))
    ?.split('=')[1];
  return savedCookie === 'ur' || savedCookie === 'ps' ? savedCookie : 'en';
};

const shouldSkip = (element: Element | null) => Boolean(element?.closest('[translate="no"], [data-i18n-skip], script, style'));

const translateTree = (root: ParentNode, language: Language) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const textNode = node as Text;
    if (!shouldSkip(textNode.parentElement)) {
      const current = textNode.nodeValue ?? '';
      const trimmed = current.trim();
      if (trimmed) {
        const stored = textOriginals.get(textNode);
        const isKnownTranslation = stored && Object.values(dictionaries).some((dictionary) => dictionary[stored] === trimmed);
        const original = stored && isKnownTranslation ? stored : trimmed;
        textOriginals.set(textNode, original);
        const translated = translateExact(original, language);
        const next = current.replace(trimmed, translated);
        if (next !== current) textNode.nodeValue = next;
      }
    }
    node = walker.nextNode();
  }

  const elements = root instanceof Element ? [root, ...Array.from(root.querySelectorAll('*'))] : Array.from(root.querySelectorAll('*'));
  elements.forEach((element) => {
    if (shouldSkip(element)) return;
    let originals = attributeOriginals.get(element);
    if (!originals) {
      originals = new Map();
      attributeOriginals.set(element, originals);
    }
    translatedAttributes.forEach((attribute) => {
      const current = element.getAttribute(attribute);
      if (!current) return;
      const stored = originals.get(attribute);
      const isKnownTranslation = stored && Object.values(dictionaries).some((dictionary) => dictionary[stored] === current);
      const original = stored && isKnownTranslation ? stored : current;
      originals.set(attribute, original);
      const translated = translateExact(original, language);
      if (translated !== current) element.setAttribute(attribute, translated);
    });
  });
};

export const I18nProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(readInitialLanguage);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* Storage may be blocked. */ }
    document.cookie = `${STORAGE_KEY}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  }, []);

  useEffect(() => {
    const meta = languageMeta[language];
    document.documentElement.lang = language;
    document.documentElement.dir = meta.dir;
    document.body.dataset.language = language;
    document.title = language === 'ur'
      ? 'فکس اِٹ — عوامی مسائل اور عطیات کا نظام'
      : language === 'ps'
        ? 'فکس اټ — د ولسي ستونزو او مرستو سیسټم'
        : 'FixIt - Community Problem & Donation Tracking System';

    // English is the authored source language, so observing and rescanning the
    // whole document cannot change any copy. Avoid that work entirely on the
    // default experience, where animated/dynamic homepage content can otherwise
    // trigger repeated full-tree walks.
    if (language === 'en') return undefined;

    let frame = 0;
    const apply = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => translateTree(document.body, language));
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: translatedAttributes });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [language]);

  const value = useMemo<I18nValue>(() => ({
    language,
    direction: languageMeta[language].dir,
    setLanguage,
    t: (text) => translateExact(text, language),
  }), [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
};
