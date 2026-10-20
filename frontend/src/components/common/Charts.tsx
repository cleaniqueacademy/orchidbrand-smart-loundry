import React, { useState } from "react";
import { motion } from "framer-motion";

// ==========================================
// 1. DONUT CHART (SVG)
// ==========================================
export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  title?: string;
  subtitle?: string;
  data: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerTitle?: string;
  centerSubtitle?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  title,
  subtitle,
  data,
  size = 180,
  strokeWidth = 24,
  centerTitle,
  centerSubtitle,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  const chart = (
    <div className="flex flex-col sm:flex-row items-center gap-5 justify-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-zinc-100 dark:text-zinc-800"
          />

          {total === 0 ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#e4e4e7"
              strokeWidth={strokeWidth}
            />
          ) : (
            data.map((seg, idx) => {
              const percent = (seg.value / total) * 100;
              const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
              accumulatedPercent += percent;

              const isHovered = hoveredIdx === idx;

              return (
                <motion.circle
                  key={idx}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 0.6, delay: idx * 0.08 }}
                />
              );
            })
          )}
        </svg>

        {/* Center Text (Counter/Total) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
          {centerTitle !== undefined ? (
            <span className="text-xl font-black text-zinc-900 dark:text-white leading-tight">
              {centerTitle}
            </span>
          ) : (
            <span className="text-xl font-black text-zinc-900 dark:text-white leading-tight">
              {total}
            </span>
          )}
          {centerSubtitle && (
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5">
              {centerSubtitle}
            </span>
          )}
        </div>
      </div>

      {/* Legend list */}
      <div className="space-y-1.5 w-full sm:w-auto min-w-[140px]">
        {data.map((seg, idx) => (
          <div
            key={idx}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            className={`flex items-center justify-between text-xs py-1 px-2 rounded-lg cursor-pointer transition ${
              hoveredIdx === idx ? "bg-zinc-100 dark:bg-zinc-800 font-bold" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 font-medium"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]">{seg.label}</span>
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="font-bold text-zinc-900 dark:text-white">{seg.value}</span>
              <span className="text-[10px] text-zinc-400">
                ({total > 0 ? Math.round((seg.value / total) * 100) : 0}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (!title) return chart;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 p-4 sm:p-5 shadow-xs space-y-3.5">
      <div>
        <h4 className="font-bold text-zinc-900 dark:text-white text-xs sm:text-sm">{title}</h4>
        {subtitle && <p className="text-[11px] text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>
      {chart}
    </div>
  );
};

// ==========================================
// 2. BAR CHART (Vertical with SVG/CSS)
// ==========================================
export interface BarItem {
  label: string;
  value: number;
  displayValue?: string;
  secondaryLabel?: string;
  color?: string;
}

export interface BarChartProps {
  title?: string;
  subtitle?: string;
  data: BarItem[];
  height?: number;
  barColor?: string;
  defaultColor?: string;
  showValueOnTop?: boolean;
  valueUnit?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  title,
  subtitle,
  data,
  height = 160,
  barColor,
  defaultColor = "#2563eb",
  showValueOnTop = true,
  valueUnit = "",
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const activeColor = barColor || defaultColor;
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const chart = (
    <div className="w-full">
      <div
        className="flex items-end justify-between gap-2 pt-6 pb-2 border-b border-zinc-100 dark:border-zinc-800"
        style={{ height }}
      >
        {data.map((item, idx) => {
          const heightPercent = Math.max((item.value / maxValue) * 100, 4);
          const isHovered = hoveredIdx === idx;
          const itemColor = item.color || activeColor;

          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center h-full justify-end group relative"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Tooltip on top of bar */}
              {isHovered && (
                <div className="absolute -top-7 z-10 px-2 py-0.5 rounded-md bg-zinc-900 text-white text-[10px] font-bold shadow-md whitespace-nowrap animate-in fade-in zoom-in-95">
                  {item.displayValue || `${item.value}${valueUnit}`}
                </div>
              )}

              {/* Top value badge */}
              {showValueOnTop && !isHovered && (
                <span className="text-[9.5px] font-bold text-zinc-400 mb-1 truncate max-w-full">
                  {item.value > 0 ? item.value : ""}
                </span>
              )}

              {/* The bar element */}
              <motion.div
                className="w-full max-w-[36px] rounded-t-lg transition-all duration-150 cursor-pointer shadow-2xs"
                style={{
                  backgroundColor: itemColor,
                  opacity: isHovered ? 1 : 0.85,
                  transform: isHovered ? "scaleY(1.02)" : "scaleY(1)",
                  transformOrigin: "bottom",
                }}
                initial={{ height: 0 }}
                animate={{ height: `${heightPercent}%` }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
              />
            </div>
          );
        })}
      </div>

      {/* X Axis Labels */}
      <div className="flex items-center justify-between gap-2 pt-2">
        {data.map((item, idx) => (
          <div key={idx} className="flex-1 text-center">
            <span
              className={`block text-[10.5px] truncate ${
                hoveredIdx === idx ? "font-bold text-zinc-900 dark:text-white" : "font-medium text-zinc-500"
              }`}
              title={item.label}
            >
              {item.label}
            </span>
            {item.secondaryLabel && (
              <span className="block text-[9px] text-zinc-400 font-mono">
                {item.secondaryLabel}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  if (!title) return chart;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 p-4 sm:p-5 shadow-xs space-y-3.5">
      <div>
        <h4 className="font-bold text-zinc-900 dark:text-white text-xs sm:text-sm">{title}</h4>
        {subtitle && <p className="text-[11px] text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>
      {chart}
    </div>
  );
};

// ==========================================
// 3. AREA LINE CHART (Smooth Bezier Curve)
// ==========================================
export interface LinePoint {
  label: string;
  value: number;
  formattedValue?: string;
}

export interface AreaLineChartProps {
  title?: string;
  subtitle?: string;
  data: LinePoint[];
  height?: number;
  color?: string;
  lineColor?: string;
  currencyPrefix?: string;
  gradientId?: string;
}

export const AreaLineChart: React.FC<AreaLineChartProps> = ({
  title,
  subtitle,
  data,
  height = 150,
  color,
  lineColor,
  currencyPrefix,
  gradientId = "cleaniqueLineGrad",
}) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const activeLineColor = color || lineColor || "#0284c7";

  if (data.length === 0) return null;

  const width = 600;
  const paddingX = 24;
  const paddingTop = 20;
  const paddingBottom = 28;

  const values = data.map((d) => d.value);
  const minVal = 0;
  const maxVal = Math.max(...values, 100);

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;

  const points = data.map((d, i) => {
    const x = paddingX + (i / Math.max(data.length - 1, 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((d.value - minVal) / (maxVal - minVal)) * chartHeight;
    return { x, y, data: d };
  });

  const pathD = points.reduce((acc, point, i, arr) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = arr[i - 1];
    const cp1x = prev.x + (point.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (point.x - prev.x) / 2;
    const cp2y = point.y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${
    height - paddingBottom
  } Z`;

  const chart = (
    <div className="w-full relative">
      <div className="relative" style={{ height }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={activeLineColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={activeLineColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {[0, 0.5, 1].map((pct, idx) => {
            const y = paddingTop + chartHeight * (1 - pct);
            return (
              <line
                key={idx}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="#e4e4e7"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Area fill */}
          <path d={areaD} fill={`url(#${gradientId})`} />

          {/* Line stroke */}
          <motion.path
            d={pathD}
            fill="none"
            stroke={activeLineColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />

          {/* Data Points */}
          {points.map((pt, i) => {
            const isHovered = activeIdx === i;
            return (
              <g key={i}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 4}
                  fill="white"
                  stroke={activeLineColor}
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all duration-150 cursor-pointer"
                  onMouseEnter={() => setActiveIdx(i)}
                  onMouseLeave={() => setActiveIdx(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {activeIdx !== null && points[activeIdx] && (
          <div
            className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full px-2.5 py-1 rounded-lg bg-zinc-900 text-white text-[11px] font-bold shadow-lg animate-in fade-in"
            style={{
              left: `${(points[activeIdx].x / width) * 100}%`,
              top: `${Math.max(10, points[activeIdx].y - 8)}px`,
            }}
          >
            <div>
              {points[activeIdx].data.formattedValue ||
                (currencyPrefix
                  ? `${currencyPrefix}${points[activeIdx].data.value.toLocaleString("id-ID")}`
                  : points[activeIdx].data.value)}
            </div>
            <div className="text-[9px] font-normal text-zinc-300">
              {points[activeIdx].data.label}
            </div>
          </div>
        )}
      </div>

      {/* X-axis Labels */}
      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium px-2">
        {data.map((d, i) => (
          <span
            key={i}
            className={`transition-colors cursor-pointer ${
              activeIdx === i ? "text-zinc-900 dark:text-white font-bold" : "hover:text-zinc-700"
            }`}
            onMouseEnter={() => setActiveIdx(i)}
            onMouseLeave={() => setActiveIdx(null)}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );

  if (!title) return chart;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 p-4 sm:p-5 shadow-xs space-y-3.5">
      <div>
        <h4 className="font-bold text-zinc-900 dark:text-white text-xs sm:text-sm">{title}</h4>
        {subtitle && <p className="text-[11px] text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>
      {chart}
    </div>
  );
};

// ==========================================
// 4. STAT PROGRESS BAR
// ==========================================
export interface ProgressBarItem {
  label: string;
  count?: number;
  value?: number;
  percent?: number;
  color: string;
}

export interface StatProgressBarProps {
  title?: string;
  items: ProgressBarItem[];
  totalLabel?: string;
}

export const StatProgressBar: React.FC<StatProgressBarProps> = ({ title, items }) => {
  const normalizedItems = items.map((item) => ({
    label: item.label,
    count: item.count !== undefined ? item.count : (item.value !== undefined ? item.value : 0),
    color: item.color,
  }));

  const total = normalizedItems.reduce((acc, curr) => acc + curr.count, 0);

  const bar = (
    <div className="space-y-2.5">
      {/* Multi-segment Progress Bar */}
      <div className="h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex shadow-inner">
        {normalizedItems.map((item, idx) => {
          const pct = total > 0 ? (item.count / total) * 100 : 0;
          return (
            <div
              key={idx}
              className="h-full transition-all duration-300"
              style={{ width: `${pct}%`, backgroundColor: item.color }}
              title={`${item.label}: ${item.count} (${Math.round(pct)}%)`}
            />
          );
        })}
      </div>

      {/* Grid Details */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {normalizedItems.map((item, idx) => {
          const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
          return (
            <div key={idx} className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10.5px] font-medium text-zinc-600 dark:text-zinc-400 truncate">{item.label}</span>
              </div>
              <div className="text-xs font-bold text-zinc-900 dark:text-white">
                {item.count}{" "}
                <span className="text-[10px] font-normal text-zinc-400">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (!title) return bar;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{title}</h4>
      {bar}
    </div>
  );
};
