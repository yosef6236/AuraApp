import ActivityKit
import WidgetKit
import SwiftUI



struct AuraWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: AuraWidgetAttributes.self) { context in
            // Lock screen/banner UI
            VStack {
                HStack {
                    Image(systemName: "waveform.circle.fill")
                        .foregroundColor(.cyan)
                    Text(context.state.stateText)
                        .font(.headline)
                        .foregroundColor(.white)
                }
                .padding()
            }
            .activityBackgroundTint(Color.black.opacity(0.8))
            .activitySystemActionForegroundColor(Color.cyan)
            
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "waveform")
                        .foregroundColor(.cyan)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("Aura")
                        .foregroundColor(.cyan)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.state.stateText)
                        .font(.caption)
                        .foregroundColor(.white)
                }
            } compactLeading: {
                Image(systemName: "waveform.circle.fill")
                    .foregroundColor(.cyan)
            } compactTrailing: {
                Text("...")
                    .foregroundColor(.gray)
            } minimal: {
                Image(systemName: "waveform.circle.fill")
                    .foregroundColor(.cyan)
            }
        }
    }
}
