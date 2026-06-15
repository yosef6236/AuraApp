import ExpoModulesCore
import ActivityKit

public class ReactNativeWidgetExtensionModule: Module {
    public func definition() -> ModuleDefinition {
        Name("ReactNativeWidgetExtension")
        
        Function("areActivitiesEnabled") { () -> Bool in
            let logger = Logger(logHandlers: [])
            logger.info("areActivitiesEnabled()")
            
            if #available(iOS 16.2, *) {
                return ActivityAuthorizationInfo().areActivitiesEnabled
            } else {
                return false
            }
        }
        
        Function("startActivity") { (stateText: String) -> Void in
            let logger = Logger(logHandlers: [])
            logger.info("startActivity()")
            
            if #available(iOS 16.2, *) {
                let attributes = AuraWidgetAttributes(title: "Aura")
                let contentState = AuraWidgetAttributes.ContentState(stateText: stateText)
                
                let activityContent = ActivityContent(state: contentState, staleDate: nil)
                
                do {
                    let activity = try Activity.request(attributes: attributes, content: activityContent)
                    logger.info("Requested a Live Activity \(String(describing: activity.id)).")
                } catch (let error) {
                    logger.info("Error requesting Live Activity \(error.localizedDescription).")
                }
            }
        }

        Function("updateActivity") { (stateText: String) -> Void in
            let logger = Logger(logHandlers: [])
            logger.info("updateActivity()")
            
            if #available(iOS 16.2, *) {
                let contentState = AuraWidgetAttributes.ContentState(stateText: stateText)
                let updatedContent = ActivityContent(state: contentState, staleDate: nil)
                
                Task {
                    for activity in Activity<AuraWidgetAttributes>.activities {
                        await activity.update(updatedContent)
                        logger.info("Updated the Live Activity: \(activity.id)")
                    }
                }
            }
        }
        
        Function("endActivity") { () -> Void in
            let logger = Logger(logHandlers: [])
            logger.info("endActivity()")
            
            if #available(iOS 16.2, *) {
                let contentState = AuraWidgetAttributes.ContentState(stateText: "")
                let finalContent = ActivityContent(state: contentState, staleDate: nil)
                
                Task {
                    for activity in Activity<AuraWidgetAttributes>.activities {
                        await activity.end(finalContent, dismissalPolicy: .default)
                        logger.info("Ending the Live Activity: \(activity.id)")
                    }
                }
            }
        }
    }
}
