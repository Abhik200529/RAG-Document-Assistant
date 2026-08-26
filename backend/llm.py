import ollama


MODEL_NAME = "llama3.2:3b"


def generate_answer(question, context):
    """
    Generate an answer strictly from retrieved document context.
    """

    prompt = f"""
You are a Retrieval-Augmented Generation document assistant.

Answer the user's question using ONLY the DOCUMENT CONTEXT below.

Instructions:

- Carefully read all of the provided context.
- The context may contain question-and-answer pairs.
- If the context contains information that answers the user's question,
  provide that answer clearly.
- You may rewrite the information into a natural sentence.
- Do not require an exact wording match.
- Do not use outside knowledge.
- Do not invent facts.
- Only say that information is missing when the context truly does not
  contain enough information to answer.

If the answer is genuinely unavailable, reply exactly:

The information was not found in the uploaded document.

DOCUMENT CONTEXT:
==================================================
{context}
==================================================

USER QUESTION:
{question}

ANSWER:
"""

    try:

        response = ollama.chat(
            model=MODEL_NAME,

            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],

            options={
                "temperature": 0.1
            }
        )

        answer = (
            response["message"]["content"]
            .strip()
        )

        if not answer:

            return (
                "The information was not found "
                "in the uploaded document."
            )

        return answer

    except Exception as error:

        raise RuntimeError(
            f"Ollama error: {error}"
        )