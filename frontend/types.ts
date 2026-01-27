export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DEBTOR = 'DEBTOR' // Moroso
}

export interface BiometricLog {
  id: string;
  date: string;
  weight: number; // kg
  height: number; // cm
  bodyFat?: number; // %
  chest?: number;
  waist?: number;
  hips?: number;
}

export interface ExerciseDetail {
  id: string; // unique id inside the routine
  name: string;
  series: string;
  reps: string;
  weight: string;
  notes?: string;
}

export interface RoutineDay {
  dayName: string; // "Lunes", "Día 1", etc.
  exercises: ExerciseDetail[];
}

export interface Routine {
  id: string;
  name: string;
  goal: string; 
  days: RoutineDay[];
  assignedBy: string;
  createdAt: string;
}

export interface Diet {
  id: string;
  name: string;
  calories: number;
  description: string;
  generatedAt: string;
}

// --- CAMBIO AQUÍ: Las comidas ahora son string[] (Listas) ---
export interface NutritionData {
  breakfast: string[];     
  morningSnack: string[];  
  lunch: string[];         
  afternoonSnack: string[];
  dinner: string[];        
  notes?: string;        
  calories?: string;     
  lastUpdated: string;   
}

export interface PaymentLog {
  id: string;
  date: string;
  amount: number;
  concept: string; // "Cuota Mensual", "Matrícula", etc.
  method: string; // "Efectivo", "Tarjeta"
}

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  dni?: string;
  email: string;
  phone: string;
  joinDate: string;
  photoUrl?: string; // New field for profile picture
  status: UserStatus;
  biometrics: BiometricLog[];
  routines: Routine[];
  diets: Diet[];
  payments: PaymentLog[]; // New field for gym fee history
  lastAttendance?: string;
  phase?: 'volumen' | 'deficit' | 'recomposicion' | 'transicion';
  habitualSchedules?: Array<{
    day: string; // Ej: 'Lunes'
    start: string; // Ej: '08:00'
    end: string;   // Ej: '09:30'
  }>;
  nutritionPlan?: NutritionData;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: 'SUPPLEMENT' | 'DRINK' | 'MERCHANDISE' | 'OTHER';
  stock: number;
}

export interface Sale {
  id: string;
  memberId?: string; // Optional (can be walk-in)
  date: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    priceAtSale: number;
  }[];
  total: number;
}

export interface Reminder {
  id: string;
  text: string;
  date: string;
  priority: 'low' | 'medium' | 'high';
}

export interface Slot {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (24h format)
  duration: number; // minutes
  status: 'available' | 'reserved' | 'occupied';
  color?: string;
  target?: string;
}

export interface Reservation {
  id: string;
  slotId: string;
  memberId?: string;  // Link to member for proper assignment
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  notes?: string;
  attended?: boolean; // Track if member attended
  createdAt: string;
}

export interface ExerciseMaster {
  id: string;
  name: string;
  category: string; // Pecho, Espalda, Piernas, etc.
}

export interface AppState {
  currentUser: { name: string; role: 'ADMIN' | 'TRAINER' } | null;
  members: Member[];
  inventory: Product[];
  sales: Sale[];
  exercises: ExerciseMaster[];
  reminders: Reminder[];
  slots: Slot[];
  reservations: Reservation[];
}