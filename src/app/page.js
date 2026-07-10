"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import Discover from "@/components/Discover";
import Archives from "@/components/Archives";
import Workspace from "@/components/Workspace/Workspace";
import { extractVideoId } from "@/lib/utils";
import styles from "./page.module.css";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, collection, onSnapshot, deleteDoc, updateDoc } from "firebase/firestore";

export default function Home() {
  const { user } = useAuth();
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
        setTranscript(data.transcript);
        if (data.transcript.length > 0) {
          if (user) {
            const docRef = doc(db, "users", user.uid, "archives", id);
            getDoc(docRef).then(docSnap => {
              if (docSnap.exists() && docSnap.data().progressIndex !== undefined) {
                setCurrentSentenceIndex(docSnap.data().progressIndex);
              } else {
                setCurrentSentenceIndex(0);
              }
            }).catch(() => setCurrentSentenceIndex(0));
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
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, "users", user.uid, "archives"), (snapshot) => {
      const urls = [];
      snapshot.forEach(docSnap => {
        urls.push({ id: docSnap.id, videoId: docSnap.id, ...docSnap.data() });
      });
      urls.sort((a, b) => (b.lastStudied || 0) - (a.lastStudied || 0));
      setSavedUrls(urls);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (videoId && currentSentenceIndex >= 0 && user) {
      const time = transcript[currentSentenceIndex] ? transcript[currentSentenceIndex].start : 0;
      let duration = 0;
      if (playerRef.current && typeof playerRef.current.getDuration === 'function') {
        duration = playerRef.current.getDuration() || 0;
      }
      
      const docRef = doc(db, "users", user.uid, "archives", videoId);
      setDoc(docRef, {
        progressIndex: currentSentenceIndex,
        progressTime: time,
        duration: duration
      }, { merge: true }).catch(err => console.error("Auto-save failed", err));
    }
  }, [videoId, currentSentenceIndex, transcript, user]);

  useEffect(() => {
    if (playerReady && playerRef.current && transcript.length > 0 && videoId && initialSeekDoneId !== videoId) {
      if (user) {
        getDoc(doc(db, "users", user.uid, "archives", videoId)).then(docSnap => {
          if (docSnap.exists() && docSnap.data().progressIndex !== undefined) {
             const idx = docSnap.data().progressIndex;
             if (transcript[idx]) {
               playerRef.current.seekTo(transcript[idx].start);
             }
          }
        });
      }
      setInitialSeekDoneId(videoId);
    }
  }, [playerReady, transcript, videoId, initialSeekDoneId]);

  const handleSaveUrl = async () => {
    if (!urlInput || !user) return;
    if (savedUrls.some(item => item.url === urlInput)) return;
    
    const vId = extractVideoId(urlInput);
    if (!vId) return;

    const docRef = doc(db, "users", user.uid, "archives", vId);
    await setDoc(docRef, { url: urlInput, videoId: vId, createdAt: Date.now() }, { merge: true });
  };

  const handleMarkStudied = async (quality = 4) => {
    if (!urlInput || !user) return;
    const vId = extractVideoId(urlInput);
    if (!vId) return;

    const existingItem = savedUrls.find(item => item.videoId === vId);
    let { interval = 0, repetition = 0, easeFactor = 2.5 } = existingItem || {};
    
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
    const docRef = doc(db, "users", user.uid, "archives", vId);
    await setDoc(docRef, {
      url: urlInput,
      videoId: vId,
      interval,
      repetition,
      easeFactor,
      lastStudied: now,
      nextReview: now + interval * 24 * 60 * 60 * 1000
    }, { merge: true });
  };

  const handleDeleteUrl = async (idToDelete, e) => {
    e.stopPropagation();
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "archives", idToDelete));
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
