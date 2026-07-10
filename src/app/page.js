"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import Discover from "@/components/Discover";
import Archives from "@/components/Archives";
import Workspace from "@/components/Workspace/Workspace";
import { extractVideoId } from "@/lib/utils";
import styles from "./page.module.css";

export default function Home() {
  const [urlInput, setUrlInput] = useState("");
  const [videoId, setVideoId] = useState("");
  const [transcript, setTranscript] = useState([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(-1);
  const [autoPause, setAutoPause] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [savedUrls, setSavedUrls] = useState([]);
  const [currentPhonetics, setCurrentPhonetics] = useState([]);
  const [currentTab, setCurrentTab] = useState('WORKSPACE');
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [playerReady, setPlayerReady] = useState(false);
  const [initialSeekDoneId, setInitialSeekDoneId] = useState("");

  const RECOMMENDED_BY_LEVEL = [
    {
      level: "IELTS 4.5 - 5.5",
      badge: "Basic & Intermediate",
      channels: [
        { name: "BBC Learning", url: "BBC Learning English", description: "Everyday English topics with slow, clear pronunciation." },
        { name: "English Speeches", url: "English Speeches", description: "Inspirational speeches with large subtitles & clear pacing." }
      ]
    },
    {
      level: "IELTS 6.0 - 6.5",
      badge: "Upper Intermediate",
      channels: [
        { name: "TED Talks", url: "TED Talks", description: "Academic and technology talks. Natural speech with diverse global accents." },
        { name: "National Geographic", url: "National Geographic", description: "Nature, history, and science documentaries. High quality vocabulary." }
      ]
    },
    {
      level: "IELTS 7.0+",
      badge: "Advanced",
      channels: [
        { name: "Kurzgesagt", url: "Kurzgesagt in a nutshell", description: "Fast-paced scientific explanations. Extremely rich in advanced vocabulary." },
        { name: "Vox", url: "Vox", description: "Complex visual journalism, fast native speech, and dense explanations." }
      ]
    }
  ];

  const playerRef = useRef(null);
  const transcriptListRef = useRef(null);
  const sentenceRefs = useRef([]);
  const lastTimeRef = useRef(0);


  const handleFetch = async (overrideUrl) => {
    const targetUrl = typeof overrideUrl === 'string' ? overrideUrl : urlInput;
    setError("");
    const id = extractVideoId(targetUrl);
    if (!id) {
      setError("Invalid YouTube URL. Please try again.");
      return;
    }
    setVideoId(id);
    setPlayerReady(false);
    setInitialSeekDoneId("");
    setLoading(true);
    setTranscript([]);
    setCurrentSentenceIndex(-1);

    try {
      const res = await fetch(`/api/transcript?url=${encodeURIComponent(targetUrl)}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setTranscript(data.transcript);
        if (data.transcript.length > 0) {
          const savedProgress = localStorage.getItem(`shadowing_progress_${id}`);
          if (savedProgress !== null && !isNaN(parseInt(savedProgress))) {
            setCurrentSentenceIndex(parseInt(savedProgress));
          } else {
            setCurrentSentenceIndex(0);
          }
        }
      }
    } catch (err) {
      setError("An unexpected error occurred while fetching the transcript.");
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (!playerRef.current || transcript.length === 0) return;

      const currentSentence = transcript[currentSentenceIndex];

      if (e.key === "Tab") {
        e.preventDefault();
        if (currentSentence) {
          playerRef.current.seekTo(currentSentence.start);
          playerRef.current.playVideo();
        }
      } else if (e.code === "Space") {
        e.preventDefault();
        const state = playerRef.current.getPlayerState();
        if (state === 1) {
          playerRef.current.pauseVideo();
        } else {
          playerRef.current.playVideo();
        }
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        if (currentSentence) {
          playerRef.current.seekTo(currentSentence.start);
          playerRef.current.playVideo();
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (currentSentenceIndex < transcript.length - 1) {
          const nextIndex = currentSentenceIndex + 1;
          playerRef.current.seekTo(transcript[nextIndex].start);
          playerRef.current.playVideo();
          setCurrentSentenceIndex(nextIndex);
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (currentSentenceIndex > 0) {
          const prevIndex = currentSentenceIndex - 1;
          playerRef.current.seekTo(transcript[prevIndex].start);
          playerRef.current.playVideo();
          setCurrentSentenceIndex(prevIndex);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSentenceIndex, transcript]);

  useEffect(() => {
    let interval;
    if (playerRef.current && transcript.length > 0) {
      interval = setInterval(async () => {
        if (!playerRef.current?.getCurrentTime) return;
        
        const state = playerRef.current.getPlayerState();
        if (state !== 1) return;

        const currentTime = await playerRef.current.getCurrentTime();
        const lastTime = lastTimeRef.current;
        lastTimeRef.current = currentTime;

        const isSeeking = Math.abs(currentTime - lastTime) > 1.0;

        if (!isSeeking && currentSentenceIndex !== -1) {
          const currentSentence = transcript[currentSentenceIndex];
          if (currentSentence) {
            const STOP_OFFSET = 0.15;
            const targetEnd = currentSentence.end - STOP_OFFSET;
            if (lastTime < targetEnd && currentTime >= targetEnd) {
              if (autoPause) {
                playerRef.current.pauseVideo();
                return;
              }
            }
          }
        }

        let activeIndex = -1;
        for (let i = transcript.length - 1; i >= 0; i--) {
          if (currentTime >= transcript[i].start) {
            activeIndex = i;
            break;
          }
        }

        if (activeIndex !== -1 && activeIndex !== currentSentenceIndex) {
          if (!autoPause || state === 1) {
            setCurrentSentenceIndex(activeIndex);
          }
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [currentSentenceIndex, transcript, autoPause]);

  useEffect(() => {
    const saved = localStorage.getItem('shadowing_urls');
    if (saved) setSavedUrls(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (videoId && currentSentenceIndex >= 0) {
      localStorage.setItem(`shadowing_progress_${videoId}`, currentSentenceIndex);
      if (transcript[currentSentenceIndex]) {
        localStorage.setItem(`shadowing_time_${videoId}`, transcript[currentSentenceIndex].start);
      }
      if (playerRef.current && typeof playerRef.current.getDuration === 'function') {
        const dur = playerRef.current.getDuration();
        if (dur > 0) localStorage.setItem(`shadowing_duration_${videoId}`, dur);
      }
    }
  }, [videoId, currentSentenceIndex, transcript]);

  useEffect(() => {
    if (playerReady && playerRef.current && transcript.length > 0 && videoId && initialSeekDoneId !== videoId) {
      const savedProgress = localStorage.getItem(`shadowing_progress_${videoId}`);
      if (savedProgress !== null && !isNaN(parseInt(savedProgress))) {
         const idx = parseInt(savedProgress);
         if (transcript[idx]) {
           playerRef.current.seekTo(transcript[idx].start);
         }
      }
      setInitialSeekDoneId(videoId);
    }
  }, [playerReady, transcript, videoId, initialSeekDoneId]);

  const handleSaveUrl = () => {
    if (!urlInput) return;
    if (savedUrls.some(item => item.url === urlInput)) return;
    
    const vId = extractVideoId(urlInput);
    if (!vId) return;

    const newEntry = { url: urlInput, id: Date.now(), videoId: vId };
    const updated = [newEntry, ...savedUrls];
    setSavedUrls(updated);
    localStorage.setItem('shadowing_urls', JSON.stringify(updated));
  };

  const handleMarkStudied = (quality = 4) => {
    if (!urlInput) return;
    const vId = extractVideoId(urlInput);
    if (!vId) return;

    setSavedUrls(prev => {
      const existingIdx = prev.findIndex(item => item.videoId === vId);
      let updated = [...prev];
      
      let item;
      if (existingIdx >= 0) {
        item = { ...prev[existingIdx] };
        updated.splice(existingIdx, 1);
      } else {
        item = { url: urlInput, id: Date.now(), videoId: vId, interval: 0, repetition: 0, easeFactor: 2.5 };
      }

      let { interval = 0, repetition = 0, easeFactor = 2.5 } = item;
      
      if (quality >= 3) {
        if (repetition === 0) interval = 1;
        else if (repetition === 1) interval = 6;
        else interval = Math.round(interval * easeFactor);
        repetition += 1;
      } else {
        repetition = 0;
        interval = 1;
      }
      
      easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      if (easeFactor < 1.3) easeFactor = 1.3;
      
      const now = Date.now();
      item = {
        ...item,
        interval,
        repetition,
        easeFactor,
        lastStudied: now,
        nextReview: now + interval * 24 * 60 * 60 * 1000
      };

      updated = [item, ...updated];
      localStorage.setItem('shadowing_urls', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteUrl = (idToDelete, e) => {
    e.stopPropagation();
    const updated = savedUrls.filter(item => item.id !== idToDelete);
    setSavedUrls(updated);
    localStorage.setItem('shadowing_urls', JSON.stringify(updated));
  };

  useEffect(() => {
    if (currentSentenceIndex !== -1 && sentenceRefs.current[currentSentenceIndex]) {
      sentenceRefs.current[currentSentenceIndex].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
    
    if (currentSentenceIndex !== -1 && transcript[currentSentenceIndex]) {
      const text = transcript[currentSentenceIndex].text;
      fetch('/api/phonetics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      .then(res => res.json())
      .then(data => {
        if (data.words) setCurrentPhonetics(data.words);
      })
      .catch(console.error);
    } else {
      setCurrentPhonetics([]);
    }
  }, [currentSentenceIndex, transcript]);

  const onReady = (event) => {
    playerRef.current = event.target;
    setPlayerReady(true);
  };

  const onStateChange = (event) => {
    setIsPlaying(event.data === 1);
  };

  const handleSentenceClick = (index) => {
    if (playerRef.current) {
      setCurrentSentenceIndex(index);
      playerRef.current.seekTo(transcript[index].start);
      playerRef.current.playVideo();
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return "00:00.00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  const togglePlay = () => {
    if (!playerRef.current) return;
    const state = playerRef.current.getPlayerState();
    if (state === 1) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const replaySentence = () => {
    if (playerRef.current && currentSentenceIndex !== -1) {
      playerRef.current.seekTo(transcript[currentSentenceIndex].start);
      playerRef.current.playVideo();
    }
  };

  const nextSentence = () => {
    if (playerRef.current && currentSentenceIndex < transcript.length - 1) {
      const nextIndex = currentSentenceIndex + 1;
      playerRef.current.seekTo(transcript[nextIndex].start);
      playerRef.current.playVideo();
      setCurrentSentenceIndex(nextIndex);
    }
  };

  const prevSentence = () => {
    if (playerRef.current && currentSentenceIndex > 0) {
      const prevIndex = currentSentenceIndex - 1;
      playerRef.current.seekTo(transcript[prevIndex].start);
      playerRef.current.playVideo();
      setCurrentSentenceIndex(prevIndex);
    }
  };

  const progressPercentage = transcript.length > 0 && currentSentenceIndex >= 0 
    ? Math.round(((currentSentenceIndex + 1) / transcript.length) * 100) 
    : 0;

  const dueReviews = savedUrls.filter(item => item.nextReview && item.nextReview <= Date.now()).length;

  const workspaceProps = {
    urlInput,
    setUrlInput,
    handleFetch,
    handleSaveUrl,
    loading,
    error,
    videoId,
    lastTimeRef,
    playerRef,
    onReady,
    onStateChange,
    currentPhonetics,
    prevSentence,
    togglePlay,
    isPlaying,
    nextSentence,
    replaySentence,
    handleMarkStudied,
    autoPause,
    setAutoPause,
    transcriptListRef,
    transcript,
    sentenceRefs,
    currentSentenceIndex,
    handleSentenceClick,
    progressPercentage
  };

  return (
    <div className={styles.appWrapper}>
      <div className="noise-overlay" aria-hidden="true"></div>
      
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        dueReviews={dueReviews} 
      />

      <div className={styles.mainWrapper}>
        {currentTab === 'WORKSPACE' ? (
          <Workspace {...workspaceProps} />
        ) : currentTab === 'DISCOVER' ? (
          <Discover onLoadSequence={(url) => {
            setUrlInput(url);
            setCurrentTab('WORKSPACE');
            handleFetch(url);
          }} />
        ) : (
          <Archives 
            savedUrls={savedUrls} 
            handleDeleteUrl={handleDeleteUrl}
            onLoadSequence={(url) => {
              setUrlInput(url);
              setCurrentTab('WORKSPACE');
              handleFetch(url);
            }}
          />
        )}
      </div>
    </div>
  );
}
