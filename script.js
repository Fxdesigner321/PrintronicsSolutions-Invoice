const $ = (id) => document.getElementById(id);

const state = {
  rows: [
    {description: "Service call / inspection & diagnosis", qty: 1, amount: 0},
    {description: "Printer repair / maintenance labor", qty: 1, amount: 0},
    {description: "Spare parts / consumables", qty: 1, amount: 0},
    {description: "Pickup / delivery / additional service", qty: 1, amount: 0}
  ]
};

function money(value) {
  const n = Number(value) || 0;
  return "PKR " + n.toLocaleString("en-PK", {maximumFractionDigits: 2});
}
function dateDisplay(value) {
  if (!value) return "____ / ____ / ______";
  const d = new Date(value + "T00:00:00");
  return String(d.getDate()).padStart(2,"0") + " / " +
         String(d.getMonth()+1).padStart(2,"0") + " / " + d.getFullYear();
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}
function calculate() {
  const subtotal = state.rows.reduce((sum, r) => sum + (Number(r.qty)||0) * (Number(r.amount)||0), 0);
  const type = $("discountType").value;
  const value = Math.max(0, Number($("discountValue").value)||0);
  const discount = type === "percent" ? subtotal * value / 100 : value;
  const total = Math.max(0, subtotal - discount);
  $("editorSubtotal").textContent = money(subtotal);
  $("editorTotal").textContent = money(total);
  return {subtotal, discount, total, type, value};
}
function renderEditor() {
  const wrap = $("serviceRows");
  wrap.innerHTML = `
    <div class="editor-head">
      <div>#</div><div>SERVICE DESCRIPTION</div><div>QTY</div><div>AMOUNT (PKR)</div><div></div>
    </div>
    ${state.rows.map((r,i) => `
      <div class="editor-row" data-index="${i}">
        <div class="row-number">${String(i+1).padStart(2,"0")}</div>
        <div><input class="form-control service-desc" value="${escapeHtml(r.description)}" placeholder="Service description"></div>
        <div><input class="form-control service-qty" type="number" min="0" step="1" value="${r.qty}"></div>
        <div><input class="form-control service-amount" type="number" min="0" step="0.01" value="${r.amount}"></div>
        <div><button type="button" class="delete-row" title="Remove">×</button></div>
      </div>
    `).join("")}
  `;
  wrap.querySelectorAll(".editor-row").forEach(row => {
    const i = Number(row.dataset.index);
    row.querySelector(".service-desc").addEventListener("input", e => { state.rows[i].description = e.target.value; });
    row.querySelector(".service-qty").addEventListener("input", e => { state.rows[i].qty = Number(e.target.value)||0; calculate(); });
    row.querySelector(".service-amount").addEventListener("input", e => { state.rows[i].amount = Number(e.target.value)||0; calculate(); });
    row.querySelector(".delete-row").addEventListener("click", () => {
      if (state.rows.length === 1) return;
      state.rows.splice(i,1);
      renderEditor();
      calculate();
    });
  });
}
function generateInvoice() {
  const calc = calculate();
  $("outInvoiceNo").textContent = $("invoiceNo").value.trim();
  $("outIssueDate").textContent = dateDisplay($("issueDate").value);
  $("outDueDate").textContent = dateDisplay($("dueDate").value);

  $("outCustomerName").textContent = $("customerName").value.trim() || "—";
  $("outCustomerCompany").textContent = $("customerCompany").value.trim() || "—";
  $("outCustomerPhone").textContent = $("customerPhone").value.trim() || "—";
  $("outCustomerAddress").textContent = $("customerAddress").value.trim() || "—";
  $("outWarranty").textContent = $("warrantyNotes").value.trim() || "—";

  $("outServiceRows").innerHTML = state.rows.map((r,i) => `
    <tr>
      <td class="num-col" style="text-align:center">${String(i+1).padStart(2,"0")}</td>
      <td>${escapeHtml(r.description || "—")}</td>
      <td class="qty">${Number(r.qty)||0}</td>
      <td class="amount">${money((Number(r.qty)||0)*(Number(r.amount)||0))}</td>
    </tr>
  `).join("") || `<tr><td colspan="4">No services added.</td></tr>`;

  $("outSubtotal").textContent = money(calc.subtotal);
  $("outDiscount").textContent = calc.type === "percent"
    ? `${calc.value}% (${money(calc.discount)})`
    : money(calc.discount);
  $("outTotal").textContent = money(calc.total);

  $("entryPage").classList.add("d-none");
  $("previewPage").classList.remove("d-none");
  window.scrollTo({top:0, behavior:"instant"});
}

$("addRowBtn").addEventListener("click", () => {
  state.rows.push({description:"", qty:1, amount:0});
  renderEditor();
  calculate();
});
$("discountType").addEventListener("change", calculate);
$("discountValue").addEventListener("input", calculate);

$("invoiceForm").addEventListener("submit", e => {
  e.preventDefault();
  generateInvoice();
});
$("backBtn").addEventListener("click", () => {
  $("previewPage").classList.add("d-none");
  $("entryPage").classList.remove("d-none");
  window.scrollTo({top:0, behavior:"instant"});
});
$("printBtn").addEventListener("click", () => window.print());

$("downloadBtn").addEventListener("click", async () => {
  const button = $("downloadBtn");
  const old = button.innerHTML;
  button.disabled = true;
  button.innerHTML = "Generating…";
  try {
    const canvas = await html2canvas($("invoicePaper"), {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false
    });
    const link = document.createElement("a");
    const no = $("invoiceNo").value.trim() || "invoice";
    link.download = `${no.replace(/[^a-z0-9-_]/gi,"_")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } finally {
    button.disabled = false;
    button.innerHTML = old;
  }
});

$("resetBtn").addEventListener("click", () => {
  $("invoiceForm").reset();
  state.rows = [
    {description: "Service call / inspection & diagnosis", qty: 1, amount: 0},
    {description: "Printer repair / maintenance labor", qty: 1, amount: 0},
    {description: "Spare parts / consumables", qty: 1, amount: 0},
    {description: "Pickup / delivery / additional service", qty: 1, amount: 0}
  ];
  renderEditor();
  calculate();
});

(function init(){
  const today = new Date();
  const plus7 = new Date(today);
  plus7.setDate(plus7.getDate()+7);
  $("issueDate").value = today.toISOString().slice(0,10);
  $("dueDate").value = plus7.toISOString().slice(0,10);
  renderEditor();
  calculate();
})();
