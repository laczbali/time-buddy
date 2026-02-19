'use client';

import { useEffect, useState } from "react";
import { Trash2, Play, Pause, Pencil } from "lucide-react";
import styles from "./TaskItem.module.css";

export type TaskItemProps = {
  taskName: string;
  finishedDurationSeconds: number | null;
  activeStartDate: Date | null;
  onStartClick: () => void;
  onClearClick: () => void;
  onRename: (oldName: string, newName: string) => void;
};

export function TaskItem({ taskName, finishedDurationSeconds, activeStartDate, onStartClick, onClearClick, onRename }: TaskItemProps) {
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

  return (
    <div className={`${styles.item} ${activeStartDate ? styles.activeItem : ""}`}>
      <div className={styles.leftSide} onClick={onStartClick}>
        <div className={styles.playPause}>{activeStartDate ? <Pause size={16} /> : <Play size={16} />}</div>
        <div className={styles.title}>{taskName}</div>
      </div>
      <div className={styles.rightSide}>
        <div className={styles.rename} onClick={() => onRename(taskName, prompt("Enter new task name", taskName) ?? taskName)}><Pencil size={16} /></div>
        <div className={styles.clear} onClick={onClearClick}><Trash2 size={16} /></div>
        <div className={styles.separator}>|</div>
        <div className={styles.duration}>{durationDisplay}</div>
      </div>
    </div>
  );
}