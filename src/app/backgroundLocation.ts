import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_TASK_NAME = 'background-location-task';
const GEOFENCING_TASK_NAME = 'background-geofencing-task';

// Configure Notifications to show when app is in foreground as well
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

TaskManager.defineTask(GEOFENCING_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.error('Geofencing Task Error:', error);
    return;
  }
  const { eventType, region } = data as any;
  if (eventType === Location.GeofencingEventType.Enter) {
    console.log("You've entered region:", region.identifier);
    Notifications.scheduleNotificationAsync({
      content: {
        title: 'Aura Location Alert 📍',
        body: `You have arrived at ${region.identifier}. Let me know if you need anything!`,
      },
      trigger: null, // trigger immediately
    });
  } else if (eventType === Location.GeofencingEventType.Exit) {
    console.log("You've left region:", region.identifier);
  }
});

export const setupGeofencing = async (locations: { identifier: string, latitude: number, longitude: number, radius?: number }[]) => {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status === 'granted') {
    const regions = locations.map(loc => ({
      identifier: loc.identifier,
      latitude: loc.latitude,
      longitude: loc.longitude,
      radius: loc.radius || 100, // 100 meters default
      notifyOnEnter: true,
      notifyOnExit: true,
    }));
    await Location.startGeofencingAsync(GEOFENCING_TASK_NAME, regions);
  }
};
