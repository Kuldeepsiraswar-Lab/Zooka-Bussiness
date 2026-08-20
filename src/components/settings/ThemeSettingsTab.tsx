import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sun, 
  Moon, 
  Laptop, 
  Check, 
  Palette, 
  Sparkles, 
  Eye, 
  Sliders, 
  ShieldCheck,
  Zap,
  Layout,
  FileText
} from 'lucide-react';

export const ThemeSettingsTab: React.FC = () => {
  const { 
    theme, 
    resolvedTheme, 
    setTheme, 
    toggleTheme, 
    currentCompany, 
    updateBusiness,
    showToast 
  } = useApp();

  const themeOptions = [
    {
      id: 'light' as const,
      name: 'Light Mode',
      description: 'Clean, high-contrast crisp white interface. Ideal for bright daytime environments.',
      icon: Sun,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
      badge: 'Daytime',
      preview: {
        bg: 'bg-slate-100 border-slate-300',
        card: 'bg-white border-slate-200 text-slate-800',
        accent: 'bg-indigo-600 text-white',
        subtext: 'text-slate-500'
      }
    },
    {
      id: 'dark' as const,
      name: 'Dark Mode',
      description: 'Deep midnight slate palette. Reduces eye strain in low-light and saves battery life.',
      icon: Moon,
      color: 'text-indigo-400 bg-indigo-950/60 border-indigo-800',
      badge: 'Night & Focus',
      preview: {
        bg: 'bg-slate-950 border-slate-800',
        card: 'bg-slate-900 border-slate-800 text-slate-100',
        accent: 'bg-indigo-500 text-white',
        subtext: 'text-slate-400'
      }
    },
    {
      id: 'system' as const,
      name: 'System Default',
      description: 'Automatically synchronizes with your device operating system display preferences.',
      icon: Laptop,
      color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800',
      badge: 'Auto Sync',
      preview: {
        bg: 'bg-gradient-to-r from-slate-100 to-slate-900 border-slate-400',
        card: 'bg-white/80 dark:bg-slate-900/80 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100',
        accent: 'bg-gradient-to-r from-indigo-600 to-cyan-500 text-white',
        subtext: 'text-slate-500 dark:text-slate-400'
      }
    }
  ];

  const handleSelectTheme = (selectedTheme: 'light' | 'dark' | 'system') => {
    setTheme(selectedTheme);
    const label = selectedTheme === 'light' ? 'Light Mode' : selectedTheme === 'dark' ? 'Dark Mode' : 'System Sync Mode';
    showToast('success', 'Theme Updated', `Interface appearance switched to ${label}.`);
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Appearance & Global Theme
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure light/dark modes, contrast, and visual display preferences across the billing system.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Active Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Currently Active:</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {resolvedTheme === 'dark' ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
              {theme === 'system' ? `System (${resolvedTheme.toUpperCase()})` : theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
          </div>
        </div>

        {/* 3 Theme Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.id;

            return (
              <div
                key={opt.id}
                onClick={() => handleSelectTheme(opt.id)}
                className={`relative rounded-2xl p-5 border-2 transition-all cursor-pointer group flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-md ring-2 ring-indigo-600/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-100/50 dark:hover:bg-slate-800/70'
                }`}
              >
                {/* Checkmark indicator */}
                {isSelected && (
                  <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className={`p-2 rounded-xl border ${opt.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {opt.name}
                      </h4>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {opt.badge}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                    {opt.description}
                  </p>
                </div>

                {/* UI Mock Preview Box */}
                <div className={`mt-auto rounded-xl p-3 border shadow-inner ${opt.preview.bg}`}>
                  <div className={`rounded-lg p-2.5 border shadow-sm ${opt.preview.card} flex items-center justify-between`}>
                    <div className="space-y-1">
                      <div className="w-16 h-2 bg-slate-400/40 rounded-full" />
                      <div className="w-10 h-1.5 bg-slate-400/25 rounded-full" />
                    </div>
                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${opt.preview.accent}`}>
                      ₹ 24,500
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Additional Display Features & Print Assurance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick Theme Switcher Shortcut */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                One-Click Quick Toggle
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                You can also instantly flip modes anytime using the header sun/moon icon.
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {resolvedTheme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-300" />
                  <span>Switch to Light Mode Now</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-200" />
                  <span>Switch to Dark Mode Now</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* GST Printable Invoices Safety Notice */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-2">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
            <FileText className="w-4 h-4" />
            <span>Clean A4 Tax Invoice Printing Standard</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Regardless of your selected app theme mode (Light or Dark), official GST invoices and tax documents generated for PDF export or paper printing will always render in pristine, high-contrast white paper format to comply with statutory accounting requirements and preserve printer toner.
          </p>
        </div>
      </div>
    </div>
  );
};
