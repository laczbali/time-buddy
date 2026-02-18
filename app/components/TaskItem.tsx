'use client';

import { useEffect, useState } from "react";
import styles from "./TaskItem.module.css";

export type TaskItemProps = {
  taskName: string;
  finishedDurationSeconds: number | null;
  activeStartDate: Date | null;
  onRowClick: () => void;
  onClearClick: () => void;
};

export function TaskItem({ taskName, finishedDurationSeconds, activeStartDate, onRowClick, onClearClick }: TaskItemProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeStartDate) {
      setElapsed(0);
      return;
    }
    setElapsed((Date.now() - activeStartDate.getTime()) / 1000);
    const id = setInterval(() => {
      setElapsed((Date.now() - activeStartDate.getTime()) / 1000);
    }, 1000);
    return () => clearInterval(id);
  }, [activeStartDate]);

  const totalSeconds = (finishedDurationSeconds ?? 0) + elapsed;
  let durationDisplay = "00:00:00";
  if (totalSeconds > 0 || activeStartDate !== null) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    durationDisplay = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  const playPauseSymbol = activeStartDate ? "⏸" : "▶";
  
  return (
    <div className={`${styles.item} ${activeStartDate ? styles.activeItem : ""}`} onClick={onRowClick}>
      <div className={styles.leftSide}>
        <div className={styles.playPause}>{playPauseSymbol}</div>
        <div className={styles.title}>{taskName}</div>
      </div>
      <div className={styles.rightSide}>
        <div className={styles.clear} onClick={(e) => { e.stopPropagation(); onClearClick(); }}>x</div>
        <div className={styles.separator}>|</div>
        <div className={styles.duration}>{durationDisplay}</div>
      </div>
    </div>
  );
}