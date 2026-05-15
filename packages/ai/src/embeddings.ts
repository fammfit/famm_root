import { getOpenAIClient, MODELS } from "./client";

export async function embed(text: string): Promise<number[]> {
  const client = getOpenAIClient();
  const response = await client.embeddings.create({
    model: MODELS.EMBEDDING_SMALL,
    input: text,
    encoding_format: "float",
  });
  const embedding = response.data[0]?.embedding;
  if (!embedding) throw new Error("No embedding returned");
  return embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const client = getOpenAIClient();
  const response = await client.embeddings.create({
    model: MODELS.EMBEDDING_SMALL,
    input: texts,
    encoding_format: "float",
  });
  return response.data.map((d) => d.embedding);
}
