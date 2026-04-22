import { useEffect, useState } from 'react';
import { translateDOM } from '../utils/autoTranslate';

export function useAutoTranslate() {
  const [isFrench, setIsFrench] = useState(false);

  useEffect(() => {
    if (isFrench) {
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

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      return () => observer.disconnect();
    }
  }, [isFrench]);

  return { isFrench, setIsFrench };
}