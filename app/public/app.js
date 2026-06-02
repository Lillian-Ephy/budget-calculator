const FREQUENCY_OPTIONS = ["Monthly", "Annual"];
const BIWEEKLY_PAY_PERIODS = 26;
const MONTHS_PER_YEAR = 12;
const STORAGE_KEY = "budget-calculator-state-v1";
const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const defaultState = () => ({
  userLabels: {
    user1: "User 1",
    user2: "User 2",
  },
  monthlyInputs: {
    grossIncome: { user1: "", user2: "" },
    takeHome: { user1: "", user2: "" },
    bonusIncome: { user1: "", user2: "" },
    takeHomeBonus: { user1: "", user2: "" },
    retirement: { user1: "", user2: "" },
    bonus401k: { user1: "", user2: "" },
    hsa: { user1: "", user2: "" },
  },
  sections: [
    {
      id: "housing",
      title: "Housing",
      items: [
        { id: "housing-1", name: "Mortgage", amount: "", frequency: "Monthly" },
        { id: "housing-2", name: "Home Insurance", amount: "", frequency: "Monthly" },
        { id: "housing-3", name: "Property Tax", amount: "", frequency: "Monthly" },
      ],
    },
    {
      id: "utilities",
      title: "Utilities",
      items: [
        { id: "utilities-1", name: "Internet", amount: "", frequency: "Monthly" },
        { id: "utilities-2", name: "Electric", amount: "", frequency: "Monthly" },
        { id: "utilities-3", name: "Gas", amount: "", frequency: "Monthly" },
        { id: "utilities-4", name: "Water", amount: "", frequency: "Monthly" },
        { id: "utilities-5", name: "Sewer", amount: "", frequency: "Monthly" },
        { id: "utilities-6", name: "Solar", amount: "", frequency: "Monthly" },
      ],
    },
    {
      id: "living-expenses",
      title: "Living Expenses",
      items: [
        { id: "living-expenses-1", name: "Groceries", amount: "", frequency: "Monthly" },
        { id: "living-expenses-2", name: "Takeout / Restaurants", amount: "", frequency: "Monthly" },
        { id: "living-expenses-3", name: "Car Insurance", amount: "", frequency: "Monthly" },
        { id: "living-expenses-4", name: "Gas", amount: "", frequency: "Monthly" },
        { id: "living-expenses-5", name: "Household Items", amount: "", frequency: "Monthly" },
      ],
    },
    {
      id: "subscriptions",
      title: "Subscriptions",
      items: [
        { id: "subscriptions-1", name: "Netflix", amount: "", frequency: "Monthly" },
        { id: "subscriptions-2", name: "Amazon Prime", amount: "", frequency: "Monthly" },
        { id: "subscriptions-3", name: "Credit Card Membership", amount: "", frequency: "Annual" },
        { id: "subscriptions-4", name: "Gym Membership", amount: "", frequency: "Monthly" },
        { id: "subscriptions-5", name: "iCloud Storage", amount: "", frequency: "Monthly" },
        { id: "subscriptions-6", name: "Google Storage", amount: "", frequency: "Monthly" },
        { id: "subscriptions-7", name: "ChatGPT", amount: "", frequency: "Monthly" },
        { id: "subscriptions-8", name: "Claude", amount: "", frequency: "Monthly" },
      ],
    },
    {
      id: "savings",
      title: "Savings",
      items: [
        { id: "savings-1", name: "Roth IRA", amount: "", frequency: "Monthly" },
        { id: "savings-2", name: "Brokerage", amount: "", frequency: "Monthly" },
        { id: "savings-3", name: "Repairs Fund", amount: "", frequency: "Monthly" },
      ],
    },
    {
      id: "entertainment",
      title: "Entertainment",
      items: [
        { id: "entertainment-1", name: "Shopping", amount: "", frequency: "Monthly" },
        { id: "entertainment-2", name: "Ski Pass", amount: "", frequency: "Annual" },
        { id: "entertainment-3", name: "Weekend Activities", amount: "", frequency: "Monthly" },
      ],
    },
    {
      id: "travel",
      title: "Travel",
      items: [{ id: "travel-1", name: "Travel Fund", amount: "", frequency: "Monthly" }],
    },
    {
      id: "miscellaneous",
      title: "Miscellaneous",
      items: [{ id: "miscellaneous-1", name: "Gifts", amount: "", frequency: "Monthly" }],
    },
  ],
});

