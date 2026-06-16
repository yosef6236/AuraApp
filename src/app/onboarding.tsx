import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { setupGeofencing } from './backgroundLocation';

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    homeAddress: '',
    dormAddress: '',
    workAddress: '',
  });

  const handleNext = async () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      // Final step: request location permission and save
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied. Aura needs this for smart notifications.');
      } else {
        await Location.requestBackgroundPermissionsAsync(); // important for geofencing
        
        // Geocode addresses
        const regions = [];
        try {
          if (formData.homeAddress) {
            const homeGeo = await Location.geocodeAsync(formData.homeAddress);
            if (homeGeo.length > 0) regions.push({ identifier: 'Home', latitude: homeGeo[0].latitude, longitude: homeGeo[0].longitude });
          }
          if (formData.dormAddress) {
            const dormGeo = await Location.geocodeAsync(formData.dormAddress);
            if (dormGeo.length > 0) regions.push({ identifier: 'Dorm', latitude: dormGeo[0].latitude, longitude: dormGeo[0].longitude });
          }
          if (formData.workAddress) {
            const workGeo = await Location.geocodeAsync(formData.workAddress);
            if (workGeo.length > 0) regions.push({ identifier: 'Work', latitude: workGeo[0].latitude, longitude: workGeo[0].longitude });
          }
          
          if (regions.length > 0) {
            await setupGeofencing(regions);
          }
        } catch (e) {
          console.error("Geocoding failed", e);
        }
      }

      await AsyncStorage.setItem('aura_user_profile', JSON.stringify(formData));
      await AsyncStorage.setItem('aura_onboarding_complete', 'true');
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Welcome to Aura</Text>
        <Text style={styles.subtitle}>Let's set up your personal AI assistant.</Text>

        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.label}>What should I call you?</Text>
            <TextInput
              style={styles.input}
              placeholder="Your Name"
              placeholderTextColor="#666"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.label}>Where is your Home?</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 123 Main St, City"
              placeholderTextColor="#666"
              value={formData.homeAddress}
              onChangeText={(text) => setFormData({ ...formData, homeAddress: text })}
            />
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.label}>Where is your College / Dorm?</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Campus Dorms, City"
              placeholderTextColor="#666"
              value={formData.dormAddress}
              onChangeText={(text) => setFormData({ ...formData, dormAddress: text })}
            />
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={styles.label}>Where do you work?</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 456 Business Rd, City"
              placeholderTextColor="#666"
              value={formData.workAddress}
              onChangeText={(text) => setFormData({ ...formData, workAddress: text })}
            />
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>{step < 4 ? 'Next' : 'Finish Setup'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#888',
    fontSize: 16,
    marginBottom: 40,
    textAlign: 'center',
  },
  stepContainer: {
    marginBottom: 30,
  },
  label: {
    color: '#ddd',
    fontSize: 18,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1E1E1E',
    color: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#00ffcc',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
