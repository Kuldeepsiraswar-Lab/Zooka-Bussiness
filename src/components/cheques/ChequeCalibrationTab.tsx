import React, { useState } from 'react';
import { ChequeTemplateConfig } from '../../types';
import { useApp } from '../../context/AppContext';
import { 
  DEFAULT_CTS2010_TEMPLATE, 
  BANK_CHEQUE_PRESETS,
  splitAmountInWordsToLines,
  extractDateDigits,
  formatChequeAmountWords
} from '../../utils/chequeConstants';
import { 
  Sliders, 
  Printer, 
  RotateCcw, 
  Save, 
  Check, 
  Eye, 
  FileText, 
  Grid, 
  Sparkles,
  Layers,
  ChevronDown
} from 'lucide-react';

export const ChequeCalibrationTab: React.FC = () => {
  const { business, chequeTemplates, saveChequeTemplate, showToast } = useApp();

  const allTemplates = [...BANK_CHEQUE_PRESETS, ...chequeTemplates.filter(t => !BANK_CHEQUE_PRESETS.some(bp => bp.id === t.id))];
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(DEFAULT_CTS2010_TEMPLATE.id);

  // Active editable template state
  const currentBase = allTemplates.find(t => t.id === selectedTemplateId) || DEFAULT_CTS2010_TEMPLATE;
  const [template, setTemplate] = useState<ChequeTemplateConfig>(currentBase);

  // Alignment overlay toggles
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showWatermarkGuide, setShowWatermarkGuide] = useState<boolean>(true);
  const [activeSection, setActiveSection] = useState<'DATE' | 'PAYEE' | 'WORDS' | 'FIGURES' | 'CROSSING' | 'SIGNATORY'>('DATE');

  // Sample data for preview
  const sampleDateDigits = extractDateDigits(new Date().toISOString().split('T')[0]);
  const samplePayee = 'M/S BHARAT ELECTRONICS & LOGISTICS PVT LTD';
  const sampleAmount = 148500;
  const sampleWords = formatChequeAmountWords(sampleAmount);
  const { line1, line2 } = splitAmountInWordsToLines(sampleWords, 48);
  const sampleFigures = `** 1,48,500.00 /-`;
  const companyName = business.tradeName || business.name || 'Your Company Name';

  // Handle Preset change
  const handleSelectPreset = (id: string) => {
    setSelectedTemplateId(id);
    const chosen = allTemplates.find(t => t.id === id) || DEFAULT_CTS2010_TEMPLATE;
    setTemplate(JSON.parse(JSON.stringify(chosen)));
  };

  // Save changes
  const handleSaveTemplate = () => {
    saveChequeTemplate(template);
    showToast('success', 'Layout Saved', `Cheque format "${template.name}" configuration updated.`);
  };

  // Test Print
  const handleTestPrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=600');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CTS-2010 Calibration Alignment Test</title>
          <style>
            @page {
              size: 203mm 93mm;
              margin: 0mm;
            }
            body {
              margin: 0;
              padding: 0;
              background: #fff;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            .cheque {
              position: relative;
              width: 203mm;
              height: 93mm;
              margin: 0 auto;
              box-sizing: border-box;
              overflow: hidden;
            }
            .date-box {
              position: absolute;
              left: ${template.datePositions.xMm}mm;
              top: ${template.datePositions.yMm}mm;
              font-family: monospace;
              font-weight: bold;
              font-size: ${template.datePositions.fontSizePt}pt;
              display: flex;
            }
            .d-digit {
              display: inline-block;
              width: ${template.datePositions.boxSpacingMm}mm;
              text-align: center;
            }
            .payee {
              position: absolute;
              left: ${template.payeePositions.xMm}mm;
              top: ${template.payeePositions.yMm}mm;
              font-weight: bold;
              font-size: ${template.payeePositions.fontSizePt}pt;
            }
            .words-1 {
              position: absolute;
              left: ${template.amountInWordsPositions.line1.xMm}mm;
              top: ${template.amountInWordsPositions.line1.yMm}mm;
              font-weight: bold;
              font-size: ${template.amountInWordsPositions.fontSizePt}pt;
            }
            .words-2 {
              position: absolute;
              left: ${template.amountInWordsPositions.line2.xMm}mm;
              top: ${template.amountInWordsPositions.line2.yMm}mm;
              font-weight: bold;
              font-size: ${template.amountInWordsPositions.fontSizePt}pt;
            }
            .figures {
              position: absolute;
              left: ${template.amountInFiguresPositions.xMm}mm;
              top: ${template.amountInFiguresPositions.yMm}mm;
              font-family: monospace;
              font-weight: bold;
              font-size: ${template.amountInFiguresPositions.fontSizePt}pt;
            }
            .crossing {
              position: absolute;
              left: ${template.accountPayeePositions.xMm}mm;
              top: ${template.accountPayeePositions.yMm}mm;
              transform: rotate(${template.accountPayeePositions.rotationDeg}deg);
              border-top: 1.5px solid #000;
              border-bottom: 1.5px solid #000;
              padding: 2px 5px;
              font-size: 8pt;
              font-weight: bold;
            }
            .strike {
              position: absolute;
              left: ${template.bearerPositions.xMm}mm;
              top: ${template.bearerPositions.yMm}mm;
              width: 14mm;
              height: 2px;
              background: #000;
            }
            .sign {
              position: absolute;
              left: ${template.signatoryPositions.xMm}mm;
              top: ${template.signatoryPositions.yMm}mm;
              font-size: ${template.signatoryPositions.fontSizePt}pt;
              font-weight: bold;
              text-align: right;
            }
          </style>
        </head>
        <body>
          <div class="cheque">
            <div class="crossing">${template.accountPayeePositions.text}</div>
            <div class="date-box">${sampleDateDigits.map(d => `<span class="d-digit">${d}</span>`).join('')}</div>
            <div class="payee">*** ${samplePayee} ***</div>
            <div class="words-1">${line1}</div>
            <div class="words-2">${line2}</div>
            <div class="figures">${sampleFigures}</div>
            <div class="strike"></div>
            <div class="sign">For ${companyName}</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-300" />
            <h3 className="font-extrabold text-lg">
              Cheque Layout & Coordinate Calibration Studio
            </h3>
          </div>
          <p className="text-xs text-blue-200 mt-1">
            Fine-tune Millimeter (mm) positions for Date boxes, Payee line, Amount in words, and Account Payee crossing for any Indian bank.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleTestPrint}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Test Alignment Print</span>
          </button>

          <button
            type="button"
            onClick={handleSaveTemplate}
            className="px-5 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-xs font-bold text-white shadow-md transition flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Save Custom Calibration</span>
          </button>
        </div>
      </div>

      {/* Preset Selector & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Select Bank Template:
          </span>
          <select
            value={selectedTemplateId}
            onChange={(e) => handleSelectPreset(e.target.value)}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {allTemplates.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-blue-600"
            />
            <Grid className="w-3.5 h-3.5" />
            <span>Millimeter Grid (10mm)</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showWatermarkGuide}
              onChange={(e) => setShowWatermarkGuide(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-blue-600"
            />
            <Eye className="w-3.5 h-3.5" />
            <span>Cheque Leaf Watermark</span>
          </label>
        </div>
      </div>

      {/* Main Studio Area: Canvas + Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Live Interactive Canvas (7 Cols) */}
        <div className="lg:col-span-7 p-6 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center overflow-auto min-h-[420px]">
          
          <div className="text-[11px] font-mono text-slate-400 mb-3 flex items-center gap-3">
            <span>Canvas: 203mm × 93mm (100% CTS-2010)</span>
            <span>•</span>
            <span className="text-blue-600 font-bold">1mm = 3.78px</span>
          </div>

          {/* Canvas Box */}
          <div
            style={{
              width: '768px',
              height: '352px',
            }}
            className={`relative rounded-xl border select-none transition-all shadow-xl ${
              showWatermarkGuide
                ? 'bg-gradient-to-br from-emerald-50/50 via-teal-50/40 to-slate-50 border-teal-300 text-slate-900 dark:from-slate-900 dark:via-teal-950/20 dark:to-slate-900 dark:border-teal-800 dark:text-slate-100'
                : 'bg-white border-slate-300 text-slate-900 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100'
            }`}
          >
            {/* Optional MM Grid Overlay */}
            {showGrid && (
              <div 
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)',
                  backgroundSize: `${10 * 3.78}px ${10 * 3.78}px`
                }}
              />
            )}

            {/* Background Bank Watermarks Guide */}
            {showWatermarkGuide && (
              <div className="absolute inset-0 p-4 pointer-events-none opacity-40">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-extrabold text-sm tracking-wider uppercase text-slate-700 dark:text-slate-300">
                      {template.name}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      IFSC: HDFC0000000 • CTS-2010 Standard Leaf
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono">
                    CTS-2010
                  </div>
                </div>

                <div className="absolute left-6 right-6 top-[95px] border-b border-slate-300/80 dark:border-slate-700 flex justify-between text-[8px] text-slate-400 pb-0.5">
                  <span>PAY</span>
                  <span>OR BEARER</span>
                </div>
                <div className="absolute left-6 right-6 top-[138px] border-b border-slate-300/80 dark:border-slate-700 text-[8px] text-slate-400 pb-0.5">
                  <span>RUPEES</span>
                </div>
                <div className="absolute left-6 right-6 top-[174px] border-b border-slate-300/80 dark:border-slate-700"></div>

                <div className="absolute right-7 top-[152px] w-36 h-9 border border-slate-400/80 dark:border-slate-600 rounded bg-white/40 dark:bg-slate-800/40 flex items-center px-2 text-xs font-bold text-slate-400">
                  <span>₹</span>
                </div>

                <div className="absolute right-7 top-[34px] flex gap-1">
                  {['D', 'D', 'M', 'M', 'Y', 'Y', 'Y', 'Y'].map((l, i) => (
                    <div key={i} className="w-5 h-6 border border-slate-400/80 dark:border-slate-600 rounded-sm flex items-center justify-center text-[8px] font-bold text-slate-400">
                      {l}
                    </div>
                  ))}
                </div>

                <div className="absolute bottom-2 left-10 right-10 text-center font-mono text-[10px] tracking-widest text-slate-400">
                  ⑈ 004821 ⑈ 110229045 ⑆ 000124 ⑈ 10
                </div>
              </div>
            )}

            {/* 1. Account Payee Crossing */}
            <div 
              style={{
                position: 'absolute',
                left: `${template.accountPayeePositions.xMm * 3.78}px`,
                top: `${template.accountPayeePositions.yMm * 3.78}px`,
                transform: `rotate(${template.accountPayeePositions.rotationDeg}deg)`,
                transformOrigin: 'top left'
              }}
              className={`border-t-2 border-b-2 border-slate-900 dark:border-white px-2 py-0.5 text-[10px] font-black tracking-widest cursor-pointer ${
                activeSection === 'CROSSING' ? 'ring-2 ring-blue-500 rounded' : ''
              }`}
              onClick={() => setActiveSection('CROSSING')}
            >
              {template.accountPayeePositions.text}
            </div>

            {/* 2. Date Digits */}
            <div
              style={{
                position: 'absolute',
                left: `${template.datePositions.xMm * 3.78}px`,
                top: `${template.datePositions.yMm * 3.78}px`,
              }}
              className={`flex font-mono font-extrabold text-slate-900 dark:text-white cursor-pointer ${
                activeSection === 'DATE' ? 'ring-2 ring-blue-500 rounded p-0.5' : ''
              }`}
              onClick={() => setActiveSection('DATE')}
            >
              {sampleDateDigits.map((digit, idx) => (
                <div
                  key={idx}
                  style={{
                    width: `${template.datePositions.boxSpacingMm * 3.78}px`,
                    fontSize: `${template.datePositions.fontSizePt * 1.33}px`,
                    textAlign: 'center'
                  }}
                >
                  {digit}
                </div>
              ))}
            </div>

            {/* 3. Payee Name */}
            <div
              style={{
                position: 'absolute',
                left: `${template.payeePositions.xMm * 3.78}px`,
                top: `${template.payeePositions.yMm * 3.78}px`,
                maxWidth: `${template.payeePositions.maxWidthMm * 3.78}px`,
                fontSize: `${template.payeePositions.fontSizePt * 1.33}px`,
              }}
              className={`font-extrabold text-slate-900 dark:text-white uppercase tracking-wide truncate cursor-pointer ${
                activeSection === 'PAYEE' ? 'ring-2 ring-blue-500 rounded px-1' : ''
              }`}
              onClick={() => setActiveSection('PAYEE')}
            >
              *** {samplePayee} ***
            </div>

            {/* 4. Words Line 1 */}
            <div
              style={{
                position: 'absolute',
                left: `${template.amountInWordsPositions.line1.xMm * 3.78}px`,
                top: `${template.amountInWordsPositions.line1.yMm * 3.78}px`,
                maxWidth: `${template.amountInWordsPositions.line1.maxWidthMm * 3.78}px`,
                fontSize: `${template.amountInWordsPositions.fontSizePt * 1.33}px`,
              }}
              className={`font-bold text-slate-900 dark:text-white capitalize cursor-pointer ${
                activeSection === 'WORDS' ? 'ring-2 ring-blue-500 rounded px-1' : ''
              }`}
              onClick={() => setActiveSection('WORDS')}
            >
              {line1}
            </div>

            {/* 4. Words Line 2 */}
            {line2 && (
              <div
                style={{
                  position: 'absolute',
                  left: `${template.amountInWordsPositions.line2.xMm * 3.78}px`,
                  top: `${template.amountInWordsPositions.line2.yMm * 3.78}px`,
                  maxWidth: `${template.amountInWordsPositions.line2.maxWidthMm * 3.78}px`,
                  fontSize: `${template.amountInWordsPositions.fontSizePt * 1.33}px`,
                }}
                className={`font-bold text-slate-900 dark:text-white capitalize cursor-pointer ${
                  activeSection === 'WORDS' ? 'ring-2 ring-blue-500 rounded px-1' : ''
                }`}
                onClick={() => setActiveSection('WORDS')}
              >
                {line2}
              </div>
            )}

            {/* 5. Figures */}
            <div
              style={{
                position: 'absolute',
                left: `${template.amountInFiguresPositions.xMm * 3.78}px`,
                top: `${template.amountInFiguresPositions.yMm * 3.78}px`,
                fontSize: `${template.amountInFiguresPositions.fontSizePt * 1.33}px`,
              }}
              className={`font-mono font-extrabold text-slate-900 dark:text-white tracking-wider cursor-pointer ${
                activeSection === 'FIGURES' ? 'ring-2 ring-blue-500 rounded px-1' : ''
              }`}
              onClick={() => setActiveSection('FIGURES')}
            >
              {sampleFigures}
            </div>

            {/* 6. Bearer Strike */}
            <div
              style={{
                position: 'absolute',
                left: `${template.bearerPositions.xMm * 3.78}px`,
                top: `${template.bearerPositions.yMm * 3.78}px`,
                width: `${16 * 3.78}px`,
                height: '2px',
              }}
              className="bg-slate-900 dark:bg-white"
            />

            {/* 7. Signatory */}
            <div
              style={{
                position: 'absolute',
                left: `${template.signatoryPositions.xMm * 3.78}px`,
                top: `${template.signatoryPositions.yMm * 3.78}px`,
                fontSize: `${template.signatoryPositions.fontSizePt * 1.33}px`,
              }}
              className={`text-right font-bold text-slate-900 dark:text-white w-48 cursor-pointer ${
                activeSection === 'SIGNATORY' ? 'ring-2 ring-blue-500 rounded p-1' : ''
              }`}
              onClick={() => setActiveSection('SIGNATORY')}
            >
              <div>For {companyName}</div>
              <div className="text-[10px] font-normal text-slate-500 mt-6">
                Authorised Signatory
              </div>
            </div>
          </div>
        </div>

        {/* Right: Coordinates Inspector & Field Adjuster (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-5">
          
          {/* Section Navigation Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
              Element Inspector
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'DATE', label: 'Date Boxes' },
                { id: 'PAYEE', label: 'Payee Line' },
                { id: 'WORDS', label: 'Amount (Words)' },
                { id: 'FIGURES', label: 'Amount (Fig)' },
                { id: 'CROSSING', label: 'A/C Payee' },
                { id: 'SIGNATORY', label: 'Signatory' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id as any)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition text-center ${
                    activeSection === tab.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* DATE BOXES CONTROLS */}
          {activeSection === 'DATE' && (
            <div className="space-y-4 animate-fade-in">
              <h4 className="font-bold text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Date Box Grid Positioning (8 Digits)
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Left Position (X in mm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={template.datePositions.xMm}
                    onChange={(e) => setTemplate({
                      ...template,
                      datePositions: { ...template.datePositions, xMm: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Top Position (Y in mm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={template.datePositions.yMm}
                    onChange={(e) => setTemplate({
                      ...template,
                      datePositions: { ...template.datePositions, yMm: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Box Pitch / Spacing (mm)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={template.datePositions.boxSpacingMm}
                    onChange={(e) => setTemplate({
                      ...template,
                      datePositions: { ...template.datePositions, boxSpacingMm: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Font Size (pt)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={template.datePositions.fontSizePt}
                    onChange={(e) => setTemplate({
                      ...template,
                      datePositions: { ...template.datePositions, fontSizePt: parseFloat(e.target.value) || 12 }
                    })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PAYEE LINE CONTROLS */}
          {activeSection === 'PAYEE' && (
            <div className="space-y-4 animate-fade-in">
              <h4 className="font-bold text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Payee Line Positioning
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Left Position (X in mm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={template.payeePositions.xMm}
                    onChange={(e) => setTemplate({
                      ...template,
                      payeePositions: { ...template.payeePositions, xMm: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Top Position (Y in mm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={template.payeePositions.yMm}
                    onChange={(e) => setTemplate({
                      ...template,
                      payeePositions: { ...template.payeePositions, yMm: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Max Width (mm)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={template.payeePositions.maxWidthMm}
                    onChange={(e) => setTemplate({
                      ...template,
                      payeePositions: { ...template.payeePositions, maxWidthMm: parseFloat(e.target.value) || 120 }
                    })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Font Size (pt)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={template.payeePositions.fontSizePt}
                    onChange={(e) => setTemplate({
                      ...template,
                      payeePositions: { ...template.payeePositions, fontSizePt: parseFloat(e.target.value) || 11 }
                    })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* AMOUNT IN WORDS CONTROLS */}
          {activeSection === 'WORDS' && (
            <div className="space-y-4 animate-fade-in">
              <h4 className="font-bold text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Amount in Words (Line 1 & Line 2)
              </h4>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Line 1 (Starts after 'Rupees')</span>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="0.5"
                    placeholder="X mm"
                    value={template.amountInWordsPositions.line1.xMm}
                    onChange={(e) => setTemplate({
                      ...template,
                      amountInWordsPositions: {
                        ...template.amountInWordsPositions,
                        line1: { ...template.amountInWordsPositions.line1, xMm: parseFloat(e.target.value) || 0 }
                      }
                    })}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono font-bold"
                  />
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Y mm"
                    value={template.amountInWordsPositions.line1.yMm}
                    onChange={(e) => setTemplate({
                      ...template,
                      amountInWordsPositions: {
                        ...template.amountInWordsPositions,
                        line1: { ...template.amountInWordsPositions.line1, yMm: parseFloat(e.target.value) || 0 }
                      }
                    })}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Line 2 (Second line)</span>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="0.5"
                    placeholder="X mm"
                    value={template.amountInWordsPositions.line2.xMm}
                    onChange={(e) => setTemplate({
                      ...template,
                      amountInWordsPositions: {
                        ...template.amountInWordsPositions,
                        line2: { ...template.amountInWordsPositions.line2, xMm: parseFloat(e.target.value) || 0 }
                      }
                    })}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono font-bold"
                  />
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Y mm"
                    value={template.amountInWordsPositions.line2.yMm}
                    onChange={(e) => setTemplate({
                      ...template,
                      amountInWordsPositions: {
                        ...template.amountInWordsPositions,
                        line2: { ...template.amountInWordsPositions.line2, yMm: parseFloat(e.target.value) || 0 }
                      }
                    })}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* FIGURES CONTROLS */}
          {activeSection === 'FIGURES' && (
            <div className="space-y-4 animate-fade-in">
              <h4 className="font-bold text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Amount in Figures Box (₹)
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Left Position (X in mm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={template.amountInFiguresPositions.xMm}
                    onChange={(e) => setTemplate({
                      ...template,
                      amountInFiguresPositions: { ...template.amountInFiguresPositions, xMm: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Top Position (Y in mm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={template.amountInFiguresPositions.yMm}
                    onChange={(e) => setTemplate({
                      ...template,
                      amountInFiguresPositions: { ...template.amountInFiguresPositions, yMm: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CROSSING CONTROLS */}
          {activeSection === 'CROSSING' && (
            <div className="space-y-4 animate-fade-in">
              <h4 className="font-bold text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                "A/C PAYEE ONLY" Crossing Banner
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Left Position (X in mm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={template.accountPayeePositions.xMm}
                    onChange={(e) => setTemplate({
                      ...template,
                      accountPayeePositions: { ...template.accountPayeePositions, xMm: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Top Position (Y in mm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={template.accountPayeePositions.yMm}
                    onChange={(e) => setTemplate({
                      ...template,
                      accountPayeePositions: { ...template.accountPayeePositions, yMm: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SIGNATORY CONTROLS */}
          {activeSection === 'SIGNATORY' && (
            <div className="space-y-4 animate-fade-in">
              <h4 className="font-bold text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Authorised Signatory Block
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Left Position (X in mm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={template.signatoryPositions.xMm}
                    onChange={(e) => setTemplate({
                      ...template,
                      signatoryPositions: { ...template.signatoryPositions, xMm: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Top Position (Y in mm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={template.signatoryPositions.yMm}
                    onChange={(e) => setTemplate({
                      ...template,
                      signatoryPositions: { ...template.signatoryPositions, yMm: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                const base = BANK_CHEQUE_PRESETS.find(b => b.id === template.id) || DEFAULT_CTS2010_TEMPLATE;
                setTemplate(JSON.parse(JSON.stringify(base)));
              }}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Bank Defaults</span>
            </button>

            <button
              type="button"
              onClick={handleSaveTemplate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Calibration</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
