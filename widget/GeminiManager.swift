import Foundation
import UIKit

class GeminiManager {
    static let shared = GeminiManager()
    
    private init() {}
    
    func analyzeImage(image: UIImage) async throws -> [String: Any]? {
        let urlString = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=\(Secrets.geminiApiKey)"
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        guard let imageData = image.jpegData(compressionQuality: 0.5) else {
            throw NSError(domain: "GeminiManager", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to compress image"])
        }
        
        let base64Image = imageData.base64EncodedString()
        
        let prompt = """
        You are Aura, an AI assistant analyzing a screenshot from the user's phone.
        Analyze the context (e.g. WhatsApp conversation, email) and extract any scheduled events, meetings, or important tasks.
        Return ONLY a valid JSON. If an event is found, format it like this:
        { "hasEvent": true, "title": "Meeting with Dan", "time": "2024-05-10T20:00:00.000Z", "suggestedSpeech": "ראיתי שקבעת פגישה עם דני. הוספתי את זה ליומן." }
        If no event is found, return { "hasEvent": false, "suggestedSpeech": "לא זיהיתי משהו מיוחד במסך." }
        """
        
        let payload: [String: Any] = [
            "contents": [
                [
                    "parts": [
                        ["text": prompt],
                        [
                            "inlineData": [
                                "mimeType": "image/jpeg",
                                "data": base64Image
                            ]
                        ]
                    ]
                ]
            ]
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: payload, options: [])
        
        let (data, _) = try await URLSession.shared.data(for: request)
        
        if let json = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
           let candidates = json["candidates"] as? [[String: Any]],
           let first = candidates.first,
           let content = first["content"] as? [String: Any],
           let parts = content["parts"] as? [[String: Any]],
           let textPart = parts.first,
           let text = textPart["text"] as? String {
            
            let cleanText = text.replacingOccurrences(of: "```json", with: "").replacingOccurrences(of: "```", with: "").trimmingCharacters(in: .whitespacesAndNewlines)
            
            if let textData = cleanText.data(using: .utf8),
               let resultJson = try JSONSerialization.jsonObject(with: textData, options: []) as? [String: Any] {
                return resultJson
            }
        }
        
        return nil
    }
}
