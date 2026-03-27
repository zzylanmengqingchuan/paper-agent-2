import { ChatOpenAI } from "@langchain/openai";
import { MessagesAnnotation, StateGraph, Annotation } from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { TavilySearch } from "@langchain/tavily";

// 定义配置 Schema
const ConfigurationSchema = Annotation({
  // 可扩展配置项
});

// 定义 Tavily 搜索工具
const tavilySearchTool = new TavilySearch({
  maxResults: 3,
  topic: "general",
});

const tools = [tavilySearchTool];

// 创建 DeepSeek LLM 实例，绑定 tools
const llm = new ChatOpenAI({
  model: process.env.MODEL_NAME || "deepseek-chat",
  temperature: 0,
  configuration: {
    baseURL: process.env.BASE_URL || "https://api.deepseek.com",
  },
}).bindTools(tools);

// 定义 agent 节点：调用 LLM 并返回响应
async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await llm.invoke(state.messages);
  return { messages: response };
}

// 创建带有工具的 graph
const workflow = new StateGraph(MessagesAnnotation, ConfigurationSchema)
  // 定义两个循环节点
  .addNode("callModel", callModel)
  .addNode("tools", new ToolNode(tools))
  // 设置入口点为 callModel
  .addEdge("__start__", "callModel")
  // 添加条件边：使用官方 toolsCondition
  .addConditionalEdges("callModel", toolsCondition)
  // tools 节点执行后返回 callModel
  .addEdge("tools", "callModel");

// 编译 graph
export const graph = workflow.compile();
