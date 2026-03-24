import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Card, Button, Input, Select, Modal } from "@/components/ui-kit";
import {
  useAIEggPrediction,
  useAIFeedRecommendation,
  useAISmartReport,
} from "@/hooks/use-poultry";
import { api } from "@shared/routes";
import { TrendingUp, Package, FileBarChart, Mic, MicOff, Volume2 } from "lucide-react";
import { toApiUrl } from "@/lib/api-url";

type BrowserSpeechRecognitionResultAlternative = {
  transcript: string;
};

type BrowserSpeechRecognitionResult = {
  isFinal: boolean;
  0?: BrowserSpeechRecognitionResultAlternative;
};

type BrowserSpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<BrowserSpeechRecognitionResult>;
};

type BrowserSpeechRecognitionErrorEvent = {
  error?: string;
};

type EggPredictionResult = z.infer<typeof api.ai.eggPrediction.responses[200]>;
type FeedRecommendationResult = z.infer<typeof api.ai.feedRecommendation.responses[200]>;
type SmartReportResult = z.infer<typeof api.ai.smartReport.responses[200]>;
type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

type PendingExpense = {
  amount: string;
  expenseType: string;
  description: string;
  date: string;
  sourceText: string;
};

type VoiceMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
};

const WAKE_WORD = "hello pf";
const WAKE_PATTERNS = [
  /\bhello\s*p\s*f\b/i,
  /\bhello\s*pf\b/i,
  /\bhey\s*pf\b/i,
  /\bhi\s*pf\b/i,
];

