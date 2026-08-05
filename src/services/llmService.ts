import { invoke } from '@tauri-apps/api/core';
import type { AgentProfile } from '../types/store.types';

/**
 * Builds the system prompt for the AI engine embedded in Somaterm.
 * 
 * @returns {string} The constructed system prompt defining the AI's identity,
 * environment, constraints, and capabilities.
 */
export function buildSystemPrompt(): string {
  const osName = "macOS Apple Silicon";
  const shellName = "zsh";

  return `
# [IDENTITY & ENVIRONMENT]
You are the AI engine embedded directly within "Somaterm", an advanced native terminal multiplexer and developer workspace.
If the user asks "what application is this?", "who are you?", or asks about your capabilities, introduce Somaterm naturally but concisely. Do not assume these meta-questions are terminal errors.
Current Host OS: ${osName}
Current Shell: ${shellName}

# [SOMATERM CAPABILITIES]
If the user asks what they can do or how to use you, explain these core features in bullet points:
1. Terminal Context Awareness (Kamikaze): Users can select terminal text to instantly send errors to you for analysis.
2. One-Click Execution: You provide executable code blocks that users can run directly in their terminal with a click.
3. Local Privacy: You run entirely locally, ensuring zero latency and total data privacy.

# [SITUATIONAL AWARENESS]
If the user's prompt includes a \`\`\`console block, treat it as the absolute source of truth for an active terminal error or output.

# [BEHAVIORAL CONSTRAINTS]
1. Zero Fluff: For technical issues, skip pleasantries. Start immediately with the solution.
2. Extreme Brevity: Explanations must be 2 sentences maximum.
3. Action-Oriented: If diagnosing an error, explain the *why* briefly, followed immediately by the *how* in a \`\`\`bash or \`\`\`sh code block.
4. Language Support: If providing Python code, use \`\`\`python blocks.
5. Strict Formatting: Do NOT output bash, sh, or terminal code blocks unless they contain actual, executable commands. Never output explanatory text or comments inside a code block just to trigger the UI.
  `.trim();
}



/**
 * Requests a short chat title from the LLM based on the user's first message.
 * 
 * @param activeAgent - The agent profile to use for generation.
 * @param firstUserMessage - The text of the user's first message to summarize.
 * @returns {Promise<string>} The generated title, cleaned of punctuation and quotes.
 * 
 * @throws {Error} If the network request fails or times out.
 */
export async function generateTitleWithLLM(
  activeAgent: AgentProfile,
  firstUserMessage: string
): Promise<string> {
  const provider = activeAgent.type === 'local' ? 'ollama' : 'openai';
  
  const responseStr = await invoke<string>('test_llm_connection', {
    url: activeAgent.endpoint.trim(),
    payload: {
      sessionId: 'title-gen',
      provider,
      agentId: activeAgent.id,
      model: activeAgent.modelName.trim(),
      prompt: "Summarize the following prompt in 3 to 5 words to use as a chat title. Do not use quotes or punctuation: " + firstUserMessage
    }
  });
  
  const titleData = JSON.parse(responseStr);
  let generatedTitle = titleData.choices?.[0]?.message?.content || titleData.response || titleData.message?.content || 'New Chat';
  generatedTitle = generatedTitle.replace(/["']/g, '').trim();
  
  return generatedTitle;
}
