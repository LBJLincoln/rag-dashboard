'use client'

import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

// ---- Types ---------------------------------------------------------------

interface DataPoint {
  iteration: number
  standard: number
  graph: number
  quantitative: number
  orchestrator: number
  overall: number
}

interface Props {
  // Optional override — defaults to generated mock data
  data?: DataPoint[]
}

// ---- Mock data generation ------------------------------------------------

function generateMockData(): DataPoint[] {
  // Simulate 42 iterations with gradual improvement, realistic noise
  const points: DataPoint[] = []
  const bases = { standard: 72, graph: 55, quantitative: 63, orchestrator: 68, overall: 65 }
  const targets = { standard: 85.5, graph: 68.7, quantitative: 78.3, orchestrator: 80.0, overall: 78.1 }

  for (let i = 1; i <= 42; i++) {
    const t = i / 42 // 0..1 progress
    // Ease-in-out curve so improvement accelerates then levels off
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

    const noise = () => (Math.random() - 0.5) * 4

    const v = (key: keyof typeof bases) =>
      Math.min(99, Math.max(40, bases[key] + (targets[key] - bases[key]) * ease + noise()))

    const std = v('standard')
    const gr  = v('graph')
    const qu  = v('quantitative')
    const or_ = v('orchestrator')

    points.push({
      iteration: i,
      standard:     std,
      graph:        gr,
      quantitative: qu,
      orchestrator: or_,
      overall:      (std + gr + qu + or_) / 4,
    })
  }
  // Override last point with real values
  points[41] = {
    iteration: 42,
    standard:     85.5,
    graph:        68.7,
    quantitative: 78.3,
    orchestrator: 80.0,
    overall:      78.1,
  }
  return points
}

const MOCK_DATA = generateMockData()

// ---- Pipeline config -----------------------------------------------------

interface SeriesConfig {
  key: keyof Omit<DataPoint, 'iteration'>
  label: string
  color: string
  target: number
  dashed?: boolean
}

const SERIES: SeriesConfig[] = [
  { key: 'overall',      label: 'Overall',      color: '#ffffff', target: 75.0, dashed: true },
  { key: 'standard',     label: 'Standard',     color: '#0a84ff', target: 85.0 },
  { key: 'graph',        label: 'Graph',        color: '#bf5af2', target: 70.0 },
  { key: 'quantitative', label: 'Quantitative', color: '#ffd60a', target: 85.0 },
  { key: 'orchestrator', label: 'Orchestrator', color: '#30d158', target: 70.0 },
]

// ---- Chart geometry constants --------------------------------------------

const CHART_W = 900
const CHART_H = 280
const PAD_L = 48
const PAD_R = 24
const PAD_T = 16
const PAD_B = 36
const Y_MIN = 50
const Y_MAX = 100

// ---- Helper: value → SVG coordinate -------------------------------------

function toX(iter: number, total: number): number {
  return PAD_L + ((iter - 1) / (total - 1)) * (CHART_W - PAD_L - PAD_R)
}

function toY(value: number): number {
  return PAD_T + ((Y_MAX - value) / (Y_MAX - Y_MIN)) * (CHART_H - PAD_T - PAD_B)
}

// ---- SVG path builder ---------------------------------------------------

function buildPath(data: DataPoint[], key: keyof Omit<DataPoint, 'iteration'>): string {
  const pts = data.map(d => ({ x: toX(d.iteration, data.length), y: toY(d[key] as number) }))
  if (pts.length === 0) return ''

  // Catmull-Rom to cubic bezier for smooth curves
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 2)]
    const p1 = pts[i - 1]
    const p2 = pts[i]
    const p3 = pts[Math.min(pts.length - 1, i + 1)]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }
  return d
}

// ---- Trend indicator -----------------------------------------------------

