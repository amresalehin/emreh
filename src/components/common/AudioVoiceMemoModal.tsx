import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  RotateCcw,
  Check,
  X,
  FileText,
  Bookmark,
  Sparkles,
  Download,
  Volume2,
  AlertCircle
} from 'lucide-react';
import { isSpeechRecognitionSupported } from '../../utils/speechRecognition';

interface AudioVoiceMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveToJournal?: (transcript: string, audioBlob?: Blob) => void;
  onSaveToKeep?: (title: string, content: string, audioBlob?: Blob) => void;
  onSaveToNotes?: (content: string) => void;
  currentDate?: Date;
}

export const AudioVoiceMemoModal: React.FC<AudioVoiceMemoModalProps> = ({
  isOpen,
  onClose,
  onSaveToJournal,
  onSaveToKeep,
  onSaveToNotes,
  currentDate = new Date()
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioVolumeBars, setAudioVolumeBars] = useState<number[]>(new Array(24).fill(10));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Reset modal state
  const resetAll = () => {
    stopRecording();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAudioBlob(null);
    setTranscript('');
    setInterimText('');
    setRecordingSeconds(0);
    setIsRecording(false);
    setIsPaused(false);
    setIsPlayingAudio(false);
    setSavedSuccess(null);
    setErrorMessage(null);
  };

  useEffect(() => {
    if (!isOpen) {
      resetAll();
    }
  }, [isOpen]);

  const startRecording = async () => {
    setErrorMessage(null);
    setSavedSuccess(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Audio Context for visualizer
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        const updateVisualizer = () => {
          if (!analyserRef.current) return;
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);

          const bars: number[] = [];
          const step = Math.max(1, Math.floor(dataArray.length / 24));
          for (let i = 0; i < 24; i++) {
            const val = dataArray[i * step] || 0;
            bars.push(Math.max(8, Math.min(100, Math.round((val / 255) * 100))));
          }
          setAudioVolumeBars(bars);
          animationFrameRef.current = requestAnimationFrame(updateVisualizer);
        };
        updateVisualizer();
      } catch (err) {
        console.warn('Audio visualizer error:', err);
      }

      // MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop stream tracks
        stream.getTracks().forEach(track => track.stop());

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(() => {});
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setIsPaused(false);

      // Timer
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);

      // Speech Recognition
      if (isSpeechRecognitionSupported()) {
        try {
          const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          const rec = new SpeechRec();
          recognitionRef.current = rec;
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = 'en-US';

          rec.onresult = (event: any) => {
            let finalStr = '';
            let interimStr = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalStr += event.results[i][0].transcript + ' ';
              } else {
                interimStr += event.results[i][0].transcript;
              }
            }
            if (finalStr) {
              setTranscript(prev => (prev ? `${prev.trim()} ${finalStr.trim()}` : finalStr.trim()));
            }
            setInterimText(interimStr);
          };

          rec.onerror = (e: any) => {
            console.warn('Speech recognition warning:', e.error);
          };

          rec.start();
        } catch (err) {
          console.warn('Could not start speech recognition:', err);
        }
      }
    } catch (err: any) {
      console.error('Microphone access denied:', err);
      setErrorMessage('Microphone access was denied or not found. Please allow microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSaveToJournal = () => {
    const textToSave = transcript.trim() || interimText.trim() || 'Audio Voice Memo';
    if (onSaveToJournal) {
      onSaveToJournal(textToSave, audioBlob || undefined);
      setSavedSuccess('Saved to Daily Journal!');
      setTimeout(() => onClose(), 1200);
    }
  };

  const handleSaveToKeep = () => {
    const textToSave = transcript.trim() || interimText.trim() || 'Audio Memo';
    const dateFormatted = currentDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    if (onSaveToKeep) {
      onSaveToKeep(`Voice Memo (${dateFormatted})`, textToSave, audioBlob || undefined);
      setSavedSuccess('Saved to Google Keep!');
      setTimeout(() => onClose(), 1200);
    }
  };

  const handleSaveToNotes = () => {
    const textToSave = transcript.trim() || interimText.trim() || 'Audio Voice Memo';
    if (onSaveToNotes) {
      onSaveToNotes(textToSave);
      setSavedSuccess('Added to Notes!');
      setTimeout(() => onClose(), 1200);
    }
  };

  const handleDownloadMemo = () => {
    if (!audioBlob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(audioBlob);
    a.download = `voice-memo-${new Date().toISOString().slice(0, 19)}.webm`;
    a.click();

    if (transcript.trim()) {
      const txtBlob = new Blob([transcript], { type: 'text/plain' });
      const aTxt = document.createElement('a');
      aTxt.href = URL.createObjectURL(txtBlob);
      aTxt.download = `voice-memo-transcript-${new Date().toISOString().slice(0, 19)}.txt`;
      aTxt.click();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="audio-voice-memo-modal"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn"
      onClick={e => {
        if (e.target === e.currentTarget && !isRecording) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-[#18181b] border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                Audio Voice Memo
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300">
                  Live Transcription
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Speech-to-text with direct sync to Journal & Notes
              </p>
            </div>
          </div>
          <button
            id="close-voice-memo-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col gap-5">
          {/* Error notice */}
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success notice */}
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 shrink-0" />
              <span>{savedSuccess}</span>
            </div>
          )}

          {/* Waveform & Recorder Controls */}
          <div className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-100 dark:border-zinc-800/80">
            {/* Volume frequency bars */}
            <div className="flex items-center justify-center gap-1.5 h-16 w-full max-w-sm px-4">
              {audioVolumeBars.map((height, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-full transition-all duration-75"
                  style={{
                    height: `${isRecording ? height : 12}%`,
                    backgroundColor: isRecording
                      ? '#f59e0b'
                      : audioUrl
                      ? '#3b82f6'
                      : 'rgba(156, 163, 175, 0.4)'
                  }}
                />
              ))}
            </div>

            {/* Timer */}
            <div className="mt-4 flex items-center gap-2">
              {isRecording && (
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              )}
              <span className="font-mono text-2xl font-bold text-gray-800 dark:text-zinc-100">
                {formatSeconds(recordingSeconds)}
              </span>
            </div>

            {/* Main Action Buttons */}
            <div className="mt-5 flex items-center gap-4">
              {!isRecording ? (
                <button
                  id="start-voice-recording-btn"
                  onClick={startRecording}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-sm shadow-lg shadow-amber-500/25 active:scale-95 transition-all"
                >
                  <Mic className="w-5 h-5" />
                  <span>Start Recording</span>
                </button>
              ) : (
                <button
                  id="stop-voice-recording-btn"
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-lg shadow-red-600/25 active:scale-95 transition-all animate-pulse"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Stop & Transcribe</span>
                </button>
              )}

              {audioUrl && !isRecording && (
                <button
                  id="restart-voice-recording-btn"
                  onClick={startRecording}
                  title="Record again"
                  className="p-3 rounded-full border border-gray-300 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Audio playback when recorded */}
            {audioUrl && !isRecording && (
              <div className="w-full mt-4 pt-4 border-t border-gray-200 dark:border-zinc-800 flex items-center gap-3">
                <audio
                  ref={audioElementRef}
                  src={audioUrl}
                  onPlay={() => setIsPlayingAudio(true)}
                  onPause={() => setIsPlayingAudio(false)}
                  onEnded={() => setIsPlayingAudio(false)}
                  className="hidden"
                />
                <button
                  id="play-voice-preview-btn"
                  onClick={() => {
                    if (audioElementRef.current) {
                      if (isPlayingAudio) {
                        audioElementRef.current.pause();
                      } else {
                        audioElementRef.current.play();
                      }
                    }
                  }}
                  className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 shadow transition"
                >
                  {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <div className="flex-1 text-xs text-gray-600 dark:text-zinc-400">
                  <div className="font-semibold text-gray-800 dark:text-zinc-200">
                    Audio Memo Captured ({formatSeconds(recordingSeconds)})
                  </div>
                  <div>Preview playback before dispatching</div>
                </div>
                <button
                  onClick={handleDownloadMemo}
                  title="Download recording"
                  className="p-2 rounded-lg text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-800 transition"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Transcribed Text Area */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Transcribed Text
              </label>
              <span className="text-[11px] text-gray-400">
                {transcript.trim() ? `${transcript.trim().split(/\s+/).length} words` : 'Waiting for speech...'}
              </span>
            </div>

            <textarea
              id="voice-memo-transcript-input"
              value={transcript + (interimText ? ` ${interimText}` : '')}
              onChange={e => setTranscript(e.target.value)}
              placeholder={
                isRecording
                  ? 'Listening... Speak into your microphone and text will appear here automatically.'
                  : 'Start recording or type manual notes here...'
              }
              rows={4}
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none font-sans leading-relaxed"
            />
          </div>

          {/* Dispatch Targets */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-gray-600 dark:text-zinc-400">
              Save Voice Memo To:
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                id="save-voice-to-journal-btn"
                onClick={handleSaveToJournal}
                disabled={isRecording || (!transcript.trim() && !audioBlob)}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-pink-500 hover:bg-pink-50/30 dark:hover:bg-pink-950/20 text-gray-800 dark:text-zinc-200 transition disabled:opacity-40 disabled:pointer-events-none group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold">Daily Journal</span>
                <span className="text-[10px] text-gray-400">Append to today</span>
              </button>

              <button
                id="save-voice-to-notes-btn"
                onClick={handleSaveToNotes}
                disabled={isRecording || (!transcript.trim() && !audioBlob)}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-amber-500 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 text-gray-800 dark:text-zinc-200 transition disabled:opacity-40 disabled:pointer-events-none group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold">Notes & Brain</span>
                <span className="text-[10px] text-gray-400">New document</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
