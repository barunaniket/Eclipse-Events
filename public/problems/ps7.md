# PS7 — Proving Ownership of AI Models

> **Domain:** AI Security / Trustworthy AI

---

## Problem Statement

Developing AI models requires significant time, expertise, and computational resources; once released, these models can be copied, modified, or reused without acknowledging the original owner of the models. The goal is to design a solution that embeds a verifiable ownership mechanism within the model, allowing the owner to prove ownership even after the model has been shared, deployed, or altered. This solution should work in both **black-box scenarios (such as API access) and white-box scenarios (full access to model internals)**, remain verifiable despite modifications like fine-tuning or compression, and operate without degrading the model's performance, accuracy, or efficiency.

---

## Key Objectives

- Establish a reliable way to prove model ownership through both white-box and black-box conditions
- Remain effective despite fine-tuning, compression, or structural changes
- Preserve performance, accuracy, and efficiency
- Ensure validation is secure and resistant to tampering

---

## Models / Resources

| Resource | Details |
|---|---|
| Supported model types | ML/DL models, Computer Vision models, and Language models (open-source LLMs) |

---

## Expected Output

- **Ownership embedding mechanism** — a method to embed verifiable ownership into a model
- **Ownership verification mechanism** — a method to prove ownership under both black-box and white-box conditions
- **Robustness demonstration** — evidence that ownership survives model modifications (fine-tuning, compression, structural changes)
- **Performance evaluation** — accuracy impact analysis (if any) and inference overhead measurements
