import AppIntents
import UIKit
import ActivityKit

@available(iOS 16.2, *)
struct AskAuraIntent: AppIntent {
    static var title: LocalizedStringResource = "Ask Aura"
    static var description = IntentDescription("Analyzes an image and schedules an event.")
    
    @Parameter(title: "Image", description: "The screenshot to analyze")
    var imageFile: IntentFile
    
    func perform() async throws -> some IntentResult {
        // Start Live Activity
        var activity: Activity<AuraWidgetAttributes>? = nil
        let attributes = AuraWidgetAttributes(title: "Aura")
        let initialContentState = AuraWidgetAttributes.ContentState(stateText: "Aura is analyzing your screen...")
        
        do {
            activity = try Activity.request(attributes: attributes, content: ActivityContent(state: initialContentState, staleDate: nil))
        } catch {
            print("Failed to start Live Activity: \(error)")
        }
        
        do {
            let data = try await imageFile.data(from: .data)
            guard let image = UIImage(data: data) else {
                throw NSError(domain: "AskAuraIntent", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid image data"])
            }
            
            // Call Gemini
            let result = try await GeminiManager.shared.analyzeImage(image: image)
            
            if let result = result {
                let hasEvent = result["hasEvent"] as? Bool ?? false
                let suggestedSpeech = result["suggestedSpeech"] as? String ?? "Done"
                
                // Update Activity
                if let currentActivity = activity {
                    let updateState = AuraWidgetAttributes.ContentState(stateText: suggestedSpeech)
                    await currentActivity.update(ActivityContent(state: updateState, staleDate: nil))
                }
                
                // Schedule Event
                if hasEvent, let title = result["title"] as? String, let time = result["time"] as? String {
                    _ = try? await EventKitManager.shared.addEvent(title: title, timeString: time)
                }
                
                // Play TTS
                do {
                    try await TTSManager.shared.speakAsync(text: suggestedSpeech)
                } catch {
                    print("TTS Failed: \(error)")
                }
            } else {
                // No result
                try await TTSManager.shared.speakAsync(text: "לא מצאתי שום דבר מיוחד במסך.")
            }
            
        } catch {
            print("Error in AskAuraIntent: \(error)")
            if let currentActivity = activity {
                let errorState = AuraWidgetAttributes.ContentState(stateText: "An error occurred.")
                await currentActivity.update(ActivityContent(state: errorState, staleDate: nil))
            }
            try? await TTSManager.shared.speakAsync(text: "הייתה שגיאה בניתוח המסך.")
        }
        
        // End Live Activity
        if let currentActivity = activity {
            let finalState = AuraWidgetAttributes.ContentState(stateText: "Finished")
            await currentActivity.end(ActivityContent(state: finalState, staleDate: nil), dismissalPolicy: .immediate)
        }
        
        return .result()
    }
}
