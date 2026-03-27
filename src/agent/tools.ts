import { TavilySearch } from "@langchain/tavily";

// 定义 Tavily 搜索工具
const tavilySearchTool = new TavilySearch({
  maxResults: 3,
  topic: "general",
});

export const tools = [tavilySearchTool];
