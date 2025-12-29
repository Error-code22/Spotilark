/**
 * Generate a unique friend code for users
 * Format: XXXX-XXXX (8 characters, uppercase letters and numbers)
 */
export function generateFriendCode(): string {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous characters (I, O, 0, 1)
    let code = '';

    for (let i = 0; i < 8; i++) {
        if (i === 4) {
            code += '-';
        }
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return code;
}

/**
 * Validate friend code format
 */
export function isValidFriendCode(code: string): boolean {
    const pattern = /^[A-Z2-9]{4}-[A-Z2-9]{4}$/;
    return pattern.test(code);
}
