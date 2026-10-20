import React, { useState } from "react";
import { motion } from "framer-motion";
import { formatCurrency } from "../../utils/formatUtils";

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
  actionSlot?: React.ReactNode;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  title,
  subtitle,
  data,
  size = 145,
  strokeWidth = 20,
  centerTitle,
  centerSubtitle,
  actionSlot,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  const chart = (
    <div className="flex flex-col items-center gap-4 w-full py-1">
      <div className="relative shrink-0 flex items-center justify-center my-1" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90 overflow-visible">
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
                  strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
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
          <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">
            {centerTitle !== undefined ? centerTitle : total}
          </span>
          {centerSubtitle && (
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
              {centerSubtitle}
            </span>
          )}
        </div>
      </div>

      {/* Legend list with clean badge style */}
      <div className="space-y-1.5 w-full">
        {data.map((seg, idx) => {
          const isHovered = hoveredIdx === idx;
          const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`flex items-center justify-between text-xs py-1.5 px-3 rounded-xl cursor-pointer transition border ${
                isHovered
                  ? "bg-zinc-100/90 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 font-bold shadow-2xs"
                  : "bg-zinc-50/70 dark:bg-zinc-800/40 hover:bg-zinc-100/60 border-zinc-200/80 dark:border-zinc-800/80 font-medium text-zinc-700 dark:text-zinc-300"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 pr-2 flex-1">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs transition-transform"
                  style={{
                    backgroundColor: seg.color,
                    transform: isHovered ? "scale(1.2)" : "scale(1)",
                  }}
                />
                <span className="truncate text-xs">{seg.label}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                <span className="font-bold text-zinc-900 dark:text-white text-xs">{seg.value}</span>
                <span className="text-[10px] font-semibold text-zinc-400 bg-white dark:bg-zinc-700/60 px-1.5 py-0.2 rounded-md border border-zinc-200/80 dark:border-zinc-700">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (!title) return chart;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 p-4 sm:p-5 shadow-xs space-y-3.5 h-full flex flex-col justify-between overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-bold text-zinc-900 dark:text-white text-xs sm:text-sm">{title}</h4>
          {subtitle && <p className="text-[11px] text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>
        {actionSlot && <div className="shrink-0">{actionSlot}</div>}
      </div>
      <div className="flex-1 flex flex-col justify-center w-full min-h-0">
        {chart}
      </div>
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
  actionSlot?: React.ReactNode;
}

export const BarChart: React.FC<BarChartProps> = ({
  title,
  subtitle,
  data,
  height = 170,
  barColor,
  defaultColor = "#2563eb",
  showValueOnTop = true,
  valueUnit = "",
  actionSlot,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const activeColor = barColor || defaultColor;
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  // If there are few bars (e.g. <= 6), limit the total width or center them so they don't look awkwardly sparse
  const isFewBars = data.length <= 6;

  const chart = (
    <div className="w-full">
      <div
        className={`flex items-end justify-between gap-2 pt-6 pb-2 border-b border-zinc-100 dark:border-zinc-800 ${
          isFewBars ? "max-w-xl mx-auto" : ""
        }`}
        style={{ height }}
      >
        {data.map((item, idx) => {
          const heightPercent = Math.max((item.value / maxValue) * 100, item.value > 0 ? 6 : 2);
          const isHovered = hoveredIdx === idx;
          const itemColor = item.color || activeColor;

          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center h-full justify-end group relative min-w-[20px]"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Tooltip on top of bar */}
              {isHovered && (
                <div className="absolute -top-8 z-10 px-2.5 py-1 rounded-lg bg-zinc-900 text-white text-[10px] font-bold shadow-md whitespace-nowrap animate-in fade-in zoom-in-95 pointer-events-none">
                  <div>{item.displayValue || `${item.value}${valueUnit}`}</div>
                  <div className="text-[8.5px] font-normal text-zinc-300">{item.label}</div>
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
                className="w-full max-w-[40px] rounded-t-lg transition-all duration-150 cursor-pointer shadow-2xs"
                style={{
                  backgroundColor: itemColor,
                  opacity: isHovered ? 1 : item.value > 0 ? 0.9 : 0.2,
                  transform: isHovered ? "scaleY(1.03)" : "scaleY(1)",
                  transformOrigin: "bottom",
                }}
                initial={{ height: 0 }}
                animate={{ height: `${heightPercent}%` }}
                transition={{ duration: 0.5, delay: idx * 0.03 }}
              />
            </div>
          );
        })}
      </div>

      {/* X Axis Labels */}
      <div
        className={`flex items-center justify-between gap-2 pt-2 ${
          isFewBars ? "max-w-xl mx-auto" : ""
        }`}
      >
        {data.map((item, idx) => (
          <div key={idx} className="flex-1 text-center min-w-[20px]">
            <span
              className={`block text-[10.5px] truncate ${
                hoveredIdx === idx
                  ? "font-bold text-zinc-900 dark:text-white"
                  : "font-medium text-zinc-500"
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
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 p-4 sm:p-5 shadow-xs space-y-3.5 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-bold text-zinc-900 dark:text-white text-xs sm:text-sm">{title}</h4>
          {subtitle && <p className="text-[11px] text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>
        {actionSlot && <div className="shrink-0 max-w-full overflow-x-auto">{actionSlot}</div>}
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
  secondaryValue?: string;
  dateKey?: string;
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
  actionSlot?: React.ReactNode;
  summaryMetrics?: {
    totalLabel?: string;
    totalValue?: string | number;
    avgLabel?: string;
    avgValue?: string | number;
    peakLabel?: string;
    peakValue?: string | number;
  };
}

export const AreaLineChart: React.FC<AreaLineChartProps> = ({
  title,
  subtitle,
  data,
  height = 180,
  color,
  lineColor,
  currencyPrefix,
  gradientId = "cleaniqueLineGrad",
  actionSlot,
  summaryMetrics,
}) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const activeLineColor = color || lineColor || "#2563eb";

  if (data.length === 0) return null;

  const width = 600;
  const paddingX = 20;
  const paddingTop = 22;
  const paddingBottom = 26;

  const values = data.map((d) => d.value);
  const minVal = 0;
  const rawMax = Math.max(...values, 0);
  // Ensure maximum scale has some headroom
  const maxVal = rawMax > 0 ? rawMax * 1.15 : 100;

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

  // X Axis Label filtering: if there are many points (> 12), show only spaced labels
  const shouldFilterLabels = data.length > 12;
  const labelStep = shouldFilterLabels ? Math.ceil(data.length / 6) : 1;

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
              <stop offset="0%" stopColor={activeLineColor} stopOpacity="0.32" />
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
                className="opacity-70 dark:opacity-20"
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
            strokeWidth="2.75"
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
                {/* Larger invisible hover hit area */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={12}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setActiveIdx(i)}
                  onMouseLeave={() => setActiveIdx(null)}
                />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : data.length > 20 ? 2.5 : 4}
                  fill="white"
                  stroke={activeLineColor}
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all duration-150 pointer-events-none shadow-xs"
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay with bounds clipping safety */}
        {activeIdx !== null && points[activeIdx] && (
          <div
            className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full px-3 py-1.5 rounded-xl bg-zinc-900 text-white text-[11px] font-bold shadow-xl animate-in fade-in"
            style={{
              left: `${Math.max(12, Math.min(88, (points[activeIdx].x / width) * 100))}%`,
              top: `${Math.max(8, points[activeIdx].y - 8)}px`,
            }}
          >
            <div className="font-mono text-xs text-white">
              {points[activeIdx].data.formattedValue ||
                (currencyPrefix
                  ? `${currencyPrefix}${points[activeIdx].data.value.toLocaleString("id-ID")}`
                  : points[activeIdx].data.value)}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] font-medium text-zinc-300">
              <span>{points[activeIdx].data.label}</span>
              {points[activeIdx].data.secondaryValue && (
                <>
                  <span>•</span>
                  <span className="text-sky-300 font-mono">
                    {points[activeIdx].data.secondaryValue}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* X-axis Labels */}
      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium px-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
        {data.map((d, i) => {
          const isKeyLabel = !shouldFilterLabels || i % labelStep === 0 || i === data.length - 1;
          if (!isKeyLabel) return <span key={i} className="hidden" />;

          return (
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
          );
        })}
      </div>
    </div>
  );

  if (!title) return chart;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 p-4 sm:p-5 shadow-xs space-y-3.5 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-bold text-zinc-900 dark:text-white text-xs sm:text-sm">{title}</h4>
          {subtitle && <p className="text-[11px] text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>
        {actionSlot && <div className="shrink-0 max-w-full overflow-x-auto">{actionSlot}</div>}
      </div>

      {/* Summary Metrics Strip */}
      {summaryMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          {summaryMetrics.totalValue !== undefined && (
            <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] font-semibold text-zinc-400 block uppercase tracking-wider">
                {summaryMetrics.totalLabel || "Total Periode"}
              </span>
              <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white font-mono mt-0.5 block">
                {typeof summaryMetrics.totalValue === "number"
                  ? formatCurrency(summaryMetrics.totalValue)
                  : summaryMetrics.totalValue}
              </span>
            </div>
          )}

          {summaryMetrics.avgValue !== undefined && (
            <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] font-semibold text-zinc-400 block uppercase tracking-wider">
                {summaryMetrics.avgLabel || "Rata-rata"}
              </span>
              <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white font-mono mt-0.5 block">
                {typeof summaryMetrics.avgValue === "number"
                  ? formatCurrency(summaryMetrics.avgValue)
                  : summaryMetrics.avgValue}
              </span>
            </div>
          )}

          {summaryMetrics.peakValue !== undefined && (
            <div className="col-span-2 sm:col-span-1 px-3 py-2 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
              <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 block uppercase tracking-wider">
                {summaryMetrics.peakLabel || "Hari Puncak"}
              </span>
              <span className="text-xs sm:text-sm font-bold text-blue-950 dark:text-blue-200 font-mono mt-0.5 block truncate">
                {typeof summaryMetrics.peakValue === "number"
                  ? formatCurrency(summaryMetrics.peakValue)
                  : summaryMetrics.peakValue}
              </span>
            </div>
          )}
        </div>
      )}

      {chart}
    </div>
  );
};

