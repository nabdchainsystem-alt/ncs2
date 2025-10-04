import React from "react";

import Link from "next/link";

// @material-tailwind/react
import {
  Navbar as MTNavbar,
  Collapse,
  Typography,
  Button,
  IconButton,
  List,
  Menu,
  MenuHandler,
  MenuList,
  MenuItem,
} from "@material-tailwind/react";

// @heroicons/react
import {
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ClipboardIcon,
  ArrowRightOnRectangleIcon,
  ArrowPathIcon,
  BookOpenIcon,
  CalendarIcon,
  ClipboardDocumentIcon,
  PuzzlePieceIcon,
  RectangleGroupIcon,
  ShoppingCartIcon,
  TableCellsIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  BellAlertIcon,
} from "@heroicons/react/24/solid";
import {
  ChartBarSquareIcon,
  Square3Stack3DIcon,
} from "@heroicons/react/24/outline";

const pagesMenuItems = [
  {
    title: "Overview",
    description: "Find the perfect solution for your needs.",
    icon: RectangleGroupIcon,
    path: "/dashboard/overview",
  },
  {
    title: "Data",
    description: "Meet and learn about our dedication",
    icon: CurrencyDollarIcon,
    path: "/dashboard/data",
  },
  {
    title: "Requests",
    description: "Learn how we can help you achieve your goals.",
    icon: BanknotesIcon,
    path: "/supply-chain/requests",
  },
  {
    title: "Orders",
    description: "Reach out to us for assistance or inquiries",
    icon: Square3Stack3DIcon,
    path: "/supply-chain/orders",
  },
  {
    title: "Warehouse",
    description: "Find the perfect solution for your needs.",
    icon: ChartBarSquareIcon,
    path: "/supply-chain/warehouse",
  },
  {
    title: "Vendors",
    description: "Read insightful articles, tips, and expert opinions.",
    icon: BellAlertIcon,
    path: "/supply-chain/vendors",
  },
];

function PagesMenu() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const renderItems = pagesMenuItems.map(
    ({ icon: Icon, title, description, path }, key) => (
      <Link href={path} key={key}>
        <MenuItem className="tw-flex tw-items-center tw-gap-3 tw-rounded-lg">
          <div className="tw-flex tw-items-center tw-justify-center tw-rounded-lg !tw-bg-blue-gray-50 tw-p-2">
            <Icon className="tw-h-6 tw-w-6 tw-text-gray-900 tw-stroke-2" />
          </div>
          <div>
            <Typography
              variant="h6"
              color="blue-gray"
              className="tw-flex tw-items-center tw-text-sm !tw-font-bold"
            >
              {title}
            </Typography>
            <Typography
              variant="paragraph"
              className="tw-text-xs !tw-font-medium !tw-text-blue-gray-500"
            >
              {description}
            </Typography>
          </div>
        </MenuItem>
      </Link>
    )
  );

  return (
    <React.Fragment>
      <Menu
        open={isMenuOpen}
        handler={setIsMenuOpen}
        placement="bottom"
        allowHover={true}
      >
        <MenuHandler>
          <Typography
            as="div"
            variant="small"
            className="!tw-font-medium lg:tw-text-white tw-text-gray-900 lg:tw-w-max tw-w-full"
          >
            <li
              className="tw-w-full tw-justify-between tw-flex cursor-pointer tw-items-center tw-gap-2 tw-py-2 !tw-font-medium hover:tw-bg-transparent"
              onClick={() => setIsMobileMenuOpen((cur) => !cur)}
            >
              Departments
              <ChevronDownIcon
                strokeWidth={2.5}
                className={`tw-hidden tw-h-3 tw-w-3 tw-transition-transform lg:tw-block ${
                  isMenuOpen ? "tw-rotate-180" : ""
                }`}
              />
              <ChevronDownIcon
                strokeWidth={2.5}
                className={`tw-block tw-h-3 tw-w-3 tw-transition-transform lg:tw-hidden ${
                  isMobileMenuOpen ? "tw-rotate-180" : ""
                }`}
              />
            </li>
          </Typography>
        </MenuHandler>
        <MenuList className="tw-hidden tw-max-w-screen-xl tw-rounded-xl lg:tw-block">
          <ul className="tw-grid tw-grid-cols-3 tw-gap-y-2 tw-outline-none tw-outline-0">
            {renderItems}
          </ul>
        </MenuList>
      </Menu>
      <div className="tw-block lg:tw-hidden">
        <Collapse open={isMobileMenuOpen}>{renderItems}</Collapse>
      </div>
    </React.Fragment>
  );
}

