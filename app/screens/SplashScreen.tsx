import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import React, { useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export default function SplashScreen() {
  const navigation = useNavigation();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Start fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate after 2 seconds
    const timer = setTimeout(() => {
      (navigation as any).navigate('(tabs)');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.imageContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.logoContainer}>
          <View style={[styles.logo, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="cut" size={64} color="#3b82f6" />
            <Text style={{ color: '#3b82f6', marginTop: 8, fontSize: 16, fontWeight: 'bold' }}>Barbers Bar</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // רקע כהה
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: 250,
    height: 250,
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
  },
}); 