import ActivityKit
import Foundation

struct AuraWidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var stateText: String
    }
    var title: String
}
