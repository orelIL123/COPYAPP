import React, { useEffect, useState } from 'react';
import ProfileScreen from '../screens/ProfileScreen';
import AuthChoiceScreen from '../screens/AuthChoiceScreen';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../config/firebase';

export default function ProfileTab() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleNavigate = (screen: string) => {
    switch (screen) {
      case 'home':
        router.replace('/');
        break;
      case 'team':
        router.replace('/team');
        break;
      case 'booking':
        router.replace('/booking');
        break;
      case 'explore':
        router.replace('/explore');
        break;
      case 'auth':
        router.push('/screens/AuthChoiceScreen');
        break;
      default:
        router.replace('/');
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  // Show loading while checking auth state
  if (loading) {
    return null;
  }

  // If user is not authenticated, show AuthChoiceScreen
  if (!user) {
    return <AuthChoiceScreen />;
  }

  // If user is authenticated, show ProfileScreen
  return (
    <ProfileScreen 
      onNavigate={handleNavigate} 
      onBack={handleBack}
    />
  );
} 