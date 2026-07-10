"use client";
import { X } from "lucide-react";
import styles from "@/app/page.module.css";
import { extractVideoId, formatTime } from "@/lib/utils";

export default function Archives({ savedUrls, handleDeleteUrl, onLoadSequence }) {
  return (
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
                onClick={() => onLoadSequence(item.url)}
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
                  <div style={{ marginTop: '0.75rem' }}>
                    {(() => {
                      if (typeof window !== 'undefined') {
                        const t = localStorage.getItem(`shadowing_time_${vId}`);
                        const d = localStorage.getItem(`shadowing_duration_${vId}`);
                        if (t && d && !isNaN(parseFloat(d)) && parseFloat(d) > 0) {
                          const timeVal = parseFloat(t);
                          const durVal = parseFloat(d);
                          const perc = Math.min(100, Math.round((timeVal / durVal) * 100));
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                                <span>Stopped at: {formatTime(timeVal)}</span>
                                <span>{perc}%</span>
                              </div>
                              <div style={{ height: '4px', background: 'rgba(0,0,0,0.1)', borderRadius: '2px', width: '100%' }}>
                                <div style={{ height: '100%', background: 'var(--accent)', borderRadius: '2px', width: `${perc}%` }}></div>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                            Stopped at: {t ? formatTime(parseFloat(t)) : '00:00.00'}
                          </span>
                        );
                      }
                      return null;
                    })()}
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
  );
}
