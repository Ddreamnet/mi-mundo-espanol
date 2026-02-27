/**
 * Shared dashboard interfaces used across Admin, Teacher, and Student dashboards.
 * Eliminates interface duplication across multiple components.
 */

export interface StudentLesson {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  note?: string;
  isCompleted?: boolean;
}

export interface BaseStudent {
  id: string;
  student_id: string;
  lessons: StudentLesson[];
  about_text: string | null;
  profiles: {
    full_name: string;
    email: string;
  };
}

export interface AdminStudent extends BaseStudent {
  is_archived: boolean;
}

export interface Teacher {
  user_id: string;
  full_name: string;
  email: string;
  students: AdminStudent[];
}

export interface Topic {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  completed_at?: string | null;
  order_index: number;
  resources: Resource[];
  isGlobal?: boolean;
}

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  resource_url: string;
  order_index: number;
  is_completed?: boolean;
  completed_at?: string | null;
}
