import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import './LiveVoiceStream.css';

// --- Konfigurasi Berdasarkan Dokumentasi Terbaru ---
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const NATIVE_AUDIO_MODEL = 'gemini-2.5-flash-preview-native-audio-dialog';
const INPUT_SAMPLE_RATE = 16000; 

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
      const session = await ai.live.connect({
        model: NATIVE_AUDIO_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            sampleRateHertz: INPUT_SAMPLE_RATE,
          },
        },
        callbacks: {
          onopen: () => {
            console.log("Koneksi Live AI terbuka.");
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
            setIsConnected(false); // Set isConnected ke false saat error
            stopListening();
          },
          onclose: () => {
            console.log("Koneksi Live AI ditutup.");
            setIsConnected(false); // Set isConnected ke false saat ditutup
            setStatusMessage('Koneksi terputus.');
          },
        },
      });
      sessionRef.current = session;
    } catch (error) {
      console.error("Gagal koneksi:", error);
      setStatusMessage('Gagal terhubung. Cek API Key.');
      setIsConnected(false);
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
      mediaStreamRef.current = stream;
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: INPUT_SAMPLE_RATE,
      });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      processorRef.current = audioContextRef.current.createScriptProcessor(1024, 1, 1);
      processorRef.current.onaudioprocess = (event) => {
        // ==================================================
        // INI BAGIAN YANG DIPERBAIKI
        // ==================================================
        if (sessionRef.current && isConnected) {
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
    if (!isListening && !isConnected) return; // Hindari menjalankan jika sudah berhenti
    setIsListening(false);
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
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
