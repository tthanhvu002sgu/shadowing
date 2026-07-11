"use client";
import { useState, useEffect } from "react";
import styles from "@/app/page.module.css";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { X } from "lucide-react";

export default function Discover({ onLoadSequence }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const { user } = useAuth();
  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importedChannels, setImportedChannels] = useState([]);

  useEffect(() => {
    if (!user) {
      setImportedChannels([]);
      return;
    }
    const unsubscribe = onSnapshot(collection(db, "users", user.uid, "importedChannels"), (snapshot) => {
      const channels = [];
      snapshot.forEach(docSnap => {
        channels.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort by imported at descending
      channels.sort((a, b) => (b.importedAt || 0) - (a.importedAt || 0));
      setImportedChannels(channels);
    });
    return () => unsubscribe();
  }, [user]);

  const handleImport = async () => {
    if (!importUrl || !user) return;
    
    if (importedChannels.length >= 50) {
      setImportError("You can only import up to 50 channels.");
      return;
    }

    setIsImporting(true);
    setImportError("");
    try {
      const res = await fetch(`/api/channel?q=${encodeURIComponent(importUrl)}`);
      const data = await res.json();
      
      if (data.error) {
        setImportError(data.error);
      } else if (data.channel) {
        const channel = data.channel;
        const docRef = doc(db, "users", user.uid, "importedChannels", channel.id);
        await setDoc(docRef, {
          ...channel,
          importedAt: Date.now()
        });
        setImportUrl("");
      }
    } catch (err) {
      setImportError("Failed to import channel.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteChannel = async (id, e) => {
    e.stopPropagation();
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "importedChannels", id));
  };

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

  return (
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

        {user && (
          <div className={styles.recommendedSection} style={{ marginBottom: '2rem' }}>
            <h3 className={styles.sectionSubtitle}>Your Imported Channels</h3>
            
            <div className={styles.searchBar} style={{ marginBottom: '1.5rem', maxWidth: '600px' }}>
              <input 
                type="text" 
                className={styles.searchInput}
                placeholder="Paste YouTube channel URL or name to import..."
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleImport()}
              />
              <button className={styles.searchBtn} onClick={() => handleImport()} disabled={isImporting}>
                {isImporting ? 'Importing...' : 'Import'}
              </button>
            </div>
            
            {importError && <div className={styles.error} style={{ marginBottom: '1rem' }}>{importError}</div>}
            
            {importedChannels.length > 0 ? (
              <div className={styles.recommendedGrid}>
                {importedChannels.map((ch) => (
                  <div key={ch.id} className={styles.channelCard} onClick={() => {
                    setSearchQuery(ch.name || ch.url);
                    handleSearch(ch.name || ch.url);
                  }}>
                    <button 
                      className={styles.deleteBtn}
                      onClick={(e) => handleDeleteChannel(ch.id, e)}
                      title="Delete Channel"
                    >
                      <X size={16} />
                    </button>
                    <div className={styles.channelName}>{ch.name}</div>
                    <div className={styles.channelDesc}>{ch.about || ch.description}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontFamily: 'var(--font-mono)', opacity: 0.5, fontSize: '0.9rem' }}>
                You haven't imported any channels yet.
              </div>
            )}
          </div>
        )}

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
                <button className={styles.loadBtn} onClick={() => onLoadSequence(video.url)}>
                  Load Sequence
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
