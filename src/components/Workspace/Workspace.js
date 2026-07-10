"use client";
import styles from "@/app/page.module.css";
import PlayerPanel from "./PlayerPanel";
import TranscriptSequence from "./TranscriptSequence";

export default function Workspace(props) {
  return (
    <main className={styles.content}>
      <PlayerPanel {...props} />
      <TranscriptSequence {...props} />
    </main>
  );
}
