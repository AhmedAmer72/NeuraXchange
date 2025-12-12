// Internationalization (i18n) Support
// Multi-language support for EN, ES, FR, RU, CN

export type Language = 'en' | 'es' | 'fr' | 'ru' | 'zh';

export interface TranslationStrings {
  // General
  welcome: string;
  help: string;
  error: string;
  success: string;
  cancel: string;
  confirm: string;
  back: string;
  loading: string;
  
  // Commands
  cmdSwap: string;
  cmdPrice: string;
  cmdLimits: string;
  cmdHistory: string;
  cmdAlerts: string;
  cmdCoins: string;
  cmdStatus: string;
  cmdSettings: string;
  cmdFavorites: string;
  
  // Swap flow
  selectFromCoin: string;
  selectToCoin: string;
  selectNetwork: string;
  enterAmount: string;
  confirmSwap: string;
  swapCreated: string;
  sendFunds: string;
  swapComplete: string;
  swapExpired: string;
  
  // Validation
  invalidAmount: string;
  amountTooLow: string;
  amountTooHigh: string;
  invalidAddress: string;
  rateChanged: string;
  
  // Alerts
  alertCreated: string;
  alertTriggered: string;
  noAlerts: string;
  
  // History
  noHistory: string;
  swapHistory: string;
  
  // Settings
  languageChanged: string;
  selectLanguage: string;
  
  // Status
  statusPending: string;
  statusWaiting: string;
  statusProcessing: string;
  statusSettling: string;
  statusComplete: string;
  statusRefunded: string;
  statusExpired: string;
}

