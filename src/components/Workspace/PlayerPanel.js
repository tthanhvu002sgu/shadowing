"use client";
import YouTube from "react-youtube";
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from "lucide-react";
import styles from "@/app/page.module.css";
import { formatTime } from "@/lib/utils";

export default function PlayerPanel({
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
  replaySentence
}) {
  return (
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
          onClick={() => handleFetch()}
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
  );
}
