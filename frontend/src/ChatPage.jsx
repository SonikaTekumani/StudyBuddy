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

    // Add user message
    setMessages((prev) => [...prev, { from: "user", text: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5001/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await res.json();
      const botReply = data.reply || "No reply received.";

      setMessages((prev) => [...prev, { from: "bot", text: botReply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text: "⚠️ Error reaching server. Make sure backend is running.",
        },
      ]);
    }

    setLoading(false);
  };

  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        height: "100vh",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h2 style={{ textAlign: "center" }}>📚 Study Buddy Chat</h2>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          background: "#fff",
          padding: "1rem",
          borderRadius: "0.75rem",
          marginBottom: "1rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent:
                msg.from === "user" ? "flex-end" : "flex-start",
              marginBottom: "0.5rem",
            }}
          >
            <div
              style={{
                background:
                  msg.from === "user"
                    ? "#4f46e5"
                    : "rgba(79, 70, 229, 0.1)",
                color: msg.from === "user" ? "#fff" : "#111",
                padding: "0.6rem 1rem",
                borderRadius: "0.75rem",
                maxWidth: "70%",
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && <div>Typing…</div>}
      </div>

      <form
        onSubmit={sendMessage}
        style={{ display: "flex", gap: "0.5rem" }}
      >
        <input
          type="text"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{
            flex: 1,
            padding: "0.7rem 1rem",
            borderRadius: "1rem",
            border: "1px solid #ccc",
            fontSize: "1rem",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.7rem 1.2rem",
            borderRadius: "1rem",
            background: "#4f46e5",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
