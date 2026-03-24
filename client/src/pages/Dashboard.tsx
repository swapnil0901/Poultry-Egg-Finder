import { useEffect, useRef } from "react";
import { BellRing, Droplets, Thermometer, Wind } from "lucide-react";
import { Link } from "wouter";

import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Button, Card } from "@/components/ui-kit";
import { useInstallPrompt, useMonitoringSummary, useSensorMonitoring } from "@/dashboard";
import { createMonitoringCharts } from "@/charts";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { sensorData, history, isLoading, error, isOffline, lastUpdatedLabel } = useSensorMonitoring();
  const summaryCards = useMonitoringSummary(sensorData) as Array<{
    key: string;
    label: string;
    value: string;
    tone: "ok" | "warn" | "alert";
  }>;
  const { isInstallable, isStandalone, platform, promptInstall } = useInstallPrompt();
  const { language, setLanguage, t } = useI18n();

  const temperatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const humidityCanvasRef = useRef<HTMLCanvasElement>(null);
  const gasCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    return createMonitoringCharts(
      {
        temperature: temperatureCanvasRef.current,
        humidity: humidityCanvasRef.current,
        gas: gasCanvasRef.current,
      },
      history,
    );
  }, [history]);

  return (
    <AppLayout>
      <PageHeader
        title="Smart Poultry Farm Monitoring"
        description="Real-time Arduino and ESP8266 sensor data, mobile install support, and live monitoring charts."
        action={
          <div className="flex flex-wrap gap-3">
            <Link href="/classic-dashboard">
              <Button variant="outline">{t("Open Classic Dashboard")}</Button>
            </Link>
            {isInstallable ? (
              <Button variant="gradient" onClick={() => void promptInstall()}>
                {t("Install Poultry Monitor App")}
              </Button>
            ) : undefined}
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as "en" | "hi" | "mr")}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
              aria-label={t("Language")}
            >
              <option value="en">{t("English")}</option>
              <option value="hi">{t("Hindi")}</option>
              <option value="mr">{t("Marathi")}</option>
            </select>
          </div>
        }
      />

      <div className="monitoring-shell space-y-6">
        <Card className="monitoring-hero border-primary/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="monitoring-kicker">{t("Live Environment Snapshot")}</p>
              <h2 className="text-2xl font-bold font-display sm:text-3xl">
                {t("Poultry Farm Monitor")}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                {t("Dashboard refreshes sensor values every 5 seconds, works over HTTPS on Vercel, and can be installed on mobile for farm-side monitoring.")}
              </p>
            </div>
            <div className="monitoring-status-bar">
              <StatusPill label={isOffline ? t("Offline") : t("Online")} tone={isOffline ? "warn" : "ok"} />
              <StatusPill label={`${t("Updated")} ${lastUpdatedLabel}`} tone="neutral" />
            </div>
          </div>
        </Card>

        {error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <div className="flex items-start gap-3">
              <BellRing className="mt-0.5 text-destructive" size={18} />
              <div>
                <p className="font-semibold">{t("Sensor API unavailable")}</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {!isStandalone && (
          <Card className="border-primary/20 bg-primary/5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold">{t("Install Poultry Monitor App")}</p>
                <p className="text-sm text-muted-foreground">
                  If the browser does not show the install popup, use the browser menu and choose{" "}
                  <strong>{t("Install app")}</strong> or <strong>{t("Add to Home screen")}</strong>.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {platform === "ios"
                    ? t("Safari: Share -> Add to Home Screen")
                    : t("Chrome/Edge: Menu -> Install App")}
                </p>
              </div>
              {isInstallable && (
                <Button id="installBtn" variant="gradient" onClick={() => void promptInstall()}>
                  {t("Install app")}
                </Button>
              )}
            </div>
          </Card>
        )}

        <section className="monitoring-grid">
          {summaryCards.map((card) => (
            <MetricCard
              key={card.key}
              label={card.label}
              value={card.value}
              tone={card.tone}
              icon={
                card.key === "temperature"
                  ? Thermometer
                  : card.key === "humidity"
                    ? Droplets
                    : Wind
              }
            />
          ))}
        </section>

        <section>
          <Card className="monitoring-chart-panel">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="monitoring-kicker">Sensor Trends</p>
                <h3 className="text-xl font-bold font-display">Live Chart Monitoring</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                {isLoading ? t("Loading current readings...") : t("Updated every 5 seconds")}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <ChartCard title={t("Temperature")} subtitle={t("Shed climate")} canvasRef={temperatureCanvasRef} />
              <ChartCard title={t("Humidity")} subtitle={t("Air moisture")} canvasRef={humidityCanvasRef} />
              <ChartCard title={t("Gas Level")} subtitle={t("Ammonia detection")} canvasRef={gasCanvasRef} />
            </div>
          </Card>
        </section>
      </div>
    </AppLayout>
  );
}

function MetricCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "alert";
  icon: any;
}) {
  return (
    <Card className="monitoring-card h-full">
      <div className="mb-4 flex items-center justify-between gap-4">
        <span className={cn("monitoring-icon", `monitoring-icon-${tone}`)}>
          <Icon size={18} />
        </span>
        <StatusPill
          label={tone === "ok" ? "Normal" : tone === "warn" ? "Attention" : "Critical"}
          tone={tone}
        />
      </div>
      <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-bold font-display sm:text-4xl">{value}</p>
    </Card>
  );
}

function ChartCard({
  title,
  subtitle,
  canvasRef,
}: {
  title: string;
  subtitle: string;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}) {
  return (
    <div className="monitoring-chart-card">
      <div className="mb-3">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="monitoring-chart-canvas">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "ok" | "warn" | "alert" | "neutral";
}) {
  const { t } = useI18n();
  return <span className={cn("monitoring-pill", `monitoring-pill-${tone}`)}>{t(label)}</span>;
}
