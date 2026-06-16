import Foundation
import EventKit

class EventKitManager {
    static let shared = EventKitManager()
    let store = EKEventStore()
    
    private init() {}
    
    func requestAccess() async throws -> Bool {
        if #available(iOS 17.0, *) {
            return try await store.requestWriteOnlyAccessToEvents()
        } else {
            return try await store.requestAccess(to: .event)
        }
    }
    
    func addEvent(title: String, timeString: String) async throws -> Bool {
        let granted = try await requestAccess()
        guard granted else { return false }
        
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: timeString) else {
            // Fallback for different ISO8601 formats
            let fallbackFormatter = ISO8601DateFormatter()
            if let fbDate = fallbackFormatter.date(from: timeString) {
                return try await createAndSaveEvent(title: title, date: fbDate)
            }
            throw NSError(domain: "EventKitManager", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid date format"])
        }
        
        return try await createAndSaveEvent(title: title, date: date)
    }
    
    private func createAndSaveEvent(title: String, date: Date) async throws -> Bool {
        let event = EKEvent(eventStore: store)
        event.title = title
        event.startDate = date
        event.endDate = date.addingTimeInterval(3600) // 1 hour duration
        event.calendar = store.defaultCalendarForNewEvents
        
        // Add alarm (1 hour before)
        event.addAlarm(EKAlarm(relativeOffset: -3600))
        
        try store.save(event, span: .thisEvent)
        return true
    }
}
