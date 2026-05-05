import { RoomConfig } from './constants/rooms';

export interface Student {
  roll: string;
  name: string;
  program: string; // e.g., 'BBS 1st Year'
  major?: string;  // e.g., 'English', 'Nepali'
}

export interface Bench {
  benchNo: number;
  side: 'Window' | 'Door';
  students: (Student | null)[]; // use null for empty spots
}

export interface SeatPlanConfig {
  roomName: string;
  windowBenches: number;
  doorBenches: number;
  studentsPerBench: number;
  examType: string;
}

/**
 * Extracts unique programs in the exact order they first appear in the students array.
 */
export function getOrderedPrograms(students: Student[]): string[] {
  const programs = new Set<string>();
  for (const s of students) {
    programs.add(s.program);
  }
  return Array.from(programs);
}

/**
 * Groups students by program, keeping their original roll number sorting.
 */
function groupStudentsByProgram(students: Student[]): Map<string, Student[]> {
  const map = new Map<string, Student[]>();
  for (const s of students) {
    if (!map.has(s.program)) map.set(s.program, []);
    map.get(s.program)!.push(s);
  }
  for (const [, arr] of map) {
    arr.sort((a, b) => a.roll.localeCompare(b.roll, undefined, { numeric: true }));
  }
  return map;
}

/**
 * Tries to find the next student from the target program. If target is empty,
 * falls back to the next available program in the ordered list.
 * If the only available students belong to disallowed programs, returns null.
 */
function getNextStudentForColumn(
  targetProgram: string,
  grouped: Map<string, Student[]>,
  orderedPrograms: string[],
  disallowedPrograms: Set<string> = new Set()
): Student | null {
  // Try target program first
  if (!disallowedPrograms.has(targetProgram)) {
    const targetQueue = grouped.get(targetProgram);
    if (targetQueue && targetQueue.length > 0) {
      return targetQueue.shift()!; // remove and return first element
    }
  }

  // Fallback: Find the first program in ordered sequence that has students
  for (const prog of orderedPrograms) {
    if (disallowedPrograms.has(prog)) continue;
    
    const fallbackQueue = grouped.get(prog);
    if (fallbackQueue && fallbackQueue.length > 0) {
      return fallbackQueue.shift()!;
    }
  }

  return null; // No students left anywhere, or only disallowed programs remain
}

/**
 * Fills benches column-by-column (Vertical Filling).
 * This ensures roll numbers stay sequential going down the column.
 */
function fillColumns(
  benches: Bench[], 
  grouped: Map<string, Student[]>, 
  orderedPrograms: string[],
  studentsPerBench: number,
  columnMapping: string[] | null // e.g., ['BBS', 'B.Ed', 'BHM'] for [Left, Middle, Right]
): void {
  // If no mapping provided, generate auto mapping based on order
  const autoMapping = [];
  if (studentsPerBench === 3) {
    autoMapping[0] = orderedPrograms[0] || ''; // Left Edge
    autoMapping[1] = orderedPrograms[1] || orderedPrograms[0] || ''; // Middle
    autoMapping[2] = orderedPrograms[0] || ''; // Right Edge
  } else {
    autoMapping[0] = orderedPrograms[0] || ''; // Left
    autoMapping[1] = orderedPrograms[1] || orderedPrograms[0] || ''; // Right
  }

  const effectiveMapping = columnMapping || autoMapping;

  // For vertical filling, we iterate through columns (sIdx), then through benches.
  // We fill Edges first (0, 2) and then Middle (1) so we can evaluate the edges.
  const columnsToFill = studentsPerBench === 3 ? [0, 2, 1] : [0, 1];

  for (const colIdx of columnsToFill) {
    const targetProgram = effectiveMapping[colIdx] || orderedPrograms[0];

    // For vertical filling, we go through Window side first, then Door side.
    for (const side of ['Window', 'Door']) {
      for (const bench of benches) {
        if (bench.side === side) {
          // If we already filled this seat somehow, skip
          if (bench.students[colIdx] !== null) continue;

          // Universal Rule: Count how many times each program already sits on this bench.
          // If a program already has 2 students on this bench, it CANNOT take a 3rd seat
          // regardless of which column (Left, Middle, or Right) is being filled.
          const programCountOnBench: Record<string, number> = {};
          for (const s of bench.students) {
            if (s && s.program) {
              programCountOnBench[s.program] = (programCountOnBench[s.program] || 0) + 1;
            }
          }
          const disallowedPrograms = new Set<string>(
            Object.entries(programCountOnBench)
              .filter(([, count]) => count >= 2)
              .map(([prog]) => prog)
          );

          const student = getNextStudentForColumn(targetProgram, grouped, orderedPrograms, disallowedPrograms);
          if (student) {
            bench.students[colIdx] = student;
          }
        }
      }
    }
  }
}

export function generateSeatPlan(
  students: Student[], 
  config: SeatPlanConfig, 
  columnMapping: string[] | null = null
): Bench[] {
  const maxBenches = Math.max(config.windowBenches, config.doorBenches);

  // Build bench list
  const benches: Bench[] = [];
  for (let i = 1; i <= maxBenches; i++) {
    if (i <= config.windowBenches)
      benches.push({ benchNo: i, side: 'Window', students: Array(config.studentsPerBench).fill(null) });
    if (i <= config.doorBenches)
      benches.push({ benchNo: i, side: 'Door', students: Array(config.studentsPerBench).fill(null) });
  }

  const orderedPrograms = getOrderedPrograms(students);
  const grouped = groupStudentsByProgram(students);

  fillColumns(benches, grouped, orderedPrograms, config.studentsPerBench, columnMapping);
  return benches;
}

export interface BulkAllocationResult {
  roomName: string;
  benches: Bench[];
  studentCount: number;
}

export function bulkAllocate(
  students: Student[],
  rooms: RoomConfig[],
  studentsPerBench: number,
  roomColumnMappings: Record<string, string[]> = {}
): { results: BulkAllocationResult[], remainingStudents: Student[] } {
  const orderedPrograms = getOrderedPrograms(students);
  const grouped = groupStudentsByProgram(students);

  const results: BulkAllocationResult[] = [];

  for (const room of rooms) {
    // Check if we have any students left to place
    let totalLeft = 0;
    for (const arr of grouped.values()) totalLeft += arr.length;
    if (totalLeft === 0) break;

    const startCount = totalLeft;
    const maxBenches = Math.max(room.windows, room.doors);
    const roomBenches: Bench[] = [];

    for (let i = 1; i <= maxBenches; i++) {
      if (i <= room.windows)
        roomBenches.push({ benchNo: i, side: 'Window', students: Array(studentsPerBench).fill(null) });
      if (i <= room.doors)
        roomBenches.push({ benchNo: i, side: 'Door', students: Array(studentsPerBench).fill(null) });
    }

    const mapping = roomColumnMappings[room.name] || null;
    fillColumns(roomBenches, grouped, orderedPrograms, studentsPerBench, mapping);

    // Calculate how many were placed in this room
    let currentLeft = 0;
    for (const arr of grouped.values()) currentLeft += arr.length;

    results.push({
      roomName: room.name,
      benches: roomBenches,
      studentCount: startCount - currentLeft
    });
  }

  // Collect remaining students to return
  const remainingStudents: Student[] = [];
  for (const prog of orderedPrograms) {
    const arr = grouped.get(prog);
    if (arr) remainingStudents.push(...arr);
  }

  return {
    results,
    remainingStudents
  };
}
