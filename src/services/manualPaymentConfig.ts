/** Public GCash payment details, configured at build time. These values are not secrets. */
export const MANUAL_PAYMENT_CONFIG = {
  gcashAccountName: import.meta.env.VITE_GCASH_ACCOUNT_NAME?.trim() || 'M.B',
  gcashAccountNumber: import.meta.env.VITE_GCASH_ACCOUNT_NUMBER?.trim() || '09487322275',
  gcashQrImageUrl: import.meta.env.VITE_GCASH_QR_IMAGE_URL?.trim() || '',
};
