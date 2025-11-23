// frontend/src/pages/ChatPage.jsx
import React, { useEffect, useRef, useState } from "react";

// IMPORTANT: Use VITE_CHATBOT_URL instead of VITE_API_BASE
// Example: VITE_CHATBOT_URL=http://localhost:5001/api/chat
const CHATBOT_URL = import.meta.env.VITE_CHATBOT_URL || "http://localhost:5001/api/chat";

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi! I’m your Study Buddy. Ask me anything 😊" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (e) => {
    if (e?.preventDefault) e.preventDefault();

    const trimmed = input.trim();
    if (!trimmed) return;

    // Add user message to UI
    setMessages((prev) => [...prev, { from: "user", text: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(CHATBOT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Chat API ERROR:", res.status, errText);
        setMessages((prev) => [
          ...prev,
          { from: "bot", text: `⚠️ Server error ${res.status}: ${errText}` },
        ]);
        return;
      }

      const data = await res.json();
      const reply =
        data.reply || data.message || data.output || "⚠️ No reply received.";

      setMessages((prev) => [...prev, { from: "bot", text: reply }]);

    } catch (err) {
      console.error("Network error:", err);
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: "⚠️ Error contacting server. Is it running?" },
      ]);
    }

    setLoading(false);
  };

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "18px auto",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 48px)",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "0.75rem 1rem",
          background: "#fff",
          borderRadius: "0.75rem",
          marginBottom: "1rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <h2 style={{ margin: 0 }}>📚 Study Buddy Chat</h2>
        <small style={{ color: "#555" }}>
          Connected to: <code>{CHATBOT_URL}</code>
        </small>
      </header>

      {/* Messages area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          background: "#fff",
          padding: "1rem",
          borderRadius: "0.75rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          marginBottom: "1rem",
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.from === "user" ? "flex-end" : "flex-start",
              marginBottom: "0.5rem",
            }}
          >
            <div
              style={{
                maxWidth: "72%",
                padding: "0.6rem 0.85rem",
                borderRadius: "0.75rem",
                background:
                  msg.from === "user" ? "#4f46e5" : "rgba(79, 70, 229, 0.08)",
                color: msg.from === "user" ? "#fff" : "#111827",
                boxShadow:
                  msg.from === "user"
                    ? "0 6px 18px rgba(79,70,229,0.18)"
                    : "none",
                whiteSpace: "pre-wrap",
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ marginTop: "0.5rem", color: "#777" }}>Typing…</div>
        )}
      </div>

      {/* Input row */}
      <form onSubmit={sendMessage} style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="text"
          value={input}
          placeholder="Ask me something…"
          onChange={(e) => setInput(e.target.value)}
          style={{
            flex: 1,
            padding: "0.75rem 1rem",
            borderRadius: "999px",
            border: "1px solid #ddd",
            fontSize: "1rem",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.75rem 1.2rem",
            borderRadius: "999px",
            border: "none",
            background: loading ? "#999" : "#4f46e5",
            color: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
