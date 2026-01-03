interface DataPoint {
  label: string;
  values: { name: string; value: number; color: string }[];
}

interface LineChartProps {
  data: DataPoint[];
  height?: number;
  showLegend?: boolean;
}

export function LineChart({ data, height = 250, showLegend = true }: LineChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-400" style={{ height }}>
        No data available
      </div>
    );
  }

  const allValues = data.flatMap((d) => d.values.map((v) => v.value));
  const maxValue = Math.max(...allValues, 1);
  const minValue = Math.min(...allValues, 0);
  const range = maxValue - minValue || 1;

  const chartHeight = height - 60;
  const chartWidth = 100;

  const getY = (value: number) => {
    return chartHeight - ((value - minValue) / range) * chartHeight;
  };

  const seriesNames = data[0]?.values.map((v) => v.name) || [];
  const seriesColors = data[0]?.values.map((v) => v.color) || [];

  return (
    <div style={{ height }}>
      {showLegend && seriesNames.length > 0 && (
        <div className="flex items-center gap-4 mb-4">
          {seriesNames.map((name, i) => (
            <div key={name} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: seriesColors[i] }}
              />
              <span className="text-xs text-gray-600">{name}</span>
            </div>
          ))}
        </div>
      )}

      <div className="relative" style={{ height: chartHeight + 40 }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height: chartHeight }}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={ratio}
              x1="0"
              y1={ratio * chartHeight}
              x2={chartWidth}
              y2={ratio * chartHeight}
              stroke="#E5E7EB"
              strokeWidth="0.5"
            />
          ))}

          {seriesNames.map((_, seriesIndex) => {
            const points = data.map((d, i) => {
              const x = (i / (data.length - 1 || 1)) * chartWidth;
              const y = getY(d.values[seriesIndex]?.value || 0);
              return `${x},${y}`;
            });

            return (
              <g key={seriesIndex}>
                <polyline
                  points={points.join(' ')}
                  fill="none"
                  stroke={seriesColors[seriesIndex]}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
                {data.map((d, i) => {
                  const x = (i / (data.length - 1 || 1)) * chartWidth;
                  const y = getY(d.values[seriesIndex]?.value || 0);
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="1.5"
                      fill={seriesColors[seriesIndex]}
                      className="hover:r-3 transition-all"
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        <div className="flex justify-between mt-2 px-1">
          {data.map((d, i) => (
            <span
              key={i}
              className="text-xs text-gray-500"
              style={{ width: `${100 / data.length}%`, textAlign: 'center' }}
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
