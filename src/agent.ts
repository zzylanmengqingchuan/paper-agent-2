import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { toolsCondition } from "@langchain/langgraph/prebuilt";
import { callModel } from "./agent/callModel.js";
import { toolNode } from "./agent/toolNode.js";
import { processPdf } from "./agent/processPdf.js";

// 创建带有工具的 graph
const workflow = new StateGraph(MessagesAnnotation)
  // 定义节点
  .addNode("processPdf", processPdf)
  .addNode("callModel", callModel)
  .addNode("tools", toolNode)
  // 设置入口点为 processPdf
  .addEdge("__start__", "processPdf")
  // processPdf 处理后进入 callModel
  .addEdge("processPdf", "callModel")
  // 添加条件边：使用官方 toolsCondition
  .addConditionalEdges("callModel", toolsCondition)
  // tools 节点执行后返回 callModel
  .addEdge("tools", "callModel");

// 编译 graph
export const graph = workflow.compile();
