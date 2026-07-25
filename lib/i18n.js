import { createContext, useContext, useEffect, useState } from "react";
import { translations } from "./translations";

const LangContext = createContext({ lang: "fr", setLang: () => {}, t: (k) => k });

export function LangProvider({ children }) {
  const [lang, setLang] = useState("fr");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("lang");
      if (saved === "fr" || saved === "nl") setLang(saved);
    } catch (e) {
      // localStorage indisponible, on reste en français
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("lang", lang);
    } catch (e) {
      // ignore
    }
  }, [lang]);

  const t = (key) => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry.fr || key;
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
