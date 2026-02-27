export interface LessonInstance {
  id: string;
  student_id: string;
  teacher_id: string;
  lesson_number: number;
  lesson_date: string;
  start_time: string;
  end_time: string;
  status: 'planned' | 'completed' | 'cancelled';
  original_date: string | null;
  original_start_time: string | null;
  original_end_time: string | null;
  rescheduled_count: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface ConflictInfo {
  studentName: string;
  date: string;
  timeRange: string;
  type: 'lesson' | 'trial';
  teacherId: string;
}
