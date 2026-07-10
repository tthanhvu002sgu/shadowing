"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import styles from "@/app/page.module.css";
import { Loader2 } from "lucide-react";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = () => signOut(auth);

  if (loading) {
    return (
      <div className={styles.appWrapper} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="noise-overlay" aria-hidden="true"></div>
        <Loader2 size={48} color="var(--accent)" style={{ zIndex: 1, animation: 'spin 1s linear infinite' }} />
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.appWrapper} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '2rem' }}>
        <div className="noise-overlay" aria-hidden="true"></div>
        <div style={{ textAlign: 'center', zIndex: 1 }}>
          <h1 className={styles.operatorTitle} style={{ fontSize: '3rem', marginBottom: '1rem' }}>TasteSkill</h1>
          <h2 className={styles.operatorSub} style={{ fontSize: '1rem', letterSpacing: '4px', marginBottom: '3rem' }}>SHADOWING WORKSPACE</h2>
          <button 
            onClick={login}
            style={{
              background: 'white', color: 'black', border: 'none', padding: '12px 24px', 
              fontSize: '1rem', fontFamily: 'var(--font-mono)', cursor: 'pointer', 
              display: 'flex', alignItems: 'center', gap: '12px', margin: '0 auto'
            }}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={24} height={24} />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
