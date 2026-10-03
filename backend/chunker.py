def chunk_text(text, chunk_size=1000, overlap=150):
    """
    Split document text into overlapping chunks.

    chunk_size:
        Maximum approximate characters per chunk.

    overlap:
        Number of characters shared between consecutive chunks.
    """

    if not text:
        return []

    text = text.replace("\r\n", "\n").replace("\r", "\n").strip()

    chunks = []

    start = 0
    text_length = len(text)

    while start < text_length:

        end = min(start + chunk_size, text_length)

        # Try to end the chunk at a natural boundary.
        if end < text_length:

            search_start = start + (chunk_size // 2)

            paragraph_break = text.rfind(
                "\n\n",
                search_start,
                end
            )

            sentence_break = text.rfind(
                ". ",
                search_start,
                end
            )

            space_break = text.rfind(
                " ",
                search_start,
                end
            )

            best_break = max(
                paragraph_break,
                sentence_break,
                space_break
            )

            if best_break > start:
                end = best_break + 1

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= text_length:
            break

        next_start = end - overlap

        # Safety against infinite loops
        if next_start <= start:
            next_start = end

        start = next_start

    return chunks