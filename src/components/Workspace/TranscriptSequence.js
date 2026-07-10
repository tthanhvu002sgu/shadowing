"use client";
import { Repeat, Languages } from "lucide-react";
import styles from "@/app/page.module.css";
import { formatTime } from "@/lib/utils";

export default function TranscriptSequence({
  handleMarkStudied,
  autoPause,
  setAutoPause,
  transcriptListRef,
  transcript,
  sentenceRefs,
  currentSentenceIndex,
  handleSentenceClick,
  progressPercentage
}) {
  return (
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
  );
}
