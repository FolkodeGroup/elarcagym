import { Member, Product, Sale, UserStatus, AppState, ExerciseMaster, PaymentLog, Routine, Reminder, Slot, Reservation, NutritionData } from '../types';

// Helper function to generate fake DNI
const generateFakeDNI = (index: number): string => {
  const base = 20000000 + (index * 123456);
  return base.toString();
};

// Mock Data Initialization
const INITIAL_MEMBERS: Member[] = [
  {
    id: '1',
    firstName: 'Juan',
    lastName: 'Pérez',
    dni: generateFakeDNI(1),
    email: 'juan@example.com',
    phone: '555-0101',
    joinDate: '2023-01-15',
    status: UserStatus.ACTIVE,
    photoUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80',
    biometrics: [
      { id: 'b1', date: '2023-01-15', weight: 80, height: 175, bodyFat: 20 },
      { id: 'b2', date: '2023-06-15', weight: 75, height: 175, bodyFat: 15 },
    ],
    routines: [],
    diets: [],
    payments: [
        { id: 'pay1', date: '2025-12-05', amount: 3000, concept: 'Diciembre', method: 'Efectivo' },
        { id: 'pay2', date: '2025-11-05', amount: 3000, concept: 'Noviembre', method: 'Efectivo' }
    ],
    // --- CAMBIO AQUÍ: Formato de lista para ejemplo ---
    nutritionPlan: {
        breakfast: ['3 Huevos revueltos', '1 Tostada integral', 'Café negro'],
        morningSnack: ['1 Manzana verde', 'Puñado de almendras'],
        lunch: ['200g Pollo', '150g Arroz', 'Ensalada mixta'],
        afternoonSnack: ['Yogur proteico', '1 Banana'],
        dinner: ['Pescado blanco', 'Vegetales al vapor'],
        notes: 'Beber 3L de agua diarios. Creatina 5g post-entreno.',
        calories: '2200',
        lastUpdated: '2025-01-20'
    }
  },
  {
    id: '2',
    firstName: 'Maria',
    lastName: 'Gomez',
    dni: generateFakeDNI(2),
    email: 'maria@example.com',
    phone: '555-0202',
    joinDate: '2023-03-10',
    status: UserStatus.DEBTOR,
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80',
    biometrics: [
      { id: 'b3', date: '2023-03-10', weight: 65, height: 160 },
    ],
    routines: [],
    diets: [],
    payments: [
        { id: 'pay3', date: '2025-09-10', amount: 3000, concept: 'Septiembre', method: 'Tarjeta' }
    ]
  },
  {
    id: '3',
    firstName: 'Carlos',
    lastName: 'López',
    dni: generateFakeDNI(3),
    email: 'carlos@example.com',
    phone: '5491123456789',
    joinDate: '2023-06-20',
    status: UserStatus.DEBTOR,
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80',
    biometrics: [
      { id: 'b4', date: '2023-06-20', weight: 85, height: 178, bodyFat: 22 },
    ],
    routines: [],
    diets: [],
    payments: [
        { id: 'pay4', date: '2025-10-20', amount: 3500, concept: 'Octubre', method: 'Efectivo' },
        { id: 'pay5', date: '2025-09-20', amount: 3000, concept: 'Septiembre', method: 'Efectivo' }
    ]
  },
  {
    id: '4',
    firstName: 'Ana',
    lastName: 'Rodríguez',
    dni: generateFakeDNI(4),
    email: 'ana@example.com',
    phone: '5491234567890',
    joinDate: '2024-01-10',
    status: UserStatus.ACTIVE,
    photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80',
    biometrics: [],
    routines: [],
    diets: [],
    payments: [
        { id: 'pay6', date: '2025-12-10', amount: 3000, concept: 'Diciembre', method: 'Tarjeta' }
    ]
  },
  {
    id: '5',
    firstName: 'Diego',
    lastName: 'Martínez',
    dni: generateFakeDNI(5),
    email: 'diego@example.com',
    phone: '5491987654321',
    joinDate: '2024-02-15',
    status: UserStatus.ACTIVE,
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80',
    biometrics: [],
    routines: [],
    diets: [],
    payments: [
        { id: 'pay7', date: '2025-12-08', amount: 3000, concept: 'Diciembre', method: 'Tarjeta' },
        { id: 'pay8', date: '2025-11-08', amount: 3000, concept: 'Noviembre', method: 'Tarjeta' }
    ]
  },
  {
    id: '6',
    firstName: 'Sofia',
    lastName: 'García',
    dni: generateFakeDNI(6),
    email: 'sofia@example.com',
    phone: '5491122334455',
    joinDate: '2024-03-20',
    status: UserStatus.ACTIVE,
    photoUrl: 'https://images.unsplash.com/photo-1507876466876-fd7813c3e9b6?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80',
    biometrics: [],
    routines: [],
    diets: [],
    payments: [
        { id: 'pay9', date: '2025-11-01', amount: 3000, concept: 'Noviembre', method: 'Efectivo' }
    ]
  },
  {
    id: '7',
    firstName: 'Luis',
    lastName: 'Fernández',
    dni: generateFakeDNI(7),
    email: 'luis@example.com',
    phone: '5491556677889',
    joinDate: '2024-04-05',
    status: UserStatus.ACTIVE,
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80',
    biometrics: [],
    routines: [],
    diets: [],
    payments: [
        { id: 'pay10', date: '2025-11-03', amount: 3000, concept: 'Noviembre', method: 'Tarjeta' }
    ]
  },
  {
    id: '8',
    firstName: 'Miguel',
    lastName: 'Sánchez',
    dni: generateFakeDNI(8),
    email: 'miguel@example.com',
    phone: '5491998776655',
    joinDate: '2024-05-12',
    status: UserStatus.DEBTOR,
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80',
    biometrics: [],
    routines: [],
    diets: [],
    payments: [
        { id: 'pay11', date: '2025-09-25', amount: 3000, concept: 'Septiembre', method: 'Efectivo' }
    ]
  },
  {
    id: '9',
    firstName: 'Patricia',
    lastName: 'Torres',
    dni: generateFakeDNI(9),
    email: 'patricia@example.com',
    phone: '5491334455667',
    joinDate: '2024-06-08',
    status: UserStatus.DEBTOR,
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80',
    biometrics: [],
    routines: [],
    diets: [],
    payments: [
        { id: 'pay12', date: '2025-08-15', amount: 3000, concept: 'Agosto', method: 'Tarjeta' }
    ]
  },
  {
    id: '10',
    firstName: 'Roberto',
    lastName: 'Díaz',
    dni: generateFakeDNI(10),
    email: 'roberto@example.com',
    phone: '5491776655443',
    joinDate: '2023-08-30',
    status: UserStatus.INACTIVE,
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80',
    biometrics: [],
    routines: [],
    diets: [],
    payments: [
        { id: 'pay13', date: '2025-06-10', amount: 3000, concept: 'Junio', method: 'Efectivo' }
    ]
  },
  {
    id: '11',
    firstName: 'Gabriela',
    lastName: 'Ruiz',
    dni: generateFakeDNI(11),
    email: 'gabriela@example.com',
    phone: '5491667788990',
    joinDate: '2024-07-14',
    status: UserStatus.ACTIVE,
    photoUrl: 'https://images.unsplash.com/photo-1507876466876-fd7813c3e9b6?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80',
    biometrics: [],
    routines: [],
    diets: [],
    payments: [
        { id: 'pay14', date: '2025-12-12', amount: 3000, concept: 'Diciembre', method: 'Tarjeta' },
        { id: 'pay15', date: '2025-11-12', amount: 3000, concept: 'Noviembre', method: 'Tarjeta' }
    ]
  },
  {
    id: '12',
    firstName: 'Fernando',
    lastName: 'Castillo',
    dni: generateFakeDNI(12),
    email: 'fernando@example.com',
    phone: '5491445566778',
    joinDate: '2024-08-22',
    status: UserStatus.ACTIVE,
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80',
    biometrics: [],
    routines: [],
    diets: [],
    payments: [
        { id: 'pay16', date: '2025-11-05', amount: 3000, concept: 'Noviembre', method: 'Efectivo' }
    ]
  }
];

