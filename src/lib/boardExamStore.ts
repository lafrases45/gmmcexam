import { create } from 'zustand';

export type EthnicGroup = "Janajati" | "Madeshi" | "Dalits" | "EDJ" | "Others";

export interface ExamMetadata {
  examYear: string;
  program: string;
  part: string;
  enrollmentYear: string;
  resultPublishedDate: string;
  examDate: string;
}

export interface Subject {
  code: string;
  name: string;
}

export interface Student {
  sn: number;
  name: string;
  rollNo: string;
  tuRegd: string;
  ethnic: EthnicGroup | "";
  gender: "Male" | "Female" | "Other" | "M" | "F" | "";
  major?: string;
  marks: Record<string, number | "AB">;
  total: number;
  percent: number;
  result: "Passed" | "Failed" | "Fail & Partly Absent";
}

export interface BoardExamState {
  sessionId: string | null;
  metadata: ExamMetadata | null;
  subjects: Subject[];
  students: Student[];
  setSession: (id: string, metadata: ExamMetadata, subjects: Subject[], students: Student[]) => void;
  setStudents: (students: Student[]) => void;
  updateStudent: (rollNo: string, updates: Partial<Student>) => void;
  clearSession: () => void;
}

export const useBoardExamStore = create<BoardExamState>((set) => ({
  sessionId: null,
  metadata: null,
  subjects: [],
  students: [],
  setSession: (id, metadata, subjects, students) => set({ sessionId: id, metadata, subjects, students }),
  setStudents: (students) => set({ students }),
  updateStudent: (rollNo, updates) =>
    set((state) => ({
      students: state.students.map((st) =>
        st.rollNo === rollNo ? { ...st, ...updates } : st
      ),
    })),
  clearSession: () => set({ sessionId: null, metadata: null, subjects: [], students: [] }),
}));
