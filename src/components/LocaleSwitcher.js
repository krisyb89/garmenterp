'use client';

import { useTranslation, availableLocales } from '@/i18n/I18nProvider';

export default function LocaleSwitcher() {
  const { locale, setLocale } = useTranslation();

  const handleChange = (e) => {
    const newLocale = e.target.value;
    setLocale(newLocale);
    // Reload page to apply new language
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={locale}
        onChange={handleChange}
        className="w-full bg-transparent border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:bg-gray-50"
      >
        {availableLocales.map((loc) => (
          <option key={loc.code} value={loc.code}>
            {loc.name}
          </option>
        ))}
      </select>
    </div>
  );
}
