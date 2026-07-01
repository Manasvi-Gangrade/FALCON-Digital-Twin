import { createFileRoute } from "@tanstack/react-router";
import { FalconApp } from "@/components/falcon/FalconApp";

export const Route = createFileRoute("/")({
  component: FalconApp,
  head: () => ({
    meta: [
      { title: "FALCON · Aerospace Digital Twin" },
      {
        name: "description",
        content:
          "FALCON — Physics-informed digital twin for real-time four-stage turbojet health monitoring. Built for Aerothon 2026.",
      },
      { property: "og:title", content: "FALCON · Aerospace Digital Twin" },
      {
        property: "og:description",
        content:
          "Real-time turbojet health monitoring, RUL projection, and maintenance intelligence — HAL x IIT Indore.",
      },
    ],
  }),
});
