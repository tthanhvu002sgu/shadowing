"use client";

import { useState, useEffect, useRef } from "react";
import YouTube from "react-youtube";
import { Play, Pause, SkipBack, SkipForward, Repeat, Languages, Settings, User, LogOut, HelpCircle, PlusSquare, LayoutTemplate, Library, LineChart } from "lucide-react";
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

  const playerRef = useRef(null);
  const transcriptListRef = useRef(null);
  const sentenceRefs = useRef([]);
  const lastTimeRef = useRef(0);

  const extractVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const handleFetch = async (overrideUrl) => {
    const targetUrl = typeof overrideUrl === 'string' ? overrideUrl : urlInput;
    setError("");
    const id = extractVideoId(targetUrl);
    if (!id) {
      setError("Invalid YouTube URL. Please try again.");
      return;
    }
    setVideoId(id);
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
        // Default to the first sentence so auto-pause tracking works immediately
        if (data.transcript.length > 0) {
          setCurrentSentenceIndex(0);
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

        // 1. Auto-pause logic
        if (!isSeeking && currentSentenceIndex !== -1) {
          const currentSentence = transcript[currentSentenceIndex];
          if (lastTime <= currentSentence.end && currentTime >= currentSentence.end) {
            if (autoPause) {
              playerRef.current.pauseVideo();
              // Do NOT automatically switch to the next sentence.
              // Let the user read the current one. When they hit play, the normal sync will catch the next sentence.
              return;
            }
          }
        }

        // 2. Normal sync: Always find the latest sentence that has started
        let activeIndex = -1;
        for (let i = transcript.length - 1; i >= 0; i--) {
          if (currentTime >= transcript[i].start) {
            activeIndex = i;
            break;
          }
        }

        // Only update if we found a valid index and it's different.
        // Don't revert to an older sentence if autoPause just pushed us forward.
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
    
    // Fetch phonetics for current sentence
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

  return (
    <div className={styles.appWrapper}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.operatorTitle}>OPERATOR_01</div>
          <div className={styles.operatorSub}>LVL_42_STUDENT</div>
        </div>
        <div className={styles.sidebarMenu}>
          <div 
            className={`${styles.menuItem} ${currentTab === 'WORKSPACE' ? styles.active : ''}`}
            onClick={() => setCurrentTab('WORKSPACE')}
          >
            <LayoutTemplate size={16} /> WORKSPACE
          </div>
          <div 
            className={`${styles.menuItem} ${currentTab === 'ARCHIVES' ? styles.active : ''}`}
            onClick={() => setCurrentTab('ARCHIVES')}
          >
            <Library size={16} /> SAVED_ARCHIVES
          </div>
        </div>
      </aside>

      <div className={styles.mainWrapper}>
        {currentTab === 'WORKSPACE' ? (
          <main className={styles.content}>
          <div className={styles.leftPanel}>
           

            <div className={styles.urlInputWrapper}>
              <input
                type="text"
                className={styles.urlInput}
                placeholder="INPUT YOUTUBE URL SEQUENCE..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFetch()}
              />
              <button 
                className={styles.urlBtn} 
                onClick={handleFetch}
                disabled={loading || !urlInput}
              >
                {loading ? "LOAD..." : "INIT"}
              </button>
              <button 
                className={`${styles.urlBtn} ${styles.secondary}`} 
                onClick={handleSaveUrl}
                disabled={!urlInput}
              >
                SAVE
              </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.videoWrapper}>
              <div className={styles.videoHeader}>
                <span>REC [•] {formatTime(lastTimeRef.current)}</span>
              </div>
              <div className={styles.playerContainer}>
                {videoId ? (
                  <YouTube
                    videoId={videoId}
                    onReady={onReady}
                    onStateChange={onStateChange}
                    opts={{
                      width: "100%",
                      height: "100%",
                      playerVars: {
                        autoplay: 1,
                        modestbranding: 1,
                        rel: 0,
                      },
                    }}
                  />
                ) : (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontFamily: 'monospace' }}>
                    NO_SIGNAL
                  </div>
                )}
              </div>
              <div className={styles.videoFooter}>
                AUDIO_CH_1L_2R
              </div>
            </div>

            <div className={styles.phoneticsBox}>
              {currentPhonetics.length > 0 ? currentPhonetics.map((wordObj, i) => (
                <div key={i} className={styles.phoneticWord}>
                  <div className={styles.pWord}>{wordObj.original}</div>
                  <div className={styles.pIpa}>{wordObj.ipa || '-'}</div>
                </div>
              )) : (
                <div style={{ opacity: 0.5, fontFamily: 'var(--font-mono)' }}>[ AWAITING_VOCAL_SYNC ]</div>
              )}
            </div>

            <div className={styles.playbackControls}>
              <button className={styles.playBtn} onClick={prevSentence}><SkipBack size={14} /></button>
              <button className={`${styles.playBtn} ${styles.primary}`} onClick={togglePlay}>
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button className={styles.playBtn} onClick={nextSentence}><SkipForward size={14} /></button>
              
              <div className={styles.volumeBar} style={{ marginLeft: '1rem' }}>
                <div className={styles.volumeFill}></div>
              </div>
              
              <div className={styles.timeDisplay}>
                {formatTime(lastTimeRef.current)} / {playerRef.current?.getDuration ? formatTime(playerRef.current.getDuration()) : "00:00"}
              </div>
            </div>
          </div>

          <div className={styles.rightPanel}>
            <div className={styles.rightHeader}>
              <div className={styles.rightTitle}>TRANSCRIBED_LINES_SEQ</div>
              <div className={styles.rightActions}>
                <button 
                  className={styles.actionBtn}
                  onClick={() => setAutoPause(!autoPause)}
                  style={{ background: autoPause ? '#ddd' : 'transparent' }}
                >
                  AUTO_PAUSE: {autoPause ? 'ON' : 'OFF'}
                </button>
                <button className={`${styles.actionBtn} ${styles.dark}`}>SHADOW_MODE</button>
              </div>
            </div>

            <div className={styles.transcriptList} ref={transcriptListRef}>
              {transcript.length > 0 ? transcript.map((sentence, index) => (
                <div
                  key={index}
                  ref={(el) => (sentenceRefs.current[index] = el)}
                  className={`${styles.sentence} ${currentSentenceIndex === index ? styles.active : ""}`}
                  onClick={() => handleSentenceClick(index)}
                >
                  <div className={styles.sentenceMeta}>
                    <span>{formatTime(sentence.start)}</span>
                    <div className={styles.sentenceIcons}>
                      <Repeat size={14} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); handleSentenceClick(index); }}/>
                      <Languages size={14} />
                    </div>
                  </div>
                  <div className={styles.sentenceText}>"{sentence.text}"</div>
                </div>
              )) : (
                <div style={{ padding: '2rem', fontFamily: 'monospace', color: '#555', textAlign: 'center' }}>
                  AWAITING_INPUT_SEQUENCE...
                </div>
              )}
            </div>

            <div className={styles.rightFooter} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className={styles.statBlock}>
                  <span className={styles.statLabel}>SESSION_PROGRESS</span>
                  <span className={styles.statValue}>
                    {currentSentenceIndex >= 0 ? currentSentenceIndex + 1 : 0} / {transcript.length}_Lines
                  </span>
                </div>
                <div className={styles.statBlock} style={{ textAlign: 'right' }}>
                  <span className={styles.statLabel}>COMPLETION</span>
                  <span className={styles.statValue}>{progressPercentage}%</span>
                </div>
              </div>
              <div style={{ width: '100%', border: '1px solid black', height: '6px' }}>
                 <div style={{ width: `${progressPercentage}%`, background: 'black', height: '100%' }}></div>
              </div>
            </div>
          </div>
        </main>
        ) : (
          <main style={{ padding: '3rem', overflowY: 'auto', flex: 1 }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', marginBottom: '2rem', borderBottom: '3px solid black', paddingBottom: '1rem' }}>
              SAVED_ARCHIVES
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
              {savedUrls.map(item => {
                const vId = item.videoId || extractVideoId(item.url);
                return (
                  <div 
                    key={item.id} 
                    style={{ 
                      position: 'relative',
                      border: '3px solid black', 
                      cursor: 'pointer', 
                      background: 'var(--bg-dark)', 
                      color: 'white', 
                      padding: '0.5rem',
                      transition: 'transform 0.1s'
                    }}
                    onClick={() => {
                      setUrlInput(item.url);
                      setCurrentTab('WORKSPACE');
                      handleFetch(item.url);
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <button 
                      onClick={(e) => handleDeleteUrl(item.id, e)}
                      style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '-10px',
                        background: '#ff0000',
                        color: 'white',
                        border: '3px solid black',
                        width: '30px',
                        height: '30px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="DELETE ARCHIVE"
                    >
                      X
                    </button>
                    <img 
                      src={`https://img.youtube.com/vi/${vId}/hqdefault.jpg`} 
                      alt="Thumbnail" 
                      style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', border: '1px solid #333' }} 
                    />
                    <div style={{ 
                      marginTop: '1rem', 
                      fontFamily: 'var(--font-mono)', 
                      fontSize: '0.75rem', 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      padding: '0 0.5rem 0.5rem 0.5rem'
                    }}>
                      {item.url}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {savedUrls.length === 0 && (
              <div style={{ fontFamily: 'var(--font-mono)', opacity: 0.5 }}>[ NO_ARCHIVES_FOUND ]</div>
            )}
          </main>
        )}
      </div>
    </div>
  );
}
