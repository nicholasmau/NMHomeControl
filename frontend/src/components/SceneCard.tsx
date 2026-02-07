import React, { useState } from 'react';
import { Play, Sunrise, Moon, Tv, Lock, Home, ChevronDown, ChevronUp, Power, Zap } from 'lucide-react';

interface SceneAction {
  deviceId: string;
  deviceLabel?: string;
  capability: string;
  command: string;
  arguments?: unknown[];
}

interface Scene {
  sceneId: string;
  sceneName: string;
  sceneIcon?: string;
  sceneColor?: string;
  locationId: string;
  createdBy: string;
  createdDate: string;
  lastUpdatedDate: string;
  lastExecutedDate?: string;
  actions?: SceneAction[];
}

interface SceneCardProps {
  scene: Scene;
  onExecute: (sceneId: string) => Promise<void>;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  sunrise: Sunrise,
  moon: Moon,
  tv: Tv,
  lock: Lock,
  home: Home,
};

const COLOR_MAP: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200',
  indigo: 'bg-indigo-100 text-indigo-900 border-indigo-200 hover:bg-indigo-200',
  purple: 'bg-purple-100 text-purple-900 border-purple-200 hover:bg-purple-200',
  red: 'bg-red-100 text-red-900 border-red-200 hover:bg-red-200',
  green: 'bg-green-100 text-green-900 border-green-200 hover:bg-green-200',
  blue: 'bg-blue-100 text-blue-900 border-blue-200 hover:bg-blue-200',
  gray: 'bg-gray-100 text-gray-900 border-gray-200 hover:bg-gray-200',
};

export const SceneCard: React.FC<SceneCardProps> = ({ scene, onExecute }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      await onExecute(scene.sceneId);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to execute scene:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const IconComponent = scene.sceneIcon ? ICON_MAP[scene.sceneIcon] : Play;
  const colorClass = scene.sceneColor ? COLOR_MAP[scene.sceneColor] : COLOR_MAP.gray;

  const getCommandIcon = (command: string) => {
    if (command === 'on') return <Power className="w-4 h-4 text-green-600" />;
    if (command === 'off') return <Power className="w-4 h-4 text-gray-600" />;
    return <Zap className="w-4 h-4" />;
  };

  const getCommandLabel = (command: string) => {
    if (command === 'on') return 'Turn ON';
    if (command === 'off') return 'Turn OFF';
    return command.toUpperCase();
  };

  return (
    <div className={`rounded-lg border-2 transition-all ${colorClass}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-white bg-opacity-50">
              {IconComponent && <IconComponent className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{scene.sceneName}</h3>
              {scene.lastExecutedDate && (
                <p className="text-xs opacity-70">
                  Last executed: {new Date(scene.lastExecutedDate).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions section - expandable */}
        {scene.actions && scene.actions.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between p-3 rounded-md bg-white bg-opacity-50 hover:bg-opacity-70 transition-all text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                {scene.actions.length} {scene.actions.length === 1 ? 'device' : 'devices'} will be controlled
              </span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Expanded device list */}
            {isExpanded && (
              <div className="mt-2 space-y-2 bg-white bg-opacity-30 rounded-md p-3">
                {scene.actions.map((action, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-3 bg-white bg-opacity-50 rounded-md text-sm">
                    <span className="font-medium truncate flex-1">
                      {action.deviceLabel || 'Unknown Device'}
                    </span>
                    <div className="flex items-center gap-2 ml-2">
                      {getCommandIcon(action.command)}
                      <span className="font-semibold whitespace-nowrap">
                        {getCommandLabel(action.command)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleExecute}
          disabled={isExecuting}
          className="w-full px-4 py-3 rounded-md font-medium transition-all
                     bg-white bg-opacity-80 hover:bg-opacity-100
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
        >
          {isExecuting ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Executing...
            </>
          ) : showSuccess ? (
            <>
              <span className="text-green-600">✓</span>
              Executed!
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Execute Scene
            </>
          )}
        </button>
      </div>
    </div>
  );
};