export default function AIAssistant() {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const shouldContinueRef = useRef(false);

  const [supportsSpeech, setSupportsSpeech] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [awaitingCommand, setAwaitingCommand] = useState(false);
  const [continuousListening, setContinuousListening] = useState(false);
  const [language, setLanguage] = useState("en-US");
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [pendingExpense, setPendingExpense] = useState<PendingExpense | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceStatus, setVoiceStatus] = useState("");

  const [predictionDays, setPredictionDays] = useState("30");
  const [predictionResult, setPredictionResult] = useState<EggPredictionResult | null>(null);

  const [farmSize, setFarmSize] = useState("200");
  const [avgWeightKg, setAvgWeightKg] = useState("1.8");
  const [weather, setWeather] = useState<"normal" | "hot" | "cold">("normal");
  const [feedResult, setFeedResult] = useState<FeedRecommendationResult | null>(null);

  const [reportPeriod, setReportPeriod] = useState<"weekly" | "monthly">("weekly");
  const [reportResult, setReportResult] = useState<SmartReportResult | null>(null);

  const { mutateAsync: predictEggs, isPending: isPredictionPending } = useAIEggPrediction();
  const { mutateAsync: getFeedRecommendation, isPending: isFeedPending } = useAIFeedRecommendation();
  const { mutateAsync: generateReport, isPending: isReportPending } = useAISmartReport();

  const assistantStatus = useMemo(() => {
    if (isListening) return "Listening...";
    if (awaitingCommand) return "Say your command...";
    if (isThinking) return "Thinking...";
    return "Idle";
  }, [isListening, awaitingCommand, isThinking]);

  const shouldAutoListen = useMemo(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("listen") === "1";
  }, []);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window.SpeechRecognition || window.webkitSpeechRecognition)
        : undefined;

    if (!SpeechRecognition) {
      setSupportsSpeech(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = false;
    recognition.continuous = continuousListening;

    recognition.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i]?.isFinal) {
          finalTranscript += event.results[i][0]?.transcript ?? "";
        }
      }
      const transcript = finalTranscript.trim();
      if (transcript) {
        void handleTranscript(transcript);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (shouldContinueRef.current) {
        startListening();
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, [language, continuousListening]);

  useEffect(() => {
    if (supportsSpeech && shouldAutoListen) {
      startListening();
    }
  }, [supportsSpeech, shouldAutoListen]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setVoiceStatus("Text-to-speech is not supported in this browser.");
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      if (voices.length === 0) {
        setVoiceStatus("Voice list is still loading. Try again in a moment.");
      } else {
        const hasMatch = voices.some((voice) =>
          voice.lang?.toLowerCase().startsWith(language.toLowerCase()),
        );
        setVoiceStatus(
          hasMatch
            ? ""
            : `No ${language} voice found. Speech will use the default voice.`,
        );
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (window.speechSynthesis.onvoiceschanged === loadVoices) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [language]);

  useEffect(() => {
    shouldContinueRef.current = continuousListening;
  }, [continuousListening]);

  const startListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.lang = language;
      recognitionRef.current.continuous = continuousListening;
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  };

  const stopListening = () => {
    shouldContinueRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    const matchedVoice =
      availableVoices.find((voice) =>
        voice.lang?.toLowerCase().startsWith(language.toLowerCase()),
      ) ?? null;
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  const parseExpenseCommand = (text: string): PendingExpense | null => {
    if (!/add expense/i.test(text)) return null;

    const amountMatch = text.match(/(\d+(?:\.\d+)?)/);
    const amount = amountMatch ? amountMatch[1] : "";

    const date = (() => {
      const lower = text.toLowerCase();
      const today = new Date();
      if (lower.includes("today")) return today.toISOString().split("T")[0];
      if (lower.includes("yesterday")) {
        const d = new Date(today);
        d.setDate(d.getDate() - 1);
        return d.toISOString().split("T")[0];
      }
      if (lower.includes("tomorrow")) {
        const d = new Date(today);
        d.setDate(d.getDate() + 1);
        return d.toISOString().split("T")[0];
      }
      const isoMatch = lower.match(/\b(\d{4}-\d{2}-\d{2})\b/);
      if (isoMatch) return isoMatch[1];
      const slashMatch = lower.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
      if (slashMatch) {
        const month = slashMatch[1].padStart(2, "0");
        const day = slashMatch[2].padStart(2, "0");
        const year = slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3];
        return `${year}-${month}-${day}`;
      }
      return today.toISOString().split("T")[0];
    })();

    const cleaned = text
      .replace(/add expense/i, "")
      .replace(/rupees|rs\.?|inr/gi, "")
      .replace(/\b(today|yesterday|tomorrow)\b/gi, "")
      .replace(/\b\d{4}-\d{2}-\d{2}\b/g, "")
      .replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, "")
      .replace(/\d+(?:\.\d+)?/g, "")
      .replace(/\s+/g, " ")
      .trim();

    return {
      amount,
      expenseType: cleaned || "General",
      description: cleaned ? `Voice entry: ${cleaned}` : "Voice entry: general expense",
      date,
      sourceText: text,
    };
  };

  const handleExpenseCommand = (text: string): boolean => {
    const parsed = parseExpenseCommand(text);
    if (!parsed) return false;
    if (!parsed.amount) {
      const reply = "Please provide an amount for the expense. Example: Add expense 2500 feed today.";
      appendMessage("assistant", reply);
      speak(reply);
      return true;
    }
    setPendingExpense(parsed);
    return true;
  };

  const createExpense = async () => {
    if (!pendingExpense) return;
    const amountValue = Number(pendingExpense.amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      const reply = "Please enter a valid expense amount before confirming.";
      appendMessage("assistant", reply);
      speak(reply);
      return;
    }

    try {
      const response = await fetch(toApiUrl("/api/expenses"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: pendingExpense.date,
          expenseType: pendingExpense.expenseType,
          amount: amountValue,
          description: pendingExpense.description,
        }),
      });

      if (!response.ok) {
        throw new Error(`Expense create failed (${response.status})`);
      }

      const reply = `Expense saved: ${pendingExpense.expenseType} for Rs ${amountValue} on ${pendingExpense.date}.`;
      appendMessage("assistant", reply);
      speak(reply);
      setPendingExpense(null);
    } catch {
      const reply = "Sorry, I couldn't save the expense right now. Please try again.";
      appendMessage("assistant", reply);
      speak(reply);
    }
  };

  const appendMessage = (role: VoiceMessage["role"], text: string) => {
    const timestamp = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, role, text, timestamp },
    ]);
  };

  const sendToAI = async (text: string) => {
    setIsThinking(true);
    appendMessage("user", text);

    try {
      const response = await fetch(toApiUrl("/api/ai"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) {
        throw new Error(`AI request failed (${response.status})`);
      }

      const data = (await response.json()) as { response?: string };
      const reply = data.response || "I could not generate a response right now.";
      appendMessage("assistant", reply);
      speak(reply);
    } catch {
      const reply = "Sorry, I could not reach the AI service. Please try again.";
      appendMessage("assistant", reply);
      speak(reply);
    } finally {
      setIsThinking(false);
    }
  };

  const handleTranscript = async (transcript: string) => {
    const wakeMatch = WAKE_PATTERNS.find((pattern) => pattern.test(transcript));
    if (wakeMatch) {
      const afterWake = transcript.replace(wakeMatch, " ").trim();
      const wakeResponse = "Yes, how can I help you?";
      appendMessage("assistant", wakeResponse);
      speak(wakeResponse);
      if (afterWake) {
        await sendToAI(afterWake);
      } else {
        setAwaitingCommand(true);
      }
      return;
    }

    if (awaitingCommand) {
      setAwaitingCommand(false);
      if (handleExpenseCommand(transcript)) return;
      await sendToAI(transcript);
      return;
    }

    if (!continuousListening) {
      if (handleExpenseCommand(transcript)) return;
      await sendToAI(transcript);
    }
  };

  const handleManualSend = async () => {
    const text = manualInput.trim();
    if (!text) return;
    setManualInput("");
    if (handleExpenseCommand(text)) return;
    await sendToAI(text);
  };

  const handleEggPrediction = async () => {
    if (isPredictionPending) return;
    try {
      const result = await predictEggs({ days: Number(predictionDays || 30) });
      setPredictionResult(result);
    } catch {
      setPredictionResult(null);
    }
  };

  const handleFeedRecommendation = async () => {
    if (isFeedPending) return;
    try {
      const result = await getFeedRecommendation({
        farmSize: Number(farmSize || 0),
        avgWeightKg: Number(avgWeightKg || 1.8),
        weather,
      });
      setFeedResult(result);
    } catch {
      setFeedResult(null);
    }
  };

  const handleSmartReport = async () => {
    if (isReportPending) return;
    try {
      const result = await generateReport({ period: reportPeriod });
      setReportResult(result);
    } catch {
      setReportResult(null);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="AI Poultry Assistant"
        description="Voice assistant, production predictions, feed recommendations, and smart reports."
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="space-y-5 xl:col-span-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-2xl font-bold font-display">Voice AI Assistant</h3>
              <p className="text-sm text-muted-foreground">
                Say "{WAKE_WORD}" to activate, or use the mic button to speak.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant={isListening ? "secondary" : "primary"}
                onClick={isListening ? stopListening : startListening}
                disabled={!supportsSpeech}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                {isListening ? "Stop" : "Start"}
              </Button>
              <Button
                variant={continuousListening ? "gradient" : "outline"}
                onClick={() => setContinuousListening((prev) => !prev)}
                disabled={!supportsSpeech}
              >
                <Volume2 size={18} />
                {continuousListening ? "Continuous On" : "Continuous Off"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select
              label="Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={!supportsSpeech}
            >
              <option value="en-US">English (US)</option>
              <option value="hi-IN">Hindi (India)</option>
              <option value="mr-IN">Marathi (India)</option>
            </Select>
            <div className="md:col-span-2">
              <Input
                label="Type a question (optional)"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="e.g., Show farm report"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-primary">{assistantStatus}</div>
            <Button variant="outline" onClick={handleManualSend} disabled={!manualInput.trim()}>
              Send
            </Button>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Try: "How many eggs today?", "Show feed data", "Add expense 2500 for feed",
                "Give poultry health tips", "How many chickens are healthy?", "Show sick chickens",
                "Chicken mortality today", or "Show farm report".
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-xl p-3 border ${
                    msg.role === "user"
                      ? "bg-white/70 border-primary/20"
                      : "bg-primary/5 border-primary/10"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="font-semibold">
                      {msg.role === "user" ? "You" : "Assistant"}
                    </span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <p className="text-sm whitespace-pre-line">{msg.text}</p>
                </div>
              ))
            )}
          </div>

          {!supportsSpeech && (
            <div className="text-sm text-destructive">
              Voice features are not supported in this browser. Please use the text input.
            </div>
          )}
          {supportsSpeech && voiceStatus && (
            <div className="text-sm text-muted-foreground">{voiceStatus}</div>
          )}
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" />
            <h3 className="text-xl font-bold font-display">AI Egg Production Prediction</h3>
          </div>
          <div className="flex items-end gap-3">
            <Input
              label="History Window (days)"
              type="number"
              min="7"
              max="90"
              value={predictionDays}
              onChange={(e) => setPredictionDays(e.target.value)}
            />
            <Button onClick={handleEggPrediction} disabled={isPredictionPending}>
              {isPredictionPending ? "Predicting..." : "Predict"}
            </Button>
          </div>
          {predictionResult && (
            <div className="rounded-xl border border-border/60 bg-background/60 p-4 space-y-2">
              <p>
                Based on last {predictionResult.daysUsed} days, expected eggs tomorrow:{" "}
                <span className="font-bold text-primary">{predictionResult.expectedTomorrow}</span>
              </p>
              <p>
                Expected eggs this week:{" "}
                <span className="font-bold text-primary">{predictionResult.expectedThisWeek}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Trend: {predictionResult.trend} | Confidence: {predictionResult.confidence}%
              </p>
              <p className="text-sm">{predictionResult.insights}</p>
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <Package size={20} className="text-primary" />
            <h3 className="text-xl font-bold font-display">AI Feed Recommendation</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Farm Size"
              type="number"
              min="1"
              value={farmSize}
              onChange={(e) => setFarmSize(e.target.value)}
            />
            <Input
              label="Avg Weight (kg)"
              type="number"
              step="0.1"
              min="0.2"
              value={avgWeightKg}
              onChange={(e) => setAvgWeightKg(e.target.value)}
            />
            <Select
              label="Weather"
              value={weather}
              onChange={(e) => setWeather(e.target.value as "normal" | "hot" | "cold")}
            >
              <option value="normal">Normal</option>
              <option value="hot">Hot</option>
              <option value="cold">Cold</option>
            </Select>
          </div>
          <Button onClick={handleFeedRecommendation} disabled={isFeedPending}>
            {isFeedPending ? "Calculating..." : "Get Feed Plan"}
          </Button>
          {feedResult && (
            <div className="rounded-xl border border-border/60 bg-background/60 p-4 space-y-2">
              <p>
                Morning feed: <span className="font-bold text-primary">{feedResult.morningFeedKg} kg</span>
              </p>
              <p>
                Evening feed: <span className="font-bold text-primary">{feedResult.eveningFeedKg} kg</span>
              </p>
              <p>
                Water: <span className="font-bold text-primary">{feedResult.waterLiters} liters</span>
              </p>
              <p className="text-sm">{feedResult.recommendation}</p>
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <FileBarChart size={20} className="text-primary" />
            <h3 className="text-xl font-bold font-display">AI Smart Reports</h3>
          </div>
          <div className="flex items-end gap-3">
            <Select
              label="Period"
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value as "weekly" | "monthly")}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </Select>
            <Button onClick={handleSmartReport} disabled={isReportPending}>
              {isReportPending ? "Generating..." : "Generate Report"}
            </Button>
          </div>
          {reportResult && (
            <div className="rounded-xl border border-border/60 bg-background/60 p-4 space-y-3">
              <h4 className="font-bold text-primary">{reportResult.title}</h4>
              <p>{reportResult.summary}</p>
              <div>
                <p className="font-semibold mb-1">Highlights</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {reportResult.highlights.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">Risks</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {reportResult.risks.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">Recommended Actions</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {reportResult.actions.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Modal
        isOpen={Boolean(pendingExpense)}
        onClose={() => setPendingExpense(null)}
        title="Confirm Expense"
      >
        {pendingExpense && (
          <div className="space-y-4">
            <Input
              label="Amount (Rs)"
              type="number"
              min="0"
              value={pendingExpense.amount}
              onChange={(e) =>
                setPendingExpense((prev) =>
                  prev ? { ...prev, amount: e.target.value } : prev,
                )
              }
            />
            <Input
              label="Expense Type"
              value={pendingExpense.expenseType}
              onChange={(e) =>
                setPendingExpense((prev) =>
                  prev ? { ...prev, expenseType: e.target.value } : prev,
                )
              }
            />
            <Input
              label="Description"
              value={pendingExpense.description}
              onChange={(e) =>
                setPendingExpense((prev) =>
                  prev ? { ...prev, description: e.target.value } : prev,
                )
              }
            />
            <Input
              label="Date"
              type="date"
              value={pendingExpense.date}
              onChange={(e) =>
                setPendingExpense((prev) =>
                  prev ? { ...prev, date: e.target.value } : prev,
                )
              }
            />
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setPendingExpense(null)}>
                Cancel
              </Button>
              <Button onClick={createExpense}>Confirm & Save</Button>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
