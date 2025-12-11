
import { Member, Product, Sale, UserStatus, AppState, ExerciseMaster, PaymentLog, Routine } from '../types';

// Mock Data Initialization
const INITIAL_MEMBERS: Member[] = [
  {
    id: '1',
    firstName: 'Juan',
    lastName: 'Pérez',
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
        { id: 'pay1', date: '2023-01-15', amount: 3500, concept: 'Matrícula + Enero', method: 'Efectivo' },
        { id: 'pay2', date: '2023-02-15', amount: 3000, concept: 'Febrero', method: 'Efectivo' }
    ]
  },
  {
    id: '2',
    firstName: 'Maria',
    lastName: 'Gomez',
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
        { id: 'pay3', date: '2023-03-10', amount: 3000, concept: 'Marzo', method: 'Tarjeta' }
    ]
  },
  {
    id: '3',
    firstName: 'Carlos',
    lastName: 'López',
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
        { id: 'pay4', date: '2023-06-20', amount: 3500, concept: 'Matrícula + Junio', method: 'Efectivo' },
        { id: 'pay5', date: '2023-07-15', amount: 3000, concept: 'Julio', method: 'Efectivo' }
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

// LocalStorage Wrapper to simulate DB
class MockDB {
  private state: AppState;

  constructor() {
    const stored = localStorage.getItem('el_arca_db');
    if (stored) {
      this.state = JSON.parse(stored);
      // Migration: Check if exercises exist
      if (!this.state.exercises) {
        this.state.exercises = INITIAL_EXERCISES;
        this.save();
      }
      // Migration: Check if members have payments
      this.state.members.forEach(m => {
          if (!m.payments) m.payments = [];
          if (!m.photoUrl) m.photoUrl = '';
      });
    } else {
      this.state = {
        currentUser: null,
        members: INITIAL_MEMBERS,
        inventory: INITIAL_INVENTORY,
        sales: [],
        exercises: INITIAL_EXERCISES
      };
      this.save();
    }
  }

  private save() {
    localStorage.setItem('el_arca_db', JSON.stringify(this.state));
  }

  // Auth
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

  // Members
  getMembers() {
    return this.state.members;
  }

  addMember(member: Omit<Member, 'id' | 'joinDate' | 'biometrics' | 'routines' | 'diets' | 'payments'>) {
    const newMember: Member = {
      ...member,
      id: Math.random().toString(36).substr(2, 9),
      joinDate: new Date().toISOString(),
      biometrics: [],
      routines: [],
      diets: [],
      payments: []
    };
    this.state.members.push(newMember);
    this.save();
    return newMember;
  }

  updateMemberStatus(id: string, status: UserStatus) {
    const member = this.state.members.find(m => m.id === id);
    if (member) {
      member.status = status;
      this.save();
    }
  }

  updateMember(id: string, data: { firstName: string; lastName: string; email: string; phone: string; status: UserStatus }) {
    const member = this.state.members.find(m => m.id === id);
    if (member) {
      member.firstName = data.firstName;
      member.lastName = data.lastName;
      member.email = data.email;
      member.phone = data.phone;
      member.status = data.status;
      this.save();
    }
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
          // Auto activate if paying
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

  // Operations & Exercises
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

  // Admin / Sales
  getInventory() {
    return this.state.inventory;
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
}

export const db = new MockDB();
