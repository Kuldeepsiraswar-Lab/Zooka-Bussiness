import React, { useMemo } from 'react';
import { generateQrMatrix } from '../../utils/formatters';

interface QrCodeSvgProps {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  className?: string;
}

export const QrCodeSvg: React.FC<QrCodeSvgProps> = ({
  value,
  size = 120,
  fgColor = '#0f172a',
  bgColor = '#ffffff',
  className = '',
}) => {
  const matrix = useMemo(() => {
    return generateQrMatrix(value || 'VYAPARFLOW-INVOICE', 25);
  }, [value]);

  const matrixSize = matrix.length;
  const cellSize = size / matrixSize;

  return (
    <div className={`inline-block p-1.5 rounded-lg border border-slate-200 bg-white ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="block"
      >
        <rect width={size} height={size} fill={bgColor} />
        {matrix.map((row, rIdx) =>
          row.map((cell, cIdx) => {
            if (!cell) return null;
            return (
              <rect
                key={`${rIdx}-${cIdx}`}
                x={cIdx * cellSize}
                y={rIdx * cellSize}
                width={cellSize}
                height={cellSize}
                fill={fgColor}
              />
            );
          })
        )}
      </svg>
    </div>
  );
};
