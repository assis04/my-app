/**
 * Tempo relativo em PT-BR, sem depender de dayjs/date-fns.
 *
 * Cobertura: "agora", "há X minutos/horas", "ontem às HH:mm", "DD/MM às HH:mm"
 * para datas mais antigas que 7 dias (evita cálculos imprecisos em meses/anos).
 *
 * Spec: specs/crm-frontend-plan.md §2.3 (Timeline de histórico)
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * @param {string | Date} input - ISO string ou Date
 * @param {Date} [now=new Date()] - "agora" (parametrizável para testes)
 * @returns {string}
 */
export function formatRelative(input, now = new Date()) {
  if (!input) return '';
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = now.getTime() - date.getTime();

  // Futuro ou menos de 1 min
  if (diffMs < MINUTE) return 'agora';

  if (diffMs < HOUR) {
    const mins = Math.floor(diffMs / MINUTE);
    return mins === 1 ? 'há 1 minuto' : `há ${mins} minutos`;
  }

  if (diffMs < DAY) {
    const hours = Math.floor(diffMs / HOUR);
    return hours === 1 ? 'há 1 hora' : `há ${hours} horas`;
  }

  // Ontem: mesmo "dia civil" de ontem (não apenas < 48h).
  if (isYesterday(date, now)) {
    return `ontem às ${formatTime(date)}`;
  }

  if (diffMs < 7 * DAY) {
    const days = Math.floor(diffMs / DAY);
    return days === 1 ? 'há 1 dia' : `há ${days} dias`;
  }

  // Acima de 7 dias — mostra data absoluta curta.
  return `${formatDayMonth(date)} às ${formatTime(date)}`;
}

function isYesterday(date, now) {
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  return (
    date.getFullYear() === y.getFullYear() &&
    date.getMonth() === y.getMonth() &&
    date.getDate() === y.getDate()
  );
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDayMonth(date) {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}
