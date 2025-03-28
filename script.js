document.addEventListener('DOMContentLoaded', () => {
    // --- Elementi DOM ---
    const transactionForm = document.getElementById('transaction-form');
    const typeInput = document.getElementById('type');
    const descriptionInput = document.getElementById('description');
    const amountInput = document.getElementById('amount');
    const dateInput = document.getElementById('date');

    const periodSelect = document.getElementById('period-select');
    const selectedPeriodDisplay = document.getElementById('selected-period-display');
    const totalIncomeEl = document.getElementById('total-income');
    const totalExpenseEl = document.getElementById('total-expense');
    const balanceEl = document.getElementById('balance');

    const transactionList = document.getElementById('transaction-list');
    const noTransactionsEl = document.getElementById('no-transactions');

    // Modal Modifica
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-transaction-form');
    const editIdInput = document.getElementById('edit-id');
    const editTypeInput = document.getElementById('edit-type');
    const editDescriptionInput = document.getElementById('edit-description');
    const editAmountInput = document.getElementById('edit-amount');
    const editDateInput = document.getElementById('edit-date');
    const closeModalBtn = document.querySelector('.close-modal-btn');

    // --- Stato Applicazione ---
    // Carica transazioni da localStorage o usa un array vuoto
    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    let currentFilter = 'current_month'; // Filtro iniziale

    // --- Funzioni ---

    // Formattazione Valuta
    function formatCurrency(amount) {
        return `€ ${amount.toFixed(2).replace('.', ',')}`;
    }

    // Formattazione Data (YYYY-MM-DD)
    function formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00'); // Assicura interpretazione locale
        return date.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
     // Genera ID Univoco (semplice timestamp + random)
    function generateID() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Salva Transazioni su localStorage
    function saveTransactions() {
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }

    // Aggiunge una transazione all'interfaccia
    function addTransactionDOM(transaction, animate = false) {
        const item = document.createElement('tr');
        item.setAttribute('data-id', transaction.id);

        const isExpense = transaction.type === 'expense';
        const amountSign = isExpense ? '-' : '+';
        const amountClass = isExpense ? 'amount-expense' : 'amount-income';
        const typeClass = isExpense ? 'type-expense' : 'type-income';
        const typeText = isExpense ? 'Spesa' : 'Entrata';

        // Aggiungi attributi data-label per CSS responsive
        item.innerHTML = `
            <td data-label="Data">${formatDate(transaction.date)}</td>
            <td data-label="Tipo" class="${typeClass}">${typeText}</td>
            <td data-label="Descrizione">${transaction.description}</td>
            <td data-label="Importo" class="${amountClass}">${amountSign} ${formatCurrency(transaction.amount)}</td>
            <td data-label="Azioni">
                <button class="btn-icon btn-edit" aria-label="Modifica">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-delete" aria-label="Elimina">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        // Aggiungi effetto fade-in se richiesto
        if (animate) {
            item.style.opacity = '0'; // Inizia trasparente
             // Usa requestAnimationFrame per assicurare che l'elemento sia nel DOM prima di animare
            requestAnimationFrame(() => {
                 // Usa una piccola transizione CSS o l'animazione keyframe definita
                item.style.transition = 'opacity 0.5s ease';
                item.style.opacity = '1';
                 // O attiva l'animazione CSS
                 // item.style.animation = 'fadeInRow 0.5s ease-out forwards';
            });
        }

        // Aggiungi event listener per i bottoni Edit/Delete DENTRO questa funzione
        item.querySelector('.btn-edit').addEventListener('click', () => openEditModal(transaction.id));
        item.querySelector('.btn-delete').addEventListener('click', () => deleteTransaction(transaction.id));


        transactionList.appendChild(item); // Aggiunge in fondo
        // Per aggiungere in cima: transactionList.insertBefore(item, transactionList.firstChild);
    }


    // Aggiorna Riepilogo (Entrate, Spese, Saldo)
    function updateOverview(filteredTransactions) {
        const amounts = filteredTransactions.map(t => t.type === 'income' ? t.amount : -t.amount);

        const income = amounts
            .filter(item => item > 0)
            .reduce((acc, item) => (acc += item), 0);

        const expense = amounts
            .filter(item => item < 0)
            .reduce((acc, item) => (acc += item), 0) * -1; // Rendi positivo

        const balance = income - expense;

        totalIncomeEl.textContent = formatCurrency(income);
        totalExpenseEl.textContent = formatCurrency(expense);
        balanceEl.textContent = formatCurrency(balance);

        // Aggiungi classe per colore saldo
        balanceEl.classList.remove('positive', 'negative', 'zero');
        if (balance > 0) {
            balanceEl.classList.add('positive');
        } else if (balance < 0) {
            balanceEl.classList.add('negative');
        } else {
             balanceEl.classList.add('zero');
        }
    }

     // Popola le opzioni del filtro periodo dinamicamente
    function populatePeriodFilter() {
        const periods = new Set(); // Usiamo un Set per evitare duplicati
        transactions.forEach(t => {
            const yearMonth = t.date.substring(0, 7); // YYYY-MM
            const year = t.date.substring(0, 4); // YYYY
            periods.add(yearMonth);
            periods.add(`year_${year}`);
        });

        // Rimuovi opzioni vecchie (tranne quelle di default)
        const existingOptions = periodSelect.querySelectorAll('option:not([value="current_month"]):not([value="current_year"]):not([value="all_time"])');
        existingOptions.forEach(opt => opt.remove());

        // Ordina i periodi (prima gli anni, poi i mesi)
        const sortedPeriods = Array.from(periods).sort((a, b) => {
             if (a.startsWith('year_') && !b.startsWith('year_')) return -1;
             if (!a.startsWith('year_') && b.startsWith('year_')) return 1;
             // Se entrambi sono anni o entrambi sono mesi, ordina alfabeticamente (che funziona per date YYYY-MM e 'year_YYYY')
             return b.localeCompare(a); // Decrescente (più recenti prima)
        });

        // Aggiungi nuove opzioni
        sortedPeriods.forEach(period => {
            const option = document.createElement('option');
            option.value = period;
            if (period.startsWith('year_')) {
                const year = period.substring(5);
                option.textContent = `Anno ${year}`;
            } else {
                 const [year, month] = period.split('-');
                 const monthName = new Date(year, month - 1, 1).toLocaleString('it-IT', { month: 'long' });
                 option.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
                 option.value = `month_${period}`; // Usa un prefisso per distinguerlo dagli anni
            }
            periodSelect.appendChild(option);
        });

        // Reimposta il valore selezionato se esiste ancora, altrimenti torna a 'current_month'
        if (periodSelect.querySelector(`option[value="${currentFilter}"]`)) {
             periodSelect.value = currentFilter;
        } else {
             currentFilter = 'current_month';
             periodSelect.value = currentFilter;
        }
        updateSelectedPeriodDisplay(); // Aggiorna il testo visualizzato
    }


     // Aggiorna il testo che mostra il periodo selezionato
    function updateSelectedPeriodDisplay() {
         const selectedOption = periodSelect.options[periodSelect.selectedIndex];
         selectedPeriodDisplay.textContent = `(${selectedOption.textContent})`;
     }

    // Filtra le transazioni in base al periodo selezionato
    function getFilteredTransactions() {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0'); // Formato MM
        const currentYearMonth = `${currentYear}-${currentMonth}`;

        switch (currentFilter) {
            case 'current_month':
                return transactions.filter(t => t.date.startsWith(currentYearMonth));
            case 'current_year':
                return transactions.filter(t => t.date.startsWith(currentYear.toString()));
            case 'all_time':
                return transactions; // Nessun filtro
            default:
                if (currentFilter.startsWith('month_')) {
                    const yearMonth = currentFilter.substring(6); // Rimuovi 'month_'
                    return transactions.filter(t => t.date.startsWith(yearMonth));
                } else if (currentFilter.startsWith('year_')) {
                     const year = currentFilter.substring(5); // Rimuovi 'year_'
                     return transactions.filter(t => t.date.startsWith(year));
                }
                return []; // Caso imprevisto
        }
    }


    // Renderizza la lista delle transazioni e aggiorna il riepilogo
    function renderUI() {
        transactionList.innerHTML = ''; // Pulisci la lista attuale

        const filteredTransactions = getFilteredTransactions();

        if (filteredTransactions.length === 0) {
            noTransactionsEl.classList.remove('hidden');
            transactionList.closest('.table-container').style.display = 'none'; // Nascondi tabella se vuota
        } else {
            noTransactionsEl.classList.add('hidden');
            transactionList.closest('.table-container').style.display = 'block'; // Mostra tabella
             // Ordina per data decrescente prima di visualizzare
            filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            filteredTransactions.forEach(transaction => addTransactionDOM(transaction, false)); // Aggiunge senza animazione iniziale
        }


        updateOverview(filteredTransactions);
        populatePeriodFilter(); // Aggiorna le opzioni del filtro ogni volta
    }

    // Aggiunge una nuova transazione
    function addTransaction(e) {
        e.preventDefault(); // Evita il ricaricamento della pagina

        if (descriptionInput.value.trim() === '' || amountInput.value.trim() === '' || dateInput.value.trim() === '') {
            alert('Per favore, compila tutti i campi.');
            return;
        }

        const amount = parseFloat(amountInput.value);
        if (isNaN(amount) || amount <= 0) {
             alert('L\'importo deve essere un numero positivo.');
             return;
        }

        const newTransaction = {
            id: generateID(),
            type: typeInput.value,
            description: descriptionInput.value.trim(),
            amount: amount,
            date: dateInput.value
        };

        transactions.push(newTransaction);
        saveTransactions();
        // addTransactionDOM(newTransaction, true); // Aggiunge con animazione
        renderUI(); // Ri-renderizza tutto per mantenere l'ordinamento e aggiornare i filtri

        // Pulisci il form
        descriptionInput.value = '';
        amountInput.value = '';
        dateInput.value = ''; // Potresti voler impostare la data corrente di default qui
        typeInput.value = 'income'; // Reimposta il tipo
        descriptionInput.focus(); // Metti il focus sul campo descrizione

         // Aggiungi un piccolo effetto visivo alla card del riepilogo
         const overviewCard = document.getElementById('overview-section');
         overviewCard.style.transition = 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out';
         overviewCard.style.transform = 'scale(1.02)';
         overviewCard.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.4)';
         setTimeout(() => {
             overviewCard.style.transform = 'scale(1)';
             overviewCard.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.2)';
         }, 200);
    }

     // Elimina una transazione
    function deleteTransaction(id) {
        if (!confirm('Sei sicuro di voler eliminare questa transazione?')) {
            return;
        }

        // Trova l'elemento da rimuovere per animazione (opzionale)
        const itemToRemove = transactionList.querySelector(`tr[data-id="${id}"]`);
        if (itemToRemove) {
            itemToRemove.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            itemToRemove.style.opacity = '0';
            itemToRemove.style.transform = 'translateX(-50px)';
            setTimeout(() => {
                 transactions = transactions.filter(transaction => transaction.id !== id);
                 saveTransactions();
                 renderUI(); // Ricarica l'interfaccia
            }, 300); // Aspetta la fine dell'animazione
        } else {
             // Fallback se l'elemento non è trovato (dovrebbe esserci)
             transactions = transactions.filter(transaction => transaction.id !== id);
             saveTransactions();
             renderUI();
        }
    }

    // Apre il modal di modifica e popola i campi
    function openEditModal(id) {
        const transactionToEdit = transactions.find(t => t.id === id);
        if (!transactionToEdit) return;

        editIdInput.value = transactionToEdit.id;
        editTypeInput.value = transactionToEdit.type;
        editDescriptionInput.value = transactionToEdit.description;
        editAmountInput.value = transactionToEdit.amount;
        editDateInput.value = transactionToEdit.date;

        editModal.style.display = 'block';
    }

     // Chiude il modal di modifica
    function closeEditModal() {
        editModal.style.display = 'none';
    }

    // Aggiorna una transazione dopo la modifica nel modal
    function updateTransaction(e) {
        e.preventDefault();

        const id = editIdInput.value;
        const updatedAmount = parseFloat(editAmountInput.value);

        if (editDescriptionInput.value.trim() === '' || isNaN(updatedAmount) || updatedAmount <= 0 || editDateInput.value.trim() === '') {
            alert('Per favore, compila correttamente tutti i campi.');
            return;
        }

        // Trova l'indice della transazione da aggiornare
        const transactionIndex = transactions.findIndex(t => t.id === id);

        if (transactionIndex > -1) {
            transactions[transactionIndex] = {
                id: id,
                type: editTypeInput.value,
                description: editDescriptionInput.value.trim(),
                amount: updatedAmount,
                date: editDateInput.value
            };
            saveTransactions();
            closeEditModal();
            renderUI(); // Ricarica l'interfaccia
        } else {
            alert('Errore: Transazione non trovata.');
            closeEditModal();
        }
    }


    // --- Event Listeners ---
    transactionForm.addEventListener('submit', addTransaction);
    editForm.addEventListener('submit', updateTransaction);
    closeModalBtn.addEventListener('click', closeEditModal);
    periodSelect.addEventListener('change', (e) => {
        currentFilter = e.target.value;
         updateSelectedPeriodDisplay(); // Aggiorna il testo
        renderUI(); // Ricarica l'interfaccia con il nuovo filtro
    });


    // Chiudi modal se si clicca fuori dal contenuto
    window.addEventListener('click', (e) => {
        if (e.target === editModal) {
            closeEditModal();
        }
    });

    // Imposta la data odierna di default nel form di aggiunta
     function setDefaultDate() {
        const today = new Date();
        // Formato YYYY-MM-DD richiesto dall'input type="date"
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0'); // Mese da 0-11 a 1-12, con padding
        const day = today.getDate().toString().padStart(2, '0'); // Giorno con padding
        dateInput.value = `${year}-${month}-${day}`;
    }

    // --- Inizializzazione ---
    setDefaultDate(); // Imposta data di default
    renderUI(); // Renderizza l'interfaccia all'avvio
});