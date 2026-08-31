// ============================================================
// CONFIG
// ============================================================

const API_URL =
    "http://127.0.0.1:8000";


// ============================================================
// ELEMENTS
// ============================================================

const fileInput =
    document.getElementById("fileInput");

const dropZone =
    document.getElementById("dropZone");

const uploadButton =
    document.getElementById("uploadButton");

const uploadStatus =
    document.getElementById("uploadStatus");

const selectedFileBox =
    document.getElementById("selectedFileBox");

const selectedFileName =
    document.getElementById("selectedFileName");

const selectedFileSize =
    document.getElementById("selectedFileSize");

const documentCard =
    document.getElementById("documentCard");

const documentName =
    document.getElementById("documentName");

const documentType =
    document.getElementById("documentType");

const documentChunks =
    document.getElementById("documentChunks");

const backendText =
    document.getElementById("backendText");

const connectionStatus =
    document.getElementById("connectionStatus");

const chatContainer =
    document.getElementById("chatContainer");

const welcomeScreen =
    document.getElementById("welcomeScreen");

const questionInput =
    document.getElementById("questionInput");

const sendButton =
    document.getElementById("sendButton");

const themeToggle =
    document.getElementById("themeToggle");

const clearChatButton =
    document.getElementById("clearChatButton");


// ============================================================
// STATE
// ============================================================

let selectedFile =
    null;

let uploadedDocument =
    null;


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadTheme();

        checkBackend();

        setupDragAndDrop();

        setupQuickQuestions();

        questionInput.focus();

    }
);


// ============================================================
// DARK MODE
// ============================================================

themeToggle.addEventListener(
    "click",
    () => {

        document.body.classList.toggle(
            "dark-mode"
        );

        const darkModeEnabled =
            document.body.classList.contains(
                "dark-mode"
            );

        themeToggle.textContent =
            darkModeEnabled
                ? "☀️"
                : "🌙";

        localStorage.setItem(
            "ragTheme",
            darkModeEnabled
                ? "dark"
                : "light"
        );

    }
);


function loadTheme() {

    const savedTheme =
        localStorage.getItem(
            "ragTheme"
        );


    if (
        savedTheme === "dark"
    ) {

        document.body.classList.add(
            "dark-mode"
        );

        themeToggle.textContent =
            "☀️";

    }

}


// ============================================================
// BACKEND CHECK
// ============================================================

async function checkBackend() {

    try {

        const response =
            await fetch(
                `${API_URL}/health`
            );


        if (!response.ok) {

            throw new Error(
                "Backend unavailable"
            );

        }


        const data =
            await response.json();


        backendText.textContent =
            "Online";


        connectionStatus.innerHTML = `
            <span class="online-dot"></span>
            Connected
        `;


        if (
            data.document_uploaded &&
            data.document
        ) {

            uploadedDocument =
                data.document;


            showExistingDocument(
                data.document
            );

        }

    }

    catch (error) {

        backendText.textContent =
            "Offline";


        connectionStatus.innerHTML = `
            <span style="color:#ef4444">
                ●
            </span>

            Offline
        `;

    }

}


// ============================================================
// FILE INPUT
// ============================================================

fileInput.addEventListener(
    "change",
    () => {

        if (
            fileInput.files.length === 0
        ) {

            return;

        }


        handleSelectedFile(
            fileInput.files[0]
        );

    }
);


// ============================================================
// DRAG & DROP
// ============================================================

function setupDragAndDrop() {


    [
        "dragenter",
        "dragover"
    ].forEach(
        eventName => {

            dropZone.addEventListener(
                eventName,
                event => {

                    event.preventDefault();

                    dropZone.classList.add(
                        "drag-active"
                    );

                }
            );

        }
    );


    [
        "dragleave",
        "drop"
    ].forEach(
        eventName => {

            dropZone.addEventListener(
                eventName,
                event => {

                    event.preventDefault();

                    dropZone.classList.remove(
                        "drag-active"
                    );

                }
            );

        }
    );


    dropZone.addEventListener(
        "drop",
        event => {

            const files =
                event.dataTransfer.files;


            if (
                files.length === 0
            ) {

                return;

            }


            handleSelectedFile(
                files[0]
            );

        }
    );

}


// ============================================================
// HANDLE FILE
// ============================================================

function handleSelectedFile(
    file
) {

    const extension =
        getExtension(
            file.name
        );


    if (
        extension !== "pdf" &&
        extension !== "txt"
    ) {

        showUploadError(
            "Only PDF and TXT files are supported."
        );

        return;

    }


    selectedFile =
        file;


    selectedFileName.textContent =
        file.name;


    selectedFileSize.textContent =
        formatFileSize(
            file.size
        );


    selectedFileBox.classList.remove(
        "hidden"
    );


    uploadStatus.textContent =
        "Document selected. Click Upload Document.";

}


// ============================================================
// FILE SIZE
// ============================================================