const operationsMenuItems = [
  {
    title: "Maintenance",
    path: "/operations/maintenance",
    icon: BookOpenIcon,
  },
  {
    title: "Production",
    path: "/operations/production",
    icon: TableCellsIcon,
  },
  {
    title: "Quality",
    path: "/operations/quality",
    icon: CalendarIcon,
  },
  {
    title: "Planning",
    path: "/operations/planning",
    icon: ClipboardDocumentIcon,
  },
];

function OperationsMenu() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const renderItems = operationsMenuItems.map(
    ({ icon: Icon, title, path }, key) => (
      <Link href={path} key={key}>
        <MenuItem className="tw-flex tw-items-center tw-gap-2">
          <Icon className="tw-h-4 tw-w-4 tw-text-gray-900" />
          {title}
        </MenuItem>
      </Link>
    )
  );

  return (
    <React.Fragment>
      <Menu
        open={isMenuOpen}
        handler={setIsMenuOpen}
        placement="bottom"
        allowHover={true}
      >
        <MenuHandler>
          <Typography
            as="div"
            variant="small"
            className="w-full tw-font-medium lg:tw-w-max"
          >
            <li
              className="tw-flex tw-justify-between tw-cursor-pointer tw-items-center tw-gap-2 tw-py-2 !tw-font-medium lg:tw-text-white tw-text-gray-900 hover:tw-bg-transparent"
              onClick={() => setIsMobileMenuOpen((cur) => !cur)}
            >
              Operations
              <ChevronDownIcon
                strokeWidth={2.5}
                className={`tw-hidden tw-h-3 tw-w-3 tw-transition-transform lg:tw-block ${
                  isMenuOpen ? "tw-rotate-180" : ""
                }`}
              />
              <ChevronDownIcon
                strokeWidth={2.5}
                className={`tw-block tw-h-3 tw-w-3 tw-transition-transform lg:tw-hidden ${
                  isMobileMenuOpen ? "tw-rotate-180" : ""
                }`}
              />
            </li>
          </Typography>
        </MenuHandler>
        <MenuList className="tw-rounded-xl lg:tw-block tw-hidden">
          {renderItems}
        </MenuList>
      </Menu>
      <div className="tw-block lg:tw-hidden">
        <Collapse open={isMobileMenuOpen}>{renderItems}</Collapse>
      </div>
    </React.Fragment>
  );
}

const authMenuItems = [
  {
    title: "HR",
    path: "/business-support/hr",
    icon: ArrowRightOnRectangleIcon,
  },
  {
    title: "IT",
    path: "/business-support/it",
    icon: ClipboardIcon,
  },
  {
    title: "Marketing",
    path: "/business-support/marketing",
    icon: ArrowPathIcon,
  },
];

function AuthMenu() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const renderItems = authMenuItems.map(({ icon: Icon, title, path }, key) => (
    <Link href={path} key={key}>
      <MenuItem className="tw-flex tw-items-center tw-gap-2">
        <Icon className="tw-h-4 tw-w-4 tw-text-gray-900" />
        {title}
      </MenuItem>
    </Link>
  ));

  return (
    <React.Fragment>
      <Menu
        open={isMenuOpen}
        handler={setIsMenuOpen}
        placement="bottom"
        allowHover={true}
      >
        <MenuHandler>
          <Typography
            as="div"
            variant="small"
            className="tw-font-medium lg:tw-w-max tw-w-full"
          >
            <li
              className="tw-flex tw-justify-between tw-cursor-pointer tw-items-center tw-gap-2 tw-py-2 !tw-font-medium lg:tw-text-white tw-text-gray-900 hover:tw-bg-transparent"
              onClick={() => setIsMobileMenuOpen((cur) => !cur)}
            >
              Business Support
              <ChevronDownIcon
                strokeWidth={2.5}
                className={`tw-hidden tw-h-3 tw-w-3 tw-transition-transform lg:tw-block ${
                  isMenuOpen ? "tw-rotate-180" : ""
                }`}
              />
              <ChevronDownIcon
                strokeWidth={2.5}
                className={`tw-block tw-h-3 tw-w-3 tw-transition-transform lg:tw-hidden ${
                  isMobileMenuOpen ? "tw-rotate-180" : ""
                }`}
              />
            </li>
          </Typography>
        </MenuHandler>
        <MenuList className="tw-rounded-xl tw-hidden lg:tw-block">
          {renderItems}
        </MenuList>
      </Menu>
      <div className="tw-block lg:tw-hidden">
        <Collapse open={isMobileMenuOpen}>{renderItems}</Collapse>
      </div>
    </React.Fragment>
  );
}

