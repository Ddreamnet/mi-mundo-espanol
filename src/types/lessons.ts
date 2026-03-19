// Shared types for lesson tracking, scheduling, and override flows

export interface StudentLesson {
  id: string;
  student_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  student_name: string;
  is_completed: boolean;
  note?: string;
}

export interface TrialLesson {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_completed: boolean;
}

export interface RowConfig {
  rows: number;
  buttonsPerRow: number;
}
