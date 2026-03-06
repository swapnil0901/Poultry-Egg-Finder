import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Card, Button, Input, Select } from "@/components/ui-kit";
import {
  useAIChat,
  useAIDiseaseDetection,
  useAIEggPrediction,
  useAIFeedRecommendation,
  useAISmartReport,
} from "@/hooks/use-poultry";
import { api } from "@shared/routes";
import {
  Bot,
  Send,
  User,
  Upload,
  TrendingUp,
  Package,
  FileBarChart,
} from "lucide-react";
import { motion } from "framer-motion";

type DiseaseDetectionResult = z.infer<typeof api.ai.diseaseDetection.responses[200]>;
type EggPredictionResult = z.infer<typeof api.ai.eggPrediction.responses[200]>;
type FeedRecommendationResult = z.infer<typeof api.ai.feedRecommendation.responses[200]>;
type SmartReportResult = z.infer<typeof api.ai.smartReport.responses[200]>;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    {
      role: "ai",
      text: "Hello! I can help with disease detection, egg prediction, feed plans, and smart reports.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  const [diseaseFile, setDiseaseFile] = useState<File | null>(null);
  const [diseaseNotes, setDiseaseNotes] = useState("");
  const [diseaseResult, setDiseaseResult] = useState<DiseaseDetectionResult | null>(null);

  const [predictionDays, setPredictionDays] = useState("30");
  const [predictionResult, setPredictionResult] = useState<EggPredictionResult | null>(null);

  const [farmSize, setFarmSize] = useState("200");
  const [avgWeightKg, setAvgWeightKg] = useState("1.8");
  const [weather, setWeather] = useState<"normal" | "hot" | "cold">("normal");
  const [feedResult, setFeedResult] = useState<FeedRecommendationResult | null>(null);

  const [reportPeriod, setReportPeriod] = useState<"weekly" | "monthly">("weekly");
  const [reportResult, setReportResult] = useState<SmartReportResult | null>(null);

  const { mutateAsync: sendMessage, isPending: isChatPending } = useAIChat();
  const { mutateAsync: detectDisease, isPending: isDiseasePending } = useAIDiseaseDetection();
  const { mutateAsync: predictEggs, isPending: isPredictionPending } = useAIEggPrediction();
  const { mutateAsync: getFeedRecommendation, isPending: isFeedPending } = useAIFeedRecommendation();
  const { mutateAsync: generateReport, isPending: isReportPending } = useAISmartReport();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleChatSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatPending) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);

    try {
      const res = await sendMessage(userMsg);
      setMessages((prev) => [...prev, { role: "ai", text: res.response }]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unable to get AI response right now.";
      setMessages((prev) => [...prev, { role: "ai", text: errorMessage }]);
    }
  };

  const handleDiseaseDetection = async () => {
    if (!diseaseFile || isDiseasePending) return;

    try {
      const imageBase64 = await fileToDataUrl(diseaseFile);
      const result = await detectDisease({ imageBase64, notes: diseaseNotes || undefined });
      setDiseaseResult(result);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Disease detection failed.";
      setDiseaseResult({
        disease: "Detection failed",
        confidence: 0,
        severity: "low",
        suggestedTreatment: errorMessage,
        observations: "Please retry with a clearer image.",
      });
    }
  };

  const handleEggPrediction = async () => {
    if (isPredictionPending) return;
    try {
      const result = await predictEggs({ days: Number(predictionDays || 30) });
      setPredictionResult(result);
    } catch (err) {
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
    } catch (err) {
      setFeedResult(null);
    }
  };

  const handleSmartReport = async () => {
    if (isReportPending) return;
    try {
      const result = await generateReport({ period: reportPeriod });
      setReportResult(result);
    } catch (err) {
      setReportResult(null);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="AI Assistant Suite"
        description="Chatbot + disease detection + production prediction + feed recommendation + smart reporting."
      />

      <Card className="h-[560px] flex flex-col p-0 overflow-hidden border-border/50 mb-8">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-background/50">
          {messages.map((msg, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={i}
              className={`flex gap-4 max-w-[90%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}
            >
              <div
                className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center shadow-md ${
                  msg.role === "ai"
                    ? "bg-primary text-white"
                    : "bg-white text-primary border border-primary/20"
                }`}
              >
                {msg.role === "ai" ? <Bot size={20} /> : <User size={20} />}
              </div>
              <div
                className={`p-4 rounded-2xl text-[15px] leading-relaxed ${
                  msg.role === "ai"
                    ? "bg-white border border-border/50 shadow-sm text-foreground"
                    : "bg-primary text-white shadow-lg shadow-primary/20"
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}

          {isChatPending && (
            <div className="flex gap-4 max-w-[90%]">
              <div className="w-10 h-10 shrink-0 rounded-full bg-primary text-white flex items-center justify-center shadow-md">
                <Bot size={20} />
              </div>
              <div className="p-4 rounded-2xl bg-white border border-border/50 shadow-sm text-foreground flex gap-1">
                <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" />
                <span
                  className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
                <span
                  className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-border/50">
          <form onSubmit={handleChatSend} className="flex gap-2 relative">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask questions about health, eggs, feed, or profit..."
              className="flex-1 bg-background border-2 border-border/50 rounded-full pl-6 pr-14 py-4 focus:outline-none focus:border-primary transition-colors text-base"
              disabled={isChatPending}
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isChatPending}
              className="absolute right-2 top-2 bottom-2 w-12 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-light transition-colors disabled:opacity-50"
            >
              <Send size={18} className="ml-1" />
            </button>
          </form>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <Upload size={20} className="text-primary" />
            <h3 className="text-xl font-bold font-display">AI Disease Detection</h3>
          </div>
          <div className="space-y-3">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setDiseaseFile(e.target.files?.[0] || null)}
            />
            <div className="w-full flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground/80 ml-1">
                Notes (optional)
              </label>
              <textarea
                className="w-full px-4 py-3 rounded-xl bg-white/50 border-2 border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none h-24"
                placeholder="Symptoms: cough, twisted neck, diarrhea..."
                value={diseaseNotes}
                onChange={(e) => setDiseaseNotes(e.target.value)}
              />
            </div>
            <Button onClick={handleDiseaseDetection} disabled={!diseaseFile || isDiseasePending}>
              {isDiseasePending ? "Analyzing..." : "Upload Chicken Image"}
            </Button>
          </div>
          {diseaseResult && (
            <div className="rounded-xl border border-border/60 bg-background/60 p-4 space-y-2">
              <p className="font-semibold">AI Result: {diseaseResult.disease}</p>
              <p className="text-sm text-muted-foreground">
                Confidence: {diseaseResult.confidence}% | Severity: {diseaseResult.severity}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Suggested Treatment:</span>{" "}
                {diseaseResult.suggestedTreatment}
              </p>
              <p className="text-sm text-muted-foreground">{diseaseResult.observations}</p>
            </div>
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
    </AppLayout>
  );
}
