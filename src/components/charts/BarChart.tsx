interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  maxValue?: number;
  height?: number;
  showLabels?: boolean;
  horizontal?: boolean;
}

export function BarChart({ data, maxValue, height = 200, showLabels = true, horizontal = false }: BarChartProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);

  if (horizontal) {
    return (
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700 font-medium truncate mr-2">{item.label}</span>
              <span className="text-gray-500">{item.value.toLocaleString()}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(item.value / max) * 100}%`,
                  backgroundColor: item.color || '#3B82F6',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((item, index) => (
        <div key={index} className="flex-1 flex flex-col items-center">
          <div className="w-full flex items-end justify-center" style={{ height: height - 40 }}>
            <div
              className="w-full max-w-[40px] rounded-t transition-all duration-500 hover:opacity-80"
              style={{
                height: `${(item.value / max) * 100}%`,
                backgroundColor: item.color || '#3B82F6',
                minHeight: item.value > 0 ? 4 : 0,
              }}
            />
          </div>
          {showLabels && (
            <div className="mt-2 text-center">
              <p className="text-xs text-gray-500 truncate max-w-[60px]">{item.label}</p>
              <p className="text-xs font-medium text-gray-700">{item.value}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
