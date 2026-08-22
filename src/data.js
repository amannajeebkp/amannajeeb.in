export const profile = {
  name: "Aman Najeeb",
  role: "AI Engineer",
  domain: "amannajeeb.in",
  email: "hello@amannajeeb.in",
  location: "India",
  bio: "I build intelligent systems that ship. From fine-tuning LLMs to deploying production ML pipelines, I turn research into products people actually use.",
  socials: {
    github: "https://github.com/amannajeeb",
    linkedin: "https://linkedin.com/in/amannajeeb",
    x: "https://x.com/amannajeeb",
  },
};

export const skills = [
  {
    category: "Machine Learning",
    items: ["PyTorch", "TensorFlow", "scikit-learn", "XGBoost", "Transformers"],
  },
  {
    category: "LLMs & GenAI",
    items: ["OpenAI API", "LangChain", "RAG", "Fine-tuning (LoRA)", "Vector DBs"],
  },
  {
    category: "Engineering",
    items: ["Python", "TypeScript", "FastAPI", "Docker", "AWS"],
  },
  {
    category: "Data",
    items: ["PostgreSQL", "Spark", "Airflow", "Kafka", "Pandas"],
  },
];

export const projects = [
  {
    id: "01",
    title: "NeuraChat",
    subtitle: "Production RAG assistant",
    description:
      "Enterprise chatbot grounded on 50k+ internal docs. Hybrid retrieval, reranking and eval pipeline cut hallucinations by 62%.",
    tags: ["LangChain", "pgvector", "FastAPI", "React"],
    year: "2025",
  },
  {
    id: "02",
    title: "VisionGuard",
    subtitle: "Real-time defect detection",
    description:
      "Edge-deployed YOLOv8 pipeline inspecting 1200 parts/min on factory lines, with active-learning loop for continuous improvement.",
    tags: ["PyTorch", "ONNX", "TensorRT", "OpenCV"],
    year: "2024",
  },
  {
    id: "03",
    title: "PromptForge",
    subtitle: "LLM ops platform",
    description:
      "Open-source toolkit for prompt versioning, A/B testing and cost tracking across model providers. 1.2k GitHub stars.",
    tags: ["TypeScript", "OpenAI", "Anthropic", "Postgres"],
    year: "2024",
  },
  {
    id: "04",
    title: "EchoSense",
    subtitle: "Speech intelligence API",
    description:
      "Low-latency ASR + sentiment service processing 10M+ minutes. Whisper fine-tunes served with dynamic batching on Triton.",
    tags: ["Whisper", "Triton", "gRPC", "Kubernetes"],
    year: "2023",
  },
];

export const experience = [
  {
    role: "AI Engineer",
    company: "Stealth Startup",
    period: "2024 — Present",
    summary: "Leading LLM product development — RAG systems, evals, and inference optimization.",
  },
  {
    role: "Machine Learning Engineer",
    company: "TechCorp",
    period: "2022 — 2024",
    summary: "Built and shipped CV models to production edge devices across 3 product lines.",
  },
  {
    role: "Data Scientist",
    company: "AnalyticsLab",
    period: "2021 — 2022",
    summary: "Forecasting and NLP models for fintech clients; owned the full model lifecycle.",
  },
];
