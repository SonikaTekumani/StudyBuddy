import React, { useState } from "react";

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi! I’m your Study Buddy. Ask me anything 😊" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    // Add user message to chat
    const newMessages = [...messages, { from: "user", text: trimmed }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5001/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await res.json();

      const botReply = data.reply || "Sorry, I didn't get a reply.";
      setMessages((prev) => [...prev, { from: "bot", text: botReply }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: "⚠️ Error talking to server. Is it running?" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        boxSizing: "border-box",
      }}
    >
      <header
        style={{
          padding: "0.75rem 1rem",
          borderRadius: "0.75rem",
          background: "white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ margin: 0 }}>📚 Study Buddy Chat</h2>
        <small style={{ color: "#666" }}>
          Backend: <code>http://localhost:5001/api/chat</code>
        </small>
      </header>

      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          background: "white",
          borderRadius: "0.75rem",
          padding: "1rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          marginBottom: "1rem",
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              justifyContent: msg.from === "user" ? "flex-end" : "flex-start",
              marginBottom: "0.5rem",
            }}
          >
            <div
              style={{
                maxWidth: "70%",
                padding: "0.5rem 0.75rem",
                borderRadius: "0.75rem",
                background:
                  msg.from === "user" ? "#4f46e5" : "rgba(79, 70, 229, 0.08)",
                color: msg.from === "user" ? "white" : "#111827",
                whiteSpace: "pre-wrap",
                fontSize: "0.95rem",
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "#666" }}>
            Typing…
          </div>
        )}
      </div>

      {/* Input form */}
      <form onSubmit={sendMessage} style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="text"
          placeholder="Ask me something…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{
            flex: 1,
            padding: "0.75rem 1rem",
            borderRadius: "999px",
            border: "1px solid #d1d5db",
            outline: "none",
            fontSize: "0.95rem",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.75rem 1.2rem",
            borderRadius: "999px",
            border: "none",
            backgroundColor: loading ? "#9ca3af" : "#4f46e5",
            color: "white",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 500,
          }}
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
