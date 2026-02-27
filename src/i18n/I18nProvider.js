'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';

// Import all translation files
import commonMessages from './messages/common.json';
import navMessages from './messages/nav.json';
import poMessages from './messages/po.json';
import srsMessages from './messages/srs.json';
import supplierMessages from './messages/supplier.json';
import dashboardMessages from './messages/dashboard.json';
import customerMessages from './messages/customer.json';
import productionMessages from './messages/production.json';
import shipmentMessages from './messages/shipment.json';
import qcMessages from './messages/qc.json';
import packingMessages from './messages/packing.json';
import pnlMessages from './messages/pnl.json';

const messages = {
  en: {
    ...commonMessages.en,
    ...navMessages.en,
    ...poMessages.en,
    ...srsMessages.en,
    ...supplierMessages.en,
    ...dashboardMessages.en,
    ...customerMessages.en,
    ...productionMessages.en,
    ...shipmentMessages.en,
    ...qcMessages.en,
    ...packingMessages.en,
    ...pnlMessages.en
  },
  zh: {
    ...commonMessages.zh,
    ...navMessages.zh,
    ...poMessages.zh,
    ...srsMessages.zh,
    ...supplierMessages.zh,
    ...dashboardMessages.zh,
    ...customerMessages.zh,
    ...productionMessages.zh,
    ...shipmentMessages.zh,
    ...qcMessages.zh,
    ...packingMessages.zh,
    ...pnlMessages.zh
  }
};

const I18nContext = createContext(null);

const LOCALE_COOKIE = 'garment-erp-locale';
const DEFAULT_LOCALE = 'en';

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedLocale = Cookies.get(LOCALE_COOKIE);
    if (savedLocale && messages[savedLocale]) {
      setLocaleState(savedLocale);
    }
    setIsLoaded(true);
  }, []);

  const setLocale = useCallback((newLocale) => {
    if (messages[newLocale]) {
      setLocaleState(newLocale);
      Cookies.set(LOCALE_COOKIE, newLocale, { expires: 365 });
    }
  }, []);

  const t = useCallback(
    (key, fallback) => {
      const keys = key.split('.');
      let value = messages[locale];
      
      for (const k of keys) {
        if (value && typeof value === 'object') {
          value = value[k];
        } else {
          value = undefined;
          break;
        }
      }
      
      // Fallback to English if translation not found
      if (value === undefined && locale !== 'en') {
        let enValue = messages['en'];
        for (const k of keys) {
          if (enValue && typeof enValue === 'object') {
            enValue = enValue[k];
          } else {
            enValue = undefined;
            break;
          }
        }
        value = enValue;
      }
      
      return value !== undefined ? value : (fallback || key);
    },
    [locale]
  );

  if (!isLoaded) {
    return null;
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider');
  }
  return context;
}

export const availableLocales = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' }
];
