"use client";

import ReactECharts from "echarts-for-react";
import { useEffect, useMemo, useState } from "react";

type FlowLink = {
  source: string;
  target: string;
  value: number;
  breach?: number;
};

type SankeyResponse = {
  links: FlowLink[];
};

const CARD_CLASSES =
  "tw-rounded-xl tw-border tw-border-blue-gray-100 tw-bg-white tw-p-4 tw-shadow-sm";

function buildOption(links: FlowLink[]) {
  const nodes = Array.from(new Set(links.flatMap((link) => [link.source, link.target]))).map((name) => ({
    name,
  }));

  const seriesLinks = links.map((link) => {
    const baseColor = link.breach != null ? [239, 68, 68] : [59, 130, 246];
    const opacity = link.breach != null ? 0.25 + 0.6 * Math.min(1, link.breach) : 0.35;
    return {
      ...link,
      lineStyle: {
        color: `rgba(${baseColor[0]},${baseColor[1]},${baseColor[2]},${opacity})`,
      },
    };
  });

  return {
    tooltip: {
      trigger: "item",
      formatter(params: any) {
        if (params.dataType === "edge") {
          const data = params.data as FlowLink;
          const breach =
            typeof data.breach === "number" ? ` • Breach: <b>${Math.round(data.breach * 100)}%</b>` : "";
          return `<b>${data.source} → ${data.target}</b><br/>Count: <b>${data.value}</b>${breach}`;
        }
        return `<b>${params.name}</b>`;
      },
    },
    series: [
      {
        type: "sankey",
        data: nodes,
        links: seriesLinks,
        focusNodeAdjacency: true,
        nodeGap: 16,
        nodeWidth: 20,
        layoutIterations: 32,
        label: {
          color: "#0f172a",
          fontSize: 12,
        },
        lineStyle: {
          opacity: 0.6,
          curveness: 0.5,
        },
        itemStyle: {
          borderWidth: 0,
        },
      },
    ],
  };
}

export default function RequestFlowSankey() {
  const [links, setLinks] = useState<FlowLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/requests/flow", { cache: "no-store" });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "Failed to load flow");
        }
        const json = (await response.json()) as SankeyResponse;
        if (!alive) return;
        setLinks(Array.isArray(json?.links) ? json.links : []);
      } catch (error) {
        if (!alive) return;
        setErr(error instanceof Error ? error.message : "Failed to load flow");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const option = useMemo(() => (links.length > 0 ? buildOption(links) : null), [links]);

  if (loading) {
    return (
      <div className={`${CARD_CLASSES} tw-h-[380px] tw-flex tw-items-center tw-justify-center`}>
        <span className="tw-text-blue-gray-400">Loading flow…</span>
      </div>
    );
  }

  if (err || !option) {
    return (
      <div className={`${CARD_CLASSES} tw-h-[380px] tw-flex tw-items-center tw-justify-center tw-text-center`}>
        <div>
          <p className="tw-text-blue-gray-900 tw-font-semibold">No request flow data yet</p>
          <p className="tw-text-sm tw-text-blue-gray-400">Capture more requests to visualise the stream.</p>
          {err ? <p className="tw-mt-2 tw-text-xs tw-text-red-400">{err}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className={CARD_CLASSES}>
      <div className="tw-flex tw-items-baseline tw-justify-between tw-gap-4 tw-px-1 tw-pb-2">
        <h3 className="tw-text-[15px] tw-font-semibold tw-text-blue-gray-900">Request Flow Sankey</h3>
        <span className="tw-text-xs tw-uppercase tw-tracking-wide tw-text-blue-gray-400">
          Thickness = volume • Color = SLA breach
        </span>
      </div>
      <div className="tw-h-[380px]">
        <ReactECharts option={option as any} style={{ height: "100%", width: "100%" }} />
      </div>
    </div>
  );
}
