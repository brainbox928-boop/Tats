const PAYMENT_STORAGE_KEY = "royalInkPendingCheckout";
const paymentForm = document.getElementById("paymentEvidenceForm");
const paymentOrderSummary = document.getElementById("orderSummary");
const paymentError = document.getElementById("paymentFormError");
const paymentOrder = readPendingOrder();
const cryptoWallets = {
  BTC: {
    network: "Bitcoin network",
    address: "3DfMVLhNfUAQrhRSxy341KVsJnQpuDQx2o",
    qr: "Image/Bitcoin%20QR%20code.jpg",
    alt: "Bitcoin payment QR code"
  },
  ETH: {
    network: "Ethereum network",
    address: "0xe968AE33B8a46f45cec836eFe852Ce7267f47a31",
    qr: "Image/ETHERUM%20QR%20CODE.JPG",
    alt: "Ethereum payment QR code"
  },
  LTC: {
    network: "Litecoin network",
    address: "MMuJ4C35oTyEF67xrdEk9CmF9npzUPDMyY",
    qr: "Image/Litecoin%20QR%20code.jpg",
    alt: "Litecoin payment QR code"
  }
};

function readPendingOrder() {
  try {
    return JSON.parse(sessionStorage.getItem(PAYMENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0);
}

function renderPaymentOrder(order) {
  if (!order || !order.client || !Number.isFinite(Number(order.totalDue))) {
    paymentOrderSummary.innerHTML = "<p class=\"mb-0\">No current order was found. Start from the studio checkout.</p>";
    document.getElementById("missingOrderNotice").classList.remove("d-none");
    paymentForm.querySelectorAll("button, input, select, textarea").forEach((control) => {
      if (control.name !== "form-name" && control.name !== "bot-field") control.disabled = true;
    });
    return;
  }

  const productRows = (order.products || []).map((item) => `
    <div class="payment-summary-row"><span>${escapeHtml(item.name)} × ${Number(item.qty) || 0}</span><strong>${money((Number(item.price) || 0) * (Number(item.qty) || 0))}</strong></div>
  `).join("");
  const bookingRows = order.booking ? `
    <div class="payment-summary-row"><span>Service</span><strong>${escapeHtml(order.booking.service)}</strong></div>
    <div class="payment-summary-row"><span>Style</span><strong>${escapeHtml(order.booking.style)}</strong></div>
    <div class="payment-summary-row"><span>Artist</span><strong>${escapeHtml(order.booking.artist)}</strong></div>
    <div class="payment-summary-row"><span>Appointment</span><strong>${escapeHtml(order.booking.date)} · ${escapeHtml(order.booking.time)}</strong></div>
    <div class="payment-summary-row"><span>Location</span><strong>${escapeHtml(order.booking.location)}</strong></div>
    <div class="payment-summary-row"><span>Design notes</span><strong>${escapeHtml(order.booking.notes)}</strong></div>
    <div class="payment-summary-row"><span>Service total</span><strong>${money(order.booking.serviceTotal)}</strong></div>
    <div class="payment-summary-row"><span>50% appointment deposit</span><strong>${money(order.booking.deposit)}</strong></div>
  ` : "";

  paymentOrderSummary.innerHTML = `
    <div class="d-flex justify-content-between align-items-start gap-3 mb-2">
      <div><h2 class="h5 mb-1">Order for ${escapeHtml(order.client.name)}</h2><p class="text-light small mb-0">${escapeHtml(order.client.email)}</p></div>
      <span class="badge text-bg-warning">${order.type === "appointment" ? "Appointment request" : "Aftercare order"}</span>
    </div>
    ${bookingRows}
    ${productRows ? `<div class="payment-summary-row"><span>Aftercare products</span><strong>${money(order.productsTotal)}</strong></div>${productRows}` : ""}
    <div class="payment-summary-row payment-summary-total"><span>Total to send today</span><strong>${money(order.totalDue)}</strong></div>
  `;

  if (!order.reference) {
    const stamp = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const rand = Array.from(crypto.getRandomValues(new Uint8Array(3)), (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    order.reference = `ILT-${stamp}-${rand}`;
    sessionStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(order));
  }
  document.getElementById("payReferenceDisplay").textContent = order.reference;
  document.getElementById("paymentOrderReference").value = order.reference;
  document.getElementById("payAmountDisplay").textContent = money(order.totalDue);
  document.getElementById("paymentCustomerName").value = order.client.name || "";
  document.getElementById("paymentCustomerEmail").value = order.client.email || "";
  document.getElementById("paymentCustomerPhone").value = order.client.phone || "";
  document.getElementById("paymentOrderType").value = order.type || "";
  document.getElementById("paymentOrderSummary").value = paymentOrderSummary.innerText;
  document.getElementById("paymentOrderTotal").value = Number(order.totalDue).toFixed(2);
  document.getElementById("paymentBookingDetails").value = order.booking ? JSON.stringify(order.booking) : "";
  document.getElementById("paymentProductsDetails").value = JSON.stringify(order.products || []);
}

function setPaymentMethod() {
  const method = "crypto";
  document.getElementById("paymentMethodValue").value = method;
  const asset = document.getElementById("cryptoAsset").value;
  const wallet = cryptoWallets[asset];
  document.getElementById("paymentCryptoValue").value = asset;
  document.getElementById("confirmationChannelValue").value = document.getElementById("confirmationChannel").value;

  if (paymentOrder) {
    paymentOrder.paymentMethod = method;
    paymentOrder.cryptoAsset = asset;
    paymentOrder.confirmationChannel = document.getElementById("confirmationChannel").value;
    sessionStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(paymentOrder));
  }

  if (wallet) {
    document.getElementById("cryptoNetworkName").textContent = wallet.network;
    document.getElementById("cryptoWalletAddress").value = wallet.address;
    document.getElementById("cryptoWalletAddress").setAttribute("aria-label", `${asset} wallet address`);
    document.getElementById("addrStart").textContent = wallet.address.slice(0, 6);
    document.getElementById("addrEnd").textContent = wallet.address.slice(-6);
    document.getElementById("cryptoQrImage").src = wallet.qr;
    document.getElementById("cryptoQrImage").alt = wallet.alt;
  }
}

document.getElementById("cryptoAsset").addEventListener("change", setPaymentMethod);
document.getElementById("confirmationChannel").addEventListener("change", setPaymentMethod);

document.getElementById("copyCryptoAddress").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(document.getElementById("cryptoWalletAddress").value);
    document.getElementById("copyCryptoAddress").innerHTML = '<i class="bi bi-check2"></i>';
    window.setTimeout(() => {
      document.getElementById("copyCryptoAddress").innerHTML = '<i class="bi bi-copy"></i>';
    }, 1400);
  } catch {
    paymentError.textContent = "Clipboard access was blocked. Select and copy the wallet address manually.";
    paymentError.classList.remove("d-none");
  }
});

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function showPaymentError(message) {
  paymentError.textContent = message;
  paymentError.classList.remove("d-none");
}

paymentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  paymentError.classList.add("d-none");

  if (!paymentOrder) {
    document.getElementById("missingOrderNotice").classList.remove("d-none");
    return;
  }

  if (!paymentForm.checkValidity()) {
    paymentForm.classList.add("was-validated");
    paymentForm.reportValidity();
    return;
  }

  const receipt = document.getElementById("paymentReceipt").files[0];
  if (receipt && receipt.size > MAX_UPLOAD_BYTES) {
    showPaymentError("Your receipt is larger than 8 MB. Please upload a smaller screenshot or compressed image.");
    return;
  }

  setPaymentMethod();
  const button = document.getElementById("submitEvidenceButton");
  const originalLabel = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Submitting…';

  try {
    const response = await fetch("/", { method: "POST", body: new FormData(paymentForm) });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    window.location.href = paymentForm.getAttribute("action");
  } catch (error) {
    button.disabled = false;
    button.innerHTML = originalLabel;
    showPaymentError("We couldn't submit your payment evidence. Please check your connection and try again, or contact us with your order reference.");
  }
});

renderPaymentOrder(paymentOrder);
setPaymentMethod();
