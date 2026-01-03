import type { PatientJourney } from '../types/flow';

interface JourneyTimelineProps {
  journeys: PatientJourney[];
  maxDisplay?: number;
}

const CATEGORY_COLORS = {
  Emergency: '#EF4444',
  Diagnostics: '#3B82F6',
  Treatment: '#10B981',
  Recovery: '#F59E0B',
  Discharge: '#8B5CF6',
};

export function JourneyTimeline({ journeys, maxDisplay = 10 }: JourneyTimelineProps) {
  const displayJourneys = journeys.slice(0, maxDisplay);

  if (displayJourneys.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No patient journey data available
      </div>
    );
  }

  const maxDuration = Math.max(...displayJourneys.map(j => j.totalDuration), 1);

  return (
    <div className="space-y-4">
      {displayJourneys.map((journey, index) => (
        <div key={index} className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-gray-700">Patient {journey.patientId}</span>
            <span className="text-gray-500">{Math.round(journey.totalDuration)} min</span>
          </div>

          <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden flex">
            {journey.stages.map((stage, stageIndex) => {
              const widthPercentage = (stage.duration / journey.totalDuration) * 100;

              return (
                <div
                  key={stageIndex}
                  className="relative group flex items-center justify-center text-white text-xs font-medium transition-opacity hover:opacity-90"
                  style={{
                    width: `${widthPercentage}%`,
                    backgroundColor: CATEGORY_COLORS[stage.category],
                    minWidth: widthPercentage > 5 ? 'auto' : '2px',
                  }}
                >
                  {widthPercentage > 8 && (
                    <span className="truncate px-1">{stage.department}</span>
                  )}

                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {stage.department}: {Math.round(stage.duration)} min
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-200">
        {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
          <div key={category} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-gray-600">{category}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
