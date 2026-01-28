export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DEBTOR = 'DEBTOR' 
}

export interface BiometricLog {
  id: string;
  date: string;
  weight: number;      
  height?: number;     // Estatura en cm para el cálculo del IMC
  chest?: number;      
  waist?: number;      
  abdomen?: number;    
  glutes?: number;     
  rightThigh?: number; // CD (Muslo Der)
  leftThigh?: number;  // Ci (Muslo Izq)
  rightCalf?: number;  // GD (Gemelo Der)
  leftCalf?: number;   // Gi (Gemelo Izq)
  rightArm?: number;   // BD (Brazo Der)
  leftArm?: number;    // Bi (Brazo Izq)
  neck?: number;       
  bodyFat?: number;    
}

export interface ExerciseDetail {
  id: string; 
  name: string;
  series: string;
  reps: string;
  weight: string;
  notes?: string;
}

export interface RoutineDay {
  dayName: string;
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
  concept: string; 
  method: string; 
}

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  dni?: string;
  email: string;
  phone: string;
  joinDate: string;
  photoUrl?: string; 
  status: UserStatus;
  biometrics: BiometricLog[];
  routines: Routine[];
  diets: Diet[];
  payments: PaymentLog[];
  lastAttendance?: string;
  phase?: 'volumen' | 'deficit' | 'recomposicion' | 'transicion';
  bioObjective?: string; 
  habitualSchedules?: Array<{
    day: string; 
    start: string;
    end: string;
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
  memberId?: string;
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
  date: string; 
  time: string; 
  duration: number; 
  status: 'available' | 'reserved' | 'occupied';
  color?: string;
  target?: string;
}

export interface Reservation {
  id: string;
  slotId: string;
  memberId?: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  notes?: string;
  attended?: boolean; 
  createdAt: string;
}

export interface ExerciseMaster {
  id: string;
  name: string;
  category: string; 
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