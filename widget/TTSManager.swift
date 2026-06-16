import Foundation
import AVFoundation

class TTSManager: NSObject, AVAudioPlayerDelegate {
    static let shared = TTSManager()
    private var audioPlayer: AVAudioPlayer?
    private var activeContinuation: CheckedContinuation<Void, Error>?

    private override init() {
        super.init()
    }

    func speak(text: String, voiceId: String = "21m00Tcm4TlvDq8ikWAM", completion: @escaping (Bool) -> Void) {
        let urlString = "https://api.elevenlabs.io/v1/text-to-speech/\(voiceId)"
        guard let url = URL(string: urlString) else {
            completion(false)
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(Secrets.elevenLabsApiKey, forHTTPHeaderField: "xi-api-key")

        let payload: [String: Any] = [
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": [
                "stability": 0.5,
                "similarity_boost": 0.75
            ]
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: payload, options: [])
        } catch {
            print("Failed to serialize TTS payload")
            completion(false)
            return
        }

        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            guard let data = data, error == nil else {
                print("TTS request failed: \(error?.localizedDescription ?? "Unknown error")")
                completion(false)
                return
            }

            do {
                // To play audio in background intent, we need proper audio session
                try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.mixWithOthers, .duckOthers])
                try AVAudioSession.sharedInstance().setActive(true)

                self.audioPlayer = try AVAudioPlayer(data: data)
                self.audioPlayer?.delegate = self
                self.audioPlayer?.prepareToPlay()
                self.audioPlayer?.play()
                
                // Do not call completion(true) here, wait for delegate
            } catch {
                print("Failed to play audio: \(error.localizedDescription)")
                completion(false)
            }
        }
        task.resume()
    }
    
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        activeContinuation?.resume()
        activeContinuation = nil
    }
    
    func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        activeContinuation?.resume(throwing: error ?? NSError(domain: "TTSManager", code: 2, userInfo: nil))
        activeContinuation = nil
    }

    // Async wrapper for modern Swift concurrency
    func speakAsync(text: String, voiceId: String = "21m00Tcm4TlvDq8ikWAM") async throws {
        return try await withCheckedThrowingContinuation { continuation in
            self.activeContinuation = continuation
            speak(text: text, voiceId: voiceId) { success in
                if !success {
                    continuation.resume(throwing: NSError(domain: "TTSManager", code: 1, userInfo: nil))
                    self.activeContinuation = nil
                }
            }
        }
    }
}