let state = defaultState();

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function showStatus(message = "", isError = false) {
  const node = document.getElementById("statusMessage");
  node.textContent = message;
  node.className = `status-message${isError ? " error" : ""}`;
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
  }
}

function normalizeLoadedState(savedState) {
  const fallback = defaultState();
  const nextState = defaultState();

  if (savedState?.userLabels) {
    nextState.userLabels.user1 = savedState.userLabels.user1 || fallback.userLabels.user1;
    nextState.userLabels.user2 = savedState.userLabels.user2 || fallback.userLabels.user2;
  }

  Object.keys(fallback.monthlyInputs).forEach((key) => {
    nextState.monthlyInputs[key] = {
      user1: savedState?.monthlyInputs?.[key]?.user1 ?? fallback.monthlyInputs[key].user1,
      user2: savedState?.monthlyInputs?.[key]?.user2 ?? fallback.monthlyInputs[key].user2,
    };
  });

  if (Array.isArray(savedState?.sections) && savedState.sections.length) {
    nextState.sections = savedState.sections.map((section, sectionIndex) => ({
      id: section?.id || `section-${sectionIndex + 1}`,
      title: section?.title || "New Section",
      items: Array.isArray(section?.items) && section.items.length
        ? section.items.map((item, itemIndex) => ({
            id: item?.id || `${section?.id || `section-${sectionIndex + 1}`}-item-${itemIndex + 1}`,
            name: item?.name || "",
            amount: item?.amount || "",
            frequency: item?.frequency === "Annual" ? "Annual" : "Monthly",
          }))
        : [{ id: `${section?.id || `section-${sectionIndex + 1}`}-item-1`, name: "", amount: "", frequency: "Monthly" }],
    }));
  }

  const housingSection = nextState.sections.find((section) => section.id === "housing");
  const savingsSection = nextState.sections.find((section) => section.id === "savings");
  const repairsFundItem = housingSection?.items.find((item) => item.name === "Repairs Fund");

  if (housingSection && savingsSection && repairsFundItem) {
    housingSection.items = housingSection.items.filter((item) => item !== repairsFundItem);
    const savingsHasRepairsFund = savingsSection.items.some((item) => item.name === "Repairs Fund");
    if (!savingsHasRepairsFund) {
      savingsSection.items.push({ ...repairsFundItem, id: repairsFundItem.id || "savings-repairs-fund" });
    }
  }

  return nextState;
}

function loadSavedState() {
  try {
    const rawState = localStorage.getItem(STORAGE_KEY);
    if (!rawState) return false;
    state = normalizeLoadedState(JSON.parse(rawState));
    return true;
  } catch {
    return false;
  }
}

function parseAmount(value) {
  if (!value) return 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  return currencyFormatter.format(value || 0);
}

function formatPercent(value) {
  return percentFormatter.format(value || 0);
}

function biweeklyToAnnual(amount) {
  return amount * BIWEEKLY_PAY_PERIODS;
}

function biweeklyToMonthly(amount) {
  return biweeklyToAnnual(amount) / MONTHS_PER_YEAR;
}

function annualToMonthly(amount) {
  return amount / MONTHS_PER_YEAR;
}

function amountToAnnual(amount, frequency) {
  return frequency === "Annual" ? amount : amount * MONTHS_PER_YEAR;
}

function amountToMonthly(amount, frequency) {
  return frequency === "Annual" ? annualToMonthly(amount) : amount;
}

function calculateInputTotal(key) {
  const row = state.monthlyInputs[key];
  return parseAmount(row.user1) + parseAmount(row.user2);
}

function calculateInputUserValue(key, userKey) {
  return parseAmount(state.monthlyInputs[key][userKey]);
}

