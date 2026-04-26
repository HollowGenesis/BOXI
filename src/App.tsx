import { useMemo, useState, useRef, useEffect } from "react";

type Size = "XXL" | "XL" | "XL long" | "L" | "L long" | "M" | "M1" | "M long" | "S" | "S long";
type Color = "Белый" | "Крафт" | "Другой";
type ShippingType = "Машина" | "Почта" | "ОПТ";
type Status = "Новый" | "В работе" | "Готов" | "Отправлен";
type Role = "manager" | "packer" | "master" | "developer";
type Tab = "retail" | "wholesale" | "print" | "stock" | "notifications" | "activity" | "dies" | "profile";
type StockKind = "carriers" | "bottoms" | "lids" | "cords";
type PrintOperator = "Максим" | "Ирина";

type User = {
  id: number;
  name: string;
  login: string;
  password: string;
  role: Role;
  online: boolean;
  lastLoginAt?: string;
  lastLogoutAt?: string;
};

type Permissions = {
  canCreateOrders: boolean;
  canEditOrders: boolean;
  canChangeStatus: boolean;
  canViewStock: boolean;
  canEditStock: boolean;
  canManageStock: boolean;
  canViewProductionRefs: boolean;
  canManageAccounts: boolean;
};

type OrderItem = {
  id: number;
  size: Size;
  color: Color;
  customColor?: string;
  customColorHex?: string;
  cordColor?: Color;
  customCordColor?: string;
  customCordColorHex?: string;
  includeLid?: boolean;
  quantity: number;
  readyQuantity?: number;
  readyLidsQuantity?: number;
  readySteps?: { step20?: number; step40?: number; step50?: number };
  shipping: ShippingType;
};

type Order = {
  id: number;
  client: string;
  manager: string;
  createdAt: string;
  productionDate: string;
  shippingDate: string;
  shipping: ShippingType;
  status: Status;
  items: OrderItem[];
  note?: string;
  archived?: boolean;
  stockApplied?: boolean;
  isWholesale?: boolean;
  packedBy?: string;
};

type PrintOrder = Order & {
  layoutFileNames?: string[];
  layoutPreviews?: string[];
  printOperator?: PrintOperator;
  printDate?: string;
  printColor?: Color;
  customPrintColor?: string;
  customPrintColorHex?: string;
};

type MaterialAlert = {
  id: number;
  orderId: number;
  message: string;
  createdAt: string;
};

type StockItem = {
  id: string;
  kind: StockKind;
  name: string;
  size?: Size | "S/M1" | "M/L long" | "L/L long";
  color?: Color | "Любой";
  stockColorName?: string;
  stockColorHex?: string;
  quantity: number;
  userAdded?: boolean;
};

const sizes: Size[] = ["XXL", "XL", "XL long", "L", "L long", "M", "M1", "M long", "S", "S long"];
const colors: Color[] = ["Белый", "Крафт", "Другой"];
const shippingTypes: ShippingType[] = ["Машина", "Почта", "ОПТ"];
const statuses: Status[] = ["Новый", "В работе", "Готов", "Отправлен"];
const rolesForCreation: Role[] = ["manager", "packer", "developer"];
const switchableRoles: Role[] = ["manager", "packer", "master", "developer"];
const printOperators: PrintOperator[] = ["Максим", "Ирина"];

const roleLabels: Record<Role, string> = {
  manager: "Менеджер",
  packer: "Упаковщик",
  master: "Мастер цеха",
  developer: "Разработчик",
};

const roleDescriptions: Record<Role, string> = {
  manager: "Создает и редактирует заказы, видит статус и уведомления, но не меняет производственный статус.",
  packer: "Видит заказы и меняет только производственный статус: новый, в работе, готов, отправлен.",
  master: "Имеет полный доступ: заказы, статусы, сырье, справочники и аккаунты.",
  developer: "Имеет весь доступ мастера цеха и может переключаться между ролями для просмотра возможностей каждой роли.",
};

const initialUsers: User[] = [
  { id: 1, name: "Анна", login: "anna", password: "1111", role: "manager", online: false },
  { id: 2, name: "Сергей", login: "packer", password: "2222", role: "packer", online: false },
  { id: 3, name: "Иван", login: "master", password: "3333", role: "master", online: false },
  { id: 4, name: "Алехандро", login: "developer", password: "developer", role: "developer", online: true, lastLoginAt: new Date().toISOString() },
];

const dieForms = [
  { name: "XXL", output: "1 переноска + 1 дно", note: "Крупный формат, для почты по 35 переносок" },
  { name: "XL", output: "1 переноска + 1 дно", note: "Стандартный сверток 50 переносок" },
  { name: "XL long", output: "1 переноска + 1 дно", note: "Удлиненная форма" },
  { name: "L + S", output: "2 переноски с 1 листа", note: "Совмещенная прокатка L и S" },
  { name: "L long + S", output: "2 переноски с 1 листа", note: "Совмещенная прокатка L long и S" },
  { name: "L long + S long", output: "2 переноски с 1 листа", note: "Совмещенная прокатка L long и S long" },
  { name: "M", output: "2 переноски M с 1 листа", note: "Парная раскладка" },
  { name: "M long", output: "2 переноски M long с 1 листа", note: "Парная раскладка" },
  { name: "M1", output: "2 переноски M1 с 1 листа", note: "Парная раскладка" },
];

const initialOrders: Order[] = [
  {
    id: 1024,
    client: "Цветочная база «Флора»",
    manager: "Анна",
    createdAt: "2026-04-24",
    productionDate: "2026-04-27",
    shippingDate: "2026-04-28",
    shipping: "Почта",
    status: "В работе",
    note: "Подготовить усиление для почтовых свертков.",
    items: [
      { id: 1, size: "XL", color: "Белый", cordColor: "Белый", includeLid: true, quantity: 300, shipping: "Почта" },
      { id: 2, size: "M", color: "Крафт", cordColor: "Крафт", includeLid: false, quantity: 200, shipping: "Почта" },
    ],
  },
  {
    id: 1025,
    client: "Green Market",
    manager: "Илья",
    createdAt: "2026-04-24",
    productionDate: "2026-04-25",
    shippingDate: "2026-04-25",
    shipping: "ОПТ",
    status: "Готов",
    items: [{ id: 1, size: "S long", color: "Другой", customColor: "шалфей", customColorHex: "#9caf88", cordColor: "Другой", customCordColor: "шалфей", customCordColorHex: "#9caf88", includeLid: true, quantity: 160, shipping: "ОПТ" }],
  },
  {
    id: 1026,
    client: "Салон «Пион»",
    manager: "Мария",
    createdAt: "2026-04-23",
    productionDate: "2026-04-26",
    shippingDate: "2026-04-27",
    shipping: "Машина",
    status: "Новый",
    items: [{ id: 1, size: "XXL", color: "Крафт", cordColor: "Крафт", includeLid: false, quantity: 140, shipping: "Машина" }],
  },
];

const initialPrintOrders: PrintOrder[] = [
  {
    id: 5021,
    client: "Студия «Букет»",
    manager: "Анна",
    createdAt: "2026-04-24",
    productionDate: "2026-04-29",
    shippingDate: "2026-04-30",
    shipping: "Почта",
    status: "Новый",
    printOperator: "Максим",
    printDate: "2026-04-28",
    printColor: "Крафт",
    layoutFileNames: ["logo-buket-preview.jpg"],
    layoutPreviews: [],
    items: [{ id: 1, size: "L", color: "Белый", cordColor: "Белый", includeLid: true, quantity: 100, shipping: "Почта" }],
    note: "Печать логотипа на лицевой стороне.",
  },
];

const stockSizesByKind: Record<Exclude<StockKind, "cords">, StockItem["size"][]> = {
  carriers: sizes,
  bottoms: ["XXL", "XL", "XL long", "L", "S/M1", "M/L long", "M long", "S long"],
  lids: ["XXL", "XL", "XL long", "L/L long", "M", "M1", "M long", "S", "S long"],
};

const stockNameByKind: Record<StockKind, string> = {
  carriers: "Переноски",
  bottoms: "Донья",
  lids: "Крышки",
  cords: "Шнурки",
};

const initialStock: StockItem[] = [
  ...(["carriers", "bottoms", "lids"] as const).flatMap((kind) =>
    stockSizesByKind[kind].flatMap((size) =>
      (["Белый", "Крафт"] as Color[]).map((color, index) => ({
        id: `${kind}-${String(size).replace(/\s|\//g, "-").toLowerCase()}-${color.toLowerCase()}`,
        kind,
        name: stockNameByKind[kind],
        size,
        color,
        quantity: index === 0 ? 520 : 420,
      })),
    ),
  ),
  { id: "cord-white", kind: "cords", name: "Шнурки", color: "Белый", quantity: 8200 },
  { id: "cord-kraft", kind: "cords", name: "Шнурки", color: "Крафт", quantity: 5300 },
];

const emptyOrderItem = (id = 1): OrderItem => ({
  id,
  size: "XL",
  color: "Белый",
  cordColor: "Белый",
  includeLid: false,
  quantity: 50,
  shipping: "Машина",
});

const today = new Date().toISOString().slice(0, 10);

const newOrder = (managerName = "Менеджер"): Order => ({
  id: Date.now(),
  client: "Новый клиент",
  manager: managerName,
  createdAt: today,
  productionDate: today,
  shippingDate: today,
  shipping: "Машина",
  status: "Новый",
  items: [emptyOrderItem(1)],
  note: "",
});

const newPrintOrder = (managerName = "Менеджер"): PrintOrder => ({
  ...newOrder(managerName),
  id: Date.now(),
  layoutFileNames: [],
  layoutPreviews: [],
  printOperator: "Максим",
  printDate: today,
  printColor: "Белый",
  note: "Типография: ",
});

function getPermissions(role: Role): Permissions {
  return {
    canCreateOrders: role === "manager" || role === "master" || role === "developer",
    canEditOrders: role === "manager" || role === "master" || role === "developer",
    canChangeStatus: role === "packer" || role === "master" || role === "developer",
    canViewStock: role === "packer" || role === "manager" || role === "master" || role === "developer",
    canEditStock: role === "packer" || role === "master" || role === "developer",
    canManageStock: role === "master" || role === "developer",
    canViewProductionRefs: role === "master" || role === "developer",
    canManageAccounts: role === "master" || role === "developer",
  };
}

function getTabsForRole(role: Role): Tab[] {
  if (role === "master" || role === "developer") return ["retail", "wholesale", "print", "stock", "notifications", "activity", "dies", "profile"];
  if (role === "packer" || role === "manager") return ["retail", "wholesale", "print", "stock", "notifications", "activity", "dies", "profile"];
  return ["retail", "wholesale", "print", "notifications", "activity", "dies", "profile"];
}

function getBundleSize(item: OrderItem) {
  if (item.shipping === "ОПТ") return 10;
  if (item.shipping === "Почта" && item.size === "XXL") return 35;
  return 50;
}

function getPackaging(item: OrderItem) {
  const isOpt = item.shipping === "ОПТ";
  const bundleSize = getBundleSize(item);

  // Свертки переносок
  const carrierBundles = Math.ceil(item.quantity / bundleSize);

  // ОПТ: 1 сверток = 10 переносок + 1 пакет шнурков (20 шт) + 10 крышек (если есть)
  // Крышки в ОПТ не считаются отдельными свертками — они входят в сверток переносок
  // Свертки крышек (не ОПТ): до 200 штук в свертке
  const lidBundles = (!isOpt && item.includeLid) ? Math.ceil(item.quantity / 200) : 0;

  const bundles = carrierBundles + lidBundles;

  // Касеты для ОПТ: 4 свертка = 1 касета
  let cassettes = 0;
  if (isOpt) {
    cassettes = Math.ceil(carrierBundles / 5);
  }

  const cords = item.quantity * 2;
  const cordBags = Math.ceil(cords / 20);
  const reinforcement = item.shipping === "Почта" ? carrierBundles : 0;

  return { bundleSize, bundles, carrierBundles, lidBundles, cassettes, cords, cordBags, reinforcement };
}

function getOrderTotals(order: Order) {
  const isOpt = order.shipping === "ОПТ";
  const hasReadySteps = order.items.some((it) => it.readySteps && ((it.readySteps.step20 || 0) + (it.readySteps.step40 || 0) + (it.readySteps.step50 || 0)) > 0);

  return order.items.reduce(
    (acc, item) => {
      const packaging = getPackaging({ ...item, shipping: order.shipping });
      acc.quantity += item.quantity;
      acc.lids += item.includeLid ? item.quantity : 0;
      acc.bundles += packaging.carrierBundles;
      acc.lidBundles += packaging.lidBundles;
      if (isOpt && hasReadySteps) {
        acc.cassettes += (item.readySteps?.step20 || 0) + (item.readySteps?.step40 || 0) + (item.readySteps?.step50 || 0);
      } else if (isOpt) {
        acc.cassettes += packaging.cassettes;
      } else {
        acc.cassettes += packaging.cassettes;
      }
      acc.cords += packaging.cords;
      acc.cordBags += packaging.cordBags;
      acc.reinforcement += packaging.reinforcement;
      return acc;
    },
    { quantity: 0, lids: 0, bundles: 0, lidBundles: 0, cassettes: 0, cords: 0, cordBags: 0, reinforcement: 0 },
  );
}

function getStockZone(item: StockItem) {
  if (item.kind === "cords") {
    if (item.quantity > 6000) return "green" as const;
    if (item.quantity >= 3000) return "yellow" as const;
    return "red" as const;
  }
  if (item.quantity > 500) return "green" as const;
  if (item.quantity >= 200) return "yellow" as const;
  return "red" as const;
}

