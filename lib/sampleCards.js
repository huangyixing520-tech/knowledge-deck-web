export const sampleCards = {
  "demo-fde": {
    id: "demo-fde",
    title: "AI 时代的新岗位：FDE 与数字员工",
    sourceTitle: "OpenAI 和 Anthropic 共同看好的 FDE",
    sourceUrl: "https://www.xiaoyuzhoufm.com/episode/6a1e4022ac7bdb080c348b41",
    duration: "55:07",
    cost: 62,
    thesis:
      "这期真正讨论的不是“AI 会不会提效”，而是当模型能力趋同后，企业该如何把上下文、工作流和判断标准沉淀成可运行系统。",
    who: "适合正在做 AI 产品、企业 AI 转型、Agent/工作流设计的人先读。",
    judgments: [
      {
        time: "03:35",
        label: "主命题",
        title: "AI 差距不再只是会不会提问",
        body:
          "真正拉开差距的是组织是否能把上下文、业务流程和验收标准变成可继承的系统，而不是把 Chat 当一次性问答入口。",
        why:
          "当模型和工具越来越接近，私有上下文和工作流会成为新的护城河。",
        use:
          "检查一个 AI 项目时，先问它有没有沉淀任务背景、案例、偏好和验收标准。"
      },
      {
        time: "05:16",
        label: "行动",
        title: "停止把 Chat 当唯一入口",
        body:
          "Chat 适合探索，但不适合承载高频生产。高价值任务需要被拆成资料、工具、标准、流程和反馈回路。",
        why:
          "只靠聊天框，收益会停留在线性提效；沉淀成 Agent + Skill，收益才可能复利。",
        use:
          "把一个常用任务拆成输入资料、处理步骤、质量标准和复盘反馈四栏。"
      },
      {
        time: "12:47",
        label: "概念",
        title: "Skill 不是人格皮肤",
        body:
          "Skill 的核心不是让 AI 更像某个人，而是把一个可复用任务的上下文、工具和验收标准封装起来。",
        why:
          "这能把个人经验从一次性表达，变成组织可以重复调用的能力资产。",
        use:
          "优先为高频、标准可描述、产出可验收的任务做 Skill。"
      }
    ],
    map: ["Chat", "Agent", "Skill", "Context", "Workflow", "Digital Worker"],
    turns: [
      ["原来以为", "AI 使用水平取决于会不会写 prompt"],
      ["现在应该认为", "AI 使用水平取决于能否把判断标准和工作流产品化"],
      ["为什么", "Prompt 是一次性表达，Context 与 Skill 才能长期复用"]
    ],
    quotes: [
      {
        text: "把 AI 当一次性问答，收益会耗散；把 AI 当可继承系统，收益会复利。",
        anchor: "一次性提效和长期复利的分界"
      },
      {
        text: "企业 AI 不是买模型，是让数字员工入职。",
        anchor: "组织转型的真正交付物"
      }
    ]
  },
  "demo-harness": {
    id: "demo-harness",
    title: "Harness、AI 创业与街头智慧",
    sourceTitle: "雨森创投观察第 2 集",
    sourceUrl: "https://www.xiaoyuzhoufm.com/episode/6a15a2cbff7b9a8c0a5b953f",
    duration: "61:40",
    cost: 68,
    thesis:
      "这期把 AI 创业从“追热点”拉回到真实生意：优秀机会常常出现在脏活、现场经验和街头智慧里。",
    who: "适合创业者、投资人、产品负责人判断 AI 项目是否有真实商业抓手。",
    judgments: [
      {
        time: "08:12",
        label: "创业判断",
        title: "街头智慧比漂亮叙事更稀缺",
        body:
          "AI 创业不是只看技术叙事，而是看团队是否理解客户现场、采购路径、替代成本和真实工作流。",
        why:
          "模型能力容易趋同，现场经验和交易结构更难复制。",
        use:
          "看项目时追问：它解决的是预算里真实存在的问题，还是 Demo 里好看的问题。"
      },
      {
        time: "18:36",
        label: "案例机制",
        title: "Harness 的启发是工程工作流再组织",
        body:
          "Harness 的价值不只是工具集合，而是把软件交付链路里的质量、发布、治理和成本控制重新编排。",
        why:
          "企业愿意为降低系统性风险和提升交付确定性付费。",
        use:
          "判断 B2B AI 时，不只看单点功能，要看它能否嵌进核心流程并承担责任。"
      },
      {
        time: "32:05",
        label: "投资视角",
        title: "AI 项目的护城河藏在不性感的环节",
        body:
          "越靠近脏数据、复杂权限、组织协同和线下交易，越可能形成模型之外的壁垒。",
        why:
          "这些环节慢、碎、难标准化，恰好不容易被基础模型一口吞掉。",
        use:
          "找机会时优先看高频、强刚需、数据难迁移、流程难替换的场景。"
      }
    ],
    map: ["现场", "脏活", "预算", "工作流", "责任", "复购"],
    turns: [
      ["原来以为", "AI 创业要追最热模型能力"],
      ["现在应该认为", "AI 创业要找到最真实、最难外包的业务摩擦"],
      ["为什么", "模型是供给变化，客户预算和组织惯性才决定商业化"]
    ],
    quotes: [
      {
        text: "真正好的 AI 生意，常常先闻起来不像 AI。",
        anchor: "避免被技术叙事牵着走"
      },
      {
        text: "街头智慧不是土办法，而是对真实交易的低延迟理解。",
        anchor: "现场经验的商业价值"
      }
    ]
  }
};

export function pickCardByUrl(url = "") {
  if (url.includes("6a15a2cb")) return sampleCards["demo-harness"];
  return sampleCards["demo-fde"];
}
