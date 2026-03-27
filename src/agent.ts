import { ChatOpenAI } from "@langchain/openai";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";

// 创建 LLM 实例
const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

// 定义 agent 节点：调用 LLM 并返回响应
async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await llm.invoke(state.messages);
  return { messages: response };
}

// 创建一个简单的 graph
const workflow = new StateGraph(MessagesAnnotation)
  // 添加 agent 节点
  .addNode("agent", callModel)
  // 设置入口点
  .addEdge("__start__", "agent")
  // 设置结束点
  .addEdge("agent", "__end__");

// 编译 graph
export const graph = workflow.compile();
