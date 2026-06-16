import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, StatusBar, TextInput, AppState, AppStateStatus } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setupAudio, analyzeClipboardImage } from './contextAnalyzer';
import { addEventToCalendar, scheduleSmartAlert } from './calendarManager';

import { GoogleGenerativeAI } from '@google/generative-ai';

type Message = {
  id: string;
  text: string;
  isUser: boolean;
  type?: 'text' | 'action';
};

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export default function ChatScreen() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'היי, אני Aura. איך אפשר לעזור?', isUser: false }
  ]);
  const [inputText, setInputText] = useState('');
  const [suggestedAction, setSuggestedAction] = useState<any>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const checkOnboarding = async () => {
      const isComplete = await AsyncStorage.getItem('aura_onboarding_complete');
      if (isComplete !== 'true') {
        router.replace('/onboarding');
      } else {
        setupAudio();
      }
    };
    checkOnboarding();

    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        const action = await analyzeClipboardImage();
        if (action && action.hasEvent) {
          setSuggestedAction(action);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleApproveAction = async () => {
    if (suggestedAction) {
      const eventDate = new Date(suggestedAction.time);
      await addEventToCalendar(suggestedAction.title, eventDate, new Date(eventDate.getTime() + 60*60*1000));
      await scheduleSmartAlert(suggestedAction.title, eventDate, 2); // default 2 hours
      setMessages(prev => [...prev, { id: Date.now().toString(), text: `הוספתי את ${suggestedAction.title} ליומן!`, isUser: false }]);
      setSuggestedAction(null);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    if (!GEMINI_API_KEY) {
      alert("Please set EXPO_PUBLIC_GEMINI_API_KEY in your .env file");
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), text: inputText, isUser: true };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `You are Aura, a fast, minimal personal AI assistant. Be concise. 
If the user asks to control a device or do an action (e.g. "open the door", "turn on lights"), 
you MUST reply ONLY with a valid JSON in this exact format: {"action": "iot_command", "device": "<device_name>", "state": "<state>"}
Otherwise, respond normally with text in Hebrew.
The user says: ${userMsg.text}`;
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      let aiMsg: Message = { id: (Date.now() + 1).toString(), text, isUser: false };
      
      // Try to parse JSON for IoT command
      try {
        const parsed = JSON.parse(text);
        if (parsed.action === 'iot_command') {
          aiMsg.text = `מפעילה את: ${parsed.device} (${parsed.state})`;
          aiMsg.type = 'action';
          // Stub for actual HTTP webhook request
          console.log(`[Webhook Output] -> POST http://<ESP32_IP>/api/${parsed.device} state=${parsed.state}`);
        }
      } catch (e) {
        // Not a JSON, just regular text
      }

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.isUser;
    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {item.type === 'action' ? (
          <View style={styles.actionCard}>
            <Ionicons name="hardware-chip-outline" size={20} color="#00ffcc" />
            <Text style={styles.actionText}>{item.text}</Text>
          </View>
        ) : (
          <Text style={styles.messageText}>{item.text}</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AURA</Text>
      </View>

      {suggestedAction && (
        <View style={styles.suggestionCard}>
          <Text style={styles.suggestionTitle}>הצעה לפעולה 💡</Text>
          <Text style={styles.suggestionText}>{suggestedAction.suggestedSpeech}</Text>
          <View style={styles.suggestionButtons}>
            <TouchableOpacity style={styles.approveBtn} onPress={handleApproveAction}>
              <Text style={styles.approveBtnText}>כן, תוסיפי</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setSuggestedAction(null)}>
              <Text style={styles.cancelBtnText}>לא עכשיו</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Chat List */}
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.chatList}
        inverted={false}
      />

      {/* Input & FAB Area */}
      <View style={styles.inputContainer}>
        <TouchableOpacity 
          style={[styles.fab, isRecording && styles.fabRecording]}
          onPress={() => setIsRecording(!isRecording)}
          activeOpacity={0.8}
        >
          <Ionicons name={isRecording ? "mic-off" : "mic"} size={24} color={isRecording ? "#ff4444" : "#fff"} />
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          placeholder="Ask Aura..."
          placeholderTextColor="#666"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
        />
        
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 4,
  },
  suggestionCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#161616',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  suggestionTitle: {
    color: '#00ffcc',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  suggestionText: {
    color: '#fff',
    marginBottom: 16,
  },
  suggestionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  approveBtn: {
    backgroundColor: '#00ffcc',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  approveBtnText: {
    color: '#000',
    fontWeight: 'bold',
  },
  cancelBtn: {
    backgroundColor: '#333',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelBtnText: {
    color: '#fff',
  },
  chatList: {
    padding: 16,
    paddingBottom: 100, // Space for FAB
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 20,
    marginVertical: 6,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1E1E1E',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#222222',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: '#E0E0E0',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'right', // Support for Hebrew
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  actionText: {
    color: '#A8A8A8',
    fontSize: 13,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    gap: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    textAlign: 'right',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  fabRecording: {
    borderColor: '#ff4444',
    shadowColor: '#ff4444',
    shadowOpacity: 0.6,
    shadowRadius: 15,
  }
});