function calculateBenefitsSummary() {
  const user1GrossAnnual = biweeklyToAnnual(calculateInputUserValue("grossIncome", "user1")) + calculateInputUserValue("bonusIncome", "user1");
  const user2GrossAnnual = biweeklyToAnnual(calculateInputUserValue("grossIncome", "user2")) + calculateInputUserValue("bonusIncome", "user2");
  const user1TakeHomeAnnual = biweeklyToAnnual(calculateInputUserValue("takeHome", "user1")) + calculateInputUserValue("takeHomeBonus", "user1");
  const user2TakeHomeAnnual = biweeklyToAnnual(calculateInputUserValue("takeHome", "user2")) + calculateInputUserValue("takeHomeBonus", "user2");
  const user1TaxesBenefits = Math.max(user1GrossAnnual - user1TakeHomeAnnual, 0);
  const user2TaxesBenefits = Math.max(user2GrossAnnual - user2TakeHomeAnnual, 0);
  const user1AnnualIncome = user1GrossAnnual;
  const user2AnnualIncome = user2GrossAnnual;
  const user1401k = biweeklyToAnnual(calculateInputUserValue("retirement", "user1")) + calculateInputUserValue("bonus401k", "user1");
  const user2401k = biweeklyToAnnual(calculateInputUserValue("retirement", "user2")) + calculateInputUserValue("bonus401k", "user2");
  const user1Hsa = biweeklyToAnnual(calculateInputUserValue("hsa", "user1"));
  const user2Hsa = biweeklyToAnnual(calculateInputUserValue("hsa", "user2"));
  const total401k = user1401k + user2401k;
  const totalAnnualIncome = user1AnnualIncome + user2AnnualIncome;

  return {
    totalTaxesBenefits: { user1: user1TaxesBenefits, user2: user2TaxesBenefits, total: user1TaxesBenefits + user2TaxesBenefits },
    totalAnnualIncome: { user1: user1AnnualIncome, user2: user2AnnualIncome, total: totalAnnualIncome },
    total401k: { user1: user1401k, user2: user2401k, total: total401k },
    contribution401kPercent: {
      user1: user1AnnualIncome > 0 ? user1401k / user1AnnualIncome : 0,
      user2: user2AnnualIncome > 0 ? user2401k / user2AnnualIncome : 0,
      total: totalAnnualIncome > 0 ? total401k / totalAnnualIncome : 0,
    },
    totalHsa: { user1: user1Hsa, user2: user2Hsa, total: user1Hsa + user2Hsa },
  };
}

function calculateSectionMonthly(section) {
  return section.items.reduce((sum, item) => sum + amountToMonthly(parseAmount(item.amount), item.frequency), 0);
}

function calculateGrandMonthlyExpenses() {
  return state.sections.reduce((sum, section) => sum + calculateSectionMonthly(section), 0);
}

function updateMonthlyTotals() {
  Object.keys(state.monthlyInputs).forEach((key) => {
    const node = document.querySelector(`[data-total-key="${key}"]`);
    if (node) node.textContent = formatCurrency(calculateInputTotal(key));
  });
}

function buildMoneyInput(value, onInput) {
  const input = document.createElement("input");
  input.className = "money-input";
  input.type = "text";
  input.inputMode = "decimal";
  input.placeholder = "$0";
  input.value = value;
  input.addEventListener("input", (event) => onInput(event.target.value));
  return input;
}

function buildTextInput(value, placeholder, onInput) {
  const input = document.createElement("input");
  input.className = "line-name-input";
  input.type = "text";
  input.placeholder = placeholder;
  input.value = value;
  input.addEventListener("input", (event) => onInput(event.target.value));
  return input;
}

function buildColumnNameInput(value, onInput) {
  const input = document.createElement("input");
  input.className = "column-name-input";
  input.type = "text";
  input.placeholder = "Name";
  input.value = value;
  input.addEventListener("input", (event) => onInput(event.target.value));
  return input;
}

function buildSectionTitleInput(value, onInput) {
  const input = document.createElement("input");
  input.className = "section-title-input";
  input.type = "text";
  input.placeholder = "Section title";
  input.value = value;
  input.addEventListener("input", (event) => onInput(event.target.value));
  return input;
}

