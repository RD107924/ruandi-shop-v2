// static/script.js

// !! 部署時請務必替換成您在Render上的後端網址 !!
const API_BASE_URL = "https://ruandi-shop-v2.onrender.com";

// 【NEW】 1688 代購功能相關元素
const urlInput = document.getElementById("1688-url-input");
const fetchBtn = document.getElementById("fetch-1688-btn");
const resultDiv = document.getElementById("procurement-result");

// 【MODIFIED】 將原有邏輯包裝在 DOMContentLoaded 事件中
document.addEventListener("DOMContentLoaded", function () {
  const productsGrid = document.getElementById("products-grid");

  // 載入本店商品
  fetch(`${API_BASE_URL}/api/products`)
    .then((response) => response.json())
    .then((products) => {
      if (products.length === 0) {
        productsGrid.innerHTML = "<p>目前沒有商品上架。</p>";
        return;
      }
      products.forEach((product) => {
        const finalPrice = product.base_price + product.service_fee;
        const cardHTML = `
                    <div class="product-card">
                        <img src="${product.image_url}" alt="${product.name}">
                        <h3>${product.name}</h3>
                        <div class="product-price">$${finalPrice} TWD</div>
                        <div class="price-breakdown">(含商品價 $${product.base_price} + 代購服務費 $${product.service_fee})</div>
                        <button class="action-button add-to-cart-btn" data-product-id="${product.id}" data-product-name="${product.name}" data-price="${finalPrice}">加入購物車</button>
                    </div>
                `;
        productsGrid.insertAdjacentHTML("beforeend", cardHTML);
      });
    })
    .catch((error) => {
      console.error("無法取得商品列表:", error);
      productsGrid.innerHTML = "<p>載入商品失敗，請稍後再試。</p>";
    });

  // 監聽本店商品的加入購物車按鈕
  productsGrid.addEventListener("click", function (event) {
    if (event.target.classList.contains("add-to-cart-btn")) {
      const button = event.target;
      const productId = button.dataset.productId;
      const productName = button.dataset.productName;
      const price = parseInt(button.dataset.price);
      addToCart(productId, productName, price, 1, ""); // 本店商品預設數量1，無備註
    }
  });

  // 【NEW】 監聽 1688 商品擷取按鈕
  fetchBtn.addEventListener("click", async () => {
    const url = urlInput.value.trim();
    if (!url) {
      alert("請輸入 1688 商品連結！");
      return;
    }

    fetchBtn.disabled = true;
    fetchBtn.textContent = "擷取中...";
    resultDiv.innerHTML = "<p>正在為您擷取商品資訊，請稍候...</p>";

    try {
      const response = await fetch(`${API_BASE_URL}/api/scrape_1688`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url }),
      });

      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        throw new Error(data.error || "未知的錯誤");
      }

      displayScrapedProduct(data.product);
    } catch (error) {
      resultDiv.innerHTML = `<p style="color: red;">擷取失敗：${error.message}</p>`;
    } finally {
      fetchBtn.disabled = false;
      fetchBtn.textContent = "擷取商品";
    }
  });
});

// 【NEW】 顯示擷取到的 1688 商品資訊
function displayScrapedProduct(product) {
  let specsHTML = "";
  if (product.specs && product.specs.length > 0) {
    product.specs.forEach((spec, index) => {
      let optionsHTML = spec.options
        .map((opt) => `<option value="${opt}">${opt}</option>`)
        .join("");
      specsHTML += `
                <div class="spec-group">
                    <label for="spec_${index}">${spec.type}:</label>
                    <select id="spec_${index}" class="spec-select">
                        ${optionsHTML}
                    </select>
                </div>
            `;
    });
  }

  const productHTML = `
        <div class="product-card" style="text-align: left;">
            <img src="${product.imageUrl}" alt="${product.name}" style="float: left; width: 100px; height: 100px; margin-right: 15px;">
            <h3 style="margin-top: 0;">${product.name}</h3>
            <p><strong>台幣總價:</strong> <span class="product-price" style="font-size: 1.2em;">$${product.price}</span> (已含服務費)</p>
            <p><strong>起批量:</strong> ${product.min_quantity} 件</p>
            ${specsHTML}
            <div class="spec-group">
                 <label for="quantity_1688">數量:</label>
                 <input type="number" id="quantity_1688" value="${product.min_quantity}" min="${product.min_quantity}">
            </div>
            <button id="add-1688-to-cart" class="action-button">加入購物車</button>
        </div>
    `;
  resultDiv.innerHTML = productHTML;

  // 為動態產生的按鈕加上監聽器
  document.getElementById("add-1688-to-cart").addEventListener("click", () => {
    const quantity = parseInt(document.getElementById("quantity_1688").value);
    if (quantity < product.min_quantity) {
      alert(`此商品最少需購買 ${product.min_quantity} 件！`);
      return;
    }

    // 組合備註
    let remarks = [];
    document.querySelectorAll(".spec-select").forEach((select, index) => {
      const specType = product.specs[index].type;
      remarks.push(`${specType}: ${select.value}`);
    });
    // 加上原始連結
    remarks.push(`來源: ${product.original_url}`);

    const remarkString = remarks.join("; ");

    addToCart(product.id, product.name, product.price, quantity, remarkString);
  });
}

// 【MODIFIED】 改造 addToCart 函式以支援數量和備註
function addToCart(productId, name, price, quantity, remark) {
  let cart = JSON.parse(localStorage.getItem("ruandiCart")) || {};
  const cartItemId = productId;

  if (cart[cartItemId]) {
    // 如果是 1688 商品，由於規格可能不同，不直接疊加數量
    // 簡單起見，這裡提示用戶，更複雜的系統可以產生更獨特的 ID
    if (String(productId).startsWith("1688-")) {
      alert(
        `「${name}」已在購物車中。如需不同規格，請在結帳頁面修改備註或移除後重新加入。`
      );
      return;
    }
    cart[cartItemId].quantity += quantity;
  } else {
    cart[cartItemId] = {
      name: name,
      price: price,
      quantity: quantity,
      remark: remark,
    };
  }
  localStorage.setItem("ruandiCart", JSON.stringify(cart));
  alert(`「${name}」x ${quantity} 已加入購物車！`);
}

