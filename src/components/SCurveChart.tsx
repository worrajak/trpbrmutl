"use client";

// S-Curve Progress Chart
// แสดงความก้าวหน้าโครงการเทียบกับแผน

interface Phase {
  name: string;
  startMonth: number; // 0 = ต.ค. 68
  endMonth: number;
  color: string;
}

interface Milestone {
  month: number;
  label: string;
}

interface SCurveProps {
  // ค่า planned S-curve (0-100) ทั้ง 12 เดือน (ต.ค.68 - ก.ย.69)
  planned?: number[];
  // ค่า actual progress (0-100) เท่าที่มี
  actual?: number[];
  // เดือนปัจจุบัน (0 = ต.ค. 68)
  currentMonth?: number;
  phases?: Phase[];
  milestones?: Milestone[];
}

const MONTHS = [
  "ต.ค. 68",
  "พ.ย. 68",
  "ธ.ค. 68",
  "ม.ค. 69",
  "ก.พ. 69",
  "มี.ค. 69",
  "เม.ย. 69",
  "พ.ค. 69",
  "มิ.ย. 69",
  "ก.ค. 69",
  "ส.ค. 69",
  "ก.ย. 69",
];

// S-Curve มาตรฐาน (slow start → fast middle → slow finish)
const DEFAULT_PLANNED: number[] = [
  2, 8, 18, 32, 48, 62, 74, 84, 91, 96, 99, 100,
];

const DEFAULT_PHASES: Phase[] = [
  { name: "เฟส 1: การเตรียมการ", startMonth: 0, endMonth: 2, color: "#DBEAFE" },
  { name: "เฟส 2: การดำเนินการ", startMonth: 3, endMonth: 5, color: "#DCFCE7" },
  { name: "เฟส 3: การขยายผล", startMonth: 6, endMonth: 8, color: "#FEF3C7" },
  { name: "เฟส 4: การส่งมอบงาน", startMonth: 9, endMonth: 11, color: "#F3E8FF" },
];

