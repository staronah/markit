
import { useState, useCallback } from 'react';

export const useCookie = (key: string, initialValue: string): [string, (value: string, days: number) => void] => {
  const getCookie = useCallback((): string => {
    const cookies = document.cookie.split('; ');
    for (const cookie of cookies) {
      const [cookieKey, cookieValue] = cookie.split('=');
      if (cookieKey === key) {
        return decodeURIComponent(cookieValue);
      }
    }
    return initialValue;
  }, [key, initialValue]);

  const [cookieValue, setCookieValue] = useState<string>(getCookie);

  const setCookie = useCallback(
    (value: string, days: number) => {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + days);
      const newCookie = `${key}=${encodeURIComponent(value)}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax; Secure`;
      document.cookie = newCookie;
      setCookieValue(value);
    },
    [key]
  );

  return [cookieValue, setCookie];
};