const translations: { [key in Language]: TranslationStrings } = {
  en: {
    // General
    welcome: '👋 *Welcome to NeuraXchange!*\n\nI help you swap cryptocurrencies quickly and securely.',
    help: 'Here are the available commands:',
    error: '⚠️ An error occurred. Please try again.',
    success: '✅ Success!',
    cancel: '❌ Cancelled',
    confirm: '✅ Confirm',
    back: '⬅️ Back',
    loading: '⏳ Loading...',
    
    // Commands
    cmdSwap: '/swap - Start a new swap',
    cmdPrice: '/price - Check exchange rates',
    cmdLimits: '/limits - View min/max limits',
    cmdHistory: '/history - View swap history',
    cmdAlerts: '/myalerts - Manage price alerts',
    cmdCoins: '/coins - List available coins',
    cmdStatus: '/status - Check swap status',
    cmdSettings: '/settings - Bot settings',
    cmdFavorites: '/favorites - Quick swap pairs',
    
    // Swap flow
    selectFromCoin: 'Select the coin you want to swap FROM:',
    selectToCoin: 'Select the coin you want to swap TO:',
    selectNetwork: 'Select the network:',
    enterAmount: 'Enter the amount to swap:',
    confirmSwap: '🤔 Please confirm your swap:',
    swapCreated: '✨ Swap created! Send your funds to complete.',
    sendFunds: '📤 Please send exactly {amount} {coin} to:',
    swapComplete: '✅ Swap completed successfully!',
    swapExpired: '⏰ This swap has expired.',
    
    // Validation
    invalidAmount: '⚠️ Please enter a valid amount.',
    amountTooLow: '⚠️ Amount too low. Minimum is {min} {coin}.',
    amountTooHigh: '⚠️ Amount too high. Maximum is {max} {coin}.',
    invalidAddress: '⚠️ Invalid address. Please check and try again.',
    rateChanged: '⚠️ Rate changed by {change}%. Do you want to continue?',
    
    // Alerts
    alertCreated: '✅ Alert created! I\'ll notify you when {pair} goes {direction} {rate}.',
    alertTriggered: '🔔 PRICE ALERT! {pair} is now {rate}',
    noAlerts: '📭 You have no active alerts.',
    
    // History
    noHistory: '📭 No swap history yet.',
    swapHistory: '📜 *Your Swap History*',
    
    // Settings
    languageChanged: '✅ Language changed to English',
    selectLanguage: '🌐 Select your language:',
    
    // Status
    statusPending: '⏳ Pending',
    statusWaiting: '⏳ Waiting for deposit',
    statusProcessing: '🔄 Processing',
    statusSettling: '📤 Settling',
    statusComplete: '✅ Complete',
    statusRefunded: '↩️ Refunded',
    statusExpired: '⏰ Expired',
  },
  
  es: {
    // General
    welcome: '👋 *¡Bienvenido a NeuraXchange!*\n\nTe ayudo a intercambiar criptomonedas de forma rápida y segura.',
    help: 'Comandos disponibles:',
    error: '⚠️ Ocurrió un error. Por favor, intenta de nuevo.',
    success: '✅ ¡Éxito!',
    cancel: '❌ Cancelado',
    confirm: '✅ Confirmar',
    back: '⬅️ Atrás',
    loading: '⏳ Cargando...',
    
    // Commands
    cmdSwap: '/swap - Iniciar un nuevo intercambio',
    cmdPrice: '/price - Ver tasas de cambio',
    cmdLimits: '/limits - Ver límites min/max',
    cmdHistory: '/history - Ver historial',
    cmdAlerts: '/myalerts - Gestionar alertas',
    cmdCoins: '/coins - Listar monedas',
    cmdStatus: '/status - Ver estado del swap',
    cmdSettings: '/settings - Configuración',
    cmdFavorites: '/favorites - Pares favoritos',
    
    // Swap flow
    selectFromCoin: 'Selecciona la moneda que quieres enviar:',
    selectToCoin: 'Selecciona la moneda que quieres recibir:',
    selectNetwork: 'Selecciona la red:',
    enterAmount: 'Ingresa la cantidad a intercambiar:',
    confirmSwap: '🤔 Por favor confirma tu intercambio:',
    swapCreated: '✨ ¡Intercambio creado! Envía tus fondos.',
    sendFunds: '📤 Envía exactamente {amount} {coin} a:',
    swapComplete: '✅ ¡Intercambio completado!',
    swapExpired: '⏰ Este intercambio ha expirado.',
    
    // Validation
    invalidAmount: '⚠️ Por favor ingresa una cantidad válida.',
    amountTooLow: '⚠️ Cantidad muy baja. Mínimo: {min} {coin}.',
    amountTooHigh: '⚠️ Cantidad muy alta. Máximo: {max} {coin}.',
    invalidAddress: '⚠️ Dirección inválida. Verifica e intenta de nuevo.',
    rateChanged: '⚠️ La tasa cambió {change}%. ¿Deseas continuar?',
    
    // Alerts
    alertCreated: '✅ ¡Alerta creada! Te notificaré cuando {pair} esté {direction} {rate}.',
    alertTriggered: '🔔 ¡ALERTA DE PRECIO! {pair} está ahora en {rate}',
    noAlerts: '📭 No tienes alertas activas.',
    
    // History
    noHistory: '📭 Sin historial de intercambios.',
    swapHistory: '📜 *Tu Historial de Intercambios*',
    
    // Settings
    languageChanged: '✅ Idioma cambiado a Español',
    selectLanguage: '🌐 Selecciona tu idioma:',
    
    // Status
    statusPending: '⏳ Pendiente',
    statusWaiting: '⏳ Esperando depósito',
    statusProcessing: '🔄 Procesando',
    statusSettling: '📤 Liquidando',
    statusComplete: '✅ Completado',
    statusRefunded: '↩️ Reembolsado',
    statusExpired: '⏰ Expirado',
  },

  fr: {
    // General
    welcome: '👋 *Bienvenue sur NeuraXchange!*\n\nJe vous aide à échanger des cryptomonnaies rapidement et en toute sécurité.',
    help: 'Commandes disponibles:',
    error: '⚠️ Une erreur s\'est produite. Veuillez réessayer.',
    success: '✅ Succès!',
    cancel: '❌ Annulé',
    confirm: '✅ Confirmer',
    back: '⬅️ Retour',
    loading: '⏳ Chargement...',
    
    // Commands
    cmdSwap: '/swap - Démarrer un nouvel échange',
    cmdPrice: '/price - Vérifier les taux de change',
    cmdLimits: '/limits - Voir les limites min/max',
    cmdHistory: '/history - Historique des échanges',
    cmdAlerts: '/myalerts - Gérer les alertes de prix',
    cmdCoins: '/coins - Lister les cryptos disponibles',
    cmdStatus: '/status - Vérifier le statut d\'un échange',
    cmdSettings: '/settings - Paramètres du bot',
    cmdFavorites: '/favorites - Paires favorites',
    
    // Swap flow
    selectFromCoin: 'Sélectionnez la crypto à échanger:',
    selectToCoin: 'Sélectionnez la crypto à recevoir:',
    selectNetwork: 'Sélectionnez le réseau:',
    enterAmount: 'Entrez le montant à échanger:',
    confirmSwap: '🤔 Veuillez confirmer votre échange:',
    swapCreated: '✨ Échange créé! Envoyez vos fonds pour finaliser.',
    sendFunds: '📤 Veuillez envoyer exactement {amount} {coin} à:',
    swapComplete: '✅ Échange terminé avec succès!',
    swapExpired: '⏰ Cet échange a expiré.',
    
    // Validation
    invalidAmount: '⚠️ Veuillez entrer un montant valide.',
    amountTooLow: '⚠️ Montant trop bas. Minimum: {min} {coin}.',
    amountTooHigh: '⚠️ Montant trop élevé. Maximum: {max} {coin}.',
    invalidAddress: '⚠️ Adresse invalide. Veuillez vérifier et réessayer.',
    rateChanged: '⚠️ Le taux a changé de {change}%. Voulez-vous continuer?',
    
    // Alerts
    alertCreated: '✅ Alerte créée! Je vous préviendrai quand {pair} sera {direction} {rate}.',
    alertTriggered: '🔔 ALERTE PRIX! {pair} est maintenant à {rate}',
    noAlerts: '📭 Vous n\'avez aucune alerte active.',
    
    // History
    noHistory: '📭 Aucun historique d\'échange.',
    swapHistory: '📜 *Votre Historique d\'Échanges*',
    
    // Settings
    languageChanged: '✅ Langue changée en Français',
    selectLanguage: '🌐 Sélectionnez votre langue:',
    
    // Status
    statusPending: '⏳ En attente',
    statusWaiting: '⏳ En attente du dépôt',
    statusProcessing: '🔄 En cours de traitement',
    statusSettling: '📤 Règlement en cours',
    statusComplete: '✅ Terminé',
    statusRefunded: '↩️ Remboursé',
    statusExpired: '⏰ Expiré',
  },
  
  ru: {
    // General
    welcome: '👋 *Добро пожаловать в NeuraXchange!*\n\nЯ помогу вам быстро и безопасно обменять криптовалюту.',
    help: 'Доступные команды:',
    error: '⚠️ Произошла ошибка. Попробуйте снова.',
    success: '✅ Успешно!',
    cancel: '❌ Отменено',
    confirm: '✅ Подтвердить',
    back: '⬅️ Назад',
    loading: '⏳ Загрузка...',
    
    // Commands
    cmdSwap: '/swap - Начать обмен',
    cmdPrice: '/price - Проверить курсы',
    cmdLimits: '/limits - Лимиты мин/макс',
    cmdHistory: '/history - История обменов',
    cmdAlerts: '/myalerts - Управление уведомлениями',
    cmdCoins: '/coins - Список монет',
    cmdStatus: '/status - Статус обмена',
    cmdSettings: '/settings - Настройки',
    cmdFavorites: '/favorites - Избранные пары',
    
    // Swap flow
    selectFromCoin: 'Выберите монету для отправки:',
    selectToCoin: 'Выберите монету для получения:',
    selectNetwork: 'Выберите сеть:',
    enterAmount: 'Введите сумму обмена:',
    confirmSwap: '🤔 Подтвердите обмен:',
    swapCreated: '✨ Обмен создан! Отправьте средства.',
    sendFunds: '📤 Отправьте ровно {amount} {coin} на:',
    swapComplete: '✅ Обмен завершён!',
    swapExpired: '⏰ Этот обмен истёк.',
    
    // Validation
    invalidAmount: '⚠️ Введите корректную сумму.',
    amountTooLow: '⚠️ Сумма слишком мала. Минимум: {min} {coin}.',
    amountTooHigh: '⚠️ Сумма слишком велика. Максимум: {max} {coin}.',
    invalidAddress: '⚠️ Неверный адрес. Проверьте и попробуйте снова.',
    rateChanged: '⚠️ Курс изменился на {change}%. Продолжить?',
    
    // Alerts
    alertCreated: '✅ Уведомление создано! Сообщу когда {pair} будет {direction} {rate}.',
    alertTriggered: '🔔 УВЕДОМЛЕНИЕ О ЦЕНЕ! {pair} сейчас {rate}',
    noAlerts: '📭 У вас нет активных уведомлений.',
    
    // History
    noHistory: '📭 История обменов пуста.',
    swapHistory: '📜 *История ваших обменов*',
    
    // Settings
    languageChanged: '✅ Язык изменён на Русский',
    selectLanguage: '🌐 Выберите язык:',
    
    // Status
    statusPending: '⏳ Ожидание',
    statusWaiting: '⏳ Ожидание депозита',
    statusProcessing: '🔄 Обработка',
    statusSettling: '📤 Отправка',
    statusComplete: '✅ Завершено',
    statusRefunded: '↩️ Возвращено',
    statusExpired: '⏰ Истекло',
  },
  
  zh: {
    // General
    welcome: '👋 *欢迎使用 NeuraXchange！*\n\n我帮助您快速安全地交换加密货币。',
    help: '可用命令：',
    error: '⚠️ 发生错误，请重试。',
    success: '✅ 成功！',
    cancel: '❌ 已取消',
    confirm: '✅ 确认',
    back: '⬅️ 返回',
    loading: '⏳ 加载中...',
    
    // Commands
    cmdSwap: '/swap - 开始新交换',
    cmdPrice: '/price - 查看汇率',
    cmdLimits: '/limits - 查看限额',
    cmdHistory: '/history - 交换历史',
    cmdAlerts: '/myalerts - 管理价格提醒',
    cmdCoins: '/coins - 币种列表',
    cmdStatus: '/status - 查看状态',
    cmdSettings: '/settings - 设置',
    cmdFavorites: '/favorites - 收藏交易对',
    
    // Swap flow
    selectFromCoin: '选择要发送的币种：',
    selectToCoin: '选择要接收的币种：',
    selectNetwork: '选择网络：',
    enterAmount: '输入交换金额：',
    confirmSwap: '🤔 请确认您的交换：',
    swapCreated: '✨ 交换已创建！请发送您的资金。',
    sendFunds: '📤 请发送 {amount} {coin} 到：',
    swapComplete: '✅ 交换完成！',
    swapExpired: '⏰ 此交换已过期。',
    
    // Validation
    invalidAmount: '⚠️ 请输入有效金额。',
    amountTooLow: '⚠️ 金额太低。最小：{min} {coin}。',
    amountTooHigh: '⚠️ 金额太高。最大：{max} {coin}。',
    invalidAddress: '⚠️ 地址无效，请检查后重试。',
    rateChanged: '⚠️ 汇率变化 {change}%。是否继续？',
    
    // Alerts
    alertCreated: '✅ 提醒已创建！当 {pair} {direction} {rate} 时通知您。',
    alertTriggered: '🔔 价格提醒！{pair} 现在是 {rate}',
    noAlerts: '📭 没有活跃的提醒。',
    
    // History
    noHistory: '📭 暂无交换历史。',
    swapHistory: '📜 *您的交换历史*',
    
    // Settings
    languageChanged: '✅ 语言已更改为中文',
    selectLanguage: '🌐 选择您的语言：',
    
    // Status
    statusPending: '⏳ 等待中',
    statusWaiting: '⏳ 等待存款',
    statusProcessing: '🔄  处理中',
    statusSettling: '📤 结算中',
    statusComplete: '✅ 完成',
    statusRefunded: '↩️ 已退款',
    statusExpired: '⏰ 已过期',
  }
};

