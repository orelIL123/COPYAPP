import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, getFirestore, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Animated,
    Dimensions,
    Image,
    ImageBackground,
    InteractionManager,
    Linking,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { auth } from '../../config/firebase';
import SideMenu from '../components/SideMenu';
import TopNav from '../components/TopNav';

const { height } = Dimensions.get('window');

interface HomeScreenProps {
  onNavigate: (screen: string) => void;
}

const NeonButton: React.FC<{
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  style?: any;
}> = ({ title, onPress, variant = 'primary', style }) => {
  return (
    <TouchableOpacity
      style={[
        styles.neonButton,
        variant === 'primary' ? styles.neonButtonPrimary : styles.neonButtonSecondary,
        style,
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.neonButtonText,
        variant === 'primary' ? styles.neonButtonTextPrimary : styles.neonButtonTextSecondary,
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

function HomeScreen({ onNavigate }: HomeScreenProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [sideMenuVisible, setSideMenuVisible] = useState(false);
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [settingsImages, setSettingsImages] = useState<{
    atmosphere: string;
    aboutUs: string;
    gallery: string[];
    aboutUsBottom: string;
  }>({
    atmosphere: '',
    aboutUs: '',
    gallery: [],
    aboutUsBottom: '',
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('ברוכים הבאים ל-Barbers Bar!');
  const [subtitleMessage, setSubtitleMessage] = useState('המספרה המקצועית שלך');
  const [aboutUsMessage, setAboutUsMessage] = useState('ברוכים הבאים ל-Barbers Bar! כאן תיהנו מחוויה אישית, מקצועית ומפנקת, עם יחס חם לכל לקוח. רן אגלריסי, בעל ניסיון של שנים בתחום, מזמין אתכם להתרווח, להתחדש ולהרגיש בבית.');
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const ctaFade = useRef(new Animated.Value(0)).current;
  const cardsFade = useRef(new Animated.Value(0)).current;

  // 3D Carousel refs
  const carousel3DRef = useRef<ScrollView>(null);
  const cardWidth = 180;
  const cardHeight = 320; // 9:16 aspect ratio
  const cardSpacing = -30; // Negative spacing to show next image
  const scrollX = useRef(new Animated.Value(0)).current;

  // Get original images array from Firebase Storage
  console.log('Gallery images from Firebase:', settingsImages.gallery);
  console.log('Gallery length:', settingsImages.gallery.length);
  
  // Always show gallery with test data if no Firebase images
  const testImages = [
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400',
    'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400'
  ];
  
  const originalImages = settingsImages.gallery.length > 0 ? settingsImages.gallery : testImages;

  // Create infinite scroll data by duplicating images
  const infiniteImages = originalImages.length > 0 ? [...originalImages, ...originalImages, ...originalImages] : [];
  const originalLength = originalImages.length;
  const itemWidth = cardWidth + cardSpacing;

  // 3D Transform function for carousel cards
  const getCardTransform = (index: number, scrollXValue: Animated.Value) => {
    const cardOffset = index * (cardWidth + cardSpacing);
    const inputRange = [
      cardOffset - cardWidth - cardSpacing,
      cardOffset,
      cardOffset + cardWidth + cardSpacing,
    ];
    
    const translateX = scrollXValue.interpolate({
      inputRange,
      outputRange: [cardWidth / 2, 0, -cardWidth / 2],
      extrapolate: 'extend',
    });
    
    const scale = scrollXValue.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'extend',
    });
    
    const rotateY = scrollXValue.interpolate({
      inputRange,
      outputRange: ['-45deg', '0deg', '45deg'],
      extrapolate: 'extend',
    });
    
    const opacity = scrollXValue.interpolate({
      inputRange,
      outputRange: [0.5, 1, 0.5],
      extrapolate: 'extend',
    });

    return {
      transform: [
        { translateX },
        { scale },
        { rotateY },
        { perspective: 1000 },
      ],
      opacity,
    };
  };

  // Handle infinite scroll
  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const totalWidth = originalLength * itemWidth;
    if (offsetX >= totalWidth * 2) {
      carousel3DRef.current?.scrollTo({
        x: offsetX - totalWidth,
        animated: false,
      });
    } else if (offsetX <= 0) {
      carousel3DRef.current?.scrollTo({
        x: offsetX + totalWidth,
        animated: false,
      });
    }
  };

  useEffect(() => {
    setTimeout(() => {
      carousel3DRef.current?.scrollTo({
        x: originalLength * itemWidth,
        animated: false,
      });
    }, 100);
  }, [originalLength, itemWidth]);

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 1500);
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(headerFade, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(ctaFade, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(cardsFade, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      fetchImages();
    });
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    return unsubscribe;
  }, []);

  // Fetch images from Firebase gallery collection and settings
  const fetchImages = async () => {
    try {
      const db = getFirestore();
      const galleryQuery = query(collection(db, 'gallery'), where('isActive', '==', true));
      const gallerySnapshot = await getDocs(galleryQuery);
      const galleryImages: string[] = [];
      gallerySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === 'gallery' && data.imageUrl) {
          galleryImages.push(data.imageUrl);
        }
      });
      galleryImages.sort((a, b) => {
        const docA = gallerySnapshot.docs.find(doc => doc.data().imageUrl === a);
        const docB = gallerySnapshot.docs.find(doc => doc.data().imageUrl === b);
        const orderA = docA?.data().order || 0;
        const orderB = docB?.data().order || 0;
        return orderA - orderB;
      });
      
      // Get images from settings
      let atmosphereImage = '';
      let aboutUsImage = '';
      let aboutUsBottomImage = '';
      const settingsDocRef = doc(db, 'settings', 'images');
      const settingsDocSnap = await getDoc(settingsDocRef);
      if (settingsDocSnap.exists()) {
        const settingsData = settingsDocSnap.data();
        atmosphereImage = settingsData.atmosphereImage || '';
        aboutUsImage = settingsData.aboutUsImage || '';
        aboutUsBottomImage = settingsData.aboutUsBottomImage || '';
      }
      
      // If no aboutUsBottomImage in settings, try to get from Storage path
      if (!aboutUsBottomImage) {
        // You would typically get this from Firebase Storage directly
        // For now, we'll check if there's an aboutus folder image
        const aboutUsQuery = query(collection(db, 'gallery'), 
          where('path', '==', 'aboutus/ABOUTUS'),
          where('isActive', '==', true)
        );
        const aboutUsSnapshot = await getDocs(aboutUsQuery);
        if (!aboutUsSnapshot.empty) {
          aboutUsBottomImage = aboutUsSnapshot.docs[0].data().imageUrl || '';
        }
      }
      
      setSettingsImages({
        atmosphere: atmosphereImage,
        aboutUs: aboutUsImage,
        gallery: galleryImages,
        aboutUsBottom: aboutUsBottomImage,
      });
    } catch (err) {
      console.error('Error fetching images:', err);
      // fallback to empty
      setSettingsImages({
        atmosphere: '',
        aboutUs: '',
        gallery: [],
        aboutUsBottom: '',
      });
    }
  };

  const handleBookingPress = () => {
    if (!isAuthenticated) {
      Alert.alert(
        'התחברות נדרשת',
        'עליך להתחבר או להירשם כדי לקבוע תור',
        [
          { text: 'ביטול', style: 'cancel' },
          { text: 'התחבר', onPress: () => onNavigate('auth') }
        ]
      );
      return;
    }
    onNavigate('booking');
  };

  const handleGalleryPress = () => {
    onNavigate('gallery');
  };

  const handleTeamPress = () => {
    onNavigate('team');
  };

  const handleMyAppointmentsPress = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'התחברות נדרשת',
        'עליך להתחבר כדי לצפות בתורים שלך',
        [
          { text: 'ביטול', style: 'cancel' },
          { text: 'התחבר', onPress: () => onNavigate('auth') }
        ]
      );
      return;
    }

    try {
      // Import the function to get user appointments
      const { getUserAppointments } = await import('../../services/firebase');
      const userAppointments = await getUserAppointments(auth.currentUser?.uid || '');
      
      if (userAppointments.length === 0) {
        Alert.alert(
          'התורים שלי',
          'אין לך תורים קיימים',
          [
            { text: 'הזמן תור חדש', onPress: () => onNavigate('booking') },
            { text: 'סגור', style: 'cancel' }
          ]
        );
        return;
      }

      // Filter upcoming appointments
      const upcomingAppointments = userAppointments
        .filter(apt => apt.status === 'confirmed' || apt.status === 'pending')
        .slice(0, 5); // Show up to 5 appointments

      if (upcomingAppointments.length === 0) {
        Alert.alert(
          'התורים שלי',
          'אין לך תורים קרובים',
          [
            { text: 'הזמן תור חדש', onPress: () => onNavigate('booking') },
            { text: 'סגור', style: 'cancel' }
          ]
        );
        return;
      }

      // Format appointments for display
      const formatDate = (timestamp: any) => {
        if (!timestamp) return 'תאריך לא ידוע';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('he-IL', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      };

      const getStatusText = (status: string) => {
        switch (status) {
          case 'confirmed': return 'מאושר';
          case 'pending': return 'ממתין לאישור';
          case 'completed': return 'הושלם';
          case 'cancelled': return 'בוטל';
          default: return status;
        }
      };

      // Get treatment and barber names for each appointment
      const appointmentDetails = await Promise.all(
        upcomingAppointments.map(async (apt) => {
          try {
            const [treatment, barber] = await Promise.all([
              import('../../services/firebase').then(m => m.getTreatments()).then(treatments => 
                treatments.find(t => t.id === apt.treatmentId)
              ),
              import('../../services/firebase').then(m => m.getBarbers()).then(barbers => 
                barbers.find(b => b.id === apt.barberId)
              )
            ]);
            
            return {
              ...apt,
              treatmentName: treatment?.name || 'טיפול לא ידוע',
              barberName: barber?.name || 'מספר לא ידוע'
            };
          } catch (error) {
            return {
              ...apt,
              treatmentName: 'טיפול לא ידוע',
              barberName: 'מספר לא ידוע'
            };
          }
        })
      );

      const appointmentList = appointmentDetails.map(apt => 
        `📅 ${formatDate(apt.date)}\n📋 ${apt.treatmentName}\n👤 ${apt.barberName}\n✅ ${getStatusText(apt.status)}`
      ).join('\n\n');

      // Show appointments in a styled alert
      Alert.alert(
        '📅 התורים הקרובים שלי',
        appointmentList,
        [
          { 
            text: '📋 הזמן תור חדש', 
            onPress: () => onNavigate('booking')
          },
          { 
            text: '❌ סגור', 
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('Error fetching appointments:', error);
      Alert.alert(
        'שגיאה',
        'לא ניתן לטעון את התורים כרגע',
        [{ text: 'סגור', style: 'default' }]
      );
    }
  };

  const handleCallPress = () => {
    const phoneNumber = '0548353232';
    Linking.openURL(`tel:${phoneNumber}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>טוען...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopNav title="Barbers Bar" onMenuPress={() => setSideMenuVisible(true)} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.backgroundWrapper}>
          <ImageBackground
            source={settingsImages.atmosphere ? { uri: settingsImages.atmosphere } : require('../../assets/images/ATMOSPHERE.jpg')}
            style={styles.atmosphereImage}
            resizeMode="cover"
          >
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.heroGradient}
            />
          </ImageBackground>
        </View>

        {/* Greeting and CTA Section */}
        <Animated.View 
          style={[
            styles.greetingCtaContainer, 
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.05)', 'rgba(3, 3, 3, 0.95)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          />
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>{welcomeMessage || t('home.welcome')}</Text>
            <Text style={styles.subtitle}>{subtitleMessage || t('home.subtitle')}</Text>
          </View>
          <NeonButton
            title={t('home.book_appointment')}
            onPress={() => onNavigate('booking')}
            variant="primary"
            style={styles.ctaButton}
          />
        </Animated.View>

        {/* Content */}
        <View style={styles.contentWrapper}>
          {/* Quick Actions Section */}
          <Animated.View style={[styles.quickActionsSection, { opacity: cardsFade }]}>
            <Text style={styles.sectionTitle}>פעולות מהירות</Text>
            <View style={styles.quickActionsContainer}>
              <TouchableOpacity style={styles.quickActionButton} onPress={handleTeamPress}>
                <LinearGradient
                  colors={['rgba(59, 130, 246, 0.1)', 'rgba(255, 255, 255, 0.95)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.quickActionGradient}
                />
                <Ionicons name="people" size={28} color="#3b82f6" />
                <Text style={styles.quickActionText}>הצוות שלנו</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.quickActionButton} onPress={handleMyAppointmentsPress}>
                <LinearGradient
                  colors={['rgba(59, 130, 246, 0.1)', 'rgba(255, 255, 255, 0.95)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.quickActionGradient}
                />
                <Ionicons name="calendar" size={28} color="#3b82f6" />
                <Text style={styles.quickActionText}>התורים שלי</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.quickActionButton} onPress={handleCallPress}>
                <LinearGradient
                  colors={['rgba(59, 130, 246, 0.1)', 'rgba(255, 255, 255, 0.95)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.quickActionGradient}
                />
                <Ionicons name="call" size={28} color="#3b82f6" />
                <Text style={styles.quickActionText}>התקשר</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* 3D Gallery Carousel Section */}
          <Animated.View style={[styles.gallerySection, { opacity: cardsFade }]}>
              <Text style={styles.sectionTitle}>{t('home.gallery')}</Text>
              <View style={styles.carousel3DContainer}>
                <Animated.ScrollView 
                  ref={carousel3DRef}
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={styles.carousel3DContent}
                  pagingEnabled={false}
                  decelerationRate="normal"
                  onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false, listener: handleScroll }
                  )}
                  scrollEventThrottle={16}
                >
                  {infiniteImages.map((img, index) => (
                    <Animated.View 
                      key={`gallery-${index}`} 
                      style={[
                        styles.carousel3DCard,
                        getCardTransform(index, scrollX),
                      ]}
                    >
                      <Image
                        source={{ uri: img }}
                        style={styles.carousel3DImage}
                        resizeMode="cover"
                      />
                      <View style={styles.carousel3DOverlay}>
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.8)']}
                          style={styles.carousel3DGradient}
                        />
                      </View>
                    </Animated.View>
                  ))}
                </Animated.ScrollView>
              </View>
          </Animated.View>
          {/* About Us Section */}
          <Animated.View style={[styles.aboutUsSection, { opacity: cardsFade }]}>
            <Text style={styles.sectionTitle}>הכירו אותנו</Text>
            <View style={styles.aboutUsCard}>
              <LinearGradient
                colors={['rgba(59, 130, 246, 0.1)', 'rgba(139, 69, 19, 0.1)', 'rgba(0, 0, 0, 0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.aboutUsGradient}
              />
              <Image
                source={settingsImages.aboutUs ? { uri: settingsImages.aboutUs } : require('../../assets/images/ATMOSPHERE.jpg')}
                style={styles.aboutUsTopImage}
                resizeMode="cover"
              />
              <View style={styles.aboutUsContent}>
                <Text style={styles.aboutUsText}>
                  {aboutUsMessage}
                </Text>
                {settingsImages.aboutUsBottom && (
                  <Image
                    source={{ uri: settingsImages.aboutUsBottom }}
                    style={styles.aboutUsBottomImage}
                    resizeMode="cover"
                  />
                )}
              </View>
            </View>
          </Animated.View>

          {/* Social Media Links */}
          <Animated.View style={[styles.socialSection, { opacity: cardsFade }]}>
            <Text style={styles.sectionTitle}>עקבו אחרינו</Text>
            <View style={styles.socialContainer}>
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-instagram" size={28} color="#E4405F" />
                <Text style={styles.socialText}>Instagram</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-facebook" size={28} color="#1877F2" />
                <Text style={styles.socialText}>Facebook</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-whatsapp" size={28} color="#25D366" />
                <Text style={styles.socialText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Contact Section */}
          <Animated.View style={[styles.contactSection, { opacity: cardsFade }]}>
            <Text style={styles.sectionTitle}>צור קשר</Text>
            <View style={styles.contactInfo}>
              <LinearGradient
                colors={['rgba(59, 130, 246, 0.05)', 'rgba(255, 255, 255, 0.95)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.contactGradient}
              />
              <View style={styles.contactItem}>
                <Ionicons name="call" size={20} color="#3b82f6" />
                <Text style={styles.contactText}>050-1234567</Text>
              </View>
              <View style={styles.contactItem}>
                <Ionicons name="location" size={20} color="#3b82f6" />
                <Text style={styles.contactText}>רחוב הראשי 123, תל אביב</Text>
              </View>
              <View style={styles.contactItem}>
                <Ionicons name="time" size={20} color="#3b82f6" />
                <Text style={styles.contactText}>א'-ה' 9:00-20:00, ו' 9:00-15:00</Text>
              </View>
            </View>
          </Animated.View>

          {/* Terms of Service */}
          <View style={styles.termsSection}>
            <TouchableOpacity onPress={() => setShowTerms(true)} style={styles.termsButton}>
              <Text style={styles.termsText}>תנאי שימוש</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <SideMenu
        visible={sideMenuVisible}
        onClose={() => setSideMenuVisible(false)}
        onNavigate={onNavigate}
      />
      
      {/* Terms Modal */}
      {showTerms && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>תנאי שימוש</Text>
            <ScrollView style={styles.modalScrollView}>
              <Text style={styles.modalText}>
                ברוכים הבאים ל-Barbers Bar. השימוש באפליקציה כפוף לתנאים הבאים:{'\n\n'}
                
                1. השירות מיועד לקביעת תורים והכרת הצוות והשירותים{'\n'}
                2. יש לספק מידע מדויק בעת קביעת התור{'\n'}
                3. ביטול תור יש לבצע לפחות 24 שעות מראש{'\n'}
                4. המספרה שומרת את הזכות לשנות את התנאים{'\n'}
                5. המידע האישי מוגן ולא יועבר לצדדים שלישיים{'\n\n'}
                
                לפרטים נוספים ניתן לפנות למספרה ישירות.
              </Text>
            </ScrollView>
            <TouchableOpacity 
              style={styles.modalCloseButton} 
              onPress={() => setShowTerms(false)}
            >
              <Text style={styles.modalCloseText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  backgroundWrapper: {
    height: height * 0.55,
    position: 'relative',
    overflow: 'hidden',
  },
  atmosphereImage: {
    width: '100%',
    height: '100%',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    zIndex: 1,
  },
  greetingCtaContainer: {
    position: 'absolute',
    top: height * 0.42,
    left: 30,
    right: 30,
    zIndex: 10,
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 140,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  ctaButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    zIndex: 2,
  },
  greetingContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    left: 140,
    zIndex: 2,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'right',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 14,
    color: '#e0e0e0',
    textAlign: 'right',
    fontWeight: '400',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  contentWrapper: {
    paddingTop: 120,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  neonButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 2,
  },
  neonButtonPrimary: {
    backgroundColor: '#3b82f6',
    borderColor: '#60a5fa',
    shadowColor: '#3b82f6',
  },
  neonButtonSecondary: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
  },
  neonButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  neonButtonTextPrimary: {
    color: '#ffffff',
  },
  neonButtonTextSecondary: {
    color: '#3b82f6',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  quickActionsSection: {
    marginBottom: 15,
    paddingVertical: 3,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  quickActionButton: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    paddingVertical: 20,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  quickActionGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 8,
    textAlign: 'center',
  },
  gallerySection: {
    marginBottom: 15,
    paddingVertical: 10,
  },
  carousel3DContainer: {
    height: 340,
    overflow: 'hidden',
  },
  carousel3DContent: {
    paddingHorizontal: 50,
    alignItems: 'center',
  },
  carousel3DCard: {
    width: 180,
    height: 320,
    marginHorizontal: 5,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
  },
  carousel3DImage: {
    width: '100%',
    height: '100%',
  },
  carousel3DOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  carousel3DGradient: {
    flex: 1,
  },
  aboutUsSection: {
    marginBottom: 20,
    paddingVertical: 5,
  },
  aboutUsCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  aboutUsGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  aboutUsTopImage: {
    width: '100%',
    height: 200,
  },
  aboutUsContent: {
    padding: 24,
  },
  aboutUsText: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
    textAlign: 'right',
    fontWeight: '400',
  },
  socialSection: {
    marginBottom: 20,
    paddingVertical: 8,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  socialButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  socialText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
    marginTop: 6,
  },
  contactSection: {
    marginBottom: 25,
    paddingVertical: 8,
  },
  contactInfo: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  contactGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 3,
  },
  contactText: {
    fontSize: 16,
    color: '#1a1a1a',
    marginLeft: 12,
    fontWeight: '500',
  },
  aboutUsBottomImage: {
    width: '100%',
    height: 180,
    borderRadius: 15,
    marginTop: 12,
  },
  termsSection: {
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 8,
  },
  termsButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  termsText: {
    fontSize: 14,
    color: '#666666',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalScrollView: {
    maxHeight: 300,
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
    textAlign: 'right',
  },
  modalCloseButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default HomeScreen;