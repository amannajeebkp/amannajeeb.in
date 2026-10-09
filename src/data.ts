export const profile = {
  name: "Aman Najeeb",
  short: "NJ",
  role: "AI Engineer",
  tagline: "I build minds for machines.",
  bio: "Intelligent systems that ship. From fine-tuning LLMs to production ML pipelines, I turn research into products people actually use.",
  location: "Dubai, UAE",
  email: "hello@amannajeeb.in",
  linkedin: "https://www.linkedin.com/in/amannajeebkp/",
  github: "https://github.com/amannajeebkp",
  whatsapp: "https://wa.me/919659700100",
};

export const pillars = [
  {
    title: "Language models, in production",
    body: "Fine-tuning, RAG, evals and inference optimisation — the parts that decide whether an LLM feature survives contact with real users.",
  },
  {
    title: "Vision on the edge",
    body: "Detection and inspection models deployed on factory floors and devices, with active-learning loops that keep them sharp.",
  },
  {
    title: "Research to product",
    body: "I read the paper, build the prototype, and own the pipeline until it runs quietly at scale.",
  },
];

export const projects = [
  {
    id: "01",
    title: "NeuraChat",
    subtitle: "Production RAG assistant",
    description:
      "Enterprise chatbot grounded on 50k+ internal documents. Hybrid retrieval, reranking and an eval pipeline cut hallucinations by 62%.",
    tags: ["LangChain", "pgvector", "FastAPI", "React"],
    year: "2025",
  },
  {
    id: "02",
    title: "VisionGuard",
    subtitle: "Real-time defect detection",
    description:
      "Edge-deployed YOLOv8 pipeline inspecting 1,200 parts a minute on factory lines, with an active-learning loop for continuous improvement.",
    tags: ["PyTorch", "ONNX", "TensorRT", "OpenCV"],
    year: "2024",
  },
  {
    id: "03",
    title: "PromptForge",
    subtitle: "LLM ops platform",
    description:
      "Open-source toolkit for prompt versioning, A/B testing and cost tracking across model providers.",
    tags: ["TypeScript", "OpenAI", "Anthropic", "Postgres"],
    year: "2024",
  },
  {
    id: "04",
    title: "EchoSense",
    subtitle: "Speech intelligence API",
    description:
      "Low-latency ASR and sentiment service processing 10M+ minutes. Whisper fine-tunes served with dynamic batching on Triton.",
    tags: ["Whisper", "Triton", "gRPC", "Kubernetes"],
    year: "2023",
  },
];

export const skills = [
  { category: "Machine learning", items: ["PyTorch", "TensorFlow", "scikit-learn", "XGBoost", "Transformers"] },
  { category: "LLMs & GenAI", items: ["RAG", "Fine-tuning (LoRA)", "LangChain", "Vector DBs", "Evals"] },
  { category: "Engineering", items: ["Python", "TypeScript", "FastAPI", "Docker", "AWS"] },
  { category: "Data", items: ["PostgreSQL", "Spark", "Airflow", "Kafka", "Pandas"] },
];
