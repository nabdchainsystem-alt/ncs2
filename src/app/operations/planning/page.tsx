import { Typography } from "@/components/MaterialTailwind";

export default function PlanningPage() {
  return (
    <div className="tw-grid tw-gap-6">
      <div className="tw-rounded-xl tw-bg-white tw-p-6 tw-shadow-lg tw-shadow-blue-gray-900/5">
        <Typography variant="h4" color="blue-gray" className="tw-mb-2">
          Planning Overview
        </Typography>
        <Typography variant="paragraph" className="!tw-text-blue-gray-600">
          Coordinate upcoming initiatives, timelines, and resources from this
          workspace.
        </Typography>
      </div>
    </div>
  );
}