// User language preferences (in-memory cache, synced with database)
const userLanguages: Map<number, Language> = new Map();

/**
 * Get user's language (from cache)
 */
export function getUserLanguage(chatId: number): Language {
  return userLanguages.get(chatId) || 'en';
}

/**
 * Set user's language (updates cache, should also update DB)
 */
export async function setUserLanguage(chatId: number, language: Language): Promise<void> {
  userLanguages.set(chatId, language);
  // Database update is handled separately via updateUserLanguageInDB
}

/**
 * Load user's language from database into cache
 */
export function loadUserLanguage(chatId: number, language: string): void {
  if (['en', 'es', 'fr', 'ru', 'zh'].includes(language)) {
    userLanguages.set(chatId, language as Language);
  }
}

/**
 * Get translation for a key
 */
export function t(chatId: number, key: keyof TranslationStrings, params?: { [key: string]: string | number }): string {
  const lang = getUserLanguage(chatId);
  let text = translations[lang][key] || translations['en'][key];
  
  // Replace placeholders
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`{${k}}`, 'g'), String(v));
    });
  }
  
  return text;
}

/**
 * Get all available languages
 */
export function getAvailableLanguages(): { code: Language; name: string; flag: string }[] {
  return [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
  ];
}

/**
 * Get status text in user's language
 */
export function getStatusText(chatId: number, status: string): string {
  const statusMap: { [key: string]: keyof TranslationStrings } = {
    'pending': 'statusPending',
    'waiting': 'statusWaiting',
    'processing': 'statusProcessing',
    'settling': 'statusSettling',
    'complete': 'statusComplete',
    'refunded': 'statusRefunded',
    'expired': 'statusExpired',
  };
  
  const key = statusMap[status.toLowerCase()];
  if (key) {
    return t(chatId, key);
  }
  return status;
}

export default { t, getUserLanguage, setUserLanguage, getAvailableLanguages, getStatusText };
