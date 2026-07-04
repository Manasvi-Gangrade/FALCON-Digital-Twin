import { createFileRoute } from "@tanstack/react-router";
import { FalconApp } from "@/components/falcon/FalconApp";

export const Route = createFileRoute("/")({
  component: FalconApp,
  head: () => ({
    meta: [
      { title: "FALCON · Four-Stage Aeroengine Latent Component & Operational Network" },
      {
        name: "description",
        content:
          "FALCON — Four-Stage Aeroengine Latent Component & Operational Network: Physics-informed digital twin for real-time four-stage turbojet health monitoring. Built for Aerothon 2026.",
      },
      { property: "og:title", content: "FALCON · Four-Stage Aeroengine Latent Component & Operational Network" },
      {
        property: "og:description",
        content:
          "Real-time turbojet health monitoring, RUL projection, and maintenance intelligence — HAL x IIT Indore.",
      },
    ],
  }),
});