function formatFileSize(
    bytes
) {

    if (
        bytes < 1024
    ) {

        return `${bytes} B`;

    }


    if (
        bytes < 1024 * 1024
    ) {

        return `${(
            bytes / 1024
        ).toFixed(1)} KB`;

    }


    return `${(
        bytes /
        (1024 * 1024)
    ).toFixed(1)} MB`;

}


// ============================================================
// EXTENSION
// ============================================================

function getExtension(
    filename
) {

    return filename
        .split(".")
        .pop()
        .toLowerCase();

}


// ============================================================
// UPLOAD
// ============================================================

uploadButton.addEventListener(
    "click",
    uploadDocument
);


async function uploadDocument() {

    if (!selectedFile) {

        showUploadError(
            "Please select a document first."
        );

        return;

    }


    uploadButton.disabled =
        true;


    uploadButton.innerHTML =
        "⏳ Processing Document...";


    uploadStatus.textContent =
        "Extracting text and creating embeddings...";


    const formData =
        new FormData();


    formData.append(
        "file",
        selectedFile
    );


    try {

        const response =
            await fetch(
                `${API_URL}/upload`,
                {

                    method:
                        "POST",

                    body:
                        formData

                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.error ||
                "Upload failed"
            );

        }


        uploadedDocument =
            data.filename;


        uploadStatus.innerHTML = `
            <span class="upload-success">
                ✓ Document uploaded successfully
            </span>
        `;


        documentCard.classList.remove(
            "hidden"
        );


        documentName.textContent =
            data.filename;


        documentType.textContent =
            getExtension(
                data.filename
            ).toUpperCase();


        documentChunks.textContent =
            data.number_of_chunks;


        uploadButton.innerHTML =
            "✓ Document Ready";


        hideWelcome();


        addAssistantMessage(
            `Your document "${data.filename}" is ready. Ask me anything about it.`
        );


        questionInput.focus();

    }

    catch (error) {

        showUploadError(
            error.message
        );


        uploadButton.innerHTML =
            "⬆ Upload Document";

    }

    finally {

        uploadButton.disabled =
            false;

    }

}


// ============================================================
// EXISTING DOCUMENT
// ============================================================

function showExistingDocument(
    filename
) {

    documentCard.classList.remove(
        "hidden"
    );


    documentName.textContent =
        filename;


    documentType.textContent =
        getExtension(
            filename
        ).toUpperCase();


    documentChunks.textContent =
        "-";


    uploadStatus.innerHTML = `
        <span class="upload-success">
            ✓ Document already loaded
        </span>
    `;

}


// ============================================================
// UPLOAD ERROR
// ============================================================

function showUploadError(
    message
) {

    uploadStatus.innerHTML = `
        <span class="upload-error">
            ✕ ${escapeHtml(message)}
        </span>
    `;

}


// ============================================================
// SEND BUTTON
// ============================================================

sendButton.addEventListener(
    "click",
    sendQuestion
);


// ============================================================
// ENTER / SHIFT ENTER
// ============================================================

questionInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendQuestion();

        }

    }
);


// ============================================================
// AUTO-RESIZE TEXTAREA
// ============================================================

questionInput.addEventListener(
    "input",
    () => {

        questionInput.style.height =
            "auto";


        questionInput.style.height =
            `${Math.min(
                questionInput.scrollHeight,
                120
            )}px`;

    }
);


// ============================================================
// SEND QUESTION
// ============================================================

async function sendQuestion() {

    const question =
        questionInput.value.trim();


    if (!question) {

        return;

    }


    if (!uploadedDocument) {

        hideWelcome();


        addAssistantMessage(
            "Please upload a PDF or TXT document first."
        );


        return;

    }


    hideWelcome();


    addUserMessage(
        question
    );


    questionInput.value =
        "";


    questionInput.style.height =
        "auto";


    sendButton.disabled =
        true;


    const typingMessage =
        addTypingIndicator();


    try {

        const response =
            await fetch(
                `${API_URL}/ask`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            question:
                                question

                        })

                }
            );


        const data =
            await response.json();


        typingMessage.remove();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.error ||
                "Unable to answer the question."
            );

        }


        addAssistantMessage(
            data.answer,
            data.results || []
        );

    }

    catch (error) {

        typingMessage.remove();


        addAssistantMessage(
            `Error: ${error.message}`
        );

    }

    finally {

        sendButton.disabled =
            false;


        questionInput.focus();

    }

}


// ============================================================
// USER MESSAGE
// ============================================================

function addUserMessage(
    text
) {

    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "message user-message";


    wrapper.innerHTML = `

        <div class="message-content">

            <div class="message-bubble">
                ${escapeHtml(text)}
            </div>

            <div class="message-meta">
                You • ${getCurrentTime()}
            </div>

        </div>

    `;


    chatContainer.appendChild(
        wrapper
    );


    scrollToBottom();

}


// ============================================================
// ASSISTANT MESSAGE
// ============================================================

