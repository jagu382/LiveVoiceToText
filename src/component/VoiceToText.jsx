import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

// Real-time Voice → Text React component
// Requirements:
//  - Tailwind CSS configured in your project
//  - framer-motion installed (optional - used for small UI animations)
//  - Browser with Web Speech API (Chrome/Edge on desktop, most Android browsers)

export default function VoiceToText() {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [lang, setLang] = useState("en-US");
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // Feature detect Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const r = new SpeechRecognition();
    r.continuous = true; // keep streaming
    r.interimResults = true; // show realtime partial results
    r.maxAlternatives = 1;
    r.lang = lang;

    r.onresult = (event) => {
      let interim = "";
      let final = "";
      let highConfidence = null;

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        if (res.isFinal) {
          final += res[0].transcript;
          highConfidence = res[0].confidence;
        } else {
          interim += res[0].transcript;
        }
      }

      if (final) {
        setFinalTranscript((t) => (t ? t + " " + final.trim() : final.trim()));
        setInterimTranscript("");
      } else {
        setInterimTranscript(interim);
      }

      if (highConfidence !== null) setConfidence(highConfidence);
    };

    r.onend = () => {
      // if user wanted it on, restart automatically (helps keep stream alive on some browsers)
      recognitionRef.current = r;
      if (listening) {
        // small debounce to avoid infinite rapid restart loops
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => r.start(), 150);
      }
    };

    r.onerror = (e) => {
      console.error("Speech recognition error", e);
    };

    recognitionRef.current = r;

    return () => {
      clearTimeout(timerRef.current);
      try {
        r.onresult = null;
        r.onend = null;
        r.onerror = null;
        r.stop();
      } catch (e) {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // update language if recognition already created
    const r = recognitionRef.current;
    if (r) r.lang = lang;
  }, [lang]);

  const toggleListening = async () => {
    if (!recognitionRef.current) return;

    if (!listening) {
      try {
        // request mic permission early
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.error("Microphone permission denied", err);
        return;
      }

      try {
        recognitionRef.current.start();
        setListening(true);
      } catch (e) {
        // some browsers throw if started twice
        console.warn(e);
      }
    } else {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn(e);
      }
      setListening(false);
    }
  };

  const handleClear = () => {
    setFinalTranscript("");
    setInterimTranscript("");
    setConfidence(null);
  };



  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="w-full max-w-3xl bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Real-time Voice → Text</h1>
            <p className="mt-1 text-sm text-gray-300">Live transcription using your browser's SpeechRecognition API.</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-red-400 text-sm text-white px-3 py-2 rounded-lg border border-white/10 outline-none"
            >
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="hi-IN">Hindi (India)</option>
              <option value="or-IN">Odia (ଓଡ଼ିଆ)</option>
              {/* Add more as you like */}
            </select>

          </div>
        </header>

        <main className="mt-6">
          {!supported ? (
            <div className="p-6 rounded-lg bg-red-900/40 border border-red-800 text-red-100">
              <strong>Web Speech API not supported.</strong>
              <div className="mt-2 text-sm text-red-200">This demo relies on your browser's SpeechRecognition (Chrome / Edge on desktop work best). Try opening this page in a supported browser.</div>
            </div>
          ) : (
            <>
              <div className="relative bg-white/4 rounded-xl p-4 min-h-[160px]"> 
                <div className="text-sm text-gray-300 mb-2">Live transcript</div>

                <div className="prose prose-invert max-w-none break-words text-lg leading-relaxed">
                  <span>{finalTranscript}</span>
                  <span className="text-gray-400"> {interimTranscript}</span>
                </div>

                <div className="absolute right-4 bottom-4 flex gap-2">
                 
                  <button onClick={handleClear} className="px-3 py-2 rounded-lg border border-white/10 bg-white/6 text-sm text-red-300 hover:bg-white/8">
                    Clear
                  </button>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleListening}
                    className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-lg focus:outline-none ring-2 ring-white/6 ${
                      listening ? "bg-gradient-to-r from-red-500 to-pink-500 text-white" : "bg-white/6 text-white"
                    }`}
                    aria-pressed={listening}
                    aria-label={listening ? "Stop listening" : "Start listening"}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${listening ? 'bg-white/20' : 'bg-white/10'}`}>
                      {/* Microphone icon */}
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-5 h-5 ${listening ? 'text-white' : 'text-white'}`}>
                        <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3z" />
                        <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V22a1 1 0 1 0 2 0v-4.08A7 7 0 0 0 19 11z" />
                      </svg>
                    </div>

                    <div className="text-left">
                      <div className="text-sm font-medium">{listening ? 'Stop' : 'Start'} Transcription</div>
                      <div className="text-xs text-green-300">Real-time → {lang}</div>
                    </div>
                  </motion.button>

                  <div className="text-base text-orange-400">
                    :  Tap Microphone to speak and tap to stop recordings <br />
                    :  For language change stop the mic and start again
                  </div>
                </div>

              </div>
            </>
          )}
        </main>

        <footer className="mt-6 text-xs text-gray-400 flex justify-between">
          <div>A live transpiler • transform voice to text </div>
        </footer>
      </div>
    </div>
  );
}
