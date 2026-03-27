import { MessagesAnnotation } from "@langchain/langgraph";
import { isSystemMessage, HumanMessage, BaseMessage } from "@langchain/core/messages";
import { llm } from "./model.js";
import { createSystemPrompt } from "./prompt.js";

// 过滤消息内容中的 file 类型
function filterFileContent(content: unknown): unknown {
  if (!Array.isArray(content)) return content;
  return content.filter(
    (item) => !(item && typeof item === "object" && (item as Record<string, unknown>).type === "file")
  );
}

// 从 messages 中提取所有 PDF 文本
function extractAllPdfTexts(messages: BaseMessage[]): string | undefined {
  const allPdfTexts: string[] = [];

  for (const msg of messages) {
    const additionalKwargs = (msg as HumanMessage).additional_kwargs;
    const pdfTexts = additionalKwargs?.pdfTexts as string[] | undefined;
    if (pdfTexts && pdfTexts.length > 0) {
      allPdfTexts.push(...pdfTexts);
    }
  }

  if (allPdfTexts.length === 0) return undefined;
  return allPdfTexts.join("\n\n---\n\n");
}

// 定义 agent 节点：调用 LLM 并返回响应
export async function callModel(state: typeof MessagesAnnotation.State) {
  const messages = state.messages;

  // 提取所有 PDF 文本
  const pdfContent = extractAllPdfTexts(messages);

  // 过滤 messages，移除 type=file 的内容，生成 newMessages
  const newMessages: BaseMessage[] = messages.map((msg) => {
    const msgObj = msg as unknown as Record<string, unknown>;
    const content = msgObj.content;
    const additionalKwargs = (msg as HumanMessage).additional_kwargs;

    // 过滤 file 类型
    const filteredContent = filterFileContent(content);

    // 创建新消息
    return new HumanMessage({
      content: filteredContent,
      additional_kwargs: additionalKwargs,
    } as unknown as ConstructorParameters<typeof HumanMessage>[0]);
  });

  // 使用 newMessages 和动态生成的 system prompt
  const hasSystemMessage = messages.some(isSystemMessage);
  const systemPrompt = createSystemPrompt(pdfContent);
  const messagesWithSystem = hasSystemMessage ? newMessages : [systemPrompt, ...newMessages];

  const response = await llm.invoke(messagesWithSystem);
  return { messages: response };
}
