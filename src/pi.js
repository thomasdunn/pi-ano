function getPiDigits(factor) {
    let i = 1n;
    let x = 3n * (10n ** factor);
    let pi = x;
    while (x > 0) {
        x = x * i / ((i + 1n) * 4n);
        pi += x / (i + 2n);
        i += 2n;
    }
    return pi / (10n ** 20n);
}

const getPiDigits10k = () => getPiDigits(10020n);

// [3, 1, 4, 1, 5, 9, 2, 6, ...]
export function getPiDigitArray() {
    return ('' + getPiDigits10k()).split('');
}
