/**
 * StyleCustomizer - Template, colors, logo, and font customization
 */

import { useCallback, useRef } from 'react';
import type { ExportOptions, ExportTemplate, ExportFont } from './types';
import { TEMPLATE_INFO, FONT_INFO } from './types';

interface StyleCustomizerProps {
  style: ExportOptions['style'];
  onStyleChange: <K extends keyof ExportOptions['style']>(
    key: K,
    value: ExportOptions['style'][K]
  ) => void;
  hebrewMode: boolean;
}

const COLOR_PRESETS = [
  { color: '#3b82f6', name: 'Blue' },
  { color: '#10b981', name: 'Green' },
  { color: '#8b5cf6', name: 'Purple' },
  { color: '#f59e0b', name: 'Amber' },
  { color: '#ef4444', name: 'Red' },
  { color: '#06b6d4', name: 'Cyan' },
  { color: '#ec4899', name: 'Pink' },
  { color: '#64748b', name: 'Slate' },
];

export function StyleCustomizer({
  style,
  onStyleChange,
  hebrewMode,
}: StyleCustomizerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = {
    template: hebrewMode ? 'תבנית עיצוב' : 'Design Template',
    templateSubtitle: hebrewMode ? 'בחר את הסגנון הכללי' : 'Choose the overall style',
    primaryColor: hebrewMode ? 'צבע ראשי' : 'Primary Color',
    colorSubtitle: hebrewMode ? 'הצבע המוביל במסמך' : 'The main accent color',
    font: hebrewMode ? 'גופן' : 'Font',
    fontSubtitle: hebrewMode ? 'גופן הטקסט במסמך' : 'Document text font',
    logo: hebrewMode ? 'לוגו' : 'Logo',
    logoSubtitle: hebrewMode ? 'הוסף לוגו לכותרת' : 'Add a logo to the header',
    includeLogo: hebrewMode ? 'כלול לוגו' : 'Include Logo',
    uploadLogo: hebrewMode ? 'העלה לוגו' : 'Upload Logo',
    removeLogo: hebrewMode ? 'הסר' : 'Remove',
  };

  const handleLogoUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      onStyleChange('logoUrl', dataUrl);
      onStyleChange('includeLogo', true);
    };
    reader.readAsDataURL(file);
  }, [onStyleChange]);

  const handleRemoveLogo = useCallback(() => {
    onStyleChange('logoUrl', undefined);
    onStyleChange('includeLogo', false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onStyleChange]);

  const templates = Object.entries(TEMPLATE_INFO) as [ExportTemplate, typeof TEMPLATE_INFO[ExportTemplate]][];
  const fonts = Object.entries(FONT_INFO) as [ExportFont, typeof FONT_INFO[ExportFont]][];

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      <div>
        <h3 className="text-lg font-medium text-dark-100">{t.template}</h3>
        <p className="text-sm text-dark-400 mt-1">{t.templateSubtitle}</p>
        
        <div className="mt-4 grid grid-cols-2 gap-3">
          {templates.map(([key, info]) => (
            <button
              key={key}
              onClick={() => onStyleChange('template', key)}
              className={`
                p-4 rounded-xl border-2 transition-all text-start
                ${style.template === key
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-dark-700 bg-dark-800 hover:border-dark-600'
                }
              `}
            >
              <div className="font-medium text-dark-100">
                {hebrewMode ? info.labelHe : info.label}
              </div>
              <div className="text-xs text-dark-400 mt-1">
                {info.description}
              </div>
              {style.template === key && (
                <span className="text-blue-400 text-sm mt-2 block">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Color */}
      <div>
        <h3 className="text-lg font-medium text-dark-100">{t.primaryColor}</h3>
        <p className="text-sm text-dark-400 mt-1">{t.colorSubtitle}</p>
        
        <div className="mt-4 flex items-center gap-3">
          {/* Color Presets */}
          <div className="flex gap-2">
            {COLOR_PRESETS.map(({ color, name }) => (
              <button
                key={color}
                onClick={() => onStyleChange('primaryColor', color)}
                className={`
                  w-8 h-8 rounded-full transition-transform hover:scale-110
                  ${style.primaryColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-900' : ''}
                `}
                style={{ backgroundColor: color }}
                title={name}
              />
            ))}
          </div>
          
          {/* Custom Color Picker */}
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={style.primaryColor}
              onChange={(e) => onStyleChange('primaryColor', e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0"
            />
            <span className="text-sm text-dark-400 font-mono">
              {style.primaryColor}
            </span>
          </div>
        </div>
      </div>

      {/* Font Selection */}
      <div>
        <h3 className="text-lg font-medium text-dark-100">{t.font}</h3>
        <p className="text-sm text-dark-400 mt-1">{t.fontSubtitle}</p>
        
        <div className="mt-4">
          <select
            value={style.fontFamily}
            onChange={(e) => onStyleChange('fontFamily', e.target.value as ExportFont)}
            className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 focus:outline-none focus:border-blue-500"
          >
            {fonts.map(([key, info]) => (
              <option key={key} value={key} style={{ fontFamily: info.family }}>
                {info.label}
              </option>
            ))}
          </select>
          
          {/* Font Preview */}
          <div 
            className="mt-3 p-4 bg-dark-800 rounded-lg border border-dark-700"
            style={{ fontFamily: FONT_INFO[style.fontFamily].family }}
          >
            <p className="text-dark-300">
              {hebrewMode 
                ? 'דוגמה לטקסט בגופן הנבחר - The quick brown fox jumps over the lazy dog.'
                : 'The quick brown fox jumps over the lazy dog.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Logo Upload */}
      <div>
        <h3 className="text-lg font-medium text-dark-100">{t.logo}</h3>
        <p className="text-sm text-dark-400 mt-1">{t.logoSubtitle}</p>
        
        <div className="mt-4 space-y-3">
          {/* Toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={style.includeLogo}
                onChange={(e) => onStyleChange('includeLogo', e.target.checked)}
                className="sr-only"
              />
              <div
                className={`
                  w-10 h-6 rounded-full transition-colors
                  ${style.includeLogo ? 'bg-blue-500' : 'bg-dark-600'}
                `}
              >
                <div
                  className={`
                    absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                    ${style.includeLogo ? 'translate-x-5' : 'translate-x-1'}
                  `}
                />
              </div>
            </div>
            <span className="text-dark-200">{t.includeLogo}</span>
          </label>
          
          {/* Upload Area */}
          {style.includeLogo && (
            <div className="flex items-center gap-4">
              {style.logoUrl ? (
                <div className="flex items-center gap-3">
                  <img
                    src={style.logoUrl}
                    alt="Logo preview"
                    className="h-12 w-auto object-contain rounded bg-dark-800 p-1"
                  />
                  <button
                    onClick={handleRemoveLogo}
                    className="px-3 py-1 text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    {t.removeLogo}
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-dark-200 rounded-lg cursor-pointer transition-colors"
                  >
                    📷 {t.uploadLogo}
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
