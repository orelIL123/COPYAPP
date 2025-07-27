import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import SettingsScreen from '../screens/SettingsScreen';

export default function SettingsTab() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    switch (screen) {
      case 'home':
        router.replace('/(tabs)');
        break;
      case 'profile':
        router.replace('/profile');
        break;
      case 'admin-home':
        router.replace('/admin-home');
        break;
      default:
        router.replace('/(tabs)');
    }
  };

  const handleBack = () => {
    router.replace('/(tabs)');
  };

  return <SettingsScreen onNavigate={handleNavigate} onBack={handleBack} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});