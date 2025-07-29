import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
    RefreshControl,
    Modal,
    Linking
} from 'react-native';
import { 
    checkIsBarber, 
    getCurrentUser, 
    getUserProfile, 
    getBarberAppointments, 
    getBarberStatistics,
    getAllAvailability,
    updateAvailability,
    createAvailability,
    updateAppointment,
    createAppointment,
    getTreatments,
    getAllUsers,
    getBarber,
    onAuthStateChange,
    UserProfile,
    Appointment,
    Treatment,
    Barber
} from '../../services/firebase';
import ToastMessage from '../components/ToastMessage';
import TopNav from '../components/TopNav';

const { width } = Dimensions.get('window');

interface BarberDashboardScreenProps {
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const BarberDashboardScreen: React.FC<BarberDashboardScreenProps> = ({ onNavigate, onBack }) => {
  const [isBarber, setIsBarber] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [availability, setAvailability] = useState<any[]>([]);
  const [barberData, setBarberData] = useState<Barber | null>(null);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  // Modal states
  const [showManualBooking, setShowManualBooking] = useState(false);
  const [showWorkHours, setShowWorkHours] = useState(false);
  const [showAvailabilityEdit, setShowAvailabilityEdit] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(0);
  
  // Manual booking states
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedTreatment, setSelectedTreatment] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [bookingNotes, setBookingNotes] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Work hours states
  const [editingAvailability, setEditingAvailability] = useState<any>(null);
  const [workHoursTimes, setWorkHoursTimes] = useState<{[key: number]: {start: string, end: string, hasBreak: boolean, breakStart: string, breakEnd: string}}>({});
  const [showStartTimePicker, setShowStartTimePicker] = useState<{[key: number]: boolean}>({
    0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false
  });
  const [showEndTimePicker, setShowEndTimePicker] = useState<{[key: number]: boolean}>({
    0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false
  });
  const [showBreakStartPicker, setShowBreakStartPicker] = useState<{[key: number]: boolean}>({
    0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false
  });
  const [showBreakEndPicker, setShowBreakEndPicker] = useState<{[key: number]: boolean}>({
    0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false
  });

  const daysOfWeek = [
    'ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'
  ];

