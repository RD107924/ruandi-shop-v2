// static/admin.js
document.addEventListener("DOMContentLoaded", function () {
  const API_BASE_URL = "https://ruandi-shop-v2.onrender.com";

  // 介面元素
  const loginContainer = document.getElementById("login-container");
  const mainContent = document.getElementById("main-content");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const logoutBtn = document.getElementById("logout-btn");

  // 後台功能元素
  const productForm = document.getElementById("product-form");
  const productsListContainer = document.getElementById("products-list");
  const ordersListContainer = document.getElementById("orders-list");
  // ... 其他表單元素宣告 ...
  const productIdInput = document.getElementById("product-id");
  const imageUrlInput = document.getElementById("image-url");
  const imageUploadInput = document.getElementById("image-upload");
  const imagePreview = document.getElementById("image-preview");
  const productNameInput = document.getElementById("name");
  const basePriceInput = document.getElementById("base-price");
  const serviceFeeInput = document.getElementById("service-fee");
  const updateBtn = document.getElementById("update-btn");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");

  // 檢查登入狀態
  checkLogin();

  function checkLogin() {
    const token = sessionStorage.getItem("adminToken");
    if (token) {
      loginContainer.style.display = "none";
      mainContent.style.display = "block";
      // 成功登入後，載入後台資料
      loadOrders();
      loadProducts();
    } else {
      loginContainer.style.display = "block";
      mainContent.style.display = "none";
    }
  }

  // 登入表單提交
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    loginError.textContent = "";

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok && data.status === "success") {
        sessionStorage.setItem("adminToken", data.token);
        checkLogin();
      } else {
        loginError.textContent = data.message || "登入失敗";
      }
    } catch (error) {
      loginError.textContent = "網路錯誤，無法連接至伺服器。";
    }
  });

  // 登出
  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("adminToken");
    checkLogin();
  });

  // 【NEW】 取得授權 Header
  function getAuthHeaders() {
    const token = sessionStorage.getItem("adminToken");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  // 【MODIFIED】 所有需要授權的 API 請求都要附上 Header
  async function handleFormSubmit(isUpdate = false) {
    // ... (圖片上傳邏輯不變) ...
    let finalImageUrl = imageUrlInput.value;
    if (imageUploadInput.files.length > 0) {
      /* ... */
    }

    const productData = {
      /* ... */
    };

    let url = `${API_BASE_URL}/api/products`;
    let method = "POST";
    if (isUpdate) {
      /* ... */
    }

    try {
      const productResponse = await fetch(url, {
        method: method,
        headers: getAuthHeaders(), // 【MODIFIED】
        body: JSON.stringify(productData),
      });
      // ... (後續邏輯不變) ...
    } catch (error) {
      alert(`商品儲存失敗: ${error.message}`);
    }
  }

  productsListContainer.addEventListener("click", function (event) {
    const target = event.target;
    const row = target.closest("tr");
    if (!row) return;
    const productId = row.dataset.productId;

    if (target.classList.contains("delete-btn")) {
      if (confirm(`確定要刪除 ID 為 ${productId} 的商品嗎？`)) {
        fetch(`${API_BASE_URL}/api/products/${productId}`, {
          method: "DELETE",
          headers: getAuthHeaders(), // 【MODIFIED】
        })
          .then((res) => res.json())
          .then((data) => {
            alert(data.message);
            loadProducts();
          });
      }
    }
    // ... (編輯邏輯不變)
  });

  // 【MODIFIED】 載入訂單列表，顯示倉庫資訊
  function loadOrders() {
    fetch(`${API_BASE_URL}/api/orders`, {
      headers: getAuthHeaders(), // 【MODIFIED】
    })
      .then((res) => res.json())
      .then((orders) => {
        ordersListContainer.innerHTML = "";
        if (!orders || orders.length === 0) {
          /* ... */ return;
        }

        orders.forEach((order) => {
          // ... (itemsHTML 處理邏輯不變) ...
          const itemsObject = JSON.parse(order.items_json);
          let itemsHTML = '<ul class="items-list">';
          for (const cartItemId in itemsObject) {
            const item = itemsObject[cartItemId];
            let remarkText = "";
            if (item.remark && item.remark.trim() !== "") {
              remarkText = `<br><small style="color: #007bff; font-weight: bold;">備註：${item.remark.replace(
                /; /g,
                "<br>"
              )}</small>`;
            }
            itemsHTML += `<li>${item.name} (單價: $${item.price}) x ${item.quantity}${remarkText}</li>`;
          }
          itemsHTML += "</ul>";

          const orderTime = new Date(order.created_at).toLocaleString("zh-TW", {
            hour12: false,
          });

          const rowHTML = `
                    <tr>
                        <td>${order.id}</td>
                        <td>${orderTime}</td>
                        <td>${order.paopaohu_id}</td>
                        <td><strong>${
                          order.warehouse || "N/A"
                        }</strong></td> <td>${order.payment_code}</td>
                        <td>$${order.total_amount} TWD</td>
                        <td>${itemsHTML}</td>
                    </tr>`;
          ordersListContainer.insertAdjacentHTML("beforeend", rowHTML);
        });
      })
      .catch((error) => {
        /* ... */
      });
  }

  // 載入商品列表 (這個 API 是公開的，不需要授權)
  function loadProducts() {
    /* ... (維持不變) ... */
  }

  // 其他函式和事件監聽器 (如 resetForm, form submit 等) 維持不變
  // ...
});

