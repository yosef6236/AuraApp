import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const requestCalendarPermissions = async () => {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status === 'granted') {
    return true;
  }
  return false;
};

const getDefaultCalendarSource = async () => {
  const defaultCalendar = await Calendar.getDefaultCalendarAsync();
  return defaultCalendar.source;
};

export const addEventToCalendar = async (title: string, startDate: Date, endDate: Date, location?: string) => {
  try {
    const defaultCalendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    let calendarId = null;

    if (Platform.OS === 'ios') {
      const defaultCal = defaultCalendars.find(cal => cal.isPrimary) || defaultCalendars[0];
      calendarId = defaultCal?.id;
    } else {
      const defaultCal = defaultCalendars.find(cal => cal.source.name === 'Default') || defaultCalendars[0];
      calendarId = defaultCal?.id;
    }

    if (!calendarId) {
       // Create a new Aura calendar
       const source = Platform.OS === 'ios' ? await getDefaultCalendarSource() : { isLocalAccount: true, name: 'Aura', type: 'LOCAL' } as Calendar.Source;
       calendarId = await Calendar.createCalendarAsync({
         title: 'Aura Events',
         color: '#00ffcc',
         entityType: Calendar.EntityTypes.EVENT,
         sourceId: source.id,
         source: source,
         name: 'AuraEvents',
         ownerAccount: 'personal',
         accessLevel: Calendar.CalendarAccessLevel.OWNER,
       });
    }

    // Create the event without alarms
    const eventId = await Calendar.createEventAsync(calendarId, {
      title,
      startDate,
      endDate,
      location,
      alarms: [], // Explicitly no alarms so Apple Calendar doesn't notify
    });

    return eventId;
  } catch (error) {
    console.error('Error adding event to calendar:', error);
    return null;
  }
};

export const scheduleSmartAlert = async (title: string, eventDate: Date, alertHoursBefore: number = 2) => {
  const triggerDate = new Date(eventDate.getTime() - (alertHoursBefore * 60 * 60 * 1000));
  
  if (triggerDate.getTime() > Date.now()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Aura Reminder 📅',
        body: `Upcoming: ${title} is in ${alertHoursBefore} hours.`,
      },
      trigger: { date: triggerDate },
    });
  }
};
