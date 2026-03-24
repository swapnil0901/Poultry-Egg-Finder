import { Link } from "wouter";

import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { ClassicAnalyticsSection } from "@/components/dashboard/ClassicAnalyticsSection";
import { Button } from "@/components/ui-kit";

export default function ClassicDashboard() {
  return (
    <AppLayout>
      <PageHeader
        title="Classic Dashboard"
        description="Egg availability, feed usage, revenue metrics, and smart alerts."
        action={
          <Link href="/">
            <Button variant="outline">Open Smart Monitor</Button>
          </Link>
        }
      />
      <ClassicAnalyticsSection />
    </AppLayout>
  );
}
