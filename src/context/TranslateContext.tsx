import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { translateDOM } from '../utils/autoTranslate';

type TranslateContextType = {
  isFrench: boolean;
  setIsFrench: (val: boolean) => void;
};

const TranslateContext = createContext<TranslateContextType>({
  isFrench: false,
  setIsFrench: () => {},
});

export function TranslateProvider({ children }: { children: ReactNode }) {
  const [isFrench, setIsFrench] = useState(false);

  useEffect(() => {
    if (!isFrench) return;

    translateDOM();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            translateDOM(node as HTMLElement);
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [isFrench]);

  return (
    <TranslateContext.Provider value={{ isFrench, setIsFrench }}>
      {children}
    </TranslateContext.Provider>
  );
}

export function useTranslate() {
  return useContext(TranslateContext);
}