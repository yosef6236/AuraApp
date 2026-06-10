import AppIntents

struct AskAuraIntent: AppIntent {
    static var title: LocalizedStringResource = "Ask Aura"
    static var description = IntentDescription("Sends a prompt to Aura.")
    
    @Parameter(title: "Prompt")
    var prompt: String
    
    func perform() async throws -> some IntentResult {
        // Here we can either make a direct network call or save the text somewhere
        // Since we are running in the background, we can just return a string for now.
        return .result(dialog: "Aura received your prompt: \(prompt)")
    }
}