function addAssistantMessage(
    text,
    sources = []
) {

    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "message assistant-message";


    const messageContent =
        document.createElement(
            "div"
        );


    messageContent.className =
        "message-content";


    const bubble =
        document.createElement(
            "div"
        );


    bubble.className =
        "message-bubble";


    bubble.textContent =
        text;


    messageContent.appendChild(
        bubble
    );


    // ========================================================
    // META
    // ========================================================

    const meta =
        document.createElement(
            "div"
        );


    meta.className =
        "message-meta";


    meta.textContent =
        `AI Assistant • ${getCurrentTime()}`;


    messageContent.appendChild(
        meta
    );


    // ========================================================
    // ACTIONS
    // ========================================================

    const actions =
        document.createElement(
            "div"
        );


    actions.className =
        "message-actions";


    // COPY

    const copyButton =
        document.createElement(
            "button"
        );


    copyButton.className =
        "mini-button hover-pop";


    copyButton.textContent =
        "📋 Copy";


    copyButton.addEventListener(
        "click",
        async () => {

            await navigator.clipboard.writeText(
                text
            );


            copyButton.textContent =
                "✓ Copied";


            setTimeout(
                () => {

                    copyButton.textContent =
                        "📋 Copy";

                },
                1200
            );

        }
    );


    actions.appendChild(
        copyButton
    );


    // ========================================================
    // SOURCES BUTTON
    // ========================================================

    if (
        sources.length > 0
    ) {

        const sourceButton =
            document.createElement(
                "button"
            );


        sourceButton.className =
            "mini-button hover-pop";


        sourceButton.textContent =
            `📚 View Sources (${sources.length})`;


        actions.appendChild(
            sourceButton
        );


        const sourcesBox =
            createSourcesBox(
                sources
            );


        sourceButton.addEventListener(
            "click",
            () => {

                sourcesBox.classList.toggle(
                    "show"
                );


                const visible =
                    sourcesBox.classList.contains(
                        "show"
                    );


                sourceButton.textContent =
                    visible
                        ? "▲ Hide Sources"
                        : `📚 View Sources (${sources.length})`;

            }
        );


        messageContent.appendChild(
            actions
        );


        messageContent.appendChild(
            sourcesBox
        );

    }

    else {

        messageContent.appendChild(
            actions
        );

    }


    wrapper.appendChild(
        messageContent
    );


    chatContainer.appendChild(
        wrapper
    );


    scrollToBottom();


    return wrapper;

}


// ============================================================
// SOURCES
// ============================================================

function createSourcesBox(
    sources
) {

    const box =
        document.createElement(
            "div"
        );


    box.className =
        "sources-box";


    sources.forEach(
        (
            source,
            index
        ) => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "source-card";


            const similarity =
                source.score !== undefined
                    ? Number(
                        source.score
                    ).toFixed(3)
                    : "N/A";


            card.innerHTML = `

                <div class="source-header">

                    <span>
                        Source ${index + 1}
                    </span>

                    <span>
                        Similarity ${similarity}
                    </span>

                </div>

                <div class="source-content">
                    ${escapeHtml(
                        source.chunk || ""
                    )}
                </div>

            `;


            box.appendChild(
                card
            );

        }
    );


    return box;

}


// ============================================================
// TYPING INDICATOR
// ============================================================

function addTypingIndicator() {

    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "message assistant-message";


    wrapper.innerHTML = `

        <div class="message-content">

            <div class="message-bubble">

                <div class="typing-indicator">

                    <span></span>
                    <span></span>
                    <span></span>

                </div>

            </div>

        </div>

    `;


    chatContainer.appendChild(
        wrapper
    );


    scrollToBottom();


    return wrapper;

}


// ============================================================
// QUICK QUESTIONS
// ============================================================

function setupQuickQuestions() {

    document
        .querySelectorAll(
            ".quick-question"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        questionInput.value =
                            button.textContent.trim();


                        questionInput.focus();


                        if (
                            uploadedDocument
                        ) {

                            sendQuestion();

                        }

                    }
                );

            }
        );

}


// ============================================================
// CLEAR CHAT
// ============================================================

clearChatButton.addEventListener(
    "click",
    () => {

        const messages =
            chatContainer.querySelectorAll(
                ".message"
            );


        messages.forEach(
            message =>
                message.remove()
        );


        welcomeScreen.classList.remove(
            "hidden"
        );


        welcomeScreen.style.display =
            "block";


        questionInput.value =
            "";


        questionInput.focus();

    }
);


// ============================================================
// HIDE WELCOME
// ============================================================

function hideWelcome() {

    welcomeScreen.style.display =
        "none";

}


// ============================================================
// TIME
// ============================================================

function getCurrentTime() {

    return new Date()
        .toLocaleTimeString(
            [],
            {

                hour:
                    "2-digit",

                minute:
                    "2-digit"

            }
        );

}


// ============================================================
// SCROLL
// ============================================================

function scrollToBottom() {

    setTimeout(
        () => {

            chatContainer.scrollTo({

                top:
                    chatContainer.scrollHeight,

                behavior:
                    "smooth"

            });

        },
        50
    );

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(
    text
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        String(text);


    return div.innerHTML;

}