// ==========================================
// 4. HORIZONTAL RANKED BAR LIST
// ==========================================
export interface RankedBarItem {
  id?: string;
  rank?: number;
  label: string;
  subLabel?: string;
  value: number;
  formattedValue?: string;
  secondaryValue?: string;
  percentage?: number;
  color?: string;
  badge?: string;
  badgeColor?: string;
}

export interface HorizontalBarListProps {
  title?: string;
  subtitle?: string;
  items: RankedBarItem[];
  actionSlot?: React.ReactNode;
  valueUnit?: string;
  emptyMessage?: string;
  maxDisplay?: number;
}

export const HorizontalBarList: React.FC<HorizontalBarListProps> = ({
  title,
  subtitle,
  items,
  actionSlot,
  valueUnit = "",
  emptyMessage = "Belum ada data aktivitas untuk periode ini",
  maxDisplay = 6,
}) => {
  const displayItems = items.slice(0, maxDisplay);
  const maxValue = Math.max(...displayItems.map((d) => d.value), 1);

  const list = (
    <div className="space-y-3">
      {displayItems.length === 0 ? (
        <div className="py-8 text-center text-zinc-400 text-xs">
          {emptyMessage}
        </div>
      ) : (
        displayItems.map((item, idx) => {
          const rank = item.rank || idx + 1;
          const pct = Math.max((item.value / maxValue) * 100, 3);
          const sharePct =
            item.percentage !== undefined
              ? item.percentage
              : Math.round((item.value / maxValue) * 100);
          const barColor = item.color || "#2563eb";

          return (
            <div
              key={item.id || idx}
              className="group p-3 rounded-xl bg-zinc-50/70 hover:bg-zinc-100/70 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-800 transition"
            >
              <div className="flex items-center justify-between gap-3 text-xs mb-1.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 shadow-2xs ${
                      rank === 1
                        ? "bg-amber-500 text-white"
                        : rank === 2
                        ? "bg-zinc-300 text-zinc-800"
                        : rank === 3
                        ? "bg-amber-700/80 text-white"
                        : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                    }`}
                  >
                    #{rank}
                  </span>
                  <div className="min-w-0">
                    <span className="font-bold text-zinc-900 dark:text-white truncate block text-[13px]">
                      {item.label}
                    </span>
                    {item.subLabel && (
                      <span className="text-[10px] text-zinc-400 truncate block">
                        {item.subLabel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-bold text-zinc-900 dark:text-white font-mono text-xs">
                    {item.formattedValue || `${item.value.toLocaleString("id-ID")}${valueUnit}`}
                  </span>
                  {item.secondaryValue && (
                    <span className="block text-[10px] text-zinc-400">
                      {item.secondaryValue}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-zinc-200/80 dark:bg-zinc-700/60 rounded-full h-2 overflow-hidden flex items-center">
                <motion.div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ backgroundColor: barColor }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, delay: idx * 0.05 }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1">
                <span>Kontribusi terhadap total:</span>
                <span className="font-semibold text-zinc-600 dark:text-zinc-300">
                  {sharePct}%
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  if (!title) return list;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 p-4 sm:p-5 shadow-xs space-y-3.5 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-bold text-zinc-900 dark:text-white text-xs sm:text-sm">{title}</h4>
          {subtitle && <p className="text-[11px] text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>
        {actionSlot && <div className="shrink-0 max-w-full overflow-x-auto">{actionSlot}</div>}
      </div>
      {list}
    </div>
  );
};

// ==========================================
// 5. STAT PROGRESS BAR
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
            <div
              key={idx}
              className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10.5px] font-medium text-zinc-600 dark:text-zinc-400 truncate">
                  {item.label}
                </span>
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
