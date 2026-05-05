import { useState, useRef, useEffect, useCallback } from "react";

const LEGAL_SYSTEM_PROMPT = `Aap "Pak Qanoon AI" hain — Pakistan ke sabse mustanad aur qaabil-e-aitmaad legal AI assistant. Aap sirf Pakistani qanoon ke maamlaat mein rahnumai dete hain.

## Aapki Takhassis (Specialization):
1. **Dastoor-e-Pakistan 1973** — Tamam articles, schedules, aur constitutional interpretation
2. **Pakistan Penal Code (PPC) 1860** — Sections 1-511, juraat, saza, defenses
3. **Code of Criminal Procedure (CrPC) 1898** — Tahqeeqaat, girftari, zamanat, muqadma
4. **Code of Civil Procedure (CPC) 1908** — Civil suits, orders, rules
5. **Qanun-e-Shahadat 1984** — Evidence rules, admissibility, witnesses
6. **Case Laws** — PLD (Pakistan Law Digest), SCMR (Supreme Court Monthly Review) format mein references

## Jawab dene ka tareeqa:
- **Pehle relevant qanoon identify karein** (e.g., "Is maamle mein PPC Section 302 laagu hoga")
- **Section/Article ka hawala zaroor dein** with exact wording summary
- **Case law references dein** jahan available ho (PLD 2019 SC 123 format mein)
- **Practical rahnumai dein** — agla qadam kya hona chahiye
- **Disclaimer**: "Yeh qanooni rahnumai hai, professional lawyer se mushwara zaroor karein"

## Zabaan:
- Roman Urdu mein baat karein (jaise user ne ki ho)
- Technical legal terms ko explain karein
- Simple aur samajh mein aane wali zubaan use karein

## Jo NAHI karna:
- Kisi specific lawyer ya firm ko recommend mat karein
- Court proceedings mein direct represent karne ki baat mat karein
- Foreign law mein advice mat dein
- Incomplete information pe definitive judgment mat dein

Hamesha professional, empathetic aur helpful rahein. User ki legal problem samjhein aur step-by-step guide karein.`;

const QUICK_QUESTIONS = [
  { icon: "⚖️", text: "Zamanat (Bail) kaise milti hai?", query: "Zamanat lene ka tareeqa kya hai aur kya conditions hoti hain?" },
  { icon: "📋", text: "FIR darz karwana", query: "FIR (First Information Report) kaise darz karwatey hain aur agar police na sunay toh kya karein?" },
  { icon: "🏠", text: "Jaidad ka jhagra", query: "Property dispute mein court mein case kaise file karein?" },
  { icon: "💍", text: "Talaq ke masail", query: "Pakistan mein talaq (divorce) ka qanooni tareeqa kya hai?" },
  { icon: "👮", text: "Najaiz girftari", query: "Agar police naajaiz taur pe arrest kare toh apne rights kya hain?" },
  { icon: "📜", text: "Wiraasat ka qanoon", query: "Inheritance aur wiraasat ka qanoon Pakistan mein kya kehta hai?" },
];

const SAMPLE_LAWS = [
  { code: "PPC", full: "Pakistan Penal Code 1860", sections: "511 Sections" },
  { code: "CrPC", full: "Code of Criminal Procedure 1898", sections: "565 Sections" },
  { code: "CPC", full: "Code of Civil Procedure 1908", sections: "158 Sections" },
  { code: "QS", full: "Qanun-e-Shahadat 1984", sections: "166 Articles" },
  { code: "1973", full: "Constitution of Pakistan 1973", sections: "280 Articles" },
];

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "var(--accent)",
          display: "inline-block",
          animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex",
      flexDirection: isUser ? "row-reverse" : "row",
      gap: 10,
      marginBottom: 18,
      alignItems: "flex-end",
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
        background: isUser ? "var(--accent)" : "var(--bg-card)",
        border: isUser ? "none" : "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 600,
        color: isUser ? "#fff" : "var(--accent)",
      }}>
        {isUser ? "آپ" : "⚖"}
      </div>
      <div style={{
        maxWidth: "72%",
        background: isUser ? "var(--accent)" : "var(--bg-card)",
        border: isUser ? "none" : "1px solid var(--border)",
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        padding: "12px 16px",
        color: isUser ? "#fff" : "var(--text-primary)",
        fontSize: 14.5,
        lineHeight: 1.65,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        boxShadow: isUser ? "0 2px 8px rgba(0,100,60,0.18)" : "0 1px 4px rgba(0,0,0,0.07)",
      }}>
        {msg.typing ? <TypingDots /> : msg.content}
      </div>
    </div>
  );
}

