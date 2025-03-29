document.addEventListener('DOMContentLoaded', () => {
    // --- Elementi DOM ---
    const transactionForm = document.getElementById('transaction-form');
    const typeInput = document.getElementById('type');
    const descriptionInput = document.getElementById('description');
    const amountInput = document.getElementById('amount');
    const categorySelect = document.getElementById('category');
    const newCategoryInput = document.getElementById('new-category');
    const dateInput = document.getElementById('date');

    const periodSelect = document.getElementById('period-select');
    const selectedPeriodDisplay = document.getElementById('selected-period-display');
    const searchInput = document.getElementById('search-input');
    const totalIncomeEl = document.getElementById('total-income');
    const totalExpenseEl = document.getElementById('total-expense');
    const balanceEl = document.getElementById('balance');

    const transactionList = document.getElementById('transaction-list');
    const noTransactionsEl = document.getElementById('no-transactions');

    // Grafico
    const overviewChartElement = document.getElementById('overview-chart'); // Ottieni l'ELEMENTO canvas
    const chartCanvasCtx = overviewChartElement ? overviewChartElement.getContext('2d') : null; // Ottieni il CONTESTO (se l'elemento esiste)
    const chartMessageEl = document.getElementById('chart-message');
    let overviewChart = null; // Variabile per l'istanza del grafico Chart.js

    // Categorie e Budget
    const manageCategoriesBtn = document.getElementById('manage-categories-btn');
    const budgetDisplayEl = document.getElementById('budget-display');
    const manageCategoriesModal = document.getElementById('manage-categories-modal');
    const categoryListManagerEl = document.getElementById('category-list-manager');
    const addCategoryInput = document.getElementById('add-category-input');
    const addCategoryBtn = document.getElementById('add-category-btn');
    const saveBudgetsBtn = document.getElementById('save-budgets-btn');
    const categoryModalCloseBtn = manageCategoriesModal.querySelector('.category-modal-close');

    // Export/Import
    const exportExcelBtn = document.getElementById('export-excel-btn'); // Aggiornato
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const importFileInput = document.getElementById('import-file-input'); // Accetta .xlsx

    // Modal Modifica
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-transaction-form');
    const editIdInput = document.getElementById('edit-id');
    const editTypeInput = document.getElementById('edit-type');
    const editDescriptionInput = document.getElementById('edit-description');
    const editAmountInput = document.getElementById('edit-amount');
    const editCategorySelect = document.getElementById('edit-category');
    const editNewCategoryInput = document.getElementById('edit-new-category');
    const editDateInput = document.getElementById('edit-date');
    const closeModalBtn = document.querySelector('.close-modal-btn:not(.category-modal-close)');

    // --- Stato Applicazione ---
    let transactions = JSON.parse(localStorage.getItem('transactions_v2')) || [];
    let categories = JSON.parse(localStorage.getItem('categories_v2')) || [
        { id: 'cat_income_stipendio', name: 'Stipendio', type: 'income' },
        { id: 'cat_income_altro', name: 'Altre Entrate', type: 'income' },
        { id: 'cat_expense_casa', name: 'Casa (Affitto/Mutuo)', type: 'expense' },
        { id: 'cat_expense_bollette', name: 'Bollette', type: 'expense' },
        { id: 'cat_expense_spesa', name: 'Supermercato', type: 'expense' },
        { id: 'cat_expense_trasporti', name: 'Trasporti', type: 'expense' },
        { id: 'cat_expense_svago', name: 'Svago/Uscite', type: 'expense' },
        { id: 'cat_expense_salute', name: 'Salute', type: 'expense' },
        { id: 'cat_expense_altro', name: 'Altro (Spese)', type: 'expense' },
    ];
    let budgets = JSON.parse(localStorage.getItem('budgets_v2')) || {}; // { categoryId: amount }
    let currentFilter = 'current_month';
    let searchTerm = '';
    let debounceTimer;

    // --- Funzioni di Utilità ---
    function formatCurrency(amount) { return `€ ${amount.toFixed(2).replace('.', ',')}`; }
    function formatDate(dateString) {
         // Gestisce sia stringhe YYYY-MM-DD che oggetti Date
         try {
            let date;
            if (dateString instanceof Date) {
                date = dateString;
            } else if (typeof dateString === 'string' && dateString.length >= 10) {
                 // Assicurati che sia interpretata correttamente come locale aggiungendo l'ora
                 const parts = dateString.substring(0, 10).split('-');
                 if (parts.length === 3) {
                    // Crea la data in UTC per evitare problemi di timezone, poi formatta
                    date = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
                 } else {
                    return "Data invalida"; // O gestisci diversamente
                 }
            } else {
                 return "Data invalida";
            }

            return date.toLocaleDateString('it-IT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                timeZone: 'UTC' // Specifica la timezone usata per la creazione
            });
         } catch (e) {
             console.error("Errore formattazione data:", dateString, e);
             return "Errore data";
         }
     }
    function generateID(prefix = 'tx') { return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`; }
    function setDefaultDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;
    }

    // --- Funzioni Salvataggio Dati ---
    function saveTransactions() { localStorage.setItem('transactions_v2', JSON.stringify(transactions)); }
    function saveCategories() { localStorage.setItem('categories_v2', JSON.stringify(categories)); }
    function saveBudgets() { localStorage.setItem('budgets_v2', JSON.stringify(budgets)); }

    // --- Gestione Categorie ---
    function getCategoryNameById(id) { const category = categories.find(cat => cat.id === id); return category ? category.name : 'Non Categorizzato'; }
    function getCategoriesByType(type) { return categories.filter(cat => cat.type === type); }
    function populateCategorySelect(selectElement, transactionType, selectedCategoryId = null) {
        selectElement.innerHTML = '<option value="">-- Seleziona --</option>';
        const relevantCategories = getCategoriesByType(transactionType);
        relevantCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            if (cat.id === selectedCategoryId) { option.selected = true; }
            selectElement.appendChild(option);
        });
        const newOption = document.createElement('option');
        newOption.value = 'add_new';
        newOption.textContent = '-- Aggiungi Nuova Categoria --';
        selectElement.appendChild(newOption);
    }
    function handleNewCategoryInputVisibility(selectElement, inputElement) {
        if (selectElement.value === 'add_new') {
            inputElement.style.display = 'block';
            inputElement.required = true;
            inputElement.focus();
        } else {
            inputElement.style.display = 'none';
            inputElement.required = false;
            inputElement.value = '';
        }
    }
    typeInput.addEventListener('change', () => { populateCategorySelect(categorySelect, typeInput.value); handleNewCategoryInputVisibility(categorySelect, newCategoryInput); });
    categorySelect.addEventListener('change', () => { handleNewCategoryInputVisibility(categorySelect, newCategoryInput); });
    editTypeInput.addEventListener('change', () => { populateCategorySelect(editCategorySelect, editTypeInput.value); handleNewCategoryInputVisibility(editCategorySelect, editNewCategoryInput); });
    editCategorySelect.addEventListener('change', () => { handleNewCategoryInputVisibility(editCategorySelect, editNewCategoryInput); });

    function addCategory(name, type) {
        name = name.trim();
        if (!name || categories.some(cat => cat.name.toLowerCase() === name.toLowerCase() && cat.type === type)) {
            console.warn('Nome categoria vuoto o già esistente:', name, type); return null;
        }
        const newCat = { id: generateID('cat'), name: name, type: type };
        categories.push(newCat);
        saveCategories();
        console.log('Categoria aggiunta:', newCat);
        return newCat;
    }

    // --- Gestione Budget e Modal Categorie ---
    function populateCategoryManager() {
        categoryListManagerEl.innerHTML = '';
        const incomeCats = getCategoriesByType('income');
        const expenseCats = getCategoriesByType('expense');

        function createCategoryListHTML(catList, title) {
            let html = `<h3 style="margin-top:15px; margin-bottom: 5px; color: var(--light-green);">${title}</h3>`;
            if (catList.length === 0) { html += '<p>Nessuna categoria.</p>'; }
            else {
                catList.forEach(cat => {
                    const budgetAmount = budgets[cat.id] || 0;
                    const budgetInputHTML = cat.type === 'expense'
                        ? `<input type="number" class="category-budget-input" data-category-id="${cat.id}" value="${budgetAmount}" min="0" step="1" placeholder="Budget"> €`
                        : '<span style="color: #aaa; font-style: italic;">(Entrata)</span>';
                    html += `<div class="category-manager-item"><label for="budget-${cat.id}">${cat.name}</label><span>${budgetInputHTML}</span></div>`;
                });
            }
            return html;
        }
        categoryListManagerEl.innerHTML = createCategoryListHTML(expenseCats, 'Categorie Spesa (Budget Mensile)') + createCategoryListHTML(incomeCats, 'Categorie Entrata');
    }
    manageCategoriesBtn.addEventListener('click', () => { populateCategoryManager(); manageCategoriesModal.style.display = 'block'; });
    categoryModalCloseBtn.addEventListener('click', () => { manageCategoriesModal.style.display = 'none'; });
    window.addEventListener('click', (e) => { if (e.target === manageCategoriesModal) { manageCategoriesModal.style.display = 'none'; } if (e.target === editModal) { closeEditModal(); } });
    addCategoryBtn.addEventListener('click', () => {
        const name = addCategoryInput.value.trim();
        if (name) {
            const added = addCategory(name, 'expense'); // Aggiunge solo spese da qui
            if (added) {
                addCategoryInput.value = '';
                populateCategoryManager();
                populateCategorySelect(categorySelect, typeInput.value);
                populateCategorySelect(editCategorySelect, editTypeInput.value);
            } else { alert('Categoria di spesa già esistente o nome non valido.'); }
        }
    });
    saveBudgetsBtn.addEventListener('click', () => {
        const budgetInputs = categoryListManagerEl.querySelectorAll('.category-budget-input');
        budgets = {};
        budgetInputs.forEach(input => {
            const categoryId = input.dataset.categoryId;
            const amount = parseFloat(input.value) || 0;
            if (amount > 0) { budgets[categoryId] = amount; }
        });
        saveBudgets();
        manageCategoriesModal.style.display = 'none';
        renderUI();
        alert('Budget salvati con successo!');
    });
    function displayBudgets() {
        const currentMonthTransactions = getFilteredTransactions('current_month');
        const expenseCategories = getCategoriesByType('expense');
        let html = '';

        if (Object.keys(budgets).length === 0 && expenseCategories.length > 0) {
            html = '<p>Nessun budget impostato. <a href="#" id="set-budget-link">Imposta budget</a>.</p>';
        } else if (expenseCategories.length === 0) {
            html = '<p>Nessuna categoria di spesa definita.</p>';
        } else {
            expenseCategories.forEach(cat => {
                const budgetAmount = budgets[cat.id];
                if (budgetAmount && budgetAmount > 0) {
                    const spentAmount = currentMonthTransactions
                        .filter(t => t.type === 'expense' && t.category === cat.id)
                        .reduce((sum, t) => sum + t.amount, 0);
                    const percentage = Math.min((spentAmount / budgetAmount) * 100, 100);
                    const overBudget = spentAmount > budgetAmount;
                    html += `
                        <div class="budget-item">
                            <span class="budget-category-name">${cat.name}</span>
                            <span class="budget-progress">
                                ${formatCurrency(spentAmount)} / ${formatCurrency(budgetAmount)}
                                <div class="budget-bar-container"><div class="budget-bar ${overBudget ? 'over-budget' : ''}" style="width: ${percentage}%"></div></div>
                            </span>
                        </div>`;
                }
            });
            if (html === '') { html = '<p>Nessun budget impostato (> 0). <a href="#" id="set-budget-link">Imposta budget</a>.</p>'; }
        }
        budgetDisplayEl.innerHTML = html;
        const setBudgetLink = document.getElementById('set-budget-link');
        if (setBudgetLink) {
            setBudgetLink.addEventListener('click', (e) => { e.preventDefault(); populateCategoryManager(); manageCategoriesModal.style.display = 'block'; });
        }
    }

    // --- Gestione Transazioni (Aggiunta, Modifica, Eliminazione DOM) ---
    function addTransactionDOM(transaction) {
        const item = document.createElement('tr');
        item.setAttribute('data-id', transaction.id);
        const isExpense = transaction.type === 'expense';
        const amountSign = isExpense ? '-' : '+';
        const amountClass = isExpense ? 'amount-expense' : 'amount-income';
        const typeClass = isExpense ? 'type-expense' : 'type-income';
        const typeText = isExpense ? 'Spesa' : 'Entrata';
        const categoryName = getCategoryNameById(transaction.category);

        item.innerHTML = `
            <td data-label="Data">${formatDate(transaction.date)}</td>
            <td data-label="Tipo" class="${typeClass}">${typeText}</td>
            <td data-label="Categoria">${categoryName}</td>
            <td data-label="Descrizione">${transaction.description}</td>
            <td data-label="Importo" class="${amountClass}">${amountSign} ${formatCurrency(transaction.amount)}</td>
            <td data-label="Azioni">
                <button class="btn-icon btn-edit" aria-label="Modifica"><i class="fas fa-edit"></i></button>
                <button class="btn-icon btn-delete" aria-label="Elimina"><i class="fas fa-trash"></i></button>
            </td>`;
        item.querySelector('.btn-edit').addEventListener('click', () => openEditModal(transaction.id));
        item.querySelector('.btn-delete').addEventListener('click', () => deleteTransaction(transaction.id));
        transactionList.appendChild(item);
    }
    function addTransaction(e) {
        e.preventDefault();
        const type = typeInput.value;
        const description = descriptionInput.value.trim();
        const amount = parseFloat(amountInput.value);
        const date = dateInput.value;
        let categoryId = categorySelect.value;
        const newCategoryName = newCategoryInput.value.trim();

        if (!description || !amount || amount <= 0 || !date || !categoryId) { alert('Compila tutti i campi (Descrizione, Importo, Data, Categoria).'); return; }

        if (categoryId === 'add_new') {
            if (!newCategoryName) { alert('Inserisci un nome per la nuova categoria.'); return; }
            const newCategory = addCategory(newCategoryName, type);
            if (newCategory) {
                categoryId = newCategory.id;
                populateCategorySelect(categorySelect, type, categoryId);
                populateCategorySelect(editCategorySelect, editTypeInput.value);
                newCategoryInput.value = ''; newCategoryInput.style.display = 'none'; newCategoryInput.required = false;
            } else { alert('Errore nell\'aggiungere la categoria. Potrebbe esistere già.'); return; }
        }

        const newTransaction = { id: generateID('tx'), type, description, amount, category: categoryId, date };
        transactions.push(newTransaction);
        saveTransactions();
        renderUI();
        transactionForm.reset();
        setDefaultDate();
        populateCategorySelect(categorySelect, typeInput.value);
        newCategoryInput.style.display = 'none'; newCategoryInput.required = false;
        descriptionInput.focus();
        const overviewCard = document.getElementById('overview-section');
        overviewCard.style.transform = 'scale(1.01)';
        setTimeout(() => { overviewCard.style.transform = 'scale(1)'; }, 200);
    }
    function deleteTransaction(id) {
        if (!confirm('Sei sicuro di voler eliminare questa transazione?')) { return; }
        transactions = transactions.filter(transaction => transaction.id !== id);
        saveTransactions();
        renderUI();
    }
    function openEditModal(id) {
        const transactionToEdit = transactions.find(t => t.id === id);
        if (!transactionToEdit) return;
        editIdInput.value = transactionToEdit.id;
        editTypeInput.value = transactionToEdit.type;
        editDescriptionInput.value = transactionToEdit.description;
        editAmountInput.value = transactionToEdit.amount;
        editDateInput.value = transactionToEdit.date;
        populateCategorySelect(editCategorySelect, transactionToEdit.type, transactionToEdit.category);
        handleNewCategoryInputVisibility(editCategorySelect, editNewCategoryInput);
        editModal.style.display = 'block';
    }
    function closeEditModal() { editModal.style.display = 'none'; editNewCategoryInput.style.display = 'none'; editNewCategoryInput.required = false; }
    function updateTransaction(e) {
        e.preventDefault();
        const id = editIdInput.value;
        const type = editTypeInput.value;
        const description = editDescriptionInput.value.trim();
        const amount = parseFloat(editAmountInput.value);
        const date = editDateInput.value;
        let categoryId = editCategorySelect.value;
        const newCategoryName = editNewCategoryInput.value.trim();

        if (!description || !amount || amount <= 0 || !date || !categoryId) { alert('Compila correttamente tutti i campi.'); return; }

        if (categoryId === 'add_new') {
            if (!newCategoryName) { alert('Inserisci un nome per la nuova categoria.'); return; }
            const newCategory = addCategory(newCategoryName, type);
            if (newCategory) {
                categoryId = newCategory.id;
                populateCategorySelect(categorySelect, typeInput.value);
                populateCategorySelect(editCategorySelect, type, categoryId);
            } else { alert('Errore nell\'aggiungere la categoria. Potrebbe esistere già.'); return; }
        }

        const transactionIndex = transactions.findIndex(t => t.id === id);
        if (transactionIndex > -1) {
            transactions[transactionIndex] = { id, type, description, amount, category: categoryId, date };
            saveTransactions();
            closeEditModal();
            renderUI();
        } else { alert('Errore: Transazione non trovata.'); closeEditModal(); }
    }

    // --- Filtro, Ricerca, Riepilogo e Grafico ---
    function updateOverview(filteredTransactions) {
        const amounts = filteredTransactions.map(t => t.type === 'income' ? t.amount : -t.amount);
        const income = amounts.filter(item => item > 0).reduce((acc, item) => (acc + item), 0);
        const expense = Math.abs(amounts.filter(item => item < 0).reduce((acc, item) => (acc + item), 0));
        const balance = income - expense;
        totalIncomeEl.textContent = formatCurrency(income);
        totalExpenseEl.textContent = formatCurrency(expense);
        balanceEl.textContent = formatCurrency(balance);
        balanceEl.className = balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'zero';
    }
    function populatePeriodFilter() {
        const periods = new Set();
        transactions.forEach(t => {
            const yearMonth = t.date.substring(0, 7);
            const year = t.date.substring(0, 4);
            periods.add(`month_${yearMonth}`);
            periods.add(`year_${year}`);
        });
        const existingOptions = periodSelect.querySelectorAll('option:not([value="current_month"]):not([value="current_year"]):not([value="all_time"])');
        existingOptions.forEach(opt => opt.remove());
        const sortedPeriods = Array.from(periods).sort((a, b) => b.localeCompare(a));
        sortedPeriods.forEach(period => {
            const option = document.createElement('option');
            option.value = period;
            if (period.startsWith('year_')) { option.textContent = `Anno ${period.substring(5)}`; }
            else {
                const [year, month] = period.substring(6).split('-');
                const monthName = new Date(year, month - 1, 1).toLocaleString('it-IT', { month: 'long' });
                option.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
            }
            periodSelect.insertBefore(option, periodSelect.querySelector('option[value="all_time"]').nextSibling);
        });
        periodSelect.value = currentFilter;
        updateSelectedPeriodDisplay();
    }
    function updateSelectedPeriodDisplay() { const selectedOption = periodSelect.options[periodSelect.selectedIndex]; selectedPeriodDisplay.textContent = `(${selectedOption.textContent})`; }
    function getFilteredTransactions(filter = currentFilter, term = searchTerm) {
        let filtered = [];
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
        const currentYearMonth = `${currentYear}-${currentMonth}`;

        switch (filter) {
            case 'current_month': filtered = transactions.filter(t => t.date.startsWith(currentYearMonth)); break;
            case 'current_year': filtered = transactions.filter(t => t.date.startsWith(currentYear.toString())); break;
            case 'all_time': filtered = [...transactions]; break;
            default:
                if (filter.startsWith('month_')) { const yearMonth = filter.substring(6); filtered = transactions.filter(t => t.date.startsWith(yearMonth)); }
                else if (filter.startsWith('year_')) { const year = filter.substring(5); filtered = transactions.filter(t => t.date.startsWith(year)); }
                break;
        }
        if (term) {
            const lowerCaseTerm = term.toLowerCase();
            filtered = filtered.filter(t => t.description.toLowerCase().includes(lowerCaseTerm) || getCategoryNameById(t.category).toLowerCase().includes(lowerCaseTerm));
        }
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        return filtered;
    }
       // --- Grafico Chart.js ---
       // --- Grafico Chart.js ---
function updateChart(filteredTransactions) {
    // Controlla se l'elemento canvas e il suo contesto sono validi
    if (!overviewChartElement || !chartCanvasCtx) {
        console.error("Errore critico: Elemento canvas '#overview-chart' o suo contesto non trovato!");
        // Prova a nascondere/mostrare elementi se esistono
        if(overviewChartElement) overviewChartElement.style.display = 'none';
        if(chartMessageEl) {
            chartMessageEl.textContent = 'Errore inizializzazione grafico.';
            chartMessageEl.classList.remove('hidden');
        }
        return; // Non possiamo procedere
    }

    // Distruggi grafico esistente se c'è
    if (overviewChart) {
        try {
            overviewChart.destroy();
            overviewChart = null;
            console.log("Grafico precedente distrutto.");
        } catch (e) {
            console.error("Errore nel distruggere il grafico precedente:", e);
        }
    }

    // Calcola spese per categoria
    const expensesByCategory = {};
    let totalExpenses = 0;
    filteredTransactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
            const categoryName = getCategoryNameById(t.category) || 'Non Categorizzato';
            expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + t.amount;
            totalExpenses += t.amount;
        });

    console.log("Dati per il grafico:", { expensesByCategory, totalExpenses });

    const categoryLabels = Object.keys(expensesByCategory);
    const categoryData = Object.values(expensesByCategory);

    // Gestisci la visualizzazione del canvas o del messaggio
    if (totalExpenses <= 0 || categoryLabels.length === 0) {
        console.log("Nessuna spesa valida trovata per il grafico.");
        overviewChartElement.style.display = 'none'; // Nascondi l'ELEMENTO canvas
        if (chartMessageEl) chartMessageEl.classList.remove('hidden'); // Mostra messaggio (se esiste)
        return;
    } else {
        console.log("Dati validi trovati, tentativo creazione grafico.");
        overviewChartElement.style.display = 'block'; // Mostra l'ELEMENTO canvas
        if (chartMessageEl) chartMessageEl.classList.add('hidden'); // Nascondi messaggio (se esiste)
    }

    // Colori
    const backgroundColors = ['#4db6ac', '#80cbc4', '#26a69a', '#00897b', '#00796b', '#00695c', '#004d40', '#a7ffeb', '#64ffda', '#1de9b6', '#b2dfdb', '#e0f2f1'];
    const chartBackgroundColors = categoryLabels.map((_, index) => backgroundColors[index % backgroundColors.length]);
    const chartBorderColors = chartBackgroundColors.map(color => color.replace(')', ', 0.9)').replace('rgb', 'rgba'));

    // Crea il nuovo grafico usando il CONTESTO
    try {
        overviewChart = new Chart(chartCanvasCtx, { // <<< USA IL CONTESTO QUI
            type: 'doughnut',
            data: {
                labels: categoryLabels,
                datasets: [{
                    label: 'Spese per Categoria',
                    data: categoryData,
                    backgroundColor: chartBackgroundColors,
                    borderColor: chartBorderColors,
                    borderWidth: 1,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { animateScale: true, animateRotate: true },
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#e0f2f1', padding: 15, usePointStyle: true, boxWidth: 10 } },
                    title: { display: true, text: `Distribuzione Spese (${selectedPeriodDisplay.textContent.slice(1, -1)})`, color: '#fff', font: { size: 16 }, padding: { top: 10, bottom: 20 } },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)', titleColor: '#fff', bodyColor: '#fff',
                        callbacks: {
                            label: function(context) { /* ... (callback tooltip come prima) ... */
                                let label = context.label || ''; if (label) { label += ': '; }
                                if (context.parsed !== null) {
                                    label += formatCurrency(context.parsed);
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                                    label += ` (${percentage}%)`;
                                } return label;
                            }
                        }
                    }
                }
            }
        });
        console.log("Nuovo grafico creato con successo.");
    } catch(error) {
        console.error("Errore durante la creazione dell'istanza Chart.js:", error);
        overviewChartElement.style.display = 'none'; // Nascondi l'ELEMENTO in caso di errore
        if (chartMessageEl) {
            chartMessageEl.textContent = 'Errore durante la creazione del grafico.';
            chartMessageEl.classList.remove('hidden');
        }
    }
}
    // --- EXPORT / IMPORT (Excel con SheetJS) ---
    function exportToExcel() {
        try {
            const transactionsSheetData = transactions
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .map(t => ({
                    'Data': formatDate(t.date),
                    'Tipo': t.type === 'income' ? 'Entrata' : 'Spesa',
                    'Categoria ID': t.category,
                    'Nome Categoria': getCategoryNameById(t.category),
                    'Descrizione': t.description,
                    'Importo': t.amount
                }));
            const categoriesSheetData = categories.map(c => ({ 'ID Categoria': c.id, 'Nome Categoria': c.name, 'Tipo (income/expense)': c.type }));
            const budgetsSheetData = categories
                .filter(c => c.type === 'expense')
                .map(c => ({ 'ID Categoria': c.id, 'Nome Categoria': c.name, 'Budget Mensile': budgets[c.id] || 0 }));

            const wb = XLSX.utils.book_new();
            const wsTransactions = XLSX.utils.json_to_sheet(transactionsSheetData);
            const wsCategories = XLSX.utils.json_to_sheet(categoriesSheetData);
            const wsBudgets = XLSX.utils.json_to_sheet(budgetsSheetData);

            // Imposta larghezze colonne (opzionale ma consigliato)
            wsTransactions['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 25 }, { wch: 25 }, { wch: 40 }, { wch: 15 }];
            wsCategories['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 20 }];
            wsBudgets['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 15 }];

            XLSX.utils.book_append_sheet(wb, wsTransactions, 'Transazioni');
            XLSX.utils.book_append_sheet(wb, wsCategories, 'Categorie');
            XLSX.utils.book_append_sheet(wb, wsBudgets, 'Budget');

            const filename = `GestioneSpese_Backup_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX.writeFile(wb, filename);
        } catch (error) { console.error('Errore export Excel:', error); alert('Errore durante l\'esportazione in Excel.'); }
    }
    function importFromExcel(event) {
        const file = event.target.files[0];
        if (!file) { return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'array', cellDates: true }); // Tenta di leggere le date
                const wsTransactions = workbook.Sheets['Transazioni'];
                const wsCategories = workbook.Sheets['Categorie'];
                const wsBudgets = workbook.Sheets['Budget'];

                if (!wsTransactions || !wsCategories || !wsBudgets) { throw new Error('File Excel non valido: mancano i fogli "Transazioni", "Categorie" o "Budget".'); }

                // Leggi dati grezzi (prima riga è header)
                const importedTransactionsRaw = XLSX.utils.sheet_to_json(wsTransactions, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });
                const importedCategoriesRaw = XLSX.utils.sheet_to_json(wsCategories, { header: 1 });
                const importedBudgetsRaw = XLSX.utils.sheet_to_json(wsBudgets, { header: 1 });

                // Processa Categorie
                const importedCategories = [];
                const categoryIdMap = new Map();
                for (let i = 1; i < importedCategoriesRaw.length; i++) { // Salta header
                    const row = importedCategoriesRaw[i];
                    const id = row[0]?.trim(); const name = row[1]?.trim(); const type = row[2]?.trim().toLowerCase();
                    if (!id || !name || (type !== 'income' && type !== 'expense') || categoryIdMap.has(id)) { continue; } // Ignora invalide/duplicate
                    importedCategories.push({ id, name, type }); categoryIdMap.set(id, name);
                }
                if (importedCategories.length === 0) { throw new Error("Nessuna categoria valida trovata nel foglio 'Categorie'."); }

                // Processa Budget
                const importedBudgets = {};
                for (let i = 1; i < importedBudgetsRaw.length; i++) { // Salta header
                    const row = importedBudgetsRaw[i];
                    const catId = row[0]?.trim(); const budgetAmountRaw = row[2];
                    if (!catId || !categoryIdMap.has(catId)) { continue; } // ID non valido
                    const budgetAmount = parseFloat(budgetAmountRaw);
                    if (!isNaN(budgetAmount) && budgetAmount >= 0) { importedBudgets[catId] = budgetAmount; } // Accetta 0
                }

                // Processa Transazioni
                const importedTransactions = [];
                const errorsTransaction = [];
                for (let i = 1; i < importedTransactionsRaw.length; i++) { // Salta header
                    const row = importedTransactionsRaw[i];
                    let dateValue = row[0]; let dateStr = '';
                    if (dateValue instanceof Date) { dateStr = dateValue.toISOString().slice(0, 10); }
                    else if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue.substring(0,10))) { dateStr = dateValue.substring(0, 10); } // Prova a prendere YYYY-MM-DD
                    else { errorsTransaction.push(`Riga ${i + 1}: Formato data non riconosciuto - ${dateValue}`); continue; } // Data non valida

                    const typeRaw = row[1]?.trim(); const catId = row[2]?.trim(); const description = row[4]?.trim(); const amountRaw = row[5];
                    const type = (typeRaw === 'Entrata') ? 'income' : (typeRaw === 'Spesa') ? 'expense' : null;
                    const amount = parseFloat(amountRaw);

                    if (!dateStr || !type || !catId || !description || isNaN(amount) || amount <= 0 || !categoryIdMap.has(catId)) {
                         errorsTransaction.push(`Riga ${i + 1}: Dati mancanti, non validi o Categoria ID non trovata - ${JSON.stringify(row)}`); continue;
                    }
                    importedTransactions.push({ date: dateStr, type, category: catId, description, amount }); // ID verrà aggiunto dopo
                }

                // Conferma Utente
                let confirmationMessage = `Importazione Excel:\n- ${importedCategories.length} categorie\n- ${Object.keys(importedBudgets).length} budget\n- ${importedTransactions.length} transazioni valide\n`;
                if (errorsTransaction.length > 0) { confirmationMessage += `\nATTENZIONE: ${errorsTransaction.length} righe transazione ignorate (vedi console).\n`; console.warn("Errori import transazioni:", errorsTransaction); }
                confirmationMessage += "\nVuoi SOSTITUIRE tutti i dati attuali?";

                if (confirm(confirmationMessage)) {
                    const finalTransactions = importedTransactions.map(t => ({ ...t, id: generateID('tx') }));
                    transactions = finalTransactions; categories = importedCategories; budgets = importedBudgets;
                    saveTransactions(); saveCategories(); saveBudgets();
                    currentFilter = 'current_month'; searchTerm = ''; searchInput.value = '';
                    initializeApp(); // Ricarica tutto
                    alert('Dati importati con successo da Excel!');
                } else { alert('Importazione annullata.'); }

            } catch (error) { console.error('Errore import Excel:', error); alert(`Errore importazione: ${error.message}`); }
            finally { importFileInput.value = null; } // Resetta input file
        };
        reader.onerror = () => { alert('Errore lettura file Excel.'); importFileInput.value = null; };
        reader.readAsArrayBuffer(file); // Leggi come ArrayBuffer per SheetJS
    }
    // Funzione helper per download CSV (se bottone mantenuto)
    function downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }

    // --- Render UI Principale ---
    function renderUI() {
        transactionList.innerHTML = '';
        populatePeriodFilter();
        const filteredTransactions = getFilteredTransactions();

        if (filteredTransactions.length === 0) {
            noTransactionsEl.classList.remove('hidden');
            transactionList.closest('.table-container').style.display = 'none';
        } else {
            noTransactionsEl.classList.add('hidden');
            transactionList.closest('.table-container').style.display = 'block';
            filteredTransactions.forEach(transaction => addTransactionDOM(transaction));
        }
        updateOverview(filteredTransactions);
        updateChart(filteredTransactions);
        displayBudgets();
    }

    // --- Event Listeners ---
    transactionForm.addEventListener('submit', addTransaction);
    editForm.addEventListener('submit', updateTransaction);
    closeModalBtn.addEventListener('click', closeEditModal);
    periodSelect.addEventListener('change', (e) => { currentFilter = e.target.value; updateSelectedPeriodDisplay(); renderUI(); });
    searchInput.addEventListener('input', () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(() => { searchTerm = searchInput.value.trim(); renderUI(); }, 300); });
    exportExcelBtn.addEventListener('click', exportToExcel); // Listener per Excel
    importFileInput.addEventListener('change', importFromExcel); // Listener per Excel
    // Listener per CSV (se bottone mantenuto)
    exportCsvBtn.addEventListener('click', () => {
        if (transactions.length === 0) { alert('Nessuna transazione da esportare.'); return; }
        const headers = ['Data', 'Tipo', 'Categoria', 'Descrizione', 'Importo']; let csvContent = headers.join(',') + '\n';
        const transactionsToExport = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date)); // Esporta TUTTE ordinate per data
        transactionsToExport.forEach(t => {
            const categoryName = getCategoryNameById(t.category); const description = t.description.includes(',') ? `"${t.description}"` : t.description; const category = categoryName.includes(',') ? `"${categoryName}"` : categoryName;
            const row = [formatDate(t.date), t.type === 'income' ? 'Entrata' : 'Spesa', category, description, t.amount.toFixed(2)];
            csvContent += row.join(',') + '\n';
        });
        downloadFile(`transazioni_${new Date().toISOString().slice(0, 10)}.csv`, csvContent, 'text/csv;charset=utf-8;');
    });


    // --- Inizializzazione ---
    function initializeApp() {
        setDefaultDate();
        populateCategorySelect(categorySelect, typeInput.value);
        populateCategorySelect(editCategorySelect, editTypeInput.value); // Anche per modal modifica
        renderUI(); // Renderizza l'interfaccia all'avvio
    }

    initializeApp(); // Avvia l'app
});