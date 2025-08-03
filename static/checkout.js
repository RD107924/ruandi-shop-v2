// static/checkout.js
document.addEventListener("DOMContentLoaded", function () {
  const API_BASE_URL = "https://ruandi-shop-v2.onrender.com";

  // ... (元素宣告) ...
  const cartItemsContainer = document.getElementById("cart-items");
  const cartTotalElement = document.getElementById("cart-total");
  const confirmationInput = document.getElementById("final-confirmation-input");
  const submitBtn = document.getElementById("submit-order-btn");
  const copyBtn = document.getElementById("copy-account-btn");
  const bankAccountSpan = document.getElementById("bank-account-number");

  // 【NEW】 倉庫相關元素
  const warehouseRadios = document.querySelectorAll('input[name="warehouse"]');
  const selectedWarehouseDisplay = document.getElementById(
    "selected-warehouse-display"
  );

  const requiredText = "我了解";
  let cart = JSON.parse(localStorage.getItem("ruandiCart")) || {};

  // 【MODIFIED】 更新購物車渲染，以更好地顯示備註
  function updateCartAndRerender() {
    cartItemsContainer.innerHTML = "";
    let totalAmount = 0;
    if (Object.keys(cart).length === 0) {
      cartItemsContainer.innerHTML =
        '<tr><td colspan="5" style="text-align: center;">您的購物車是空的！<a href="index.html">點此返回首頁</a></td></tr>';
    } else {
      for (const cartItemId in cart) {
        const item = cart[cartItemId];
        const subtotal = item.price * item.quantity;
        totalAmount += subtotal;

        // 備註輸入框
        const remarkValue = item.remark || "";
        // 將分號轉換為換行以利顯示
        const displayRemark = remarkValue.replace(/; /g, "<br>");

        const remarkHTML = `
                    <div style="margin-top: 8px;">
                        <textarea class="cart-item-remark" placeholder="新增顏色、規格等備註..." data-cart-item-id="${cartItemId}">${
          item.remark || ""
        }</textarea>
                        <div style="font-size: 0.9em; color: #666; margin-top: 5px;"><strong>備註預覽:</strong><br>${displayRemark}</div>
                    </div>
                `;

        const row = document.createElement("tr");
        row.innerHTML = `
                    <td data-label="商品名稱">${item.name}${remarkHTML}</td>
                    <td data-label="單價">$${item.price}</td>
                    <td data-label="數量">
                        <div class="quantity-controls">
                            <button class="quantity-change" data-cart-item-id="${cartItemId}" data-change="-1">-</button>
                            <span class="quantity-display">${item.quantity}</span>
                            <button class="quantity-change" data-cart-item-id="${cartItemId}" data-change="1">+</button>
                        </div>
                    </td>
                    <td data-label="小計">$${subtotal}</td>
                    <td data-label="操作" style="text-align: center;">
                        <button class="remove-btn" data-cart-item-id="${cartItemId}">✖</button>
                    </td>
                `;
        cartItemsContainer.appendChild(row);
      }
    }
    cartTotalElement.textContent = `$${totalAmount} TWD`;
    localStorage.setItem("ruandiCart", JSON.stringify(cart));
    checkConfirmation();
  }

  // 監聽備註輸入框的變動
  cartItemsContainer.addEventListener("input", function (event) {
    if (event.target.classList.contains("cart-item-remark")) {
      const cartItemId = event.target.dataset.cartItemId;
      if (cart[cartItemId]) {
        cart[cartItemId].remark = event.target.value;
        localStorage.setItem("ruandiCart", JSON.stringify(cart));
      }
    }
  });

  // ... (checkConfirmation, cartItemsContainer click listener 維持不變) ...
  function checkConfirmation() {
    if (
      confirmationInput.value.trim() === requiredText &&
      Object.keys(cart).length > 0
    ) {
      submitBtn.disabled = false;
      submitBtn.style.backgroundColor = "#28a745";
    } else {
      submitBtn.disabled = true;
      submitBtn.style.backgroundColor = "#6c757d";
    }
  }

  // 【NEW】 監聽倉庫選擇變化
  warehouseRadios.forEach((radio) => {
    radio.addEventListener("change", (event) => {
      selectedWarehouseDisplay.textContent = event.target.value;
    });
  });

  // 【MODIFIED】 提交訂單時加入 warehouse 資訊
  document
    .getElementById("checkout-form")
    .addEventListener("submit", function (event) {
      event.preventDefault();
      const paopaohuId = document.getElementById("paopaohu-id").value;
      const paymentCode = document.getElementById("payment-code").value;
      const selectedWarehouse = document.querySelector(
        'input[name="warehouse"]:checked'
      ).value; // 【NEW】

      const totalAmount = Object.values(cart).reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      const orderData = {
        paopaohuId: paopaohuId,
        paymentCode: paymentCode,
        totalAmount: totalAmount,
        items: cart,
        warehouse: selectedWarehouse, // 【NEW】
      };

      fetch(`${API_BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.status === "success") {
            alert(
              `下單成功!感謝您的訂購，商品將在1~2天內送達【${selectedWarehouse}】。`
            );
            localStorage.removeItem("ruandiCart");
            window.location.href = "index.html";
          } else {
            alert("下單失敗，錯誤訊息：" + (data.message || "未知錯誤"));
          }
        })
        .catch((error) => {
          console.error("訂單提交錯誤:", error);
          alert("發生網路錯誤，請檢查後端伺服器是否正常運作。");
        });
    });

  // ... (其他事件監聽器和初始呼叫維持不變)
  cartItemsContainer.addEventListener("click", function (event) {
    const target = event.target;
    if (
      target.classList.contains("quantity-change") ||
      target.classList.contains("remove-btn")
    ) {
      const cartItemId = target.dataset.cartItemId;
      if (target.classList.contains("quantity-change")) {
        const change = parseInt(target.dataset.change);
        if (cart[cartItemId]) {
          let min_quantity = 1;
          // 1688商品有最小起批量
          if (String(cartItemId).startsWith("1688-")) {
            // 簡易判斷，真實世界應將此資訊存在購物車物件中
            const remark = cart[cartItemId].remark || "";
            const match = remark.match(/起批量: (\d+)/);
            if (match) min_quantity = parseInt(match[1]);
          }

          cart[cartItemId].quantity += change;
          if (cart[cartItemId].quantity < min_quantity) {
            cart[cartItemId].quantity = min_quantity;
          }
        }
      }
      if (target.classList.contains("remove-btn")) {
        if (
          cart[cartItemId] &&
          confirm(`確定要從購物車中移除「${cart[cartItemId].name}」嗎？`)
        ) {
          delete cart[cartItemId];
        }
      }
      updateCartAndRerender();
    }
  });
  confirmationInput.addEventListener("input", checkConfirmation);
  copyBtn.addEventListener("click", function () {
    /* ... */
  });

  updateCartAndRerender();
});

