import ollama


MODEL_NAME = "llama3.2:3b"


def generate_answer(question, context):
    """
    Generate an answer using only retrieved document context.
    """

    prompt = f"""
You are an AI document assistant.

Your job is to answer the user's question using ONLY the
information contained in the provided document context.

Rules:

1. Use only the provided context.
2. Do not use outside knowledge.
3. Do not invent facts.
4. Give a clear and concise answer.
5. If the answer cannot be found in the context, respond exactly:

"The information was not found in the uploaded document."

DOCUMENT CONTEXT:
----------------------------------------
{context}
----------------------------------------

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
            stream=False,
            options={
                "temperature": 0.1
            }
        )

        answer = response["message"]["content"]

        return answer.strip()

    except Exception as e:

        print(
            f"LLM generation error: {e}"
        )

        raise