const INITIAL_INVENTORY: Product[] = [
  { id: 'p1', name: 'Proteina Whey 1kg', price: 45.00, category: 'SUPPLEMENT', stock: 10 },
  { id: 'p2', name: 'Bebida Energética', price: 2.50, category: 'DRINK', stock: 50 },
  { id: 'p3', name: 'Remera El Arca', price: 15.00, category: 'MERCHANDISE', stock: 20 },
];

const INITIAL_EXERCISES: ExerciseMaster[] = [
  { id: 'e1', name: 'Press de Banca Plano', category: 'Pecho' },
  { id: 'e2', name: 'Sentadilla Libre', category: 'Piernas' },
  { id: 'e3', name: 'Peso Muerto', category: 'Espalda/Piernas' },
  { id: 'e4', name: 'Dominadas', category: 'Espalda' },
  { id: 'e5', name: 'Press Militar', category: 'Hombros' },
  { id: 'e6', name: 'Curl de Bíceps con Barra', category: 'Brazos' },
  { id: 'e7', name: 'Extensiones de Tríceps', category: 'Brazos' },
  { id: 'e8', name: 'Prensa 45 Grados', category: 'Piernas' },
  { id: 'e9', name: 'Estocadas', category: 'Piernas' },
  { id: 'e10', name: 'Plancha Abdominal', category: 'Core' },
];

