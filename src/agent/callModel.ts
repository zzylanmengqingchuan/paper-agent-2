import { MessagesAnnotation } from "@langchain/langgraph";
import { isSystemMessage, HumanMessage } from "@langchain/core/messages";
import { llm } from "./model.js";
import { SYSTEM_PROMPT } from "./prompt.js";
import { PDFParse } from "pdf-parse";

// 从 base64 PDF 提取文本
async function extractPdfText(base64Data: string): Promise<string> {
  const buffer = Buffer.from(base64Data, "base64");
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
}

// 检测并处理 PDF 文件，返回过滤后的内容
async function detectAndPrintPdf(content: unknown): Promise<{ filtered: unknown[]; foundPdf: boolean }> {
  if (!Array.isArray(content)) return { filtered: [content], foundPdf: false };

  const filtered: unknown[] = [];
  let foundPdf = false;

  for (const item of content) {
    if (
      item &&
      typeof item === "object" &&
      (item as Record<string, unknown>).type === "file" &&
      (item as Record<string, unknown>).mimeType === "application/pdf"
    ) {
      const fileItem = item as Record<string, unknown>;
      const metadata = fileItem.metadata as Record<string, unknown> | undefined;
      console.log("=== PDF Detected ===");
      console.log("PDF fileName:", metadata?.filename);

      // 提取并打印 PDF 文本内容
      const base64Data = fileItem.data as string;
      try {
        const text = await extractPdfText(base64Data);
        console.log("PDF Text Content:");
        console.log(text);
      } catch (error) {
        console.error("Failed to extract PDF text:", error);
      }

      foundPdf = true;
    } else {
      filtered.push(item);
    }
  }

  return { filtered, foundPdf };
}

// 定义 agent 节点：调用 LLM 并返回响应
export async function callModel(state: typeof MessagesAnnotation.State) {
  // 只在消息列表中没有 system message 时才添加
  const hasSystemMessage = state.messages.some(isSystemMessage);
  let messages = hasSystemMessage ? state.messages : [SYSTEM_PROMPT, ...state.messages];

  // 处理最后一条消息：检测 PDF 并过滤掉 file 类型
  const lastMessage = messages[messages.length - 1];
  if (lastMessage && typeof lastMessage === "object" && "content" in lastMessage) {
    const content = (lastMessage as unknown as Record<string, unknown>).content;
    const { filtered, foundPdf } = await detectAndPrintPdf(content);

    if (foundPdf) {
      if (filtered.length > 0) {
        // 创建新的 HumanMessage 替换原消息
        const newMessage = new HumanMessage({
          content: filtered,
          additional_kwargs: lastMessage.additional_kwargs,
        } as unknown as ConstructorParameters<typeof HumanMessage>[0]);
        messages = [...messages.slice(0, -1), newMessage];
        console.log("=== Filtered message content ===");
        console.log(JSON.stringify(filtered, null, 2));
      } else {
        // 如果只有 PDF 没有其他内容，创建一个空文本消息
        const newMessage = new HumanMessage({
          content: "[用户上传了 PDF 文件]",
          additional_kwargs: lastMessage.additional_kwargs,
        } as unknown as ConstructorParameters<typeof HumanMessage>[0]);
        messages = [...messages.slice(0, -1), newMessage];
      }
    }
  }

  const response = await llm.invoke(messages);
  return { messages: response };
}
