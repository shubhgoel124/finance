import { useEffect, useRef, useState } from "react";
import { Send, Bot, AlertCircle, Sparkles } from "lucide-react";
import api from "../api/client";
import PageHeader from "../components/PageHeader";
import { getApiErrorMessage } from "../utils/apiError";

function ChatPage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        'Hi! Ask me anything about your spending. For example:\n• "Where did I spend the most this month?"\n• "Suggest a weekly savings target"\n• "Compare my spending with last month"',
      followUps: [
        "Top expenses this month",
        "My largest category",
        "Savings advice",
      ],
      context: [],
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [loading, messages]);

  const send = async (nextQuery) => {
    const trimmedQuery = String(nextQuery || "").trim();
    if (!trimmedQuery || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmedQuery }]);
    setLoading(true);
    setError("");

    try {
      const { data } = await api.post("/chat", {
        query: trimmedQuery,
        history: messages
          .slice(-8)
          .map(({ role, content }) => ({ role, content })),
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          followUps: data.followUps || [],
          context: data.retrievedContext || [],
        },
      ]);
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        "I could not generate an answer right now. Check the API configuration and try again.",
      );
      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm having trouble connecting to my brain right now. Please check if the API key is configured correctly and try again.",
          followUps: [],
          context: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await send(query);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)] max-w-4xl mx-auto animate-fade">
      <PageHeader
        title="AI Assistant"
        subtitle="Conversational analysis of your spending habits."
      />

      <div className="flex-1 min-h-0 mc-card flex flex-col overflow-hidden mb-6">
        {}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.map((message, index) => {
            const isUser = message.role === "user";

            return (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${isUser ? "justify-end" : "justify-start"} animate-slide`}
              >
                <div
                  className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${isUser ? "flex-row-reverse" : "flex-row"}`}
                >
                  {}
                  <div
                    className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center mt-1
                    ${isUser ? "bg-slate-200" : "bg-[var(--accent)]"}`}
                  >
                    {!isUser && <Bot size={16} className="text-white" />}
                  </div>

                  {}
                  <div className="space-y-3">
                    <div
                      className={`px-4 py-3 whitespace-pre-wrap text-sm leading-relaxed
                      ${isUser ? "mc-bubble-user" : "mc-bubble-bot"}`}
                    >
                      {message.content}
                    </div>

                    {}
                    {!isUser &&
                      message.context &&
                      message.context.length > 0 && (
                        <details className="mt-1 group">
                          <summary className="text-xs text-[var(--text-muted)] cursor-pointer list-none flex items-center gap-1.5 hover:text-[var(--text-secondary)] transition-colors">
                            <Sparkles size={12} />
                            <span>View 3 transaction sources</span>
                          </summary>
                          <div className="mt-2 text-xs bg-[var(--bg-muted)] rounded-lg p-3 space-y-2 border border-[var(--border-light)] max-h-40 overflow-auto">
                            {message.context.map((item, contextIndex) => (
                              <div
                                key={`${item.description}-${contextIndex}`}
                                className="flex justify-between gap-4 py-1"
                              >
                                <span className="text-[var(--text-secondary)] font-medium truncate">
                                  {item.description}
                                </span>
                                <span className="font-semibold shrink-0">
                                  ₹{Number(item.amount || 0).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}

                    {}
                    {!isUser &&
                      message.followUps &&
                      message.followUps.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {message.followUps.map((followUp, followUpIndex) => (
                            <button
                              key={`${followUp}-${followUpIndex}`}
                              type="button"
                              className="bg-white border border-[var(--border)] text-[var(--text-secondary)] text-xs font-medium px-3 py-1.5 rounded-full hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                              onClick={() => send(followUp)}
                              disabled={loading}
                            >
                              {followUp}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              </div>
            );
          })}

          {}
          {loading && (
            <div className="flex justify-start animate-fade">
              <div className="flex gap-3 max-w-[85%] flex-row">
                <div className="w-8 h-8 rounded-full bg-[var(--accent)] shrink-0 flex items-center justify-center mt-1">
                  <Bot size={16} className="text-white" />
                </div>
                <div className="mc-bubble-bot px-5 py-4 flex items-center gap-1.5 h-10 w-16">
                  <span className="mc-typing-dot"></span>
                  <span className="mc-typing-dot"></span>
                  <span className="mc-typing-dot"></span>
                </div>
              </div>
            </div>
          )}

          <div ref={endRef} className="h-4" />
        </div>

        {}
        {error && (
          <div className="mx-6 mb-2 p-3 text-sm rounded-lg bg-[var(--rose-light)] text-[var(--rose)] flex items-center gap-2 border border-[var(--rose-border)]">
            <AlertCircle size={16} />
            <p className="truncate">{error}</p>
          </div>
        )}

        {}
        <div className="p-4 bg-[var(--bg-surface)] border-t border-[var(--border)]">
          <form onSubmit={handleSubmit} className="relative">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask me anything..."
              className="w-full bg-[var(--bg-muted)] border border-transparent focus:border-[var(--border)] focus:bg-white text-[var(--text-primary)] rounded-full pl-5 pr-14 py-3.5 outline-none transition-all shadow-sm"
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 bottom-1.5 w-10 flex items-center justify-center bg-[var(--accent)] text-white rounded-full hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:bg-[var(--border)]"
              disabled={!query.trim() || loading}
              title="Send message"
            >
              <Send size={16} />
            </button>
          </form>
          <p className="text-[10px] text-center text-[var(--text-muted)] mt-2">
            AI can make mistakes. Always verify important financial decisions.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
