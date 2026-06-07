"use client"

import * as React from "react"
import { AlertTriangle, BarChart3, Target } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnalyticsView } from "./analytics-page"
import { FailurePatternsPanel } from "./failure-patterns-panel"
import { GoalsView } from "./goals-page"
import { PageHeader } from "./common"

export function InsightsPage() {
  const [tab, setTab] = React.useState("analytics")

  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="What's working in your search"
        description="Conversion, timing, failure patterns, weekly cadence, goals, and wins in one place."
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="line" className="mb-5">
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="size-3.5" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="goals" className="gap-1.5">
            <Target className="size-3.5" />
            Goals &amp; wins
          </TabsTrigger>
          <TabsTrigger value="failures" className="gap-1.5">
            <AlertTriangle className="size-3.5" />
            Failure patterns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <AnalyticsView />
        </TabsContent>
        <TabsContent value="goals">
          <GoalsView />
        </TabsContent>
        <TabsContent value="failures">
          <FailurePatternsPanel />
        </TabsContent>
      </Tabs>
    </>
  )
}
