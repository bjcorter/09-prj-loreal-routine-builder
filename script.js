/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
// Add reference to the new search input
const productSearch = document.getElementById("productSearch");

const workerUrl = "https://loreal-ai-chatbot.bjcorter.workers.dev/";

/* Store selected products in an array */
let selectedProducts = [];

/* Store the chat history as an array of messages */
let chatHistory = [];

/* Store all loaded products for filtering */
let allProducts = [];

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  // Only load once and cache for filtering
  if (allProducts.length > 0) return allProducts;
  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;
  return allProducts;
}

/* Helper functions for localStorage */
// Save selected products to localStorage
function saveSelectedProducts() {
  // Only save the product IDs to keep it simple for beginners
  const ids = selectedProducts.map((p) => p.id);
  localStorage.setItem("selectedProducts", JSON.stringify(ids));
}

// Load selected products from localStorage (returns array of IDs)
function loadSelectedProductIds() {
  const data = localStorage.getItem("selectedProducts");
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }
  return [];
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  // Show product cards and visually mark selected ones
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card${
      selectedProducts.some((p) => p.id === product.id) ? " selected" : ""
    }" 
         data-product-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <button class="show-desc-btn" title="Show description" aria-label="Show description">
          <i class="fa fa-circle-info"></i>
        </button>
      </div>
      <div class="product-description-overlay" tabindex="-1">
        <button class="close-desc-btn" title="Close" aria-label="Close description">&times;</button>
        <strong>Description:</strong>
        <div>${product.description}</div>
      </div>
    </div>
  `
    )
    .join("");

  // Add click event listeners to each product card for selection
  const cards = productsContainer.querySelectorAll(".product-card");
  cards.forEach((card) => {
    // Toggle selection on card click (but not when clicking info/close buttons)
    card.addEventListener("click", (e) => {
      // If the click is on the info or close button, do not toggle selection
      if (
        e.target.closest(".show-desc-btn") ||
        e.target.closest(".close-desc-btn")
      ) {
        return;
      }
      const productId = card.getAttribute("data-product-id");
      const product = products.find((p) => p.id == productId);

      // Toggle selection
      const alreadySelected = selectedProducts.some((p) => p.id == productId);
      if (alreadySelected) {
        selectedProducts = selectedProducts.filter((p) => p.id != productId);
      } else {
        selectedProducts.push(product);
      }
      // Update UI
      displayProducts(products);
      updateSelectedProductsList();
      saveSelectedProducts(); // <-- Save after change
    });

    // Show description overlay when info button is clicked
    const showDescBtn = card.querySelector(".show-desc-btn");
    const descOverlay = card.querySelector(".product-description-overlay");
    if (showDescBtn && descOverlay) {
      showDescBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        card.classList.add("show-description");
        descOverlay.focus();
      });
    }
    // Hide description overlay when close button is clicked
    const closeDescBtn = card.querySelector(".close-desc-btn");
    if (closeDescBtn && descOverlay) {
      closeDescBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        card.classList.remove("show-description");
      });
    }
    // Also close overlay if user presses Escape while overlay is focused
    descOverlay.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        card.classList.remove("show-description");
      }
    });
  });
}

/* Update the Selected Products section */
function updateSelectedProductsList() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `<div class="placeholder-message">No products selected yet.</div>`;
    // Hide clear all button if present
    const clearBtn = document.getElementById("clearAllBtn");
    if (clearBtn) clearBtn.style.display = "none";
    saveSelectedProducts();
    return;
  }
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-product-item" data-product-id="${product.id}">
        ${product.name}
        <button class="selected-product-remove" title="Remove" aria-label="Remove product">&times;</button>
      </div>
    `
    )
    .join("");

  // Add "Clear All" button if not already present
  let clearBtn = document.getElementById("clearAllBtn");
  if (!clearBtn) {
    clearBtn = document.createElement("button");
    clearBtn.id = "clearAllBtn";
    clearBtn.textContent = "Clear All";
    clearBtn.className = "generate-btn";
    clearBtn.style.marginTop = "10px";
    clearBtn.style.background = "#c00";
    clearBtn.style.color = "#fff";
    clearBtn.style.fontSize = "16px";
    clearBtn.style.fontWeight = "400";
    clearBtn.style.border = "none";
    clearBtn.style.borderRadius = "8px";
    clearBtn.style.cursor = "pointer";
    clearBtn.style.display = "block";
    // Add event listener for clearing all
    clearBtn.addEventListener("click", () => {
      selectedProducts = [];
      saveSelectedProducts();
      updateSelectedProductsList();
      // If a category is selected, re-render grid to update highlights
      const selectedCategory = categoryFilter.value;
      if (selectedCategory) {
        loadProducts().then((products) => {
          const filtered = products.filter(
            (p) => p.category === selectedCategory
          );
          displayProducts(filtered);
        });
      }
    });
    // Insert after the selectedProductsList
    selectedProductsList.parentNode.appendChild(clearBtn);
  } else {
    clearBtn.style.display = "block";
  }

  // Add event listeners to remove buttons
  const removeBtns = selectedProductsList.querySelectorAll(
    ".selected-product-remove"
  );
  removeBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent triggering card click
      const parent = btn.closest(".selected-product-item");
      const productId = parent.getAttribute("data-product-id");
      selectedProducts = selectedProducts.filter((p) => p.id != productId);
      saveSelectedProducts();
      // Refresh UI
      // If a category is selected, re-render grid to update highlights
      const selectedCategory = categoryFilter.value;
      if (selectedCategory) {
        loadProducts().then((products) => {
          const filtered = products.filter(
            (p) => p.category === selectedCategory
          );
          displayProducts(filtered);
        });
      }
      updateSelectedProductsList();
    });
  });

  // Save to localStorage whenever the list is updated
  saveSelectedProducts();
}