// Helper: Generate initial slots for a week (8 slots per day, 1 hour each)
const generateInitialSlots = (): Slot[] => {
  const slots: Slot[] = [];
  const today = new Date();
  const times = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];
  
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);
    const dateStr = date.toISOString().split('T')[0];
    
    times.forEach(time => {
      slots.push({
        id: Math.random().toString(36).substr(2, 9),
        date: dateStr,
        time,
        duration: 60,
        status: 'available'
      });
    });
  }
  return slots;
};

// LocalStorage Wrapper to simulate DB
class MockDB {
  private state: AppState;

  constructor() {
    const stored = localStorage.getItem('el_arca_db');
    if (stored) {
      this.state = JSON.parse(stored);
      // Migration: ensure core arrays exist
      if (!this.state.exercises) this.state.exercises = INITIAL_EXERCISES;
      if (!this.state.reminders) this.state.reminders = [];
      if (!this.state.slots) this.state.slots = generateInitialSlots();
      if (!this.state.reservations) this.state.reservations = [];

      // Migration: ensure members array contains any new initial members
      const existingIds = new Set(this.state.members.map(m => m.id));
      let added = false;
      INITIAL_MEMBERS.forEach(initM => {
        if (!existingIds.has(initM.id)) {
          this.state.members.push(initM);
          added = true;
        }
      });

      // Migration: Check fields
      this.state.members.forEach(m => {
          if (!m.payments) m.payments = [];
          if (!m.photoUrl) m.photoUrl = '';
      });

      if (added) this.save();
    } else {
      this.state = {
        currentUser: null,
        members: INITIAL_MEMBERS,
        inventory: INITIAL_INVENTORY,
        sales: [],
        exercises: INITIAL_EXERCISES,
        reminders: [],
        slots: generateInitialSlots(),
        reservations: []
      };
      this.save();
    }
  }

  private save() {
    localStorage.setItem('el_arca_db', JSON.stringify(this.state));
  }

  login(password: string) {
    if (password === 'admin123') {
      this.state.currentUser = { name: 'Admin', role: 'ADMIN' };
      this.save();
      return true;
    }
    return false;
  }

  logout() {
    this.state.currentUser = null;
    this.save();
  }

  getUser() {
    return this.state.currentUser;
  }

  getMembers() {
    return [...this.state.members].sort((a, b) => {
      const lastCompare = a.lastName.localeCompare(b.lastName, 'es', { sensitivity: 'base' });
      if (lastCompare !== 0) return lastCompare;
      return a.firstName.localeCompare(b.firstName, 'es', { sensitivity: 'base' });
    });
  }

  addMember(member: Omit<Member, 'id' | 'joinDate' | 'biometrics' | 'routines' | 'diets' | 'payments'>) {
    if (!member.dni || member.dni.trim() === '') {
      throw new Error('El DNI es requerido');
    }
    const newMember: Member = {
      ...member,
      id: Math.random().toString(36).substr(2, 9),
      joinDate: new Date().toISOString(),
      biometrics: [],
      routines: [],
      diets: [],
      payments: [],
      phase: member.phase,
      habitualSchedules: member.habitualSchedules || []
    };
    this.state.members.push(newMember);
    this.save();
    return newMember;
  }

  bulkCreateMembers(membersData: any[]) {
    let count = 0;
    const today = new Date().toISOString();

    membersData.forEach(data => {
      if (!data.dni || String(data.dni).trim() === '') {
        return;
      }
      const exists = this.state.members.some(m => m.dni === String(data.dni));
      if (exists) return;

      const newMember: Member = {
        id: Math.random().toString(36).substr(2, 9),
        firstName: data.firstName || 'Sin Nombre',
        lastName: data.lastName || 'Sin Apellido',
        dni: String(data.dni),
        email: data.email || '',
        phone: String(data.phone || ''),
        joinDate: today,
        status: UserStatus.ACTIVE,
        photoUrl: '',
        biometrics: [],
        routines: [],
        diets: [],
        payments: [],
        phase: 'volumen',
        habitualSchedules: []
      };

      this.state.members.push(newMember);
      count++;
    });

    if (count > 0) {
      this.save();
    }
    return count;
  }

