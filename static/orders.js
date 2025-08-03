document.addEventListener("DOMContentLoaded", function () {
  // !! 部署時請務必替換成您在Render上的後端網址 !!
  const API_BASE_URL = "https://ruandi-shop-v2.onrender.com"; // 請確認這是您 Render 後端的正確網址

  const lookupBtn = document.getElementById("lookup-btn");
  const paopaohuIdInput = document.getElementById("paopaohu-id-lookup");
  const ordersListContainer = document.getElementById("orders-list");

  lookupBtn.addEventListener("click", function () {
    const paopaohuId = paopaohuIdInput.value.trim();
    if (!paopaohuId) {
      alert("請輸入您的會員編號！");
      return;
    }

    ordersListContainer.innerHTML =
      '<tr><td colspan="4" style="text-align: center;">正在查詢中...</td></tr>';

    fetch(`${API_BASE_URL}/api/orders/${paopaohuId}`)
      .then((res) => res.json())
      .then((orders) => {
        ordersListContainer.innerHTML = "";
        if (orders.length === 0) {
          ordersListContainer.innerHTML = `<tr><td colspan="4" style="text-align: center;">找不到與此會員編號相關的訂單。</td></tr>`;
          return;
        }
        orders.forEach((order) => {
          const itemsObject = JSON.parse(order.items_json);
          let itemsHTML = '<ul class="items-list">';
          for (const productId in itemsObject) {
            const item = itemsObject[productId];
            itemsHTML += `<li>${item.name} x ${item.quantity}</li>`;
          }
          itemsHTML += "</ul>";
          const orderTime = new Date(order.created_at).toLocaleString("zh-TW", {
            hour12: false,
          });
          const rowHTML = `
                        <tr>
                            <td>${order.id}</td><td>${orderTime}</td>
                            <td>$${order.total_amount} TWD</td><td>${itemsHTML}</td>
                        </tr>`;
          ordersListContainer.insertAdjacentHTML("beforeend", rowHTML);
        });
      })
      .catch((err) => {
        console.error("查詢訂單失敗:", err);
        ordersListContainer.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red;">查詢失敗，請稍後再試。</td></tr>`;
      });
  });
});