/* Helper: filter products by category and search */
function getFilteredProducts() {
  // Get selected category and search value
  const selectedCategory = categoryFilter.value;
  const searchValue = productSearch.value.trim().toLowerCase();

  // Start with all products
  let filtered = allProducts;

  // Filter by category if selected and not "all"
  if (selectedCategory && selectedCategory !== "all") {
    filtered = filtered.filter(
      (product) => product.category === selectedCategory
    );
  }

  // Filter by search if searchValue is not empty
  if (searchValue) {
    filtered = filtered.filter((product) => {
      // Search in name, brand, and description (beginner-friendly)
      return (
        product.name.toLowerCase().includes(searchValue) ||
        product.brand.toLowerCase().includes(searchValue) ||
        product.description.toLowerCase().includes(searchValue)
      );
    });
  }

  return filtered;
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  // Ensure products are loaded
  await loadProducts();
  // Show filtered products
  const filteredProducts = getFilteredProducts();
  displayProducts(filteredProducts);
});

/* Filter and display products when search input changes */
productSearch.addEventListener("input", async () => {
  // Ensure products are loaded
  await loadProducts();
  // Show filtered products
  const filteredProducts = getFilteredProducts();
  displayProducts(filteredProducts);
});

/* Chat form submission handler - connects to Cloudflare Worker (no API key in repo) */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get the user's message from the input field
  const userInput = document.getElementById("userInput").value;

  // Show user's message in the chat window
  chatWindow.innerHTML += `
    <div class="chat-message user">
      <strong>You:</strong> ${userInput}
    </div>
  `;

  // Show a loading message while waiting for the AI response
  chatWindow.innerHTML += `
    <div class="chat-message ai">
      <em>Thinking...</em>
    </div>
  `;

  // Scroll to the bottom of the chat window
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Add user's message to chat history
  chatHistory.push({ role: "user", content: userInput });

  // Replace this URL with your deployed Cloudflare Worker endpoint
  const workerUrl = "https://loreal-ai-chatbot.bjcorter.workers.dev/";

  // Prepare the request body for the Cloudflare Worker
  const requestBody = {
    chatHistory: chatHistory, // send the whole conversation
  };

  try {
    // Send the request to your Cloudflare Worker using fetch and async/await
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    // Parse the response as JSON
    const data = await response.json();

    // Remove the loading message
    const messages = chatWindow.querySelectorAll(".chat-message.ai em");
    if (messages.length > 0) {
      messages[messages.length - 1].parentElement.remove();
    }

    // Check if the Worker returned a valid response
    if (data && data.reply) {
      // Show the AI's reply in the chat window
      chatWindow.innerHTML += `
        <div class="chat-message ai">
          <strong>L'Oréal AI:</strong> ${data.reply}
        </div>
      `;

      // Add AI's reply to chat history
      chatHistory.push({ role: "assistant", content: data.reply });
    } else {
      // Show an error message if something went wrong
      chatWindow.innerHTML += `
        <div class="chat-message ai error">
          <strong>Error:</strong> Sorry, I couldn't get a response. Please try again.
        </div>
      `;
    }
  } catch (error) {
    // Show an error message if the request failed
    chatWindow.innerHTML += `
      <div class="chat-message ai error">
        <strong>Error:</strong> ${error.message}
      </div>
    `;
  }

  // Scroll to the bottom after new message
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Clear the input field
  document.getElementById("userInput").value = "";
});