  updateMemberStatus(id: string, status: UserStatus) {
    const member = this.state.members.find(m => m.id === id);
    if (member) {
      member.status = status;
      this.save();
    }
  }

  updateMember(id: string, data: { firstName: string; lastName: string; dni: string; email: string; phone: string; status: UserStatus; phase?: 'volumen' | 'deficit' | 'recomposicion' | 'transicion'; habitualSchedules?: Array<{ day: string; start: string; end: string }> }) {
    const member = this.state.members.find(m => m.id === id);
    if (member) {
      member.firstName = data.firstName;
      member.lastName = data.lastName;
      member.dni = data.dni;
      member.email = data.email;
      member.phone = data.phone;
      member.status = data.status;
      if (data.phase) member.phase = data.phase;
      if (data.habitualSchedules) member.habitualSchedules = data.habitualSchedules;
      this.save();
    }
  }

  updateMemberNutrition(memberId: string, nutritionData: any) {
    const member = this.state.members.find(m => m.id === memberId);
    if (member) {
      member.nutritionPlan = {
        ...nutritionData,
        lastUpdated: new Date().toISOString()
      };
      this.save();
      return true;
    }
    return false;
  }

  updateMemberPhoto(id: string, photoUrl: string) {
    const member = this.state.members.find(m => m.id === id);
    if (member) {
      member.photoUrl = photoUrl;
      this.save();
    }
  }

  addMemberPayment(memberId: string, amount: number, concept: string, method: string) {
      const member = this.state.members.find(m => m.id === memberId);
      if(member) {
          member.payments.push({
              id: Math.random().toString(36).substr(2, 9),
              date: new Date().toISOString(),
              amount,
              concept,
              method
          });
          if(member.status === UserStatus.DEBTOR || member.status === UserStatus.INACTIVE) {
              member.status = UserStatus.ACTIVE;
          }
          this.save();
      }
  }

  addBiometric(memberId: string, data: Omit<typeof INITIAL_MEMBERS[0]['biometrics'][0], 'id' | 'date'>) {
    const member = this.state.members.find(m => m.id === memberId);
    if (member) {
      member.biometrics.push({
        ...data,
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString().split('T')[0]
      });
      this.save();
    }
  }

  updateBiometric(memberId: string, biometric: { id: string; weight?: number; height?: number; bodyFat?: number; date?: string }) {
    const member = this.state.members.find(m => m.id === memberId);
    if (member) {
      const idx = member.biometrics.findIndex(b => b.id === biometric.id);
      if (idx !== -1) {
        member.biometrics[idx] = {
          ...member.biometrics[idx],
          ...biometric
        };
        this.save();
      }
    }
  }

  deleteBiometric(memberId: string, biometricId: string) {
    const member = this.state.members.find(m => m.id === memberId);
    if (member) {
      member.biometrics = member.biometrics.filter(b => b.id !== biometricId);
      this.save();
    }
  }

  getExercises() {
    return this.state.exercises;
  }

