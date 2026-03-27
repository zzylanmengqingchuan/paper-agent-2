import { ToolNode } from "@langchain/langgraph/prebuilt";
import { tools } from "./tools.js";

// 创建工具节点
export const toolNode = new ToolNode(tools);