function TrendIcon({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous
  if (diff > 1) return <TrendingUp className="w-3 h-3" style={{ color: '#30d158' }} />
  if (diff < -1) return <TrendingDown className="w-3 h-3" style={{ color: '#ff453a' }} />
  return <Minus className="w-3 h-3" style={{ color: '#86868b' }} />
}

// ---- Tooltip -------------------------------------------------------------

interface TooltipState {
  x: number
  y: number
  iteration: number
  values: Record<string, number>
}

// ---- Main chart ----------------------------------------------------------

export function AccuracyTrend({ data = MOCK_DATA }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set())
  const svgRef = useRef<SVGSVGElement>(null)

  const toggleSeries = (key: string) => {
    setHiddenSeries(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return

    const svgX = ((e.clientX - rect.left) / rect.width) * CHART_W
    const relX = svgX - PAD_L
    const chartWidth = CHART_W - PAD_L - PAD_R
    if (relX < 0 || relX > chartWidth) {
      setTooltip(null)
      return
    }

    const iterFloat = 1 + (relX / chartWidth) * (data.length - 1)
    const iterIndex = Math.max(0, Math.min(data.length - 1, Math.round(iterFloat - 1)))
    const point = data[iterIndex]
    const cx = toX(point.iteration, data.length)

    const values: Record<string, number> = {}
    SERIES.forEach(s => { values[s.key] = point[s.key] as number })

    // Tooltip Y: place near mouse but keep inside chart
    const tooltipY = Math.max(PAD_T, Math.min(e.clientY - rect.top - 60, CHART_H - 120))
    setTooltip({ x: cx, y: tooltipY, iteration: point.iteration, values })
  }, [data])

  const lastPt = data[data.length - 1]
  const prevPt = data[data.length - 2]

  // Y-axis ticks
  const yTicks = [50, 60, 70, 75, 80, 85, 90, 100]

  // X-axis ticks (every 5 iterations + last)
  const xTicks = data.filter(d => d.iteration % 10 === 0 || d.iteration === 1 || d.iteration === data.length)

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {SERIES.map(s => {
          const isHidden = hiddenSeries.has(s.key)
          const current = lastPt[s.key] as number
          const previous = prevPt[s.key] as number
          return (
            <button
              key={s.key}
              onClick={() => toggleSeries(s.key)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all"
              style={{
                borderColor: isHidden ? 'rgba(255,255,255,0.06)' : `${s.color}30`,
                backgroundColor: isHidden ? 'transparent' : `${s.color}08`,
                opacity: isHidden ? 0.35 : 1,
              }}
            >
              <div
                className="w-6 h-0.5 rounded-full"
                style={{ backgroundColor: isHidden ? 'rgba(255,255,255,0.2)' : s.color, opacity: s.dashed ? 0.6 : 1 }}
              />
              <span className="text-[11px] font-medium" style={{ color: isHidden ? 'rgba(255,255,255,0.3)' : s.color }}>
                {s.label}
              </span>
              <span className="text-[11px] font-mono" style={{ color: isHidden ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)' }}>
                {current.toFixed(1)}%
              </span>
              {!isHidden && <TrendIcon current={current} previous={previous} />}
            </button>
          )
        })}
      </div>

      {/* SVG Chart */}
      <div
        className="relative rounded-2xl border border-white/[0.06] overflow-hidden"
        style={{ backgroundColor: '#1c1c1e' }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="w-full"
          style={{ height: 'auto', display: 'block', cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Background grid */}
          {yTicks.map(tick => {
            const y = toY(tick)
            const isTarget = tick === 75 || tick === 85 || tick === 70
            return (
              <g key={tick}>
                <line
                  x1={PAD_L} y1={y} x2={CHART_W - PAD_R} y2={y}
                  stroke={isTarget ? 'rgba(255,255,255,0.05)' : '#2c2c2e'}
                  strokeWidth={isTarget ? 1 : 0.5}
                  strokeDasharray={isTarget ? '4 6' : undefined}
                />
                <text
                  x={PAD_L - 8} y={y + 4}
                  fontSize={10} fill="rgba(255,255,255,0.25)"
                  textAnchor="end" fontFamily="SF Mono, JetBrains Mono, monospace"
                >
                  {tick}
                </text>
              </g>
            )
          })}

          {/* X-axis ticks */}
          {xTicks.map(d => {
            const x = toX(d.iteration, data.length)
            return (
              <g key={d.iteration}>
                <line
                  x1={x} y1={CHART_H - PAD_B + 2} x2={x} y2={CHART_H - PAD_B + 6}
                  stroke="rgba(255,255,255,0.15)" strokeWidth={1}
                />
                <text
                  x={x} y={CHART_H - PAD_B + 18}
                  fontSize={9} fill="rgba(255,255,255,0.25)"
                  textAnchor="middle" fontFamily="SF Mono, JetBrains Mono, monospace"
                >
                  #{d.iteration}
                </text>
              </g>
            )
          })}

          {/* X-axis baseline */}
          <line
            x1={PAD_L} y1={CHART_H - PAD_B} x2={CHART_W - PAD_R} y2={CHART_H - PAD_B}
            stroke="rgba(255,255,255,0.08)" strokeWidth={1}
          />

          {/* Target dashed lines (horizontal) */}
          {SERIES.filter(s => !s.dashed && !hiddenSeries.has(s.key)).map(s => {
            const y = toY(s.target)
            return (
              <line
                key={`target-${s.key}`}
                x1={PAD_L} y1={y} x2={CHART_W - PAD_R} y2={y}
                stroke={s.color}
                strokeWidth={0.8}
                strokeDasharray="3 5"
                opacity={0.25}
              />
            )
          })}

          {/* Series paths — rendered as animated SVG paths */}
          {SERIES.map(s => {
            if (hiddenSeries.has(s.key)) return null
            const pathD = buildPath(data, s.key)
            const pathId = `path-${s.key}`
            const totalLength = 2000 // approximate

            return (
              <g key={s.key}>
                {/* Glow pass */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={s.dashed ? 1 : 3}
                  strokeDasharray={s.dashed ? '6 4' : undefined}
                  opacity={0.15}
                  filter="url(#glow)"
                />
                {/* Main line */}
                <motion.path
                  id={pathId}
                  d={pathD}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={s.dashed ? 1.5 : 2}
                  strokeDasharray={s.dashed ? '6 4' : undefined}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={s.dashed ? 0.5 : 0.85}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.6, ease: 'easeOut', delay: 0.1 }}
                />
                {/* Last point dot */}
                <motion.circle
                  cx={toX(lastPt.iteration, data.length)}
                  cy={toY(lastPt[s.key] as number)}
                  r={3}
                  fill={s.color}
                  opacity={0.9}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.4, type: 'spring', stiffness: 300 }}
                />
              </g>
            )
          })}

          {/* SVG filter: glow */}
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Tooltip vertical line */}
          {tooltip && (
            <line
              x1={tooltip.x} y1={PAD_T} x2={tooltip.x} y2={CHART_H - PAD_B}
              stroke="rgba(255,255,255,0.15)" strokeWidth={1}
              strokeDasharray="3 4"
            />
          )}

          {/* Tooltip dots */}
          {tooltip && SERIES.filter(s => !hiddenSeries.has(s.key)).map(s => (
            <circle
              key={s.key}
              cx={tooltip.x}
              cy={toY(tooltip.values[s.key])}
              r={3.5}
              fill={s.color}
              stroke="#1c1c1e"
              strokeWidth={1.5}
            />
          ))}
        </svg>

        {/* HTML Tooltip overlay */}
        {tooltip && (
          <div
            className="absolute pointer-events-none rounded-xl border border-white/[0.1] overflow-hidden"
            style={{
              backgroundColor: 'rgba(28,28,30,0.95)',
              backdropFilter: 'blur(16px)',
              left: tooltip.x / CHART_W > 0.7 ? undefined : `${(tooltip.x / CHART_W) * 100 + 2}%`,
              right: tooltip.x / CHART_W > 0.7 ? `${((CHART_W - tooltip.x) / CHART_W) * 100 + 2}%` : undefined,
              top: `${(PAD_T / CHART_H) * 100}%`,
              minWidth: 140,
              zIndex: 10,
            }}
          >
            <div className="px-3 py-2 border-b border-white/[0.06]">
              <span className="text-[10px] font-mono text-white/40">Iteration #{tooltip.iteration}</span>
            </div>
            <div className="px-3 py-2 space-y-1.5">
              {SERIES.filter(s => !hiddenSeries.has(s.key)).map(s => (
                <div key={s.key} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-[10px] text-white/50">{s.label}</span>
                  </div>
                  <span className="text-[11px] font-mono font-medium" style={{ color: s.color }}>
                    {tooltip.values[s.key].toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Axis labels */}
      <div className="flex justify-between mt-1 px-12">
        <span className="text-[9px] text-white/20 font-mono">Iteration 1</span>
        <span className="text-[9px] text-white/20 font-mono">Iteration {data.length} (actuelle)</span>
      </div>
    </motion.section>
  )
}