  createMasterExercise(name: string, category: string) {
    const newEx: ExerciseMaster = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      category
    };
    this.state.exercises.push(newEx);
    this.save();
    return newEx;
  }

  saveRoutine(memberId: string, routineData: any) {
     const member = this.state.members.find(m => m.id === memberId);
     if(member) {
        member.routines.push({
            id: Math.random().toString(36).substr(2, 9),
            createdAt: new Date().toISOString(),
            assignedBy: this.state.currentUser?.name || 'Sistema',
            ...routineData
        });
        this.save();
     }
  }

  updateRoutine(memberId: string, routineId: string, routineData: Partial<Routine>) {
    const member = this.state.members.find(m => m.id === memberId);
    if (member) {
      const routineIndex = member.routines.findIndex(r => r.id === routineId);
      if (routineIndex !== -1) {
        member.routines[routineIndex] = {
          ...member.routines[routineIndex],
          ...routineData,
          assignedBy: this.state.currentUser?.name || 'Sistema' // Update editor name
        };
        this.save();
      }
    }
  }

  deleteRoutine(memberId: string, routineId: string) {
    const member = this.state.members.find(m => m.id === memberId);
    if (member) {
      member.routines = member.routines.filter(r => r.id !== routineId);
      this.save();
    }
  }

  getInventory() {
    return this.state.inventory;
  }

  addProduct(data: Omit<Product, 'id'>) {
    const newProduct: Product = {
      ...data,
      id: Math.random().toString(36).substr(2, 9)
    };
    this.state.inventory.push(newProduct);
    this.save();
    return newProduct;
  }

  updateProduct(productId: string, data: Partial<Product>) {
    const idx = this.state.inventory.findIndex(p => p.id === productId);
    if (idx !== -1) {
      this.state.inventory[idx] = {
        ...this.state.inventory[idx],
        ...data
      };
      this.save();
      return this.state.inventory[idx];
    }
    return null;
  }

  deleteProduct(productId: string) {
    const index = this.state.inventory.findIndex(p => p.id === productId);
    if (index !== -1) {
      this.state.inventory.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  recordSale(items: {productId: string, quantity: number}[], memberId?: string) {
    let total = 0;
    const saleItems = items.map(item => {
      const product = this.state.inventory.find(p => p.id === item.productId);
      if (!product) throw new Error('Product not found');
      product.stock -= item.quantity;
      total += product.price * item.quantity;
      return {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        priceAtSale: product.price
      };
    });

    const newSale: Sale = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      items: saleItems,
      total,
      memberId
    };

    this.state.sales.push(newSale);
    this.save();
    return newSale;
  }

  getSalesByMember(memberId: string) {
      return this.state.sales.filter(s => s.memberId === memberId);
  }

  getAllSales() {
    return this.state.sales || [];
  }

  deleteSale(saleId: string) {
    const index = this.state.sales.findIndex(s => s.id === saleId);
    if (index !== -1) {
      this.state.sales.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  getReminders() {
    return this.state.reminders;
  }

  addReminder(data: Omit<Reminder, 'id'>) {
    const newReminder: Reminder = {
      ...data,
      id: Math.random().toString(36).substr(2, 9)
    };
    this.state.reminders.push(newReminder);
    this.save();
    return newReminder;
  }

  updateReminder(reminderId: string, data: Partial<Reminder>) {
    const idx = this.state.reminders.findIndex(r => r.id === reminderId);
    if (idx !== -1) {
      this.state.reminders[idx] = {
        ...this.state.reminders[idx],
        ...data
      };
      this.save();
      return this.state.reminders[idx];
    }
    return null;
  }

  deleteReminder(reminderId: string) {
    this.state.reminders = this.state.reminders.filter(r => r.id !== reminderId);
    this.save();
  }

  getSlots() {
    return this.state.slots;
  }

  addSlot(data: Omit<Slot, 'id'>) {
    const newSlot: Slot = {
      ...data,
      id: Math.random().toString(36).substr(2, 9)
    };
    this.state.slots.push(newSlot);
    this.save();
    return newSlot;
  }

  getSlotsByDate(date: string) {
    return this.state.slots.filter(s => s.date === date);
  }

  updateSlotStatus(slotId: string, status: 'available' | 'reserved' | 'occupied') {
    const slot = this.state.slots.find(s => s.id === slotId);
    if (slot) {
      slot.status = status;
      this.save();
      return slot;
    }
    return null;
  }

  deleteSlot(slotId: string) {
    this.state.reservations = this.state.reservations.filter(r => r.slotId !== slotId);
    this.state.slots = this.state.slots.filter(s => s.id !== slotId);
    this.save();
  }

  getReservations() {
    return this.state.reservations;
  }

  addReservation(data: Omit<Reservation, 'id' | 'createdAt'>) {
    if (data.memberId) {
      const alreadyExists = this.state.reservations.some(
        r => r.slotId === data.slotId && r.memberId === data.memberId
      );
      if (alreadyExists) {
        console.warn(`Member ${data.memberId} is already assigned to slot ${data.slotId}`);
        return null; 
      }
    }

    const newReservation: Reservation = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    this.state.reservations.push(newReservation);
    this.updateSlotStatus(data.slotId, 'reserved');
    this.save();
    return newReservation;
  }

  updateReservation(reservationId: string, data: Partial<Reservation>) {
    const idx = this.state.reservations.findIndex(r => r.id === reservationId);
    if (idx !== -1) {
      this.state.reservations[idx] = {
        ...this.state.reservations[idx],
        ...data
      };
      this.save();
      return this.state.reservations[idx];
    }
    return null;
  }

  deleteReservation(reservationId: string) {
    const reservation = this.state.reservations.find(r => r.id === reservationId);
    if (reservation) {
      this.updateSlotStatus(reservation.slotId, 'available');
    }
    this.state.reservations = this.state.reservations.filter(r => r.id !== reservationId);
    this.save();
  }

  updateReservationAttendance(reservationId: string, attended: boolean) {
    const idx = this.state.reservations.findIndex(r => r.id === reservationId);
    if (idx !== -1) {
      this.state.reservations[idx].attended = attended;
      this.save();
      return this.state.reservations[idx];
    }
    return null;
  }

  getReservationBySlotId(slotId: string) {
    return this.state.reservations.find(r => r.slotId === slotId);
  }
}

export const db = new MockDB();