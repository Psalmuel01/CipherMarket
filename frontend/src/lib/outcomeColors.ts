export interface OutcomeColor {
  hex: string;
  rgb: string;
  text: string;
  softBackground: string;
  border: string;
  shadow: string;
}

const OUTCOME_COLORS: OutcomeColor[] = [
  {
    hex: '#f97316',
    rgb: '249, 115, 22',
    text: '#fdba74',
    softBackground: 'rgba(249, 115, 22, 0.12)',
    border: 'rgba(249, 115, 22, 0.42)',
    shadow: 'rgba(249, 115, 22, 0.26)',
  },
  {
    hex: '#22c55e',
    rgb: '34, 197, 94',
    text: '#86efac',
    softBackground: 'rgba(34, 197, 94, 0.12)',
    border: 'rgba(34, 197, 94, 0.40)',
    shadow: 'rgba(34, 197, 94, 0.24)',
  },
  {
    hex: '#38bdf8',
    rgb: '56, 189, 248',
    text: '#7dd3fc',
    softBackground: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.40)',
    shadow: 'rgba(56, 189, 248, 0.24)',
  },
  {
    hex: '#e879f9',
    rgb: '232, 121, 249',
    text: '#f0abfc',
    softBackground: 'rgba(232, 121, 249, 0.12)',
    border: 'rgba(232, 121, 249, 0.38)',
    shadow: 'rgba(232, 121, 249, 0.22)',
  },
  {
    hex: '#facc15',
    rgb: '250, 204, 21',
    text: '#fde047',
    softBackground: 'rgba(250, 204, 21, 0.11)',
    border: 'rgba(250, 204, 21, 0.36)',
    shadow: 'rgba(250, 204, 21, 0.20)',
  },
  {
    hex: '#14b8a6',
    rgb: '20, 184, 166',
    text: '#5eead4',
    softBackground: 'rgba(20, 184, 166, 0.12)',
    border: 'rgba(20, 184, 166, 0.36)',
    shadow: 'rgba(20, 184, 166, 0.22)',
  },
  {
    hex: '#fb7185',
    rgb: '251, 113, 133',
    text: '#fda4af',
    softBackground: 'rgba(251, 113, 133, 0.12)',
    border: 'rgba(251, 113, 133, 0.38)',
    shadow: 'rgba(251, 113, 133, 0.22)',
  },
  {
    hex: '#a78bfa',
    rgb: '167, 139, 250',
    text: '#c4b5fd',
    softBackground: 'rgba(167, 139, 250, 0.12)',
    border: 'rgba(167, 139, 250, 0.36)',
    shadow: 'rgba(167, 139, 250, 0.22)',
  },
];

export function getOutcomeColor(index: number): OutcomeColor {
  return OUTCOME_COLORS[index % OUTCOME_COLORS.length];
}
