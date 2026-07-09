"use client";

import { useState, useEffect, useRef } from "react";
import YouTube from "react-youtube";
import { Play, Pause, SkipBack, SkipForward, Repeat, Languages, LayoutTemplate, Library, Compass, X, RotateCcw } from "lucide-react";
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

  const handleSearch = async (queryToSearch = searchQuery) => {
    if (!queryToSearch) return;
    setIsSearching(true);
    setSearchError("");
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(queryToSearch)}`);
      const data = await res.json();
      if (data.error) setSearchError(data.error);
      else setSearchResults(data.videos || []);
    } catch (err) {
      setSearchError("Failed to fetch search results.");
    } finally {
      setIsSearching(false);
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
          const STOP_OFFSET = 0.15;
          const targetEnd = currentSentence.end - STOP_OFFSET;
          if (lastTime <= targetEnd && currentTime >= targetEnd) {
            if (autoPause) {
              playerRef.current.pauseVideo();
              return;
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
    }
  }, [videoId, currentSentenceIndex]);

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

  return (
    <div className={styles.appWrapper}>
      <div className="noise-overlay" aria-hidden="true"></div>
      
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.operatorTitle}>TasteSkill</div>
          <div className={styles.operatorSub}>SHADOWING WORKSPACE</div>
        </div>
        <div className={styles.sidebarMenu}>
          <div 
            className={`${styles.menuItem} ${currentTab === 'WORKSPACE' ? styles.active : ''}`}
            onClick={() => setCurrentTab('WORKSPACE')}
          >
            <LayoutTemplate size={18} /> Workspace
          </div>
          <div 
            className={`${styles.menuItem} ${currentTab === 'DISCOVER' ? styles.active : ''}`}
            onClick={() => setCurrentTab('DISCOVER')}
          >
            <Compass size={18} /> Discover
          </div>
          <div 
            className={`${styles.menuItem} ${currentTab === 'ARCHIVES' ? styles.active : ''}`}
            onClick={() => setCurrentTab('ARCHIVES')}
          >
            <Library size={18} /> Archives
            {dueReviews > 0 && (
              <span style={{ marginLeft: 'auto', background: 'var(--accent)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                {dueReviews} Due
              </span>
            )}
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
                  placeholder="Paste YouTube URL here..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                />
                <button 
                  className={styles.urlBtn} 
                  onClick={handleFetch}
                  disabled={loading || !urlInput}
                >
                  {loading ? "Loading..." : "Load"}
                </button>
                <button 
                  className={`${styles.urlBtn} ${styles.secondary}`} 
                  onClick={handleSaveUrl}
                  disabled={!urlInput}
                  style={{ marginLeft: '0.5rem' }}
                >
                  Save
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
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      No Signal
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.phoneticsBox}>
                {currentPhonetics.length > 0 ? currentPhonetics.map((wordObj, i) => (
                  <div key={i} className={styles.phoneticWord}>
                    <div className={styles.pWord}>{wordObj.original}</div>
                    <div className={styles.pIpa}>{wordObj.ipa || '-'}</div>
                  </div>
                )) : (
                  <div style={{ opacity: 0.5, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>Awaiting Sync</div>
                )}
              </div>

              <div className={styles.playbackControls}>
                <button className={styles.playBtn} onClick={prevSentence}><SkipBack size={18} /></button>
                <button className={`${styles.playBtn} ${styles.primary}`} onClick={togglePlay}>
                  {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </button>
                <button className={styles.playBtn} onClick={nextSentence}><SkipForward size={18} /></button>
                <button className={styles.playBtn} onClick={replaySentence} style={{ marginLeft: '0.5rem' }} title="Replay Sentence (R)"><RotateCcw size={18} /></button>
                
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
                <div className={styles.rightTitle}>Transcript Sequence</div>
                <div className={styles.rightActions}>
                  <button 
                    className={styles.actionBtn}
                    onClick={() => handleMarkStudied(4)}
                    style={{ background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)' }}
                    title="Mark this video as studied today to update Spaced Repetition"
                  >
                    Mark Studied
                  </button>
                  <button 
                    className={styles.actionBtn}
                    onClick={() => setAutoPause(!autoPause)}
                  >
                    Auto-Pause: {autoPause ? 'On' : 'Off'}
                  </button>
                  <button className={`${styles.actionBtn} ${styles.dark}`}>Shadow Mode</button>
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
                  <div style={{ padding: '3rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', textAlign: 'center', opacity: 0.6 }}>
                    No sequence loaded.
                  </div>
                )}
              </div>

              <div className={styles.rightFooter}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div className={styles.statBlock}>
                    <span className={styles.statLabel}>Session Progress</span>
                    <span className={styles.statValue}>
                      {currentSentenceIndex >= 0 ? currentSentenceIndex + 1 : 0} <span style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>/ {transcript.length} lines</span>
                    </span>
                  </div>
                  <div className={styles.statBlock} style={{ textAlign: 'right' }}>
                    <span className={styles.statLabel}>Completion</span>
                    <span className={styles.statValue} style={{ color: 'var(--accent)' }}>{progressPercentage}%</span>
                  </div>
                </div>
                <div className={styles.progressBar}>
                   <div className={styles.progressFill} style={{ width: `${progressPercentage}%` }}></div>
                </div>
              </div>
            </div>
          </main>
        ) : currentTab === 'DISCOVER' ? (
          <main className={styles.discoverMain}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              <h2 className={styles.discoverTitle}>Discover Source Material</h2>
              <div className={styles.searchBar}>
                <input 
                  type="text" 
                  className={styles.searchInput}
                  placeholder="Search for channels or topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button className={styles.searchBtn} onClick={() => handleSearch()} disabled={isSearching}>
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>

              <div className={styles.recommendedSection}>
                <h3 className={styles.sectionSubtitle}>Select level to find materials</h3>
                
                {RECOMMENDED_BY_LEVEL.map((group, groupIdx) => (
                  <div key={groupIdx} className={styles.levelSection}>
                    <div className={styles.levelHeader}>
                      <span className={styles.levelTitle}>{group.level}</span>
                      <span className={styles.levelBadge}>{group.badge}</span>
                    </div>
                    <div className={styles.recommendedGrid}>
                      {group.channels.map((ch, idx) => (
                        <div key={idx} className={styles.channelCard} onClick={() => {
                          setSearchQuery(ch.url);
                          handleSearch(ch.url);
                        }}>
                          <div className={styles.channelName}>{ch.name}</div>
                          <div className={styles.channelDesc}>{ch.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {searchError && <div className={styles.error}>{searchError}</div>}

              <div className={styles.resultsGrid}>
                {searchResults.map((video, idx) => (
                  <div key={idx} className={styles.resultCard}>
                    <img src={video.thumbnail} alt={video.title} className={styles.resultThumb} />
                    <div className={styles.resultInfo}>
                      <div className={styles.resultTitle}>{video.title}</div>
                      <div className={styles.resultMeta}>
                        <span>{video.author.name}</span>
                        <span>{video.timestamp}</span>
                      </div>
                      <button className={styles.loadBtn} onClick={() => {
                        setUrlInput(video.url);
                        setCurrentTab('WORKSPACE');
                        handleFetch(video.url);
                      }}>
                        Load Sequence
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        ) : (
          <main className={styles.discoverMain}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <h2 className={styles.discoverTitle}>Saved Archives</h2>
              
              <div className={styles.archiveGrid}>
                {savedUrls.map(item => {
                  const vId = item.videoId || extractVideoId(item.url);
                  return (
                    <div 
                      key={item.id} 
                      className={styles.archiveCard}
                      onClick={() => {
                        setUrlInput(item.url);
                        setCurrentTab('WORKSPACE');
                        handleFetch(item.url);
                      }}
                    >
                      <button 
                        className={styles.deleteBtn}
                        onClick={(e) => handleDeleteUrl(item.id, e)}
                        title="Delete Archive"
                      >
                        <X size={16} />
                      </button>
                      <img 
                        src={`https://img.youtube.com/vi/${vId}/hqdefault.jpg`} 
                        alt="Thumbnail" 
                        className={styles.archiveThumb}
                      />
                      <div className={styles.archiveInfo}>
                        <div className={styles.archiveUrl}>
                          {item.url}
                        </div>
                        <div className={styles.archiveMeta}>
                          <span>{item.lastStudied ? `Last Studied: ${new Date(item.lastStudied).toLocaleDateString()}` : 'Not studied yet'}</span>
                          {item.nextReview && (
                            <span className={item.nextReview <= Date.now() ? styles.archiveDue : ''}>
                              Review: {new Date(item.nextReview).toLocaleDateString()} {item.nextReview <= Date.now() && '(Due)'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {savedUrls.length === 0 && (
                <div style={{ fontFamily: 'var(--font-mono)', opacity: 0.5, marginTop: '2rem' }}>No archives found.</div>
              )}
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
