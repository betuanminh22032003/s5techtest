/**
 * Problem 4: Three ways to sum to n
 * 
 * Each function calculates the sum from 1 to n (i.e., 1 + 2 + 3 + ... + n)
 */

/**
 * Implementation A: Mathematical Formula (Gauss's Formula)
 * 
 * Uses the closed-form mathematical formula: n * (n + 1) / 2
 * 
 * Time Complexity: O(1) - Constant time, most efficient
 * Space Complexity: O(1) - No additional space needed
 * 
 * Pros: Fastest approach, no iteration needed
 * Cons: None for this specific problem
 */
function sum_to_n_a(n: number): number {
    return (n * (n + 1)) / 2;
}

/**
 * Implementation B: Iterative Loop
 * 
 * Uses a traditional for loop to accumulate the sum
 * 
 * Time Complexity: O(n) - Linear time, iterates through all numbers
 * Space Complexity: O(1) - Only uses a constant amount of extra space
 * 
 * Pros: Intuitive, easy to understand
 * Cons: Slower than formula approach for large n
 */
function sum_to_n_b(n: number): number {
    let sum = 0;
    for (let i = 1; i <= n; i++) {
        sum += i;
    }
    return sum;
}

/**
 * Implementation C: Recursion
 * 
 * Uses recursive function calls to calculate the sum
 * 
 * Time Complexity: O(n) - Makes n recursive calls
 * Space Complexity: O(n) - Call stack depth of n
 * 
 * Pros: Elegant, functional programming style
 * Cons: Risk of stack overflow for large n, uses more memory than iterative approach
 */
function sum_to_n_c(n: number): number {
    if (n <= 0) return 0;
    return n + sum_to_n_c(n - 1);
}

// Test cases
console.log("sum_to_n_a(5):", sum_to_n_a(5)); // Expected: 15
console.log("sum_to_n_b(5):", sum_to_n_b(5)); // Expected: 15
console.log("sum_to_n_c(5):", sum_to_n_c(5)); // Expected: 15

console.log("\nsum_to_n_a(100):", sum_to_n_a(100)); // Expected: 5050
console.log("sum_to_n_b(100):", sum_to_n_b(100)); // Expected: 5050
console.log("sum_to_n_c(100):", sum_to_n_c(100)); // Expected: 5050

// Export functions for use in other modules
export { sum_to_n_a, sum_to_n_b, sum_to_n_c };
