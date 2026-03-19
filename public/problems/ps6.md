# PS6 — Zintoo: AI-Powered Hyper-Local Fashion Intelligence Platform

> **Domain:** Recommendation Systems / Multimodal AI / Agentic Workflows / Real-Time Commerce

---

## Problem Statement

Zintoo is a quick-commerce fashion platform delivering curated apparel to customers' doorsteps within 60 minutes, with a live Try-and-Buy feature where the delivery agent waits for the customer to try the item and processes instant refunds on the spot. While the logistics infrastructure is in place, the platform currently lacks an intelligent AI layer that can personalise the shopping experience, predict demand at a hyper-local level, and dynamically manage inventory across micro-warehouses.

Build an end-to-end AI system that solves three interconnected challenges for Zintoo: **(1)** a multimodal fashion recommendation engine that understands style preferences from natural language and image inputs; **(2)** a real-time, hyper-local demand forecasting module that predicts SKU-level demand for specific pin codes within a 5 km radius; and **(3)** an agentic inventory orchestration layer that autonomously reallocates stock across micro-warehouses to maximise fulfilment rates and minimise 60-minute SLA breaches.

---

## Key Objectives

- Build a multimodal recommendation engine accepting user text queries (e.g., *"casual kurta for a college fest"*) and/or uploaded outfit images to return ranked product suggestions from a synthetic catalogue
- Implement a hyper-local demand forecasting model using time-series and contextual signals (weather, local events, day-of-week, historical returns) to predict hourly SKU-level demand per pin code
- Design an agentic inventory orchestration system that interprets demand forecasts and autonomously issues reallocation instructions across mock micro-warehouses to prevent stockouts
- Expose all three modules via a unified API or interactive demo dashboard that simulates the end-to-end customer-to-warehouse flow
- Evaluate recommendation quality (precision@k, NDCG), forecast accuracy (MAPE, RMSE), and SLA fulfilment rate improvement as measurable outcomes

---

## Datasets / Resources

| Resource | Link |
|---|---|
| Fashion Product Images Dataset (Kaggle) | https://www.kaggle.com/datasets/paramaggarwal/fashion-product-images-dataset |
| H&M Personalized Fashion Recommendations (Kaggle) | https://www.kaggle.com/competitions/h-and-m-personalized-fashion-recommendations |
| Open-Meteo API (real-time weather context) | https://open-meteo.com/ |
| Synthetic micro-warehouse inventory | Generate using schema: `product_id, sku, warehouse_id, pincode, current_stock, reorder_threshold` |
| LangChain / LangGraph (agentic orchestration) | https://www.langchain.com/langgraph |
| CLIP or BLIP-2 (multimodal image-text understanding) | https://huggingface.co/openai/clip-vit-base-patch32 |

---

## Expected Output

- **Multimodal recommendation interface** — accepts text and/or image input and returns top-k product cards with similarity scores
- **Demand forecast dashboard** — shows predicted hourly demand per SKU per pin code with confidence intervals, plotted as a time-series chart
- **Agentic inventory log** — a structured trace of autonomous reallocation decisions (e.g., *"Transfer 12 units of SKU-4821 from Warehouse W3 to W7 – forecasted demand spike at 6 PM"*)
- **Evaluation report** — quantitative metrics for each module plus a brief explanation of design trade-offs
- **Demo (Streamlit / FastAPI / web UI)** — end-to-end walkthrough of a simulated customer order triggering the full pipeline
