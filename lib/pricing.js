export const plans = [
  {
    name: "Starter",
    price: "¥19",
    tokens: 300,
    note: "约 4-6 集播客",
    featured: false
  },
  {
    name: "Creator",
    price: "¥59",
    tokens: 1200,
    note: "适合每周稳定整理",
    featured: true
  },
  {
    name: "Studio",
    price: "¥199",
    tokens: 5200,
    note: "团队共用额度",
    featured: false
  }
];

export function estimateCost(url = "") {
  const isPodcast = /xiaoyuzhoufm|podcast|episode/.test(url);
  const base = isPodcast ? 60 : 18;
  const longMedia = /6a15a2cb|6a275ed|6a1e4022/.test(url);
  return base + (longMedia ? 8 : 0);
}
