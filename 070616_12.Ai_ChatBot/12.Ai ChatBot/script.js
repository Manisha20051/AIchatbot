let prompt = document.querySelector("#prompt");
let submitbtn = document.querySelector("#submit");
let chatContainer = document.querySelector(".chat-container");
let imagebtn = document.querySelector("#image");
let image = document.querySelector("#image img");
let imageinput = document.querySelector("#image input");

const Api_Key = "AIzaSyCaCbI27JOYCtI-LtBAQvghjJBRHbWkegk"; // Replace with your key
const Api_Url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${Api_Key}`;
// ------------------------

let user = {
    message: null,
    file: {
        mime_type: null,
        data: null
    }
};
 
const allowedKeywords = [
    "waste", "garbage", "trash", "recycle", "recycling", "compost",
    "composting", "landfill", "disposal", "rubbish", "litter",
    "pollution", "sustainability", "environment", "plastic", "paper",
    "glass", "metal", "ewaste", "e-waste", "electronic waste", "food waste",
    "hazardous", "reduce", "reuse", "sort", "bin", "management"
];

// Function to check if the message is related to allowed topics
function isTopicAllowed(message) {
    if (!message) return false; // Handle empty message case
    const lowerCaseMessage = message.toLowerCase();
    // Check if the message contains at least one of the allowed keywords
    return allowedKeywords.some(keyword => lowerCaseMessage.includes(keyword));
}

async function generateResponse(aiChatBox) {
    let text = aiChatBox.querySelector(".ai-chat-area");

    // Construct the parts array dynamically
    const parts = [{ text: user.message }];
    if (user.file.data) {
        parts.push({ inline_data: user.file });
    }

    let RequestOption = {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            "contents": [{ "parts": parts }] // Use the dynamically constructed parts array
        })
    };

    try {
        let response = await fetch(Api_Url, RequestOption);
        if (!response.ok) {
            // Handle API errors (like bad request, invalid key etc.)
            const errorData = await response.json();
            console.error("API Error:", errorData);
            text.innerHTML = `Sorry, there was an error contacting the AI service. (Status: ${response.status})`;
            return; // Exit early on error
        }
        let data = await response.json();

        // Defensive check for response structure
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) {
            let apiResponse = data.candidates[0].content.parts[0].text;
            // Basic formatting improvement (replace **bold** with <b> tags for HTML)
            apiResponse = apiResponse.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>").trim();
            // You might want more sophisticated Markdown parsing here if needed
            text.innerHTML = apiResponse;
        } else if (data.promptFeedback && data.promptFeedback.blockReason) {
             // Handle content safety blocks
             console.warn("API Blocked:", data.promptFeedback.blockReason);
             text.innerHTML = `Sorry, my response was blocked due to safety reasons (${data.promptFeedback.blockReason}). Please try rephrasing your request.`;
        }
         else {
            console.error("Unexpected API response structure:", data);
            text.innerHTML = "Sorry, I received an unexpected response from the AI.";
        }

    } catch (error) {
        console.error("Fetch Error:", error);
        text.innerHTML = "Sorry, I couldn't fetch a response. Please check your connection or the API key.";
    } finally {
        // Always scroll and reset image/user file state
        chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });
        image.src = `img.svg`;
        image.classList.remove("choose");
        user.file = { mime_type: null, data: null }; // Clear file data after processing
    }
}

function createChatBox(html, classes) {
    let div = document.createElement("div");
    div.innerHTML = html;
    div.classList.add(classes);
    return div;
}

// --- MODIFIED handlechatResponse Function ---
function handlechatResponse(userMessage) {
    userMessage = userMessage.trim(); // Remove leading/trailing whitespace
    if (!userMessage && !user.file.data) return; // Exit if both message and image are empty

    // Store the message regardless for display purposes
    user.message = userMessage;

    // --- Display User's Chat ---
    let userHtml = `<img src="user.png" alt="" id="userImage" width="8%">
    <div class="user-chat-area">
    ${user.message ? user.message : ""} <!-- Display message only if it exists -->
    ${user.file.data ? `<img src="data:${user.file.mime_type};base64,${user.file.data}" class="chooseimg" alt="Uploaded image"/>` : ""}
    </div>`;
    prompt.value = ""; // Clear input field immediately
    let userChatBox = createChatBox(userHtml, "user-chat-box");
    chatContainer.appendChild(userChatBox);
    chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });


    // --- Topic Restriction Check ---
    // Allow if there's an image (user might ask "what type of waste is this?") OR if text is allowed topic
    const proceedWithAI = user.file.data || isTopicAllowed(user.message);

    setTimeout(() => {
        let aiHtml = "";
        let aiChatBox;

        if (proceedWithAI) {
            // --- Show Loading & Call API ---
            aiHtml = `<img src="ai.png" alt="" id="aiImage" width="10%">
                      <div class="ai-chat-area">
                          <img src="loading.webp" alt="" class="load" width="50px">
                      </div>`;
            aiChatBox = createChatBox(aiHtml, "ai-chat-box");
            chatContainer.appendChild(aiChatBox);
            chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" }); // Scroll again after adding AI box
            generateResponse(aiChatBox); // Call the API function
        } else {
            // --- Show Restriction Message ---
            aiHtml = `<img src="ai.png" alt="" id="aiImage" width="10%">
                      <div class="ai-chat-area">
                          I apologize, but I can only assist with questions related to waste, recycling, and associated environmental topics. Please ask a relevant question.
                      </div>`;
            aiChatBox = createChatBox(aiHtml, "ai-chat-box");
            chatContainer.appendChild(aiChatBox);
            chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" }); // Scroll again

             // Reset user file if the text was irrelevant
            image.src = `img.svg`;
            image.classList.remove("choose");
            user.file = { mime_type: null, data: null };
            user.message = null; // Clear the irrelevant message state as well
        }
    }, 600); // Delay for AI response appearance
}
// --- End of MODIFIED handlechatResponse Function ---


prompt.addEventListener("keydown", (e) => {
    // Allow Shift+Enter for new lines, only submit on Enter alone
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault(); // Prevent default newline behavior in textarea
        handlechatResponse(prompt.value);
    }
});

submitbtn.addEventListener("click", () => {
    handlechatResponse(prompt.value);
});

imageinput.addEventListener("change", () => {
    const file = imageinput.files[0];
    if (!file) return;

    // Optional: Add file type/size validation here if needed
    // e.g., if (!file.type.startsWith("image/")) { alert("Please select an image file."); return; }
    // e.g., if (file.size > 5 * 1024 * 1024) { alert("File size exceeds 5MB limit."); return; }


    let reader = new FileReader();
    reader.onload = (e) => {
        let base64string = e.target.result.split(",")[1];
        user.file = {
            mime_type: file.type,
            data: base64string
        };
        image.src = `data:${user.file.mime_type};base64,${user.file.data}`;
        image.classList.add("choose");
    };
    reader.onerror = (error) => {
        console.error("FileReader error: ", error);
        alert("Failed to read the selected file.");
         // Reset file state on error
        user.file = { mime_type: null, data: null };
        image.src = `img.svg`;
        image.classList.remove("choose");
    }

    reader.readAsDataURL(file);

     // Clear the file input value so the same file can be selected again if needed
     imageinput.value = null;
});

imagebtn.addEventListener("click", () => {
    imagebtn.querySelector("input").click();
});