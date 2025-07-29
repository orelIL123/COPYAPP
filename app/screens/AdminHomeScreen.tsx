import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dimensions,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { checkIsAdmin, createAdminUser, db, initializeCollections, initializeGalleryImages, listAllStorageImages, makeCurrentUserAdmin, onAuthStateChange, replaceGalleryPlaceholders, resetGalleryWithRealImages, restoreGalleryFromStorage } from '../../services/firebase';
import ToastMessage from '../components/ToastMessage';
import TopNav from '../components/TopNav';

const { width } = Dimensions.get('window');

interface AdminHomeScreenProps {
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const AdminHomeScreen: React.FC<AdminHomeScreenProps> = ({ onNavigate, onBack }) => {
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  const [aboutUsText, setAboutUsText] = useState('');
  const [aboutUsLoading, setAboutUsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        const adminStatus = await checkIsAdmin(user.uid);
        setIsAdmin(adminStatus);
        if (!adminStatus) {
          setToast({
            visible: true,
            message: t('admin.no_permission', { uid: user.uid }),
            type: 'error'
          });
          // Give user more time to see the UID and debug
          setTimeout(() => onNavigate('home'), 5000);
        }
      } else {
        onNavigate('home');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Load about text from DB
  useEffect(() => {
    const fetchAboutUs = async () => {
      try {
        const db = getFirestore();
        const docRef = doc(db, 'settings', 'aboutus');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setAboutUsText(snap.data().text || '');
        }
      } catch (e) {
        showToast(t('admin.about_load_error'), 'error');
      } finally {
        setAboutUsLoading(false);
      }
    };
    fetchAboutUs();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const handleInitializeGallery = async () => {
    try {
      showToast(t('admin.initializing_gallery'), 'success');
      await initializeGalleryImages();
      showToast(t('admin.gallery_initialized'), 'success');
    } catch (error) {
      console.error('Error initializing gallery:', error);
      showToast(t('admin.gallery_init_error'), 'error');
    }
  };

  const handleReplaceGallery = async () => {
    try {
      showToast(t('admin.replacing_images'), 'success');
      await replaceGalleryPlaceholders();
      showToast(t('admin.images_replaced'), 'success');
    } catch (error) {
      console.error('Error replacing gallery:', error);
      showToast(t('admin.image_replace_error'), 'error');
    }
  };

  const handleResetGallery = async () => {
    try {
      showToast(t('admin.resetting_gallery'), 'success');
      await resetGalleryWithRealImages();
      showToast(t('admin.gallery_reset'), 'success');
    } catch (error) {
      console.error('Error resetting gallery:', error);
      showToast(t('admin.gallery_reset_error'), 'error');
    }
  };

  const handleListStorage = async () => {
    try {
      showToast(t('admin.checking_storage'), 'success');
      await listAllStorageImages();
      showToast(t('admin.check_console'), 'success');
    } catch (error) {
      console.error('Error listing storage:', error);
      showToast(t('admin.storage_check_error'), 'error');
    }
  };

  const handleRestoreFromStorage = async () => {
    try {
      showToast(t('admin.restoring_images'), 'success');
      const count = await restoreGalleryFromStorage();
      showToast(t('admin.images_restored', { count }), 'success');
    } catch (error) {
      console.error('Error restoring from storage:', error);
      showToast(t('admin.restore_error'), 'error');
    }
  };

  const handleSaveAboutUs = async () => {
    setAboutUsLoading(true);
    try {
      const db = getFirestore();
      await setDoc(doc(db, 'settings', 'aboutus'), { text: aboutUsText });
      showToast(t('admin.text_saved'));
    } catch (e) {
      showToast(t('admin.text_save_error'), 'error');
    } finally {
      setAboutUsLoading(false);
    }
  };

  const adminMenuItems = [
    {
      title: t('admin.manage_appointments_title'),
      subtitle: t('admin.manage_appointments_subtitle'),
      icon: 'calendar',
      screen: 'admin-appointments',
      color: '#007bff'
    },
    {
      title: t('admin.manage_treatments_title'),
      subtitle: t('admin.manage_treatments_subtitle'),
      icon: 'cut',
      screen: 'admin-treatments',
      color: '#28a745'
    },
    {
      title: t('admin.manage_team_title'),
      subtitle: t('admin.manage_team_subtitle'),
      icon: 'people',
      screen: 'admin-team',
      color: '#ffc107'
    },
    {
      title: t('admin.manage_gallery_title'),
      subtitle: t('admin.manage_gallery_subtitle'),
      icon: 'images',
      screen: 'admin-gallery',
      color: '#dc3545'
    },
    {
      title: t('admin.availability_settings_title'),
      subtitle: t('admin.availability_settings_subtitle'),
      icon: 'time',
      screen: 'admin-availability',
      color: '#6f42c1'
    },
    {
      title: t('admin.business_stats_title'),
      subtitle: t('admin.business_stats_subtitle'),
      icon: 'analytics',
      screen: 'admin-statistics',
      color: '#17a2b8'
    },
    {
      title: t('admin.manage_notifications_title'),
      subtitle: t('admin.manage_notifications_subtitle'),
      icon: 'notifications',
      screen: 'admin-notifications',
      color: '#6c757d'
    },
    {
      title: t('admin.admin_settings_title'),
      subtitle: t('admin.admin_settings_subtitle'),
      icon: 'settings',
      screen: 'admin-settings',
      color: '#fd7e14'
    },
    {
      title: t('admin.view_as_client_title'),
      subtitle: t('admin.view_as_client_subtitle'),
      icon: 'eye',
      screen: 'home',
      color: '#fd7e14'
    }
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('admin.checking_permissions')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={64} color="#dc3545" />
          <Text style={styles.errorText}>{t('admin.no_admin_permissions')}</Text>
          <Text style={styles.debugText}>UID: {currentUserId}</Text>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: '#28a745', marginBottom: 12 }]} 
            onPress={async () => {
              try {
                await makeCurrentUserAdmin();
                showToast(t('admin.admin_permissions_created'), 'success');
                // Force refresh by reloading the component
                setTimeout(() => {
                  onNavigate('admin-home');
                }, 1000);
              } catch (error) {
                showToast(t('admin.admin_permissions_error'), 'error');
              }
            }}
          >
            <Text style={styles.backButtonText}>{t('admin.make_me_admin_debug')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('home')}>
            <Text style={styles.backButtonText}>{t('admin.back_to_home')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title={t('admin.admin_panel')}
        onBellPress={() => {}}
        onMenuPress={() => {}}
        showBackButton={true}
        onBackPress={onBack || (() => onNavigate('home'))}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Welcome Header */}
          <View style={styles.welcomeSection}>
            <LinearGradient
              colors={['#000000', '#333333']}
              style={styles.welcomeGradient}
            >
              <Text style={styles.welcomeTitle}>{t('admin.welcome_title')}</Text>
              <Text style={styles.welcomeSubtitle}>{t('admin.welcome_subtitle')}</Text>
            </LinearGradient>
          </View>

          {/* System Status */}
          <View style={styles.systemSection}>
            <Text style={styles.systemTitle}>{t('admin.system_status')}</Text>
            <View style={styles.systemItem}>
              <View style={styles.systemInfo}>
                <Text style={styles.systemLabel}>Firestore Database</Text>
                <Text style={styles.systemStatus}>{t('admin.active')}</Text>
              </View>
              <View style={[styles.statusIndicator, styles.statusActive]} />
            </View>
            
            <TouchableOpacity 
              style={styles.initButton}
              onPress={handleInitializeGallery}
            >
              <Ionicons name="images" size={20} color="#fff" />
              <Text style={styles.initButtonText}>{t('admin.init_gallery_dummy')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.initButton, { backgroundColor: '#dc3545', marginTop: 12 }]}
              onPress={handleReplaceGallery}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.initButtonText}>{t('admin.replace_gray_images')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.initButton, { backgroundColor: '#28a745', marginTop: 12 }]}
              onPress={handleResetGallery}
            >
              <Ionicons name="trash" size={20} color="#fff" />
              <Text style={styles.initButtonText}>{t('admin.delete_all_create_new')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.initButton, { backgroundColor: '#6f42c1', marginTop: 12 }]}
              onPress={handleListStorage}
            >
              <Ionicons name="folder" size={20} color="#fff" />
              <Text style={styles.initButtonText}>{t('admin.check_firebase_storage')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.initButton, { backgroundColor: '#fd7e14', marginTop: 12 }]}
              onPress={handleRestoreFromStorage}
            >
              <Ionicons name="download" size={20} color="#fff" />
              <Text style={styles.initButtonText}>{t('admin.restore_my_images')}</Text>
            </TouchableOpacity>
          </View>

          {/* Edit about us text */}
          <View style={{margin: 16, backgroundColor: '#222', borderRadius: 12, padding: 16}}>
            <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 18, marginBottom: 8}}>{t('admin.edit_about_text')}</Text>
            <TextInput
              value={aboutUsText}
              onChangeText={setAboutUsText}
              placeholder={t('admin.enter_about_text')}
              style={{backgroundColor: '#333', color: '#fff', borderRadius: 8, padding: 8, minHeight: 80, marginBottom: 8}}
              placeholderTextColor="#aaa"
              multiline
            />
            <TouchableOpacity style={{backgroundColor: '#007bff', borderRadius: 8, padding: 12, marginTop: 8}} onPress={handleSaveAboutUs} disabled={aboutUsLoading}>
              <Text style={{color: 'white', fontWeight: 'bold', textAlign: 'center'}}>{aboutUsLoading ? t('common.saving') : t('admin.save_text')}</Text>
            </TouchableOpacity>
          </View>

          {/* Admin Menu Grid */}
          <View style={styles.menuGrid}>
            {adminMenuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => {
                  if (item.screen === 'home') {
                    showToast(t('admin.switching_to_client_view'));
                  } else {
                    showToast(t('admin.opening_screen', { title: item.title }));
                  }
                  onNavigate(item.screen);
                }}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: item.color }]}>
                  <Ionicons name={item.icon as any} size={28} color="#fff" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick Stats */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>{t('admin.quick_stats')}</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>12</Text>
                <Text style={styles.statLabel}>{t('admin.appointments_today')}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>3</Text>
                <Text style={styles.statLabel}>{t('admin.active_barbers')}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>8</Text>
                <Text style={styles.statLabel}>{t('admin.treatments')}</Text>
              </View>
            </View>
          </View>

          {/* Initialize Collections Button */}
          <View style={styles.initSection}>
            <TouchableOpacity
              style={styles.initButton}
              onPress={async () => {
                try {
                  await initializeCollections();
                  showToast('Collections initialized successfully!');
                } catch (error) {
                  showToast('Error initializing collections', 'error');
                }
              }}
            >
              <Text style={styles.initButtonText}>Initialize Database Collections</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <ToastMessage
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 20,
    color: '#dc3545',
    marginTop: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  debugText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  backButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 100,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeGradient: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
  },
  menuGrid: {
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  menuIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
    textAlign: 'right',
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 16,
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  initSection: {
    marginTop: 24,
    alignItems: 'center',
  },
  initButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  initButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  systemSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  systemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 16,
    textAlign: 'right',
  },
  systemItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 16,
  },
  systemInfo: {
    flex: 1,
  },
  systemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
  },
  systemStatus: {
    fontSize: 14,
    color: '#28a745',
    textAlign: 'right',
    marginTop: 2,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#28a745',
  },
});

export default AdminHomeScreen;