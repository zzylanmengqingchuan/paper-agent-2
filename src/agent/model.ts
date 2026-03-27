import { ChatOpenAI } from "@langchain/openai";
import { tools } from "./tools.js";

// 创建 DeepSeek LLM 实例，绑定 tools
export const llm = new ChatOpenAI({
  model: process.env.MODEL_NAME || "deepseek-chat",
  temperature: 0,
  configuration: {
    baseURL: process.env.BASE_URL || "https://api.deepseek.com",
  },
}).bindTools(tools);
