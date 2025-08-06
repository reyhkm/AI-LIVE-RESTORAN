import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import './LiveVoiceStream.css';

// --- Konfigurasi Berdasarkan Dokumentasi Terbaru ---
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Model Native Audio untuk kualitas suara terbaik dan fitur canggih.
// Sumber: https://ai.google.dev/gemini-api/docs/models#gemini-2.5-flash-native-audio
const NATIVE_AUDIO_MODEL = 'gemini-2.5-flash-preview-native-audio-dialog';

// Sample rate yang direkomendasikan untuk input audio.
// Sumber: https://ai.google.dev/gemini-api/docs/live-guide#audio-formats
const INPUT_SAMPLE_RATE = 16000; 
const OUTPUT_SAMPLE_RATE = 24000; // Output audio dari Live API selalu 24kHz.

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const LiveVoiceStream = () => {
  const [isListening, setIsListening] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Klik "Start" untuk memulai');
  const [transcript, setTranscript] = useState('');

  const sessionRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const mediaStreamRef = useRef(null);

  // --- Fungsi untuk Memainkan Audio dari AI ---
  const playNextInQueue = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      return;
    }
    isPlayingRef.current = true;
    
    const audioData = audioQueueRef.current.shift();
    
    try {
      // Audio dari server adalah base64, kita perlu decode
      const audioBlob = await (await fetch(`data:audio/ogg;base64,${audioData}`)).blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        isPlayingRef.current = false;
        playNextInQueue();
      };
    } catch (error) {
      console.error("Gagal memainkan audio:", error);
      isPlayingRef.current = false;
      playNextInQueue();
    }
  };

  // --- Fungsi untuk Menghubungkan ke Live AI ---
  const connect = async () => {
    setStatusMessage('Menghubungkan ke AI...');
    try {
      // Menggunakan ai.live.connect sesuai dokumentasi
      // Sumber: https://ai.google.dev/gemini-api/docs/live
      const session = await ai.live.connect({
        model: NATIVE_AUDIO_MODEL,
        config: {
          // Meminta AI untuk merespons dengan audio
          responseModalities: [Modality.AUDIO],
          // Memberi tahu AI format audio yang kita kirim
          speechConfig: {
            sampleRateHertz: INPUT_SAMPLE_RATE,
          },
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setStatusMessage('Terhubung. Silakan bicara.');
          },
          onmessage: (e) => {
            const serverMessage = JSON.parse(e.data);
            if (serverMessage.text) {
              setTranscript(prev => prev + serverMessage.text);
            }
            if (serverMessage.audio) {
              audioQueueRef.current.push(serverMessage.audio);
              playNextInQueue();
            }
            if (serverMessage.serverContent?.interrupted) {
              console.log("AI terinterupsi oleh ucapan Anda.");
            }
          },
          onerror: (e) => {
            console.error("Error koneksi:", e);
            setStatusMessage('Error. Coba lagi.');
            stopListening();
          },
          onclose: () => {
            setIsConnected(false);
            setStatusMessage('Koneksi terputus.');
          },
        },
      });
      sessionRef.current = session;
    } catch (error) {
      console.error("Gagal koneksi:", error);
      setStatusMessage('Gagal terhubung. Cek API Key.');
    }
  };

  // --- Fungsi untuk Memulai & Menghentikan Mendengarkan ---
  const startListening = async () => {
    if (isListening) return;
    setIsListening(true);
    setTranscript('');
    await connect();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream; // Simpan stream untuk bisa dihentikan nanti
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: INPUT_SAMPLE_RATE,
      });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      processorRef.current = audioContextRef.current.createScriptProcessor(1024, 1, 1);
      processorRef.current.onaudioprocess = (event) => {
        if (sessionRef.current && sessionRef.current.isOpen()) {
          const inputData = event.inputBuffer.getChannelData(0);
          sessionRef.current.send(inputData);
        }
      };
      
      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

    } catch (error) {
      console.error("Error mengakses mikrofon:", error);
      setStatusMessage('Gagal akses mikrofon. Pastikan izin diberikan.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (!isListening) return;
    setIsListening(false);
    setStatusMessage('Klik "Start" untuk memulai');

    // Hentikan track mikrofon
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
  };

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Efek cleanup untuk memastikan koneksi ditutup saat komponen hilang
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  return (
    <div className="voice-container">
      <div className="status-display">
        <p>{statusMessage}</p>
      </div>
      <div className="transcript-window">
        <p>{transcript || "Transkrip percakapan akan muncul di sini..."}</p>
      </div>
      <button 
        className={`mic-button ${isListening ? 'listening' : ''}`}
        onClick={handleToggleListening}
      >
        {isListening ? 'Stop' : 'Start'}
      </button>
    </div>
  );
};

export default LiveVoiceStream;
