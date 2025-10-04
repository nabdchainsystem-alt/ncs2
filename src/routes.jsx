// @material-tailwind/react
import { Avatar, Typography } from "@material-tailwind/react";

// @heroicons/react
import {
  Squares2X2Icon,
  ShoppingBagIcon,
  ClipboardDocumentIcon,
  PhotoIcon,
  ClipboardIcon,
  RectangleGroupIcon,
  CubeTransparentIcon,
} from "@heroicons/react/24/solid";

const icon = {
  className: "tw-w-5 tw-h-5 tw-text-inherit",
};

const text = {
  color: "inherit",
  className: "tw-w-5 tw-grid place-items-center !tw-font-medium",
};

export const routes = [
  {
    layout: "dashboard",
    name: "Brooklyn Alice",
    divider: true,
    icon: (
      <Avatar
        size="sm"
        src="https://demos.creative-tim.com/nextjs-material-dashboard-pro//_next/static/media/team-3.a3eccb16.jpg"
      />
    ),
    pages: [
      {
        layout: "dashboard",
        icon: <Typography {...text}>O</Typography>,
        name: "overview",
        path: "/dashboard/overview",
      },
      {
        layout: "operations",
        icon: <Typography {...text}>P</Typography>,
        name: "planning",
        path: "/operations/planning",
      },
      {
        layout: "business support",
        icon: <Typography {...text}>H</Typography>,
        name: "hr",
        path: "/business-support/hr",
      },
    ],
  },
  {
    name: "dashboard",
    icon: <RectangleGroupIcon {...icon} />,
    pages: [
      {
        icon: <Typography {...text}>O</Typography>,
        name: "overview",
        path: "/dashboard/overview",
      },
      {
        icon: <Typography {...text}>D</Typography>,
        name: "data",
        path: "/dashboard/data",
      },
    ],
  },
  {
    name: "supply chain",
    title: "departments",
    icon: <PhotoIcon {...icon} />,
    pages: [
      {
        icon: <Typography {...text}>R</Typography>,
        name: "requests",
        path: "/supply-chain/requests",
      },
      {
        icon: <Typography {...text}>O</Typography>,
        name: "orders",
        path: "/supply-chain/orders",
      },
      {
        icon: <Typography {...text}>W</Typography>,
        name: "warehouse",
        path: "/supply-chain/warehouse",
      },
      {
        icon: <Typography {...text}>V</Typography>,
        name: "vendors",
        path: "/supply-chain/vendors",
      },
    ],
  },
  {
    name: "operations",
    icon: <Squares2X2Icon {...icon} />,
    pages: [
      {
        icon: <Typography {...text}>M</Typography>,
        name: "maintenance",
        path: "/operations/maintenance",
      },
      {
        icon: <Typography {...text}>P</Typography>,
        name: "production",
        path: "/operations/production",
      },
      {
        icon: <Typography {...text}>Q</Typography>,
        name: "quality",
        path: "/operations/quality",
      },
      {
        icon: <Typography {...text}>P</Typography>,
        name: "planning",
        path: "/operations/planning",
      },
    ],
  },
  {
    name: "business",
    icon: <ShoppingBagIcon {...icon} />,
    pages: [
      {
        icon: <Typography {...text}>F</Typography>,
        name: "finance",
        path: "/business/finance",
      },
      {
        icon: <Typography {...text}>S</Typography>,
        name: "sales",
        path: "/business/sales",
      },
    ],
  },
  {
    name: "business support",
    divider: true,
    icon: <ClipboardIcon {...icon} />,
    pages: [
      {
        icon: <Typography {...text}>H</Typography>,
        name: "hr",
        path: "/business-support/hr",
      },
      {
        icon: <Typography {...text}>I</Typography>,
        name: "it",
        path: "/business-support/it",
      },
      {
        icon: <Typography {...text}>M</Typography>,
        name: "marketing",
        path: "/business-support/marketing",
      },
    ],
  },
  {
    name: "Basic",
    title: "Docs",
    icon: <ClipboardDocumentIcon {...icon} />,
    pages: [
      {
        icon: <Typography {...text}>G</Typography>,
        name: "getting started",
        pages: [
          {
            icon: <Typography {...text}>I</Typography>,
            name: "installation",
            path: "https://www.material-tailwind.com/docs/react/installation",
            external: true,
          },
          {
            icon: <Typography {...text}>L</Typography>,
            name: "licence",
            path: "https://www.material-tailwind.com/docs/react/license",
            external: true,
          },
          {
            icon: <Typography {...text}>R</Typography>,
            name: "release notes",
            path: "https://www.material-tailwind.com/docs/react/release-notes",
            external: true,
          },
        ],
      },
      {
        icon: <Typography {...text}>F</Typography>,
        name: "foundation",
        pages: [
          {
            icon: <Typography {...text}>T</Typography>,
            name: "theming",
            path: "https://www.material-tailwind.com/docs/react/theming",
            external: true,
          },
          {
            icon: <Typography {...text}>C</Typography>,
            name: "colors",
            path: "https://www.material-tailwind.com/docs/react/colors",
            external: true,
          },
          {
            icon: <Typography {...text}>F</Typography>,
            name: "fonts",
            path: "https://www.material-tailwind.com/docs/react/fonts",
            external: true,
          },
          {
            icon: <Typography {...text}>S</Typography>,
            name: "shadows",
            path: "https://www.material-tailwind.com/docs/react/shadows",
            external: true,
          },
          {
            icon: <Typography {...text}>S</Typography>,
            name: "screens",
            path: "https://www.material-tailwind.com/docs/react/screens",
            external: true,
          },
        ],
      },
    ],
  },
  {
    name: "Components",
    icon: <CubeTransparentIcon {...icon} />,
    pages: [
      {
        icon: <Typography {...text}>A</Typography>,
        name: "accordian",
        path: "https://www.material-tailwind.com/docs/react/accordion",
        external: true,
      },
      {
        icon: <Typography {...text}>A</Typography>,
        name: "alert",
        path: "https://www.material-tailwind.com/docs/react/alert",
        external: true,
      },
      {
        icon: <Typography {...text}>A</Typography>,
        name: "avatar",
        path: "https://www.material-tailwind.com/docs/react/avatar",
        external: true,
      },
      {
        icon: <Typography {...text}>B</Typography>,
        name: "badge",
        path: "https://www.material-tailwind.com/docs/react/badge",
        external: true,
      },
      {
        icon: <Typography {...text}>B</Typography>,
        name: "breadcrumbs",
        path: "https://www.material-tailwind.com/docs/react/breadcrumbs",
        external: true,
      },
      {
        icon: <Typography {...text}>B</Typography>,
        name: "button",
        path: "https://www.material-tailwind.com/docs/react/button",
        external: true,
      },
      {
        icon: <Typography {...text}>B</Typography>,
        name: "button group",
        path: "https://www.material-tailwind.com/docs/react/button-group",
        external: true,
      },
      {
        icon: <Typography {...text}>C</Typography>,
        name: "card",
        path: "https://www.material-tailwind.com/docs/react/card",
        external: true,
      },
      {
        icon: <Typography {...text}>C</Typography>,
        name: "checkbox",
        path: "https://www.material-tailwind.com/docs/react/checkbox",
        external: true,
      },
      {
        icon: <Typography {...text}>C</Typography>,
        name: "chip",
        path: "https://www.material-tailwind.com/docs/react/chip",
        external: true,
      },
      {
        icon: <Typography {...text}>C</Typography>,
        name: "collapse",
        path: "https://www.material-tailwind.com/docs/react/collapse",
        external: true,
      },
      {
        icon: <Typography {...text}>C</Typography>,
        name: "carousel",
        path: "https://www.material-tailwind.com/docs/react/carousel",
        external: true,
      },
      {
        icon: <Typography {...text}>D</Typography>,
        name: "dialog",
        path: "https://www.material-tailwind.com/docs/react/dialog",
        external: true,
      },
      {
        icon: <Typography {...text}>D</Typography>,
        name: "drawer",
        path: "https://www.material-tailwind.com/docs/react/drawer",
        external: true,
      },
      {
        icon: <Typography {...text}>F</Typography>,
        name: "footer",
        path: "https://www.material-tailwind.com/docs/react/footer",
        external: true,
      },
      {
        icon: <Typography {...text}>F</Typography>,
        name: "form",
        path: "https://www.material-tailwind.com/docs/react/form",
        external: true,
      },
      {
        icon: <Typography {...text}>I</Typography>,
        name: "icon button",
        path: "https://www.material-tailwind.com/docs/react/icon-button",
        external: true,
      },
      {
        icon: <Typography {...text}>I</Typography>,
        name: "input",
        path: "https://www.material-tailwind.com/docs/react/input",
        external: true,
      },
      {
        icon: <Typography {...text}>I</Typography>,
        name: "img",
        path: "https://www.material-tailwind.com/docs/react/img",
        external: true,
      },
      {
        icon: <Typography {...text}>L</Typography>,
        name: "list",
        path: "https://www.material-tailwind.com/docs/react/list",
        external: true,
      },
      {
        icon: <Typography {...text}>M</Typography>,
        name: "menu",
        path: "https://www.material-tailwind.com/docs/react/menu",
        external: true,
      },
      {
        icon: <Typography {...text}>N</Typography>,
        name: "navbar",
        path: "https://www.material-tailwind.com/docs/react/navbar",
        external: true,
      },
      {
        icon: <Typography {...text}>P</Typography>,
        name: "popover",
        path: "https://www.material-tailwind.com/docs/react/popover",
        external: true,
      },
      {
        icon: <Typography {...text}>P</Typography>,
        name: "progress bar",
        path: "https://www.material-tailwind.com/docs/react/progress-bar",
        external: true,
      },
      {
        icon: <Typography {...text}>P</Typography>,
        name: "pagination",
        path: "https://www.material-tailwind.com/docs/react/pagination",
        external: true,
      },
      {
        icon: <Typography {...text}>R</Typography>,
        name: "radio button",
        path: "https://www.material-tailwind.com/docs/react/radio-button",
        external: true,
      },
      {
        icon: <Typography {...text}>R</Typography>,
        name: "rating bar",
        path: "https://www.material-tailwind.com/docs/react/rating-bar",
        external: true,
      },
      {
        icon: <Typography {...text}>S</Typography>,
        name: "select",
        path: "https://www.material-tailwind.com/docs/react/select",
        external: true,
      },
      {
        icon: <Typography {...text}>S</Typography>,
        name: "sidebar",
        path: "https://www.material-tailwind.com/docs/react/sidebar",
        external: true,
      },
      {
        icon: <Typography {...text}>S</Typography>,
        name: "slider",
        path: "https://www.material-tailwind.com/docs/react/slider",
        external: true,
      },
      {
        icon: <Typography {...text}>S</Typography>,
        name: "speed dial",
        path: "https://www.material-tailwind.com/docs/react/speed-dial",
        external: true,
      },
      {
        icon: <Typography {...text}>S</Typography>,
        name: "spinner",
        path: "https://www.material-tailwind.com/docs/react/spinner",
        external: true,
      },
      {
        icon: <Typography {...text}>S</Typography>,
        name: "stepper",
        path: "https://www.material-tailwind.com/docs/react/stepper",
        external: true,
      },
      {
        icon: <Typography {...text}>S</Typography>,
        name: "switch",
        path: "https://www.material-tailwind.com/docs/react/switch",
        external: true,
      },
      {
        icon: <Typography {...text}>T</Typography>,
        name: "tabs",
        path: "https://www.material-tailwind.com/docs/react/tabs",
        external: true,
      },
      {
        icon: <Typography {...text}>T</Typography>,
        name: "table",
        path: "https://www.material-tailwind.com/docs/react/table",
        external: true,
      },
      {
        icon: <Typography {...text}>T</Typography>,
        name: "textarea",
        path: "https://www.material-tailwind.com/docs/react/textarea",
        external: true,
      },
      {
        icon: <Typography {...text}>T</Typography>,
        name: "timeline",
        path: "https://www.material-tailwind.com/docs/react/timeline",
        external: true,
      },
      {
        icon: <Typography {...text}>T</Typography>,
        name: "tooltip",
        path: "https://www.material-tailwind.com/docs/react/tooltip",
        external: true,
      },
      {
        icon: <Typography {...text}>T</Typography>,
        name: "typography",
        path: "https://www.material-tailwind.com/docs/react/typography",
        external: true,
      },
      {
        icon: <Typography {...text}>V</Typography>,
        name: "video",
        path: "https://www.material-tailwind.com/docs/react/video",
        external: true,
      },
    ],
  },
  {
    name: "change log",
    icon: <RectangleGroupIcon {...icon} />,
    path: "https://github.com/creativetimofficial/material-tailwind/releases",
    external: true,
  },
];
export default routes;
