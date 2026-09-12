import { useState, useEffect, useRef, useCallback } from 'react';

// Web Speech API interface declarations for TypeScript
interface IWindowSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface VoiceRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export interface VoiceRecognitionState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as unknown as IWindowSpeech;
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
}

export function useVoiceRecognition(options: VoiceRecognitionOptions = {}): VoiceRecognitionState {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  isListeningRef.current = isListening;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const isSupported = typeof window !== 'undefined' && isSpeechRecognitionSupported();

  // Clean up any active recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser environment. Try Google Chrome or Edge.');
      return;
    }

    const win = window as unknown as IWindowSpeech;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setError('Speech recognition is not available in this browser.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = optionsRef.current.continuous ?? true;
      recognition.interimResults = optionsRef.current.interimResults ?? true;
      recognition.lang = optionsRef.current.lang || (navigator.language || 'en-US');

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          const text = item[0]?.transcript || '';
          if (item.isFinal) {
            currentFinal += text;
          } else {
            currentInterim += text;
          }
        }

        if (currentFinal) {
          setTranscript(prev => {
            const next = prev ? `${prev} ${currentFinal.trim()}` : currentFinal.trim();
            if (optionsRef.current.onResult) {
              optionsRef.current.onResult(next, true);
            }
            return next;
          });
          setInterimTranscript('');
        } else {
          setInterimTranscript(currentInterim);
          if (optionsRef.current.onResult) {
            optionsRef.current.onResult(currentInterim, false);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition warning/error:', event.error);
        let errorMsg = 'Voice recognition error';
        if (event.error === 'not-allowed') {
          errorMsg = 'Microphone permission denied. Please allow microphone access.';
        } else if (event.error === 'no-speech') {
          errorMsg = 'No speech detected. Listening continued.';
          return;
        } else if (event.error === 'audio-capture') {
          errorMsg = 'No microphone was found on this device.';
        } else if (event.error === 'network') {
          errorMsg = 'Speech service network error.';
        }
        setError(errorMsg);
        if (optionsRef.current.onError) {
          optionsRef.current.onError(errorMsg);
        }
        if (event.error === 'not-allowed' || event.error === 'audio-capture') {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        if (isListeningRef.current && optionsRef.current.continuous) {
          try {
            recognition.start();
            return;
          } catch {
            // ignore
          }
        }
        setIsListening(false);
        setInterimTranscript('');
        if (optionsRef.current.onEnd) {
          optionsRef.current.onEnd();
        }
      };

      recognitionRef.current = recognition;
      setInterimTranscript('');
      recognition.start();
      setIsListening(true);
    } catch (err: any) {
      console.warn('Failed to initialize and start SpeechRecognition:', err);
      setError('Unable to activate microphone. Please verify permissions.');
      setIsListening(false);
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript
  };
}
