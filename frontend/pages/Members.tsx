import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Member, UserStatus, Routine } from '../types';
import { Search, Plus, UserX, Clock, ArrowLeft, Camera, CreditCard, Dumbbell, ChevronDown, ChevronUp, MessageCircle, Mail, Download, Edit2 } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import Toast from '../components/Toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_BASE64 } from '../services/assets';

interface MembersProps {
  initialFilter?: string | null;
}

const Members: React.FC<MembersProps> = ({ initialFilter }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [statusFilter, setStatusFilter] = useState<string | null>(initialFilter || null);
  const [filter, setFilter] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Data for selected member
  const [expandedRoutineId, setExpandedRoutineId] = useState<string | null>(null);
    // Track which day index is visible for each routine when expanded
    const [visibleDayByRoutine, setVisibleDayByRoutine] = useState<Record<string, number>>({});

  // New Member Form State
  const [newMember, setNewMember] = useState({
    firstName: '', lastName: '', email: '', phone: '', status: UserStatus.ACTIVE
  });

  // Edit Member Form State
  const [editMember, setEditMember] = useState({
    firstName: '', lastName: '', email: '', phone: '', status: UserStatus.ACTIVE
  });

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentConcept, setPaymentConcept] = useState('Cuota Mensual');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    refreshMembers();
  }, []);

  const refreshMembers = () => {
    setMembers([...db.getMembers()]);
    if(selectedMember) {
        // Refresh selected member data if open
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
    db.addMember(newMember);
    setShowAddModal(false);
    setNewMember({ firstName: '', lastName: '', email: '', phone: '', status: UserStatus.ACTIVE });
    refreshMembers();
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
              email: selectedMember.email,
              phone: selectedMember.phone,
              status: selectedMember.status
          });
          setShowEditModal(true);
      }
  };

  const handleSaveEditMember = (e: React.FormEvent) => {
      e.preventDefault();
      if(selectedMember) {
          db.updateMember(selectedMember.id, editMember);
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

  // Helper: Check if member payment is due soon (within 30 days without payment)
  const isPaymentDueSoon = (member: Member): boolean => {
    if (member.status !== UserStatus.ACTIVE) return false;
    if (!member.payments || member.payments.length === 0) return true;

    // find the most recent payment date
    const paymentDates = member.payments.map(p => new Date(p.date).getTime());
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
    return member.payments.some(p => {
      const pd = new Date(p.date);
      const days = (today.getTime() - pd.getTime()) / (1000 * 60 * 60 * 24);
      return days < 30;
    });
  };

  // Helper: Check if member is debtor by payment logic (no payment in current month, and last payment not between 1-10 of current month)
  const isDebtorByPayment = (member: Member): boolean => {
    if (!member.payments || member.payments.length === 0) return true;

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Pagos en el mes y año actual
    const paymentsThisMonth = member.payments.filter(p => {
      const pd = new Date(p.date);
      return pd.getMonth() === currentMonth && pd.getFullYear() === currentYear;
    });

    if (paymentsThisMonth.length > 0) {
      // Si hay pagos este mes, no es moroso
      return false;
    }

    // Buscar el último pago
    const paymentDates = member.payments.map(p => new Date(p.date));
    const lastPaymentDate = paymentDates.reduce((a, b) => (a > b ? a : b));

    // Si el último pago fue en el mes actual, pero fuera del 1-10, igual no es moroso (ya está cubierto arriba)
    // Si el último pago fue en el mes anterior o anterior, revisar si fue entre el 1 y 10 del mes actual
    if (
      lastPaymentDate.getFullYear() === currentYear &&
      lastPaymentDate.getMonth() === currentMonth &&
      lastPaymentDate.getDate() >= 1 &&
      lastPaymentDate.getDate() <= 10
    ) {
      // Si el último pago fue entre el 1 y 10 del mes en curso, no es moroso
      return false;
    }

    // Si no cumple ninguna de las condiciones anteriores, es moroso
    return true;
  };

  // --- FUNCIÓN PARA NORMALIZAR TEXTO (QUITAR TILDES) ---
  const normalizeText = (text: string) => {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  };

  const filteredMembers = members.filter(m => {
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

  const generateRoutinePDF = (routine: Routine, memberName: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // -- BACKGROUND LOGO (WATERMARK) --
    // We add it to the first page, and assume mostly 1 page routines. 
    // Ideally loops for multiple pages, but simple here.
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.1 })); // Make it transparent
    const imgSize = 100;
    const xCentered = (pageWidth - imgSize) / 2;
    const yCentered = (pageHeight - imgSize) / 2;
    try {
        doc.addImage(LOGO_BASE64, 'JPEG', xCentered, yCentered, imgSize, imgSize);
    } catch(e) {
        console.warn("Could not add image", e);
    }
    doc.restoreGraphicsState();

    // -- ADD LOGO AS FULL BACKGROUND --
    // Function to add logo as background (defined here so it's accessible everywhere)
    const addBackgroundLogo = () => {
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
    };

    // -- BACKGROUND COLOR & LOGO PATTERN --
    // Add gradient-like background with dark color
    doc.setFillColor(26, 26, 26); // Dark background (#1a1a1a)
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Add background logo FIRST so it's behind everything
    addBackgroundLogo();

    // 1. Header Section with Gold accent
    // Add decorative gold bar at top
    doc.setFillColor(212, 175, 55); // Gold color (#d4af37)
    doc.rect(0, 0, pageWidth, 3, 'F');

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
            
            // Add background and logo to new page
            doc.setFillColor(26, 26, 26); // Dark background
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            addBackgroundLogo();
            
            // Add gold bar
            doc.setFillColor(212, 175, 55);
            doc.rect(0, 0, pageWidth, 3, 'F');
            
            finalY = 20;

            // Re-add watermark for new page if desired
            doc.saveGraphicsState();
            doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
            try {
                doc.addImage(LOGO_BASE64, 'JPEG', xCentered, yCentered, imgSize, imgSize);
            } catch(e) {}
            doc.restoreGraphicsState();
        }
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Add gold bar at bottom
        doc.setFillColor(212, 175, 55);
        doc.rect(0, pageHeight - 5, pageWidth, 5, 'F');
        
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

  if (selectedMember) {
      // DETAIL VIEW
      return (
          <div className="space-y-6">
              {/* Header Profile Card */}
              <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-gray-900 to-black"></div>
                  <button 
                    onClick={() => setSelectedMember(null)}
                    className="absolute top-4 left-4 z-10 bg-black/50 hover:bg-black text-white p-2 rounded-full transition-colors"
                  >
                      <ArrowLeft size={20} />
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
                          <label className="absolute bottom-0 right-0 bg-brand-gold text-black p-2 rounded-full cursor-pointer hover:bg-yellow-500 transition-colors shadow-lg">
                              <Camera size={18} />
                              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                          </label>
                      </div>

                      {/* Info */}
                      <div className="flex-1 text-center md:text-left mb-2">
                          <h2 className="text-3xl font-display font-bold text-white uppercase tracking-wider">
                              {selectedMember.lastName}, {selectedMember.firstName}
                          </h2>
                          <div className="flex items-center justify-center md:justify-start gap-4 text-gray-400 mt-2">
                              <span>{selectedMember.email}</span>
                              <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                              <span>{selectedMember.phone}</span>
                              <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                              <span>Miembro desde {new Date(selectedMember.joinDate).getFullYear()}</span>
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
                                      <MessageCircle size={16} />
                                  </button>
                                  <button onClick={() => sendPaymentReminder('email')} className="p-2 bg-blue-900/40 text-blue-400 rounded-full hover:bg-blue-800 transition-colors" title="Enviar Email">
                                      <Mail size={16} />
                                  </button>
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Routines */}
                  <div className="space-y-6">
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
                                                      <MessageCircle size={18} />
                                                  </button>
                                                  <button 
                                                    onClick={(e) => handleShareRoutine(e, 'email', routine)}
                                                    className="p-2 text-blue-500 hover:bg-blue-900/30 rounded-full transition-colors" 
                                                    title="Enviar PDF por Email"
                                                  >
                                                      <Mail size={18} />
                                                  </button>
                                                  <button onClick={() => setExpandedRoutineId(expandedRoutineId === routine.id ? null : routine.id)} className="text-gray-400 p-2">
                                                      {expandedRoutineId === routine.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                  </button>
                                              </div>
                                          </div>
                                          
                                          {expandedRoutineId === routine.id && (
                                              <div className="p-4 border-t border-gray-800 bg-black/20 text-sm">
                                                  {/* Day selector: show small buttons for each day */}
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

                                                  {/* Show only the selected day's exercises */}
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
                                                              // Download only the currently visible day as a single-day routine
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

              {/* Edit Member Modal */}
              {showEditModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                  <div className="bg-[#222] p-6 rounded-xl border border-gray-700 w-full max-w-sm">
                    <h3 className="text-lg font-bold text-white mb-4">Editar Cliente</h3>
                    <form onSubmit={handleSaveEditMember} className="space-y-4">
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
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-display font-bold text-white">Directorio de Socios</h2>
        <button 
          onClick={() => setShowAddModal(true)}
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
                            <div className="font-bold text-white group-hover:text-brand-gold transition-colors">{member.lastName}, {member.firstName}</div>
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
                      {isCurrentOnPayment(member) ? 'Al Día' : 
                       isDebtorByPayment(member) ? 'Moroso' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2" onClick={e => e.stopPropagation()}>
                    <button 
                        onClick={(e) => toggleStatus(e, member.id, member.status)}
                        className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded transition" 
                        title="Cambiar Estado"
                    >
                        <Clock size={16} />
                    </button>
                    {isDebtorByPayment(member) && (
                      <button
                        className="p-2 text-green-400 hover:text-green-300 bg-green-900/20 hover:bg-green-900/40 rounded transition"
                        title="Notificar Deuda por WhatsApp"
                        onClick={(e) => {
                          e.stopPropagation();
                          const msgText = `Hola ${member.firstName}, te recordamos que tu cuota en El Arca Gym está vencida o próxima a vencer. Por favor acércate a regularizar tu situación. Gracias! 💪`;
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
            <div className="p-8 text-center text-gray-500">No se encontraron socios.</div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] p-6 rounded-xl w-full max-w-lg border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Registrar Nuevo Socio</h3>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input 
                  required
                  placeholder="Nombre" 
                  value={newMember.firstName}
                  onChange={e => setNewMember({...newMember, firstName: e.target.value})}
                  className="bg-black border border-gray-700 p-3 rounded text-white"
                />
                <input 
                  required
                  placeholder="Apellido" 
                  value={newMember.lastName}
                  onChange={e => setNewMember({...newMember, lastName: e.target.value})}
                  className="bg-black border border-gray-700 p-3 rounded text-white"
                />
              </div>
              <input 
                type="email"
                placeholder="Email" 
                value={newMember.email}
                onChange={e => setNewMember({...newMember, email: e.target.value})}
                className="w-full bg-black border border-gray-700 p-3 rounded text-white"
              />
              <input 
                placeholder="Teléfono (Ej: 221 555 0101)" 
                value={newMember.phone}
                onChange={e => setNewMember({...newMember, phone: e.target.value})}
                className="w-full bg-black border border-gray-700 p-3 rounded text-white"
              />
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-brand-gold text-black font-bold rounded hover:bg-yellow-500">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Members;