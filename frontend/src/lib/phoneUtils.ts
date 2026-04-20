/** 去除所有非數字字元，用於電話號碼正規化比對 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}
