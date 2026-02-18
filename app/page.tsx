'use client';

import { useRef, useState } from "react";
import { TaskItem } from "./components/TaskItem";
import styles from "./page.module.css";

import { Task } from "./models/Task";

export default function Home() {

  const newTaskNameRef = useRef<HTMLInputElement>(null);

  const [tasks, setTasks] = useState<Task[]>(() => {
    // useState initializers run during SSR where localStorage is not available
    if (typeof window === 'undefined') return [];
    
    const tasksJson = localStorage.getItem("tasks");
    const rawTaskItems = tasksJson ? JSON.parse(tasksJson) : [];
    return rawTaskItems.map((item: any) => new Task(item.name, new Date(item.startTime), item.endTime ? new Date(item.endTime) : undefined));
  });

  const setActiveTask = (taskName: string, nextIsActive: boolean) => {
    setTasks((prevTasks) => {
      const currentActiveTask = prevTasks.find((x) => x.isActive());
      
      if(currentActiveTask?.name === taskName && nextIsActive) {
        // Task is already active, do nothing
        return prevTasks;
      }

      const nextTasks = prevTasks.map((task) => {
        if(currentActiveTask?.name === task.name && task.isActive()) {
          // End currently active task
          return new Task(task.name, task.startTime, new Date());
        }

        return task;
      });

      if(nextIsActive) {
        // Start new task
        nextTasks.push(new Task(taskName, new Date()));
      }

      // persist tasks to local storage
      localStorage.setItem("tasks", JSON.stringify(nextTasks));
      return nextTasks;
    });
  };

  const removeTask = (taskName: string) => {
    setTasks((prevTasks) => {
      const nextTasks = prevTasks.filter((task) => task.name !== taskName);
      localStorage.setItem("tasks", JSON.stringify(nextTasks));
      return nextTasks;
    });
  }

  const startButtonClick = () => {
    if(!newTaskNameRef.current || newTaskNameRef.current.value.trim() === "") {
      return;
    }

    setActiveTask(newTaskNameRef.current?.value ?? "", true);
    if(newTaskNameRef.current) {
      newTaskNameRef.current.value = "";
    }
  };

  // we group tasks by name
  // for each group, we calculate the duration of the finished tasks
  // the elapsed time of the active task is kept up to date inside the TaskItem component
  const tasksByName = Object.groupBy(tasks, (task) => task.name);
  const taskElements = Object.entries(tasksByName)
    .map(([name, tasks]) => {
      const activeTask = (tasks ?? []).find((task) => task.isActive());
      const finishedDuration = (tasks ?? []).reduce((sum, task) => {
        if (task.isActive()) return sum;
        const duration = task.getDurationSeconds();
        return sum + (duration !== null ? duration : 0);
      }, 0);
      const isActive = activeTask !== undefined;
      const activeStartDate = activeTask?.startTime ?? null;
      return { name, isActive, finishedDuration, activeStartDate };
    })
    .sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .map(({ name, isActive, finishedDuration, activeStartDate }) => (
      <TaskItem
        key={name}
        taskName={name}
        finishedDurationSeconds={finishedDuration}
        activeStartDate={activeStartDate}
        onRowClick={() => setActiveTask(name, !isActive)}
        onClearClick={() => removeTask(name)}
      />
    ));

  return (
    <main className={styles.home}>
      <h1>time-buddy</h1>

      <div className={styles.taskInputRow}>
        <input
          ref={newTaskNameRef}
          type="text"
          placeholder="Create a task"
          onKeyDown={(e) => e.key === "Enter" && startButtonClick()}
        />
        <button onClick={startButtonClick}>▶</button>
      </div>

      <div className={styles.taskList}>
        {taskElements}
      </div>

    </main>
  );
}
