import data from "@/data/dummy.json";

export type DummyData = typeof data;
export type Domain = DummyData["domains"][number];
export type Mailbox = DummyData["mailboxes"][number];

export function getDummyData() {
  return data;
}

export function formatStorage(mb: number) {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`;
  }

  return `${mb} MB`;
}

export function usagePercent(usedMb: number, quotaMb: number) {
  return Math.min(100, Math.round((usedMb / quotaMb) * 100));
}
