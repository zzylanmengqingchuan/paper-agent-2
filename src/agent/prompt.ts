import { SystemMessage } from "@langchain/core/messages";

// 基础 System Prompt
const BASE_SYSTEM_PROMPT = `你是一个智能助手，能够帮助用户分析文档、回答问题和提供建议。

## 核心能力
- 准确理解用户的问题和需求
- 基于提供的上下文信息给出准确回答
- 如果信息不足，主动询问澄清

## 回答原则
- 简洁明了，直击要点
- 如有文档参考，优先基于文档内容回答
- 不确定时明确说明，不编造信息`;

// 生成带有 PDF 内容的 System Prompt
export function createSystemPrompt(pdfContent?: string): SystemMessage {
  if (!pdfContent) {
    return new SystemMessage(BASE_SYSTEM_PROMPT);
  }

  const promptWithPdf = `${BASE_SYSTEM_PROMPT}

## 用户上传的文档内容
以下是用户上传的 PDF 文档内容，请基于此回答用户的问题：

${pdfContent}`;

  return new SystemMessage(promptWithPdf);
}

// 默认 System Prompt（无 PDF）
export const SYSTEM_PROMPT = new SystemMessage(BASE_SYSTEM_PROMPT);
