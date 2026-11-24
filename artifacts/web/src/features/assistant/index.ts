/**
 * features/assistant/index.ts — Generative AI Assistant feature barrel
 *
 * This feature covers:
 * - Full-screen conversational chat interface
 * - Session management (create / resume sessions)
 * - RAG-powered responses grounded in real incident/anomaly data
 * - Conversation history display
 * - Source citation in responses
 *
 * Exports are added here as the Assistant module is built:
 *
 *   export { AssistantPage }          from './AssistantPage';
 *   export { ChatInterface }          from './components/ChatInterface';
 *   export { MessageBubble }          from './components/MessageBubble';
 *   export { SessionList }            from './components/SessionList';
 *   export { useChat }                from './hooks/useChat';
 *
 * API hooks used by this feature:
 *   - usePostAssistantChat()
 *   - useGetAssistantSessions()
 *   - useGetAssistantSession(id)
 */

export {};
