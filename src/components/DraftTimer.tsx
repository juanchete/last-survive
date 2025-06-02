import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, Volume2, VolumeX, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface DraftTimerProps {
  isMyTurn: boolean;
  isActive: boolean;
  onTimeExpired: () => void;
  onToggleAutoTimed?: (enabled: boolean) => void;
  timerDuration?: number; // en segundos, default 60
}

export const DraftTimer: React.FC<DraftTimerProps> = ({
  isMyTurn,
  isActive,
  onTimeExpired,
  onToggleAutoTimed,
  timerDuration = 60,
}) => {
  const [timeLeft, setTimeLeft] = useState(timerDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoTimedEnabled, setAutoTimedEnabled] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const warningPlayedRef = useRef(false);

  // Reiniciar timer cuando cambia el turno
  useEffect(() => {
    if (isMyTurn && isActive) {
      setTimeLeft(timerDuration);
      setIsRunning(true);
      warningPlayedRef.current = false;
      
      if (soundEnabled) {
        playTurnSound();
      }
      
      toast.info('¡Es tu turno para el draft!', {
        duration: 3000,
        icon: '⏰',
      });
    } else {
      setIsRunning(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isMyTurn, isActive, timerDuration, soundEnabled]);

  // Timer countdown
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          
          // Sonido de advertencia a los 10 segundos
          if (newTime === 10 && soundEnabled && !warningPlayedRef.current) {
            playWarningSound();
            warningPlayedRef.current = true;
            toast.warning('¡Quedan 10 segundos!', {
              duration: 2000,
              icon: '⚠️',
            });
          }
          
          // Tiempo agotado
          if (newTime <= 0) {
            setIsRunning(false);
            if (autoTimedEnabled) {
              toast.error('¡Tiempo agotado! Selección automática...', {
                duration: 3000,
                icon: '⏱️',
              });
              onTimeExpired();
            } else {
              toast.warning('¡Tiempo agotado!', {
                duration: 3000,
                icon: '⏱️',
              });
            }
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, soundEnabled, autoTimedEnabled, onTimeExpired]);

  // Funciones de sonido
  const playTurnSound = () => {
    try {
      // Sonido de notificación simple usando Web Audio API
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Audio not supported');
    }
  };

  const playWarningSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Sonido más urgente para advertencia
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    } catch (error) {
      console.log('Audio not supported');
    }
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  const toggleAutoTimed = () => {
    const newValue = !autoTimedEnabled;
    setAutoTimedEnabled(newValue);
    onToggleAutoTimed?.(newValue);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeLeft <= 10) return 'text-red-500';
    if (timeLeft <= 30) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getProgressValue = () => {
    return ((timerDuration - timeLeft) / timerDuration) * 100;
  };

  if (!isActive) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            Draft Timer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-400">
            Draft no iniciado
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 transition-all duration-300 ${
      isMyTurn 
        ? 'bg-blue-900/20 border-blue-500 shadow-lg shadow-blue-500/20' 
        : 'bg-gray-800 border-gray-700'
    }`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Draft Timer
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSound}
              className="h-6 w-6 p-0"
            >
              {soundEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
            </Button>
            {onToggleAutoTimed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAutoTimed}
                className={`h-6 w-6 p-0 ${autoTimedEnabled ? 'text-blue-400' : 'text-gray-500'}`}
              >
                <Zap className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isMyTurn ? (
          <>
            <div className="text-center">
              <div className={`text-3xl font-mono font-bold ${getTimerColor()}`}>
                {formatTime(timeLeft)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                ¡Es tu turno!
              </div>
            </div>
            
            <Progress 
              value={getProgressValue()} 
              className="h-2"
            />
            
            {autoTimedEnabled && (
              <div className="text-xs text-gray-400 text-center">
                Selección automática habilitada
              </div>
            )}
          </>
        ) : (
          <div className="text-center">
            <div className="text-xl font-mono text-gray-400">
              --:--
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Esperando turno...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 