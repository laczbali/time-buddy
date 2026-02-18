export class Task {
  name: string;
  startTime: Date | null;
  endTime: Date | null;

  constructor(name: string, startTime: Date | null = null, endTime: Date | null = null) {
    this.name = name;
    this.startTime = startTime;
    this.endTime = endTime;
  }

  getDurationSeconds(): number | null {
    if (this.startTime === null) return null;

    return ((this.endTime ?? new Date()).getTime() - this.startTime.getTime()) / 1000; // duration in seconds
  }

  isActive(): boolean {
    return this.startTime !== null && this.endTime === null;
  }
}