const businessMenuItems = [
  {
    title: "Finance",
    description: "Learn how we can help you achieve your goals.",
    icon: BanknotesIcon,
    path: "/business/finance",
  },
  {
    title: "Sales",
    description: "Find the perfect solution for your needs.",
    icon: ShoppingCartIcon,
    path: "/business/sales",
  },
];

function BusinessMenu() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const renderItems = businessMenuItems.map(
    ({ icon: Icon, title, description, path }, key) => (
      <Link href={path} key={key}>
        <MenuItem className="tw-flex tw-items-center tw-gap-3 tw-rounded-lg">
          <div className="tw-flex tw-items-center tw-justify-center tw-rounded-lg !tw-bg-blue-gray-50 tw-p-2 ">
            <Icon className="tw-h-6 tw-w-6 tw-text-gray-900 tw-stroke-2" />
          </div>
          <div>
            <Typography
              variant="h6"
              color="blue-gray"
              className="tw-flex tw-items-center tw-text-sm !tw-font-bold"
            >
              {title}
            </Typography>
            <Typography
              variant="paragraph"
              className="tw-text-xs !tw-font-medium !tw-text-blue-gray-500"
            >
              {description}
            </Typography>
          </div>
        </MenuItem>
      </Link>
    )
  );

  return (
    <React.Fragment>
      <Menu
        open={isMenuOpen}
        handler={setIsMenuOpen}
        placement="bottom"
        allowHover={true}
      >
        <MenuHandler>
          <Typography as="div" variant="small" className="font-medium">
            <li
              className="tw-flex tw-justify-between tw-cursor-pointer tw-items-center tw-gap-2 tw-py-2 tw-font-medium lg:tw-text-white tw-text-gray-900 hover:tw-bg-transparent"
              onClick={() => setIsMobileMenuOpen((cur) => !cur)}
            >
              Business
              <ChevronDownIcon
                strokeWidth={2.5}
                className={`tw-hidden tw-h-3 tw-w-3 tw-transition-transform lg:tw-block ${
                  isMenuOpen ? "tw-rotate-180" : ""
                }`}
              />
              <ChevronDownIcon
                strokeWidth={2.5}
                className={`tw-block tw-h-3 tw-w-3 tw-transition-transform lg:tw-hidden ${
                  isMobileMenuOpen ? "tw-rotate-180" : ""
                }`}
              />
            </li>
          </Typography>
        </MenuHandler>
        <MenuList className="tw-hidden tw-max-w-screen-xl tw-rounded-xl lg:tw-block">
          <ul className="tw-grid tw-grid-cols-2 tw-gap-y-2 tw-outline-none tw-outline-0">
            {renderItems}
          </ul>
        </MenuList>
      </Menu>
      <div className="tw-block lg:tw-hidden">
        <Collapse open={isMobileMenuOpen}>{renderItems}</Collapse>
      </div>
    </React.Fragment>
  );
}

const docsMenuItems = [
  {
    title: "Getting Started",
    icon: ClipboardDocumentIcon,
    path: "https://www.material-tailwind.com/docs/react/installation",
    description: "All about overview, quick start, licence and contents",
  },
  {
    title: "Foundation",
    icon: ListBulletIcon,
    path: "https://www.material-tailwind.com/docs/react/theming",
    description: "See our colors, icons and typography",
  },
  {
    title: "Components",
    icon: Squares2X2Icon,
    path: "https://www.material-tailwind.com/docs/react/accordion",
    description: "Explore our collection of fully designed components",
  },
  {
    title: "Plugins",
    icon: PuzzlePieceIcon,
    path: "https://www.material-tailwind.com/docs/react/license",
    description: "Check how you can integrate our plugins",
  },
];