export default function PakQanoonAI() {
  const [darkMode, setDarkMode] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const colors = {
    dark: {
      bg: "#0d1117", bgCard: "#161b22", bgInput: "#21262d",
      border: "#30363d", textPrimary: "#e6edf3", textSecondary: "#8b949e",
      accent: "#1a7f4b", accentHover: "#2ea563", sidebar: "#161b22",
    },
    light: {
      bg: "#f6f8fa", bgCard: "#ffffff", bgInput: "#ffffff",
      border: "#d0d7de", textPrimary: "#1f2328", textSecondary: "#656d76",
      accent: "#1a7f4b", accentHover: "#2ea563", sidebar: "#ffffff",
    },
  };

  const c = darkMode ? colors.dark : colors.light;

  const cssVars = {
    "--bg": c.bg, "--bg-card": c.bgCard, "--bg-input": c.bgInput,
    "--border": c.border, "--text-primary": c.textPrimary,
    "--text-secondary": c.textSecondary, "--accent": c.accent,
    "--accent-hover": c.accentHover, "--sidebar": c.sidebar,
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (query) => {
    const text = query || input.trim();
    if (!text || loading) return;
    setInput("");
    setShowWelcome(false);

    const userMsg = { role: "user", content: text, id: Date.now() };
    const typingMsg = { role: "assistant", content: "", typing: true, id: Date.now() + 1 };

    setMessages((prev) => [...prev, userMsg, typingMsg]);
    setLoading(true);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: LEGAL_SYSTEM_PROMPT,
          messages: [...history, { role: "user", content: text }],
        }),
      });

      const data = await res.json();
      const reply = data.content?.find((b) => b.type === "text")?.text || "Maazrat, jawab milne mein masla hua. Dobara koshish karein.";

      setMessages((prev) =>
        prev.map((m) => (m.typing ? { ...m, content: reply, typing: false } : m))
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.typing ? { ...m, content: "Maazrat, koi technical masla aa gaya. Internet connection check karein.", typing: false } : m
        )
      );
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setInput((prev) => prev + (prev ? " " : "") + `[File: ${file.name}]`);
    }
  };

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'IBM Plex Sans', sans-serif; }
    @keyframes typingBounce {
      0%, 100% { transform: translateY(0); opacity: 0.4; }
      50% { transform: translateY(-5px); opacity: 1; }
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
    .msg-enter { animation: fadeIn 0.25s ease; }
    .sidebar-animate { animation: slideIn 0.25s ease; }
    textarea:focus { outline: none; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
    .quick-btn:hover { background: var(--accent) !important; color: #fff !important; border-color: var(--accent) !important; }
    .send-btn:hover { background: var(--accent-hover) !important; }
    .icon-btn:hover { background: var(--bg-input) !important; }
    .nav-item:hover { background: var(--bg-input) !important; }
    .sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 40; }
  `;

  return (
    <div style={{ ...cssVars, minHeight: "100vh", background: "var(--bg)", color: "var(--text-primary)", fontFamily: "'IBM Plex Sans', sans-serif", display: "flex", position: "relative" }}>
      <style>{styles}</style>

      {/* Sidebar Overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={sidebarOpen ? "sidebar-animate" : ""} style={{
        position: "fixed", left: 0, top: 0, bottom: 0, width: 280,
        background: "var(--sidebar)", borderRight: "1px solid var(--border)",
        zIndex: 50, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s ease", display: "flex", flexDirection: "column",
        overflowY: "auto",
      }}>
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⚖️</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>پاک قانون AI</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Pakistani Legal Assistant</div>
            </div>
          </div>
          <button onClick={() => { setMessages([]); setShowWelcome(true); setSidebarOpen(false); }} style={{
            width: "100%", padding: "9px 14px", borderRadius: 8, border: "1px solid var(--border)",
            background: "transparent", color: "var(--text-primary)", fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit",
          }}>
            <span style={{ fontSize: 16 }}>+</span> Naya Sawal
          </button>
        </div>

        <div style={{ padding: "16px", flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Qanoon ke Mazameen</div>
          {SAMPLE_LAWS.map((law) => (
            <div key={law.code} className="nav-item" onClick={() => { sendMessage(`${law.full} ke baare mein ek overview dein — kya cover karta hai aur kab use hota hai?`); setSidebarOpen(false); }} style={{
              padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 4,
              display: "flex", alignItems: "center", gap: 10, transition: "background 0.15s",
            }}>
              <span style={{ background: "var(--accent)", color: "#fff", borderRadius: 6, padding: "2px 7px", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{law.code}</span>
              <div>
                <div style={{ fontSize: 12.5, color: "var(--text-primary)", lineHeight: 1.3 }}>{law.full}</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{law.sections}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "16px", borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            ⚠️ Yeh AI rahnumai hai. Sanjida qanooni maamlon mein licensed lawyer se zaroor milein.
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>

        {/* Header */}
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 20px", borderBottom: "1px solid var(--border)",
          background: "var(--bg-card)", backdropFilter: "blur(8px)",
          position: "sticky", top: 0, zIndex: 30,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="icon-btn" onClick={() => setSidebarOpen(!sidebarOpen)} style={{
              width: 36, height: 36, borderRadius: 8, border: "1px solid var(--border)",
              background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-primary)", fontSize: 16,
            }}>☰</button>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 22 }}>⚖️</span>
              <div>
                <span style={{ fontWeight: 700, fontSize: 17, color: "var(--text-primary)" }}>پاک قانون </span>
                <span style={{ fontWeight: 300, fontSize: 17, color: "var(--accent)" }}>AI</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, border: "1px solid var(--border)", fontSize: 11, color: "var(--text-secondary)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2ea563", display: "inline-block" }} />
              Online
            </div>
            <button className="icon-btn" onClick={() => setDarkMode(!darkMode)} style={{
              width: 36, height: 36, borderRadius: 8, border: "1px solid var(--border)",
              background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
            }}>
              {darkMode ? "☀️" : "🌙"}
            </button>
          </div>
        </header>

        {/* Messages / Welcome */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>

            {showWelcome && messages.length === 0 && (
              <div style={{ textAlign: "center", paddingTop: 20 }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>⚖️</div>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                  پاک قانون AI میں خوش آمدید
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: 15, maxWidth: 480, margin: "0 auto 32px", lineHeight: 1.7 }}>
                  Pakistani qanoon ke baare mein koi bhi sawal poochhein. Main Constitution, PPC, CrPC, CPC, aur Qanun-e-Shahadat ke mutalliq rahnumai de sakta hoon.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, maxWidth: 660, margin: "0 auto" }}>
                  {QUICK_QUESTIONS.map((q, i) => (
                    <button key={i} className="quick-btn" onClick={() => sendMessage(q.query)} style={{
                      padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border)",
                      background: "var(--bg-card)", color: "var(--text-primary)",
                      cursor: "pointer", textAlign: "left", fontSize: 13, lineHeight: 1.4,
                      display: "flex", alignItems: "flex-start", gap: 8, fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{q.icon}</span>
                      <span>{q.text}</span>
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: 32, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
                  {SAMPLE_LAWS.map((law) => (
                    <span key={law.code} style={{
                      padding: "4px 12px", borderRadius: 20, fontSize: 12,
                      border: "1px solid var(--border)", color: "var(--text-secondary)",
                    }}>
                      {law.code} — {law.sections}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={msg.id || i} className="msg-enter">
                <MessageBubble msg={msg} />
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div style={{ padding: "12px 20px 16px", borderTop: "1px solid var(--border)", background: "var(--bg-card)" }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            {uploadedFile && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 12px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", fontSize: 12, color: "var(--text-secondary)" }}>
                <span>📎</span>
                <span style={{ flex: 1 }}>{uploadedFile.name}</span>
                <button onClick={() => { setUploadedFile(null); setInput((p) => p.replace(`[File: ${uploadedFile.name}]`, "").trim()); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 14 }}>✕</button>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 14, padding: "8px 8px 8px 14px" }}>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <button className="icon-btn" onClick={() => fileInputRef.current?.click()} title="File upload" style={{
                  width: 34, height: 34, borderRadius: 8, border: "none", background: "transparent",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "var(--text-secondary)",
                }}>📎</button>
                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleFileUpload} style={{ display: "none" }} />
                <button className="icon-btn" title="Voice input (coming soon)" style={{
                  width: 34, height: 34, borderRadius: 8, border: "none", background: "transparent",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "var(--text-secondary)",
                }}>🎤</button>
              </div>

              <textarea ref={textareaRef} value={input} onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px"; }}
                onKeyDown={handleKeyDown} placeholder="Apna qanooni sawal yahan likhein... (e.g. 'Mujhe police ne bina warrant giraftaar kiya, kya karoon?')"
                rows={1} style={{
                  flex: 1, background: "transparent", border: "none", resize: "none",
                  color: "var(--text-primary)", fontSize: 14, lineHeight: 1.55,
                  fontFamily: "inherit", padding: "6px 0", maxHeight: 160, overflowY: "auto",
                }} />

              <button className="send-btn" onClick={() => sendMessage()} disabled={!input.trim() || loading} style={{
                width: 36, height: 36, borderRadius: 9, border: "none",
                background: input.trim() && !loading ? "var(--accent)" : "var(--border)",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
                flexShrink: 0, transition: "background 0.15s", color: "#fff",
              }}>
                {loading ? "⏳" : "↑"}
              </button>
            </div>

            <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "var(--text-secondary)" }}>
              Pak Qanoon AI — Pakistani Law Specialist • Enter bhaijein ya button dabayein
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