export default function SCurveChart({
  planned = DEFAULT_PLANNED,
  actual,
  currentMonth = 5, // default มี.ค. 69
  phases = DEFAULT_PHASES,
  milestones = [],
}: SCurveProps) {
  const W = 800;
  const H = 320;
  const PAD = { top: 30, right: 30, bottom: 40, left: 50 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const xScale = (month: number) => PAD.left + (month / 11) * chartW;
  const yScale = (pct: number) => PAD.top + chartH - (pct / 100) * chartH;

  // Build SVG path from data points
  function buildPath(data: number[]): string {
    return data
      .map((val, i) => {
        const x = xScale(i);
        const y = yScale(val);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }

  // Smooth curve using cubic bezier
  function buildSmoothPath(data: number[]): string {
    if (data.length < 2) return "";
    const points = data.map((val, i) => ({ x: xScale(i), y: yScale(val) }));
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  }

  const actualData = actual || planned.slice(0, currentMonth + 1).map((v, i) => {
    // สร้างตัวอย่าง actual ที่ต่ำกว่า planned เล็กน้อย
    if (i <= currentMonth) return Math.max(0, v - Math.random() * 5);
    return 0;
  });

  const currentPct = actualData[Math.min(currentMonth, actualData.length - 1)] || 0;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">
        กราฟความคืบหน้าสะสม S-Curve
      </h3>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H + 80}`}
          className="w-full min-w-[600px]"
          style={{ maxHeight: 450 }}
        >
          {/* Grid lines */}
          {[0, 20, 40, 60, 80, 100].map((pct) => (
            <g key={pct}>
              <line
                x1={PAD.left}
                y1={yScale(pct)}
                x2={W - PAD.right}
                y2={yScale(pct)}
                stroke="#E5E7EB"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={yScale(pct) + 4}
                textAnchor="end"
                className="fill-gray-400"
                fontSize={11}
              >
                {pct}%
              </text>
            </g>
          ))}

          {/* Month labels */}
          {MONTHS.map((m, i) => (
            <text
              key={i}
              x={xScale(i)}
              y={H - 5}
              textAnchor="middle"
              className="fill-gray-500"
              fontSize={10}
            >
              {m}
            </text>
          ))}

          {/* Current month marker */}
          <line
            x1={xScale(currentMonth)}
            y1={PAD.top}
            x2={xScale(currentMonth)}
            y2={PAD.top + chartH}
            stroke="#EF4444"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.5}
          />

          {/* Planned S-Curve (dashed) */}
          <path
            d={buildSmoothPath(planned)}
            fill="none"
            stroke="#9CA3AF"
            strokeWidth={2}
            strokeDasharray="8 4"
          />

          {/* Actual progress (solid) */}
          <path
            d={buildSmoothPath(actualData)}
            fill="none"
            stroke="#1B5E20"
            strokeWidth={3}
          />

          {/* Current point */}
          <circle
            cx={xScale(currentMonth)}
            cy={yScale(currentPct)}
            r={6}
            fill="#EF4444"
            stroke="white"
            strokeWidth={2}
          />

          {/* Current status label */}
          <rect
            x={xScale(currentMonth) - 55}
            y={yScale(currentPct) - 30}
            width={110}
            height={22}
            rx={11}
            fill="#FEE2E2"
          />
          <text
            x={xScale(currentMonth)}
            y={yScale(currentPct) - 15}
            textAnchor="middle"
            className="fill-red-600"
            fontSize={11}
            fontWeight="bold"
          >
            สถานะปัจจุบัน: {Math.round(currentPct)}%
          </text>

          {/* Target flag */}
          <text
            x={W - PAD.right + 5}
            y={yScale(100) + 4}
            className="fill-gray-600"
            fontSize={10}
          >
            เป้าหมาย
          </text>

          {/* Legend */}
          <g transform={`translate(${W - 200}, ${PAD.top})`}>
            <line x1={0} y1={0} x2={25} y2={0} stroke="#9CA3AF" strokeWidth={2} strokeDasharray="6 3" />
            <text x={30} y={4} fontSize={10} className="fill-gray-500">เส้นแผนงาน S-Curve</text>
            <line x1={0} y1={16} x2={25} y2={16} stroke="#1B5E20" strokeWidth={3} />
            <text x={30} y={20} fontSize={10} className="fill-gray-500">ความคืบหน้าจริง</text>
          </g>

          {/* Phase bars */}
          {phases.map((phase, i) => {
            const x1 = xScale(phase.startMonth);
            const x2 = xScale(phase.endMonth);
            const barY = H + 20;
            return (
              <g key={i}>
                <rect
                  x={x1}
                  y={barY}
                  width={x2 - x1}
                  height={28}
                  rx={6}
                  fill={phase.color}
                  stroke="#D1D5DB"
                  strokeWidth={0.5}
                />
                <text
                  x={(x1 + x2) / 2}
                  y={barY + 17}
                  textAnchor="middle"
                  fontSize={10}
                  className="fill-gray-700"
                  fontWeight="500"
                >
                  {phase.name}
                </text>
              </g>
            );
          })}

          {/* Phase label */}
          <text x={PAD.left - 5} y={H + 38} fontSize={10} className="fill-gray-500" textAnchor="end">
            เฟส
          </text>

          {/* Milestones */}
          {milestones.map((ms, i) => (
            <g key={i}>
              <circle
                cx={xScale(ms.month)}
                cy={PAD.top - 10}
                r={8}
                fill="#DBEAFE"
                stroke="#3B82F6"
                strokeWidth={1}
              />
              <text
                x={xScale(ms.month)}
                y={PAD.top - 7}
                textAnchor="middle"
                fontSize={8}
                className="fill-blue-600"
              >
                ✓
              </text>
              <text
                x={xScale(ms.month)}
                y={PAD.top - 22}
                textAnchor="middle"
                fontSize={9}
                className="fill-gray-600"
              >
                {ms.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Phase legend (mobile-friendly) */}
      <div className="flex flex-wrap gap-2 text-xs">
        {phases.map((phase, i) => (
          <span
            key={i}
            className="rounded px-2 py-1"
            style={{ backgroundColor: phase.color }}
          >
            {phase.name}
          </span>
        ))}
      </div>
    </div>
  );
}
