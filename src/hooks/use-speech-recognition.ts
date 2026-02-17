
'use client';

import { useState, useEffect, useRef } from 'react';

let recognition: SpeechRecognition | null = null;
if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'en-US';
    recognition.interimResults = true;
}

export const useSpeechRecognition = () => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<SpeechRecognition | null>(recognition);
  
    useEffect(() => {
      const rec = recognitionRef.current;
      if (!rec) return;
  
      rec.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
            setTranscript(prev => prev ? `${prev} ${finalTranscript}` : finalTranscript);
        }
      };
  
      rec.onend = () => {
        if (isListening) {
            // If it ends unexpectedly, restart it
            rec.start();
        }
      };
  
      rec.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      return () => {
        rec.onresult = null;
        rec.onend = null;
        rec.onerror = null;
      };
    }, [isListening]);
  
    const startListening = () => {
      const rec = recognitionRef.current;
      if (rec && !isListening) {
        setTranscript('');
        setIsListening(true);
        rec.start();
      }
    };
  
    const stopListening = () => {
      const rec = recognitionRef.current;
      if (rec && isListening) {
        setIsListening(false);
        rec.stop();
      }
    };
  
    return {
      isListening,
      transcript,
      startListening,
      stopListening,
      hasRecognitionSupport: !!recognitionRef.current,
    };
};