function DocsMenu() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const renderItems = docsMenuItems.map(
    ({ icon: Icon, title, description, path }, key) => (
      <MenuItem
        className="tw-flex tw-items-start tw-gap-3 tw-rounded-lg"
        key={key}
      >
        <div className="tw-flex tw-items-center tw-justify-center tw-rounded-lg !tw-bg-blue-gray-50 tw-p-2">
          <Icon className="tw-h-6 tw-w-6 tw-text-gray-900 tw-stroke-2" />
        </div>
        <Link href={path} key={key} target="_blank">
          <Typography variant="h6" color="blue-gray" className="tw-mb-1">
            {title}
          </Typography>
          <Typography variant="small" color="gray" className="tw-font-normal">
            {description}
          </Typography>
        </Link>
      </MenuItem>
    )
  );

  return (
    <React.Fragment>
      <Menu allowHover open={isMenuOpen} handler={setIsMenuOpen}>
        <MenuHandler>
          <Typography
            as="div"
            variant="small"
            className="tw-font-medium lg:tw-w-max tw-w-full"
          >
            <li
              className="tw-flex tw-justify-between tw-cursor-pointer tw-items-center tw-gap-2 tw-py-2 tw-font-medium lg:tw-text-white tw-text-gray-900 hover:tw-bg-transparent"
              onClick={() => setIsMobileMenuOpen((cur) => !cur)}
            >
              Docs
              <ChevronDownIcon
                strokeWidth={2.5}
                className={`tw-hidden tw-h-3 tw-w-3 tw-transition-transform lg:tw-block ${
                  isMenuOpen ? "tw-rotate-180" : ""
                }`}
              />
              <ChevronDownIcon
                strokeWidth={2.5}
                className={`tw-block tw-h-3 tw-w-3 tw-transition-transform lg:tw-hidden ${
                  isMobileMenuOpen ? "tw-rotate-180" : ""
                }`}
              />
            </li>
          </Typography>
        </MenuHandler>
        <MenuList className="tw-hidden tw-w-[26rem] tw-gap-3 tw-overflow-visible lg:tw-grid">
          <ul className="tw-col-span-4 tw-flex tw-w-full tw-flex-col tw-gap-1">
            {renderItems}
          </ul>
        </MenuList>
      </Menu>
      <div className="tw-block lg:tw-hidden">
        <Collapse open={isMobileMenuOpen}>{renderItems}</Collapse>
      </div>
    </React.Fragment>
  );
}

function NavList() {
  return (
    <List className="tw-mt-4 tw-mb-6 tw-p-0 lg:tw-mt-0 lg:tw-mb-0 lg:tw-flex-row lg:tw-p-1 lg:tw-gap-6">
      <PagesMenu />
      <AuthMenu />
      <OperationsMenu />
      <BusinessMenu />
      <DocsMenu />
    </List>
  );
}

export function Navbar() {
  const [openNav, setOpenNav] = React.useState(false);

  React.useEffect(() => {
    window.addEventListener(
      "resize",
      () => window.innerWidth >= 960 && setOpenNav(false)
    );
  }, []);

  return (
    <MTNavbar color="transparent" shadow={false} className="tw-absolute">
      <div className="tw-flex tw-items-center tw-justify-between">
        <Typography
          as={Link}
          href="/dashboard/overview"
          variant="h6"
          className="tw-cursor-pointer tw-py-1.5"
        >
          Material Tailwind PRO
        </Typography>
        <div className="tw-hidden lg:tw-block">
          <NavList />
        </div>
        <div className="tw-hidden lg:tw-flex">
          <a href="https://material-tailwind.com/blocks" target="_blank">
            <Button color="white" size="sm">
              Blocks
            </Button>
          </a>
        </div>
        <IconButton
          variant="text"
          color="white"
          className="lg:tw-hidden"
          onClick={() => setOpenNav(!openNav)}
        >
          {openNav ? (
            <XMarkIcon className="tw-h-6 tw-w-6" strokeWidth={2} />
          ) : (
            <Bars3Icon className="tw-h-6 tw-w-6" strokeWidth={2} />
          )}
        </IconButton>
      </div>
      <Collapse open={openNav}>
        <div className="tw-container tw-mx-auto tw-rounded-lg tw-bg-white tw-px-6 tw-pt-1 tw-pb-5">
          <NavList />
          <div className="tw-block lg:tw-hidden">
            <a href="https://material-tailwind.com/blocks" target="_blank">
              <Button color="gray" size="sm">
                Blocks
              </Button>
            </a>
          </div>
        </div>
      </Collapse>
    </MTNavbar>
  );
}
