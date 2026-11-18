import {
  Baby,
  Bike,
  BookOpen,
  Camera,
  Car,
  Dumbbell,
  Footprints,
  Gamepad2,
  Laptop,
  LucideIcon,
  LucideProps,
  Motorbike,
  Package,
  PawPrint,
  Shirt,
  Smartphone,
  Sofa,
  Tablet,
  Tag,
  Tv,
  Watch,
  Wrench,
} from 'lucide-react';

/** Icon names as stored in categories.icon → drawn icons. */
const ICONS: Record<string, LucideIcon> = {
  laptop: Laptop,
  car: Car,
  shirt: Shirt,
  tshirt: Shirt,
  dress: Shirt,
  home: Sofa,
  dumbbell: Dumbbell,
  baby: Baby,
  book: BookOpen,
  paw: PawPrint,
  tools: Wrench,
  wrench: Wrench,
  box: Package,
  smartphone: Smartphone,
  tablet: Tablet,
  tv: Tv,
  camera: Camera,
  gamepad: Gamepad2,
  motorcycle: Motorbike,
  bicycle: Bike,
  shoe: Footprints,
  watch: Watch,
};

export function CategoryIcon({
  icon,
  ...props
}: { icon?: string | null } & Omit<LucideProps, 'name'>) {
  const Icon = (icon && ICONS[icon]) || Tag;
  return <Icon aria-hidden="true" {...props} />;
}
