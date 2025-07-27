import { useRouter } from 'expo-router';
import HomeScreen from '../screens/HomeScreen';

export default function HomeTab() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    switch (screen) {
      case 'auth':
        router.push('/screens/AuthChoiceScreen');
        break;
      case 'booking':
        router.push('/booking');
        break;
      case 'team':
        router.push('/team');
        break;
      case 'gallery':
        router.push('/explore');
        break;
      case 'profile':
        router.push('/profile');
        break;
      case 'settings':
        router.push('/settings');
        break;
      default:
        break;
    }
  };

  return <HomeScreen onNavigate={handleNavigate} />;
}