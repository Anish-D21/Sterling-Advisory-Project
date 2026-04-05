// frontend/js/chatbot.js

const Chatbot = {
    // 1. Internal State
    conversationHistory: [],

    // 2. The Core Send Logic
    send: async function() {
        const chatInput = document.getElementById("chat-input");
        const chatSend = document.getElementById("chat-send");
        const chatOutput = document.getElementById("chat-output");

        const msg = chatInput.value.trim();
        if (!msg) return;

        this.appendMessage("user", msg);
        chatInput.value = "";
        chatSend.disabled = true;

        // Optimistic "typing" indicator
        const typing = document.createElement("div");
        typing.className = "chat-msg bot-msg typing-indicator"; // Matches your CSS
        typing.innerHTML = `<div class="msg-bubble">Sterling is thinking...</div>`;
        chatOutput.appendChild(typing);
        chatOutput.scrollTop = chatOutput.scrollHeight;

        try {
            const res = await fetch("/api/chatbot/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    message: msg, 
                    history: this.conversationHistory 
                }),
            });

            typing.remove();
            const data = await res.json();

            if (!res.ok) {
                this.appendMessage("bot", `⚠️ ${data.error || "Something went wrong."}`);
                return;
            }

            // Update history
            this.conversationHistory.push({ role: "user", content: msg });
            this.conversationHistory.push({ role: "assistant", content: data.reply });

            this.appendMessage("bot", data.reply);

        } catch (err) {
            if (typing) typing.remove();
            this.appendMessage("bot", "⚠️ Could not reach the server. Is the backend running?");
        } finally {
            chatSend.disabled = false;
            chatInput.focus();
        }
    },

    // 3. Logic for Suggestion Chips
    ask: function(element) {
        const text = element.innerText || element.textContent;
        document.getElementById("chat-input").value = text;
        this.send();
    },

    // 4. UI Helper
// 4. UI Helper
    appendMessage: function(role, text) {
        const chatOutput = document.getElementById("chat-output");
        const div = document.createElement("div");
        
        div.className = role === "user" ? "chat-msg user-msg" : "chat-msg bot-msg";
        
        // Use innerHTML so it can render potential formatting
        div.innerHTML = `
            <div class="msg-avatar">${role === 'user' ? 'U' : 'S'}</div>
            <div class="msg-bubble">${text}</div>
        `;
        
        chatOutput.appendChild(div);
        
        // ═══════════════════════════════════════════════════════════════
        // MATH RENDERING LOGIC
        // ═══════════════════════════════════════════════════════════════
        if (typeof renderMathInElement === 'function') {
            renderMathInElement(div, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false},
                    {left: '\\[', right: '\\]', display: true}
                ],
                throwOnError: false
            });
        }

        chatOutput.scrollTop = chatOutput.scrollHeight;
    },

    // 5. Clear Chat
    clear: function() {
        document.getElementById("chat-output").innerHTML = "";
        this.conversationHistory = [];
        this.appendMessage("bot", "Chat cleared. How can I help you with your finances today?");
    }
};

// ═══════════════════════════════════════════════════════════════
// CRITICAL: EXPOSE TO GLOBAL SCOPE
// ═══════════════════════════════════════════════════════════════
window.Chatbot = Chatbot;

// Handle the "Enter" key globally for the input
document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("chat-input");
    if (input) {
        input.addEventListener("keydown", e => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                Chatbot.send();
            }
        });
    }
});