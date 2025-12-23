interface StudentLesson {
  student_id: string;
  student_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_completed: boolean;
  note?: string;
}

interface TrialLesson {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_completed: boolean;
}

interface ExportScheduleConfig {
  lessons: StudentLesson[];
  trialLessons: TrialLesson[];
  studentColors: Record<string, string>;
}

const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

// Schedule color tokens mapped to hex values for canvas rendering
// These match the HSL values in index.css schedule color tokens
const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  "schedule-color-1": { bg: "#ffe4e6", text: "#881337", border: "#fda4af" },  // Rose
  "schedule-color-2": { bg: "#dbeafe", text: "#1e3a8a", border: "#93c5fd" },  // Blue
  "schedule-color-3": { bg: "#fef3c7", text: "#78350f", border: "#fcd34d" },  // Amber
  "schedule-color-4": { bg: "#d1fae5", text: "#064e3b", border: "#6ee7b7" },  // Emerald
  "schedule-color-5": { bg: "#f3e8ff", text: "#581c87", border: "#d8b4fe" },  // Purple
  "schedule-color-6": { bg: "#fce7f3", text: "#831843", border: "#f9a8d4" },  // Pink
  "schedule-color-7": { bg: "#cffafe", text: "#164e63", border: "#67e8f9" },  // Cyan
  "schedule-color-8": { bg: "#ffedd5", text: "#7c2d12", border: "#fdba74" },  // Orange
  "schedule-color-9": { bg: "#ecfccb", text: "#365314", border: "#bef264" },  // Lime
  "schedule-color-10": { bg: "#e0e7ff", text: "#312e81", border: "#a5b4fc" }, // Indigo
};

// Default/fallback colors
const DEFAULT_COLOR = { bg: "#f3f4f6", text: "#111827", border: "#d1d5db" };

const formatTime = (time: string) => {
  try {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return time;
  }
};

const getAllTimeSlots = (lessons: StudentLesson[], trialLessons: TrialLesson[]) => {
  const times = new Set<string>();
  lessons.forEach(lesson => times.add(lesson.start_time));
  trialLessons.forEach(lesson => times.add(lesson.start_time));
  return Array.from(times).sort();
};

const getLessonForDayAndTime = (lessons: StudentLesson[], dayIndex: number, timeSlot: string) => {
  const dbDayOfWeek = dayIndex === 6 ? 0 : dayIndex + 1;
  return lessons.find(l => l.day_of_week === dbDayOfWeek && l.start_time === timeSlot);
};

const getTrialLessonForDayAndTime = (trialLessons: TrialLesson[], dayIndex: number, timeSlot: string) => {
  const dbDayOfWeek = dayIndex === 6 ? 0 : dayIndex + 1;
  return trialLessons.find(l => l.day_of_week === dbDayOfWeek && l.start_time === timeSlot);
};

export const exportScheduleAsPNG = async (config: ExportScheduleConfig) => {
  const { lessons, trialLessons, studentColors } = config;
  
  if (lessons.length === 0 && trialLessons.length === 0) {
    throw new Error("No lessons to export");
  }

  const timeSlots = getAllTimeSlots(lessons, trialLessons);
  
  // Canvas dimensions
  const cellWidth = 160;
  const cellHeight = 80;
  const headerHeight = 50;
  const timeColumnWidth = 100;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  
  if (!ctx) throw new Error("Canvas context not available");

  canvas.width = timeColumnWidth + (DAYS.length * cellWidth);
  canvas.height = headerHeight + (timeSlots.length * cellHeight);

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw header
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(0, 0, canvas.width, headerHeight);
  
  // Time column header
  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Saat", timeColumnWidth / 2, headerHeight / 2);

  // Day headers
  DAYS.forEach((day, index) => {
    const x = timeColumnWidth + (index * cellWidth);
    ctx.fillStyle = "#1e293b";
    ctx.fillText(day, x + cellWidth / 2, headerHeight / 2);
    
    // Vertical lines
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  });

  // Time slots and lessons
  timeSlots.forEach((timeSlot, rowIndex) => {
    const y = headerHeight + (rowIndex * cellHeight);
    
    // Horizontal line
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();

    // Time column background
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, y, timeColumnWidth, cellHeight);

    // Time text
    ctx.fillStyle = "#1e293b";
    ctx.font = "14px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(formatTime(timeSlot), timeColumnWidth / 2, y + cellHeight / 2);

    // Draw lessons for each day
    DAYS.forEach((_, dayIndex) => {
      const x = timeColumnWidth + (dayIndex * cellWidth);
      const lesson = getLessonForDayAndTime(lessons, dayIndex, timeSlot);
      const trialLesson = getTrialLessonForDayAndTime(trialLessons, dayIndex, timeSlot);

      if (lesson) {
        const colorClass = studentColors[lesson.student_id] || "schedule-color-1";
        const colors = COLOR_MAP[colorClass] || DEFAULT_COLOR;
        
        // Apply opacity if completed
        const opacity = lesson.is_completed ? 0.4 : 1.0;
        
        // Background with border
        ctx.fillStyle = colors.bg;
        ctx.globalAlpha = opacity;
        ctx.fillRect(x + 4, y + 4, cellWidth - 8, cellHeight - 8);
        
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 4, y + 4, cellWidth - 8, cellHeight - 8);
        
        // Student name with note
        const displayName = lesson.note ? `${lesson.student_name} - ${lesson.note}` : lesson.student_name;
        ctx.fillStyle = colors.text;
        ctx.font = "bold 13px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
          displayName.length > 15 ? displayName.substring(0, 13) + "..." : displayName,
          x + cellWidth / 2,
          y + cellHeight / 2 - 10
        );
        
        // Time
        ctx.font = "11px monospace";
        ctx.fillText(
          `${formatTime(lesson.start_time)} - ${formatTime(lesson.end_time)}`,
          x + cellWidth / 2,
          y + cellHeight / 2 + 10
        );
        
        ctx.globalAlpha = 1.0;
      } else if (trialLesson) {
        const opacity = trialLesson.is_completed ? 0.5 : 1.0;
        
        // Trial lesson background
        ctx.fillStyle = trialLesson.is_completed ? "#fecaca" : "#fca5a5";
        ctx.globalAlpha = opacity;
        ctx.fillRect(x + 4, y + 4, cellWidth - 8, cellHeight - 8);
        
        ctx.strokeStyle = trialLesson.is_completed ? "#fca5a5" : "#f87171";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 4, y + 4, cellWidth - 8, cellHeight - 8);
        
        // Trial lesson text
        ctx.fillStyle = "#7f1d1d";
        ctx.font = "bold 13px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Deneme Dersi", x + cellWidth / 2, y + cellHeight / 2 - 10);
        
        ctx.font = "11px monospace";
        ctx.fillText(
          `${formatTime(trialLesson.start_time)} - ${formatTime(trialLesson.end_time)}`,
          x + cellWidth / 2,
          y + cellHeight / 2 + 10
        );
        
        ctx.globalAlpha = 1.0;
      }
    });
  });

  // Final border
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

  // Convert to blob and download
  return new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to create image"));
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toLocaleDateString("tr-TR").replace(/\./g, "-");
      link.download = `ders-programi-${date}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      resolve();
    }, "image/png");
  });
};
