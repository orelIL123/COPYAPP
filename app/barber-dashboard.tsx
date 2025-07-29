import { useRouter } from 'expo-router';
import React from 'react';
import BarberDashboardScreen from './screens/BarberDashboardScreen';

export default function BarberDashboardTab() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    console.log('Barber Dashboard navigating to:', screen);
    switch (screen) {
      case 'home':
        router.replace('/');
        break;
      case 'profile':
        router.replace('/profile');
        break;
      case 'settings':
        router.replace('/settings');
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

  return (
    <BarberDashboardScreen 
      onNavigate={handleNavigate} 
      onBack={handleBack}
    />
  );
}