import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { addEventToCalendar, scheduleSmartAlert } from './calendarManager';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export const setupAudio = async () => {
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: false,
    staysActiveInBackground: true,
  });
};

export const speakNatural = (text: string) => {
  Speech.speak(text, {
    language: 'he-IL',
    pitch: 1.1,
    rate: 0.9,
  });
};

export const analyzeClipboardImage = async () => {
  const hasImage = await Clipboard.hasImageAsync();
  if (!hasImage) return null;

  try {
    const imageResult = await Clipboard.getImageAsync({ format: 'png' });
    if (!imageResult || !imageResult.data) return null;
    
    const base64Data = imageResult.data;
    await Clipboard.setStringAsync(""); // Clear clipboard so we don't process it again

    speakNatural("אני קוראת את המסך שלך עכשיו...");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `You are Aura, an AI assistant analyzing a screenshot from the user's phone.
Analyze the context (e.g. WhatsApp conversation, email) and extract any scheduled events, meetings, or important tasks.
Return ONLY a valid JSON. If an event is found, format it like this:
{ "hasEvent": true, "title": "Meeting with Dan", "time": "2024-05-10T20:00:00.000Z", "suggestedSpeech": "ראיתי שקבעת פגישה עם דני. תרצה שאוסיף ליומן?" }
If no event is found, return { "hasEvent": false, "suggestedSpeech": "לא זיהיתי משהו מיוחד במסך." }`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: "image/png" } }
    ]);

    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (parsed.hasEvent && parsed.suggestedSpeech) {
      speakNatural(parsed.suggestedSpeech);
      // We return the event details so the UI can show an "Approve" button
      return parsed;
    } else if (parsed.suggestedSpeech) {
      speakNatural(parsed.suggestedSpeech);
    }
    
    return null;

  } catch (error) {
    console.error("Error analyzing image:", error);
    speakNatural("הייתה לי שגיאה בפענוח המסך.");
    return null;
  }
};
