import { Link } from "wouter";

import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { ClassicAnalyticsSection } from "@/components/dashboard/ClassicAnalyticsSection";
import { Button } from "@/components/ui-kit";
import { useI18n } from "@/lib/i18n";

export default function ClassicDashboard() {
  const { t } = useI18n();
  return (
    <AppLayout>
      <PageHeader
        title="Classic Dashboard"
        description="Egg availability, feed usage, revenue metrics, and smart alerts."
        action={
          <Link href="/">
            <Button variant="outline">{t("Open Smart Monitor")}</Button>
          </Link>
        }
      />
      <ClassicAnalyticsSection />
    </AppLayout>
  );
}
