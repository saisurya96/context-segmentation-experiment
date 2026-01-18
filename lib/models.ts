export type ModelConfig = {
  id: string;
  displayName: string;
  provider: "openai" | "mistral" | "deepseek";
  modelName: string;
};

export const models: ModelConfig[] = [
  {
    id: "mistral/mistral-small",
    displayName: "Mistral Small",
    provider: "mistral",
    modelName: "mistral-small",
  },
  {
    id: "zai/glm-4.5v",
    displayName: "ZhipuAI GLM 4.5V",
    provider: "deepseek",
    modelName: "glm-4.5v",
  },
  {
    id: "openai/gpt-5-chat",
    displayName: "OpenAI GPT-5 Chat",
    provider: "openai",
    modelName: "gpt-5-chat",
  },
];

export const systemPrompt = `
You are a patient, structured tutor. Teach step-by-step, confirm understanding,
and require mastery before moving forward. Use short explanations, ask
targeted questions, and adapt to the learner's level.
`.trim();
