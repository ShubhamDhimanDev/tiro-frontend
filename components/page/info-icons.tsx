import type { ReactNode } from "react";
import {
  CalendarIcon,
  ClockIcon,
  PinIcon,
  RecycleIcon,
  ShieldIcon,
  StarIcon,
  TagIcon,
  TruckIcon,
  TyreIcon,
  WrenchIcon,
} from "@/components/ui/icons";
import { BookIcon, BuildingIcon, CardIcon, GaugeIcon, GiftIcon, HelpIcon, ReturnIcon, UsersIcon } from "@/components/ui/icons-extra";
import type { InfoIconKey } from "@/lib/site/info-pages";

const MAP: Record<InfoIconKey, ReactNode> = {
  shield: <ShieldIcon />,
  tag: <TagIcon />,
  card: <CardIcon />,
  clock: <ClockIcon />,
  truck: <TruckIcon />,
  return: <ReturnIcon />,
  users: <UsersIcon />,
  book: <BookIcon />,
  gauge: <GaugeIcon />,
  gift: <GiftIcon />,
  wrench: <WrenchIcon />,
  tyre: <TyreIcon />,
  building: <BuildingIcon />,
  help: <HelpIcon />,
  pin: <PinIcon />,
  recycle: <RecycleIcon />,
  calendar: <CalendarIcon />,
  star: <StarIcon />,
};

/** Decorative icon for an `InfoIconKey` (data files hold keys, not JSX). */
export function infoIcon(key: InfoIconKey | undefined): ReactNode {
  return key ? MAP[key] : null;
}