  // Generate time slots in 20-minute intervals
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 20) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        const barberStatus = await checkIsBarber(user.uid);
        setIsBarber(barberStatus);
        
        if (!barberStatus) {
          showToast('אין לך הרשאות ספר', 'error');
          setTimeout(() => onNavigate('home'), 3000);
        } else {
          await loadBarberData(user.uid);
        }
      } else {
        onNavigate('home');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loadBarberData = async (userId: string) => {
    try {
      const profile = await getUserProfile(userId);
      setUserProfile(profile);
      
      if (profile?.barberId) {
        const [appointmentsData, statisticsData, allAvailabilityData, barberInfo, treatmentsData, usersData] = await Promise.all([
          getBarberAppointments(profile.barberId),
          getBarberStatistics(profile.barberId),
          getAllAvailability(),
          getBarber(profile.barberId),
          getTreatments(),
          getAllUsers()
        ]);

        // Filter availability for this specific barber
        const barberAvailabilityData = allAvailabilityData.filter(a => a.barberId === profile.barberId);
        
        setAppointments(appointmentsData);
        setStatistics(statisticsData);
        setAvailability(barberAvailabilityData);
        setBarberData(barberInfo);
        setTreatments(treatmentsData);
        setUsers(usersData.filter(u => !u.isBarber && !u.isAdmin)); // Only regular customers
        
        // Initialize work hours times
        const initialTimes: {[key: number]: {start: string, end: string, hasBreak: boolean, breakStart: string, breakEnd: string}} = {};
        for (let i = 0; i < 7; i++) {
          const dayAvail = barberAvailabilityData.find(a => a.dayOfWeek === i);
          initialTimes[i] = {
            start: dayAvail?.startTime || '09:00',
            end: dayAvail?.endTime || '18:00',
            hasBreak: dayAvail?.hasBreak || false,
            breakStart: dayAvail?.breakStartTime || '13:00',
            breakEnd: dayAvail?.breakEndTime || '14:00'
          };
        }
        setWorkHoursTimes(initialTimes);
        console.log('Initialized work hours times:', initialTimes);
      }
    } catch (error) {
      console.error('Error loading barber data:', error);
      showToast('שגיאה בטעינת נתונים', 'error');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (currentUserId) {
      await loadBarberData(currentUserId);
    }
    setRefreshing(false);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const handleAppointmentStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      await updateAppointment(appointmentId, { status: newStatus as any });
      showToast(`התור עודכן ל${newStatus === 'completed' ? 'הושלם' : newStatus === 'confirmed' ? 'מאושר' : 'בוטל'}`, 'success');
      if (currentUserId) {
        await loadBarberData(currentUserId);
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
      showToast('שגיאה בעדכון התור', 'error');
    }
  };

  const toggleAvailability = async (dayOfWeek: number) => {
    try {
      const dayAvailability = availability.find(a => a.dayOfWeek === dayOfWeek);
      if (dayAvailability) {
        await updateAvailability(dayAvailability.id, {
          isAvailable: !dayAvailability.isAvailable
        });
        showToast(`זמינות עודכנה ליום ${daysOfWeek[dayOfWeek]}`, 'success');
        if (currentUserId) {
          await loadBarberData(currentUserId);
        }
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      showToast('שגיאה בעדכון זמינות', 'error');
    }
  };

  const handleManualBooking = async () => {
    try {
      // Check if we're using existing user or new customer details
      if (selectedUser === 'new_customer') {
        // Validate new customer fields
        if (!customerName.trim() || !customerPhone.trim() || !selectedTreatment || !userProfile?.barberId) {
          showToast('אנא מלא את כל השדות', 'error');
          return;
        }

        const selectedTreatmentObj = treatments.find(t => t.id === selectedTreatment);
        if (!selectedTreatmentObj) {
          showToast('טיפול לא נמצא', 'error');
          return;
        }

        // Combine date and time
        const appointmentDateTime = new Date(selectedDate);
        appointmentDateTime.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);

        // Create appointment with customer details (no userId needed)
        const appointmentData = {
          barberId: userProfile.barberId,
          treatmentId: selectedTreatment,
          date: appointmentDateTime,
          status: 'confirmed' as const,
          notes: bookingNotes || 'תור ידני',
          duration: selectedTreatmentObj.duration,
          // Add customer details directly to appointment
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          // Use special marker to indicate this is a walk-in appointment
          userId: 'walk-in-customer'
        };

        await createAppointment(appointmentData);
        showToast('התור נקבע בהצלחה עבור ' + customerName + '!', 'success');
      } else {
        // Using existing user
        if (!selectedUser || !selectedTreatment || !userProfile?.barberId) {
          showToast('אנא מלא את כל השדות', 'error');
          return;
        }

        const selectedTreatmentObj = treatments.find(t => t.id === selectedTreatment);
        if (!selectedTreatmentObj) {
          showToast('טיפול לא נמצא', 'error');
          return;
        }

        // Combine date and time
        const appointmentDateTime = new Date(selectedDate);
        appointmentDateTime.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);

        const appointmentData = {
          userId: selectedUser,
          barberId: userProfile.barberId,
          treatmentId: selectedTreatment,
          date: appointmentDateTime,
          status: 'confirmed' as const,
          notes: bookingNotes || 'תור ידני',
          duration: selectedTreatmentObj.duration
        };

        await createAppointment(appointmentData);
        showToast('התור נקבע בהצלחה!', 'success');
      }
      
      setShowManualBooking(false);
      
      // Reset form
      setSelectedUser('');
      setSelectedTreatment('');
      setSelectedDate(new Date());
      setSelectedTime(new Date());
      setBookingNotes('');
      setCustomerName('');
      setCustomerPhone('');
      
      // Reload data
      if (currentUserId) {
        await loadBarberData(currentUserId);
      }
    } catch (error) {
      console.error('Error creating manual booking:', error);
      showToast('שגיאה בקביעת התור', 'error');
    }
  };

  const updateWorkHours = async (dayOfWeek: number, startTime: string, endTime: string, hasBreak: boolean = false, breakStartTime?: string, breakEndTime?: string) => {
    try {
      // Validate time format
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        showToast('פורמט שעה לא תקין. השתמש ב HH:MM', 'error');
        return;
      }

      // Check if end time is after start time
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      if (endMinutes <= startMinutes) {
        showToast('שעת סיום חייבת להיות אחרי שעת התחלה', 'error');
        return;
      }

      const dayAvailability = availability.find(a => a.dayOfWeek === dayOfWeek);
      
      const updateData: any = {
        startTime,
        endTime,
        isAvailable: true,
        hasBreak,
        breakStartTime: hasBreak ? breakStartTime : undefined,
        breakEndTime: hasBreak ? breakEndTime : undefined
      };

      if (dayAvailability) {
        await updateAvailability(dayAvailability.id, updateData);
        showToast(`שעות עבודה עודכנו ליום ${daysOfWeek[dayOfWeek]}`, 'success');
        if (currentUserId) {
          await loadBarberData(currentUserId);
        }
      } else {
        // Create new availability record if it doesn't exist
        if (userProfile?.barberId) {
          const newAvailability = {
            barberId: userProfile.barberId,
            dayOfWeek,
            startTime,
            endTime,
            isAvailable: true,
            hasBreak,
            breakStartTime: hasBreak ? breakStartTime : undefined,
            breakEndTime: hasBreak ? breakEndTime : undefined
          };
          
          await createAvailability(newAvailability);
          showToast(`יום ${daysOfWeek[dayOfWeek]} נוסף בהצלחה!`, 'success');
          if (currentUserId) {
            await loadBarberData(currentUserId);
          }
        }
      }
    } catch (error) {
      console.error('Error updating work hours:', error);
      showToast('שגיאה בעדכון שעות עבודה', 'error');
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    Alert.alert(
      'ביטול תור',
      'האם אתה בטוח שברצונך לבטל את התור?',
      [
        { text: 'לא', style: 'cancel' },
        {
          text: 'כן, בטל',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateAppointment(appointmentId, { status: 'cancelled' });
              showToast('התור בוטל בהצלחה', 'success');
              if (currentUserId) {
                await loadBarberData(currentUserId);
              }
            } catch (error) {
              console.error('Error cancelling appointment:', error);
              showToast('שגיאה בביטול התור', 'error');
            }
          }
        }
      ]
    );
  };

  const getFinancialStatistics = () => {
    if (!statistics || !barberData) return { weekly: 0, monthly: 0 };
    
    const hourlyRate = barberData.hourlyRate || 50;
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const weeklyAppointments = appointments.filter(app => {
      const appDate = app.date.toDate();
      return appDate >= oneWeekAgo && app.status === 'completed';
    });
    
    const monthlyCompleted = statistics.thisMonthCompleted || 0;
    const weeklyCompleted = weeklyAppointments.length;
    
    return {
      weekly: weeklyCompleted * hourlyRate,
      monthly: monthlyCompleted * hourlyRate
    };
  };

  const getNextAppointment = () => {
    const now = new Date();
    const upcomingAppointments = appointments
      .filter(app => {
        const appDate = app.date.toDate();
        return appDate > now && (app.status === 'confirmed' || app.status === 'pending');
      })
      .sort((a, b) => {
        const aTime = a.date.toMillis ? a.date.toMillis() : new Date(a.date as any).getTime();
        const bTime = b.date.toMillis ? b.date.toMillis() : new Date(b.date as any).getTime();
        return aTime - bTime;
      });
    
    return upcomingAppointments[0] || null;
  };

  const getUserData = async (userId: string) => {
    try {
      const userData = await getUserProfile(userId);
      return userData;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  };

  const makePhoneCall = (phoneNumber: string) => {
    const formattedNumber = phoneNumber.replace(/[^\d+]/g, '');
    Linking.openURL(`tel:${formattedNumber}`).catch(() => {
      Alert.alert('שגיאה', 'לא ניתן לפתוח את אפליקציית הטלפון');
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#4CAF50';
      case 'completed': return '#2196F3';
      case 'cancelled': return '#F44336';
      default: return '#FF9800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'מאושר';
      case 'completed': return 'הושלם';
      case 'cancelled': return 'בוטל';
      default: return 'ממתין';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>טוען...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (!isBarber) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={64} color="#fff" />
            <Text style={styles.errorText}>אין לך הרשאות ספר</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
        <TopNav 
          title={`ברוך הבא, ${userProfile?.displayName || 'ספר'}`}
          showBackButton={true}
          onBackPress={() => {
            console.log('Back button pressed');
            if (onBack) {
              onBack();
            } else {
              onNavigate('settings');
            }
          }}
          onMenuPress={() => {
            console.log('Menu button pressed');
            onNavigate('settings');
          }}
        />
        
        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#667eea']} />
          }
        >
          {/* סטטיסטיקות כספיות */}
          {statistics && barberData && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💰 הכנסות והסטטיסטיקות</Text>
              <View style={styles.statisticsContainer}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{getFinancialStatistics().weekly}₪</Text>
                  <Text style={styles.statLabel}>השבוע</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{getFinancialStatistics().monthly}₪</Text>
                  <Text style={styles.statLabel}>החודש</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{barberData.hourlyRate}₪</Text>
                  <Text style={styles.statLabel}>לשעה</Text>
                </View>
              </View>
              
              <View style={styles.statisticsContainer}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{statistics.totalAppointments}</Text>
                  <Text style={styles.statLabel}>סה״כ תורים</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{statistics.thisMonthAppointments}</Text>
                  <Text style={styles.statLabel}>תורים החודש</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{statistics.completionRate}%</Text>
                  <Text style={styles.statLabel}>אחוז השלמה</Text>
                </View>
              </View>
            </View>
          )}

          {/* התור הבא */}
          {(() => {
            const nextAppointment = getNextAppointment();
            if (!nextAppointment) return null;
            
            return (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>⏰ התור הבא שלך</Text>
                <View style={styles.nextAppointmentCard}>
                  <View style={styles.nextAppointmentHeader}>
                    <View style={styles.nextAppointmentBadge}>
                      <Text style={styles.nextAppointmentBadgeText}>הבא</Text>
                    </View>
                    <Text style={styles.nextAppointmentDate}>
                      {nextAppointment.date.toDate().toLocaleDateString('he-IL')}
                    </Text>
                    <Text style={styles.nextAppointmentTime}>
                      {nextAppointment.date.toDate().toLocaleTimeString('he-IL', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                  
                  <NextAppointmentClient 
                    userId={nextAppointment.userId} 
                    appointment={nextAppointment}
                    onCall={makePhoneCall} 
                  />
                  
                  <View style={styles.nextAppointmentFooter}>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(nextAppointment.status) }
                    ]}>
                      <Text style={styles.statusText}>
                        {getStatusText(nextAppointment.status)}
                      </Text>
                    </View>
                    <Text style={styles.nextAppointmentNotes}>
                      {nextAppointment.notes || 'אין הערות'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })()}

          {/* זמינות ושעות עבודה */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📅 הזמינות ושעות העבודה</Text>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => setShowWorkHours(true)}
              >
                <Ionicons name="create" size={16} color="#fff" />
                <Text style={styles.editButtonText}>ערוך</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.availabilityContainer}>
              {daysOfWeek.map((day, index) => {
                const dayAvailability = availability.find(a => a.dayOfWeek === index);
                const isAvailable = dayAvailability?.isAvailable || false;
                const startTime = dayAvailability?.startTime || '09:00';
                const endTime = dayAvailability?.endTime || '18:00';
                
                return (
                  <View key={index} style={styles.dayCard}>
                    <TouchableOpacity
                      style={[
                        styles.dayToggle,
                        { backgroundColor: isAvailable ? '#4CAF50' : '#F44336' }
                      ]}
                      onPress={() => toggleAvailability(index)}
                    >
                      <Text style={styles.dayText}>{day}</Text>
                      <Text style={styles.dayStatus}>
                        {isAvailable ? 'זמין' : 'לא זמין'}
                      </Text>
                    </TouchableOpacity>
                    {isAvailable && (
                      <Text style={styles.hoursText}>{startTime} - {endTime}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* התורים שלי */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 התורים שלי</Text>
            {appointments.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>אין תורים עדיין</Text>
              </View>
            ) : (
              appointments.slice(0, 10).map((appointment) => (
                <View key={appointment.id} style={styles.appointmentCard}>
                  <View style={styles.appointmentHeader}>
                    <Text style={styles.appointmentDate}>
                      {appointment.date.toDate().toLocaleDateString('he-IL')}
                    </Text>
                    <Text style={styles.appointmentTime}>
                      {appointment.date.toDate().toLocaleTimeString('he-IL', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </Text>
                  </View>
                  
                  <View style={styles.appointmentBody}>
                    <AppointmentClient 
                      userId={appointment.userId} 
                      appointment={appointment}
                      onCall={makePhoneCall} 
                    />
                    <Text style={styles.appointmentNotes}>
                      {appointment.notes || 'אין הערות'}
                    </Text>
                  </View>
                  
                  <View style={styles.appointmentFooter}>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(appointment.status) }
                    ]}>
                      <Text style={styles.statusText}>
                        {getStatusText(appointment.status)}
                      </Text>
                    </View>
                    
                    <View style={styles.actionButtons}>
                      {appointment.status === 'pending' && (
                        <>
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                            onPress={() => handleAppointmentStatusChange(appointment.id, 'confirmed')}
                          >
                            <Text style={styles.actionButtonText}>אשר</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#F44336' }]}
                            onPress={() => cancelAppointment(appointment.id)}
                          >
                            <Text style={styles.actionButtonText}>בטל</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      
                      {appointment.status === 'confirmed' && (
                        <>
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
                            onPress={() => handleAppointmentStatusChange(appointment.id, 'completed')}
                          >
                            <Text style={styles.actionButtonText}>סמן כהושלם</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#F44336' }]}
                            onPress={() => cancelAppointment(appointment.id)}
                          >
                            <Text style={styles.actionButtonText}>בטל</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      
                      {appointment.status === 'completed' && (
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: '#F44336' }]}
                          onPress={() => cancelAppointment(appointment.id)}
                        >
                          <Text style={styles.actionButtonText}>בטל</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* כפתורי פעולות */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚙️ פעולות מהירות</Text>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => setShowManualBooking(true)}
            >
              <Ionicons name="add-circle" size={24} color="#667eea" />
              <Text style={styles.actionCardText}>קבע תור ידנית</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => setShowWorkHours(true)}
            >
              <Ionicons name="time" size={24} color="#667eea" />
              <Text style={styles.actionCardText}>עדכן שעות עבודה</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Modal לקביעת תור ידנית */}
        <Modal
          visible={showManualBooking}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <LinearGradient colors={['#667eea', '#764ba2']} style={styles.modalContainer}>
            <SafeAreaView style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>קביעת תור ידנית</Text>
                <TouchableOpacity onPress={() => setShowManualBooking(false)}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalScroll}>
                {/* בחירת לקוח */}
                <Text style={styles.modalLabel}>בחר לקוח:</Text>
                <View style={styles.pickerContainer}>
                  {/* אפשרות ללקוח חדש */}
                  <TouchableOpacity
                    style={[
                      styles.pickerItem,
                      styles.newCustomerItem,
                      selectedUser === 'new_customer' && styles.pickerItemSelected
                    ]}
                    onPress={() => setSelectedUser('new_customer')}
                  >
                    <Ionicons name="person-add" size={20} color="#667eea" />
                    <Text style={[
                      styles.pickerText,
                      styles.newCustomerText,
                      selectedUser === 'new_customer' && styles.pickerTextSelected
                    ]}>
                      + לקוח חדש
                    </Text>
                  </TouchableOpacity>
                  
                  {/* לקוחות קיימים */}
                  {users.map((user) => (
                    <TouchableOpacity
                      key={user.uid}
                      style={[
                        styles.pickerItem,
                        selectedUser === user.uid && styles.pickerItemSelected
                      ]}
                      onPress={() => setSelectedUser(user.uid)}
                    >
                      <Text style={[
                        styles.pickerText,
                        selectedUser === user.uid && styles.pickerTextSelected
                      ]}>
                        {user.displayName}
                        {user.phone && (
                          <Text style={styles.userPhoneInList}> • {user.phone}</Text>
                        )}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                {/* שדות לקוח חדש */}
                {selectedUser === 'new_customer' && (
                  <View style={styles.newCustomerFields}>
                    <Text style={styles.modalLabel}>שם הלקוח:</Text>
                    <TextInput
                      style={styles.customerInput}
                      value={customerName}
                      onChangeText={setCustomerName}
                      placeholder="הכנס שם מלא..."
                      placeholderTextColor="#ccc"
                    />
                    
                    <Text style={styles.modalLabel}>מספר טלפון:</Text>
                    <TextInput
                      style={styles.customerInput}
                      value={customerPhone}
                      onChangeText={setCustomerPhone}
                      placeholder="050-1234567"
                      placeholderTextColor="#ccc"
                      keyboardType="phone-pad"
                    />
                    
                    <View style={styles.newCustomerNote}>
                      <Ionicons name="information-circle" size={16} color="#4CAF50" />
                      <Text style={styles.successNoteText}>
                        ✅ תור יקבע עם הפרטים שהוזנו (ללא יצירת חשבון משתמש)
                      </Text>
                    </View>
                  </View>
                )}
                
                {/* בחירת טיפול */}
                <Text style={styles.modalLabel}>בחר טיפול:</Text>
                <View style={styles.pickerContainer}>
                  {treatments.map((treatment) => (
                    <TouchableOpacity
                      key={treatment.id}
                      style={[
                        styles.pickerItem,
                        selectedTreatment === treatment.id && styles.pickerItemSelected
                      ]}
                      onPress={() => setSelectedTreatment(treatment.id)}
                    >
                      <Text style={[
                        styles.pickerText,
                        selectedTreatment === treatment.id && styles.pickerTextSelected
                      ]}>
                        {treatment.name} - {treatment.duration} דק׳ - {treatment.price}₪
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                {/* בחירת תאריך */}
                <Text style={styles.modalLabel}>תאריך:</Text>
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateButtonText}>
                    {selectedDate.toLocaleDateString('he-IL')}
                  </Text>
                  <Ionicons name="calendar" size={20} color="#667eea" />
                </TouchableOpacity>
                
                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowDatePicker(false);
                      if (date) setSelectedDate(date);
                    }}
                  />
                )}
                
                {/* בחירת שעה */}
                <Text style={styles.modalLabel}>שעה:</Text>
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={styles.dateButtonText}>
                    {selectedTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Ionicons name="time" size={20} color="#667eea" />
                </TouchableOpacity>
                
                {showTimePicker && (
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    display="default"
                    onChange={(event, time) => {
                      setShowTimePicker(false);
                      if (time) setSelectedTime(time);
                    }}
                  />
                )}
                
                {/* הערות */}
                <Text style={styles.modalLabel}>הערות (אופציונלי):</Text>
                <TextInput
                  style={styles.notesInput}
                  value={bookingNotes}
                  onChangeText={setBookingNotes}
                  placeholder="הערות נוספות..."
                  placeholderTextColor="#ccc"
                  multiline
                />
                
                <TouchableOpacity 
                  style={styles.confirmButton}
                  onPress={handleManualBooking}
                >
                  <Text style={styles.confirmButtonText}>קבע תור</Text>
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          </LinearGradient>
        </Modal>

        {/* Modal לעדכון שעות עבודה */}
        <Modal
          visible={showWorkHours}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <LinearGradient colors={['#667eea', '#764ba2']} style={styles.modalContainer}>
            <SafeAreaView style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>עדכון שעות עבודה</Text>
                <TouchableOpacity onPress={() => setShowWorkHours(false)}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalScroll}>
                {daysOfWeek.map((day, index) => {
                  const dayAvailability = availability.find(a => a.dayOfWeek === index);
                  const isAvailable = dayAvailability?.isAvailable || false;
                  const currentTimes = workHoursTimes[index] || { start: '09:00', end: '18:00', hasBreak: false, breakStart: '13:00', breakEnd: '14:00' };
                  console.log(`Day ${index}: isAvailable=${isAvailable}, currentTimes=`, currentTimes);
                  
                  return (
                    <View key={index} style={styles.workHourRow}>
                      <View style={styles.daySection}>
                        <Text style={styles.dayLabel}>{day}</Text>
                        <TouchableOpacity
                          style={[
                            styles.availabilityToggle,
                            { backgroundColor: isAvailable ? '#4CAF50' : '#F44336' }
                          ]}
                          onPress={() => toggleAvailability(index)}
                        >
                          <Text style={styles.toggleText}>
                            {isAvailable ? 'זמין' : 'לא זמין'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      
                      <View style={styles.workHourControls}>
                        {isAvailable ? (
                          <View style={styles.timeInputsContainer}>
                            {/* Start Time Selection */}
                            <View style={styles.timeSelectSection}>
                              <Text style={styles.timeLabel}>שעת התחלה:</Text>
                              <TouchableOpacity
                                style={styles.timeDisplayButton}
                                onPress={() => {
                                  setShowStartTimePicker(prev => ({
                                    ...prev,
                                    [index]: !prev[index]
                                  }));
                                }}
                              >
                                <Text style={styles.timeDisplayText}>{currentTimes.start}</Text>
                                <Ionicons 
                                  name={showStartTimePicker[index] ? "chevron-up" : "chevron-down"} 
                                  size={16} 
                                  color="#667eea" 
                                />
                              </TouchableOpacity>
                              
                              {showStartTimePicker[index] && (
                                <View style={styles.timeSlotsList}>
                                  <ScrollView style={styles.timeSlotsScroll} nestedScrollEnabled>
                                    {timeSlots.map((slot) => (
                                      <TouchableOpacity
                                        key={slot}
                                        style={[
                                          styles.timeSlotItem,
                                          currentTimes.start === slot && styles.timeSlotSelected
                                        ]}
                                        onPress={() => {
                                          setWorkHoursTimes(prev => ({
                                            ...prev,
                                            [index]: { ...prev[index], start: slot }
                                          }));
                                          setShowStartTimePicker(prev => ({
                                            ...prev,
                                            [index]: false
                                          }));
                                        }}
                                      >
                                        <Text style={[
                                          styles.timeSlotText,
                                          currentTimes.start === slot && styles.timeSlotTextSelected
                                        ]}>
                                          {slot}
                                        </Text>
                                      </TouchableOpacity>
                                    ))}
                                  </ScrollView>
                                </View>
                              )}
                            </View>

                            {/* End Time Selection */}
                            <View style={styles.timeSelectSection}>
                              <Text style={styles.timeLabel}>שעת סיום:</Text>
                              <TouchableOpacity
                                style={styles.timeDisplayButton}
                                onPress={() => {
                                  setShowEndTimePicker(prev => ({
                                    ...prev,
                                    [index]: !prev[index]
                                  }));
                                }}
                              >
                                <Text style={styles.timeDisplayText}>{currentTimes.end}</Text>
                                <Ionicons 
                                  name={showEndTimePicker[index] ? "chevron-up" : "chevron-down"} 
                                  size={16} 
                                  color="#667eea" 
                                />
                              </TouchableOpacity>
                              
                              {showEndTimePicker[index] && (
                                <View style={styles.timeSlotsList}>
                                  <ScrollView style={styles.timeSlotsScroll} nestedScrollEnabled>
                                    {timeSlots.map((slot) => (
                                      <TouchableOpacity
                                        key={slot}
                                        style={[
                                          styles.timeSlotItem,
                                          currentTimes.end === slot && styles.timeSlotSelected
                                        ]}
                                        onPress={() => {
                                          setWorkHoursTimes(prev => ({
                                            ...prev,
                                            [index]: { ...prev[index], end: slot }
                                          }));
                                          setShowEndTimePicker(prev => ({
                                            ...prev,
                                            [index]: false
                                          }));
                                        }}
                                      >
                                        <Text style={[
                                          styles.timeSlotText,
                                          currentTimes.end === slot && styles.timeSlotTextSelected
                                        ]}>
                                          {slot}
                                        </Text>
                                      </TouchableOpacity>
                                    ))}
                                  </ScrollView>
                                </View>
                              )}
                            </View>

                            {/* Break Toggle */}
                            <View style={styles.breakToggleSection}>
                              <TouchableOpacity
                                style={styles.breakToggleButton}
                                onPress={() => {
                                  setWorkHoursTimes(prev => ({
                                    ...prev,
                                    [index]: { ...prev[index], hasBreak: !prev[index]?.hasBreak }
                                  }));
                                }}
                              >
                                <Ionicons 
                                  name={currentTimes.hasBreak ? "checkbox" : "square-outline"} 
                                  size={20} 
                                  color="#667eea" 
                                />
                                <Text style={styles.breakToggleText}>הפסקה במהלך היום</Text>
                              </TouchableOpacity>
                            </View>

                            {/* Break Time Selection */}
                            {currentTimes.hasBreak && (
                              <View style={styles.breakTimeContainer}>
                                <Text style={styles.breakSectionTitle}>⏸️ זמן הפסקה</Text>
                                
                                <View style={styles.breakTimesRow}>
                                  {/* Break Start Time */}
                                  <View style={styles.breakTimeSelect}>
                                    <Text style={styles.breakTimeLabel}>התחלת הפסקה:</Text>
                                    <TouchableOpacity
                                      style={styles.breakTimeButton}
                                      onPress={() => {
                                        setShowBreakStartPicker(prev => ({
                                          ...prev,
                                          [index]: !prev[index]
                                        }));
                                      }}
                                    >
                                      <Text style={styles.breakTimeText}>{currentTimes.breakStart}</Text>
                                      <Ionicons 
                                        name={showBreakStartPicker[index] ? "chevron-up" : "chevron-down"} 
                                        size={14} 
                                        color="#667eea" 
                                      />
                                    </TouchableOpacity>
                                    
                                    {showBreakStartPicker[index] && (
                                      <View style={styles.breakTimeSlotsList}>
                                        <ScrollView style={styles.breakTimeSlotsScroll} nestedScrollEnabled>
                                          {timeSlots.map((slot) => (
                                            <TouchableOpacity
                                              key={slot}
                                              style={[
                                                styles.breakTimeSlotItem,
                                                currentTimes.breakStart === slot && styles.breakTimeSlotSelected
                                              ]}
                                              onPress={() => {
                                                setWorkHoursTimes(prev => ({
                                                  ...prev,
                                                  [index]: { ...prev[index], breakStart: slot }
                                                }));
                                                setShowBreakStartPicker(prev => ({
                                                  ...prev,
                                                  [index]: false
                                                }));
                                              }}
                                            >
                                              <Text style={[
                                                styles.breakTimeSlotText,
                                                currentTimes.breakStart === slot && styles.breakTimeSlotTextSelected
                                              ]}>
                                                {slot}
                                              </Text>
                                            </TouchableOpacity>
                                          ))}
                                        </ScrollView>
                                      </View>
                                    )}
                                  </View>

                                  {/* Break End Time */}
                                  <View style={styles.breakTimeSelect}>
                                    <Text style={styles.breakTimeLabel}>סיום הפסקה:</Text>
                                    <TouchableOpacity
                                      style={styles.breakTimeButton}
                                      onPress={() => {
                                        setShowBreakEndPicker(prev => ({
                                          ...prev,
                                          [index]: !prev[index]
                                        }));
                                      }}
                                    >
                                      <Text style={styles.breakTimeText}>{currentTimes.breakEnd}</Text>
                                      <Ionicons 
                                        name={showBreakEndPicker[index] ? "chevron-up" : "chevron-down"} 
                                        size={14} 
                                        color="#667eea" 
                                      />
                                    </TouchableOpacity>
                                    
                                    {showBreakEndPicker[index] && (
                                      <View style={styles.breakTimeSlotsList}>
                                        <ScrollView style={styles.breakTimeSlotsScroll} nestedScrollEnabled>
                                          {timeSlots.map((slot) => (
                                            <TouchableOpacity
                                              key={slot}
                                              style={[
                                                styles.breakTimeSlotItem,
                                                currentTimes.breakEnd === slot && styles.breakTimeSlotSelected
                                              ]}
                                              onPress={() => {
                                                setWorkHoursTimes(prev => ({
                                                  ...prev,
                                                  [index]: { ...prev[index], breakEnd: slot }
                                                }));
                                                setShowBreakEndPicker(prev => ({
                                                  ...prev,
                                                  [index]: false
                                                }));
                                              }}
                                            >
                                              <Text style={[
                                                styles.breakTimeSlotText,
                                                currentTimes.breakEnd === slot && styles.breakTimeSlotTextSelected
                                              ]}>
                                                {slot}
                                              </Text>
                                            </TouchableOpacity>
                                          ))}
                                        </ScrollView>
                                      </View>
                                    )}
                                  </View>
                                </View>
                              </View>
                            )}
                            
                            {/* Update Button */}
                            <TouchableOpacity
                              style={styles.updateWorkHoursButton}
                              onPress={() => updateWorkHours(
                                index, 
                                currentTimes.start, 
                                currentTimes.end,
                                currentTimes.hasBreak,
                                currentTimes.breakStart,
                                currentTimes.breakEnd
                              )}
                            >
                              <Ionicons name="checkmark-circle" size={20} color="#fff" />
                              <Text style={styles.updateWorkHoursText}>עדכן שעות</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.notAvailableContainer}>
                            <Text style={styles.notAvailableText}>יום לא זמין</Text>
                            <Text style={styles.notAvailableHint}>לחץ על 'לא זמין' כדי להפעיל</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
                
                {/* Time Pickers for Work Hours */}
                {daysOfWeek.map((_, dayIndex) => {
                  console.log(`Day ${dayIndex} - Start picker: ${showStartTimePicker[dayIndex]}, End picker: ${showEndTimePicker[dayIndex]}`);
                  return (
                    <View key={`timepickers-${dayIndex}`}>
                      {showStartTimePicker[dayIndex] && (
                        <DateTimePicker
                        value={(() => {
                          const [hours, minutes] = (workHoursTimes[dayIndex]?.start || '09:00').split(':');
                          const date = new Date();
                          date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                          return date;
                        })()}
                        mode="time"
                        display="default"
                        onChange={(event, selectedTime) => {
                          setShowStartTimePicker(prev => ({
                            ...prev,
                            [dayIndex]: false
                          }));
                          if (selectedTime) {
                            const timeString = selectedTime.toLocaleTimeString('he-IL', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            });
                            setWorkHoursTimes(prev => ({
                              ...prev,
                              [dayIndex]: { 
                                ...prev[dayIndex], 
                                start: timeString 
                              }
                            }));
                          }
                        }}
                      />
                    )}
                    
                    {showEndTimePicker[dayIndex] && (
                      <DateTimePicker
                        value={(() => {
                          const [hours, minutes] = (workHoursTimes[dayIndex]?.end || '18:00').split(':');
                          const date = new Date();
                          date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                          return date;
                        })()}
                        mode="time"
                        display="default"
                        onChange={(event, selectedTime) => {
                          setShowEndTimePicker(prev => ({
                            ...prev,
                            [dayIndex]: false
                          }));
                          if (selectedTime) {
                            const timeString = selectedTime.toLocaleTimeString('he-IL', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            });
                            setWorkHoursTimes(prev => ({
                              ...prev,
                              [dayIndex]: { 
                                ...prev[dayIndex], 
                                end: timeString 
                              }
                            }));
                          }
                        }}
                      />
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </SafeAreaView>
          </LinearGradient>
        </Modal>

        <ToastMessage
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={hideToast}
        />
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
    fontFamily: 'Heebo-Medium',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 20,
    marginTop: 16,
    fontFamily: 'Heebo-Medium',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Heebo-Bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'right',
  },
  statisticsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Heebo-Bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Heebo-Regular',
    color: '#fff',
    marginTop: 4,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Heebo-Medium',
    marginLeft: 4,
  },
  availabilityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayCard: {
    width: (width - 48) / 4 - 4,
    marginBottom: 12,
    alignItems: 'center',
  },
  dayToggle: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 4,
  },
  hoursText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Heebo-Regular',
    textAlign: 'center',
  },
  dayText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Heebo-Medium',
  },
  dayStatus: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Heebo-Regular',
    marginTop: 2,
  },
  appointmentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentDate: {
    fontSize: 16,
    fontFamily: 'Heebo-Medium',
    color: '#fff',
  },
  appointmentTime: {
    fontSize: 16,
    fontFamily: 'Heebo-Medium',
    color: '#fff',
  },
  appointmentBody: {
    marginBottom: 12,
  },
  appointmentUser: {
    fontSize: 14,
    fontFamily: 'Heebo-Regular',
    color: '#fff',
    marginBottom: 4,
  },
  appointmentNotes: {
    fontSize: 12,
    fontFamily: 'Heebo-Regular',
    color: '#ddd',
  },
  appointmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Heebo-Medium',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Heebo-Medium',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#ccc',
    fontSize: 16,
    fontFamily: 'Heebo-Regular',
    marginTop: 16,
  },
  actionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionCardText: {
    fontSize: 16,
    fontFamily: 'Heebo-Medium',
    color: '#fff',
    marginLeft: 12,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Heebo-Bold',
    color: '#fff',
  },
  modalScroll: {
    flex: 1,
    padding: 16,
  },
  modalLabel: {
    fontSize: 16,
    fontFamily: 'Heebo-Medium',
    color: '#fff',
    marginBottom: 8,
    marginTop: 16,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  pickerItemSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  pickerText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Heebo-Regular',
  },
  pickerTextSelected: {
    fontFamily: 'Heebo-Bold',
  },
  dateButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  dateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Heebo-Medium',
  },
  notesInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    minHeight: 80,
    textAlignVertical: 'top',
    fontFamily: 'Heebo-Regular',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 32,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Heebo-Bold',
  },
  workHourRow: {
    flexDirection: 'column',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  daySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayLabel: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Heebo-Bold',
    flex: 1,
  },
  availabilityToggle: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 80,
  },
  toggleText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Heebo-Bold',
    textAlign: 'center',
  },
  workHourControls: {
    width: '100%',
  },
  timeInputsContainer: {
    flexDirection: 'column',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  timeSelectSection: {
    flex: 1,
  },
  timeDisplayButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginTop: 8,
  },
  timeDisplayText: {
    color: '#fff',
    fontFamily: 'Heebo-Bold',
    fontSize: 16,
  },
  timeSlotsList: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    marginTop: 8,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  timeSlotsScroll: {
    maxHeight: 200,
    padding: 8,
  },
  timeSlotItem: {
    padding: 12,
    borderRadius: 6,
    marginVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  timeSlotSelected: {
    backgroundColor: '#667eea',
  },
  timeSlotText: {
    color: '#fff',
    fontFamily: 'Heebo-Regular',
    fontSize: 14,
    textAlign: 'center',
  },
  timeSlotTextSelected: {
    fontFamily: 'Heebo-Bold',
    color: '#fff',
  },
  timeLabel: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Heebo-Medium',
    marginBottom: 6,
  },
  timePickerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    width: 85,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  timePickerText: {
    color: '#fff',
    fontFamily: 'Heebo-Bold',
    fontSize: 16,
  },
  updateWorkHoursButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  updateWorkHoursText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Heebo-Bold',
    marginLeft: 8,
  },
  // Break styles
  breakToggleSection: {
    marginTop: 16,
  },
  breakToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  breakToggleText: {
    color: '#fff',
    fontFamily: 'Heebo-Medium',
    fontSize: 14,
    marginLeft: 8,
  },
  breakTimeContainer: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  breakSectionTitle: {
    color: '#FFC107',
    fontFamily: 'Heebo-Bold',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  breakTimesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  breakTimeSelect: {
    flex: 1,
  },
  breakTimeLabel: {
    color: '#FFC107',
    fontSize: 11,
    fontFamily: 'Heebo-Medium',
    marginBottom: 6,
  },
  breakTimeButton: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.4)',
  },
  breakTimeText: {
    color: '#FFC107',
    fontFamily: 'Heebo-Bold',
    fontSize: 12,
  },
  breakTimeSlotsList: {
    backgroundColor: 'rgba(255, 193, 7, 0.05)',
    borderRadius: 6,
    marginTop: 6,
    maxHeight: 150,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.2)',
  },
  breakTimeSlotsScroll: {
    maxHeight: 150,
    padding: 6,
  },
  breakTimeSlotItem: {
    padding: 8,
    borderRadius: 4,
    marginVertical: 1,
    backgroundColor: 'rgba(255, 193, 7, 0.05)',
  },
  breakTimeSlotSelected: {
    backgroundColor: '#FFC107',
  },
  breakTimeSlotText: {
    color: '#FFC107',
    fontFamily: 'Heebo-Regular',
    fontSize: 11,
    textAlign: 'center',
  },
  breakTimeSlotTextSelected: {
    fontFamily: 'Heebo-Bold',
    color: '#000',
  },
  notAvailableContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 8,
  },
  notAvailableText: {
    color: '#F44336',
    fontSize: 14,
    fontFamily: 'Heebo-Bold',
    textAlign: 'center',
  },
  notAvailableHint: {
    color: '#ccc',
    fontSize: 12,
    fontFamily: 'Heebo-Regular',
    textAlign: 'center',
    marginTop: 4,
  },
  // Appointment client styles
  appointmentClientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  clientInfo: {
    flex: 1,
  },
  clientPhoneSmall: {
    fontSize: 12,
    fontFamily: 'Heebo-Regular',
    color: '#ddd',
    marginTop: 2,
  },
  phoneButtonSmall: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    padding: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  // Next appointment styles
  nextAppointmentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  nextAppointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  nextAppointmentBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  nextAppointmentBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Heebo-Bold',
  },
  nextAppointmentDate: {
    fontSize: 16,
    fontFamily: 'Heebo-Medium',
    color: '#fff',
  },
  nextAppointmentTime: {
    fontSize: 16,
    fontFamily: 'Heebo-Bold',
    color: '#fff',
  },
  nextAppointmentClient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  nextAppointmentClientName: {
    fontSize: 18,
    fontFamily: 'Heebo-Bold',
    color: '#fff',
  },
  clientPhone: {
    fontSize: 14,
    fontFamily: 'Heebo-Regular',
    color: '#ddd',
    marginTop: 4,
  },
  phoneButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    padding: 12,
    borderRadius: 20,
    marginLeft: 12,
  },
  nextAppointmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextAppointmentNotes: {
    fontSize: 14,
    fontFamily: 'Heebo-Regular',
    color: '#ddd',
    flex: 1,
    marginRight: 12,
  },
  // New customer styles
  newCustomerItem: {
    borderWidth: 2,
    borderColor: '#667eea',
    borderStyle: 'dashed',
  },
  newCustomerText: {
    color: '#667eea',
    fontFamily: 'Heebo-Bold',
    marginLeft: 8,
  },
  userPhoneInList: {
    fontSize: 12,
    color: '#aaa',
    fontFamily: 'Heebo-Regular',
  },
  newCustomerFields: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  customerInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontFamily: 'Heebo-Regular',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  newCustomerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  noteText: {
    color: '#FFA726',
    fontSize: 12,
    fontFamily: 'Heebo-Regular',
    marginLeft: 8,
    flex: 1,
  },
  successNoteText: {
    color: '#4CAF50',
    fontSize: 12,
    fontFamily: 'Heebo-Bold',
    marginLeft: 8,
    flex: 1,
  },
});

// רכיב לקוח בתור
const AppointmentClient = ({ userId, appointment, onCall }: { 
  userId: string, 
  appointment?: any,
  onCall: (phone: string) => void 
}) => {
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Check if this is a walk-in customer
        if (userId === 'walk-in-customer' && appointment?.customerName) {
          setLoading(false);
          return;
        }
        
        const profile = await getUserProfile(userId);
        setUserData(profile);
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [userId, appointment]);

  if (loading) {
    return <Text style={styles.appointmentUser}>טוען פרטי לקוח...</Text>;
  }

  // Handle walk-in customer
  if (userId === 'walk-in-customer' && appointment?.customerName) {
    return (
      <View style={styles.appointmentClientRow}>
        <View style={styles.clientInfo}>
          <Text style={styles.appointmentUser}>
            לקוח: {appointment.customerName}
          </Text>
          {appointment.customerPhone && (
            <Text style={styles.clientPhoneSmall}>
              {appointment.customerPhone}
            </Text>
          )}
        </View>
        {appointment.customerPhone && (
          <TouchableOpacity
            style={styles.phoneButtonSmall}
            onPress={() => onCall(appointment.customerPhone)}
          >
            <Ionicons name="call" size={16} color="#4CAF50" />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (!userData) {
    return <Text style={styles.appointmentUser}>לקוח: לא זמין</Text>;
  }

  return (
    <View style={styles.appointmentClientRow}>
      <View style={styles.clientInfo}>
        <Text style={styles.appointmentUser}>
          לקוח: {userData.displayName || 'לא זמין'}
        </Text>
        {userData.phone && (
          <Text style={styles.clientPhoneSmall}>
            {userData.phone}
          </Text>
        )}
      </View>
      {userData.phone && (
        <TouchableOpacity
          style={styles.phoneButtonSmall}
          onPress={() => onCall(userData.phone)}
        >
          <Ionicons name="call" size={16} color="#4CAF50" />
        </TouchableOpacity>
      )}
    </View>
  );
};

// רכיב לקוח בתור הבא
const NextAppointmentClient = ({ userId, appointment, onCall }: { 
  userId: string, 
  appointment?: any,
  onCall: (phone: string) => void 
}) => {
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Check if this is a walk-in customer
        if (userId === 'walk-in-customer' && appointment?.customerName) {
          setLoading(false);
          return;
        }
        
        const profile = await getUserProfile(userId);
        setUserData(profile);
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [userId, appointment]);

  if (loading) {
    return (
      <View style={styles.nextAppointmentClient}>
        <ActivityIndicator size="small" color="#fff" />
        <Text style={styles.nextAppointmentClientName}>טוען...</Text>
      </View>
    );
  }

  // Handle walk-in customer
  if (userId === 'walk-in-customer' && appointment?.customerName) {
    return (
      <View style={styles.nextAppointmentClient}>
        <View style={styles.clientInfo}>
          <Text style={styles.nextAppointmentClientName}>
            {appointment.customerName}
          </Text>
          {appointment.customerPhone && (
            <Text style={styles.clientPhone}>
              {appointment.customerPhone}
            </Text>
          )}
        </View>
        {appointment.customerPhone && (
          <TouchableOpacity
            style={styles.phoneButton}
            onPress={() => onCall(appointment.customerPhone)}
          >
            <Ionicons name="call" size={20} color="#4CAF50" />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.nextAppointmentClient}>
        <Text style={styles.nextAppointmentClientName}>לקוח לא זמין</Text>
      </View>
    );
  }

  return (
    <View style={styles.nextAppointmentClient}>
      <View style={styles.clientInfo}>
        <Text style={styles.nextAppointmentClientName}>
          {userData.displayName || 'לקוח'}
        </Text>
        {userData.phone && (
          <Text style={styles.clientPhone}>
            {userData.phone}
          </Text>
        )}
      </View>
      {userData.phone && (
        <TouchableOpacity
          style={styles.phoneButton}
          onPress={() => onCall(userData.phone)}
        >
          <Ionicons name="call" size={20} color="#4CAF50" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default BarberDashboardScreen;