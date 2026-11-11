export const settingViews = [
  { value: "business", label: "Shop" },
  { value: "team", label: "Team" },
  { value: "rules", label: "Rules" },
  { value: "data", label: "Data" },
] as const;

export type SettingView = (typeof settingViews)[number]["value"];
