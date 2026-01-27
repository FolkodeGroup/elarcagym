import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { db } from '../services/db';
import { Member, UserStatus, Routine } from '../types';
import { isCurrentOnPayment, isDebtorByPayment, isPaymentDueSoon } from '../services/membershipUtils';
import { 
    Search, Plus, Clock, ArrowLeft, Camera, CreditCard, Dumbbell, 
    ChevronDown, ChevronUp, Download, Edit2, Mail, Phone, X, 
    FileSpreadsheet, Apple, Eye, Share2, Coffee, Sun, Utensils, Moon 
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { SiGmail } from 'react-icons/si';
import Toast from '../components/Toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_BASE64 } from '../services/assets';
import * as XLSX from 'xlsx';

interface MembersProps {
  initialFilter?: string | null;
}

const Members: React.FC<MembersProps> = ({ initialFilter }) => {
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
  // Nuevo Modal de Nutrición
  const [showNutritionDetailModal, setShowNutritionDetailModal] = useState(false);

  // Camera refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // File Input Ref for Import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data for selected member
  const [expandedRoutineId, setExpandedRoutineId] = useState<string | null>(null);
  const [visibleDayByRoutine, setVisibleDayByRoutine] = useState<Record<string, number>>({});

  // New Member Form State
  const [newMember, setNewMember] = useState({
    firstName: '',
    lastName: '',
    dni: '',
    email: '',
    phone: '',
    status: UserStatus.ACTIVE,
    phase: 'volumen',
    habitualSchedules: [] as { day: string; start: string; end: string }[]
  });

  // Edit Member Form State
  const [editMember, setEditMember] = useState({
    firstName: '',
    lastName: '',
    dni: '',
    email: '',
    phone: '',
    status: UserStatus.ACTIVE,
    phase: 'volumen',
    habitualSchedules: [] as { day: string; start: string; end: string }[]
  });

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentConcept, setPaymentConcept] = useState(t('cuotaMensual'));
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    refreshMembers();
  }, []);

  const refreshMembers = () => {
    setMembers([...db.getMembers()]);
    if(selectedMember) {
        const updated = db.getMembers().find(m => m.id === selectedMember.id);
        if(updated) {
            setSelectedMember(updated);
        }
    }
  };

  const handleMemberClick = (member: Member) => {
      setSelectedMember(member);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    db.addMember({
      ...newMember,
      phase: newMember.phase as any,
      habitualSchedules: newMember.habitualSchedules
    });
    setShowAddModal(false);
    setNewMember({ firstName: '', lastName: '', dni: '', email: '', phone: '', status: UserStatus.ACTIVE, phase: 'volumen', habitualSchedules: [] });
    refreshMembers();
    setToast({ message: t('cambiosGuardados'), type: 'success' });
  };

  // --- IMPORTACION MASIVA ---
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const formattedData = data.map((row: any) => ({
          firstName: row['Nombre'] || row['Nombres'] || '',
          lastName: row['Apellido'] || row['Apellidos'] || '',
          dni: row['DNI'] || row['Documento'] || '',
          email: row['Email'] || row['Correo'] || '',
          phone: row['Telefono'] || row['Celular'] || '',
        }));

        const count = db.bulkCreateMembers(formattedData);
        
        setToast({ 
          message: `Se importaron ${count} socios correctamente.`, 
          type: 'success' 
        });
        refreshMembers();
      } catch (error) {
        console.error("Error al importar:", error);
        setToast({ 
          message: 'Error al leer el archivo. Verifica el formato.', 
          type: 'error' 
        });
      }
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.files && e.target.files[0] && selectedMember) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64 = reader.result as string;
              db.updateMemberPhoto(selectedMember.id, base64);
              refreshMembers();
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

  const capturePhoto = () => {
    if (!videoRef.current || !selectedMember) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg');
    db.updateMemberPhoto(selectedMember.id, dataUrl);
    stopCamera();
    setShowCameraModal(false);
    refreshMembers();
    setToast({ message: t('fotoCapturada'), type: 'success' });
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleRegisterPayment = (e: React.FormEvent) => {
      e.preventDefault();
      if(selectedMember) {
          db.addMemberPayment(selectedMember.id, Number(paymentAmount), paymentConcept, 'Efectivo');
          setShowPaymentModal(false);
          setPaymentAmount('');
          refreshMembers();
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

  const handleSaveEditMember = (e: React.FormEvent) => {
      e.preventDefault();
      if(selectedMember) {
          db.updateMember(selectedMember.id, {
            ...editMember,
            phase: editMember.phase as any,
            habitualSchedules: editMember.habitualSchedules
          });
          setShowEditModal(false);
          refreshMembers();
      }
  };

  const toggleStatus = (e: React.MouseEvent, id: string, currentStatus: UserStatus) => {
     e.stopPropagation();
     const newStatus = currentStatus === UserStatus.ACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE;
     db.updateMemberStatus(id, newStatus);
     refreshMembers();
  };

  const normalizeText = (text: string) => {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  };

  const filteredMembers = members.filter(m => {
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

  const totalCount = members.length;
  const alDiaCount = members.filter(m => isCurrentOnPayment(m)).length;
  const debtorsCount = members.filter(m => isDebtorByPayment(m)).length;
  const dueSoonCount = members.filter(m => isPaymentDueSoon(m)).length;
  const inactiveCount = members.filter(m => m.status === UserStatus.INACTIVE).length;

  // --- MESSAGING & PDF HELPERS ---

  const formatPhoneNumber = (phone: string) => {
      const clean = phone.replace(/\D/g, '');
      if (clean.startsWith('549')) return clean;
      if (clean.startsWith('54')) return '549' + clean.substring(2);
      const noZero = clean.startsWith('0') ? clean.substring(1) : clean;
      return `549${noZero}`;
  };

  // --- NUTRITION SHARING LOGIC ---
  const handleShareNutrition = (method: 'wa' | 'email') => {
    if(!selectedMember?.nutritionPlan) {
        setToast({ message: 'El socio no tiene un plan nutricional asignado.', type: 'error' });
        return;
    }

    const plan = selectedMember.nutritionPlan;
    
    // Helper para formatear listas
    const formatList = (items: string[]) => {
        if (!items || items.length === 0) return ' -';
        return items.map(i => `• ${i}`).join('\n');
    };

    const msgText = `🍎 *PLAN NUTRICIONAL - EL ARCA GYM* 🍎\n
Objetivo Calórico: ${plan.calories || 'No especificado'}
----------------------------------
☕ *Desayuno:* 
${formatList(plan.breakfast)}
----------------------------------
☀️ *Media Mañana:* 
${formatList(plan.morningSnack)}
----------------------------------
🍛 *Almuerzo:* 
${formatList(plan.lunch)}
----------------------------------
🥪 *Merienda:* 
${formatList(plan.afternoonSnack)}
----------------------------------
🌙 *Cena:* 
${formatList(plan.dinner)}
----------------------------------
📝 *Notas:* ${plan.notes || '-'}

¡A darle duro! 💪`;

    if (method === 'wa') {
        const phone = formatPhoneNumber(selectedMember.phone);
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(msgText)}`;
        window.open(url, '_blank');
        setToast({ message: 'Abriendo WhatsApp...', type: 'success' });
    } else {
        const url = `mailto:${selectedMember.email}?subject=Tu Plan Nutricional - El Arca Gym&body=${encodeURIComponent(msgText)}`;
        window.open(url, '_blank');
        setToast({ message: 'Abriendo cliente de correo...', type: 'success' });
    }
  };

  const generateRoutinePDF = (routine: Routine, memberName: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.1 })); 
    const imgSize = 100;
    const xCentered = (pageWidth - imgSize) / 2;
    const yCentered = (pageHeight - imgSize) / 2;
    try {
        doc.addImage(LOGO_BASE64, 'JPEG', xCentered, yCentered, imgSize, imgSize);
    } catch(e) {}
    doc.restoreGraphicsState();

    const addBackgroundLogo = () => {
        doc.saveGraphicsState();
        doc.setGState(new (doc as any).GState({ opacity: 0.08 })); 
        const imgSize = pageHeight * 0.8;
        const xCentered = (pageWidth - imgSize) / 2;
        const yCentered = (pageHeight - imgSize) / 2;
        try {
            doc.addImage(LOGO_BASE64, 'JPEG', xCentered, yCentered, imgSize, imgSize);
        } catch(e) {}
        doc.restoreGraphicsState();
    };

    doc.setFillColor(26, 26, 26); 
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    addBackgroundLogo();

    doc.setFillColor(212, 175, 55); 
    doc.rect(0, 0, pageWidth, 3, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(30);
    doc.setTextColor(212, 175, 55); 
    doc.text("¡¡¡A ENTRENAR!!!", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255); 
    doc.text(routine.name.toUpperCase(), pageWidth / 2, 30, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(180, 180, 180); 
    doc.text("EL ARCA - GYM & FITNESS", pageWidth / 2, 38, { align: "center" });
    doc.setTextColor(255, 255, 255);

    let finalY = 45;

    routine.days.forEach((day) => {
        const bodyRows = day.exercises.map(ex => [
            `• ${ex.name.toUpperCase()}${ex.notes ? `\n  (${ex.notes})` : ''}`, 
            `${ex.series} X ${ex.reps}${ex.weight !== 'N/A' && ex.weight ? `, ${ex.weight}` : ''}`
        ]);

        autoTable(doc, {
            startY: finalY,
            head: [[day.dayName.toUpperCase(), "SERIES / REPETICIONES / CARGA"]],
            body: bodyRows,
            theme: 'plain', 
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
            willDrawCell: function(data) {
                const cell = data.cell;
                if (cell.section === 'head') {
                    doc.saveGraphicsState();
                    try {
                        doc.setGState(new (doc as any).GState({ opacity: 0.95 }));
                    } catch (e) { }
                    doc.setFillColor(212, 175, 55);
                    doc.rect(cell.x, cell.y, cell.width, cell.height, 'F');
                    doc.restoreGraphicsState();
                }
            },
            didDrawCell: function(data) {
                const cell = data.cell;
                if (cell.section === 'body') {
                    doc.setDrawColor(80, 80, 80);
                    doc.setLineWidth(0.3);
                    doc.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height);
                    doc.line(cell.x + cell.width, cell.y, cell.x + cell.width, cell.y + cell.height);
                }
                if (cell.section === 'head') {
                    doc.setTextColor(0, 0, 0);
                }
            }
        });

        finalY = (doc as any).lastAutoTable.finalY + 10;
        
        if (finalY > pageHeight - 30) {
            doc.addPage();
            doc.setFillColor(26, 26, 26); 
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            addBackgroundLogo();
            doc.setFillColor(212, 175, 55);
            doc.rect(0, 0, pageWidth, 3, 'F');
            finalY = 20;
            doc.saveGraphicsState();
            doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
            try {
                doc.addImage(LOGO_BASE64, 'JPEG', xCentered, yCentered, imgSize, imgSize);
            } catch(e) {}
            doc.restoreGraphicsState();
        }
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(212, 175, 55);
        doc.rect(0, pageHeight - 5, pageWidth, 5, 'F');
        doc.setFontSize(8);
        doc.setTextColor(212, 175, 55); 
        doc.text(`Entrenador: ${routine.assignedBy || 'El Arca'} - Socio: ${memberName}`, 10, pageHeight - 8);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 30, pageHeight - 8);
    }

    const fileName = `Rutina_${memberName.replace(/\s+/g, '_')}_${routine.name.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
    return fileName;
  };

  const handleShareRoutine = (e: React.MouseEvent, method: 'whatsapp' | 'email', routine: Routine) => {
      e.stopPropagation();
      if(!selectedMember) return;

      setToast({ message: `⏳ Generando y descargando PDF para ${method === 'whatsapp' ? 'WhatsApp' : 'Email'}. Adjunta el archivo descargado en el mensaje.`, type: 'info' });
      generateRoutinePDF(routine, `${selectedMember.firstName} ${selectedMember.lastName}`);

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

  if (selectedMember) {
      // DETAIL VIEW
      return (
          <div className="space-y-6">
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
                              <label className="bg-brand-gold text-black p-2 rounded-full cursor-pointer hover:bg-yellow-500 transition-colors shadow-lg">
                                  <Camera size={18} title="Subir foto" />
                                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                              </label>
                              <button 
                                onClick={() => { setShowCameraModal(true); startCamera(); }}
                                className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors shadow-lg"
                                title="Tomar foto con cámara"
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
                                  <span className="flex items-center gap-1"><Mail size={14} /> {selectedMember.email}</span>
                                  <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                                  <span className="flex items-center gap-1"><Phone size={14} /> {selectedMember.phone}</span>
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
                                  <span className="text-xs text-gray-400 block mb-1">Horarios habituales:</span>
                                  <ul className="text-sm text-white">
                                    {selectedMember.habitualSchedules.map((sch, idx) => (
                                      <li key={idx} className="mb-1">
                                        <span className="font-semibold text-brand-gold">{sch.day}:</span> {sch.start} - {sch.end}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                          </div>
                      </div>

                      {/* Status & Actions */}
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                                  <button 
                                                    onClick={(e) => handleShareRoutine(e, 'whatsapp', routine)}
                                                    className="p-2 text-green-500 hover:bg-green-900/30 rounded-full transition-colors" 
                                                    title="Enviar PDF por WhatsApp"
                                                  >
                                                      <FaWhatsapp size={18} />
                                                  </button>
                                                  <button 
                                                    onClick={(e) => handleShareRoutine(e, 'email', routine)}
                                                    className="p-2 text-red-500 hover:bg-red-900/30 rounded-full transition-colors" 
                                                    title="Enviar PDF por Gmail"
                                                  >
                                                      <SiGmail size={18} />
                                                  </button>
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
                                        title="Enviar por WhatsApp"
                                    >
                                        <FaWhatsapp size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleShareNutrition('email')}
                                        className="p-2 bg-red-900/40 hover:bg-red-900/60 text-red-500 rounded-full transition-colors"
                                        title="Enviar por Email"
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
                      {/* Membership Payments */}
                      <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6 h-full">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                  <CreditCard className="text-brand-gold" /> Pagos de Membresía
                              </h3>
                              <button 
                                onClick={() => setShowPaymentModal(true)}
                                className="text-xs bg-gray-800 hover:bg-brand-gold hover:text-black text-white px-3 py-1 rounded transition-colors"
                              >
                                  + Registrar Pago
                              </button>
                          </div>
                          <div className="overflow-y-auto">
                              <table className="w-full text-sm">
                                  <thead className="text-gray-500 border-b border-gray-800">
                                      <tr>
                                          <th className="text-left py-2">Fecha</th>
                                          <th className="text-left py-2">Concepto</th>
                                          <th className="text-right py-2">Monto</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-800">
                                      {selectedMember.payments.slice().reverse().map(pay => (
                                          <tr key={pay.id}>
                                              <td className="py-2 text-gray-300">{new Date(pay.date).toLocaleDateString()}</td>
                                              <td className="py-2 text-gray-400">{pay.concept}</td>
                                              <td className="py-2 text-right font-mono text-brand-gold">${pay.amount}</td>
                                          </tr>
                                      ))}
                                      {selectedMember.payments.length === 0 && (
                                          <tr><td colSpan={3} className="text-center py-4 text-gray-600">Sin historial de pagos</td></tr>
                                      )}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  </div>
              </div>

              {/* === MODALS === */}
              
               {/* Payment Modal */}
              {showPaymentModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                  <div className="bg-[#222] p-6 rounded-xl border border-gray-700 w-full max-w-sm">
                    <h3 className="text-lg font-bold text-white mb-4">Registrar Pago</h3>
                    <form onSubmit={handleRegisterPayment} className="space-y-4">
                      <div>
                          <label className="text-xs text-gray-400 block mb-1">Monto ($)</label>
                          <input 
                              type="number"
                              required
                              autoFocus
                              value={paymentAmount}
                              onChange={e => setPaymentAmount(e.target.value)}
                              className="w-full bg-black border border-gray-600 text-white p-2 rounded"
                          />
                      </div>
                      <div>
                          <label className="text-xs text-gray-400 block mb-1">Concepto</label>
                          <select 
                              value={paymentConcept}
                              onChange={e => setPaymentConcept(e.target.value)}
                              className="w-full bg-black border border-gray-600 text-white p-2 rounded"
                          >
                              <option>Cuota Mensual</option>
                              <option>Matrícula</option>
                              <option>Pase Diario</option>
                              <option>Deuda Anterior</option>
                          </select>
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

                            {selectedMember.nutritionPlan.notes && (
                                <div className="bg-gray-800/20 border border-gray-700 rounded-lg p-4">
                                    <h4 className="text-xs uppercase font-bold text-gray-500 mb-2">Notas / Suplementación</h4>
                                    <p className="text-gray-300 text-sm whitespace-pre-line italic">{selectedMember.nutritionPlan.notes}</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-700 bg-[#1a1a1a] rounded-b-xl flex justify-end gap-3">
                            <button 
                                onClick={() => handleShareNutrition('wa')} 
                                className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition"
                            >
                                <FaWhatsapp /> Compartir
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
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                  <div className="bg-[#222] p-6 rounded-xl border border-gray-700 w-full max-w-sm">
                    <h3 className="text-lg font-bold text-white mb-4">Editar Cliente</h3>
                    <form onSubmit={handleSaveEditMember} className="space-y-4">
                                  {/* Fase de objetivo */}
                                  <div>
                                    <label className="text-xs text-gray-400 block mb-1">Fase/Objetivo</label>
                                    <select
                                      value={editMember.phase}
                                      onChange={e => setEditMember({ ...editMember, phase: e.target.value as any })}
                                      className="w-full bg-black border border-gray-600 text-white p-2 rounded"
                                    >
                                      <option value="volumen">Volumen</option>
                                      <option value="deficit">Déficit</option>
                                      <option value="recomposicion">Recomposición corporal</option>
                                      <option value="transicion">Transición (volumen-défict)</option>
                                    </select>
                                  </div>

                                  {/* Horarios habituales */}
                                  <div>
                                    <label className="text-xs text-gray-400 block mb-1">Horarios habituales de entrenamiento</label>
                                    {(editMember.habitualSchedules || []).map((sch, idx) => (
                                      <div key={idx} className="flex gap-2 mb-2">
                                        <input
                                          type="text"
                                          placeholder="Día (ej: Lunes)"
                                          value={sch.day}
                                          onChange={e => {
                                            const arr = [...editMember.habitualSchedules];
                                            arr[idx].day = e.target.value;
                                            setEditMember({ ...editMember, habitualSchedules: arr });
                                          }}
                                          className="bg-black border border-gray-600 text-white p-2 rounded w-1/3"
                                        />
                                        <input
                                          type="time"
                                          value={sch.start}
                                          onChange={e => {
                                            const arr = [...editMember.habitualSchedules];
                                            arr[idx].start = e.target.value;
                                            setEditMember({ ...editMember, habitualSchedules: arr });
                                          }}
                                          className="bg-black border border-gray-600 text-white p-2 rounded w-1/3"
                                        />
                                        <input
                                          type="time"
                                          value={sch.end}
                                          onChange={e => {
                                            const arr = [...editMember.habitualSchedules];
                                            arr[idx].end = e.target.value;
                                            setEditMember({ ...editMember, habitualSchedules: arr });
                                          }}
                                          className="bg-black border border-gray-600 text-white p-2 rounded w-1/3"
                                        />
                                        <button type="button" onClick={() => {
                                          const arr = [...editMember.habitualSchedules];
                                          arr.splice(idx, 1);
                                          setEditMember({ ...editMember, habitualSchedules: arr });
                                        }} className="text-red-400">Eliminar</button>
                                      </div>
                                    ))}
                                    <button type="button" onClick={() => setEditMember({ ...editMember, habitualSchedules: [...(editMember.habitualSchedules || []), { day: '', start: '', end: '' }] })} className="text-xs text-brand-gold mt-1">Agregar horario</button>
                                  </div>
                      <div>
                          <label className="text-xs text-gray-400 block mb-1">Nombre</label>
                          <input 
                              type="text"
                              required
                              value={editMember.firstName}
                              onChange={e => setEditMember({...editMember, firstName: e.target.value})}
                              className="w-full bg-black border border-gray-600 text-white p-2 rounded"
                              placeholder="Nombre"
                          />
                      </div>
                      <div>
                          <label className="text-xs text-gray-400 block mb-1">Apellido</label>
                          <input 
                              type="text"
                              required
                              value={editMember.lastName}
                              onChange={e => setEditMember({...editMember, lastName: e.target.value})}
                              className="w-full bg-black border border-gray-600 text-white p-2 rounded"
                              placeholder="Apellido"
                          />
                      </div>
                      <div>
                          <label className="text-xs text-gray-400 block mb-1">DNI</label>
                          <input 
                              type="text"
                              required
                              value={editMember.dni}
                              onChange={e => setEditMember({...editMember, dni: e.target.value})}
                              className="w-full bg-black border border-gray-600 text-white p-2 rounded"
                              placeholder="DNI"
                          />
                      </div>
                      <div>
                          <label className="text-xs text-gray-400 block mb-1">Email</label>
                          <input 
                              type="email"
                              required
                              value={editMember.email}
                              onChange={e => setEditMember({...editMember, email: e.target.value})}
                              className="w-full bg-black border border-gray-600 text-white p-2 rounded"
                              placeholder="Email"
                          />
                      </div>
                      <div>
                          <label className="text-xs text-gray-400 block mb-1">Teléfono</label>
                          <input 
                              type="text"
                              required
                              value={editMember.phone}
                              onChange={e => setEditMember({...editMember, phone: e.target.value})}
                              className="w-full bg-black border border-gray-600 text-white p-2 rounded"
                              placeholder="Teléfono"
                          />
                      </div>
                      <div>
                          <label className="text-xs text-gray-400 block mb-1">Estado</label>
                          <select 
                              value={editMember.status}
                              onChange={e => setEditMember({...editMember, status: e.target.value as UserStatus})}
                              className="w-full bg-black border border-gray-600 text-white p-2 rounded"
                          >
                              <option value={UserStatus.ACTIVE}>Activo</option>
                              <option value={UserStatus.DEBTOR}>Moroso</option>
                              <option value={UserStatus.INACTIVE}>Inactivo</option>
                          </select>
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                          <button type="button" onClick={() => setShowEditModal(false)} className="px-3 py-2 text-gray-400 text-sm">Cancelar</button>
                          <button type="submit" className="px-4 py-2 bg-brand-gold text-black rounded font-bold text-sm">Confirmar</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
              {toast && (
                  <Toast message={toast.message} type={toast.type} duration={3500} onClose={() => setToast(null)} />
              )}
          </div>
      );
  }

  // --- LIST VIEW (Default) ---

  return (
    <div className="space-y-6">
      {/* Input oculto para importacion masiva */}
      <input 
        type="file" 
        accept=".xlsx, .xls, .csv" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
      />

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-display font-bold text-white">Directorio de Socios</h2>
        
        <div className="flex gap-3">
          {/* Boton Importar */}
          <button 
            onClick={handleImportClick}
            className="bg-gray-800 text-gray-200 border border-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 hover:text-white transition flex items-center gap-2"
            title="Importar desde Excel"
          >
            <FileSpreadsheet size={18} className="text-green-500" /> 
            <span className="hidden sm:inline">Importar</span>
          </button>

          {/* Boton Nuevo Socio */}
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-brand-gold text-black px-6 py-2 rounded-lg font-bold hover:bg-yellow-500 transition flex items-center gap-2"
          >
            <Plus size={20} /> <span className="hidden sm:inline">Nuevo Socio</span> <span className="sm:hidden">Nuevo</span>
          </button>
        </div>
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
                      ${isCurrentOnPayment(member) ? 'bg-green-900 text-green-200' : 
                        isDebtorByPayment(member) ? 'bg-red-900 text-red-200' : 'bg-gray-700 text-gray-300'}`}>
                      {isCurrentOnPayment(member) ? t('alDia') : 
                       isDebtorByPayment(member) ? t('moroso') : t('inactivo')}
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
                          const msgText = t('mensajeWhatsapp', { nombre: member.firstName });
                          const phone = member.phone.replace(/\D/g, '').replace(/^0/, '');
                          const waPhone = phone.startsWith('54') ? phone : `549${phone}`;
                          const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(msgText)}`;
                          window.open(url, '_blank');
                        }}
                      >
                        <FaWhatsapp size={16} />
                      </button>
                    )}
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] p-6 rounded-xl w-full max-w-lg border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">{t('registrarSocio')}</h3>
            <form onSubmit={handleAddMember} className="space-y-4">
                            {/* Fase de objetivo */}
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">Fase/Objetivo</label>
                              <select
                                value={newMember.phase}
                                onChange={e => setNewMember({ ...newMember, phase: e.target.value as any })}
                                className="w-full bg-black border border-gray-700 text-white p-2 rounded"
                              >
                                <option value="volumen">Volumen</option>
                                <option value="deficit">Déficit</option>
                                <option value="recomposicion">Recomposición corporal</option>
                                <option value="transicion">Transición (volumen-défict)</option>
                              </select>
                            </div>

                            {/* Horarios habituales */}
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">Horarios habituales de entrenamiento</label>
                              {(newMember.habitualSchedules || []).map((sch, idx) => (
                                <div key={idx} className="flex gap-2 mb-2">
                                  <input
                                    type="text"
                                    placeholder="Día (ej: Lunes)"
                                    value={sch.day}
                                    onChange={e => {
                                      const arr = [...newMember.habitualSchedules];
                                      arr[idx].day = e.target.value;
                                      setNewMember({ ...newMember, habitualSchedules: arr });
                                    }}
                                    className="bg-black border border-gray-700 text-white p-2 rounded w-1/3"
                                  />
                                  <input
                                    type="time"
                                    value={sch.start}
                                    onChange={e => {
                                      const arr = [...newMember.habitualSchedules];
                                      arr[idx].start = e.target.value;
                                      setNewMember({ ...newMember, habitualSchedules: arr });
                                    }}
                                    className="bg-black border border-gray-700 text-white p-2 rounded w-1/3"
                                  />
                                  <input
                                    type="time"
                                    value={sch.end}
                                    onChange={e => {
                                      const arr = [...newMember.habitualSchedules];
                                      arr[idx].end = e.target.value;
                                      setNewMember({ ...newMember, habitualSchedules: arr });
                                    }}
                                    className="bg-black border border-gray-700 text-white p-2 rounded w-1/3"
                                  />
                                  <button type="button" onClick={() => {
                                    const arr = [...newMember.habitualSchedules];
                                    arr.splice(idx, 1);
                                    setNewMember({ ...newMember, habitualSchedules: arr });
                                  }} className="text-red-400">Eliminar</button>
                                </div>
                              ))}
                              <button type="button" onClick={() => setNewMember({ ...newMember, habitualSchedules: [...(newMember.habitualSchedules || []), { day: '', start: '', end: '' }] })} className="text-xs text-brand-gold mt-1">Agregar horario</button>
                            </div>
              <div className="grid grid-cols-2 gap-4">
                <input 
                  required
                  placeholder={t('nombre')} 
                  value={newMember.firstName}
                  onChange={e => setNewMember({...newMember, firstName: e.target.value})}
                  className="bg-black border border-gray-700 p-3 rounded text-white"
                />
                <input 
                  required
                  placeholder={t('apellido')} 
                  value={newMember.lastName}
                  onChange={e => setNewMember({...newMember, lastName: e.target.value})}
                  className="bg-black border border-gray-700 p-3 rounded text-white"
                />
              </div>
              <input 
                type="text"
                required
                placeholder={t('dniRequerido')} 
                value={newMember.dni}
                onChange={e => setNewMember({...newMember, dni: e.target.value})}
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
                onChange={e => setNewMember({...newMember, phone: e.target.value})}
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

export default Members;