import { LayoutTemplate, Compass, Library } from "lucide-react";
import styles from "@/app/page.module.css";

export default function Sidebar({ currentTab, setCurrentTab, dueReviews }) {
  return (
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
  );
}
