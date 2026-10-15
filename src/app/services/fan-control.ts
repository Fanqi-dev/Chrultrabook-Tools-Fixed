export const AUTO_FAN_CURVE: readonly number[] = [40, 55, 70, 85, 95, 100, 100, 100, 100, 100, 100, 100, 100];

export interface FanCurveRequest {
  requestId: string;
  name: string;
  array: number[];
}

export interface FanCurveResult {
  requestId: string;
  applied: boolean;
}

export function validCurve(array: unknown): array is number[] {
  return Array.isArray(array) && array.length >= 12 && array.every((value) =>
    Number.isInteger(value) && value >= 0 && value <= 100);
}