// Get reference to the "Generate Routine" button
const generateRoutineBtn = document.getElementById("generateRoutine");

// Handle Generate Routine button click
generateRoutineBtn.addEventListener("click", async () => {
  // If no products are selected, show a message and return
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML += `
      <div class="chat-message ai error">
        <strong>Tip:</strong> Please select at least one product to generate a routine.
      </div>
    `;
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return;
  }

  // Prepare the data to send: only include name, brand, category, description
  const productsForAI = selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
  }));

  // Show a loading message in the chat window
  chatWindow.innerHTML += `
    <div class="chat-message ai">
      <em>Generating your personalized routine...</em>
    </div>
  `;
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Prepare the prompt for the AI
  const userMessage = `
Here are my selected products:
${productsForAI
  .map((p) => `- ${p.name} (${p.brand}, ${p.category}): ${p.description}`)
  .join("\n")}
Please create a step-by-step routine using these products. Explain the order and give a friendly tip for each step.
  `.trim();

  // Add the routine request to chatHistory
  chatHistory.push({ role: "user", content: userMessage });

  // Prepare the request body with the full chat history
  const requestBody = {
    chatHistory: chatHistory,
  };

  try {
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    // Remove the loading message
    const loadingMsgs = chatWindow.querySelectorAll(".chat-message.ai em");
    if (loadingMsgs.length > 0) {
      loadingMsgs[loadingMsgs.length - 1].parentElement.remove();
    }

    if (data && data.reply) {
      chatWindow.innerHTML += `
        <div class="chat-message ai">
          <strong>Your Personalized Routine:</strong><br>
          ${data.reply}
        </div>
      `;
      // Add the AI's reply to chatHistory
      chatHistory.push({ role: "assistant", content: data.reply });
    } else {
      chatWindow.innerHTML += `
        <div class="chat-message ai error">
          <strong>Error:</strong> Sorry, I couldn't generate a routine. Please try again.
        </div>
      `;
    }
  } catch (error) {
    // Show an error message if the request failed
    chatWindow.innerHTML += `
      <div class="chat-message ai error">
        <strong>Error:</strong> ${error.message}
      </div>
    `;
  }

  chatWindow.scrollTop = chatWindow.scrollHeight;
});

/* On page load, restore selected products from localStorage */
window.addEventListener("DOMContentLoaded", async () => {
  // Load all products first
  await loadProducts();

  // Get saved product IDs from localStorage
  const ids = loadSelectedProductIds();
  if (ids.length > 0) {
    // Restore selectedProducts array with full product objects
    selectedProducts = allProducts.filter((p) => ids.includes(p.id));
    // Update the selected products list in the UI
    updateSelectedProductsList();
    // If a category is selected, show the grid with correct highlights
    const selectedCategory = categoryFilter.value;
    if (selectedCategory) {
      const filtered = getFilteredProducts();
      displayProducts(filtered);
    }
  } else {
    // If nothing is saved, show the empty state
    updateSelectedProductsList();
  }
  // Always show the grid if a category is selected (even if nothing is selected)
  const selectedCategory = categoryFilter.value;
  if (selectedCategory) {
    const filtered = getFilteredProducts();
    displayProducts(filtered);
  }
});