function buildFrequencySelect(value, onChange) {
  const select = document.createElement("select");
  select.className = "frequency-select";
  FREQUENCY_OPTIONS.forEach((option) => {
    const optionNode = document.createElement("option");
    optionNode.value = option;
    optionNode.textContent = option;
    optionNode.selected = option === value;
    select.appendChild(optionNode);
  });
  select.addEventListener("change", (event) => onChange(event.target.value));
  return select;
}

function buildButton(label, className, onClick, title = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  if (title) button.title = title;
  button.addEventListener("click", onClick);
  return button;
}

function escapeCsvValue(value) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replace(/"/g, '""')}"`;
  return stringValue;
}

function serializeStateToCsv() {
  const rows = [
    ["recordType", "section", "label", "user1", "user2", "amount", "frequency"],
    ["meta", "", "user1Label", state.userLabels.user1, "", "", ""],
    ["meta", "", "user2Label", state.userLabels.user2, "", "", ""],
  ];

  const incomeLabels = [
    ["grossIncome", "Gross Income"],
    ["takeHome", "Take Home"],
    ["bonusIncome", "Bonus Income"],
    ["takeHomeBonus", "Take Home Bonus"],
    ["retirement", "Retirement - 401k"],
    ["bonus401k", "Bonus - 401k"],
    ["hsa", "HSA"],
  ];

  incomeLabels.forEach(([key, label]) => {
    rows.push(["income", "", label, state.monthlyInputs[key].user1, state.monthlyInputs[key].user2, "", ""]);
  });

  state.sections.forEach((section) => {
    rows.push(["section", section.id, section.title, "", "", "", ""]);
    section.items.forEach((item) => {
      rows.push(["item", section.id, item.name, "", "", item.amount, item.frequency]);
    });
  });

  return rows.map((row) => row.map((value) => escapeCsvValue(value)).join(",")).join("\n");
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];
    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += character;
    }
  }
  values.push(current);
  return values;
}

function parseCsv(text) {
  return text.split(/\r?\n/).filter((line) => line.trim().length > 0).map(parseCsvLine);
}

function importStateFromCsv(text) {
  const rows = parseCsv(text);
  if (!rows.length) throw new Error("The CSV file is empty.");
  const [header, ...dataRows] = rows;
  const expectedHeader = ["recordType", "section", "label", "user1", "user2", "amount", "frequency"];
  if (header.join("|") !== expectedHeader.join("|")) throw new Error("The CSV format is not recognized.");

  const nextState = defaultState();
  nextState.sections = [];
  const incomeKeyMap = {
    "Gross Income": "grossIncome",
    "Take Home": "takeHome",
    "Bonus Income": "bonusIncome",
    "Take Home Bonus": "takeHomeBonus",
    Retirement: "retirement",
    "Retirement - 401k": "retirement",
    "Bonus - 401k": "bonus401k",
    HSA: "hsa",
  };
  const sectionMap = new Map();

  dataRows.forEach((row) => {
    const [recordType = "", sectionId = "", label = "", user1 = "", user2 = "", amount = "", frequency = ""] = row;
    if (recordType === "meta" && label === "user1Label") {
      nextState.userLabels.user1 = user1 || "User 1";
      return;
    }
    if (recordType === "meta" && label === "user2Label") {
      nextState.userLabels.user2 = user1 || "User 2";
      return;
    }
    if (recordType === "income" && incomeKeyMap[label]) {
      nextState.monthlyInputs[incomeKeyMap[label]] = { user1, user2 };
      return;
    }
    if (recordType === "section") {
      const section = { id: sectionId || `section-${Date.now()}-${nextState.sections.length}`, title: label || "New Section", items: [] };
      nextState.sections.push(section);
      sectionMap.set(section.id, section);
      return;
    }
    if (recordType === "item") {
      const targetSection = sectionMap.get(sectionId) ?? nextState.sections[nextState.sections.length - 1];
      if (!targetSection) return;
      targetSection.items.push({ id: `${targetSection.id}-item-${targetSection.items.length + 1}`, name: label || "", amount: amount || "", frequency: frequency === "Annual" ? "Annual" : "Monthly" });
    }
  });

  if (!nextState.sections.length) nextState.sections = defaultState().sections;
  nextState.sections = nextState.sections.map((section, index) => ({
    ...section,
    id: section.id || `section-${index + 1}`,
    items: section.items.length ? section.items : [{ id: `${section.id || `section-${index + 1}`}-item-1`, name: "", amount: "", frequency: "Monthly" }],
  }));

  state = nextState;
  saveState();
}

function downloadCsv() {
  const csvText = serializeStateToCsv();
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = "budget_calculator.csv";
  anchor.click();
  URL.revokeObjectURL(anchor.href);
  showStatus("CSV exported.");
}

function renderAll() {
  renderMonthlyInputs();
  renderBudgetSections();
  renderBenefitsSummaryHeader();
  renderBenefitsSummary();
  renderExpenseTotals();
}

function handleCsvFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      importStateFromCsv(String(reader.result || ""));
      renderAll();
      showStatus("CSV imported.");
    } catch (error) {
      showStatus(error.message || "Unable to import CSV.", true);
    }
  };
  reader.readAsText(file);
}

function renderMonthlyInputs() {
  const container = document.getElementById("monthlyInputsGrid");
  container.innerHTML = "";
  const header = document.createElement("div");
  header.className = "monthly-header";
  const blankNode = document.createElement("span");
  blankNode.textContent = "";
  const user1NameInput = buildColumnNameInput(state.userLabels.user1, (value) => {
    state.userLabels.user1 = value;
    saveState();
    renderBenefitsSummaryHeader();
  });
  const user2NameInput = buildColumnNameInput(state.userLabels.user2, (value) => {
    state.userLabels.user2 = value;
    saveState();
    renderBenefitsSummaryHeader();
  });
  const totalNode = document.createElement("span");
  totalNode.textContent = "Total";
  header.append(blankNode, user1NameInput, user2NameInput, totalNode);
  container.appendChild(header);

  const fields = [
    ["Gross Income", "grossIncome"],
    ["Take Home", "takeHome"],
    ["Bonus Income", "bonusIncome"],
    ["Take Home Bonus", "takeHomeBonus"],
    ["Retirement - 401k", "retirement"],
    ["Bonus - 401k", "bonus401k"],
    ["HSA", "hsa"],
  ];

  fields.forEach(([label, key]) => {
    const row = document.createElement("div");
    row.className = "monthly-row";
    const labelNode = document.createElement("div");
    labelNode.className = "row-label";
    labelNode.textContent = label;
    const user1Input = buildMoneyInput(state.monthlyInputs[key].user1, (value) => {
      state.monthlyInputs[key].user1 = value;
      updateCalculatedAreas();
    });
    const user2Input = buildMoneyInput(state.monthlyInputs[key].user2, (value) => {
      state.monthlyInputs[key].user2 = value;
      updateCalculatedAreas();
    });
    const total = document.createElement("div");
    total.className = "calc-value";
    total.dataset.totalKey = key;
    total.textContent = formatCurrency(calculateInputTotal(key));
    row.append(labelNode, user1Input, user2Input, total);
    container.appendChild(row);
  });
}

function addItem(sectionId) {
  const section = state.sections.find((entry) => entry.id === sectionId);
  if (!section) return;
  section.items.push({ id: `${sectionId}-${Date.now()}`, name: "", amount: "", frequency: "Monthly" });
  saveState();
  renderBudgetSections();
  updateCalculatedAreas();
}

function removeItem(sectionId, itemId) {
  const section = state.sections.find((entry) => entry.id === sectionId);
  if (!section) return;
  section.items = section.items.filter((item) => item.id !== itemId);
  saveState();
  renderBudgetSections();
  updateCalculatedAreas();
}

function removeSection(sectionId) {
  if (state.sections.length === 1) {
    showStatus("Keep at least one section in the budget.", true);
    return;
  }
  state.sections = state.sections.filter((section) => section.id !== sectionId);
  saveState();
  renderBudgetSections();
  updateCalculatedAreas();
  showStatus("Section removed.");
}

function addSection() {
  state.sections.push({ id: `section-${Date.now()}`, title: "New Section", items: [{ id: `item-${Date.now()}`, name: "", amount: "", frequency: "Monthly" }] });
  saveState();
  renderBudgetSections();
  updateCalculatedAreas();
  showStatus("New section added.");
}

function renderBudgetSections() {
  const container = document.getElementById("budgetSections");
  container.innerHTML = "";
  state.sections.forEach((section) => {
    const sectionNode = document.createElement("section");
    sectionNode.className = "budget-section";
    const headingRow = document.createElement("div");
    headingRow.className = "section-heading-row";
    const titleNode = document.createElement("div");
    titleNode.className = "section-title";
    const titleInput = buildSectionTitleInput(section.title, (value) => {
      section.title = value;
      saveState();
      renderExpenseTotals();
    });
    titleNode.appendChild(titleInput);
    const actionsNode = document.createElement("div");
    actionsNode.className = "section-actions";
    const addButton = buildButton("+", "plus-button", () => addItem(section.id), "Add line item");
    const removeSectionButton = buildButton("×", "plus-button remove-button", () => removeSection(section.id), "Remove section");
    actionsNode.append(addButton);
    if (state.sections.length > 1) actionsNode.append(removeSectionButton);
    headingRow.append(titleNode, actionsNode);
    sectionNode.appendChild(headingRow);
    const itemsWrap = document.createElement("div");
    itemsWrap.className = "section-items";

    section.items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "line-item-row";
      const monthlyNode = document.createElement("div");
      monthlyNode.className = "calc-value";
      const annualNode = document.createElement("div");
      annualNode.className = "calc-value";
      const refreshMonthlyNode = () => {
        monthlyNode.textContent = formatCurrency(amountToMonthly(parseAmount(item.amount), item.frequency));
      };
      const refreshAnnualNode = () => {
        annualNode.textContent = formatCurrency(amountToAnnual(parseAmount(item.amount), item.frequency));
      };
      const nameInput = buildTextInput(item.name, "Line item", (value) => {
        item.name = value;
        saveState();
      });
      const amountInput = buildMoneyInput(item.amount, (value) => {
        item.amount = value;
        refreshMonthlyNode();
        refreshAnnualNode();
        updateCalculatedAreas();
      });
      const frequencySelect = buildFrequencySelect(item.frequency, (value) => {
        item.frequency = value;
        refreshMonthlyNode();
        refreshAnnualNode();
        updateCalculatedAreas();
      });
      refreshMonthlyNode();
      refreshAnnualNode();
      const removeButton = buildButton("×", "plus-button remove-button", () => removeItem(section.id, item.id), "Remove line item");
      row.append(nameInput, amountInput, frequencySelect, monthlyNode, annualNode, removeButton);
      itemsWrap.appendChild(row);
    });

    sectionNode.appendChild(itemsWrap);
    container.appendChild(sectionNode);
  });
}

function renderBenefitsSummary() {
  const mainContainer = document.getElementById("benefitsSummaryMain");
  const referenceContainer = document.getElementById("benefitsSummaryReference");
  mainContainer.innerHTML = "";
  referenceContainer.innerHTML = "";
  const summary = calculateBenefitsSummary();
  const mainRows = [
    ["Total Annual Income", summary.totalAnnualIncome, formatCurrency],
    ["Total for 401k", summary.total401k, formatCurrency],
    ["Total for HSA", summary.totalHsa, formatCurrency],
  ];
  const referenceRows = [
    ["Total Taxes / Benefits", summary.totalTaxesBenefits, formatCurrency],
    ["401k Contribution %", summary.contribution401kPercent, formatPercent],
  ];

  const appendRows = (container, rows) => {
    rows.forEach(([label, values, formatter]) => {
      const row = document.createElement("div");
      row.className = "benefit-row";
      const labelNode = document.createElement("div");
      labelNode.className = "benefit-label";
      labelNode.textContent = label;
      const user1Node = document.createElement("div");
      user1Node.className = "calc-value benefit-value";
      user1Node.textContent = formatter(values.user1);
      const user2Node = document.createElement("div");
      user2Node.className = "calc-value benefit-value";
      user2Node.textContent = formatter(values.user2);
      const totalNode = document.createElement("div");
      totalNode.className = "calc-value benefit-value";
      totalNode.textContent = formatter(values.total);
      row.append(labelNode, user1Node, user2Node, totalNode);
      container.appendChild(row);
    });
  };

  appendRows(mainContainer, mainRows);
  appendRows(referenceContainer, referenceRows);
}

function renderBenefitsSummaryHeader() {
  const container = document.querySelector(".benefits-header");
  if (!container) return;
  container.innerHTML = "";
  const blankNode = document.createElement("span");
  blankNode.textContent = "";
  const user1Node = document.createElement("span");
  user1Node.textContent = state.userLabels.user1 || "User 1";
  const user2Node = document.createElement("span");
  user2Node.textContent = state.userLabels.user2 || "User 2";
  const totalNode = document.createElement("span");
  totalNode.textContent = "Total";
  container.append(blankNode, user1Node, user2Node, totalNode);
}

function renderExpenseTotals() {
  const container = document.getElementById("expenseTotals");
  const summaryContainer = document.getElementById("monthlySummary");
  container.innerHTML = "";
  summaryContainer.innerHTML = "";
  const totalsHeader = document.createElement("div");
  totalsHeader.className = "expense-totals-header";
  const blankLabel = document.createElement("span");
  const monthlyLabel = document.createElement("span");
  monthlyLabel.textContent = "Monthly";
  const annualLabel = document.createElement("span");
  annualLabel.textContent = "Annual";
  totalsHeader.append(blankLabel, monthlyLabel, annualLabel);
  container.appendChild(totalsHeader);

  state.sections.forEach((section) => {
    const row = document.createElement("div");
    row.className = "expense-total-row";
    const monthlyAmount = calculateSectionMonthly(section);
    const label = document.createElement("span");
    label.textContent = section.title;
    const monthlyValue = document.createElement("span");
    monthlyValue.textContent = formatCurrency(monthlyAmount);
    const annualValue = document.createElement("span");
    annualValue.textContent = formatCurrency(monthlyAmount * MONTHS_PER_YEAR);
    row.append(label, monthlyValue, annualValue);
    container.appendChild(row);
  });

  const takeHomeMonthly = biweeklyToMonthly(calculateInputTotal("takeHome")) + annualToMonthly(calculateInputTotal("takeHomeBonus"));
  const remaining = takeHomeMonthly - calculateGrandMonthlyExpenses();
  [["Monthly Total", takeHomeMonthly, "positive"], ["Monthly Remaining", remaining, remaining < 0 ? "negative" : "positive"]].forEach(([labelText, valueAmount, valueClass]) => {
    const row = document.createElement("div");
    row.className = "summary-total-row";
    const label = document.createElement("span");
    label.textContent = labelText;
    const value = document.createElement("span");
    value.className = valueClass;
    value.textContent = formatCurrency(valueAmount);
    row.append(label, value);
    summaryContainer.appendChild(row);
  });
}

function updateCalculatedAreas() {
  saveState();
  updateMonthlyTotals();
  renderBenefitsSummary();
  renderExpenseTotals();
}

function resetAll() {
  state = defaultState();
  saveState();
  renderAll();
  showStatus("Reset to the default biweekly layout.");
}

function initialize() {
  loadSavedState();
  renderAll();
  document.getElementById("resetButton").addEventListener("click", resetAll);
  document.getElementById("addSectionButton").addEventListener("click", addSection);
  document.getElementById("exportCsvButton").addEventListener("click", downloadCsv);
  document.getElementById("importCsvButton").addEventListener("click", () => {
    document.getElementById("csvFileInput").click();
  });
  document.getElementById("csvFileInput").addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (file) {
      handleCsvFile(file);
      event.target.value = "";
    }
  });
}

initialize();