function zoneMeta(zone: ReturnType<typeof getStockZone>) {
  if (zone === "green") return { label: "Зеленая зона", dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-100" };
  if (zone === "yellow") return { label: "Желтая зона", dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-100" };
  return { label: "Красная зона", dot: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50", ring: "ring-rose-100" };
}

function colorHex(color?: Color, customHex?: string) {
  if (color === "Белый") return "#ffffff";
  if (color === "Крафт") return "#b9854d";
  return customHex || "#22c55e";
}

const colorNameOptions = [
  "Абрикосовый", "Аквамариновый", "Ализариновый красный", "Алый", "Амарантово-розовый", "Аметистовый", "Антрацитовый", "Бежевый", "Белоснежный", "Белый",
  "Берлинская лазурь", "Бирюзовый", "Бледно-голубой", "Бледно-зеленый", "Бледно-розовый", "Бордовый", "Бронзовый", "Васильковый", "Винно-красный", "Вишневый",
  "Гелиотроп", "Глициния", "Глубокий красный", "Глубокий розовый", "Голубой", "Графитовый", "Желтый", "Жемчужно-белый", "Зеленый", "Изумрудный",
  "Индиго", "Кармин", "Кобальтово-синий", "Коралловый", "Коричневый", "Кремовый", "Лавандовый", "Лазурный", "Лаймовый", "Лимонный",
  "Малиновый", "Медный", "Мятный", "Оливковый", "Оранжевый", "Персиковый", "Пурпурный", "Розовый", "Рубиновый", "Сапфировый",
  "Серебряный", "Серый", "Синий", "Сиреневый", "Слоновая кость", "Тиффани", "Томатный", "Травяной зеленый", "Ультрамариновый", "Фиолетовый",
  "Фисташковый", "Фуксия", "Хаки", "Циан", "Черный", "Шоколадный", "Электрик", "Янтарный", "Ярко-зеленый", "Ярко-розовый", "Ярко-синий",
];

const pantoneOptions = [
  "100", "102", "116", "123", "151", "165", "185", "192", "203", "213", "226", "239", "259", "266", "280", "285", "300", "306", "320", "327", "347", "352",
  "375", "395", "420", "432", "485", "500", "512", "540", "553", "624", "638", "660", "675", "7401", "7405", "7424", "7466", "7481", "7547", "7621",
  "2035", "2195", "2265", "3522", "7725", "Process Blue", "Reflex Blue", "Rhodamine Red", "Rubine Red", "Warm Red", "Orange 021", "Blue 072",
];

const pantoneFullOptions = Array.from(new Set([
  ...pantoneOptions,
  ...Array.from({ length: 633 }, (_, index) => String(100 + index)),
  ...Array.from({ length: 431 }, (_, index) => String(2001 + index)),
  ...Array.from({ length: 502 }, (_, index) => String(7401 + index)),
]));

const namedColorMap: Record<string, string> = {
  абрикосовый: "#FBCEB1",
  аквамариновый: "#7FFFD4",
  ализариновыйкрасный: "#E32636",
  алый: "#FF2400",
  амарантоворозовый: "#F19CBB",
  аметистовый: "#9966CC",
  антрацитовый: "#464451",
  бежевый: "#F5F5DC",
  белоснежный: "#FFFAFA",
  белый: "#FFFFFF",
  берлинскаялазурь: "#003153",
  бирюзовый: "#30D5C8",
  бледноголубой: "#ABCDEF",
  бледнозеленый: "#98FB98",
  бледнорозовый: "#FADADD",
  бордовый: "#9B2D30",
  бронзовый: "#CD7F32",
  васильковый: "#6495ED",
  виннокрасный: "#5E2129",
  вишневый: "#911E42",
  гелиотроп: "#DF73FF",
  глициния: "#C9A0DC",
  глубокийкрасный: "#7B001C",
  глубокийрозовый: "#FF1493",
  голубой: "#42AAFF",
  графитовый: "#474A51",
  желтый: "#FFFF00",
  жемчужнобелый: "#F0EAD6",
  зеленый: "#008000",
  изумрудный: "#50C878",
  индиго: "#4B0082",
  кармин: "#960018",
  кобальтовосиний: "#0047AB",
  коралловый: "#FF7F50",
  коричневый: "#964B00",
  крафт: "#b9854d",
  кремовый: "#FDF4E3",
  лавандовый: "#E6E6FA",
  лазурный: "#007FFF",
  лаймовый: "#CCFF00",
  лимонный: "#FDE910",
  малиновый: "#DC143C",
  медный: "#B87333",
  мятный: "#3EB489",
  оливковый: "#808000",
  оранжевый: "#FFA500",
  персиковый: "#FFE5B4",
  пурпурный: "#800080",
  розовый: "#FFC0CB",
  рубиновый: "#E0115F",
  сапфировый: "#082567",
  серебряный: "#C0C0C0",
  серый: "#808080",
  синий: "#0000FF",
  сиреневый: "#C8A2C8",
  слоноваякость: "#FFFFF0",
  тиффани: "#0ABAB5",
  томатный: "#FF6347",
  травянойзеленый: "#35682D",
  ультрамариновый: "#120A8F",
  фиолетовый: "#8B00FF",
  фисташковый: "#BEF574",
  фуксия: "#F754E1",
  хаки: "#806B2A",
  циан: "#00FFFF",
  черный: "#000000",
  шоколадный: "#D2691E",
  электрик: "#7DF9FF",
  янтарный: "#FFBF00",
  яркозеленый: "#66FF00",
  яркорозовый: "#FC0FC0",
  яркосиний: "#007CAD",
  "100": "#FCEA76",
  "102": "#FEE500",
  "116": "#F5CB08",
  "123": "#F2C541",
  "151": "#E88D21",
  "165": "#E37828",
  "185": "#D93740",
  "192": "#DB3B50",
  "203": "#EAB3C9",
  "213": "#DB3E79",
  "226": "#D70C7A",
  "239": "#C55A9D",
  "259": "#7A327E",
  "266": "#6A4593",
  "280": "#223A76",
  "285": "#2B74B7",
  "300": "#006CB4",
  "306": "#00B3DB",
  "320": "#00A1AA",
  "327": "#00907D",
  "347": "#00A351",
  "352": "#ACD3B1",
  "375": "#A9C833",
  "395": "#E8DF2F",
  "420": "#D5D4D0",
  "432": "#3C4652",
  "485": "#DC4234",
  "500": "#C58B93",
  "512": "#85367B",
  "540": "#163D5C",
  "553": "#325040",
  "624": "#87A796",
  "638": "#00ADD7",
  "660": "#3975B7",
  "675": "#B11F79",
  "2035": "#D12E28",
  "2195": "#0074BC",
  "2265": "#44763C",
  "3522": "#00A6A6",
  "7401": "#F8E9BE",
  "7405": "#F3D01C",
  "7424": "#DC4B89",
  "7466": "#00AEB3",
  "7481": "#33AA66",
  "7547": "#1D232E",
  "7621": "#AF2F2C",
  "7725": "#008C55",
  processblue: "#008BCC",
  reflexblue: "#263F8C",
  rhodaminered: "#CB4891",
  rubinered: "#D12368",
  warmred: "#DE5A4A",
  orange021: "#E5801C",
  blue072: "#2F408E",
};

function resolveColorNameToHex(value: string) {
  const normalized = value.trim().toLowerCase().replace(/^pantone\s+/i, "").replace(/[\s-]+/g, "").replace(/[ucm]$/i, "");
  if (namedColorMap[normalized]) return namedColorMap[normalized];
  if (/^\d{3,4}$/.test(normalized)) {
    const hue = (Number(normalized) * 47) % 360;
    return hslToHex(hue, 64, 52);
  }
  return undefined;
}

function hslToHex(h: number, s: number, l: number) {
  const saturation = s / 100;
  const lightness = l / 100;
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lightness - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const toHex = (value: number) => Math.round((value + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function colorName(color?: Color, customName?: string) {
  if (color === "Другой") return customName || "заказной цвет";
  return color || "не указан";
}

function bottomSizeFor(size: Size) {
  if (size === "S" || size === "M1") return "S/M1";
  if (size === "M" || size === "L long") return "M/L long";
  return size;
}

function lidSizeFor(size: Size) {
  if (size === "L" || size === "L long") return "L/L long";
  return size;
}

function findStockIndex(stock: StockItem[], kind: StockKind, size: StockItem["size"], color?: Color | "Любой", colorName?: string) {
  const exact = stock.findIndex((item) => item.kind === kind && item.size === size && (!color || item.color === color) && (color !== "Другой" || !colorName || item.stockColorName?.trim().toLowerCase() === colorName.trim().toLowerCase()));
  if (exact >= 0) return exact;
  return -1;
}

function stockColorLabel(item: StockItem) {
  if (item.color === "Другой") return item.stockColorName || "заказной цвет";
  return item.color || "Белый";
}

function stockSortValue(size?: StockItem["size"]) {
  const order: Record<string, number> = {
    XXL: 0,
    XL: 1,
    "XL long": 2,
    L: 3,
    "L/L long": 3,
    "L long": 4,
    M: 5,
    "M/L long": 5,
    M1: 6,
    "S/M1": 6,
    "M long": 7,
    S: 8,
    "S long": 9,
  };
  return size ? order[size] ?? 99 : 99;
}

function applyStockForOrder(order: Order, stock: StockItem[]) {
  const nextStock = stock.map((item) => ({ ...item }));
  const requirements: { kind: StockKind; size?: StockItem["size"]; color?: Color | "Любой"; colorName?: string; quantity: number; label: string }[] = [];

  order.items.forEach((item) => {
    requirements.push({ kind: "carriers", size: item.size, color: item.color, colorName: item.customColor, quantity: item.quantity, label: `Переноски ${item.size}` });
    requirements.push({ kind: "bottoms", size: bottomSizeFor(item.size), color: item.color, colorName: item.customColor, quantity: item.quantity, label: `Донья ${bottomSizeFor(item.size)}` });
    if (item.includeLid) requirements.push({ kind: "lids", size: lidSizeFor(item.size), color: item.color, colorName: item.customColor, quantity: item.quantity, label: `Крышки ${lidSizeFor(item.size)}` });
    requirements.push({ kind: "cords", color: item.cordColor || item.color, colorName: item.customCordColor || item.customColor, quantity: item.quantity * 2, label: `Шнурки ${colorName(item.cordColor || item.color, item.customCordColor || item.customColor)}` });
  });

  const shortages: string[] = [];
  requirements.forEach((requirement) => {
    const index = findStockIndex(nextStock, requirement.kind, requirement.size, requirement.color, requirement.colorName);
    if (index < 0 || nextStock[index].quantity < requirement.quantity) {
      shortages.push(`${requirement.label}: нужно ${requirement.quantity}, доступно ${index >= 0 ? nextStock[index].quantity : 0}`);
    }
  });

  if (shortages.length > 0) return { nextStock: stock, shortages };

  requirements.forEach((requirement) => {
    const index = findStockIndex(nextStock, requirement.kind, requirement.size, requirement.color, requirement.colorName);
    nextStock[index].quantity -= requirement.quantity;
  });

  return { nextStock, shortages };
}

function StockIcon({ kind }: { kind: StockKind }) {
  if (kind === "cords") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 12c3.5-5 6.5 5 10 0s6.5 5 6.5 5" />
        <path d="M3 7c3.5-5 6.5 5 10 0s6.5 5 6.5 5" />
      </svg>
    );
  }
  if (kind === "lids") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 9h16" />
        <path d="M7 9l2-4h6l2 4" />
        <path d="M6 9l2 10h8l2-10" />
      </svg>
    );
  }
  if (kind === "bottoms") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 8h14l-2 10H7L5 8Z" />
        <path d="M8 5h8" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 4h10l4 7-3 9H6l-3-9 4-7Z" />
      <path d="M8 12h8" />
    </svg>
  );
}

function PhoneFrame({ children, theme = "dark" }: { children: React.ReactNode; theme?: "light" | "dark" }) {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-950 shadow-2xl shadow-slate-400/40 sm:my-6 sm:min-h-[920px] sm:overflow-hidden sm:rounded-[2.5rem] sm:border-[10px] sm:border-slate-950">
      <div className={`min-h-screen sm:min-h-[900px] ${theme === "dark" ? "dark-app bg-zinc-950 text-slate-100" : "bg-slate-100 text-slate-950"}`}>{children}</div>
    </div>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const styles: Record<Role, string> = {
    manager: "bg-blue-50 text-blue-700 ring-blue-100",
    packer: "bg-amber-50 text-amber-700 ring-amber-100",
    master: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    developer: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100",
  };

  return <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${styles[role]}`}>{roleLabels[role]}</span>;
}

function UserForm({ onCreate, compact = false }: { onCreate: (user: User) => void; compact?: boolean }) {
  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("manager");

  const createUser = () => {
    const trimmedName = name.trim();
    const trimmedLogin = login.trim().toLowerCase();
    const trimmedPassword = password.trim();
    if (!trimmedName || !trimmedLogin || !trimmedPassword) return;
    onCreate({ id: Date.now(), name: trimmedName, login: trimmedLogin, password: trimmedPassword, role, online: false });
    setName("");
    setLogin("");
    setPassword("");
    setRole("manager");
  };

  return (
    <div className={compact ? "space-y-3" : "rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70"}>
      {!compact && <h2 className="text-xl font-black text-slate-950">Создать аккаунт</h2>}
      <label className="block space-y-1">
        <span className="text-xs font-bold text-slate-500">Имя сотрудника</span>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Например: Ольга" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-950" />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-bold text-slate-500">Логин</span>
        <input value={login} onChange={(event) => setLogin(event.target.value)} placeholder="olga" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-950" />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-bold text-slate-500">Пароль</span>
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="минимум 4 символа" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-950" />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-bold text-slate-500">Уровень доступа</span>
        <select value={role} onChange={(event) => setRole(event.target.value as Role)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-950">
          {rolesForCreation.map((roleOption) => <option key={roleOption} value={roleOption}>{roleLabels[roleOption]}</option>)}
        </select>
      </label>
      <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">{roleDescriptions[role]}</div>
      <button onClick={createUser} className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-lg shadow-slate-300">Создать аккаунт</button>
    </div>
  );
}

function AuthScreen({ users, setUsers, onLogin }: { users: User[]; setUsers: React.Dispatch<React.SetStateAction<User[]>>; onLogin: (user: User) => void }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const addUser = (user: User) => {
    setUsers((prev) => prev.some((item) => item.login === user.login) ? prev : [...prev, user]);
  };

  const submitLogin = () => {
    const found = users.find((user) => user.login === login.trim().toLowerCase() && user.password === password);
    if (!found) {
      setError("Неверный логин или пароль");
      return;
    }
    setError("");
    onLogin(found);
  };

  return (
    <PhoneFrame>
      <div className="min-h-screen bg-slate-950 px-4 pb-8 pt-8 text-white sm:min-h-[900px]">
        <div className="rounded-[2rem] bg-white/10 p-5 ring-1 ring-white/10">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-emerald-300">BOXI.RU:Переноски</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Авторизация</h1>
          <p className="mt-2 text-sm text-slate-300">Введите логин и пароль. Данные входа других сотрудников не отображаются.</p>
        </div>

        <div className="mt-5 rounded-[2rem] bg-white p-4 text-slate-950 shadow-sm">
          <h2 className="text-xl font-black">Войти</h2>
          <div className="mt-4 space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-500">Логин</span>
              <input value={login} onChange={(event) => setLogin(event.target.value)} placeholder="Введите логин" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-950" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-500">Пароль</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submitLogin()} placeholder="Введите пароль" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-950" />
            </label>
            {error && <p className="rounded-2xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p>}
            <button onClick={submitLogin} className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/20">Авторизоваться</button>
          </div>
        </div>

        <button onClick={() => setShowCreate(true)} className="mt-5 w-full rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white ring-1 ring-white/10">Создать аккаунт</button>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-4" onClick={() => setShowCreate(false)}>
            <div className="w-full max-w-md rounded-[2rem] bg-white p-4 text-slate-950 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-black">Новый аккаунт</h2>
                <button onClick={() => setShowCreate(false)} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">Закрыть</button>
              </div>
              <UserForm onCreate={(user) => { addUser(user); setShowCreate(false); }} compact />
            </div>
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}

const tabMeta: Record<Tab, { label: string; icon: string }> = {
  retail: { label: "Розница", icon: "🚚" },
  wholesale: { label: "ОПТы", icon: "💸" },
  print: { label: "Типография", icon: "🎨" },
  stock: { label: "Склад", icon: "📦" },
  notifications: { label: "Уведомления", icon: "!" },
  activity: { label: "Сотрудники", icon: "🏢" },
  dies: { label: "Справка", icon: "ℹ️" },
  profile: { label: "Профиль", icon: "👷‍♂️" },
};

function TopBar({ activeTab, setActiveTab, criticalCount, readyCount, user, displayRole, allowedTabs }: { activeTab: Tab; setActiveTab: (tab: Tab) => void; criticalCount: number; readyCount: number; user: User; displayRole: Role; allowedTabs: Tab[] }) {
  const tabs = allowedTabs.filter((id) => id !== "notifications").map((id) => ({ id, ...tabMeta[id] }));
  const [showRoleInfo, setShowRoleInfo] = useState(false);
  const permissions = getPermissions(displayRole);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const activeBtn = scrollRef.current?.querySelector(`[data-tab-id="${activeTab}"]`);
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeTab]);

  return (
    <div className="sticky top-0 z-20 rounded-b-[2rem] bg-slate-950 px-4 pb-4 pt-5 text-white shadow-xl shadow-slate-400/30">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-emerald-300">BOXI.RU:Переноски</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Производство</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">{user.name}</span>
            <button onClick={() => setShowRoleInfo((prev) => !prev)} className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-200 transition active:scale-95">{roleLabels[displayRole]}</button>
          </div>
        </div>
        <button onClick={() => setActiveTab("notifications")} className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl ring-1 ring-white/10 transition active:scale-95">
          🔔
          {(criticalCount + readyCount) > 0 && <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-bold border-2 border-slate-950">{criticalCount + readyCount}</span>}
        </button>
      </div>
      {showRoleInfo && (
        <div className="mb-3 rounded-2xl bg-white p-4 text-slate-950 shadow-xl ring-1 ring-white/20">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black">Права роли: {roleLabels[displayRole]}</h3>
            <button onClick={() => setShowRoleInfo(false)} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">Закрыть</button>
          </div>
          <div className="mt-3 grid gap-2 text-xs">
            <div className="flex justify-between rounded-xl bg-slate-50 p-2"><span>Создание заказов</span><b>{permissions.canCreateOrders ? "да" : "нет"}</b></div>
            <div className="flex justify-between rounded-xl bg-slate-50 p-2"><span>Редактирование заказов</span><b>{permissions.canEditOrders ? "да" : "нет"}</b></div>
            <div className="flex justify-between rounded-xl bg-slate-50 p-2"><span>Смена статуса</span><b>{permissions.canChangeStatus ? "да" : "нет"}</b></div>
            <div className="flex justify-between rounded-xl bg-slate-50 p-2"><span>Склад сырья</span><b>{permissions.canManageStock ? "да" : "нет"}</b></div>
          </div>
        </div>
      )}
      <select value={activeTab} onChange={(event) => setActiveTab(event.target.value as Tab)} className="mb-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm font-black text-slate-950 outline-none">
        {tabs.map((tab) => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
      </select>
      <div ref={scrollRef} className="flex gap-2 overflow-x-auto rounded-2xl bg-white/8 p-1 ring-1 ring-white/10 no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            data-tab-id={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`min-w-20 rounded-xl px-2 py-2 text-center text-xs font-semibold transition ${activeTab === tab.id ? "bg-white text-slate-950 shadow" : "text-slate-300"}`}
          >
            <span className="block text-sm">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order, selected, onSelect, onOpen, onStatus, canChangeStatus }: { order: Order; selected: boolean; onSelect: () => void; onOpen?: () => void; onStatus: (status: Status) => void; canChangeStatus: boolean }) {
  const totals = getOrderTotals(order);
  const [showContents, setShowContents] = useState(false);
  const statusStyles: Record<Status, string> = {
    Новый: "bg-slate-100 text-slate-700",
    "В работе": "bg-blue-50 text-blue-700",
    Готов: "bg-emerald-50 text-emerald-700",
    Отправлен: "bg-violet-50 text-violet-700",
  };

  return (
    <button onClick={onSelect} onDoubleClick={onOpen || onSelect} className={`w-full rounded-[1.4rem] bg-white p-3 text-left shadow-sm ring-1 transition ${selected ? "ring-2 ring-slate-950" : "ring-slate-200/80"}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">№ {order.id}</span>
            <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${statusStyles[order.status]}`}>{order.status}</span>
          </div>
          <h3 className="mt-1 text-base font-black leading-tight text-slate-950">{order.client}</h3>
          <p className="text-xs text-slate-500">Оформлен: {order.createdAt} · Отгрузка: {order.shippingDate}</p>
        </div>
        <div
          onClick={(event) => {
            event.stopPropagation();
            setShowContents(true);
          }}
          className="rounded-2xl bg-slate-950 px-3 py-2 text-center text-white min-w-[52px] cursor-pointer active:scale-95 transition-transform"
        >
          <p className="text-lg font-black leading-tight">{totals.quantity}</p>
          <p className="text-[8px] uppercase leading-tight tracking-wide text-slate-300">переносок</p>
          {totals.lids > 0 && (
            <>
              <p className="mt-1 text-sm font-black leading-tight text-emerald-300">{totals.lids}</p>
              <p className="text-[8px] uppercase leading-tight tracking-wide text-emerald-400">крышек</p>
            </>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {statuses.map((status) => (
          <span
            key={status}
            onClick={(event) => {
              event.stopPropagation();
              if (!canChangeStatus) return;
              onStatus(status);
            }}
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${order.status === status ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500"} ${canChangeStatus ? "cursor-pointer" : "opacity-60"}`}
          >
            {status}
          </span>
        ))}
      </div>
      {!canChangeStatus && <p className="mt-2 text-[11px] font-semibold text-slate-400">Статус меняет упаковщик или мастер цеха.</p>}
      {showContents && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4" onClick={(event) => { event.stopPropagation(); setShowContents(false); }}>
          <div className="w-[90%] max-w-sm rounded-[1.5rem] bg-slate-100 p-3 text-left text-slate-950 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-black">Состав заказа № {order.id}</h3>
              <button onClick={() => setShowContents(false)} className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black text-white">Закрыть</button>
            </div>
            <div className="space-y-2">
              <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200/60">
                <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">Переноски</p>
                <div className="space-y-1">
                  {order.items.map((item) => (
                    <div key={`carrier-${item.id}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1 text-xs">
                      <span className="font-black text-slate-950">{item.size}</span>
                      <span className="inline-flex items-center gap-1.5 text-slate-600 max-w-[120px] truncate"><span className="h-2 w-2 shrink-0 rounded-full border border-slate-300" style={{ backgroundColor: colorHex(item.color, item.customColorHex) }} />{colorName(item.color, item.customColor)}</span>
                      <span className="font-black text-slate-950">{item.quantity} шт.</span>
                    </div>
                  ))}
                </div>
              </div>
              {totals.lids > 0 && (
                <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200/60">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">Крышки</p>
                  <div className="space-y-1">
                    {order.items.filter((item) => item.includeLid).map((item) => (
                      <div key={`lid-${item.id}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1 text-xs">
                        <span className="font-black text-slate-950">{item.size}</span>
                        <span className="inline-flex items-center gap-1.5 text-slate-600 max-w-[120px] truncate"><span className="h-2 w-2 shrink-0 rounded-full border border-slate-300" style={{ backgroundColor: colorHex(item.color, item.customColorHex) }} />{colorName(item.color, item.customColor)}</span>
                        <span className="font-black text-slate-950">{item.quantity} шт.</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </button>
  );
}

function OrderEditor({ order, onChange, onAddItem, onRemoveItem, permissions, extraFields, onConfirmCreate, forceShipping }: { order: Order; onChange: (order: Order) => void; onAddItem: () => void; onRemoveItem: (itemId: number) => void; permissions: Permissions; extraFields?: React.ReactNode; onConfirmCreate?: () => void; forceShipping?: ShippingType }) {
  const [showCassetteDetail, setShowCassetteDetail] = useState(false);
  const updateItem = (itemId: number, patch: Partial<OrderItem>) => {
    if (!permissions.canEditOrders) return;
    const merged = { ...patch };
    merged.shipping = forceShipping || order.shipping;
    onChange({ ...order, items: order.items.map((item) => (item.id === itemId ? { ...item, ...merged } : item)) });
  };

  const totals = getOrderTotals(order);
  const readOnly = !permissions.canEditOrders;

  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      <datalist id="supported-color-names">
        {colorNameOptions.map((name) => <option key={name} value={name} />)}
        {pantoneFullOptions.flatMap((code) => [code, `${code}U`, `${code}C`]).map((code) => <option key={code} value={code} />)}
      </datalist>
      <datalist id="supported-pantone-codes">
        {pantoneFullOptions.flatMap((code) => [code, `${code}U`, `${code}C`]).map((code) => <option key={code} value={code} />)}
      </datalist>
      <div className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{readOnly ? "Просмотр заказа" : "Редактирование заказа"}</p>
            <h2 className="text-xl font-black text-slate-950">№ {order.id}</h2>
            {order.packedBy && <p className="mt-1 text-xs font-bold text-emerald-700">Упаковал: {order.packedBy}</p>}
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">автосчет</span>
        </div>
        {readOnly && <p className="mb-4 rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-700">У этой роли нет доступа к изменению состава заказа. Доступна только смена статуса, если это разрешено ролью.</p>}

        <div className="grid gap-3">
          <label className="space-y-1">
            <span className="text-xs font-bold text-slate-500">Клиент</span>
            <input disabled={readOnly} value={order.client} onChange={(event) => onChange({ ...order, client: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-950 disabled:text-slate-400" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold text-slate-500">Менеджер</span>
            <input disabled={readOnly} value={order.manager} onChange={(event) => onChange({ ...order, manager: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-950 disabled:text-slate-400" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs font-bold text-slate-500">Дата оформления</span>
              <input disabled={readOnly} type="date" value={order.createdAt} onChange={(event) => onChange({ ...order, createdAt: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold outline-none focus:border-slate-950 disabled:text-slate-400" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold text-slate-500">Дата отгрузки</span>
              <input disabled={readOnly} type="date" value={order.shippingDate} onChange={(event) => onChange({ ...order, shippingDate: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold outline-none focus:border-slate-950 disabled:text-slate-400" />
            </label>
          </div>
          <label className="space-y-1">
            <span className="text-xs font-bold text-slate-500">Статус</span>
            <select disabled={!permissions.canChangeStatus} value={order.status} onChange={(event) => onChange({ ...order, status: event.target.value as Status })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-950 disabled:text-slate-400">
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold text-slate-500">Отправление</span>
            {forceShipping ? (
              <div className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-black text-slate-500">{forceShipping}</div>
            ) : (
              <select
                disabled={readOnly}
                value={order.shipping}
                onChange={(event) => {
                  const shipping = event.target.value as ShippingType;
                  onChange({ ...order, shipping, items: order.items.map((item) => ({ ...item, shipping })) });
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-950 disabled:text-slate-400"
              >
                {shippingTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
            )}
          </label>
          {extraFields}
        </div>
      </div>

      <details open className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
        <summary className="cursor-pointer text-lg font-black text-slate-950">Позиции заказа</summary>
        <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-black text-slate-500">Состав и цвета</h3>
          {permissions.canEditOrders && <button onClick={onAddItem} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow">+ позиция</button>}
        </div>

        {order.items.map((item, index) => {
          const packaging = getPackaging({ ...item, shipping: order.shipping });
          return (
            <details key={item.id} open={index === 0} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/80">
              <summary className="cursor-pointer text-sm font-black text-slate-950">Позиция {index + 1}: {item.size}, {item.quantity} шт.</summary>
              {permissions.canEditOrders && order.items.length > 1 && <button onClick={() => onRemoveItem(item.id)} className="mt-2 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-600">удалить</button>}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-xs font-bold text-slate-500">Размер</span>
                  <select disabled={readOnly} value={item.size} onChange={(event) => updateItem(item.id, { size: event.target.value as Size })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold outline-none focus:border-slate-950 disabled:text-slate-400">
                    {sizes.map((size) => <option key={size}>{size}</option>)}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-bold text-slate-500">Кол-во</span>
                  <input disabled={readOnly} type="number" min="1" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Math.max(1, Number(event.target.value)) })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold outline-none focus:border-slate-950 disabled:text-slate-400" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-bold text-slate-500">Цвет шнурков</span>
                  <select disabled={readOnly} value={item.cordColor || item.color} onChange={(event) => updateItem(item.id, { cordColor: event.target.value as Color })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold outline-none focus:border-slate-950 disabled:text-slate-400">
                    {colors.map((color) => <option key={color}>{color}</option>)}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-bold text-slate-500">Цвет переноски</span>
                  <select disabled={readOnly} value={item.color} onChange={(event) => updateItem(item.id, { color: event.target.value as Color })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold outline-none focus:border-slate-950 disabled:text-slate-400">
                    {colors.map((color) => <option key={color}>{color}</option>)}
                  </select>
                </label>
              </div>
              {item.color === "Другой" && (
                <div className="mt-3 space-y-1">
                  <span className="text-xs font-bold text-slate-500">Название цвета переноски</span>
                  <div className="flex items-center gap-2">
                    <input disabled={readOnly} list="supported-color-names" value={item.customColor || ""} onChange={(event) => {
                      const customColor = event.target.value;
                      updateItem(item.id, { customColor, customColorHex: resolveColorNameToHex(customColor) || item.customColorHex });
                    }} placeholder="например: лавандовый или 2265U" className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-slate-950 disabled:text-slate-400" />
                    <label className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 border-slate-200" style={{ backgroundColor: colorHex(item.color, item.customColorHex) }}>
                      <input disabled={readOnly} type="color" value={colorHex(item.color, item.customColorHex)} onChange={(event) => updateItem(item.id, { customColorHex: event.target.value })} className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
                    </label>
                  </div>
                </div>
              )}
              {(item.cordColor || item.color) === "Другой" && (
                <div className="mt-3 space-y-1">
                  <span className="text-xs font-bold text-slate-500">Название цвета шнурков</span>
                  <div className="flex items-center gap-2">
                    <input disabled={readOnly} list="supported-color-names" value={item.customCordColor || ""} onChange={(event) => {
                      const customCordColor = event.target.value;
                      updateItem(item.id, { customCordColor, customCordColorHex: resolveColorNameToHex(customCordColor) || item.customCordColorHex });
                    }} placeholder="например: лавандовый или 3522U" className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-slate-950 disabled:text-slate-400" />
                    <label className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 border-slate-200" style={{ backgroundColor: colorHex(item.cordColor || item.color, item.customCordColorHex || item.customColorHex) }}>
                      <input disabled={readOnly} type="color" value={colorHex(item.cordColor || item.color, item.customCordColorHex || item.customColorHex)} onChange={(event) => updateItem(item.id, { customCordColorHex: event.target.value })} className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
                    </label>
                  </div>
                </div>
              )}
              <label className="mt-3 flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-700">
                <span>Добавить крышки к этой позиции</span>
                <input disabled={readOnly} type="checkbox" checked={Boolean(item.includeLid)} onChange={(event) => updateItem(item.id, { includeLid: event.target.checked })} className="h-5 w-5 accent-slate-950 disabled:opacity-50" />
              </label>
              <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                <p className="font-bold text-slate-900">Переноски: {item.quantity} шт. {item.includeLid ? `· Крышки: ${item.quantity} шт.` : "· Без крышек"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 font-bold text-slate-700"><span className="h-4 w-4 rounded-full border border-slate-300" style={{ backgroundColor: colorHex(item.color, item.customColorHex) }} />Переноска: {colorName(item.color, item.customColor)}</span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 font-bold text-slate-700"><span className="h-4 w-4 rounded-full border border-slate-300" style={{ backgroundColor: colorHex(item.cordColor || item.color, item.customCordColorHex || item.customColorHex) }} />Шнурки: {colorName(item.cordColor || item.color, item.customCordColor || item.customColor)}</span>
                </div>
                <p className="mt-1">Шнурки: {packaging.cords} шт. · Пакеты шнурков: {packaging.cordBags}.</p>
              </div>
            </details>
          );
        })}
        </div>
      </details>

      <div className="rounded-[2rem] bg-slate-950 p-4 text-white shadow-lg shadow-slate-300/70">
        {(() => {
          const isOpt = order.shipping === "ОПТ";
          return (
            <>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Итого по заказу</p>
              <div className={`mt-4 grid justify-center gap-3 text-center ${isOpt ? "grid-cols-2" : totals.lids > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
                {isOpt ? (
                  <>
                    <div className="mx-auto min-w-[130px] rounded-[1.5rem] bg-white/10 px-5 py-4">
                      <p className="text-3xl font-black leading-none">{totals.quantity}</p>
                      <p className="mt-1 text-xs font-bold text-slate-300">переносок</p>
                    </div>
                    <div onClick={() => setShowCassetteDetail(true)} className="mx-auto min-w-[130px] cursor-pointer rounded-[1.5rem] bg-white/10 px-5 py-4 transition-transform active:scale-95">
                      <p className="text-3xl font-black leading-none">{totals.cassettes}</p>
                      <p className="mt-1 text-xs font-bold text-slate-300">касет</p>
                      <p className="mt-1 text-[11px] font-bold text-emerald-300">подробнее</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mx-auto min-w-[140px] rounded-[1.5rem] bg-white/10 px-5 py-4">
                      <p className="text-3xl font-black leading-none">{totals.quantity}</p>
                      <p className="mt-1 text-xs font-bold text-slate-300">переносок</p>
                      <p className="mt-1 text-[11px] font-bold text-emerald-300">{totals.bundles} свёртков</p>
                    </div>
                    {totals.lids > 0 && (
                      <div className="mx-auto min-w-[140px] rounded-[1.5rem] bg-white/10 px-5 py-4">
                        <p className="text-3xl font-black leading-none">{totals.lids}</p>
                        <p className="mt-1 text-xs font-bold text-slate-300">крышек</p>
                        <p className="mt-1 text-[11px] font-bold text-emerald-300">{totals.lidBundles} свёртков</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          );
        })()}
      </div>

      <label className="block rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
        <span className="text-xs font-bold text-slate-500">Комментарий</span>
        <textarea disabled={readOnly} value={order.note || ""} onChange={(event) => onChange({ ...order, note: event.target.value })} rows={3} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-950 disabled:text-slate-400" />
      </label>
      {onConfirmCreate && (
        <button onClick={onConfirmCreate} className="w-full rounded-[2rem] bg-emerald-500 px-4 py-4 text-base font-black text-white shadow-lg shadow-emerald-200 active:scale-[0.98] transition-transform">
          ✓ Создать заказ
        </button>
      )}
      {showCassetteDetail && order.shipping === "ОПТ" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4" onClick={() => setShowCassetteDetail(false)}>
          <div className="w-[90%] max-w-sm rounded-[1.5rem] bg-white p-4 text-left text-slate-950 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-black">Касеты</h3>
              <button onClick={() => setShowCassetteDetail(false)} className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black text-white">Закрыть</button>
            </div>
            <div className="space-y-2">
              {order.items.map((item) => {
                const rs = item.readySteps || {};
                const entries: { label: string; step: number; count: number }[] = [];
                if (rs.step20 && rs.step20 > 0) entries.push({ label: `${item.size} · +20`, step: 20, count: rs.step20 });
                if (rs.step40 && rs.step40 > 0) entries.push({ label: `${item.size} · +40`, step: 40, count: rs.step40 });
                if (rs.step50 && rs.step50 > 0) entries.push({ label: `${item.size} · +50`, step: 50, count: rs.step50 });
                if (entries.length === 0) {
                  return (
                    <div key={item.id} className="rounded-xl bg-slate-50 px-3 py-2 text-xs ring-1 ring-slate-200/70">
                      <span className="text-slate-400">Позиция {item.size}: ещё не упакована</span>
                    </div>
                  );
                }
                return entries.map((entry, eIdx) => (
                  <div key={`${item.id}-${eIdx}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs ring-1 ring-slate-200/70">
                    <span className="font-black text-slate-900 truncate max-w-[60%]">{entry.label} · {item.includeLid ? "с крышками" : "без крышек"}</span>
                    <span className="rounded-full bg-slate-950 px-2.5 py-1 text-white font-black">×{entry.count}</span>
                  </div>
                ));
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PackerReadyEditor({ order, user, onSave, onComplete }: { order: Order; user: User; onSave: (order: Order) => void; onComplete: (order: Order) => void }) {
  const isOpt = order.shipping === "ОПТ";
  const defaultStep = 50;

  const updateReady = (itemId: number, field: "readyQuantity" | "readyLidsQuantity", delta: number, stepSize?: number) => {
    const nextItems = order.items.map((item) => {
      if (item.id !== itemId) return item;
      const max = item.quantity;
      let nextReadySteps = item.readySteps ? { ...item.readySteps } : {};
      if (isOpt && field === "readyQuantity" && delta > 0 && stepSize) {
        const key = stepSize === 20 ? "step20" : stepSize === 40 ? "step40" : "step50";
        nextReadySteps = { ...nextReadySteps, [key]: (nextReadySteps[key] || 0) + 1 };
      }
      if (isOpt && item.includeLid && field === "readyQuantity") {
        const currentC = item.readyQuantity || 0;
        const currentL = item.readyLidsQuantity || 0;
        return { ...item, readyQuantity: Math.max(0, Math.min(max, currentC + delta)), readyLidsQuantity: Math.max(0, Math.min(max, currentL + delta)), readySteps: nextReadySteps };
      }
      const current = item[field] || 0;
      const next = Math.max(0, Math.min(max, current + delta));
      return { ...item, [field]: next, readySteps: nextReadySteps };
    });

    const allDone = nextItems.every((item) => {
      const carriersReady = (item.readyQuantity || 0) >= item.quantity;
      const lidsReady = !item.includeLid || (item.readyLidsQuantity || 0) >= item.quantity;
      return carriersReady && lidsReady;
    });

    const anyInProgress = nextItems.some((item) => {
      const partialCarriers = (item.readyQuantity || 0) > 0 && (item.readyQuantity || 0) < item.quantity;
      const partialLids = item.includeLid && (item.readyLidsQuantity || 0) > 0 && (item.readyLidsQuantity || 0) < item.quantity;
      return partialCarriers || partialLids;
    });

    const newStatus: Status = allDone ? "Готов" : anyInProgress ? "В работе" : order.status;
    const nextOrder = {
      ...order,
      items: nextItems,
      status: newStatus,
      packedBy: newStatus === "Готов" ? user.name : order.packedBy,
    };

    if (allDone) onComplete(nextOrder);
    else onSave(nextOrder);
  };

  const resetItem = (itemId: number) => {
    const nextItems = order.items.map((item) => {
      if (item.id !== itemId) return item;
      return { ...item, readyQuantity: 0, readyLidsQuantity: 0, readySteps: {} };
    });
    const anyStillInProgress = nextItems.some((it) => (it.readyQuantity || 0) > 0 || (it.includeLid && (it.readyLidsQuantity || 0) > 0));
    const nextOrder = { ...order, items: nextItems, status: anyStillInProgress ? "В работе" as Status : "Новый" as Status, packedBy: undefined };
    onSave(nextOrder);
  };

  return (
    <div className="space-y-4 px-4 pb-8 pt-4">
      <div className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Готовность позиций</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">Заказ № {order.id}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {isOpt ? "ОПТ: шаги +20, +40, +50. " : "Шаг — 50 шт. "}
          Если остаток меньше шага — кнопка показывает остаток. Можно откатить готовность позиции.
        </p>
      </div>

      {order.items.map((item, index) => {
        const readyCarriers = item.readyQuantity || 0;
        const readyLids = item.readyLidsQuantity || 0;
        const carriersDone = readyCarriers >= item.quantity;
        const lidsDone = !item.includeLid || readyLids >= item.quantity;
        const allDone = carriersDone && lidsDone;

        const carrierLeft = item.quantity - readyCarriers;
        const lidLeft = item.quantity - readyLids;

        const smartLabel = (left: number, s: number) => left > 0 && left < s ? `+${left}` : `+${s}`;
        const smartDelta = (left: number, s: number) => left > 0 && left < s ? left : s;

        const addLidLabel = lidLeft > 0 && lidLeft < 100 ? `+${lidLeft}` : "+100";
        const addLidDelta = lidLeft > 0 && lidLeft < 100 ? lidLeft : 100;

        return (
          <div key={item.id} className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-950">Позиция {index + 1}: {item.size}</h3>
                <p className="text-xs text-slate-500">{colorName(item.color, item.customColor)} · всего {item.quantity} шт.</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${allDone ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {allDone ? "Готово" : "В работе"}
              </span>
            </div>

            <div className="space-y-3">
              {isOpt && item.includeLid ? (
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">Переноски + крышки</span>
                    <span className={`text-sm font-black ${carriersDone && lidsDone ? "text-emerald-700" : "text-slate-950"}`}>{readyCarriers} / {item.quantity}</span>
                  </div>
                  {!(carriersDone && lidsDone) && (
                    <div className="mt-2 grid grid-cols-4 gap-1.5">
                      <button disabled={readyCarriers === 0} onClick={() => updateReady(item.id, "readyQuantity", -20)} className="rounded-xl bg-white px-2 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200/70 disabled:opacity-40">-20</button>
                      <button onClick={() => updateReady(item.id, "readyQuantity", smartDelta(carrierLeft, 20), 20)} className="rounded-xl bg-slate-950 px-2 py-2 text-xs font-black text-white">{smartLabel(carrierLeft, 20)}</button>
                      <button onClick={() => updateReady(item.id, "readyQuantity", smartDelta(carrierLeft, 40), 40)} className="rounded-xl bg-slate-950 px-2 py-2 text-xs font-black text-white">{smartLabel(carrierLeft, 40)}</button>
                      <button onClick={() => updateReady(item.id, "readyQuantity", smartDelta(carrierLeft, 50), 50)} className="rounded-xl bg-slate-950 px-2 py-2 text-xs font-black text-white">{smartLabel(carrierLeft, 50)}</button>
                    </div>
                  )}
                </div>
              ) : isOpt ? (
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">Переноски</span>
                    <span className={`text-sm font-black ${carriersDone ? "text-emerald-700" : "text-slate-950"}`}>{readyCarriers} / {item.quantity}</span>
                  </div>
                  {!carriersDone && (
                    <div className="mt-2 grid grid-cols-4 gap-1.5">
                      <button disabled={readyCarriers === 0} onClick={() => updateReady(item.id, "readyQuantity", -20)} className="rounded-xl bg-white px-2 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200/70 disabled:opacity-40">-20</button>
                      <button onClick={() => updateReady(item.id, "readyQuantity", smartDelta(carrierLeft, 20), 20)} className="rounded-xl bg-slate-950 px-2 py-2 text-xs font-black text-white">{smartLabel(carrierLeft, 20)}</button>
                      <button onClick={() => updateReady(item.id, "readyQuantity", smartDelta(carrierLeft, 40), 40)} className="rounded-xl bg-slate-950 px-2 py-2 text-xs font-black text-white">{smartLabel(carrierLeft, 40)}</button>
                      <button onClick={() => updateReady(item.id, "readyQuantity", smartDelta(carrierLeft, 50), 50)} className="rounded-xl bg-slate-950 px-2 py-2 text-xs font-black text-white">{smartLabel(carrierLeft, 50)}</button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700">Переноски</span>
                      <span className={`text-sm font-black ${carriersDone ? "text-emerald-700" : "text-slate-950"}`}>{readyCarriers} / {item.quantity}</span>
                    </div>
                    {!carriersDone && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button disabled={readyCarriers === 0} onClick={() => updateReady(item.id, "readyQuantity", -defaultStep)} className="rounded-xl bg-white px-3 py-2 text-sm font-black text-slate-700 ring-1 ring-slate-200/70 disabled:opacity-40">-{defaultStep}</button>
                        <button onClick={() => updateReady(item.id, "readyQuantity", smartDelta(carrierLeft, defaultStep))} className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white">{smartLabel(carrierLeft, defaultStep)}</button>
                      </div>
                    )}
                  </div>

                  {item.includeLid && (
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-700">Крышки</span>
                        <span className={`text-sm font-black ${lidsDone ? "text-emerald-700" : "text-slate-950"}`}>{readyLids} / {item.quantity}</span>
                      </div>
                      {!lidsDone && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button disabled={readyLids === 0} onClick={() => updateReady(item.id, "readyLidsQuantity", -100)} className="rounded-xl bg-white px-3 py-2 text-sm font-black text-slate-700 ring-1 ring-slate-200/70 disabled:opacity-40">-100</button>
                          <button onClick={() => updateReady(item.id, "readyLidsQuantity", addLidDelta)} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-black text-white">{addLidLabel}</button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mt-3 rounded-xl bg-rose-50 p-3">
              <button onClick={() => resetItem(item.id)} disabled={readyCarriers === 0 && readyLids === 0} className="w-full rounded-xl bg-white px-3 py-2 text-sm font-black text-rose-700 shadow-sm ring-1 ring-rose-100 disabled:opacity-30">Откатить позицию</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OrdersScreen({ orders, filterType, selectedOrderId, setSelectedOrderId, setOrders, stock, setStock, addMaterialAlert, user, permissions }: { orders: Order[]; filterType: "retail" | "wholesale"; selectedOrderId: number | null; setSelectedOrderId: (id: number | null) => void; setOrders: React.Dispatch<React.SetStateAction<Order[]>>; stock: StockItem[]; setStock: React.Dispatch<React.SetStateAction<StockItem[]>>; addMaterialAlert: (order: Order, shortages: string[]) => void; user: User; permissions: Permissions }) {
  const isWholesale = filterType === "wholesale";
  const matchingOrders = orders.filter((order) => isWholesale ? order.isWholesale : !order.isWholesale);
  const activeOrders = matchingOrders.filter((order) => !order.archived);
  const archivedOrders = matchingOrders.filter((order) => order.archived);
  const workOrders = activeOrders.filter((order) => order.status !== "Готов");
  const readyOrders = activeOrders.filter((order) => order.status === "Готов");
  const [highlightedOrderId, setHighlightedOrderId] = useState<number | null>(null);
  const [orderOpenMode, setOrderOpenMode] = useState<"edit" | "pack" | null>(null);
  const selectedOrder = selectedOrderId ? activeOrders.find((order) => order.id === selectedOrderId) : undefined;

  const updateOrder = (updatedOrder: Order) => {
    setOrders((prev) => prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));
  };

  const updateStatus = (order: Order, status: Status) => {
    if (!permissions.canChangeStatus) return;
    const shouldApplyStock = (status === "Готов" || status === "Отправлен") && !order.stockApplied;
    if (shouldApplyStock) {
      const result = applyStockForOrder(order, stock);
      if (result.shortages.length > 0) {
        addMaterialAlert(order, result.shortages);
        return;
      }
      setStock(result.nextStock);
      updateOrder({ ...order, status, stockApplied: true, packedBy: status === "Готов" && user.role === "packer" ? user.name : order.packedBy, archived: status === "Отправлен" ? true : order.archived });
      return;
    }
    updateOrder({ ...order, status, packedBy: status === "Готов" && user.role === "packer" ? user.name : order.packedBy, archived: status === "Отправлен" ? true : order.archived });
  };

  const updateOrderWithStock = (updatedOrder: Order) => {
    const previousOrder = orders.find((order) => order.id === updatedOrder.id);
    const shouldApplyStock = (updatedOrder.status === "Готов" || updatedOrder.status === "Отправлен") && !previousOrder?.stockApplied;
    if (shouldApplyStock) {
      const result = applyStockForOrder(updatedOrder, stock);
      if (result.shortages.length > 0) {
        addMaterialAlert(updatedOrder, result.shortages);
        return;
      }
      setStock(result.nextStock);
      updateOrder({ ...updatedOrder, stockApplied: true, packedBy: updatedOrder.status === "Готов" && user.role === "packer" ? user.name : updatedOrder.packedBy, archived: updatedOrder.status === "Отправлен" ? true : updatedOrder.archived });
      return;
    }
    updateOrder({ ...updatedOrder, packedBy: updatedOrder.status === "Готов" && user.role === "packer" ? user.name : updatedOrder.packedBy, archived: updatedOrder.status === "Отправлен" ? true : updatedOrder.archived });
  };

  const [draftOrder, setDraftOrder] = useState<Order | null>(null);

  const openNewOrderForm = () => {
    if (!permissions.canCreateOrders) return;
    const order = newOrder(user.name);
    order.isWholesale = isWholesale;
    if (isWholesale) {
      order.client = "Новый оптовый клиент";
      order.shipping = "ОПТ";
      order.items[0].shipping = "ОПТ";
      order.items[0].quantity = 40;
    } else {
      order.client = "Новый розничный клиент";
      order.shipping = "Машина";
      order.items = order.items.map((item) => ({ ...item, shipping: "Машина" }));
    }
    setDraftOrder(order);
    setSelectedOrderId(null);
  };

  const confirmDraftOrder = () => {
    if (!draftOrder) return;
    setOrders((prev) => [draftOrder, ...prev]);
    setSelectedOrderId(draftOrder.id);
    setDraftOrder(null);
  };

  const cancelDraftOrder = () => setDraftOrder(null);

  const deleteOrder = (orderId: number) => {
    setOrders((prev) => prev.filter((order) => order.id !== orderId));
  };

  const archiveOrder = (orderId: number) => {
    setOrders((prev) => prev.map((order) => order.id === orderId ? { ...order, archived: true } : order));
  };

  const restoreOrder = (orderId: number) => {
    setOrders((prev) => prev.map((order) => order.id === orderId ? { ...order, archived: false, status: order.status === "Отправлен" ? "Готов" : order.status } : order));
    setSelectedOrderId(orderId);
  };

  return (
    <>
      <div className="px-4 pt-5">
        <div className="mb-3 rounded-[2rem] bg-slate-950 p-4 text-white shadow-lg shadow-slate-300/60">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-300">Активные заказы</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <p className="text-4xl font-black">{workOrders.length}</p>
              <p className="text-sm text-slate-300">в работе</p>
              <p className="mt-1 text-xs text-emerald-200">Готовы к отправке: {readyOrders.length}</p>
            </div>
            {permissions.canCreateOrders && <button onClick={openNewOrderForm} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-black text-white">Создать заказ</button>}
          </div>
        </div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">Заказы</h2>
            <p className="text-sm text-slate-500">Только активные заявки</p>
          </div>
          <RoleBadge role={user.role} />
        </div>
        <div className="space-y-3">
          {activeOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              selected={order.id === highlightedOrderId}
              onSelect={() => setHighlightedOrderId(order.id === highlightedOrderId ? null : order.id)}
              onOpen={() => {
                setSelectedOrderId(order.id);
                setOrderOpenMode(
                  permissions.canEditOrders && permissions.canChangeStatus ? null :
                  !permissions.canEditOrders && permissions.canChangeStatus ? "pack" : "edit"
                );
              }}
              onStatus={(status) => updateStatus(order, status)}
              canChangeStatus={permissions.canChangeStatus}
            />
          ))}
          {activeOrders.length === 0 && <div className="w-full rounded-3xl bg-white p-4 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200/70">Активных заказов нет. Создайте новый заказ или восстановите из архива.</div>}
        </div>
      </div>
      {draftOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70" onClick={cancelDraftOrder}>
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-[2rem] bg-slate-100" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-[2rem] bg-slate-100 px-4 pb-2 pt-4">
              <h2 className="text-lg font-black text-slate-950">Новый заказ</h2>
              <button onClick={cancelDraftOrder} className="rounded-full bg-slate-200 px-3 py-2 text-xs font-black text-slate-700">Отмена</button>
            </div>
            <OrderEditor
              order={draftOrder}
              onChange={setDraftOrder}
              onAddItem={() => setDraftOrder((prev) => prev ? { ...prev, items: [...prev.items, emptyOrderItem(Date.now())] } : prev)}
              onRemoveItem={(itemId) => setDraftOrder((prev) => prev ? { ...prev, items: prev.items.filter((item) => item.id !== itemId) } : prev)}
              permissions={permissions}
              onConfirmCreate={confirmDraftOrder}
              forceShipping={isWholesale ? "ОПТ" : undefined}
            />
          </div>
        </div>
      )}
      {selectedOrder && !draftOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70" onClick={() => { setSelectedOrderId(null); setOrderOpenMode(null); }}>
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-[2rem] bg-slate-100" onClick={(event) => event.stopPropagation()}>
            {!orderOpenMode ? (
              <div className="px-4 py-6 text-center">
                <h2 className="text-lg font-black text-slate-950 mb-1">Заказ № {selectedOrder.id}</h2>
                <p className="text-sm text-slate-500 mb-5">Выберите действие:</p>
                <div className="space-y-3">
                  <button onClick={() => setOrderOpenMode("edit")} className="w-full rounded-2xl bg-slate-950 px-4 py-4 text-sm font-black text-white shadow-lg">✏️ Редактирование</button>
                  <button onClick={() => setOrderOpenMode("pack")} className="w-full rounded-2xl bg-slate-950 px-4 py-4 text-sm font-black text-white shadow-lg">📦 Упаковка</button>
                  <div className="flex gap-2">
                    <button onClick={() => archiveOrder(selectedOrder.id)} className="flex-1 rounded-2xl bg-slate-200 px-4 py-3 text-sm font-black text-slate-700">В архив</button>
                    {permissions.canEditOrders && <button onClick={() => deleteOrder(selectedOrder.id)} className="flex-1 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">Удалить</button>}
                  </div>
                  <button onClick={() => { setSelectedOrderId(null); setOrderOpenMode(null); }} className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-sm">Закрыть</button>
                </div>
              </div>
            ) : (
              <>
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-[2rem] bg-slate-100 px-4 pb-2 pt-4">
              <h2 className="text-lg font-black text-slate-950">Заказ № {selectedOrder.id} {orderOpenMode === "pack" ? "· Упаковка" : "· Редактирование"}</h2>
              <div className="flex gap-2">
                {orderOpenMode === "edit" && <button onClick={() => archiveOrder(selectedOrder.id)} className="rounded-full bg-slate-200 px-3 py-2 text-xs font-black text-slate-700">В архив</button>}
                {orderOpenMode === "edit" && permissions.canEditOrders && <button onClick={() => deleteOrder(selectedOrder.id)} className="rounded-full bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">Удалить</button>}
                <button onClick={() => { setSelectedOrderId(null); setOrderOpenMode(null); }} className="rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white">Закрыть</button>
              </div>
            </div>
            {orderOpenMode === "pack" ? (
              <PackerReadyEditor
                order={selectedOrder}
                user={user}
                onSave={updateOrder}
                onComplete={updateOrderWithStock}
              />
            ) : (
              <OrderEditor
                order={selectedOrder}
                onChange={(updatedOrder) => {
                  if (!permissions.canEditOrders && updatedOrder.status === selectedOrder.status) return;
                  updateOrderWithStock(updatedOrder);
                }}
                onAddItem={() => updateOrder({ ...selectedOrder, items: [...selectedOrder.items, emptyOrderItem(Date.now())] })}
                onRemoveItem={(itemId) => updateOrder({ ...selectedOrder, items: selectedOrder.items.filter((item) => item.id !== itemId) })}
                permissions={permissions}
                forceShipping={isWholesale ? "ОПТ" : undefined}
              />
            )}
            </>
            )}
          </div>
        </div>
      )}
      <details className="mt-4 px-4 pb-28">
        <summary className="cursor-pointer rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-200/70">Архив заказов: {archivedOrders.length}</summary>
        <div className="mt-3 space-y-2">
          {archivedOrders.map((order) => <div key={order.id} className="rounded-2xl bg-white p-3 text-sm shadow-sm ring-1 ring-slate-200/70"><b>№ {order.id}</b> {order.client}<button onClick={() => restoreOrder(order.id)} className="ml-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">Вернуть</button></div>)}
        </div>
      </details>
    </>
  );
}

function PrintScreen({ orders, selectedOrderId, setSelectedOrderId, setOrders, stock, setStock, addMaterialAlert, user, permissions }: { orders: PrintOrder[]; selectedOrderId: number | null; setSelectedOrderId: (id: number | null) => void; setOrders: React.Dispatch<React.SetStateAction<PrintOrder[]>>; stock: StockItem[]; setStock: React.Dispatch<React.SetStateAction<StockItem[]>>; addMaterialAlert: (order: Order, shortages: string[]) => void; user: User; permissions: Permissions }) {
  const [fullLayout, setFullLayout] = useState<string | null>(null);
  const activeOrders = orders.filter((order) => !order.archived);
  const archivedOrders = orders.filter((order) => order.archived);
  const workOrders = activeOrders.filter((order) => order.status !== "Готов");
  const readyOrders = activeOrders.filter((order) => order.status === "Готов");
  const [highlightedOrderId, setHighlightedOrderId] = useState<number | null>(null);
  const [orderOpenMode, setOrderOpenMode] = useState<"edit" | "pack" | null>(null);
  const selectedOrder = selectedOrderId ? activeOrders.find((order) => order.id === selectedOrderId) : undefined;
  const clients = Array.from(new Set(orders.map((order) => order.client)));

  const updateOrder = (updatedOrder: PrintOrder) => {
    setOrders((prev) => prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));
  };

  const [draftOrder, setDraftOrder] = useState<PrintOrder | null>(null);

  const openNewOrderForm = () => {
    if (!permissions.canCreateOrders) return;
    const order = newPrintOrder(user.name);
    setDraftOrder(order);
    setSelectedOrderId(null);
  };

  const confirmDraftOrder = () => {
    if (!draftOrder) return;
    setOrders((prev) => [draftOrder, ...prev]);
    setSelectedOrderId(draftOrder.id);
    setDraftOrder(null);
  };

  const cancelDraftOrder = () => setDraftOrder(null);

  const handleLayout = (file: File) => {
    if (!selectedOrder || !permissions.canEditOrders) return;
    const reader = new FileReader();
    reader.onload = () => updateOrder({
      ...selectedOrder,
      layoutFileNames: [...(selectedOrder.layoutFileNames || []), file.name],
      layoutPreviews: [...(selectedOrder.layoutPreviews || []), String(reader.result || "")]
    });
    reader.readAsDataURL(file);
  };

  const updateStatus = (order: PrintOrder, status: Status) => {
    if (!permissions.canChangeStatus) return;
    const shouldApplyStock = (status === "Готов" || status === "Отправлен") && !order.stockApplied;
    if (shouldApplyStock) {
      const result = applyStockForOrder(order, stock);
      if (result.shortages.length > 0) {
        addMaterialAlert(order, result.shortages);
        return;
      }
      setStock(result.nextStock);
      updateOrder({ ...order, status, stockApplied: true, packedBy: status === "Готов" && user.role === "packer" ? user.name : order.packedBy, archived: status === "Отправлен" });
      return;
    }
    updateOrder({ ...order, status, packedBy: status === "Готов" && user.role === "packer" ? user.name : order.packedBy, archived: status === "Отправлен" });
  };

  const updatePrintOrderWithStock = (updatedOrder: PrintOrder) => {
    const previousOrder = orders.find((order) => order.id === updatedOrder.id);
    const shouldApplyStock = (updatedOrder.status === "Готов" || updatedOrder.status === "Отправлен") && !previousOrder?.stockApplied;
    if (shouldApplyStock) {
      const result = applyStockForOrder(updatedOrder, stock);
      if (result.shortages.length > 0) {
        addMaterialAlert(updatedOrder, result.shortages);
        return;
      }
      setStock(result.nextStock);
      updateOrder({ ...updatedOrder, stockApplied: true, packedBy: updatedOrder.status === "Готов" && user.role === "packer" ? user.name : updatedOrder.packedBy, archived: updatedOrder.status === "Отправлен" });
      return;
    }
    updateOrder({ ...updatedOrder, packedBy: updatedOrder.status === "Готов" && user.role === "packer" ? user.name : updatedOrder.packedBy, archived: updatedOrder.status === "Отправлен" ? true : updatedOrder.archived });
  };

  const deleteOrder = (orderId: number) => setOrders((prev) => prev.filter((order) => order.id !== orderId));
  const archiveOrder = (orderId: number) => setOrders((prev) => prev.map((order) => order.id === orderId ? { ...order, archived: true } : order));
  const restoreOrder = (orderId: number) => {
    setOrders((prev) => prev.map((order) => order.id === orderId ? { ...order, archived: false, status: order.status === "Отправлен" ? "Готов" : order.status } : order));
    setSelectedOrderId(orderId);
  };

  return (
    <>
      <div className="px-4 pt-5">
        <div className="mb-3 rounded-[2rem] bg-slate-950 p-4 text-white shadow-lg shadow-slate-300/60">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-300">Типография</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <p className="text-4xl font-black">{workOrders.length}</p>
              <p className="text-sm text-slate-300">в работе</p>
              <p className="mt-1 text-xs text-emerald-200">Готовы к отправке: {readyOrders.length}</p>
            </div>
            {permissions.canCreateOrders && <button onClick={openNewOrderForm} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-black text-white">Создать заказ</button>}
          </div>
        </div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">Типография</h2>
            <p className="text-sm text-slate-500">Макеты, клиенты и исполнитель</p>
          </div>
        </div>
        <div className="space-y-3">
          {activeOrders.map((order) => (
            <div key={order.id}>
              <OrderCard order={order} selected={order.id === highlightedOrderId} onSelect={() => setHighlightedOrderId(order.id === highlightedOrderId ? null : order.id)} onOpen={() => {
                setSelectedOrderId(order.id);
                setOrderOpenMode(
                  permissions.canEditOrders && permissions.canChangeStatus ? null :
                  !permissions.canEditOrders && permissions.canChangeStatus ? "pack" : "edit"
                );
              }} onStatus={(status) => updateStatus(order, status)} canChangeStatus={permissions.canChangeStatus} />
              <p className="mt-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm">Исполнитель: {order.printOperator || "Максим"}</p>
            </div>
          ))}
          {activeOrders.length === 0 && <div className="w-full rounded-3xl bg-white p-4 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200/70">Активных заказов типографии нет.</div>}
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-200/70">База клиентов: {clients.length}</summary>
          <div className="mt-2 space-y-2">
            {clients.map((client) => {
              const layouts = orders.filter((order) => order.client === client && (order.layoutPreviews?.length || 0) > 0);
              return (
                <div key={client} className="rounded-xl bg-white p-3 text-xs ring-1 ring-slate-200/60 shadow-sm">
                  <p className="font-black text-slate-950">{client}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Прикрепленных макетов: {layouts.reduce((sum, order) => sum + (order.layoutPreviews?.length || 0), 0)}</p>
                  <div className="mt-2 flex gap-1 overflow-x-auto">
                    {layouts.flatMap((order) =>
                      (order.layoutPreviews || []).map((preview, pIndex) => (
                        <button
                          key={`${order.id}-${pIndex}`}
                          onClick={() => setFullLayout(preview)}
                          className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200"
                        >
                          <img src={preview} className="h-full w-full object-cover" alt={`Макет ${pIndex}`} />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      </div>
      {draftOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70" onClick={cancelDraftOrder}>
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-[2rem] bg-slate-100" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-[2rem] bg-slate-100 px-4 pb-2 pt-4">
              <h2 className="text-lg font-black text-slate-950">Новый заказ типографии</h2>
              <button onClick={cancelDraftOrder} className="rounded-full bg-slate-200 px-3 py-2 text-xs font-black text-slate-700">Отмена</button>
            </div>
            <OrderEditor
              order={draftOrder}
              onChange={(updatedOrder) => setDraftOrder({ ...draftOrder, ...updatedOrder })}
              onAddItem={() => setDraftOrder((prev) => prev ? { ...prev, items: [...prev.items, emptyOrderItem(Date.now())] } : prev)}
              onRemoveItem={(itemId) => setDraftOrder((prev) => prev ? { ...prev, items: prev.items.filter((item) => item.id !== itemId) } : prev)}
              permissions={permissions}
              onConfirmCreate={confirmDraftOrder}
            />
          </div>
        </div>
      )}
      {selectedOrder && !draftOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70" onClick={() => { setSelectedOrderId(null); setOrderOpenMode(null); }}>
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-[2rem] bg-slate-100" onClick={(event) => event.stopPropagation()}>
            {!orderOpenMode ? (
              <div className="px-4 py-6 text-center">
                <h2 className="text-lg font-black text-slate-950 mb-1">Типография № {selectedOrder.id}</h2>
                <p className="text-sm text-slate-500 mb-5">Выберите действие:</p>
                <div className="space-y-3">
                  <button onClick={() => setOrderOpenMode("edit")} className="w-full rounded-2xl bg-slate-950 px-4 py-4 text-sm font-black text-white shadow-lg">✏️ Редактирование</button>
                  <button onClick={() => setOrderOpenMode("pack")} className="w-full rounded-2xl bg-slate-950 px-4 py-4 text-sm font-black text-white shadow-lg">📦 Упаковка</button>
                  <div className="flex gap-2">
                    <button onClick={() => archiveOrder(selectedOrder.id)} className="flex-1 rounded-2xl bg-slate-200 px-4 py-3 text-sm font-black text-slate-700">В архив</button>
                    {permissions.canEditOrders && <button onClick={() => deleteOrder(selectedOrder.id)} className="flex-1 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">Удалить</button>}
                  </div>
                  <button onClick={() => { setSelectedOrderId(null); setOrderOpenMode(null); }} className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-sm">Закрыть</button>
                </div>
              </div>
            ) : (
              <>
                <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-[2rem] bg-slate-100 px-4 pb-2 pt-4">
                  <h2 className="text-lg font-black text-slate-950">Типография № {selectedOrder.id} {orderOpenMode === "pack" ? "· Упаковка" : "· Редактирование"}</h2>
                  <div className="flex gap-2">
                    {orderOpenMode === "edit" && <button onClick={() => archiveOrder(selectedOrder.id)} className="rounded-full bg-slate-200 px-3 py-2 text-xs font-black text-slate-700">В архив</button>}
                    {orderOpenMode === "edit" && permissions.canEditOrders && <button onClick={() => deleteOrder(selectedOrder.id)} className="rounded-full bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">Удалить</button>}
                    <button onClick={() => { setSelectedOrderId(null); setOrderOpenMode(null); }} className="rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white">Закрыть</button>
                  </div>
                </div>
                {orderOpenMode === "pack" ? (
                  <PackerReadyEditor order={selectedOrder} user={user} onSave={updateOrder} onComplete={updatePrintOrderWithStock} />
                 ) : (
                   <>
                     <div className="px-4 pt-2">
                       <div className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
                         <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Макеты нанесения ({(selectedOrder.layoutPreviews?.length || 0)} шт.)</p>
                         <div className="flex gap-2 overflow-x-auto py-1">
                           {(selectedOrder.layoutPreviews || []).map((preview, pIndex) => (
                             <div key={pIndex} className="relative h-16 w-16 shrink-0">
                               <img src={preview} onClick={() => setFullLayout(preview)} className="h-full w-full rounded-2xl object-cover cursor-pointer border border-slate-200" alt={`Макет ${pIndex}`} />
                               {permissions.canEditOrders && (
                                 <button onClick={() => updateOrder({ ...selectedOrder, layoutFileNames: selectedOrder.layoutFileNames?.filter((_, idx) => idx !== pIndex), layoutPreviews: selectedOrder.layoutPreviews?.filter((_, idx) => idx !== pIndex) })} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white shadow">×</button>
                               )}
                             </div>
                           ))}
                           {(selectedOrder.layoutPreviews?.length || 0) === 0 && <div className="flex h-12 w-full items-center justify-center rounded-2xl bg-slate-50 text-xs font-bold text-slate-400 border border-dashed border-slate-200">Фото не прикреплены</div>}
                         </div>
                         <div className="mt-3 grid grid-cols-2 gap-3">
                           <label className="space-y-1">
                             <span className="text-xs font-bold text-slate-500">Исполнитель</span>
                             <select disabled={!permissions.canEditOrders} value={selectedOrder.printOperator || "Максим"} onChange={(event) => updateOrder({ ...selectedOrder, printOperator: event.target.value as PrintOperator })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-black outline-none focus:border-slate-950 disabled:text-slate-400">
                               {printOperators.map((operator) => <option key={operator}>{operator}</option>)}
                             </select>
                           </label>
                           {permissions.canEditOrders && (
                             <label className="flex flex-col justify-end">
                               <span className="text-xs font-bold text-slate-500 mb-1 opacity-0">·</span>
                               <label className="block rounded-2xl bg-slate-950 px-3 py-2.5 text-center text-sm font-black text-white cursor-pointer">
                                 + Макет
                                 <input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && handleLayout(event.target.files[0])} className="hidden" />
                               </label>
                             </label>
                           )}
                         </div>
                       </div>
                     </div>
                     <OrderEditor
                       order={selectedOrder}
                       onChange={(updatedOrder) => updatePrintOrderWithStock({ ...selectedOrder, ...updatedOrder })}
                       onAddItem={() => updateOrder({ ...selectedOrder, items: [...selectedOrder.items, emptyOrderItem(Date.now())] })}
                       onRemoveItem={(itemId) => updateOrder({ ...selectedOrder, items: selectedOrder.items.filter((item) => item.id !== itemId) })}
                       permissions={permissions}
                       extraFields={(
                         <>
                           <label className="space-y-1">
                             <span className="text-xs font-bold text-slate-500">Дата нанесения</span>
                             <input disabled={!permissions.canEditOrders} type="date" value={selectedOrder.printDate || today} onChange={(event) => updateOrder({ ...selectedOrder, printDate: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black outline-none focus:border-slate-950 disabled:text-slate-400" />
                           </label>
                           <div className="grid grid-cols-2 gap-3">
                             <label className="space-y-1">
                               <span className="text-xs font-bold text-slate-500">Цвет нанесения</span>
                               <select disabled={!permissions.canEditOrders} value={selectedOrder.printColor || "Белый"} onChange={(event) => updateOrder({ ...selectedOrder, printColor: event.target.value as Color })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold outline-none focus:border-slate-950 disabled:text-slate-400">
                                 {colors.map((color) => <option key={color}>{color}</option>)}
                               </select>
                             </label>
                             {(selectedOrder.printColor || "Белый") === "Другой" && (
                               <label className="space-y-1">
                                 <span className="text-xs font-bold text-slate-500">Палитра</span>
                                 <input disabled={!permissions.canEditOrders} type="color" value={colorHex(selectedOrder.printColor, selectedOrder.customPrintColorHex)} onChange={(event) => updateOrder({ ...selectedOrder, customPrintColorHex: event.target.value })} className="h-[46px] w-full rounded-2xl border border-slate-200 bg-slate-50 p-1 disabled:opacity-50" />
                               </label>
                             )}
                           </div>
                           {(selectedOrder.printColor || "Белый") === "Другой" && (
                             <label className="block space-y-1">
                               <span className="text-xs font-bold text-slate-500">Название цвета нанесения</span>
                               <input disabled={!permissions.canEditOrders} list="supported-color-names" value={selectedOrder.customPrintColor || ""} onChange={(event) => {
                                 const customPrintColor = event.target.value;
                                 updateOrder({ ...selectedOrder, customPrintColor, customPrintColorHex: resolveColorNameToHex(customPrintColor) || selectedOrder.customPrintColorHex });
                               }} placeholder="например: лавандовый или 3522U" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-950 disabled:text-slate-400" />
                             </label>
                           )}
                         </>
                       )}
                     />
                   </>
                 )}
              </>
            )}
          </div>
        </div>
      )}
      <details className="px-4 pb-28">
        <summary className="cursor-pointer rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-200/70">Архив типографии: {archivedOrders.length}</summary>
        <div className="mt-3 space-y-3">{printOperators.map((operator) => <div key={operator} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70"><p className="font-black text-slate-950">{operator}</p><div className="mt-2 space-y-2">{archivedOrders.filter((order) => (order.printOperator || "Максим") === operator).map((order) => <div key={order.id} className="rounded-xl bg-slate-50 p-2 text-sm"><b>№ {order.id}</b> {order.client}<button onClick={() => restoreOrder(order.id)} className="ml-2 rounded-full bg-white px-3 py-1 text-xs font-bold">Вернуть</button></div>)}</div></div>)}</div>
      </details>
      {fullLayout && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4" onClick={() => setFullLayout(null)}><img src={fullLayout} alt="Макет в полном размере" className="max-h-full max-w-full rounded-2xl object-contain" /></div>}
    </>
  );
}

function StockScreen({ stock, setStock, canEdit = true }: { stock: StockItem[]; setStock: React.Dispatch<React.SetStateAction<StockItem[]>>; canEdit?: boolean }) {
  // Авто-расчёт доньев: сумма переносок соответствующего размера/цвета
  const computedBottoms = useMemo(() => {
    const carriers = stock.filter((item) => item.kind === "carriers");
    return stock.filter((item) => item.kind === "bottoms").map((bottom) => {
      // Для XXL не считаем автоматически
      if (bottom.size === "XXL") return bottom;
      const linkedSizes: string[] = [];
      if (bottom.size === "S/M1") linkedSizes.push("S", "M1");
      else if (bottom.size === "M/L long") linkedSizes.push("M", "L long");
      else if (bottom.size) linkedSizes.push(bottom.size);
      const total = carriers
        .filter((c) => linkedSizes.includes(String(c.size)) && c.color === bottom.color)
        .reduce((sum, c) => sum + c.quantity, 0);
      return { ...bottom, quantity: total };
    });
  }, [stock]);

  const groups: { id: StockKind; label: string; helper: string; noAdd?: boolean }[] = [
    { id: "carriers", label: "Переноски", helper: "Количество по размерам и цветам" },
    { id: "bottoms", label: "Донья", helper: "Рассчитываются автоматически по переноскам", noAdd: true },
    { id: "lids", label: "Крышки", helper: "Совпадающие размеры: L/L long" },
    { id: "cords", label: "Шнурки", helper: "Количество по цветам" },
  ];

  const [addDialog, setAddDialog] = useState<StockKind | null>(null);
  const [addSize, setAddSize] = useState<StockItem["size"]>("XXL");
  const [addColor, setAddColor] = useState<Color>("Белый");
  const [addCustomName, setAddCustomName] = useState("");
  const [addCustomHex, setAddCustomHex] = useState("#22c55e");

  const confirmAdd = () => {
    if (!addDialog) return;
    setStock((prev) => {
      const now = Date.now();
      const newItem = {
        id: `${addDialog}-${now}`,
        kind: addDialog,
        name: stockNameByKind[addDialog],
        size: addDialog === "cords" ? undefined : addSize,
        color: addColor,
        stockColorName: addColor === "Другой" ? addCustomName : undefined,
        stockColorHex: addColor === "Другой" ? addCustomHex : undefined,
        quantity: 0,
        userAdded: true,
      };
      const updated = [...prev, newItem];

      // Auto-create matching bottom when adding carriers with color "Другой" (and not XXL-ish? always add)
      if (addDialog === "carriers" && addSize !== undefined) {
        const bottomSize = bottomSizeFor(addSize as Size);
        const hasBottom = prev.some((item) => item.kind === "bottoms" && item.size === bottomSize && item.color === addColor
          && (addColor !== "Другой" || item.stockColorName === addCustomName));
        if (!hasBottom) {
          updated.push({
            id: `bottoms-auto-${now}`,
            kind: "bottoms",
            name: "Донья",
            size: bottomSize,
            color: addColor,
            stockColorName: addColor === "Другой" ? addCustomName : undefined,
            stockColorHex: addColor === "Другой" ? addCustomHex : undefined,
            quantity: 0,
            userAdded: true,
          });
        }
      }

      return updated;
    });
    setAddDialog(null);
    setAddCustomName("");
  };

  const deleteStockItem = (id: string) => {
    setStock((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      {groups.map((group) => (
        <details key={group.id} open={group.id === "carriers"} className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
          <summary className="cursor-pointer">
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <h3 className="text-lg font-black text-slate-950">{group.label}</h3>
              <p className="text-xs text-slate-500">{group.helper}</p>
            </div>
            {!group.noAdd && canEdit && (
              <button onClick={(event) => { event.preventDefault(); setAddDialog(group.id); setAddSize(group.id === "cords" ? undefined : "XXL"); setAddColor("Белый"); }} className="rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white">+ добавить</button>
            )}
          </div>
          </summary>
          <div className="mt-3 grid gap-2">
          {(group.id === "bottoms" ? computedBottoms : stock.filter((item) => item.kind === group.id))
            .sort((a, b) => stockSortValue(a.size) - stockSortValue(b.size) || stockColorLabel(a).localeCompare(stockColorLabel(b), "ru"))
            .map((item) => {
            const isBottom = group.id === "bottoms";
            return (
              <div key={item.id} className="rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200/70" style={{ borderLeft: `6px solid ${colorHex(item.color === "Любой" ? "Белый" : item.color, item.stockColorHex)}` }}>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600">
                    <StockIcon kind={item.kind} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="grid grid-cols-[1fr_96px] items-center gap-2">
                      <div>
                        <h4 className="text-sm font-black text-slate-950">{item.size || item.name}</h4>
                        <p className="text-[11px] text-slate-500">{stockColorLabel(item)}</p>
                         {item.userAdded && canEdit && <button onClick={() => deleteStockItem(item.id)} className="mt-1 text-[10px] font-bold text-rose-500">удалить</button>}
                      </div>
                      {isBottom && item.size !== "XXL" ? (
                        <div className="w-24 rounded-xl bg-slate-100 px-3 py-2 text-right text-sm font-black text-slate-500 ring-1 ring-slate-200">
                          {item.quantity}
                        </div>
                      ) : (isBottom && item.size === "XXL" && canEdit) ? (
                        <input
                          type="number"
                          min="0"
                          value={item.quantity || ""}
                          placeholder="0"
                          onChange={(event) => {
                            const raw = event.target.value.replace(/^0+(?=\d)/, "");
                            const quantity = Math.max(0, Number(raw));
                            setStock((prev) => prev.map((stockItem) => (stockItem.id === item.id ? { ...stockItem, quantity } : stockItem)));
                          }}
                          className="w-24 rounded-xl border border-white bg-white px-3 py-2 text-right text-sm font-black outline-none focus:border-slate-950"
                        />
                      ) : (
                        <div className="w-24 rounded-xl bg-slate-100 px-3 py-2 text-right text-sm font-black text-slate-500 ring-1 ring-slate-200">
                          {item.quantity}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </details>
      ))}
      {addDialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-4" onClick={() => setAddDialog(null)}>
          <div className="w-full max-w-md rounded-[2rem] bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black">Добавить {stockNameByKind[addDialog].toLowerCase()}</h2>
              <button onClick={() => setAddDialog(null)} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">Закрыть</button>
            </div>
            {addDialog !== "cords" && (
              <label className="mb-3 block space-y-1">
                <span className="text-xs font-bold text-slate-500">Размер</span>
                <select value={String(addSize)} onChange={(event) => setAddSize(event.target.value as StockItem["size"])} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black outline-none">
                  {stockSizesByKind[addDialog].map((size) => <option key={size}>{size}</option>)}
                </select>
              </label>
            )}
            <label className="mb-3 block space-y-1">
              <span className="text-xs font-bold text-slate-500">Цвет</span>
              <select value={addColor} onChange={(event) => setAddColor(event.target.value as Color)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black outline-none">
                {colors.map((color) => <option key={color}>{color}</option>)}
              </select>
            </label>
            {addColor === "Другой" && (
              <div className="mb-3 grid grid-cols-[1fr_auto] gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-bold text-slate-500">Название цвета</span>
                  <input value={addCustomName} onChange={(event) => { setAddCustomName(event.target.value); const hex = resolveColorNameToHex(event.target.value); if (hex) setAddCustomHex(hex); }} placeholder="например: лавандовый" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-bold text-slate-500">Палитра</span>
                  <input type="color" value={addCustomHex} onChange={(event) => setAddCustomHex(event.target.value)} className="h-[46px] w-16 rounded-2xl border border-slate-200 bg-slate-50 p-1" />
                </label>
              </div>
            )}
            <button onClick={confirmAdd} className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Добавить на склад</button>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationsScreen({ orders, printOrders, stock, permissions, materialAlerts, currentUser }: { orders: Order[]; printOrders: PrintOrder[]; stock: StockItem[]; permissions: Permissions; materialAlerts: MaterialAlert[]; currentUser: User }) {
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [openedOrder, setOpenedOrder] = useState<Order | null>(null);
  const [showFullClient, setShowFullClient] = useState(false);
  const [showCarrierDetails, setShowCarrierDetails] = useState(false);
  const [showLidDetails, setShowLidDetails] = useState(false);

  const isVisible = (id: string) => !hiddenIds.includes(id) && !deletedIds.includes(id);
  const isHiddenAndNotDeleted = (id: string) => hiddenIds.includes(id) && !deletedIds.includes(id);

  const hideNotification = (id: string) => setHiddenIds((prev) => [...prev, id]);
  const deleteNotification = (id: string) => setDeletedIds((prev) => [...prev, id]);
  const clearAllHidden = () => setDeletedIds((prev) => [...prev, ...hiddenIds]);

  const allOrders = [...orders, ...printOrders];
  const effectiveRole = currentUser.role === "developer" ? ((typeof localStorage !== "undefined" ? localStorage.getItem("boxi-display-role") : null) as Role | null || "developer") : currentUser.role;
  const filteredReadyOrders = effectiveRole === "manager"
    ? allOrders.filter((o) => o.status === "Готов")
    : effectiveRole === "packer"
      ? allOrders.filter((o) => o.status === "Новый")
      : allOrders.filter((o) => o.status === "Готов");
  const visibleReadyOrders = filteredReadyOrders.filter((o) => isVisible(`order-${o.id}`));
  
  const alertStock = permissions.canEditStock ? stock.filter((item) => getStockZone(item) === "red" || getStockZone(item) === "yellow") : [];
  const visibleStockAlerts = alertStock.filter((s) => isVisible(`stock-${s.id}`));
  
  const visibleMaterialAlerts = materialAlerts.filter((a) => isVisible(`alert-${a.id}`));

  const stockGroups: { id: StockKind; label: string }[] = [
    { id: "carriers", label: "Переноски" },
    { id: "bottoms", label: "Донья" },
    { id: "lids", label: "Крышки" },
    { id: "cords", label: "Шнурки" },
  ];

  const hiddenCount = filteredReadyOrders.filter((o) => isHiddenAndNotDeleted(`order-${o.id}`)).length +
                      alertStock.filter((s) => isHiddenAndNotDeleted(`stock-${s.id}`)).length +
                      materialAlerts.filter((a) => isHiddenAndNotDeleted(`alert-${a.id}`)).length;

  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      <details open className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
        <summary className="cursor-pointer text-lg font-black text-slate-950">{effectiveRole === "packer" ? "Новые заказы" : "Готовые заказы"} ({visibleReadyOrders.length})</summary>
        <div className="mt-3 space-y-3">
          {visibleReadyOrders.length === 0 && <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">{effectiveRole === "packer" ? "Пока нет новых заказов." : "Пока нет заказов со статусом «Готов»."}</div>}
          {visibleReadyOrders.map((order) => {
            const totals = getOrderTotals(order);
            const notifId = `order-${order.id}`;
            return (
              <div key={order.id} onClick={() => setHighlightedId(notifId)} onDoubleClick={() => setOpenedOrder(order)} className={`relative cursor-pointer rounded-[2rem] bg-emerald-50 p-4 pr-16 ring-1 transition ${highlightedId === notifId ? "ring-2 ring-slate-950" : "ring-emerald-100"}`}>
                <button onClick={(e) => { e.stopPropagation(); hideNotification(notifId); }} className="absolute right-4 top-4 rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-600 shadow-sm">Скрыть</button>
                <h4 className="font-black text-slate-950">{order.status === "Готов" ? `Заказ № ${order.id} готов к отправке` : `Заказ № ${order.id} — ${order.status}`}</h4>
                <p className="mt-1 text-sm text-slate-600">{order.client}: {totals.bundles} свёртков переносок{totals.lidBundles > 0 ? `, ${totals.lidBundles} свёртков крышек` : ""}.</p>
              </div>
            );
          })}
        </div>
      </details>

      <details className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
        <summary className="cursor-pointer text-lg font-black text-slate-950">Остатки сырья</summary>
        <div className="mt-3 space-y-3">
          {visibleMaterialAlerts.length > 0 && (
            <details open className="rounded-2xl bg-rose-50 p-3 ring-1 ring-rose-100">
              <summary className="cursor-pointer font-black text-rose-900">Нехватка по заказам ({visibleMaterialAlerts.length})</summary>
              <div className="mt-3 space-y-2">
                {visibleMaterialAlerts.map((alert) => {
                  const notifId = `alert-${alert.id}`;
                  return (
                    <div key={alert.id} className="relative rounded-[2rem] bg-rose-50 p-4 pr-16 ring-1 ring-rose-100">
                      <button onClick={() => hideNotification(notifId)} className="absolute right-4 top-4 rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-600 shadow-sm">Скрыть</button>
                      <h4 className="font-black text-rose-900">Заказ № {alert.orderId}</h4>
                      <p className="mt-1 text-sm text-rose-700">{alert.message}</p>
                      <p className="mt-2 text-xs text-rose-500">{new Date(alert.createdAt).toLocaleString("ru-RU")}</p>
                    </div>
                  );
                })}
              </div>
            </details>
          )}
          
          {permissions.canManageStock && stockGroups.map((group) => {
            const items = visibleStockAlerts.filter((item) => item.kind === group.id);
            return (
              <details key={group.id} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                <summary className="cursor-pointer font-black text-slate-950">{group.label}: {items.length}</summary>
                <div className="mt-3 space-y-2">
                  {items.length === 0 && <p className="text-sm text-slate-500">Нет предупреждений.</p>}
                  {items.map((item) => {
                    const zone = getStockZone(item);
                    const meta = zoneMeta(zone);
                    const notifId = `stock-${item.id}`;
                    return (
                      <div key={item.id} className={`relative rounded-2xl p-3 pr-16 text-sm ${meta.bg} ${meta.text} ring-1 ${meta.ring}`}>
                        <button onClick={() => hideNotification(notifId)} className="absolute right-3 top-3 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 shadow-sm">Скрыть</button>
                        <span className="font-black">{item.size ? `${item.size} · ` : ""}{stockColorLabel(item)}</span>: {item.quantity} шт.
                      </div>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      </details>

      {hiddenCount > 0 && (
        <details className="rounded-[2rem] bg-slate-100 p-4 shadow-sm ring-1 ring-slate-200/70">
          <summary className="cursor-pointer text-base font-black text-slate-600 flex items-center justify-between">
            <span>Скрытые уведомления ({hiddenCount})</span>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); clearAllHidden(); }}
              className="rounded-full bg-rose-500 px-3 py-1 text-xs font-black text-white shadow-sm"
            >
              Удалить все
            </button>
          </summary>
          <div className="mt-3 space-y-2">
            {filteredReadyOrders.filter((o) => isHiddenAndNotDeleted(`order-${o.id}`)).map((order) => {
              const notifId = `order-${order.id}`;
              return (
                <div key={notifId} className="flex items-center justify-between rounded-xl bg-white p-3 text-xs shadow-sm ring-1 ring-slate-200/60">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-700">Заказ № {order.id} готов</p>
                    <p className="text-slate-400 truncate">{order.client}</p>
                  </div>
                  <button onClick={() => deleteNotification(notifId)} className="ml-2 rounded-full bg-rose-50 px-2 py-1 text-xs font-bold text-rose-600">Удалить</button>
                </div>
              );
            })}

            {materialAlerts.filter((a) => isHiddenAndNotDeleted(`alert-${a.id}`)).map((alert) => {
              const notifId = `alert-${alert.id}`;
              return (
                <div key={notifId} className="flex items-center justify-between rounded-xl bg-white p-3 text-xs shadow-sm ring-1 ring-slate-200/60">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-rose-700">Нехватка № {alert.orderId}</p>
                    <p className="text-slate-400 truncate">{alert.message}</p>
                  </div>
                  <button onClick={() => deleteNotification(notifId)} className="ml-2 rounded-full bg-rose-50 px-2 py-1 text-xs font-bold text-rose-600">Удалить</button>
                </div>
              );
            })}

            {alertStock.filter((s) => isHiddenAndNotDeleted(`stock-${s.id}`)).map((item) => {
              const notifId = `stock-${item.id}`;
              return (
                <div key={notifId} className="flex items-center justify-between rounded-xl bg-white p-3 text-xs shadow-sm ring-1 ring-slate-200/60">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-700">{item.name} {item.size || ""}</p>
                    <p className="text-slate-400 truncate">{stockColorLabel(item)} · {item.quantity} шт.</p>
                  </div>
                  <button onClick={() => deleteNotification(notifId)} className="ml-2 rounded-full bg-rose-50 px-2 py-1 text-xs font-bold text-rose-600">Удалить</button>
                </div>
              );
            })}
          </div>
        </details>
      )}
      {openedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={() => { setOpenedOrder(null); setShowFullClient(false); setShowCarrierDetails(false); setShowLidDetails(false); }}>
          <div className="w-[90%] max-w-sm rounded-[1.5rem] bg-white p-4 text-left text-slate-950 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-base font-black">Заказ № {openedOrder.id}</h3>
              <button onClick={() => { setOpenedOrder(null); setShowFullClient(false); setShowCarrierDetails(false); setShowLidDetails(false); }} className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black text-white">Закрыть</button>
            </div>
            {(() => {
              const totals = getOrderTotals(openedOrder);
              const isLong = openedOrder.client.length > 18;
              const displayName = showFullClient ? openedOrder.client : (isLong ? openedOrder.client.slice(0, 18) + "…" : openedOrder.client);
              return (
                <div className="space-y-2 text-sm">
                  {isLong && showFullClient ? (
                    <div onClick={() => setShowFullClient(false)} className="cursor-pointer rounded-xl bg-slate-50 p-2.5">
                      <span className="text-[10px] font-bold text-slate-400">Клиент:</span>
                      <p className="font-black text-slate-900">{openedOrder.client}</p>
                      <p className="text-[10px] text-slate-400 mt-1">нажмите, чтобы свернуть</p>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center rounded-xl bg-slate-50 p-2.5">
                      <span className="text-xs font-bold text-slate-500">Клиент:</span>
                      <span className="font-black text-slate-900">{displayName}</span>
                      {isLong && <button onClick={() => setShowFullClient(true)} className="ml-2 text-[10px] font-black text-emerald-600">показать</button>}
                    </div>
                  )}
                  <div className="flex justify-between items-center rounded-xl bg-slate-50 p-2.5">
                    <span className="text-xs font-bold text-slate-500">Менеджер:</span>
                    <span className="font-black text-slate-900">{openedOrder.manager}</span>
                  </div>
                  <div className="flex justify-between items-center rounded-xl bg-slate-50 p-2.5">
                    <span className="text-xs font-bold text-slate-500">Упаковщик:</span>
                    <span className="font-black text-emerald-700">{openedOrder.packedBy || "не упакован"}</span>
                  </div>
                  <div className="flex justify-between items-center rounded-xl bg-slate-50 p-2.5">
                    <span className="text-xs font-bold text-slate-500">Тип отправки:</span>
                    <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-black text-slate-700">{openedOrder.shipping}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-slate-50 p-2 text-center">
                      <p className="text-[10px] font-bold text-slate-500">Оформлен</p>
                      <p className="font-black text-slate-900 text-xs mt-0.5">{openedOrder.createdAt}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2 text-center">
                      <p className="text-[10px] font-bold text-slate-500">Отгрузка</p>
                      <p className="font-black text-slate-900 text-xs mt-0.5">{openedOrder.shippingDate}</p>
                    </div>
                  </div>
                  <div className={`grid gap-2 text-center ${totals.lids > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
                    <div onClick={() => setShowCarrierDetails(true)} className="cursor-pointer rounded-xl bg-slate-950 p-2 text-white active:scale-95 transition-transform">
                      <p className="text-lg font-black leading-tight">{totals.quantity}</p>
                      <p className="text-[9px] uppercase font-bold tracking-wide text-slate-400">переносок</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">нажмите подробнее</p>
                    </div>
                    {totals.lids > 0 && (
                      <div onClick={() => setShowLidDetails(true)} className="cursor-pointer rounded-xl bg-emerald-600 p-2 text-white active:scale-95 transition-transform">
                        <p className="text-lg font-black leading-tight">{totals.lids}</p>
                        <p className="text-[9px] uppercase font-bold tracking-wide text-emerald-200">крышек</p>
                        <p className="text-[9px] text-emerald-300 mt-0.5">нажмите подробнее</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      {showCarrierDetails && openedOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4" onClick={() => setShowCarrierDetails(false)}>
          <div className="w-[85%] max-w-[280px] rounded-[1.5rem] bg-white p-3 text-left text-slate-950 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-1.5">
              <h3 className="text-sm font-black">Переноски</h3>
              <button onClick={() => setShowCarrierDetails(false)} className="rounded-full bg-slate-950 px-2.5 py-0.5 text-[9px] font-black text-white">Закрыть</button>
            </div>
            <div className="space-y-1">
              {openedOrder.items.map((item) => (
                <div key={`dc-${item.id}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1.5 text-xs">
                  <span className="font-black text-slate-950">{item.size}</span>
                  <span className="inline-flex items-center gap-1 text-slate-600 max-w-[90px] truncate">
                    <span className="h-2 w-2 shrink-0 rounded-full border border-slate-300" style={{ backgroundColor: colorHex(item.color, item.customColorHex) }} />
                    {colorName(item.color, item.customColor)}
                  </span>
                  <span className="font-black text-slate-950">{item.quantity} шт.</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {showLidDetails && openedOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4" onClick={() => setShowLidDetails(false)}>
          <div className="w-[85%] max-w-[280px] rounded-[1.5rem] bg-white p-3 text-left text-slate-950 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-1.5">
              <h3 className="text-sm font-black">Крышки</h3>
              <button onClick={() => setShowLidDetails(false)} className="rounded-full bg-slate-950 px-2.5 py-0.5 text-[9px] font-black text-white">Закрыть</button>
            </div>
            <div className="space-y-1">
              {openedOrder.items.filter((item) => item.includeLid).map((item) => (
                <div key={`dl-${item.id}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1.5 text-xs">
                  <span className="font-black text-slate-950">{item.size}</span>
                  <span className="inline-flex items-center gap-1 text-slate-600 max-w-[90px] truncate">
                    <span className="h-2 w-2 shrink-0 rounded-full border border-slate-300" style={{ backgroundColor: colorHex(item.color, item.customColorHex) }} />
                    {colorName(item.color, item.customColor)}
                  </span>
                  <span className="font-black text-slate-950">{item.quantity} шт.</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DiesScreen() {
  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      <div className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
        <h2 className="text-xl font-black text-slate-950">Справочная информация</h2>
        <p className="mt-1 text-sm text-slate-500">Здесь собраны правила производства, упаковки, штанцформы, крышки и шнурки. В заказах оставлены только рабочие количества.</p>
      </div>

      <details className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
        <summary className="cursor-pointer text-lg font-black text-slate-950">Штанцы</summary>
        <section className="mt-4 space-y-3">
          {dieForms.map((die) => (
            <div key={die.name} className="rounded-[1.5rem] bg-slate-50 p-4 ring-1 ring-slate-200/70">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-950">{die.name}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-700">{die.output}</p>
                <p className="mt-1 text-xs text-slate-500">{die.note}</p>
              </div>
              <span className="rounded-2xl bg-slate-100 px-3 py-2 text-xl">⬟</span>
            </div>
            </div>
          ))}
        </section>
      </details>

      <details className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
        <summary className="cursor-pointer font-black text-slate-950">Упаковка</summary>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li><b>Машина:</b> 50 переносок в свертке, без усиления.</li>
          <li><b>Почта:</b> 50 переносок, XXL — 35 переносок; каждый сверток усилен картонными уголками по периметру без нижней грани.</li>
          <li><b>ОПТ:</b> 1 сверток = 10 переносок + 1 пакет шнурков (20 шт.) + 10 крышек (опционально). 4 свертка = 1 касета. Переноски в касете одного размера, касеты либо с крышками, либо без.</li>
          <li><b>Переноски:</b> переноска, дно, опциональная крышка и 2 шнурка.</li>
          <li><b>Крышки:</b> есть для всех размеров, крышки L и L long совпадают.</li>
          <li><b>Шнурки:</b> 2 шт. на переноску, фасовка по 20 шт. для 10 переносок.</li>
          <li><b>Совпадающие донья:</b> S и M1 используют одно дно; M и L long используют одно дно.</li>
        </ul>
      </details>

      <details className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
        <summary className="cursor-pointer font-black text-slate-950">Пороги сырья</summary>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li><b>Переноски, донья, крышки:</b> зеленая зона больше 500, желтая 200-500, красная меньше 200.</li>
          <li><b>Шнурки:</b> зеленая зона больше 6000, желтая 3000-6000, красная меньше 3000.</li>
        </ul>
      </details>
    </div>
  );
}

function ActivityScreen({ users, currentUser }: { users: User[]; currentUser: User }) {
  const formatDateTime = (value?: string) => value ? new Date(value).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" }) : "нет данных";

  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      <div className="mb-1 flex items-center justify-between px-1">
        <h2 className="text-xl font-black text-slate-950">Сотрудники</h2>
      </div>
      {users.map((user) => (
        <div key={user.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`h-8 w-8 shrink-0 flex items-center justify-center rounded-full text-xs font-black ${user.online ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {user.name.charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-950 truncate">{user.name}{user.id === currentUser.id ? " · вы" : ""}</p>
              <p className="text-[11px] text-slate-400">{roleLabels[user.role]} · {formatDateTime(user.lastLoginAt)}</p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-black ${user.online ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            {user.online ? "Онлайн" : "Оффлайн"}
          </span>
        </div>
      ))}
    </div>
  );
}

function ProfileScreen({ currentUser, onLogout, theme, setTheme, displayRole, setDisplayRole }: { currentUser: User; onLogout: () => void; theme: "light" | "dark"; setTheme: (theme: "light" | "dark") => void; displayRole: Role; setDisplayRole: (role: Role) => void }) {

  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      <div className="rounded-[2rem] bg-slate-950 p-5 text-white shadow-lg shadow-slate-300/70">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-300">Профиль</p>
            <h2 className="mt-1 text-2xl font-black">{currentUser.name}</h2>
            <p className="mt-1 text-sm text-slate-300">Логин: {currentUser.login}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="inline-flex h-10 min-w-10 items-center justify-center rounded-full bg-white/10 px-3 text-sm font-black text-white ring-1 ring-white/10 transition active:scale-95"
              title="Сменить тему"
            >
              {theme === "dark" ? "🌙" : "☀"}
            </button>
            <button
              onClick={onLogout}
              className="inline-flex h-10 items-center justify-center rounded-full bg-white px-4 text-xs font-black text-slate-950 transition active:scale-95"
            >
              Выйти
            </button>
          </div>
        </div>
        <div className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-slate-950">{roleLabels[displayRole]}</div>
        <p className="mt-3 text-sm text-slate-300">{roleDescriptions[displayRole]}</p>
      </div>

      {currentUser.role === "developer" && (
        <div className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
          <h3 className="text-lg font-black text-slate-950">Режим роли</h3>
          <p className="mt-1 text-xs text-slate-500">Переключайте роли, чтобы видеть возможности интерфейса для каждой из них.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {switchableRoles.map((role) => (
              <button
                key={role}
                onClick={() => setDisplayRole(role)}
                className={`rounded-2xl px-3 py-3 text-xs font-black transition ${displayRole === role ? "bg-slate-950 text-white shadow-lg" : "bg-slate-100 text-slate-700"}`}
              >
                {roleLabels[role]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
        <h3 className="text-lg font-black text-slate-950">Рабочая смена</h3>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between rounded-2xl bg-slate-50 p-3">
            <span>Фонд оплаты труда за смену:</span>
            <span className="font-black text-slate-950">
              {currentUser.role === "packer" ? "2 500 ₽" : currentUser.role === "manager" ? "3 000 ₽" : "4 500 ₽"}
            </span>
          </div>
          <div className="flex justify-between rounded-2xl bg-slate-50 p-3">
            <span>График смен:</span>
            <span className="font-black text-slate-950">2 через 2 (с 8:00 до 20:00)</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 px-1">
            Детальный расчет фонда оплаты труда и персональный график сотрудников (включая упаковщиков) будут добавлены в следующей версии от нейросети gpt-5.5-high.
          </p>
        </div>
      </div>
    </div>
  );
}



export default function App() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [currentUser, setCurrentUser] = useState<User | null>(initialUsers[3]);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [printOrders, setPrintOrders] = useState<PrintOrder[]>(initialPrintOrders);
  const [stock, setStock] = useState<StockItem[]>(initialStock);
  const [materialAlerts, setMaterialAlerts] = useState<MaterialAlert[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("retail");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedPrintOrderId, setSelectedPrintOrderId] = useState<number | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("boxi-theme") as "light" | "dark") || "dark";
  });
  const [displayRole, setDisplayRole] = useState<Role>(() => {
    if (typeof window === "undefined") return "developer";
    return (localStorage.getItem("boxi-display-role") as Role) || "developer";
  });
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("boxi-theme", theme);
  }, [theme]);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("boxi-display-role", displayRole);
  }, [displayRole]);

  const criticalCount = useMemo(() => stock.filter((item) => getStockZone(item) === "red").length, [stock]);
  const readyCount = useMemo(() => [...orders, ...printOrders].filter((order) => order.status === "Готов").length, [orders, printOrders]);

  const addMaterialAlert = (order: Order, shortages: string[]) => {
    setMaterialAlerts((prev) => [{ id: Date.now(), orderId: order.id, message: shortages.join("; "), createdAt: new Date().toISOString() }, ...prev]);
  };

  const loginUser = (user: User) => {
    const now = new Date().toISOString();
    const updatedUser = { ...user, online: true, lastLoginAt: now };
    setUsers((prev) => prev.map((item) => item.id === user.id ? updatedUser : item));
    setCurrentUser(updatedUser);
    setActiveTab("retail");
  };

  if (!currentUser) {
    return <AuthScreen users={users} setUsers={setUsers} onLogin={loginUser} />;
  }

  const effectiveRole = currentUser.role === "developer" ? displayRole : currentUser.role;
  const permissions = getPermissions(effectiveRole);
  const allowedTabs = getTabsForRole(effectiveRole);
  const currentTab = allowedTabs.includes(activeTab) ? activeTab : allowedTabs[0];

  const logout = () => {
    const now = new Date().toISOString();
    setUsers((prev) => prev.map((user) => user.id === currentUser.id ? { ...user, online: false, lastLogoutAt: now } : user));
    setCurrentUser(null);
    setActiveTab(allowedTabs[0]);
  };

  return (
    <PhoneFrame theme={theme}>
      <TopBar activeTab={currentTab} setActiveTab={setActiveTab} criticalCount={criticalCount} readyCount={readyCount} user={currentUser} displayRole={effectiveRole} allowedTabs={allowedTabs} />
      <main className="pb-8">
        {currentTab === "retail" && <OrdersScreen orders={orders} filterType="retail" selectedOrderId={selectedOrderId} setSelectedOrderId={setSelectedOrderId} setOrders={setOrders} stock={stock} setStock={setStock} addMaterialAlert={addMaterialAlert} user={currentUser} permissions={permissions} />}
        {currentTab === "wholesale" && <OrdersScreen orders={orders} filterType="wholesale" selectedOrderId={selectedOrderId} setSelectedOrderId={setSelectedOrderId} setOrders={setOrders} stock={stock} setStock={setStock} addMaterialAlert={addMaterialAlert} user={currentUser} permissions={permissions} />}
        {currentTab === "print" && <PrintScreen orders={printOrders} selectedOrderId={selectedPrintOrderId} setSelectedOrderId={setSelectedPrintOrderId} setOrders={setPrintOrders} stock={stock} setStock={setStock} addMaterialAlert={addMaterialAlert} user={currentUser} permissions={permissions} />}
        {currentTab === "stock" && permissions.canViewStock && <StockScreen stock={stock} setStock={setStock} canEdit={permissions.canEditStock} />}
        {currentTab === "notifications" && <NotificationsScreen orders={orders} printOrders={printOrders} stock={stock} permissions={permissions} materialAlerts={materialAlerts} currentUser={currentUser} />}
        {currentTab === "activity" && <ActivityScreen users={users} currentUser={currentUser} />}
        {currentTab === "dies" && <DiesScreen />}
        {currentTab === "profile" && <ProfileScreen currentUser={currentUser} onLogout={logout} theme={theme} setTheme={setTheme} displayRole={effectiveRole} setDisplayRole={setDisplayRole} />}
      </main>
    </PhoneFrame>
  );
}
