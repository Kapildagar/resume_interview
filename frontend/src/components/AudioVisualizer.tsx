
import React from 'react';

interface AudioVisualizerProps {
  audioLevel: number;
  isRecording: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioLevel, isRecording }) => {
  // Generate bars based on audio level
  const bars = Array.from({ length: 20 }, (_, i) => {
    const intensity = Math.max(0, audioLevel - (i * 0.05));
    const height = Math.min(100, 20 + (intensity * 80));
    
    return height;
  });

  if (!isRecording) return null;

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/20">
      <div className="flex items-center justify-center space-x-2">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-gray-700">Recording...</span>
        </div>
        
        <div className="flex items-end space-x-1 mx-8">
          {bars.map((height, index) => (
            <div
              key={index}
              className="bg-gradient-to-t from-red-500 to-orange-400 rounded-sm transition-all duration-100"
              style={{
                width: '3px',
                height: `${height}%`,
                minHeight: '4px',
                maxHeight: '40px',
                animationDelay: `${index * 50}ms`
              }}
            />
          ))}
        </div>
        
        <div className="text-sm text-gray-600">
          Level: {Math.round(audioLevel * 100)}%
        </div>
      </div>
    </div>
  );
};

export default AudioVisualizer;
