// --- Utilidades y componentes auxiliares para horarios ---
const WEEKDAY_OPTIONS = ['Lunes','Martes','Miércoles','Jueves','Viernes'];
const timeOptions = Array.from({length: 24*2}, (_,i) => {
  const h = Math.floor(i/2).toString().padStart(2,'0');
  const m = i%2===0 ? '00' : '30';
  return `${h}:${m}`;
});

function TimeDropdown({ value, onChange, label }:{ value:string, onChange:(v:string)=>void, label?:string }) {
  return (
    <select
      aria-label={label}
      value={value||''}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-3 rounded-lg text-base focus:ring-2 focus:ring-brand-gold/60 focus:border-brand-gold/60 transition"
    >
      <option value="">--:--</option>
      {timeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { MembersAPI, ConfigAPI, NutritionTemplatesAPI } from '../services/api';
import { Member, UserStatus, Routine, NutritionData, ScheduleException, AttendanceRecord } from '../types';
import { isDebtorByPayment } from '../services/membershipUtils';
import { 
    Search, Plus, Clock, ArrowLeft, Camera, CreditCard, Dumbbell, 
    ChevronDown, ChevronUp, Download, Edit2, Mail, Phone, X, 
    FileSpreadsheet, Apple, Eye, Coffee, Sun, Utensils, Moon, Image,
    CalendarClock, History, AlertTriangle, CheckCircle2, XCircle, Calendar
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { SiGmail } from 'react-icons/si';
import Toast from '../components/Toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_BASE64 } from '../services/assets';
// import * as XLSX from 'xlsx'; // Remove unused import

// Exponer NutritionTemplatesAPI globalmente para uso en generateNutritionPDF
(window as any).NutritionTemplatesAPI = NutritionTemplatesAPI;

interface MembersProps {
  initialFilter?: string | null;
  currentPage?: string;
  membersResetKey?: number;
}

const Members: React.FC<MembersProps> = ({ initialFilter, currentPage, membersResetKey }) => {
  // --- ESTADOS ---
  const [members, setMembers] = useState<Member[]>([]);
  const { t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<string | null>(initialFilter || null);
  const [filter, setFilter] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showNutritionDetailModal, setShowNutritionDetailModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, name: string} | null>(null);

  // Attendance & Schedule Exceptions
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [attendanceTotal, setAttendanceTotal] = useState(0);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [exceptionForm, setExceptionForm] = useState({ date: '', start: '', end: '', reason: '' });

  // Camera refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [expandedRoutineId, setExpandedRoutineId] = useState<string | null>(null);
  const [visibleDayByRoutine, setVisibleDayByRoutine] = useState<Record<string, number>>({});

  const [newMember, setNewMember] = useState<{
    firstName: string;
    lastName: string;
    dni: string;
    email: string;
    phone: string;
    status: UserStatus;
    phase: 'volumen' | 'deficit' | 'recomposicion' | 'transicion';
    habitualSchedules: { day: string; start: string; end: string }[];
  }>({
    firstName: '',
    lastName: '',
    dni: '',
    email: '',
    phone: '',
    status: UserStatus.ACTIVE,
    phase: 'volumen',
    habitualSchedules: []
  });

  const [editMember, setEditMember] = useState<{
    firstName: string;
    lastName: string;
    dni: string;
    email: string;
    phone: string;
    status: UserStatus;
    phase: 'volumen' | 'deficit' | 'recomposicion' | 'transicion';
    habitualSchedules: { day: string; start: string; end: string }[];
  }>({
    firstName: '',
    lastName: '',
    dni: '',
    email: '',
    phone: '',
    status: UserStatus.ACTIVE,
    phase: 'volumen',
    habitualSchedules: []
  });

  const [selectedScheduleDays, setSelectedScheduleDays] = useState<Record<string, boolean>>(
    () => WEEKDAY_OPTIONS.reduce((acc, day) => ({ ...acc, [day]: false }), {} as Record<string, boolean>)
  );
  const [scheduleRange, setScheduleRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const validateAndSyncSchedule = (
    daysMap: Record<string, boolean>,
    range: { start: string; end: string }
  ) => {
    const activeDays = WEEKDAY_OPTIONS.filter(day => daysMap[day]);
    const isEmptySelection = !range.start && !range.end && activeDays.length === 0;
    if (isEmptySelection) {
      setScheduleError(null);
      setEditMember(prev => ({ ...prev, habitualSchedules: [] }));
      return;
    }
    if (!range.start || !range.end) {
      setScheduleError('Selecciona hora de inicio y fin.');
      setEditMember(prev => ({ ...prev, habitualSchedules: [] }));
      return;
    }
    if (range.end <= range.start) {
      setScheduleError('La hora de fin debe ser posterior al inicio.');
      setEditMember(prev => ({ ...prev, habitualSchedules: [] }));
      return;
    }
    if (!activeDays.length) {
      setScheduleError('Elige al menos un día hábil (lunes a viernes).');
      setEditMember(prev => ({ ...prev, habitualSchedules: [] }));
      return;
    }
    setScheduleError(null);
    setEditMember(prev => ({
      ...prev,
      habitualSchedules: activeDays.map(day => ({ day, start: range.start, end: range.end }))
    }));
  };

  const handleScheduleDayToggle = (day: string) => {
    setSelectedScheduleDays(prev => {
      const next = { ...prev, [day]: !prev[day] };
      validateAndSyncSchedule(next, scheduleRange);
      return next;
    });
  };

  const handleScheduleRangeChange = (field: 'start' | 'end', value: string) => {
    setScheduleRange(prev => {
      const next = { ...prev, [field]: value };
      validateAndSyncSchedule(selectedScheduleDays, next);
      return next;
    });
  };

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentConcept, setPaymentConcept] = useState(t('cuotaMensual'));
  const [monthlyFee, setMonthlyFee] = useState('35000');
  const [previousDebt, setPreviousDebt] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Cargar configuración de cuota mensual
  const loadMonthlyFee = async () => {
    try {
      const config = await ConfigAPI.get('monthly_fee');
      setMonthlyFee(config.value);
    } catch (error) {
      console.log('Using default monthly fee');
      setMonthlyFee('35000');
    }
  };

  // --- EFECTOS ---
  useEffect(() => {
    refreshMembers();
    loadMonthlyFee();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!showEditModal) return;
    const baseDays = WEEKDAY_OPTIONS.reduce((acc, day) => {
      acc[day] = (editMember.habitualSchedules || []).some(s => s.day === day);
      return acc;
    }, {} as Record<string, boolean>);
    const firstRange = (editMember.habitualSchedules || []).find(
      sch => WEEKDAY_OPTIONS.includes(sch.day) && sch.start && sch.end
    );
    const rangeToUse = {
      start: firstRange?.start || '',
      end: firstRange?.end || ''
    };
    setSelectedScheduleDays(baseDays);
    setScheduleRange(rangeToUse);
    validateAndSyncSchedule(baseDays, rangeToUse);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEditModal]);

  const refreshMembers = async () => {
    try {
      const data = await MembersAPI.list();
      setMembers(data);
      // Actualizar selectedMember si está presente para reflejar cambios inmediatos
      if (selectedMember) {
        const updatedMember = data.find(m => m.id === selectedMember.id);
        if (updatedMember) {
          setSelectedMember(updatedMember);
        }
      }
    } catch (err) {
      setToast({ message: t('errorCargarSocios'), type: 'error' });
    }
  };

  const handleMemberClick = (member: Member) => {
      // Cargar historial de asistencia
      MembersAPI.getAttendanceHistory(member.id, 10, 0)
        .then(data => {
          setAttendanceHistory(data.records || []);
          setAttendanceTotal(data.total || 0);
        })
        .catch(() => {
          setAttendanceHistory([]);
          setAttendanceTotal(0);
        });
      // Si el miembro tiene un nutritionPlan directo, úsalo. Si no, intentar mapear desde diets.description si es JSON válido.
      let nutritionPlan = member.nutritionPlan;
      if (!nutritionPlan && member.diets && member.diets.length > 0) {
        const lastDiet = member.diets[0];
        let parsed: Partial<NutritionData> = {};
        try {
          parsed = lastDiet.description ? JSON.parse(lastDiet.description) : {};
        } catch (e) {
          parsed = {};
        }
        nutritionPlan = {
          breakfast: Array.isArray(parsed.breakfast) ? parsed.breakfast : [],
          morningSnack: Array.isArray(parsed.morningSnack) ? parsed.morningSnack : [],
          lunch: Array.isArray(parsed.lunch) ? parsed.lunch : [],
          afternoonSnack: Array.isArray(parsed.afternoonSnack) ? parsed.afternoonSnack : [],
          dinner: Array.isArray(parsed.dinner) ? parsed.dinner : [],
          supplements: Array.isArray(parsed.supplements) ? parsed.supplements : [],
          supplementNotes: typeof parsed.supplementNotes === 'string' ? parsed.supplementNotes : '',
          notes: typeof parsed.notes === 'string' ? parsed.notes : '',
          calories: lastDiet.calories?.toString() || '',
          lastUpdated: lastDiet.generatedAt || ''
        };
      }
      // Si nutritionPlan viene directo del backend, asegurarse de que supplements y supplementNotes existan
      if (nutritionPlan) {
        nutritionPlan = {
          breakfast: Array.isArray(nutritionPlan.breakfast) ? nutritionPlan.breakfast : [],
          morningSnack: Array.isArray(nutritionPlan.morningSnack) ? nutritionPlan.morningSnack : [],
          lunch: Array.isArray(nutritionPlan.lunch) ? nutritionPlan.lunch : [],
          afternoonSnack: Array.isArray(nutritionPlan.afternoonSnack) ? nutritionPlan.afternoonSnack : [],
          dinner: Array.isArray(nutritionPlan.dinner) ? nutritionPlan.dinner : [],
          supplements: Array.isArray(nutritionPlan.supplements) ? nutritionPlan.supplements : [],
          supplementNotes: typeof nutritionPlan.supplementNotes === 'string' ? nutritionPlan.supplementNotes : '',
          notes: typeof nutritionPlan.notes === 'string' ? nutritionPlan.notes : '',
          calories: nutritionPlan.calories || '',
          lastUpdated: nutritionPlan.lastUpdated || ''
        };
      }
      setSelectedMember({ ...member, nutritionPlan });
  };

  // === SCHEDULE EXCEPTIONS ===
  const handleAddScheduleException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    if (!exceptionForm.date || !exceptionForm.start || !exceptionForm.end) {
      setToast({ message: 'Fecha, hora de inicio y fin son requeridos', type: 'error' });
      return;
    }
    try {
      await MembersAPI.addScheduleException(selectedMember.id, {
        date: exceptionForm.date,
        start: exceptionForm.start,
        end: exceptionForm.end,
        reason: exceptionForm.reason || undefined
      });
      setShowExceptionModal(false);
      setExceptionForm({ date: '', start: '', end: '', reason: '' });
      await refreshMembers();
      setToast({ message: 'Excepción de horario creada', type: 'success' });
    } catch {
      setToast({ message: 'Error al crear excepción de horario', type: 'error' });
    }
  };

  const handleDeleteScheduleException = async (exceptionId: string) => {
    if (!selectedMember) return;
    try {
      await MembersAPI.deleteScheduleException(selectedMember.id, exceptionId);
      await refreshMembers();
      setToast({ message: 'Excepción eliminada', type: 'success' });
    } catch {
      setToast({ message: 'Error al eliminar excepción', type: 'error' });
    }
  };

  const handleOpenAddModal = () => {
    setNewMember({
      firstName: '',
      lastName: '',
      dni: '',
      email: '',
      phone: '',
      status: UserStatus.ACTIVE,
      phase: 'volumen',
      habitualSchedules: []
    });
    setShowAddModal(true);
  };
  const handleOpenPaymentModal = () => {
    if (selectedMember) {
      // Verificar si ya pagó cuota mensual este mes
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const alreadyPaidThisMonth = selectedMember.payments?.some((p: any) => {
        if (p.concept !== 'Cuota Mensual') return false;
        const paymentDate = new Date(p.date);
        return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
      });
      
      const debt = calculatePreviousDebt(selectedMember);
      setPreviousDebt(debt);
      setPaymentAmount(monthlyFee);
      setPaymentConcept(alreadyPaidThisMonth ? 'Matrícula' : t('cuotaMensual'));
      setShowPaymentModal(true);
    }
  };
  const handleOpenEditModal = () => {
      if(selectedMember) {
            setEditMember({
              firstName: selectedMember.firstName,
              lastName: selectedMember.lastName,
              dni: selectedMember.dni || '',
              email: selectedMember.email,
              phone: selectedMember.phone,
              status: selectedMember.status,
              phase: selectedMember.phase || 'volumen',
              habitualSchedules: selectedMember.habitualSchedules ? [...selectedMember.habitualSchedules] : []
            });
          setShowEditModal(true);
      }
  };

  const handleSaveEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMember) {
      if (scheduleError) {
        setToast({ message: scheduleError, type: 'error' });
        return;
      }
      // Validaciones igual que en creación
      const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/;
      const hasLetter = /[A-Za-zÀ-ÖØ-öø-ÿ]/;
      if (!editMember.firstName || !nameRegex.test(editMember.firstName) || !hasLetter.test(editMember.firstName)) {
        setToast({ message: t('errorNombreInvalido'), type: 'error' });
        return;
      }
      if (!editMember.lastName || !nameRegex.test(editMember.lastName) || !hasLetter.test(editMember.lastName)) {
        setToast({ message: t('errorApellidoInvalido'), type: 'error' });
        return;
      }
      // DNI: solo dígitos, máximo 8
      const dniClean = String(editMember.dni).replace(/\D/g, '');
      if (!/^[0-9]{1,8}$/.test(dniClean)) {
        setToast({ message: t('errorDniInvalido'), type: 'error' });
        return;
      }
      // Email simple: contiene @ y termina en .com
      const email = (editMember.email || '').trim();
      if (email && !(email.includes('@') && (email?.toLowerCase()?.endsWith('.com') ?? false))) {
        setToast({ message: t('errorEmailInvalido'), type: 'error' });
        return;
      }
      // Teléfono: solo dígitos
      const phoneClean = String(editMember.phone).replace(/\D/g, '');
      if (editMember.phone && !/^[0-9]+$/.test(phoneClean)) {
        setToast({ message: t('errorTelefonoInvalido'), type: 'error' });
        return;
      }
      // DNI duplicado (en otro socio)
      if (members.some(m => String(m.dni) === dniClean && m.id !== selectedMember.id)) {
        setToast({ message: t('errorDniDuplicado'), type: 'error' });
        return;
      }
      try {
        await MembersAPI.update(selectedMember.id, {
          ...editMember,
          dni: dniClean,
          email,
          phone: phoneClean,
          phase: editMember.phase,
          habitualSchedules: editMember.habitualSchedules
        });
        setShowEditModal(false);
        await refreshMembers();
      } catch (err) {
        setToast({ message: t('errorGuardarSocio'), type: 'error' });
      }
    }
  };

  const toggleStatus = async (e: React.MouseEvent, id: string, currentStatus: UserStatus) => {
    e.stopPropagation();
    const newStatus = currentStatus === UserStatus.ACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE;
    try {
      await MembersAPI.update(id, { status: newStatus });
      await refreshMembers();
      // Buscar el nombre del socio actualizado
      const member = members.find(m => m.id === id);
      let msg = '';
      if (newStatus === UserStatus.INACTIVE) {
        msg = member ? `${member.firstName} ${member.lastName} ha sido marcado como INACTIVO.` : 'El socio ha sido marcado como INACTIVO.';
      } else {
        msg = member ? `${member.firstName} ${member.lastName} ha sido marcado como ACTIVO.` : 'El socio ha sido marcado como ACTIVO.';
      }
      setToast({ message: msg, type: 'success' });
    } catch (err) {
      setToast({ message: t('errorGuardarSocio'), type: 'error' });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if(e.target.files && e.target.files[0] && selectedMember) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          await MembersAPI.update(selectedMember.id, { photoUrl: base64 });
          // Actualizar el estado local inmediatamente para reflejar el cambio
          setSelectedMember({ ...selectedMember, photoUrl: base64 });
          await refreshMembers();
          setToast({ message: t('fotoActualizada') || 'Foto actualizada correctamente', type: 'success' });
        } catch (err) {
          setToast({ message: t('errorGuardarFoto'), type: 'error' });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setToast({ message: t('noCamara'), type: 'error' });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !selectedMember) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg');
    try {
      await MembersAPI.update(selectedMember.id, { photoUrl: dataUrl });
      // Actualizar el estado local inmediatamente para reflejar el cambio
      setSelectedMember({ ...selectedMember, photoUrl: dataUrl });
      stopCamera();
      setShowCameraModal(false);
      await refreshMembers();
      setToast({ message: t('fotoCapturada'), type: 'success' });
    } catch (err) {
      setToast({ message: t('errorGuardarFoto'), type: 'error' });
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if(selectedMember) {
      // Validación frontend: no permitir Cuota Mensual duplicada
      if (paymentConcept === 'Cuota Mensual') {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const cuotaPagada = selectedMember.payments?.some((p: any) => {
          if (p.concept !== 'Cuota Mensual') return false;
          const pd = new Date(p.date);
          return pd.getMonth() === currentMonth && pd.getFullYear() === currentYear;
        });
        if (cuotaPagada) {
          setToast({ message: 'El socio ya tiene abonada la Cuota Mensual de este mes.', type: 'error' });
          return;
        }
      }
      try {
        await MembersAPI.addPayment(selectedMember.id, {
          amount: Number(paymentAmount),
          concept: paymentConcept,
          method: 'Efectivo',
          date: new Date().toISOString()
        });
        setShowPaymentModal(false);
        setPaymentAmount('');
        await refreshMembers();
        setToast({ message: t('cambiosGuardados'), type: 'success' });
      } catch (err) {
        setToast({ message: t('errorGuardarSocio'), type: 'error' });
      }
    }
  };

  const handleDeleteMember = (memberId: string, memberName: string) => {
    setDeleteConfirm({ id: memberId, name: memberName });
  };

  const confirmDeleteMember = async () => {
    if (!deleteConfirm) return;
    try {
      await MembersAPI.delete(deleteConfirm.id);
      await refreshMembers();
      setSelectedMember(null);
      setDeleteConfirm(null);
      setToast({ message: 'Socio eliminado correctamente', type: 'success' });
    } catch (err) {
      setToast({ message: 'Error al eliminar socio', type: 'error' });
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validaciones antes de intentar crear
    // Nombre y apellido: solo letras y espacios, deben contener al menos una letra
    const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/;
    const hasLetter = /[A-Za-zÀ-ÖØ-öø-ÿ]/;
    if (!newMember.firstName || !nameRegex.test(newMember.firstName) || !hasLetter.test(newMember.firstName)) {
      setToast({ message: t('errorNombreInvalido'), type: 'error' });
      return;
    }
    if (!newMember.lastName || !nameRegex.test(newMember.lastName) || !hasLetter.test(newMember.lastName)) {
      setToast({ message: t('errorApellidoInvalido'), type: 'error' });
      return;
    }

    // DNI: solo dígitos, máximo 8
    const dniClean = String(newMember.dni).replace(/\D/g, '');
    if (!/^[0-9]{1,8}$/.test(dniClean)) {
      setToast({ message: t('errorDniInvalido'), type: 'error' });
      return;
    }

    // Email simple: contiene @ y termina en .com
    const email = (newMember.email || '').trim();
    if (email && !(email.includes('@') && email.toLowerCase().endsWith('.com'))) {
      setToast({ message: t('errorEmailInvalido'), type: 'error' });
      return;
    }

    // Teléfono: solo dígitos
    const phoneClean = String(newMember.phone).replace(/\D/g, '');
    if (newMember.phone && !/^[0-9]+$/.test(phoneClean)) {
      setToast({ message: t('errorTelefonoInvalido'), type: 'error' });
      return;
    }

    // DNI duplicado
    if (members.some(m => String(m.dni) === dniClean)) {
      setToast({ message: 'El DNI introducido ya está registrado', type: 'error' });
      return;
    }

    try {
      await MembersAPI.create({
        ...newMember,
        dni: dniClean,
        email,
        phone: phoneClean,
        phase: newMember.phase,
        habitualSchedules: newMember.habitualSchedules
      });
      setShowAddModal(false);
      setNewMember({ firstName: '', lastName: '', dni: '', email: '', phone: '', status: UserStatus.ACTIVE, phase: 'volumen', habitualSchedules: [] });
      await refreshMembers();
      setToast({ message: t('cambiosGuardados'), type: 'success' });
    } catch (err) {
      setToast({ message: t('errorGuardarSocio'), type: 'error' });
    }
  };

  // Helper: Check if member payment is due soon (within 30 days without payment)
    const isPaymentDueSoon = (member: Member): boolean => {
      if (member.status !== UserStatus.ACTIVE) return false;
      if (!member.payments || member.payments.length === 0) return true;
  
      // find the most recent payment date
      const paymentDates = member.payments.map((p: { date: string }) => new Date(p.date).getTime());
      const lastPaymentTs = Math.max(...paymentDates);
      const lastPaymentDate = new Date(lastPaymentTs);
      const today = new Date();
      const daysWithoutPayment = (today.getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24);
  
      // Return true if between 30 and 60 days since last payment
      return daysWithoutPayment >= 30 && daysWithoutPayment < 60;
    };
  
  
    // Helper: Check if member is current (paid recently - within last 30 days)
    const isCurrentOnPayment = (member: Member): boolean => {
      if (member.status !== UserStatus.ACTIVE) return false;
      if (!member.payments || member.payments.length === 0) return false;
  
      // If any payment within last 30 days, consider current
      const today = new Date();
      return member.payments.some((p: { date: string }) => {
        const pd = new Date(p.date);
        const days = (today.getTime() - pd.getTime()) / (1000 * 60 * 60 * 24);
        return days < 30;
      });
    };
  
    // Helper: Calculate previous debt (months unpaid * monthlyFee)
    const calculatePreviousDebt = (member: Member): number => {
      if (!member.payments || member.payments.length === 0) return 0;
      // Assume payments are for monthly fee, count months since last payment
      const lastPaymentDate = new Date(Math.max(...member.payments.map((p: { date: string }) => new Date(p.date).getTime())));
      const today = new Date();
      const monthsDiff = (today.getFullYear() - lastPaymentDate.getFullYear()) * 12 + (today.getMonth() - lastPaymentDate.getMonth());
      if (monthsDiff <= 0) return 0;
      return monthsDiff * Number(monthlyFee);
    };


  // --- FUNCIÓN PARA NORMALIZAR TEXTO (QUITAR TILDES) ---
  const normalizeText = (text: string) => {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  };

  const filteredMembers = members.filter((m: Member) => {
    // Usamos la función normalizeText para comparar sin tildes ni mayúsculas
    const searchTerm = normalizeText(filter);
    const memberLastName = normalizeText(m.lastName);
    const memberFirstName = normalizeText(m.firstName);

    const matchesSearch = memberLastName.includes(searchTerm) || 
                          memberFirstName.includes(searchTerm);
                          
    const matchesStatus = !statusFilter || 
               (statusFilter === 'active' && m.status === UserStatus.ACTIVE) ||
               (statusFilter === 'debtor' && isDebtorByPayment(m)) ||
               (statusFilter === 'inactive' && m.status === UserStatus.INACTIVE) ||
               (statusFilter === 'current' && isCurrentOnPayment(m)) ||
               (statusFilter === 'dueSoon' && isPaymentDueSoon(m)) ||
               (statusFilter === 'all' && true);
    return matchesSearch && matchesStatus;
  });

  // Counts for dashboard cards
  const totalCount = members.length;
  const activeCount = members.filter((m: Member) => m.status === UserStatus.ACTIVE).length;
  const alDiaCount = members.filter((m: Member) => m.status === UserStatus.ACTIVE && isCurrentOnPayment(m)).length;
  const debtorsCount = members.filter((m: Member) => isDebtorByPayment(m)).length;
  const dueSoonCount = members.filter((m: Member) => isPaymentDueSoon(m)).length;
  const inactiveCount = members.filter((m: Member) => m.status === UserStatus.INACTIVE).length;

  // --- MESSAGING & PDF HELPERS ---
  const generateNutritionPDF = async (nutritionPlan: any, memberName: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Función para reimprimir fondo y encabezado en cada página
    function printBackgroundAndHeader() {
      doc.setFillColor(26, 26, 26);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      doc.setFillColor(212, 175, 55);
      doc.rect(0, 0, pageWidth, 3, 'F');
      // Marca de agua
      try {
        if (typeof LOGO_BASE64 === 'string' && LOGO_BASE64.length > 0) {
          doc.saveGraphicsState();
          if (typeof (doc as any).GState === 'function') {
            doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
          }
          const imgSize = pageHeight * 0.8;
          const xCentered = (pageWidth - imgSize) / 2;
          const yCentered = (pageHeight - imgSize) / 2;
          doc.addImage(LOGO_BASE64, 'JPEG', xCentered, yCentered, imgSize, imgSize);
          doc.restoreGraphicsState();
        }
      } catch (e) {}
      // Logo encabezado
      try {
        if (typeof LOGO_BASE64 === 'string' && LOGO_BASE64.length > 0) {
          doc.addImage(LOGO_BASE64, 'JPEG', pageWidth - 40, 6, 28, 18);
        }
      } catch (e) {}
      // Título
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(212, 175, 55);
      doc.text('PLAN NUTRICIONAL', pageWidth / 2, 20, { align: 'center' });
      // Nombre del socio
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text(memberName, pageWidth / 2, 30, { align: 'center' });
      // Marca del gimnasio
      doc.setFontSize(10);
      doc.setTextColor(180, 180, 180);
      doc.text('EL ARCA - GYM & FITNESS', pageWidth / 2, 38, { align: 'center' });
    }

    // Inicializar primera página
    printBackgroundAndHeader();
    let y = 50;
    const bottomMargin = 20;
    function checkPageBreak(extra = 0) {
      if (y + extra > pageHeight - bottomMargin) {
        doc.setFillColor(212, 175, 55);
        doc.rect(0, pageHeight - 5, pageWidth, 5, 'F');
        doc.setFontSize(8);
        doc.setTextColor(212, 175, 55);
        doc.text(`Socio: ${memberName}`, 10, pageHeight - 8);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, pageWidth - 40, pageHeight - 8);
        doc.addPage();
        printBackgroundAndHeader();
        y = 50;
      }
    }

    // Detalles generales
    doc.setFontSize(12);
    doc.setTextColor(212, 175, 55);
    doc.text('Calorías asignadas:', 20, y);
    doc.setTextColor(255, 255, 255);
    doc.text(`${nutritionPlan.calories || 'N/A'}`, 70, y);
    y += 10;
    checkPageBreak(15);
    doc.setTextColor(212, 175, 55);
    doc.text('Actualizado:', 20, y);
    doc.setTextColor(255, 255, 255);
    doc.text(`${nutritionPlan.lastUpdated ? new Date(nutritionPlan.lastUpdated).toLocaleDateString() : ''}`, 70, y);
    y += 15;

    // Renderizar cada comida
    const comidas = [
      { label: 'Desayuno', items: nutritionPlan.breakfast, color: [255, 193, 7] },
      { label: 'Media Mañana', items: nutritionPlan.morningSnack, color: [255, 235, 59] },
      { label: 'Almuerzo', items: nutritionPlan.lunch, color: [244, 67, 54] },
      { label: 'Merienda', items: nutritionPlan.afternoonSnack, color: [255, 152, 0] },
      { label: 'Cena', items: nutritionPlan.dinner, color: [33, 150, 243] }
    ];
    doc.setFontSize(11);
    comidas.forEach(({ label, items, color }) => {
      if (items && items.length > 0) {
        checkPageBreak(10);
        if (Array.isArray(color) && color.length === 3) {
          doc.setTextColor(color[0], color[1], color[2]);
        }
        doc.text(label + ':', 20, y);
        doc.setTextColor(255, 255, 255);
        items.forEach((alimento: string) => {
          y += 7;
          checkPageBreak(7);
          doc.text(`• ${alimento}`, 28, y);
        });
        y += 10;
      }
    });

    // Sección de Suplementación
    checkPageBreak(20);
    doc.setFontSize(12);
    doc.setTextColor(76, 175, 80); // Verde
    doc.text('Suplementación:', 20, y);
    y += 8;
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    if (nutritionPlan.supplements && nutritionPlan.supplements.length > 0) {
      nutritionPlan.supplements.forEach((supp: string) => {
        checkPageBreak(7);
        doc.text(`• ${supp}`, 28, y);
        y += 7;
      });
    } else {
      doc.text('Sin suplementos asignados', 28, y);
      y += 7;
    }
    if (nutritionPlan.supplementNotes) {
      checkPageBreak(14);
      doc.setFontSize(10);
      doc.setTextColor(76, 175, 80);
      doc.text('Observaciones:', 28, y);
      y += 7;
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text(nutritionPlan.supplementNotes, 32, y);
      y += 10;
    }

    // Notas generales
    if (nutritionPlan.notes) {
      checkPageBreak(14);
      doc.setTextColor(212, 175, 55);
      doc.setFontSize(10);
      doc.text('Notas generales:', 20, y);
      doc.setTextColor(255, 255, 255);
      y += 7;
      doc.text(nutritionPlan.notes, 28, y);
      y += 10;
    }

    // Obtener y agregar recomendaciones nutricionales
    try {
      const template = await (window as any).NutritionTemplatesAPI.getActive();
      if (template && template.content) {
        // Nueva página para recomendaciones
        doc.addPage();
        printBackgroundAndHeader();
        y = 50;

        // Título de recomendaciones
        doc.setFontSize(16);
        doc.setTextColor(212, 175, 55);
        doc.text(template.title || 'RECOMENDACIONES NUTRICIONALES', pageWidth / 2, y, { align: 'center' });
        y += 15;

        // Contenido de recomendaciones
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        
        const lines = template.content.split('\n');
        const leftMargin = 15;
        const rightMargin = pageWidth - 15;
        const maxWidth = rightMargin - leftMargin;

        lines.forEach((line: string) => {
          if (!line.trim()) {
            y += 4; // Espacio para líneas vacías
            return;
          }

          // Detectar títulos (líneas en mayúsculas o que comienzan con caracteres especiales)
          const isTitle = line.trim() === line.trim().toUpperCase() && line.trim().length > 3;
          
          if (isTitle) {
            checkPageBreak(12);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(212, 175, 55);
          } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(255, 255, 255);
          }

          // Dividir línea si es muy larga
          const wrappedLines = doc.splitTextToSize(line, maxWidth);
          wrappedLines.forEach((wrappedLine: string) => {
            checkPageBreak(6);
            doc.text(wrappedLine, leftMargin, y);
            y += isTitle ? 6 : 5;
          });

          if (isTitle) {
            y += 2; // Espacio extra después de títulos
          }
        });
      }
    } catch (error) {
      console.error('Error al obtener recomendaciones nutricionales:', error);
      // Continuar sin recomendaciones si hay error
    }

    // Pie de página dorado en la última página
    doc.setFillColor(212, 175, 55);
    doc.rect(0, pageHeight - 5, pageWidth, 5, 'F');
    doc.setFontSize(8);
    doc.setTextColor(212, 175, 55);
    doc.text(`Socio: ${memberName}`, 10, pageHeight - 8);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, pageWidth - 40, pageHeight - 8);

    // Descargar
    const fileName = `PlanNutricional_${memberName.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
    return fileName;
  };

  const handleShareNutrition = async (method: 'wa' | 'email') => {
    if (!selectedMember || !selectedMember.nutritionPlan) return;
    setToast({ message: `⏳ Generando y descargando PDF para ${method === 'wa' ? 'WhatsApp' : 'Email'}. Adjunta el archivo descargado en el mensaje.`, type: 'info' });
    await generateNutritionPDF(selectedMember.nutritionPlan, `${selectedMember.firstName} ${selectedMember.lastName}`);
    const msgText = `Hola ${selectedMember.firstName}, te adjunto el PDF de tu plan nutricional de El Arca Gym. \n\n¡A entrenar con todo! 💪`;
    if (method === 'wa') {
      const url = `https://wa.me/${formatPhoneNumber(selectedMember.phone)}?text=${encodeURIComponent(msgText)}`;
      setTimeout(() => window.open(url, '_blank'), 1000);
    } else {
      const url = `mailto:${selectedMember.email}?subject=Tu Plan Nutricional - El Arca Gym&body=${encodeURIComponent(msgText)}`;
      setTimeout(() => window.open(url, '_blank'), 1000);
    }
  };

  const formatPhoneNumber = (phone: string) => {
      const clean = phone.replace(/\D/g, '');
      if (clean.startsWith('549')) return clean;
      if (clean.startsWith('54')) return '549' + clean.substring(2);
      const noZero = clean.startsWith('0') ? clean.substring(1) : clean;
      return `549${noZero}`;
  };

  const generateRoutinePDF = (routine: Routine, memberName: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // -- ADD LOGO AS FULL BACKGROUND --
    // Function to add complete page background (defined here so it's accessible everywhere)
    const addPageBackground = () => {
        // Add dark background
        doc.setFillColor(26, 26, 26); // Dark background (#1a1a1a)
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        // Add background logo watermark
        doc.saveGraphicsState();
        doc.setGState(new (doc as any).GState({ opacity: 0.08 })); // Very subtle so content is readable
        const imgSize = pageHeight * 0.8; // Make it large to fill background
        const xCentered = (pageWidth - imgSize) / 2;
        const yCentered = (pageHeight - imgSize) / 2;
        try {
            doc.addImage(LOGO_BASE64, 'JPEG', xCentered, yCentered, imgSize, imgSize);
        } catch(e) {
            console.warn("Could not add image", e);
        }
        doc.restoreGraphicsState();
        
        // Add decorative gold bar at top
        doc.setFillColor(212, 175, 55); // Gold color (#d4af37)
        doc.rect(0, 0, pageWidth, 3, 'F');
    };

    // Add background to first page
    addPageBackground();

    // 1. Header Section with Gold accent
    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(30);
    doc.setTextColor(212, 175, 55); // Gold text
    doc.text("¡¡¡A ENTRENAR!!!", pageWidth / 2, 20, { align: "center" });

    // Routine Name
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255); // White text
    doc.text(routine.name.toUpperCase(), pageWidth / 2, 30, { align: "center" });

    // Gym Brand
    doc.setFontSize(10);
    doc.setTextColor(180, 180, 180); // Light gray
    doc.text("EL ARCA - GYM & FITNESS", pageWidth / 2, 38, { align: "center" });
    
    // Reset Color
    doc.setTextColor(255, 255, 255);

    // 2. Table Data Construction
    let finalY = 45;

    routine.days.forEach((day) => {
        // Prepare rows for this day
        const bodyRows = day.exercises.map(ex => [
            `• ${ex.name.toUpperCase()}${ex.notes ? `\n  (${ex.notes})` : ''}`, 
            `${ex.series} X ${ex.reps}${ex.weight !== 'N/A' && ex.weight ? `, ${ex.weight}` : ''}`
        ]);

        autoTable(doc, {
            startY: finalY,
            head: [[day.dayName.toUpperCase(), "SERIES / REPETICIONES / CARGA"]],
            body: bodyRows,
            theme: 'plain', // Use plain so autotable doesn't fill cell backgrounds
            headStyles: {
                halign: 'left',
                fontStyle: 'bold',
                fontSize: 12,
                textColor: [0, 0, 0]
            },
            styles: {
                fontSize: 10,
                cellPadding: 4,
                valign: 'middle',
                textColor: [255, 255, 255]
            },
            columnStyles: {
                0: { cellWidth: 110, fontStyle: 'bold' },
                1: { cellWidth: 'auto', fontStyle: 'normal' }
            },
            willDrawPage: function(data) {
                // This hook is called BEFORE autoTable draws content on a page
                // Apply background to all pages except the first one (which already has it)
                if (data.pageNumber > 1) {
                    addPageBackground();
                }
            },
            willDrawCell: function(data) {
                // Draw header background (gold) before autotable draws header text
                const cell = data.cell;
                if (cell.section === 'head') {
                    // semi-opaque gold background for header
                    doc.saveGraphicsState();
                    try {
                        doc.setGState(new (doc as any).GState({ opacity: 0.95 }));
                    } catch (e) { /* fallback if GState unavailable */ }
                    doc.setFillColor(212, 175, 55);
                    doc.rect(cell.x, cell.y, cell.width, cell.height, 'F');
                    doc.restoreGraphicsState();
                }
            },
            didDrawCell: function(data) {
                const cell = data.cell;
                // Draw subtle borders for body cells so grid is visible but cells remain transparent
                if (cell.section === 'body') {
                    doc.setDrawColor(80, 80, 80);
                    doc.setLineWidth(0.3);
                    // bottom border
                    doc.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height);
                    // right border
                    doc.line(cell.x + cell.width, cell.y, cell.x + cell.width, cell.y + cell.height);
                }
                // Ensure header text is black (on top of gold)
                if (cell.section === 'head') {
                    doc.setTextColor(0, 0, 0);
                }
            }
        });

        // Update Y for next table (margin)
        finalY = (doc as any).lastAutoTable.finalY + 10;
        
        // Check page break
        if (finalY > pageHeight - 30) {
            doc.addPage();
            
            // Add complete background to new page
            addPageBackground();
            
            finalY = 20;
        }
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Add gold bar at bottom (on top of existing content)
        doc.setFillColor(212, 175, 55);
        doc.rect(0, pageHeight - 5, pageWidth, 5, 'F');
        
        // Add footer text
        doc.setFontSize(8);
        doc.setTextColor(212, 175, 55); // Gold color for footer text
        doc.text(`Entrenador: ${routine.assignedBy || 'El Arca'} - Socio: ${memberName}`, 10, pageHeight - 8);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 30, pageHeight - 8);
    }

    // Download
    const fileName = `Rutina_${memberName.replace(/\s+/g, '_')}_${routine.name.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
    return fileName;
  };

  const handleShareRoutine = (e: React.MouseEvent, method: 'whatsapp' | 'email', routine: Routine) => {
      e.stopPropagation();
      if(!selectedMember) return;

      // 1. Generate and Download PDF
      setToast({ message: `⏳ Generando y descargando PDF para ${method === 'whatsapp' ? 'WhatsApp' : 'Email'}. Adjunta el archivo descargado en el mensaje.`, type: 'info' });
      generateRoutinePDF(routine, `${selectedMember.firstName} ${selectedMember.lastName}`);

      // 2. Open App with Message
      const msgText = `Hola ${selectedMember.firstName}, te adjunto el PDF de tu rutina "${routine.name}" de El Arca Gym. \n\n¡A entrenar con todo! 💪`;
      
      if (method === 'whatsapp') {
          const url = `https://wa.me/${formatPhoneNumber(selectedMember.phone)}?text=${encodeURIComponent(msgText)}`;
          setTimeout(() => window.open(url, '_blank'), 1000);
      } else {
          const url = `mailto:${selectedMember.email}?subject=Tu Rutina de Entrenamiento - El Arca Gym&body=${encodeURIComponent(msgText)}`;
          setTimeout(() => window.open(url, '_blank'), 1000);
      }
  };

  const sendPaymentReminder = (type: 'wa' | 'email') => {
      if(!selectedMember) return;
      const msgText = `Hola ${selectedMember.firstName}, te recordamos que tu cuota en El Arca Gym está vencida o próxima a vencer. Por favor acércate a regularizar tu situación. Gracias! 💪`;
      
      if (type === 'wa') {
          const phone = formatPhoneNumber(selectedMember.phone);
          const url = `https://wa.me/${phone}?text=${encodeURIComponent(msgText)}`;
          setToast({ message: `📲 Se abrirá WhatsApp con el número: ${phone}. Mensaje listo para enviar.`, type: 'info' });
          window.open(url, '_blank');
      } else {
          const url = `mailto:${selectedMember.email}?subject=Aviso de Cuota - El Arca Gym&body=${encodeURIComponent(msgText)}`;
          setToast({ message: `📧 Se abrirá tu cliente de correo. Destinatario: ${selectedMember.email}`, type: 'info' });
          window.open(url, '_blank');
      }
  };

  // --- RENDER VIEWS ---
  // --- Efecto: Si cambia el filtro global de página, forzar volver a la lista general de socios ---
  React.useEffect(() => {
    // Si cambia la página global (por ejemplo, desde el sidebar), limpiar selección
    setSelectedMember(null);
    // eslint-disable-next-line
  }, [initialFilter]);

  React.useEffect(() => {
    // Si membersResetKey cambia, limpiar selección
    setSelectedMember(null);
    // eslint-disable-next-line
  }, [membersResetKey]);

  // --- Efecto: Si el usuario navega con el historial (popstate), limpiar selección ---
  React.useEffect(() => {
    const onPopState = () => {
      if (selectedMember) setSelectedMember(null);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
    // eslint-disable-next-line
  }, [selectedMember]);

  if (selectedMember) {
    return (
      <div>
        {/* Header Profile Card */}
        <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-gray-900 to-black"></div>
          <button
            onClick={() => setSelectedMember(null)}
            className="fixed md:absolute z-50 bg-black/70 hover:bg-black text-white w-12 h-12 flex items-center justify-center rounded-full transition-colors shadow-lg cursor-pointer"
            style={{
              top: '24px',
              left: '24px',
              pointerEvents: 'auto',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
            }}
            aria-label="Volver"
          >
            <ArrowLeft size={28} />
          </button>
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 pt-8">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-32 h-32 rounded-full border-4 border-brand-dark bg-gray-800 overflow-hidden shadow-xl">
                {selectedMember.photoUrl ? (
                  <img src={selectedMember.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🦁</div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 flex gap-1">
                <label 
                  className="bg-brand-gold text-black p-2 rounded-full cursor-pointer hover:bg-yellow-500 transition-colors shadow-lg"
                  title="Seleccionar imagen desde el dispositivo"
                >
                  <Image size={18} />
                  <input type="file" accept="image/*" className="hidden" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePhotoUpload(e)} />
                </label>
                <button 
                  onClick={() => { setShowCameraModal(true); startCamera(); }}
                  className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors shadow-lg"
                  title="Tomar foto con la cámara"
                >
                  <Camera size={18} />
                </button>
              </div>
            </div>
            {/* Info */}
            <div className="flex-1 text-center md:text-left mb-2">
              <h2 className="text-3xl font-display font-bold text-white uppercase tracking-wider">
                {selectedMember.firstName} {selectedMember.lastName}
              </h2>
              <div className="flex flex-col gap-3 mt-3">
                <div className="flex items-center justify-center md:justify-start gap-2 text-gray-400 text-sm flex-wrap">
                  <a href={`mailto:${selectedMember.email}`} className="flex items-center gap-1 text-gray-300 hover:underline" aria-label={`Enviar email a ${selectedMember.email}`}>
                    <Mail size={14} /> <span>{selectedMember.email}</span>
                  </a>

                  <span className="w-1 h-1 bg-gray-600 rounded-full" />

                  <div className="flex items-center gap-2">
                    <a href={`tel:${selectedMember.phone}`} className="flex items-center gap-1 text-gray-300 hover:underline" aria-label={`Llamar a ${selectedMember.phone}`}>
                      <Phone size={14} /> <span>{selectedMember.phone}</span>
                    </a>

                    {selectedMember.phone && (
                      <button
                        onClick={() => window.open(`https://wa.me/${formatPhoneNumber(selectedMember.phone)}`, '_blank')}
                        title="Enviar WhatsApp"
                        className="text-green-400 hover:text-green-300"
                        aria-label={`Enviar WhatsApp a ${selectedMember.phone}`}
                      >
                        <FaWhatsapp size={14} />
                      </button>
                    )}
                  </div>
                </div>
                {selectedMember.dni && (
                  <div className="bg-brand-gold/10 border border-brand-gold/30 px-3 py-2 rounded inline-block w-fit">
                    <span className="text-xs text-gray-400">DNI: </span>
                    <span className="text-brand-gold font-bold text-sm">{selectedMember.dni}</span>
                  </div>
                )}
                <span className="text-xs text-gray-500">Miembro desde {new Date(selectedMember.joinDate).toLocaleDateString('es-ES')}</span>
                <div className="mt-2">
                                <span className="text-xs text-gray-400 mr-2">Fase/Objetivo:</span>
                                <span className="font-bold text-brand-gold text-sm">
                                  {selectedMember.phase === 'volumen' && 'Volumen'}
                                  {selectedMember.phase === 'deficit' && 'Déficit'}
                                  {selectedMember.phase === 'recomposicion' && 'Recomposición corporal'}
                                  {selectedMember.phase === 'transicion' && 'Transición (volumen-défict)'}
                                </span>
                              </div>

                              {selectedMember.habitualSchedules && selectedMember.habitualSchedules.length > 0 && (
                                <div className="mt-2">
                                  <span className="text-xs text-gray-400 block mb-1">Horario habitual:</span>
                                  <div className="text-sm text-white font-semibold flex items-center gap-2">
                                    <span className="text-brand-gold">Lunes a Viernes:</span>
                                    <span>{selectedMember.habitualSchedules[0]?.start || '--:--'}</span>
                                  </div>
                                </div>
                              )}
                          </div>
                      </div>

                      <div className="mb-4 flex flex-col items-end gap-2">
                          <div className="flex gap-2">
                              <button
                                  onClick={handleOpenEditModal}
                                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-bold flex items-center gap-2 transition-colors"
                                  title="Editar datos del cliente"
                              >
                                  <Edit2 size={16} /> Editar
                              </button>
                          </div>
                          <span className={`px-4 py-2 rounded-full text-sm font-bold border ${
                              selectedMember.status === UserStatus.ACTIVE ? 'bg-green-900/30 border-green-800 text-green-400' :
                              selectedMember.status === UserStatus.DEBTOR ? 'bg-red-900/30 border-red-800 text-red-400' :
                              'bg-gray-800 border-gray-700 text-gray-400'
                          }`}>
                              {selectedMember.status === UserStatus.ACTIVE ? 'ACTIVO' : 
                               selectedMember.status === UserStatus.DEBTOR ? 'MOROSO' : 'INACTIVO'}
                          </span>
                          
                          {(selectedMember.status === UserStatus.DEBTOR || selectedMember.status === UserStatus.INACTIVE) && (
                              <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-500 mr-1">Recordar pago:</span>
                                    <button onClick={() => sendPaymentReminder('wa')} className="p-2 bg-green-900/40 text-green-400 rounded-full hover:bg-green-800 transition-colors" title="Enviar WhatsApp">
                                      <FaWhatsapp size={16} />
                                    </button>
                                    <button onClick={() => sendPaymentReminder('email')} className="p-2 bg-red-900/40 text-red-400 rounded-full hover:bg-red-800 transition-colors" title="Enviar Gmail">
                                      <SiGmail size={16} />
                                    </button>
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                  {/* Left Column: Routines & Nutrition */}
                  <div className="space-y-6">
                      
                      {/* CARD: Rutinas */}
                      <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
                          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                              <Dumbbell className="text-brand-gold" /> Rutinas Asignadas
                          </h3>
                          <div className="space-y-3">
                              {selectedMember.routines.length === 0 ? (
                                  <p className="text-gray-500 text-center py-4">No hay rutinas asignadas. Ve al Gestor de Rutinas.</p>
                              ) : (
                                  selectedMember.routines.slice().reverse().map(routine => (
                                      <div key={routine.id} className="bg-black/40 border border-gray-800 rounded-lg overflow-hidden">
                                          <div className="w-full p-4 flex justify-between items-center hover:bg-gray-800/50 transition-colors">
                                              <button 
                                                className="flex-1 text-left"
                                                onClick={() => setExpandedRoutineId(expandedRoutineId === routine.id ? null : routine.id)}
                                              >
                                                  <h4 className="font-bold text-white">{routine.name}</h4>
                                                  <p className="text-xs text-brand-gold">{routine.goal} • {new Date(routine.createdAt).toLocaleDateString()}</p>
                                              </button>
                                              
                                                <div className="flex items-center gap-2">
                                                  <button onClick={() => setExpandedRoutineId(expandedRoutineId === routine.id ? null : routine.id)} className="text-gray-400 p-2">
                                                    {expandedRoutineId === routine.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                  </button>
                                                </div>
                                          </div>
                                          
                                          {expandedRoutineId === routine.id && (
                                              <div className="p-4 border-t border-gray-800 bg-black/20 text-sm">
                                                  <div className="flex gap-2 mb-3">
                                                      {routine.days.map((d, i) => (
                                                          <button
                                                            key={i}
                                                            onClick={(e) => { e.stopPropagation(); setVisibleDayByRoutine(prev => ({ ...prev, [routine.id]: i })); }}
                                                            className={`px-3 py-1 text-sm rounded ${((visibleDayByRoutine[routine.id] ?? 0) === i) ? 'bg-brand-gold text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                                                          >
                                                              {d.dayName}
                                                          </button>
                                                      ))}
                                                  </div>

                                                  {(() => {
                                                      const idx = visibleDayByRoutine[routine.id] ?? 0;
                                                      const day = routine.days[idx];
                                                      return (
                                                          <div className="mb-3">
                                                              <h5 className="font-bold text-gray-300 mb-1">{day.dayName}</h5>
                                                              <ul className="list-disc list-inside text-gray-400 pl-2">
                                                                  {day.exercises.map(ex => (
                                                                      <li key={ex.id}>
                                                                          {ex.name} - <span className="text-gray-500">{ex.series}x{ex.reps} ({ex.weight})</span>
                                                                      </li>
                                                                  ))}
                                                              </ul>
                                                          </div>
                                                      );
                                                  })()}

                                                  <div className="mt-4 pt-3 border-t border-gray-800 flex justify-between items-center">
                                                      <div>
                                                          <button 
                                                            onClick={() => generateRoutinePDF(routine, `${selectedMember.firstName} ${selectedMember.lastName}`)}
                                                            className="text-brand-gold text-xs flex items-center gap-1 hover:underline"
                                                          >
                                                              <Download size={14} /> Descargar PDF (Rutina completa)
                                                          </button>
                                                      </div>
                                                      <div>
                                                          <button
                                                            onClick={() => {
                                                              const idx = visibleDayByRoutine[routine.id] ?? 0;
                                                              const single: Routine = { ...routine, days: routine.days.slice(idx, idx + 1) };
                                                              generateRoutinePDF(single, `${selectedMember.firstName} ${selectedMember.lastName}`);
                                                            }}
                                                            className="text-gray-300 text-xs flex items-center gap-1 hover:underline"
                                                          >
                                                              <Download size={12} /> Descargar día mostrado
                                                          </button>
                                                      </div>
                                                  </div>
                                              </div>
                                          )}
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>

                      {/* CARD: Plan Nutricional */}
                      <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Apple className="text-green-500" /> Plan Nutricional
                            </h3>
                        </div>

                        {selectedMember.nutritionPlan ? (
                            <div className="bg-black/40 border border-green-900/30 p-4 rounded-lg flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-gray-200">Plan Asignado</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Calorías: <span className="text-brand-gold">{selectedMember.nutritionPlan.calories || 'N/A'}</span>
                                    </p>
                                    <p className="text-[10px] text-gray-600 mt-1">Actualizado: {new Date(selectedMember.nutritionPlan.lastUpdated).toLocaleDateString()}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setShowNutritionDetailModal(true)}
                                        className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-full transition-colors"
                                        title="Ver Plan Completo"
                                    >
                                        <Eye size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleShareNutrition('wa')}
                                        className="p-2 bg-green-900/40 hover:bg-green-900/60 text-green-500 rounded-full transition-colors"
                                        title="Descargar PDF y Enviar por WhatsApp"
                                    >
                                        <FaWhatsapp size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleShareNutrition('email')}
                                        className="p-2 bg-red-900/40 hover:bg-red-900/60 text-red-500 rounded-full transition-colors"
                                        title="Descargar PDF y Enviar por Email"
                                    >
                                        <SiGmail size={18} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-4 text-sm">No hay plan nutricional asignado.</p>
                        )}
                      </div>

                  </div>

                  {/* Right Column: Financials */}
                  <div className="space-y-6">

                      {/* Excepciones Activas */}
                      {selectedMember.scheduleExceptions && selectedMember.scheduleExceptions.length > 0 && (
                        <div>
                          <span className="text-xs text-gray-500 uppercase font-bold tracking-wider block mb-2">Próximos cambios de horario</span>
                          <div className="space-y-1.5">
                            {selectedMember.scheduleExceptions
                              .filter(ex => new Date(ex.date) >= new Date(new Date().toDateString()))
                              .map(ex => (
                              <div key={ex.id} className="flex items-center justify-between bg-yellow-900/10 border border-yellow-800/30 rounded-lg px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle size={14} className="text-yellow-500 flex-shrink-0" />
                                  <div>
                                    <span className="text-sm text-yellow-200 font-bold">
                                      {new Date(ex.date).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </span>
                                    <span className="text-sm text-white ml-2">{ex.start} - {ex.end}</span>
                                    {ex.reason && <span className="text-xs text-gray-500 ml-2">({ex.reason})</span>}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDeleteScheduleException(ex.id)}
                                  className="text-red-500 hover:text-red-400 p-1"
                                  title="Eliminar excepción"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Historial de Asistencia */}
                      <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                  <History className="text-green-500" /> Historial de Asistencia
                              </h3>
                              <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded-full font-bold">
                                {attendanceTotal} asistencias
                              </span>
                          </div>
                          {attendanceHistory.length > 0 ? (
                            <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                              {attendanceHistory.map((record) => (
                                <div key={record.id} className="flex items-center gap-3 bg-black/40 border border-gray-800 rounded-lg px-3 py-2">
                                  <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm text-white">
                                      {new Date(record.slot?.date || record.createdAt).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </span>
                                    <span className="text-sm text-brand-gold ml-2 font-mono">
                                      {record.slot?.time || '--:--'}
                                    </span>
                                  </div>
                                  {record.accessedAt && (
                                    <span className="text-[10px] text-gray-600">
                                      Acceso: {new Date(record.accessedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-center py-4 text-sm">Sin registros de asistencia.</p>
                          )}
                      </div>
                  </div>
              </div>

              {/* === MODALS === */}

              {/* Schedule Exception Modal */}
              {showExceptionModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowExceptionModal(false)}>
                  <div className="bg-[#222] p-6 rounded-xl border border-gray-700 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-bold text-white mb-1">Cambio de Horario Puntual</h3>
                    <p className="text-xs text-gray-400 mb-4">Este cambio solo aplica para la fecha seleccionada, sin modificar el horario habitual.</p>
                    <form onSubmit={handleAddScheduleException} className="space-y-4">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Fecha</label>
                        <input
                          type="date"
                          required
                          value={exceptionForm.date}
                          onChange={e => setExceptionForm({ ...exceptionForm, date: e.target.value })}
                          className="w-full bg-black border border-gray-600 text-white p-2 rounded"
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Hora inicio</label>
                          <input
                            type="time"
                            required
                            value={exceptionForm.start}
                            onChange={e => setExceptionForm({ ...exceptionForm, start: e.target.value })}
                            className="w-full bg-black border border-gray-600 text-white p-2 rounded"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Hora fin</label>
                          <input
                            type="time"
                            required
                            value={exceptionForm.end}
                            onChange={e => setExceptionForm({ ...exceptionForm, end: e.target.value })}
                            className="w-full bg-black border border-gray-600 text-white p-2 rounded"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Motivo (opcional)</label>
                        <input
                          type="text"
                          value={exceptionForm.reason}
                          onChange={e => setExceptionForm({ ...exceptionForm, reason: e.target.value })}
                          placeholder="Ej: Cambio por turno médico"
                          className="w-full bg-black border border-gray-600 text-white p-2 rounded"
                        />
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={() => setShowExceptionModal(false)} className="px-3 py-2 text-gray-400 text-sm">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-brand-gold text-black rounded font-bold text-sm">Guardar</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
              
               {/* Payment Modal */}
              {showPaymentModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                  <div className="bg-[#222] p-6 rounded-xl border border-gray-700 w-full max-w-sm">
                    <h3 className="text-lg font-bold text-white mb-4">Registrar Pago</h3>
                    {/* Verificar si cuota mensual ya fue pagada este mes */}
                    {(() => {
                      const now = new Date();
                      const currentMonth = now.getMonth();
                      const currentYear = now.getFullYear();
                      const cuotaPagadaEsteMes = selectedMember?.payments?.some((p: any) => {
                        if (p.concept !== 'Cuota Mensual') return false;
                        const pd = new Date(p.date);
                        return pd.getMonth() === currentMonth && pd.getFullYear() === currentYear;
                      });
                      return cuotaPagadaEsteMes ? (
                        <div className="bg-green-900/20 border border-green-700 rounded-lg p-3 mb-4">
                          <p className="text-xs text-green-400 font-bold">✓ Cuota Mensual ya abonada este mes</p>
                          <p className="text-xs text-gray-400 mt-1">No se puede registrar otro pago de Cuota Mensual hasta el mes siguiente.</p>
                        </div>
                      ) : null;
                    })()}
                    <form onSubmit={handleRegisterPayment} className="space-y-4">
                      {/* Mostrar deuda anterior si existe */}
                      {previousDebt > 0 && (
                        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4">
                          <p className="text-xs text-red-400 mb-1">Deuda Acumulada</p>
                          <p className="text-2xl font-mono font-bold text-red-300">${previousDebt.toLocaleString()}</p>
                          <p className="text-xs text-gray-400 mt-1">Meses impagos anteriores</p>
                        </div>
                      )}
                      
                      <div>
                          <label className="text-xs text-gray-400 block mb-1">Concepto</label>
                          <select 
                              value={paymentConcept}
                              onChange={e => {
                                setPaymentConcept(e.target.value);
                                // Autocompletar monto según concepto
                                if (e.target.value === 'Cuota Mensual') {
                                  setPaymentAmount(monthlyFee);
                                } else if (e.target.value === 'Deuda Anterior') {
                                  setPaymentAmount(previousDebt.toString());
                                } else {
                                  setPaymentAmount('');
                                }
                              }}
                              className="w-full bg-black border border-gray-600 text-white p-2 rounded"
                          >
                              {(() => {
                                const now = new Date();
                                const currentMonth = now.getMonth();
                                const currentYear = now.getFullYear();
                                const cuotaPagada = selectedMember?.payments?.some((p: any) => {
                                  if (p.concept !== 'Cuota Mensual') return false;
                                  const pd = new Date(p.date);
                                  return pd.getMonth() === currentMonth && pd.getFullYear() === currentYear;
                                });
                                return <option disabled={!!cuotaPagada}>Cuota Mensual</option>;
                              })()}
                              <option>Deuda Anterior</option>
                              <option>Matrícula</option>
                              <option>Pase Diario</option>
                          </select>
                      </div>
                      
                      <div>
                          <label className="text-xs text-gray-400 block mb-1">Monto ($)</label>
                          <input 
                              type="number"
                              required
                              value={paymentAmount}
                              onChange={e => setPaymentAmount(e.target.value)}
                              className="w-full bg-black border border-gray-600 text-white p-2 rounded font-mono text-lg"
                          />
                          {paymentConcept === 'Cuota Mensual' && (
                            <p className="text-xs text-gray-500 mt-1">
                              Cuota configurada: ${Number(monthlyFee).toLocaleString()}
                            </p>
                          )}
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                          <button type="button" onClick={() => setShowPaymentModal(false)} className="px-3 py-2 text-gray-400 text-sm">Cancelar</button>
                          <button type="submit" className="px-4 py-2 bg-brand-gold text-black rounded font-bold text-sm">Confirmar</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Nutrition Detail Modal */}
              {showNutritionDetailModal && selectedMember.nutritionPlan && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-[#151515] border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
                        <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-[#1a1a1a] rounded-t-xl">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Apple className="text-green-500" /> Plan Nutricional
                                </h3>
                                <p className="text-xs text-gray-400 mt-1">Objetivo: <span className="text-brand-gold font-bold">{selectedMember.nutritionPlan.calories || 'N/A'} kcal</span></p>
                            </div>
                            <button onClick={() => setShowNutritionDetailModal(false)} className="text-gray-400 hover:text-white p-1">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
                            <NutritionSection title="Desayuno" icon={<Coffee size={16} className="text-orange-400"/>} items={selectedMember.nutritionPlan.breakfast} />
                            <NutritionSection title="Media Mañana" icon={<Sun size={16} className="text-yellow-400"/>} items={selectedMember.nutritionPlan.morningSnack} />
                            <NutritionSection title="Almuerzo" icon={<Utensils size={16} className="text-red-400"/>} items={selectedMember.nutritionPlan.lunch} />
                            <NutritionSection title="Merienda" icon={<Coffee size={16} className="text-amber-600"/>} items={selectedMember.nutritionPlan.afternoonSnack} />
                            <NutritionSection title="Cena" icon={<Moon size={16} className="text-blue-400"/>} items={selectedMember.nutritionPlan.dinner} />

                            {/* Sección de Suplementación */}
                            <div className="bg-black/30 border border-green-900/30 rounded-lg p-4">
                              <h4 className="text-sm font-bold text-green-400 flex items-center gap-2 mb-3">
                                <FileSpreadsheet size={16} className="text-green-400" /> Suplementación
                              </h4>
                              {selectedMember.nutritionPlan.supplements && selectedMember.nutritionPlan.supplements.length > 0 ? (
                                <ul className="space-y-1.5 pl-2">
                                  {selectedMember.nutritionPlan.supplements.map((supp, idx) => (
                                    <li key={idx} className="text-green-200 text-sm flex items-start gap-2">
                                      <span className="mt-1.5 w-1 h-1 bg-brand-gold rounded-full flex-shrink-0"></span>
                                      {supp}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-gray-600 text-xs italic">Sin suplementos asignados</p>
                              )}
                              {selectedMember.nutritionPlan.supplementNotes && (
                                <div className="mt-3">
                                  <h5 className="text-xs uppercase font-bold text-gray-500 mb-1">Observaciones</h5>
                                  <p className="text-green-200 text-xs whitespace-pre-line italic">{selectedMember.nutritionPlan.supplementNotes}</p>
                                </div>
                              )}
                            </div>

                            {/* Notas generales */}
                            {selectedMember.nutritionPlan.notes && (
                                <div className="bg-gray-800/20 border border-gray-700 rounded-lg p-4">
                                    <h4 className="text-xs uppercase font-bold text-gray-500 mb-2">Notas generales</h4>
                                    <p className="text-gray-300 text-sm whitespace-pre-line italic">{selectedMember.nutritionPlan.notes}</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-700 bg-[#1a1a1a] rounded-b-xl flex justify-end gap-3">
                            <button 
                              onClick={() => handleShareNutrition('wa')}
                              className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition"
                            >
                              <FaWhatsapp /> Descargar y Enviar
                            </button>
                            <button 
                                onClick={() => setShowNutritionDetailModal(false)} 
                                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
              )}

              {/* Edit Member Modal */}
              {showEditModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={() => setShowEditModal(false)}>
                  <div className="w-full max-w-4xl bg-[#0f0f0f] rounded-2xl border border-gray-700 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-brand-gold/40 scrollbar-track-gray-900" onClick={e => e.stopPropagation()}>
                    <div className="flex items-start justify-between px-6 py-4 border-b border-gray-700">
                      <div>
                        <p className="text-sm uppercase tracking-widest text-gray-500 font-semibold">Editar horario y datos</p>
                        <h3 className="text-2xl font-bold text-white mt-1">Cliente</h3>
                        <p className="text-xs text-gray-400 mt-2">Horario habitual solo de lunes a viernes. Sábados quedan libres y domingos no se muestran.</p>
                      </div>
                      <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800">
                        <X size={20} />
                      </button>
                    </div>

                    <form onSubmit={handleSaveEditMember} className="flex flex-col flex-1">
                      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <label className="block">
                              <span className="text-xs text-gray-400 mb-1 block">Fase/Objetivo</span>
                              <select
                                value={editMember.phase}
                                onChange={e => setEditMember({ ...editMember, phase: e.target.value as any })}
                                className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-brand-gold/60 focus:border-brand-gold/60"
                              >
                                <option value="volumen">Volumen</option>
                                <option value="deficit">Déficit</option>
                                <option value="recomposicion">Recomposición corporal</option>
                                <option value="transicion">Transición (volumen-défict)</option>
                              </select>
                            </label>

                            <label className="block">
                              <span className="text-xs text-gray-400 mb-1 block">Nombre</span>
                              <input
                                type="text"
                                required
                                value={editMember.firstName}
                                onChange={e => {
                                  let val = e.target.value.normalize('NFD').replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g, '');
                                  setEditMember({ ...editMember, firstName: val });
                                }}
                                className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-brand-gold/60 focus:border-brand-gold/60 placeholder:text-gray-500"
                                placeholder="Nombre"
                                inputMode="text"
                                autoComplete="off"
                              />
                            </label>

                            <label className="block">
                              <span className="text-xs text-gray-400 mb-1 block">Apellido</span>
                              <input
                                type="text"
                                required
                                value={editMember.lastName}
                                onChange={e => {
                                  let val = e.target.value.normalize('NFD').replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g, '');
                                  setEditMember({ ...editMember, lastName: val });
                                }}
                                className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-brand-gold/60 focus:border-brand-gold/60 placeholder:text-gray-500"
                                placeholder="Apellido"
                                inputMode="text"
                                autoComplete="off"
                              />
                            </label>

                            <label className="block">
                              <span className="text-xs text-gray-400 mb-1 block">DNI</span>
                              <input
                                type="text"
                                required
                                value={editMember.dni}
                                onChange={e => {
                                  let val = e.target.value.replace(/\D/g, '');
                                  if (val.length > 8) val = val.slice(0, 8);
                                  setEditMember({ ...editMember, dni: val });
                                }}
                                className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-brand-gold/60 focus:border-brand-gold/60 placeholder:text-gray-500"
                                placeholder="DNI"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                autoComplete="off"
                              />
                            </label>
                          </div>

                          <div className="space-y-3">
                            <label className="block">
                              <span className="text-xs text-gray-400 mb-1 block">Email</span>
                              <input
                                type="email"
                                required
                                value={editMember.email}
                                onChange={e => setEditMember({ ...editMember, email: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-brand-gold/60 focus:border-brand-gold/60 placeholder:text-gray-500"
                                placeholder="Email"
                                inputMode="email"
                                autoComplete="off"
                              />
                            </label>

                            <label className="block">
                              <span className="text-xs text-gray-400 mb-1 block">Teléfono</span>
                              <input
                                type="text"
                                required
                                value={editMember.phone}
                                onChange={e => {
                                  let val = e.target.value.replace(/\D/g, '');
                                  setEditMember({ ...editMember, phone: val });
                                }}
                                className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-brand-gold/60 focus:border-brand-gold/60 placeholder:text-gray-500"
                                placeholder="Teléfono"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                autoComplete="off"
                              />
                            </label>

                            <label className="block">
                              <span className="text-xs text-gray-400 mb-1 block">Estado</span>
                              <select 
                                value={editMember.status}
                                onChange={e => setEditMember({...editMember, status: e.target.value as UserStatus})}
                                className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-brand-gold/60 focus:border-brand-gold/60"
                              >
                                <option value={UserStatus.ACTIVE}>Activo</option>
                                <option value={UserStatus.DEBTOR}>Moroso</option>
                                <option value={UserStatus.INACTIVE}>Inactivo</option>
                              </select>
                            </label>
                          </div>
                        </div>

                        <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-5 space-y-4">
                          <div className="flex flex-col gap-1">
                            <h4 className="text-lg font-bold text-white">Horarios habituales</h4>
                            <p className="text-sm text-gray-400">Selecciona días hábiles y un único rango de hora de entrada y salida.</p>
                          </div>

                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="md:col-span-2">
                              <p className="text-xs uppercase text-gray-500 font-semibold mb-2">Días (Lunes a Viernes)</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {WEEKDAY_OPTIONS.map(day => (
                                  <label key={day} className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition ${selectedScheduleDays[day] ? 'bg-brand-gold/10 border-brand-gold/60' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}>
                                    <input
                                      type="checkbox"
                                      checked={!!selectedScheduleDays[day]}
                                      onChange={() => handleScheduleDayToggle(day)}
                                      className="form-checkbox h-4 w-4 text-brand-gold focus:ring-brand-gold"
                                    />
                                    <span className="text-white text-sm">{day}</span>
                                  </label>
                                ))}
                              </div>
                              <p className="text-xs text-gray-500 mt-2">Sábados quedan libres para recuperación y domingos no se muestran.</p>
                            </div>

                            <div className="bg-black/50 border border-gray-800 rounded-lg p-4 space-y-3">
                              <p className="text-xs uppercase text-gray-500 font-semibold">Rango habitual</p>
                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <TimeDropdown value={scheduleRange.start} onChange={val => handleScheduleRangeChange('start', val)} label="Inicio" />
                                </div>
                                <span className="text-gray-500 text-sm">a</span>
                                <div className="flex-1">
                                  <TimeDropdown value={scheduleRange.end} onChange={val => handleScheduleRangeChange('end', val)} label="Fin" />
                                </div>
                              </div>
                              <p className="text-xs text-gray-500">Se aplica el mismo rango a todos los días seleccionados.</p>
                            </div>
                          </div>

                          {scheduleError && (
                            <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-lg px-3 py-2">
                              {scheduleError}
                            </div>
                          )}

                          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex flex-col gap-2">
                            <p className="text-xs uppercase text-gray-500 font-semibold">Resumen</p>
                            <div className="flex flex-wrap gap-2">
                              {editMember.habitualSchedules && editMember.habitualSchedules.length > 0 ? (
                                editMember.habitualSchedules.map(sch => (
                                  <span key={sch.day} className="px-3 py-2 rounded-full bg-brand-gold/10 text-brand-gold text-sm border border-brand-gold/40">
                                    {sch.day}: {sch.start} - {sch.end}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-500 text-sm">Sin horarios asignados</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="px-6 py-4 border-t border-gray-700 bg-[#0f0f0f] flex flex-col gap-2 md:flex-row md:items-center md:justify-end md:gap-3">
                        <button type="button" onClick={() => setShowEditModal(false)} className="w-full md:w-auto px-4 py-3 rounded-lg text-gray-300 bg-gray-800 hover:bg-gray-700 font-semibold transition">Cancelar</button>
                        <button type="submit" className="w-full md:w-auto px-5 py-3 rounded-lg bg-brand-gold text-black font-bold hover:bg-yellow-500 transition shadow-lg">Guardar cambios</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Camera Modal */}
              {showCameraModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                  <div className="bg-[#0b0b0b] p-6 rounded-xl border border-gray-800 w-full max-w-md">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-white">{t('capturarFoto')}</h3>
                      <button 
                        onClick={() => { setShowCameraModal(false); stopCamera(); }} 
                        className="text-gray-400 hover:text-white"
                      >
                        <X size={24} />
                      </button>
                    </div>
                    
                    <div className="bg-black rounded-lg overflow-hidden mb-4">
                      <video 
                        ref={videoRef} 
                        className="w-full aspect-video object-cover"
                        playsInline
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowCameraModal(false); stopCamera(); }}
                        className="flex-1 px-4 py-2 text-gray-400 hover:text-white border border-gray-700 rounded"
                      >
                        {t('cancelar')}
                      </button>
                      <button
                        onClick={capturePhoto}
                        className="flex-1 px-4 py-2 bg-brand-gold text-black font-bold rounded hover:bg-yellow-500"
                      >
                        <Camera size={18} className="inline mr-2" /> {t('capturar')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        }

  // --- LIST VIEW (Default) ---

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-display font-bold text-white">Directorio de Socios</h2>
        <button 
          onClick={handleOpenAddModal}
          className="bg-brand-gold text-black px-6 py-2 rounded-lg font-bold hover:bg-yellow-500 transition flex items-center gap-2"
        >
          <Plus size={20} /> Nuevo Socio
        </button>
      </div>

      {/* Stats + Filters */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div onClick={() => setStatusFilter(null)} className={`p-4 rounded-lg border cursor-pointer ${statusFilter===null ? 'border-brand-gold bg-[#2a2a2a]' : 'border-gray-800 bg-[#111]'}`}>
            <p className="text-xs text-gray-400">Todos</p>
            <p className="text-2xl font-bold text-white">{totalCount}</p>
          </div>
          <div onClick={() => setStatusFilter('current')} className={`p-4 rounded-lg border cursor-pointer ${statusFilter==='current' ? 'border-green-500 bg-[#052e1a]' : 'border-gray-800 bg-[#111]'}`}>
            <p className="text-xs text-gray-400">Al Día</p>
            <p className="text-2xl font-bold text-green-400">{alDiaCount}</p>
          </div>
          <div onClick={() => setStatusFilter('debtor')} className={`p-4 rounded-lg border cursor-pointer ${statusFilter==='debtor' ? 'border-red-500 bg-[#2a0b0b]' : 'border-gray-800 bg-[#111]'}`}>
            <p className="text-xs text-gray-400">Morosos</p>
            <p className="text-2xl font-bold text-red-400">{debtorsCount}</p>
          </div>
          <div onClick={() => setStatusFilter('dueSoon')} className={`p-4 rounded-lg border cursor-pointer ${statusFilter==='dueSoon' ? 'border-yellow-500 bg-[#2a220b]' : 'border-gray-800 bg-[#111]'}`}>
            <p className="text-xs text-gray-400">Próx. a Vencer</p>
            <p className="text-2xl font-bold text-yellow-300">{dueSoonCount}</p>
          </div>
          <div onClick={() => setStatusFilter('inactive')} className={`p-4 rounded-lg border cursor-pointer ${statusFilter==='inactive' ? 'border-gray-500 bg-[#151515]' : 'border-gray-800 bg-[#111]'}`}>
            <p className="text-xs text-gray-400">Inactivos</p>
            <p className="text-2xl font-bold text-gray-300">{inactiveCount}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800 flex items-center gap-3">
          <Search className="text-gray-500" size={20} />
          <input 
            type="text" 
            placeholder="Buscar socio..." 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-transparent border-none focus:outline-none text-white w-full"
          />
        </div>

        {/* Filter Pills */}
        <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800">
          <p className="text-xs uppercase text-gray-500 font-bold mb-3 tracking-wider">Filtrar por estado:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter(null)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                statusFilter === null
                  ? 'bg-brand-gold text-black'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('current')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                statusFilter === 'current'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Al Día
            </button>
            <button
              onClick={() => setStatusFilter('debtor')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                statusFilter === 'debtor'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Morosos
            </button>
            <button
              onClick={() => setStatusFilter('dueSoon')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                statusFilter === 'dueSoon'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Próximo a Vencer
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                statusFilter === 'inactive'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Inactivos
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black text-gray-400 text-sm uppercase tracking-wider">
                <th className="p-4">Socio</th>
                <th className="p-4 hidden md:table-cell">Contacto</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredMembers.map(member => (
                <tr 
                    key={member.id} 
                    onClick={() => handleMemberClick(member)}
                    className="hover:bg-gray-900 transition-colors cursor-pointer group"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-700">
                             {member.photoUrl ? (
                                 <img src={member.photoUrl} alt="" className="w-full h-full object-cover" />
                             ) : (
                                 <span className="text-lg">🦁</span>
                             )}
                        </div>
                        {toast && (
                            <Toast message={toast.message} type={toast.type} duration={3500} onClose={() => setToast(null)} />
                        )}
                        <div>
                            <div className="font-bold text-white group-hover:text-brand-gold transition-colors">{member.firstName} {member.lastName}</div>
                            <div className="text-xs text-gray-500">Desde: {new Date(member.joinDate).toLocaleDateString()}</div>
                        </div>
                    </div>
                  </td>
                  <td className="p-4 hidden md:table-cell text-gray-300">
                    <div>{member.email}</div>
                    <div className="text-xs">{member.phone}</div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${member.status === UserStatus.INACTIVE ? 'bg-gray-700 text-gray-300' :
                        isCurrentOnPayment(member) ? 'bg-green-900 text-green-200' : 
                        isDebtorByPayment(member) ? 'bg-red-900 text-red-200' : 'bg-yellow-900 text-yellow-200'}`}>
                      {member.status === UserStatus.INACTIVE ? t('inactivo') :
                       isCurrentOnPayment(member) ? t('alDia') : 
                       isDebtorByPayment(member) ? t('moroso') : t('pendiente')}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2" onClick={e => e.stopPropagation()}>
                    <button 
                        onClick={(e) => toggleStatus(e, member.id, member.status)}
                        className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded transition" 
                        title={t('cambiarEstado')}
                    >
                        <Clock size={16} />
                    </button>
                    {isDebtorByPayment(member) && (
                      <button
                        className="p-2 text-green-400 hover:text-green-300 bg-green-900/20 hover:bg-green-900/40 rounded transition"
                        title={t('notificarDeuda')}
                        onClick={(e) => {
                          e.stopPropagation();
                          const msgText = t('mensajeWhatsapp').replace('{nombre}', member.firstName);
                          const phone = member.phone.replace(/\D/g, '').replace(/^0/, '');
                          const waPhone = phone.startsWith('54') ? phone : `549${phone}`;
                          const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(msgText)}`;
                          window.open(url, '_blank');
                        }}
                      >
                        <FaWhatsapp size={16} />
                      </button>
                    )}
                    <button
                      className="p-2 text-blue-400 hover:text-blue-300 bg-blue-900/20 hover:bg-blue-900/40 rounded transition"
                      title="Editar"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMember(member);
                        setEditMember({
                          firstName: member.firstName,
                          lastName: member.lastName,
                          dni: member.dni || '',
                          email: member.email,
                          phone: member.phone,
                          status: member.status,
                          phase: member.phase || 'volumen',
                          habitualSchedules: member.habitualSchedules ? [...member.habitualSchedules] : []
                        });
                        setShowEditModal(true);
                      }}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="p-2 text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 rounded transition"
                      title="Eliminar"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMember(member.id, `${member.firstName} ${member.lastName}`);
                      }}
                    >
                      <X size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredMembers.length === 0 && (
            <div className="p-8 text-center text-gray-500">{t('noSocios')}</div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-[#1a1a1a] p-6 rounded-xl w-full max-w-lg border border-gray-700" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">{t('registrarSocio')}</h3>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input 
                  required
                  placeholder={t('nombre')} 
                  value={newMember.firstName}
                  onChange={e => setNewMember({...newMember, firstName: e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g,'')})}
                  className="bg-black border border-gray-700 p-3 rounded text-white"
                />
                <input 
                  required
                  placeholder={t('apellido')} 
                  value={newMember.lastName}
                  onChange={e => setNewMember({...newMember, lastName: e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g,'')})}
                  className="bg-black border border-gray-700 p-3 rounded text-white"
                />
              </div>
              <input 
                type="text"
                required
                placeholder={t('dniRequerido')} 
                value={newMember.dni}
                onChange={e => setNewMember({...newMember, dni: e.target.value.replace(/\D/g,'').slice(0,8)})}
                className="w-full bg-black border border-gray-700 p-3 rounded text-white"
              />
              <input 
                type="email"
                placeholder={t('email')} 
                value={newMember.email}
                onChange={e => setNewMember({...newMember, email: e.target.value})}
                className="w-full bg-black border border-gray-700 p-3 rounded text-white"
              />
              <input 
                placeholder={t('telefonoEjemplo')} 
                value={newMember.phone}
                onChange={e => setNewMember({...newMember, phone: e.target.value.replace(/\D/g,'')})}
                className="w-full bg-black border border-gray-700 p-3 rounded text-white"
              />
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-400 hover:text-white">{t('cancelar')}</button>
                <button type="submit" className="px-6 py-2 bg-brand-gold text-black font-bold rounded hover:bg-yellow-500">{t('guardar')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-[#232323] rounded-lg shadow-lg p-8 max-w-sm w-full">
            <h2 className="text-lg font-bold text-white mb-2">¿Eliminar socio?</h2>
            <p className="text-gray-300 mb-6">¿Está seguro que desea eliminar a <span className="font-bold text-brand-gold">{deleteConfirm.name}</span>? Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded bg-gray-700 text-gray-200 hover:bg-gray-600 transition">Cancelar</button>
              <button onClick={confirmDeleteMember} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 font-bold transition">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const NutritionSection = ({ title, icon, items }: { title: string, icon: any, items: string[] }) => (
  <div className="bg-black/30 border border-gray-800 rounded-lg p-4">
    <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
      {icon} {title}
    </h4>
    {items && items.length > 0 ? (
      <ul className="space-y-1.5 pl-2">
        {items.map((item, idx) => (
          <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
            <span className="mt-1.5 w-1 h-1 bg-brand-gold rounded-full flex-shrink-0"></span>
            {item}
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-gray-600 text-xs italic">Sin asignar</p>
    )}
  </div>
);

// export default Members; // Eliminado duplicado

export default Members;