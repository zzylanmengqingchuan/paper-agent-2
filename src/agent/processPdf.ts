import { MessagesAnnotation } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { PDFParse } from "pdf-parse";

// 从 base64 PDF 提取文本
async function extractPdfText(base64Data: string): Promise<string> {
  const buffer = Buffer.from(base64Data, "base64");
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
}

// 处理消息内容中的 PDF 文件
async function processPdfContent(
  content: unknown
): Promise<{ filtered: unknown[]; pdfTexts: string[] }> {
  if (!Array.isArray(content)) return { filtered: [content], pdfTexts: [] };

  const filtered: unknown[] = [];
  const pdfTexts: string[] = [];

  for (const item of content) {
    if (
      item &&
      typeof item === "object" &&
      (item as Record<string, unknown>).type === "file" &&
      (item as Record<string, unknown>).mimeType === "application/pdf"
    ) {
      const fileItem = item as Record<string, unknown>;
      const metadata = fileItem.metadata as Record<string, unknown> | undefined;
      const filename = (metadata?.filename as string) || "unknown.pdf";

      console.log("=== PDF Detected ===");
      console.log("PDF fileName:", filename);

      // 提取 PDF 文本内容
      const base64Data = fileItem.data as string;
      try {
        const text = await extractPdfText(base64Data);
        console.log("PDF Text Content:");
        console.log(text);
        pdfTexts.push(text);

        // 将 file 类型替换为文本占位符
        filtered.push({ type: "text", text: `<${filename}>` });
      } catch (error) {
        console.error("Failed to extract PDF text:", error);
        filtered.push({ type: "text", text: `<${filename} (解析失败)>` });
      }
    } else {
      filtered.push(item);
    }
  }

  return { filtered, pdfTexts };
}

// 定义处理 PDF 的节点
export async function processPdf(state: typeof MessagesAnnotation.State) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];

  // 检查最后一条消息是否有 content 且为数组
  if (!lastMessage || typeof lastMessage !== "object" || !("content" in lastMessage)) {
    return {};
  }

  const content = (lastMessage as unknown as Record<string, unknown>).content;
  const { filtered, pdfTexts } = await processPdfContent(content);

  // 如果没有发现 PDF，直接返回
  if (pdfTexts.length === 0) {
    return {};
  }

  // 创建新的 HumanMessage 替换原消息
  const newMessage = new HumanMessage({
    content: filtered,
    additional_kwargs: {
      ...(lastMessage as HumanMessage).additional_kwargs,
      pdfTexts, // 将提取的 PDF 文本存储在 additional_kwargs 中
    },
  } as unknown as ConstructorParameters<typeof HumanMessage>[0]);

  console.log("=== Processed PDF ===");
  console.log("Extracted PDF texts count:", pdfTexts.length);
  console.log("Filtered message content:", JSON.stringify(filtered, null, 2));

  return {
    messages: [...messages.slice(0, -1), newMessage],
  };
}
